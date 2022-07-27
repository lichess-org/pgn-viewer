var LichessPgnViewer = (function () {
    'use strict';

    const FILE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const RANK_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const COLORS = ['white', 'black'];
    const ROLES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    const CASTLING_SIDES = ['a', 'h'];
    const isDrop = (v) => 'role' in v;

    const defined = (v) => v !== undefined;
    const opposite$1 = (color) => (color === 'white' ? 'black' : 'white');
    const squareRank = (square) => square >> 3;
    const squareFile = (square) => square & 0x7;
    const roleToChar = (role) => {
        switch (role) {
            case 'pawn':
                return 'p';
            case 'knight':
                return 'n';
            case 'bishop':
                return 'b';
            case 'rook':
                return 'r';
            case 'queen':
                return 'q';
            case 'king':
                return 'k';
        }
    };
    function charToRole(ch) {
        switch (ch.toLowerCase()) {
            case 'p':
                return 'pawn';
            case 'n':
                return 'knight';
            case 'b':
                return 'bishop';
            case 'r':
                return 'rook';
            case 'q':
                return 'queen';
            case 'k':
                return 'king';
            default:
                return;
        }
    }
    function parseSquare(str) {
        if (str.length !== 2)
            return;
        const file = str.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = str.charCodeAt(1) - '1'.charCodeAt(0);
        if (file < 0 || file >= 8 || rank < 0 || rank >= 8)
            return;
        return file + 8 * rank;
    }
    const makeSquare = (square) => (FILE_NAMES[squareFile(square)] + RANK_NAMES[squareRank(square)]);
    /**
     * Converts a move to UCI notation, like `g1f3` for a normal move,
     * `a7a8q` for promotion to a queen, and `Q@f7` for a Crazyhouse drop.
     */
    const makeUci = (move) => isDrop(move)
        ? `${roleToChar(move.role).toUpperCase()}@${makeSquare(move.to)}`
        : makeSquare(move.from) + makeSquare(move.to) + (move.promotion ? roleToChar(move.promotion) : '');
    const kingCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 2 : 6) : side === 'a' ? 58 : 62;

    const popcnt32 = (n) => {
        n = n - ((n >>> 1) & 1431655765);
        n = (n & 858993459) + ((n >>> 2) & 858993459);
        return Math.imul((n + (n >>> 4)) & 252645135, 16843009) >> 24;
    };
    const bswap32 = (n) => {
        n = ((n >>> 8) & 16711935) | ((n & 16711935) << 8);
        return ((n >>> 16) & 0xffff) | ((n & 0xffff) << 16);
    };
    const rbit32 = (n) => {
        n = ((n >>> 1) & 1431655765) | ((n & 1431655765) << 1);
        n = ((n >>> 2) & 858993459) | ((n & 858993459) << 2);
        n = ((n >>> 4) & 252645135) | ((n & 252645135) << 4);
        return bswap32(n);
    };
    class SquareSet {
        constructor(lo, hi) {
            this.lo = lo | 0;
            this.hi = hi | 0;
        }
        static fromSquare(square) {
            return square >= 32 ? new SquareSet(0, 1 << (square - 32)) : new SquareSet(1 << square, 0);
        }
        static fromRank(rank) {
            return new SquareSet(0xff, 0).shl64(8 * rank);
        }
        static fromFile(file) {
            return new SquareSet(16843009 << file, 16843009 << file);
        }
        static empty() {
            return new SquareSet(0, 0);
        }
        static full() {
            return new SquareSet(4294967295, 4294967295);
        }
        static corners() {
            return new SquareSet(0x81, 2164260864);
        }
        static center() {
            return new SquareSet(402653184, 0x18);
        }
        static backranks() {
            return new SquareSet(0xff, 4278190080);
        }
        static backrank(color) {
            return color === 'white' ? new SquareSet(0xff, 0) : new SquareSet(0, 4278190080);
        }
        static lightSquares() {
            return new SquareSet(1437226410, 1437226410);
        }
        static darkSquares() {
            return new SquareSet(2857740885, 2857740885);
        }
        complement() {
            return new SquareSet(~this.lo, ~this.hi);
        }
        xor(other) {
            return new SquareSet(this.lo ^ other.lo, this.hi ^ other.hi);
        }
        union(other) {
            return new SquareSet(this.lo | other.lo, this.hi | other.hi);
        }
        intersect(other) {
            return new SquareSet(this.lo & other.lo, this.hi & other.hi);
        }
        diff(other) {
            return new SquareSet(this.lo & ~other.lo, this.hi & ~other.hi);
        }
        intersects(other) {
            return this.intersect(other).nonEmpty();
        }
        isDisjoint(other) {
            return this.intersect(other).isEmpty();
        }
        supersetOf(other) {
            return other.diff(this).isEmpty();
        }
        subsetOf(other) {
            return this.diff(other).isEmpty();
        }
        shr64(shift) {
            if (shift >= 64)
                return SquareSet.empty();
            if (shift >= 32)
                return new SquareSet(this.hi >>> (shift - 32), 0);
            if (shift > 0)
                return new SquareSet((this.lo >>> shift) ^ (this.hi << (32 - shift)), this.hi >>> shift);
            return this;
        }
        shl64(shift) {
            if (shift >= 64)
                return SquareSet.empty();
            if (shift >= 32)
                return new SquareSet(0, this.lo << (shift - 32));
            if (shift > 0)
                return new SquareSet(this.lo << shift, (this.hi << shift) ^ (this.lo >>> (32 - shift)));
            return this;
        }
        bswap64() {
            return new SquareSet(bswap32(this.hi), bswap32(this.lo));
        }
        rbit64() {
            return new SquareSet(rbit32(this.hi), rbit32(this.lo));
        }
        minus64(other) {
            const lo = this.lo - other.lo;
            const c = ((lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1)) >>> 31;
            return new SquareSet(lo, this.hi - (other.hi + c));
        }
        equals(other) {
            return this.lo === other.lo && this.hi === other.hi;
        }
        size() {
            return popcnt32(this.lo) + popcnt32(this.hi);
        }
        isEmpty() {
            return this.lo === 0 && this.hi === 0;
        }
        nonEmpty() {
            return this.lo !== 0 || this.hi !== 0;
        }
        has(square) {
            return (square >= 32 ? this.hi & (1 << (square - 32)) : this.lo & (1 << square)) !== 0;
        }
        set(square, on) {
            return on ? this.with(square) : this.without(square);
        }
        with(square) {
            return square >= 32
                ? new SquareSet(this.lo, this.hi | (1 << (square - 32)))
                : new SquareSet(this.lo | (1 << square), this.hi);
        }
        without(square) {
            return square >= 32
                ? new SquareSet(this.lo, this.hi & ~(1 << (square - 32)))
                : new SquareSet(this.lo & ~(1 << square), this.hi);
        }
        toggle(square) {
            return square >= 32
                ? new SquareSet(this.lo, this.hi ^ (1 << (square - 32)))
                : new SquareSet(this.lo ^ (1 << square), this.hi);
        }
        last() {
            if (this.hi !== 0)
                return 63 - Math.clz32(this.hi);
            if (this.lo !== 0)
                return 31 - Math.clz32(this.lo);
            return;
        }
        first() {
            if (this.lo !== 0)
                return 31 - Math.clz32(this.lo & -this.lo);
            if (this.hi !== 0)
                return 63 - Math.clz32(this.hi & -this.hi);
            return;
        }
        withoutFirst() {
            if (this.lo !== 0)
                return new SquareSet(this.lo & (this.lo - 1), this.hi);
            return new SquareSet(0, this.hi & (this.hi - 1));
        }
        moreThanOne() {
            return (this.hi !== 0 && this.lo !== 0) || (this.lo & (this.lo - 1)) !== 0 || (this.hi & (this.hi - 1)) !== 0;
        }
        singleSquare() {
            return this.moreThanOne() ? undefined : this.last();
        }
        *[Symbol.iterator]() {
            let lo = this.lo;
            let hi = this.hi;
            while (lo !== 0) {
                const idx = 31 - Math.clz32(lo & -lo);
                lo ^= 1 << idx;
                yield idx;
            }
            while (hi !== 0) {
                const idx = 31 - Math.clz32(hi & -hi);
                hi ^= 1 << idx;
                yield 32 + idx;
            }
        }
        *reversed() {
            let lo = this.lo;
            let hi = this.hi;
            while (hi !== 0) {
                const idx = 31 - Math.clz32(hi);
                hi ^= 1 << idx;
                yield 32 + idx;
            }
            while (lo !== 0) {
                const idx = 31 - Math.clz32(lo);
                lo ^= 1 << idx;
                yield idx;
            }
        }
    }

    /**
     * Compute attacks and rays.
     *
     * These are low-level functions that can be used to implement chess rules.
     *
     * Implementation notes: Sliding attacks are computed using
     * [hyperbola quintessence](https://www.chessprogramming.org/Hyperbola_Quintessence).
     * Magic bitboards would deliver faster lookups, but also require
     * initializing considerably larger attack tables. On the web, initialization
     * time is important, so the chosen method may strike a better balance.
     *
     * @packageDocumentation
     */
    const computeRange = (square, deltas) => {
        let range = SquareSet.empty();
        for (const delta of deltas) {
            const sq = square + delta;
            if (0 <= sq && sq < 64 && Math.abs(squareFile(square) - squareFile(sq)) <= 2) {
                range = range.with(sq);
            }
        }
        return range;
    };
    const tabulate = (f) => {
        const table = [];
        for (let square = 0; square < 64; square++)
            table[square] = f(square);
        return table;
    };
    const KING_ATTACKS = tabulate(sq => computeRange(sq, [-9, -8, -7, -1, 1, 7, 8, 9]));
    const KNIGHT_ATTACKS = tabulate(sq => computeRange(sq, [-17, -15, -10, -6, 6, 10, 15, 17]));
    const PAWN_ATTACKS = {
        white: tabulate(sq => computeRange(sq, [7, 9])),
        black: tabulate(sq => computeRange(sq, [-7, -9])),
    };
    /**
     * Gets squares attacked or defended by a king on `square`.
     */
    const kingAttacks = (square) => KING_ATTACKS[square];
    /**
     * Gets squares attacked or defended by a knight on `square`.
     */
    const knightAttacks = (square) => KNIGHT_ATTACKS[square];
    /**
     * Gets squares attacked or defended by a pawn of the given `color`
     * on `square`.
     */
    const pawnAttacks = (color, square) => PAWN_ATTACKS[color][square];
    const FILE_RANGE = tabulate(sq => SquareSet.fromFile(squareFile(sq)).without(sq));
    const RANK_RANGE = tabulate(sq => SquareSet.fromRank(squareRank(sq)).without(sq));
    const DIAG_RANGE = tabulate(sq => {
        const diag = new SquareSet(134480385, 2151686160);
        const shift = 8 * (squareRank(sq) - squareFile(sq));
        return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
    });
    const ANTI_DIAG_RANGE = tabulate(sq => {
        const diag = new SquareSet(270549120, 16909320);
        const shift = 8 * (squareRank(sq) + squareFile(sq) - 7);
        return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
    });
    const hyperbola = (bit, range, occupied) => {
        let forward = occupied.intersect(range);
        let reverse = forward.bswap64(); // Assumes no more than 1 bit per rank
        forward = forward.minus64(bit);
        reverse = reverse.minus64(bit.bswap64());
        return forward.xor(reverse.bswap64()).intersect(range);
    };
    const fileAttacks = (square, occupied) => hyperbola(SquareSet.fromSquare(square), FILE_RANGE[square], occupied);
    const rankAttacks = (square, occupied) => {
        const range = RANK_RANGE[square];
        let forward = occupied.intersect(range);
        let reverse = forward.rbit64();
        forward = forward.minus64(SquareSet.fromSquare(square));
        reverse = reverse.minus64(SquareSet.fromSquare(63 - square));
        return forward.xor(reverse.rbit64()).intersect(range);
    };
    /**
     * Gets squares attacked or defended by a bishop on `square`, given `occupied`
     * squares.
     */
    const bishopAttacks = (square, occupied) => {
        const bit = SquareSet.fromSquare(square);
        return hyperbola(bit, DIAG_RANGE[square], occupied).xor(hyperbola(bit, ANTI_DIAG_RANGE[square], occupied));
    };
    /**
     * Gets squares attacked or defended by a rook on `square`, given `occupied`
     * squares.
     */
    const rookAttacks = (square, occupied) => fileAttacks(square, occupied).xor(rankAttacks(square, occupied));
    /**
     * Gets squares attacked or defended by a queen on `square`, given `occupied`
     * squares.
     */
    const queenAttacks = (square, occupied) => bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
    /**
     * Gets squares attacked or defended by a `piece` on `square`, given
     * `occupied` squares.
     */
    const attacks = (piece, square, occupied) => {
        switch (piece.role) {
            case 'pawn':
                return pawnAttacks(piece.color, square);
            case 'knight':
                return knightAttacks(square);
            case 'bishop':
                return bishopAttacks(square, occupied);
            case 'rook':
                return rookAttacks(square, occupied);
            case 'queen':
                return queenAttacks(square, occupied);
            case 'king':
                return kingAttacks(square);
        }
    };
    /**
     * Gets all squares of the rank, file or diagonal with the two squares
     * `a` and `b`, or an empty set if they are not aligned.
     */
    const ray = (a, b) => {
        const other = SquareSet.fromSquare(b);
        if (RANK_RANGE[a].intersects(other))
            return RANK_RANGE[a].with(a);
        if (ANTI_DIAG_RANGE[a].intersects(other))
            return ANTI_DIAG_RANGE[a].with(a);
        if (DIAG_RANGE[a].intersects(other))
            return DIAG_RANGE[a].with(a);
        if (FILE_RANGE[a].intersects(other))
            return FILE_RANGE[a].with(a);
        return SquareSet.empty();
    };
    /**
     * Gets all squares between `a` and `b` (bounds not included), or an empty set
     * if they are not on the same rank, file or diagonal.
     */
    const between = (a, b) => ray(a, b)
        .intersect(SquareSet.full().shl64(a).xor(SquareSet.full().shl64(b)))
        .withoutFirst();

    /**
     * Piece positions on a board.
     *
     * Properties are sets of squares, like `board.occupied` for all occupied
     * squares, `board[color]` for all pieces of that color, and `board[role]`
     * for all pieces of that role. When modifying the properties directly, take
     * care to keep them consistent.
     */
    class Board {
        constructor() { }
        static default() {
            const board = new Board();
            board.reset();
            return board;
        }
        /**
         * Resets all pieces to the default starting position for standard chess.
         */
        reset() {
            this.occupied = new SquareSet(0xffff, 4294901760);
            this.promoted = SquareSet.empty();
            this.white = new SquareSet(0xffff, 0);
            this.black = new SquareSet(0, 4294901760);
            this.pawn = new SquareSet(0xff00, 16711680);
            this.knight = new SquareSet(0x42, 1107296256);
            this.bishop = new SquareSet(0x24, 603979776);
            this.rook = new SquareSet(0x81, 2164260864);
            this.queen = new SquareSet(0x8, 134217728);
            this.king = new SquareSet(0x10, 268435456);
        }
        static empty() {
            const board = new Board();
            board.clear();
            return board;
        }
        clear() {
            this.occupied = SquareSet.empty();
            this.promoted = SquareSet.empty();
            for (const color of COLORS)
                this[color] = SquareSet.empty();
            for (const role of ROLES)
                this[role] = SquareSet.empty();
        }
        clone() {
            const board = new Board();
            board.occupied = this.occupied;
            board.promoted = this.promoted;
            for (const color of COLORS)
                board[color] = this[color];
            for (const role of ROLES)
                board[role] = this[role];
            return board;
        }
        getColor(square) {
            if (this.white.has(square))
                return 'white';
            if (this.black.has(square))
                return 'black';
            return;
        }
        getRole(square) {
            for (const role of ROLES) {
                if (this[role].has(square))
                    return role;
            }
            return;
        }
        get(square) {
            const color = this.getColor(square);
            if (!color)
                return;
            const role = this.getRole(square);
            const promoted = this.promoted.has(square);
            return { color, role, promoted };
        }
        /**
         * Removes and returns the piece from the given `square`, if any.
         */
        take(square) {
            const piece = this.get(square);
            if (piece) {
                this.occupied = this.occupied.without(square);
                this[piece.color] = this[piece.color].without(square);
                this[piece.role] = this[piece.role].without(square);
                if (piece.promoted)
                    this.promoted = this.promoted.without(square);
            }
            return piece;
        }
        /**
         * Put `piece` onto `square`, potentially replacing an existing piece.
         * Returns the existing piece, if any.
         */
        set(square, piece) {
            const old = this.take(square);
            this.occupied = this.occupied.with(square);
            this[piece.color] = this[piece.color].with(square);
            this[piece.role] = this[piece.role].with(square);
            if (piece.promoted)
                this.promoted = this.promoted.with(square);
            return old;
        }
        has(square) {
            return this.occupied.has(square);
        }
        *[Symbol.iterator]() {
            for (const square of this.occupied) {
                yield [square, this.get(square)];
            }
        }
        pieces(color, role) {
            return this[color].intersect(this[role]);
        }
        rooksAndQueens() {
            return this.rook.union(this.queen);
        }
        bishopsAndQueens() {
            return this.bishop.union(this.queen);
        }
        /**
         * Finds the unique king of the given `color`, if any.
         */
        kingOf(color) {
            return this.pieces(color, 'king').singleSquare();
        }
    }

    class MaterialSide {
        constructor() { }
        static empty() {
            const m = new MaterialSide();
            for (const role of ROLES)
                m[role] = 0;
            return m;
        }
        static fromBoard(board, color) {
            const m = new MaterialSide();
            for (const role of ROLES)
                m[role] = board.pieces(color, role).size();
            return m;
        }
        clone() {
            const m = new MaterialSide();
            for (const role of ROLES)
                m[role] = this[role];
            return m;
        }
        equals(other) {
            return ROLES.every(role => this[role] === other[role]);
        }
        add(other) {
            const m = new MaterialSide();
            for (const role of ROLES)
                m[role] = this[role] + other[role];
            return m;
        }
        nonEmpty() {
            return ROLES.some(role => this[role] > 0);
        }
        isEmpty() {
            return !this.nonEmpty();
        }
        hasPawns() {
            return this.pawn > 0;
        }
        hasNonPawns() {
            return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.queen > 0 || this.king > 0;
        }
        size() {
            return this.pawn + this.knight + this.bishop + this.rook + this.queen + this.king;
        }
    }
    class Material {
        constructor(white, black) {
            this.white = white;
            this.black = black;
        }
        static empty() {
            return new Material(MaterialSide.empty(), MaterialSide.empty());
        }
        static fromBoard(board) {
            return new Material(MaterialSide.fromBoard(board, 'white'), MaterialSide.fromBoard(board, 'black'));
        }
        clone() {
            return new Material(this.white.clone(), this.black.clone());
        }
        equals(other) {
            return this.white.equals(other.white) && this.black.equals(other.black);
        }
        add(other) {
            return new Material(this.white.add(other.white), this.black.add(other.black));
        }
        count(role) {
            return this.white[role] + this.black[role];
        }
        size() {
            return this.white.size() + this.black.size();
        }
        isEmpty() {
            return this.white.isEmpty() && this.black.isEmpty();
        }
        nonEmpty() {
            return !this.isEmpty();
        }
        hasPawns() {
            return this.white.hasPawns() || this.black.hasPawns();
        }
        hasNonPawns() {
            return this.white.hasNonPawns() || this.black.hasNonPawns();
        }
    }
    class RemainingChecks {
        constructor(white, black) {
            this.white = white;
            this.black = black;
        }
        static default() {
            return new RemainingChecks(3, 3);
        }
        clone() {
            return new RemainingChecks(this.white, this.black);
        }
        equals(other) {
            return this.white === other.white && this.black === other.black;
        }
    }

    class r{unwrap(r,t){const e=this._chain(t=>n.ok(r?r(t):t),r=>t?n.ok(t(r)):n.err(r));if(e.isErr)throw e.error;return e.value}map(r,t){return this._chain(t=>n.ok(r(t)),r=>n.err(t?t(r):r))}chain(r,t){return this._chain(r,t||(r=>n.err(r)))}}class t extends r{constructor(r){super(),this.value=void 0,this.isOk=!0,this.isErr=!1,this.value=r;}_chain(r,t){return r(this.value)}}class e extends r{constructor(r){super(),this.error=void 0,this.isOk=!1,this.isErr=!0,this.error=r;}_chain(r,t){return t(this.error)}}var n;!function(r){r.ok=function(r){return new t(r)},r.err=function(r){return new e(r||new Error)},r.all=function(t){if(Array.isArray(t)){const e=[];for(let r=0;r<t.length;r++){const n=t[r];if(n.isErr)return n;e.push(n.value);}return r.ok(e)}const e={},n=Object.keys(t);for(let r=0;r<n.length;r++){const s=t[n[r]];if(s.isErr)return s;e[n[r]]=s.value;}return r.ok(e)};}(n||(n={}));

    var IllegalSetup;
    (function (IllegalSetup) {
        IllegalSetup["Empty"] = "ERR_EMPTY";
        IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
        IllegalSetup["ImpossibleCheck"] = "ERR_IMPOSSIBLE_CHECK";
        IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
        IllegalSetup["Kings"] = "ERR_KINGS";
        IllegalSetup["Variant"] = "ERR_VARIANT";
    })(IllegalSetup || (IllegalSetup = {}));
    class PositionError extends Error {
    }
    const attacksTo = (square, attacker, board, occupied) => board[attacker].intersect(rookAttacks(square, occupied)
        .intersect(board.rooksAndQueens())
        .union(bishopAttacks(square, occupied).intersect(board.bishopsAndQueens()))
        .union(knightAttacks(square).intersect(board.knight))
        .union(kingAttacks(square).intersect(board.king))
        .union(pawnAttacks(opposite$1(attacker), square).intersect(board.pawn)));
    const rookCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 3 : 5) : side === 'a' ? 59 : 61;
    class Castles {
        constructor() { }
        static default() {
            const castles = new Castles();
            castles.unmovedRooks = SquareSet.corners();
            castles.rook = {
                white: { a: 0, h: 7 },
                black: { a: 56, h: 63 },
            };
            castles.path = {
                white: { a: new SquareSet(0xe, 0), h: new SquareSet(0x60, 0) },
                black: { a: new SquareSet(0, 0x0e000000), h: new SquareSet(0, 0x60000000) },
            };
            return castles;
        }
        static empty() {
            const castles = new Castles();
            castles.unmovedRooks = SquareSet.empty();
            castles.rook = {
                white: { a: undefined, h: undefined },
                black: { a: undefined, h: undefined },
            };
            castles.path = {
                white: { a: SquareSet.empty(), h: SquareSet.empty() },
                black: { a: SquareSet.empty(), h: SquareSet.empty() },
            };
            return castles;
        }
        clone() {
            const castles = new Castles();
            castles.unmovedRooks = this.unmovedRooks;
            castles.rook = {
                white: { a: this.rook.white.a, h: this.rook.white.h },
                black: { a: this.rook.black.a, h: this.rook.black.h },
            };
            castles.path = {
                white: { a: this.path.white.a, h: this.path.white.h },
                black: { a: this.path.black.a, h: this.path.black.h },
            };
            return castles;
        }
        add(color, side, king, rook) {
            const kingTo = kingCastlesTo(color, side);
            const rookTo = rookCastlesTo(color, side);
            this.unmovedRooks = this.unmovedRooks.with(rook);
            this.rook[color][side] = rook;
            this.path[color][side] = between(rook, rookTo)
                .with(rookTo)
                .union(between(king, kingTo).with(kingTo))
                .without(king)
                .without(rook);
        }
        static fromSetup(setup) {
            const castles = Castles.empty();
            const rooks = setup.unmovedRooks.intersect(setup.board.rook);
            for (const color of COLORS) {
                const backrank = SquareSet.backrank(color);
                const king = setup.board.kingOf(color);
                if (!defined(king) || !backrank.has(king))
                    continue;
                const side = rooks.intersect(setup.board[color]).intersect(backrank);
                const aSide = side.first();
                if (defined(aSide) && aSide < king)
                    castles.add(color, 'a', king, aSide);
                const hSide = side.last();
                if (defined(hSide) && king < hSide)
                    castles.add(color, 'h', king, hSide);
            }
            return castles;
        }
        discardRook(square) {
            if (this.unmovedRooks.has(square)) {
                this.unmovedRooks = this.unmovedRooks.without(square);
                for (const color of COLORS) {
                    for (const side of CASTLING_SIDES) {
                        if (this.rook[color][side] === square)
                            this.rook[color][side] = undefined;
                    }
                }
            }
        }
        discardColor(color) {
            this.unmovedRooks = this.unmovedRooks.diff(SquareSet.backrank(color));
            this.rook[color].a = undefined;
            this.rook[color].h = undefined;
        }
    }
    class Position {
        constructor(rules) {
            this.rules = rules;
        }
        reset() {
            this.board = Board.default();
            this.pockets = undefined;
            this.turn = 'white';
            this.castles = Castles.default();
            this.epSquare = undefined;
            this.remainingChecks = undefined;
            this.halfmoves = 0;
            this.fullmoves = 1;
        }
        setupUnchecked(setup) {
            this.board = setup.board.clone();
            this.board.promoted = SquareSet.empty();
            this.pockets = undefined;
            this.turn = setup.turn;
            this.castles = Castles.fromSetup(setup);
            this.epSquare = validEpSquare(this, setup.epSquare);
            this.remainingChecks = undefined;
            this.halfmoves = setup.halfmoves;
            this.fullmoves = setup.fullmoves;
        }
        // When subclassing overwrite at least:
        //
        // - static default()
        // - static fromSetup()
        // - static clone()
        //
        // - dests()
        // - isVariantEnd()
        // - variantOutcome()
        // - hasInsufficientMaterial()
        // - isStandardMaterial()
        kingAttackers(square, attacker, occupied) {
            return attacksTo(square, attacker, this.board, occupied);
        }
        playCaptureAt(square, captured) {
            this.halfmoves = 0;
            if (captured.role === 'rook')
                this.castles.discardRook(square);
            if (this.pockets)
                this.pockets[opposite$1(captured.color)][captured.promoted ? 'pawn' : captured.role]++;
        }
        ctx() {
            const variantEnd = this.isVariantEnd();
            const king = this.board.kingOf(this.turn);
            if (!defined(king))
                return { king, blockers: SquareSet.empty(), checkers: SquareSet.empty(), variantEnd, mustCapture: false };
            const snipers = rookAttacks(king, SquareSet.empty())
                .intersect(this.board.rooksAndQueens())
                .union(bishopAttacks(king, SquareSet.empty()).intersect(this.board.bishopsAndQueens()))
                .intersect(this.board[opposite$1(this.turn)]);
            let blockers = SquareSet.empty();
            for (const sniper of snipers) {
                const b = between(king, sniper).intersect(this.board.occupied);
                if (!b.moreThanOne())
                    blockers = blockers.union(b);
            }
            const checkers = this.kingAttackers(king, opposite$1(this.turn), this.board.occupied);
            return {
                king,
                blockers,
                checkers,
                variantEnd,
                mustCapture: false,
            };
        }
        clone() {
            var _a, _b;
            const pos = new this.constructor();
            pos.board = this.board.clone();
            pos.pockets = (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone();
            pos.turn = this.turn;
            pos.castles = this.castles.clone();
            pos.epSquare = this.epSquare;
            pos.remainingChecks = (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone();
            pos.halfmoves = this.halfmoves;
            pos.fullmoves = this.fullmoves;
            return pos;
        }
        validate(opts) {
            if (this.board.occupied.isEmpty())
                return n.err(new PositionError(IllegalSetup.Empty));
            if (this.board.king.size() !== 2)
                return n.err(new PositionError(IllegalSetup.Kings));
            if (!defined(this.board.kingOf(this.turn)))
                return n.err(new PositionError(IllegalSetup.Kings));
            const otherKing = this.board.kingOf(opposite$1(this.turn));
            if (!defined(otherKing))
                return n.err(new PositionError(IllegalSetup.Kings));
            if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty())
                return n.err(new PositionError(IllegalSetup.OppositeCheck));
            if (SquareSet.backranks().intersects(this.board.pawn))
                return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
            return (opts === null || opts === void 0 ? void 0 : opts.ignoreImpossibleCheck) ? n.ok(undefined) : this.validateCheckers();
        }
        validateCheckers() {
            const ourKing = this.board.kingOf(this.turn);
            if (defined(ourKing)) {
                const checkers = this.kingAttackers(ourKing, opposite$1(this.turn), this.board.occupied);
                if (checkers.nonEmpty()) {
                    if (defined(this.epSquare)) {
                        // The pushed pawn must be the only checker, or it has uncovered
                        // check by a single sliding piece.
                        const pushedTo = this.epSquare ^ 8;
                        const pushedFrom = this.epSquare ^ 24;
                        if (checkers.moreThanOne() ||
                            (checkers.first() !== pushedTo &&
                                this.kingAttackers(ourKing, opposite$1(this.turn), this.board.occupied.without(pushedTo).with(pushedFrom)).nonEmpty()))
                            return n.err(new PositionError(IllegalSetup.ImpossibleCheck));
                    }
                    else {
                        // Multiple sliding checkers aligned with king.
                        if (checkers.size() > 2 || (checkers.size() === 2 && ray(checkers.first(), checkers.last()).has(ourKing)))
                            return n.err(new PositionError(IllegalSetup.ImpossibleCheck));
                    }
                }
            }
            return n.ok(undefined);
        }
        dropDests(_ctx) {
            return SquareSet.empty();
        }
        dests(square, ctx) {
            ctx = ctx || this.ctx();
            if (ctx.variantEnd)
                return SquareSet.empty();
            const piece = this.board.get(square);
            if (!piece || piece.color !== this.turn)
                return SquareSet.empty();
            let pseudo, legal;
            if (piece.role === 'pawn') {
                pseudo = pawnAttacks(this.turn, square).intersect(this.board[opposite$1(this.turn)]);
                const delta = this.turn === 'white' ? 8 : -8;
                const step = square + delta;
                if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
                    pseudo = pseudo.with(step);
                    const canDoubleStep = this.turn === 'white' ? square < 16 : square >= 64 - 16;
                    const doubleStep = step + delta;
                    if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
                        pseudo = pseudo.with(doubleStep);
                    }
                }
                if (defined(this.epSquare) && canCaptureEp(this, square, ctx)) {
                    const pawn = this.epSquare - delta;
                    if (ctx.checkers.isEmpty() || ctx.checkers.singleSquare() === pawn) {
                        legal = SquareSet.fromSquare(this.epSquare);
                    }
                }
            }
            else if (piece.role === 'bishop')
                pseudo = bishopAttacks(square, this.board.occupied);
            else if (piece.role === 'knight')
                pseudo = knightAttacks(square);
            else if (piece.role === 'rook')
                pseudo = rookAttacks(square, this.board.occupied);
            else if (piece.role === 'queen')
                pseudo = queenAttacks(square, this.board.occupied);
            else
                pseudo = kingAttacks(square);
            pseudo = pseudo.diff(this.board[this.turn]);
            if (defined(ctx.king)) {
                if (piece.role === 'king') {
                    const occ = this.board.occupied.without(square);
                    for (const to of pseudo) {
                        if (this.kingAttackers(to, opposite$1(this.turn), occ).nonEmpty())
                            pseudo = pseudo.without(to);
                    }
                    return pseudo.union(castlingDest(this, 'a', ctx)).union(castlingDest(this, 'h', ctx));
                }
                if (ctx.checkers.nonEmpty()) {
                    const checker = ctx.checkers.singleSquare();
                    if (!defined(checker))
                        return SquareSet.empty();
                    pseudo = pseudo.intersect(between(checker, ctx.king).with(checker));
                }
                if (ctx.blockers.has(square))
                    pseudo = pseudo.intersect(ray(square, ctx.king));
            }
            if (legal)
                pseudo = pseudo.union(legal);
            return pseudo;
        }
        isVariantEnd() {
            return false;
        }
        variantOutcome(_ctx) {
            return;
        }
        hasInsufficientMaterial(color) {
            if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty())
                return false;
            if (this.board[color].intersects(this.board.knight)) {
                return (this.board[color].size() <= 2 &&
                    this.board[opposite$1(color)].diff(this.board.king).diff(this.board.queen).isEmpty());
            }
            if (this.board[color].intersects(this.board.bishop)) {
                const sameColor = !this.board.bishop.intersects(SquareSet.darkSquares()) ||
                    !this.board.bishop.intersects(SquareSet.lightSquares());
                return sameColor && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
            }
            return true;
        }
        // The following should be identical in all subclasses
        toSetup() {
            var _a, _b;
            return {
                board: this.board.clone(),
                pockets: (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone(),
                turn: this.turn,
                unmovedRooks: this.castles.unmovedRooks,
                epSquare: legalEpSquare(this),
                remainingChecks: (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone(),
                halfmoves: Math.min(this.halfmoves, 150),
                fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
            };
        }
        isInsufficientMaterial() {
            return COLORS.every(color => this.hasInsufficientMaterial(color));
        }
        hasDests(ctx) {
            ctx = ctx || this.ctx();
            for (const square of this.board[this.turn]) {
                if (this.dests(square, ctx).nonEmpty())
                    return true;
            }
            return this.dropDests(ctx).nonEmpty();
        }
        isLegal(move, ctx) {
            if (isDrop(move)) {
                if (!this.pockets || this.pockets[this.turn][move.role] <= 0)
                    return false;
                if (move.role === 'pawn' && SquareSet.backranks().has(move.to))
                    return false;
                return this.dropDests(ctx).has(move.to);
            }
            else {
                if (move.promotion === 'pawn')
                    return false;
                if (move.promotion === 'king' && this.rules !== 'antichess')
                    return false;
                if (!!move.promotion !== (this.board.pawn.has(move.from) && SquareSet.backranks().has(move.to)))
                    return false;
                const dests = this.dests(move.from, ctx);
                return dests.has(move.to) || dests.has(normalizeMove(this, move).to);
            }
        }
        isCheck() {
            const king = this.board.kingOf(this.turn);
            return defined(king) && this.kingAttackers(king, opposite$1(this.turn), this.board.occupied).nonEmpty();
        }
        isEnd(ctx) {
            if (ctx ? ctx.variantEnd : this.isVariantEnd())
                return true;
            return this.isInsufficientMaterial() || !this.hasDests(ctx);
        }
        isCheckmate(ctx) {
            ctx = ctx || this.ctx();
            return !ctx.variantEnd && ctx.checkers.nonEmpty() && !this.hasDests(ctx);
        }
        isStalemate(ctx) {
            ctx = ctx || this.ctx();
            return !ctx.variantEnd && ctx.checkers.isEmpty() && !this.hasDests(ctx);
        }
        outcome(ctx) {
            const variantOutcome = this.variantOutcome(ctx);
            if (variantOutcome)
                return variantOutcome;
            ctx = ctx || this.ctx();
            if (this.isCheckmate(ctx))
                return { winner: opposite$1(this.turn) };
            else if (this.isInsufficientMaterial() || this.isStalemate(ctx))
                return { winner: undefined };
            else
                return;
        }
        allDests(ctx) {
            ctx = ctx || this.ctx();
            const d = new Map();
            if (ctx.variantEnd)
                return d;
            for (const square of this.board[this.turn]) {
                d.set(square, this.dests(square, ctx));
            }
            return d;
        }
        play(move) {
            const turn = this.turn;
            const epSquare = this.epSquare;
            const castling = castlingSide(this, move);
            this.epSquare = undefined;
            this.halfmoves += 1;
            if (turn === 'black')
                this.fullmoves += 1;
            this.turn = opposite$1(turn);
            if (isDrop(move)) {
                this.board.set(move.to, { role: move.role, color: turn });
                if (this.pockets)
                    this.pockets[turn][move.role]--;
                if (move.role === 'pawn')
                    this.halfmoves = 0;
            }
            else {
                const piece = this.board.take(move.from);
                if (!piece)
                    return;
                let epCapture;
                if (piece.role === 'pawn') {
                    this.halfmoves = 0;
                    if (move.to === epSquare) {
                        epCapture = this.board.take(move.to + (turn === 'white' ? -8 : 8));
                    }
                    const delta = move.from - move.to;
                    if (Math.abs(delta) === 16 && 8 <= move.from && move.from <= 55) {
                        this.epSquare = (move.from + move.to) >> 1;
                    }
                    if (move.promotion) {
                        piece.role = move.promotion;
                        piece.promoted = !!this.pockets;
                    }
                }
                else if (piece.role === 'rook') {
                    this.castles.discardRook(move.from);
                }
                else if (piece.role === 'king') {
                    if (castling) {
                        const rookFrom = this.castles.rook[turn][castling];
                        if (defined(rookFrom)) {
                            const rook = this.board.take(rookFrom);
                            this.board.set(kingCastlesTo(turn, castling), piece);
                            if (rook)
                                this.board.set(rookCastlesTo(turn, castling), rook);
                        }
                    }
                    this.castles.discardColor(turn);
                }
                if (!castling) {
                    const capture = this.board.set(move.to, piece) || epCapture;
                    if (capture)
                        this.playCaptureAt(move.to, capture);
                }
            }
            if (this.remainingChecks) {
                if (this.isCheck())
                    this.remainingChecks[turn] = Math.max(this.remainingChecks[turn] - 1, 0);
            }
        }
    }
    class Chess extends Position {
        constructor() {
            super('chess');
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
    }
    const validEpSquare = (pos, square) => {
        if (!defined(square))
            return;
        const epRank = pos.turn === 'white' ? 5 : 2;
        const forward = pos.turn === 'white' ? 8 : -8;
        if (squareRank(square) !== epRank)
            return;
        if (pos.board.occupied.has(square + forward))
            return;
        const pawn = square - forward;
        if (!pos.board.pawn.has(pawn) || !pos.board[opposite$1(pos.turn)].has(pawn))
            return;
        return square;
    };
    const legalEpSquare = (pos) => {
        if (!defined(pos.epSquare))
            return;
        const ctx = pos.ctx();
        const ourPawns = pos.board.pieces(pos.turn, 'pawn');
        const candidates = ourPawns.intersect(pawnAttacks(opposite$1(pos.turn), pos.epSquare));
        for (const candidate of candidates) {
            if (pos.dests(candidate, ctx).has(pos.epSquare))
                return pos.epSquare;
        }
        return;
    };
    const canCaptureEp = (pos, pawn, ctx) => {
        if (!defined(pos.epSquare))
            return false;
        if (!pawnAttacks(pos.turn, pawn).has(pos.epSquare))
            return false;
        if (!defined(ctx.king))
            return true;
        const captured = pos.epSquare + (pos.turn === 'white' ? -8 : 8);
        const occupied = pos.board.occupied.toggle(pawn).toggle(pos.epSquare).toggle(captured);
        return !pos.kingAttackers(ctx.king, opposite$1(pos.turn), occupied).intersects(occupied);
    };
    const castlingDest = (pos, side, ctx) => {
        if (!defined(ctx.king) || ctx.checkers.nonEmpty())
            return SquareSet.empty();
        const rook = pos.castles.rook[pos.turn][side];
        if (!defined(rook))
            return SquareSet.empty();
        if (pos.castles.path[pos.turn][side].intersects(pos.board.occupied))
            return SquareSet.empty();
        const kingTo = kingCastlesTo(pos.turn, side);
        const kingPath = between(ctx.king, kingTo);
        const occ = pos.board.occupied.without(ctx.king);
        for (const sq of kingPath) {
            if (pos.kingAttackers(sq, opposite$1(pos.turn), occ).nonEmpty())
                return SquareSet.empty();
        }
        const rookTo = rookCastlesTo(pos.turn, side);
        const after = pos.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
        if (pos.kingAttackers(kingTo, opposite$1(pos.turn), after).nonEmpty())
            return SquareSet.empty();
        return SquareSet.fromSquare(rook);
    };
    const pseudoDests = (pos, square, ctx) => {
        if (ctx.variantEnd)
            return SquareSet.empty();
        const piece = pos.board.get(square);
        if (!piece || piece.color !== pos.turn)
            return SquareSet.empty();
        let pseudo = attacks(piece, square, pos.board.occupied);
        if (piece.role === 'pawn') {
            let captureTargets = pos.board[opposite$1(pos.turn)];
            if (defined(pos.epSquare))
                captureTargets = captureTargets.with(pos.epSquare);
            pseudo = pseudo.intersect(captureTargets);
            const delta = pos.turn === 'white' ? 8 : -8;
            const step = square + delta;
            if (0 <= step && step < 64 && !pos.board.occupied.has(step)) {
                pseudo = pseudo.with(step);
                const canDoubleStep = pos.turn === 'white' ? square < 16 : square >= 64 - 16;
                const doubleStep = step + delta;
                if (canDoubleStep && !pos.board.occupied.has(doubleStep)) {
                    pseudo = pseudo.with(doubleStep);
                }
            }
            return pseudo;
        }
        else {
            pseudo = pseudo.diff(pos.board[pos.turn]);
        }
        if (square === ctx.king)
            return pseudo.union(castlingDest(pos, 'a', ctx)).union(castlingDest(pos, 'h', ctx));
        else
            return pseudo;
    };
    const castlingSide = (pos, move) => {
        if (isDrop(move))
            return;
        const delta = move.to - move.from;
        if (Math.abs(delta) !== 2 && !pos.board[pos.turn].has(move.to))
            return;
        if (!pos.board.king.has(move.from))
            return;
        return delta > 0 ? 'h' : 'a';
    };
    const normalizeMove = (pos, move) => {
        const side = castlingSide(pos, move);
        if (!side)
            return move;
        const rookFrom = pos.castles.rook[pos.turn][side];
        return {
            from: move.from,
            to: defined(rookFrom) ? rookFrom : move.to,
        };
    };

    const scalachessCharPair = (move) => isDrop(move)
        ? String.fromCharCode(35 + move.to, 35 + 64 + 8 * 5 + ['queen', 'rook', 'bishop', 'knight', 'pawn'].indexOf(move.role))
        : String.fromCharCode(35 + move.from, move.promotion
            ? 35 + 64 + 8 * ['queen', 'rook', 'bishop', 'knight', 'king'].indexOf(move.promotion) + squareFile(move.to)
            : 35 + move.to);

    var InvalidFen;
    (function (InvalidFen) {
        InvalidFen["Fen"] = "ERR_FEN";
        InvalidFen["Board"] = "ERR_BOARD";
        InvalidFen["Pockets"] = "ERR_POCKETS";
        InvalidFen["Turn"] = "ERR_TURN";
        InvalidFen["Castling"] = "ERR_CASTLING";
        InvalidFen["EpSquare"] = "ERR_EP_SQUARE";
        InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
        InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
        InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
    })(InvalidFen || (InvalidFen = {}));
    class FenError extends Error {
    }
    const nthIndexOf = (haystack, needle, n) => {
        let index = haystack.indexOf(needle);
        while (n-- > 0) {
            if (index === -1)
                break;
            index = haystack.indexOf(needle, index + needle.length);
        }
        return index;
    };
    const parseSmallUint = (str) => (/^\d{1,4}$/.test(str) ? parseInt(str, 10) : undefined);
    const charToPiece = (ch) => {
        const role = charToRole(ch);
        return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
    };
    const parseBoardFen = (boardPart) => {
        const board = Board.empty();
        let rank = 7;
        let file = 0;
        for (let i = 0; i < boardPart.length; i++) {
            const c = boardPart[i];
            if (c === '/' && file === 8) {
                file = 0;
                rank--;
            }
            else {
                const step = parseInt(c, 10);
                if (step > 0)
                    file += step;
                else {
                    if (file >= 8 || rank < 0)
                        return n.err(new FenError(InvalidFen.Board));
                    const square = file + rank * 8;
                    const piece = charToPiece(c);
                    if (!piece)
                        return n.err(new FenError(InvalidFen.Board));
                    if (boardPart[i + 1] === '~') {
                        piece.promoted = true;
                        i++;
                    }
                    board.set(square, piece);
                    file++;
                }
            }
        }
        if (rank !== 0 || file !== 8)
            return n.err(new FenError(InvalidFen.Board));
        return n.ok(board);
    };
    const parsePockets = (pocketPart) => {
        if (pocketPart.length > 64)
            return n.err(new FenError(InvalidFen.Pockets));
        const pockets = Material.empty();
        for (const c of pocketPart) {
            const piece = charToPiece(c);
            if (!piece)
                return n.err(new FenError(InvalidFen.Pockets));
            pockets[piece.color][piece.role]++;
        }
        return n.ok(pockets);
    };
    const parseCastlingFen = (board, castlingPart) => {
        let unmovedRooks = SquareSet.empty();
        if (castlingPart === '-')
            return n.ok(unmovedRooks);
        for (const c of castlingPart) {
            const lower = c.toLowerCase();
            const color = c === lower ? 'black' : 'white';
            const backrank = SquareSet.backrank(color).intersect(board[color]);
            let candidates;
            if (lower === 'q')
                candidates = backrank;
            else if (lower === 'k')
                candidates = backrank.reversed();
            else if ('a' <= lower && lower <= 'h')
                candidates = SquareSet.fromFile(lower.charCodeAt(0) - 'a'.charCodeAt(0)).intersect(backrank);
            else
                return n.err(new FenError(InvalidFen.Castling));
            for (const square of candidates) {
                if (board.king.has(square))
                    break;
                if (board.rook.has(square)) {
                    unmovedRooks = unmovedRooks.with(square);
                    break;
                }
            }
        }
        if (COLORS.some(color => SquareSet.backrank(color).intersect(unmovedRooks).size() > 2))
            return n.err(new FenError(InvalidFen.Castling));
        return n.ok(unmovedRooks);
    };
    const parseRemainingChecks = (part) => {
        const parts = part.split('+');
        if (parts.length === 3 && parts[0] === '') {
            const white = parseSmallUint(parts[1]);
            const black = parseSmallUint(parts[2]);
            if (!defined(white) || white > 3 || !defined(black) || black > 3)
                return n.err(new FenError(InvalidFen.RemainingChecks));
            return n.ok(new RemainingChecks(3 - white, 3 - black));
        }
        else if (parts.length === 2) {
            const white = parseSmallUint(parts[0]);
            const black = parseSmallUint(parts[1]);
            if (!defined(white) || white > 3 || !defined(black) || black > 3)
                return n.err(new FenError(InvalidFen.RemainingChecks));
            return n.ok(new RemainingChecks(white, black));
        }
        else
            return n.err(new FenError(InvalidFen.RemainingChecks));
    };
    const parseFen = (fen) => {
        const parts = fen.split(/[\s_]+/);
        const boardPart = parts.shift();
        // Board and pockets
        let board, pockets = n.ok(undefined);
        if (boardPart.endsWith(']')) {
            const pocketStart = boardPart.indexOf('[');
            if (pocketStart === -1)
                return n.err(new FenError(InvalidFen.Fen));
            board = parseBoardFen(boardPart.slice(0, pocketStart));
            pockets = parsePockets(boardPart.slice(pocketStart + 1, -1));
        }
        else {
            const pocketStart = nthIndexOf(boardPart, '/', 7);
            if (pocketStart === -1)
                board = parseBoardFen(boardPart);
            else {
                board = parseBoardFen(boardPart.slice(0, pocketStart));
                pockets = parsePockets(boardPart.slice(pocketStart + 1));
            }
        }
        // Turn
        let turn;
        const turnPart = parts.shift();
        if (!defined(turnPart) || turnPart === 'w')
            turn = 'white';
        else if (turnPart === 'b')
            turn = 'black';
        else
            return n.err(new FenError(InvalidFen.Turn));
        return board.chain(board => {
            // Castling
            const castlingPart = parts.shift();
            const unmovedRooks = defined(castlingPart) ? parseCastlingFen(board, castlingPart) : n.ok(SquareSet.empty());
            // En passant square
            const epPart = parts.shift();
            let epSquare;
            if (defined(epPart) && epPart !== '-') {
                epSquare = parseSquare(epPart);
                if (!defined(epSquare))
                    return n.err(new FenError(InvalidFen.EpSquare));
            }
            // Halfmoves or remaining checks
            let halfmovePart = parts.shift();
            let earlyRemainingChecks;
            if (defined(halfmovePart) && halfmovePart.includes('+')) {
                earlyRemainingChecks = parseRemainingChecks(halfmovePart);
                halfmovePart = parts.shift();
            }
            const halfmoves = defined(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
            if (!defined(halfmoves))
                return n.err(new FenError(InvalidFen.Halfmoves));
            const fullmovesPart = parts.shift();
            const fullmoves = defined(fullmovesPart) ? parseSmallUint(fullmovesPart) : 1;
            if (!defined(fullmoves))
                return n.err(new FenError(InvalidFen.Fullmoves));
            const remainingChecksPart = parts.shift();
            let remainingChecks = n.ok(undefined);
            if (defined(remainingChecksPart)) {
                if (defined(earlyRemainingChecks))
                    return n.err(new FenError(InvalidFen.RemainingChecks));
                remainingChecks = parseRemainingChecks(remainingChecksPart);
            }
            else if (defined(earlyRemainingChecks)) {
                remainingChecks = earlyRemainingChecks;
            }
            if (parts.length > 0)
                return n.err(new FenError(InvalidFen.Fen));
            return pockets.chain(pockets => unmovedRooks.chain(unmovedRooks => remainingChecks.map(remainingChecks => {
                return {
                    board,
                    pockets,
                    turn,
                    unmovedRooks,
                    remainingChecks,
                    epSquare,
                    halfmoves,
                    fullmoves: Math.max(1, fullmoves),
                };
            })));
        });
    };
    const makePiece$1 = (piece) => {
        let r = roleToChar(piece.role);
        if (piece.color === 'white')
            r = r.toUpperCase();
        if (piece.promoted)
            r += '~';
        return r;
    };
    const makeBoardFen = (board) => {
        let fen = '';
        let empty = 0;
        for (let rank = 7; rank >= 0; rank--) {
            for (let file = 0; file < 8; file++) {
                const square = file + rank * 8;
                const piece = board.get(square);
                if (!piece)
                    empty++;
                else {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    fen += makePiece$1(piece);
                }
                if (file === 7) {
                    if (empty > 0) {
                        fen += empty;
                        empty = 0;
                    }
                    if (rank !== 0)
                        fen += '/';
                }
            }
        }
        return fen;
    };
    const makePocket = (material) => ROLES.map(role => roleToChar(role).repeat(material[role])).join('');
    const makePockets = (pocket) => makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
    const makeCastlingFen = (board, unmovedRooks) => {
        let fen = '';
        for (const color of COLORS) {
            const backrank = SquareSet.backrank(color);
            let king = board.kingOf(color);
            if (defined(king) && !backrank.has(king))
                king = undefined;
            const candidates = board.pieces(color, 'rook').intersect(backrank);
            for (const rook of unmovedRooks.intersect(candidates).reversed()) {
                if (rook === candidates.first() && defined(king) && rook < king) {
                    fen += color === 'white' ? 'Q' : 'q';
                }
                else if (rook === candidates.last() && defined(king) && king < rook) {
                    fen += color === 'white' ? 'K' : 'k';
                }
                else {
                    const file = FILE_NAMES[squareFile(rook)];
                    fen += color === 'white' ? file.toUpperCase() : file;
                }
            }
        }
        return fen || '-';
    };
    const makeRemainingChecks = (checks) => `${checks.white}+${checks.black}`;
    const makeFen = (setup, opts) => [
        makeBoardFen(setup.board) + (setup.pockets ? `[${makePockets(setup.pockets)}]` : ''),
        setup.turn[0],
        makeCastlingFen(setup.board, setup.unmovedRooks),
        defined(setup.epSquare) ? makeSquare(setup.epSquare) : '-',
        ...(setup.remainingChecks ? [makeRemainingChecks(setup.remainingChecks)] : []),
        ...((opts === null || opts === void 0 ? void 0 : opts.epd) ? [] : [Math.max(0, Math.min(setup.halfmoves, 9999)), Math.max(1, Math.min(setup.fullmoves, 9999))]),
    ].join(' ');

    const parseSan = (pos, san) => {
        const ctx = pos.ctx();
        // Normal move
        const match = san.match(/^([NBRQK])?([a-h])?([1-8])?[-x]?([a-h][1-8])(?:=?([nbrqkNBRQK]))?[+#]?$/);
        if (!match) {
            // Castling
            let castlingSide;
            if (san === 'O-O' || san === 'O-O+' || san === 'O-O#')
                castlingSide = 'h';
            else if (san === 'O-O-O' || san === 'O-O-O+' || san === 'O-O-O#')
                castlingSide = 'a';
            if (castlingSide) {
                const rook = pos.castles.rook[pos.turn][castlingSide];
                if (!defined(ctx.king) || !defined(rook) || !pos.dests(ctx.king, ctx).has(rook))
                    return;
                return {
                    from: ctx.king,
                    to: rook,
                };
            }
            // Drop
            const match = san.match(/^([pnbrqkPNBRQK])?@([a-h][1-8])[+#]?$/);
            if (!match)
                return;
            const move = {
                role: match[1] ? charToRole(match[1]) : 'pawn',
                to: parseSquare(match[2]),
            };
            return pos.isLegal(move, ctx) ? move : undefined;
        }
        const role = match[1] ? charToRole(match[1]) : 'pawn';
        const to = parseSquare(match[4]);
        const promotion = match[5] ? charToRole(match[5]) : undefined;
        if (!!promotion !== (role === 'pawn' && SquareSet.backranks().has(to)))
            return;
        if (promotion === 'king' && pos.rules !== 'antichess')
            return;
        let candidates = pos.board.pieces(pos.turn, role);
        if (role === 'pawn' && !match[2])
            candidates = candidates.intersect(SquareSet.fromFile(squareFile(to)));
        else if (match[2])
            candidates = candidates.intersect(SquareSet.fromFile(match[2].charCodeAt(0) - 'a'.charCodeAt(0)));
        if (match[3])
            candidates = candidates.intersect(SquareSet.fromRank(match[3].charCodeAt(0) - '1'.charCodeAt(0)));
        // Optimization: Reduce set of candidates
        const pawnAdvance = role === 'pawn' ? SquareSet.fromFile(squareFile(to)) : SquareSet.empty();
        candidates = candidates.intersect(pawnAdvance.union(attacks({ color: opposite$1(pos.turn), role }, to, pos.board.occupied)));
        // Check uniqueness and legality
        let from;
        for (const candidate of candidates) {
            if (pos.dests(candidate, ctx).has(to)) {
                if (defined(from))
                    return; // Ambiguous
                from = candidate;
            }
        }
        if (!defined(from))
            return; // Illegal
        return {
            from,
            to,
            promotion,
        };
    };

    class Crazyhouse extends Position {
        constructor() {
            super('crazyhouse');
        }
        reset() {
            super.reset();
            this.pockets = Material.empty();
        }
        setupUnchecked(setup) {
            super.setupUnchecked(setup);
            this.board.promoted = setup.board.promoted
                .intersect(setup.board.occupied)
                .diff(setup.board.king)
                .diff(setup.board.pawn);
            this.pockets = setup.pockets ? setup.pockets.clone() : Material.empty();
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        validate(opts) {
            return super.validate(opts).chain(_ => {
                var _a, _b;
                if ((_a = this.pockets) === null || _a === void 0 ? void 0 : _a.count('king')) {
                    return n.err(new PositionError(IllegalSetup.Kings));
                }
                if ((((_b = this.pockets) === null || _b === void 0 ? void 0 : _b.size()) || 0) + this.board.occupied.size() > 64) {
                    return n.err(new PositionError(IllegalSetup.Variant));
                }
                return n.ok(undefined);
            });
        }
        hasInsufficientMaterial(color) {
            // No material can leave the game, but we can easily check this for
            // custom positions.
            if (!this.pockets)
                return super.hasInsufficientMaterial(color);
            return (this.board.occupied.size() + this.pockets.size() <= 3 &&
                this.board.pawn.isEmpty() &&
                this.board.promoted.isEmpty() &&
                this.board.rooksAndQueens().isEmpty() &&
                this.pockets.count('pawn') <= 0 &&
                this.pockets.count('rook') <= 0 &&
                this.pockets.count('queen') <= 0);
        }
        dropDests(ctx) {
            var _a, _b;
            const mask = this.board.occupied
                .complement()
                .intersect(((_a = this.pockets) === null || _a === void 0 ? void 0 : _a[this.turn].hasNonPawns())
                ? SquareSet.full()
                : ((_b = this.pockets) === null || _b === void 0 ? void 0 : _b[this.turn].hasPawns())
                    ? SquareSet.backranks().complement()
                    : SquareSet.empty());
            ctx = ctx || this.ctx();
            if (defined(ctx.king) && ctx.checkers.nonEmpty()) {
                const checker = ctx.checkers.singleSquare();
                if (!defined(checker))
                    return SquareSet.empty();
                return mask.intersect(between(checker, ctx.king));
            }
            else
                return mask;
        }
    }
    class Atomic extends Position {
        constructor() {
            super('atomic');
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        validate(opts) {
            // Like chess, but allow our king to be missing.
            if (this.board.occupied.isEmpty())
                return n.err(new PositionError(IllegalSetup.Empty));
            if (this.board.king.size() > 2)
                return n.err(new PositionError(IllegalSetup.Kings));
            const otherKing = this.board.kingOf(opposite$1(this.turn));
            if (!defined(otherKing))
                return n.err(new PositionError(IllegalSetup.Kings));
            if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
                return n.err(new PositionError(IllegalSetup.OppositeCheck));
            }
            if (SquareSet.backranks().intersects(this.board.pawn)) {
                return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
            }
            return (opts === null || opts === void 0 ? void 0 : opts.ignoreImpossibleCheck) ? n.ok(undefined) : this.validateCheckers();
        }
        validateCheckers() {
            // Other king moving away can cause many checks to be given at the
            // same time. Not checking details or even that the king is close enough.
            return defined(this.epSquare) ? n.ok(undefined) : super.validateCheckers();
        }
        kingAttackers(square, attacker, occupied) {
            const attackerKings = this.board.pieces(attacker, 'king');
            if (attackerKings.isEmpty() || kingAttacks(square).intersects(attackerKings)) {
                return SquareSet.empty();
            }
            return super.kingAttackers(square, attacker, occupied);
        }
        playCaptureAt(square, captured) {
            super.playCaptureAt(square, captured);
            this.board.take(square);
            for (const explode of kingAttacks(square).intersect(this.board.occupied).diff(this.board.pawn)) {
                const piece = this.board.take(explode);
                if ((piece === null || piece === void 0 ? void 0 : piece.role) === 'rook')
                    this.castles.discardRook(explode);
                if ((piece === null || piece === void 0 ? void 0 : piece.role) === 'king')
                    this.castles.discardColor(piece.color);
            }
        }
        hasInsufficientMaterial(color) {
            // Remaining material does not matter if the enemy king is already
            // exploded.
            if (this.board.pieces(opposite$1(color), 'king').isEmpty())
                return false;
            // Bare king cannot mate.
            if (this.board[color].diff(this.board.king).isEmpty())
                return true;
            // As long as the enemy king is not alone, there is always a chance their
            // own pieces explode next to it.
            if (this.board[opposite$1(color)].diff(this.board.king).nonEmpty()) {
                // Unless there are only bishops that cannot explode each other.
                if (this.board.occupied.equals(this.board.bishop.union(this.board.king))) {
                    if (!this.board.bishop.intersect(this.board.white).intersects(SquareSet.darkSquares())) {
                        return !this.board.bishop.intersect(this.board.black).intersects(SquareSet.lightSquares());
                    }
                    if (!this.board.bishop.intersect(this.board.white).intersects(SquareSet.lightSquares())) {
                        return !this.board.bishop.intersect(this.board.black).intersects(SquareSet.darkSquares());
                    }
                }
                return false;
            }
            // Queen or pawn (future queen) can give mate against bare king.
            if (this.board.queen.nonEmpty() || this.board.pawn.nonEmpty())
                return false;
            // Single knight, bishop or rook cannot mate against bare king.
            if (this.board.knight.union(this.board.bishop).union(this.board.rook).size() === 1)
                return true;
            // If only knights, more than two are required to mate bare king.
            if (this.board.occupied.equals(this.board.knight.union(this.board.king))) {
                return this.board.knight.size() <= 2;
            }
            return false;
        }
        dests(square, ctx) {
            ctx = ctx || this.ctx();
            let dests = SquareSet.empty();
            for (const to of pseudoDests(this, square, ctx)) {
                const after = this.clone();
                after.play({ from: square, to });
                const ourKing = after.board.kingOf(this.turn);
                if (defined(ourKing) &&
                    (!defined(after.board.kingOf(after.turn)) ||
                        after.kingAttackers(ourKing, after.turn, after.board.occupied).isEmpty())) {
                    dests = dests.with(to);
                }
            }
            return dests;
        }
        isVariantEnd() {
            return !!this.variantOutcome();
        }
        variantOutcome(_ctx) {
            for (const color of COLORS) {
                if (this.board.pieces(color, 'king').isEmpty())
                    return { winner: opposite$1(color) };
            }
            return;
        }
    }
    class Antichess extends Position {
        constructor() {
            super('antichess');
        }
        reset() {
            super.reset();
            this.castles = Castles.empty();
        }
        setupUnchecked(setup) {
            super.setupUnchecked(setup);
            this.castles = Castles.empty();
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        validate(_opts) {
            if (this.board.occupied.isEmpty())
                return n.err(new PositionError(IllegalSetup.Empty));
            if (SquareSet.backranks().intersects(this.board.pawn))
                return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
            return n.ok(undefined);
        }
        kingAttackers(_square, _attacker, _occupied) {
            return SquareSet.empty();
        }
        ctx() {
            const ctx = super.ctx();
            if (defined(this.epSquare) &&
                pawnAttacks(opposite$1(this.turn), this.epSquare).intersects(this.board.pieces(this.turn, 'pawn'))) {
                ctx.mustCapture = true;
                return ctx;
            }
            const enemy = this.board[opposite$1(this.turn)];
            for (const from of this.board[this.turn]) {
                if (pseudoDests(this, from, ctx).intersects(enemy)) {
                    ctx.mustCapture = true;
                    return ctx;
                }
            }
            return ctx;
        }
        dests(square, ctx) {
            ctx = ctx || this.ctx();
            const dests = pseudoDests(this, square, ctx);
            const enemy = this.board[opposite$1(this.turn)];
            return dests.intersect(ctx.mustCapture
                ? defined(this.epSquare) && this.board.getRole(square) === 'pawn'
                    ? enemy.with(this.epSquare)
                    : enemy
                : SquareSet.full());
        }
        hasInsufficientMaterial(color) {
            if (this.board[color].isEmpty())
                return false;
            if (this.board[opposite$1(color)].isEmpty())
                return true;
            if (this.board.occupied.equals(this.board.bishop)) {
                const weSomeOnLight = this.board[color].intersects(SquareSet.lightSquares());
                const weSomeOnDark = this.board[color].intersects(SquareSet.darkSquares());
                const theyAllOnDark = this.board[opposite$1(color)].isDisjoint(SquareSet.lightSquares());
                const theyAllOnLight = this.board[opposite$1(color)].isDisjoint(SquareSet.darkSquares());
                return (weSomeOnLight && theyAllOnDark) || (weSomeOnDark && theyAllOnLight);
            }
            if (this.board.occupied.equals(this.board.knight) && this.board.occupied.size() === 2) {
                return ((this.board.white.intersects(SquareSet.lightSquares()) !==
                    this.board.black.intersects(SquareSet.darkSquares())) !==
                    (this.turn === color));
            }
            return false;
        }
        isVariantEnd() {
            return this.board[this.turn].isEmpty();
        }
        variantOutcome(ctx) {
            ctx = ctx || this.ctx();
            if (ctx.variantEnd || this.isStalemate(ctx)) {
                return { winner: this.turn };
            }
            return;
        }
    }
    class KingOfTheHill extends Position {
        constructor() {
            super('kingofthehill');
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        hasInsufficientMaterial(_color) {
            return false;
        }
        isVariantEnd() {
            return this.board.king.intersects(SquareSet.center());
        }
        variantOutcome(_ctx) {
            for (const color of COLORS) {
                if (this.board.pieces(color, 'king').intersects(SquareSet.center()))
                    return { winner: color };
            }
            return;
        }
    }
    class ThreeCheck extends Position {
        constructor() {
            super('3check');
        }
        reset() {
            super.reset();
            this.remainingChecks = RemainingChecks.default();
        }
        setupUnchecked(setup) {
            var _a;
            super.setupUnchecked(setup);
            this.remainingChecks = ((_a = setup.remainingChecks) === null || _a === void 0 ? void 0 : _a.clone()) || RemainingChecks.default();
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        hasInsufficientMaterial(color) {
            return this.board.pieces(color, 'king').equals(this.board[color]);
        }
        isVariantEnd() {
            return !!this.remainingChecks && (this.remainingChecks.white <= 0 || this.remainingChecks.black <= 0);
        }
        variantOutcome(_ctx) {
            if (this.remainingChecks) {
                for (const color of COLORS) {
                    if (this.remainingChecks[color] <= 0)
                        return { winner: color };
                }
            }
            return;
        }
    }
    const racingKingsBoard = () => {
        const board = Board.empty();
        board.occupied = new SquareSet(0xffff, 0);
        board.promoted = SquareSet.empty();
        board.white = new SquareSet(0xf0f0, 0);
        board.black = new SquareSet(0x0f0f, 0);
        board.pawn = SquareSet.empty();
        board.knight = new SquareSet(0x1818, 0);
        board.bishop = new SquareSet(0x2424, 0);
        board.rook = new SquareSet(0x4242, 0);
        board.queen = new SquareSet(0x0081, 0);
        board.king = new SquareSet(0x8100, 0);
        return board;
    };
    class RacingKings extends Position {
        constructor() {
            super('racingkings');
        }
        reset() {
            this.board = racingKingsBoard();
            this.pockets = undefined;
            this.turn = 'white';
            this.castles = Castles.empty();
            this.epSquare = undefined;
            this.remainingChecks = undefined;
            this.halfmoves = 0;
            this.fullmoves = 1;
        }
        setupUnchecked(setup) {
            super.setupUnchecked(setup);
            this.castles = Castles.empty();
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        validate(opts) {
            if (this.isCheck() || this.board.pawn.nonEmpty())
                return n.err(new PositionError(IllegalSetup.Variant));
            return super.validate(opts);
        }
        dests(square, ctx) {
            ctx = ctx || this.ctx();
            // Kings cannot give check.
            if (square === ctx.king)
                return super.dests(square, ctx);
            // Do not allow giving check.
            let dests = SquareSet.empty();
            for (const to of super.dests(square, ctx)) {
                // Valid, because there are no promotions (or even pawns).
                const move = { from: square, to };
                const after = this.clone();
                after.play(move);
                if (!after.isCheck())
                    dests = dests.with(to);
            }
            return dests;
        }
        hasInsufficientMaterial(_color) {
            return false;
        }
        isVariantEnd() {
            const goal = SquareSet.fromRank(7);
            const inGoal = this.board.king.intersect(goal);
            if (inGoal.isEmpty())
                return false;
            if (this.turn === 'white' || inGoal.intersects(this.board.black))
                return true;
            // White has reached the backrank. Check if black can catch up.
            const blackKing = this.board.kingOf('black');
            if (defined(blackKing)) {
                const occ = this.board.occupied.without(blackKing);
                for (const target of kingAttacks(blackKing).intersect(goal).diff(this.board.black)) {
                    if (this.kingAttackers(target, 'white', occ).isEmpty())
                        return false;
                }
            }
            return true;
        }
        variantOutcome(ctx) {
            if (ctx ? !ctx.variantEnd : !this.isVariantEnd())
                return;
            const goal = SquareSet.fromRank(7);
            const blackInGoal = this.board.pieces('black', 'king').intersects(goal);
            const whiteInGoal = this.board.pieces('white', 'king').intersects(goal);
            if (blackInGoal && !whiteInGoal)
                return { winner: 'black' };
            if (whiteInGoal && !blackInGoal)
                return { winner: 'white' };
            return { winner: undefined };
        }
    }
    const hordeBoard = () => {
        const board = Board.empty();
        board.occupied = new SquareSet(4294967295, 4294901862);
        board.promoted = SquareSet.empty();
        board.white = new SquareSet(4294967295, 102);
        board.black = new SquareSet(0, 4294901760);
        board.pawn = new SquareSet(4294967295, 16711782);
        board.knight = new SquareSet(0, 1107296256);
        board.bishop = new SquareSet(0, 603979776);
        board.rook = new SquareSet(0, 2164260864);
        board.queen = new SquareSet(0, 134217728);
        board.king = new SquareSet(0, 268435456);
        return board;
    };
    class Horde extends Position {
        constructor() {
            super('horde');
        }
        reset() {
            this.board = hordeBoard();
            this.pockets = undefined;
            this.turn = 'white';
            this.castles = Castles.default();
            this.castles.discardColor('white');
            this.epSquare = undefined;
            this.remainingChecks = undefined;
            this.halfmoves = 0;
            this.fullmoves = 1;
        }
        static default() {
            const pos = new this();
            pos.reset();
            return pos;
        }
        static fromSetup(setup, opts) {
            const pos = new this();
            pos.setupUnchecked(setup);
            return pos.validate(opts).map(_ => pos);
        }
        clone() {
            return super.clone();
        }
        validate(opts) {
            if (this.board.occupied.isEmpty())
                return n.err(new PositionError(IllegalSetup.Empty));
            if (this.board.king.size() !== 1)
                return n.err(new PositionError(IllegalSetup.Kings));
            const otherKing = this.board.kingOf(opposite$1(this.turn));
            if (defined(otherKing) && this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty())
                return n.err(new PositionError(IllegalSetup.OppositeCheck));
            for (const color of COLORS) {
                const backranks = this.board.pieces(color, 'king').isEmpty()
                    ? SquareSet.backrank(opposite$1(color))
                    : SquareSet.backranks();
                if (this.board.pieces(color, 'pawn').intersects(backranks)) {
                    return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
                }
            }
            return (opts === null || opts === void 0 ? void 0 : opts.ignoreImpossibleCheck) ? n.ok(undefined) : this.validateCheckers();
        }
        hasInsufficientMaterial(_color) {
            // TODO: Could detect cases where the horde cannot mate.
            return false;
        }
        isVariantEnd() {
            return this.board.white.isEmpty() || this.board.black.isEmpty();
        }
        variantOutcome(_ctx) {
            if (this.board.white.isEmpty())
                return { winner: 'black' };
            if (this.board.black.isEmpty())
                return { winner: 'white' };
            return;
        }
    }
    const defaultPosition = (rules) => {
        switch (rules) {
            case 'chess':
                return Chess.default();
            case 'antichess':
                return Antichess.default();
            case 'atomic':
                return Atomic.default();
            case 'horde':
                return Horde.default();
            case 'racingkings':
                return RacingKings.default();
            case 'kingofthehill':
                return KingOfTheHill.default();
            case '3check':
                return ThreeCheck.default();
            case 'crazyhouse':
                return Crazyhouse.default();
        }
    };
    const setupPosition = (rules, setup, opts) => {
        switch (rules) {
            case 'chess':
                return Chess.fromSetup(setup, opts);
            case 'antichess':
                return Antichess.fromSetup(setup, opts);
            case 'atomic':
                return Atomic.fromSetup(setup, opts);
            case 'horde':
                return Horde.fromSetup(setup, opts);
            case 'racingkings':
                return RacingKings.fromSetup(setup, opts);
            case 'kingofthehill':
                return KingOfTheHill.fromSetup(setup, opts);
            case '3check':
                return ThreeCheck.fromSetup(setup, opts);
            case 'crazyhouse':
                return Crazyhouse.fromSetup(setup, opts);
        }
    };

    const defaultGame = (initHeaders = defaultHeaders) => ({
        headers: initHeaders(),
        moves: new Node(),
    });
    class Node {
        constructor() {
            this.children = [];
        }
        *mainline() {
            let node = this;
            while (node.children.length) {
                const child = node.children[0];
                yield child.data;
                node = child;
            }
        }
    }
    class ChildNode extends Node {
        constructor(data) {
            super();
            this.data = data;
        }
    }
    const transform = (node, ctx, f) => {
        const root = new Node();
        const stack = [
            {
                before: node,
                after: root,
                ctx,
            },
        ];
        let frame;
        while ((frame = stack.pop())) {
            for (let childIndex = 0; childIndex < frame.before.children.length; childIndex++) {
                const ctx = childIndex < frame.before.children.length - 1 ? frame.ctx.clone() : frame.ctx;
                const childBefore = frame.before.children[childIndex];
                const data = f(ctx, childBefore.data, childIndex);
                if (defined(data)) {
                    const childAfter = new ChildNode(data);
                    frame.after.children.push(childAfter);
                    stack.push({
                        before: childBefore,
                        after: childAfter,
                        ctx,
                    });
                }
            }
        }
        return root;
    };
    const defaultHeaders = () => new Map([
        ['Event', '?'],
        ['Site', '?'],
        ['Date', '????.??.??'],
        ['Round', '?'],
        ['White', '?'],
        ['Black', '?'],
        ['Result', '*'],
    ]);
    const BOM = '\ufeff';
    const isWhitespace = (line) => /^\s*$/.test(line);
    const isCommentLine = (line) => line.startsWith('%');
    class PgnError extends Error {
    }
    class PgnParser {
        constructor(emitGame, initHeaders = defaultHeaders, maxBudget = 1000000) {
            this.emitGame = emitGame;
            this.initHeaders = initHeaders;
            this.maxBudget = maxBudget;
            this.lineBuf = [];
            this.resetGame();
            this.state = 0 /* ParserState.Bom */;
        }
        resetGame() {
            this.budget = this.maxBudget;
            this.found = false;
            this.state = 1 /* ParserState.Pre */;
            this.game = defaultGame(this.initHeaders);
            this.consecutiveEmptyLines = 0;
            this.stack = [{ parent: this.game.moves, root: true }];
            this.commentBuf = [];
        }
        consumeBudget(cost) {
            this.budget -= cost;
            if (this.budget < 0)
                throw new PgnError('ERR_PGN_BUDGET');
        }
        parse(data, options) {
            if (this.budget < 0)
                return;
            try {
                let idx = 0;
                for (;;) {
                    const nlIdx = data.indexOf('\n', idx);
                    if (nlIdx === -1) {
                        break;
                    }
                    const crIdx = nlIdx > idx && data[nlIdx - 1] === '\r' ? nlIdx - 1 : nlIdx;
                    this.consumeBudget(nlIdx - idx);
                    this.lineBuf.push(data.slice(idx, crIdx));
                    idx = nlIdx + 1;
                    this.handleLine();
                }
                this.consumeBudget(data.length - idx);
                this.lineBuf.push(data.slice(idx));
                if (!(options === null || options === void 0 ? void 0 : options.stream)) {
                    this.handleLine();
                    this.emit(undefined);
                }
            }
            catch (err) {
                this.emit(err);
            }
        }
        handleLine() {
            let freshLine = true;
            let line = this.lineBuf.join('');
            this.lineBuf = [];
            continuedLine: for (;;) {
                switch (this.state) {
                    case 0 /* ParserState.Bom */:
                        if (line.startsWith(BOM))
                            line = line.slice(BOM.length);
                        this.state = 1 /* ParserState.Pre */; // fall through
                    case 1 /* ParserState.Pre */:
                        if (isWhitespace(line) || isCommentLine(line))
                            return;
                        this.state = 2 /* ParserState.Headers */; // fall through
                    case 2 /* ParserState.Headers */:
                        if (isCommentLine(line))
                            return;
                        if (this.consecutiveEmptyLines < 1 && isWhitespace(line)) {
                            this.consecutiveEmptyLines++;
                            return;
                        }
                        this.found = true;
                        this.consecutiveEmptyLines = 0;
                        if (line.startsWith('[')) {
                            this.consumeBudget(200);
                            const matches = line.match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]\s*$/);
                            if (matches)
                                this.game.headers.set(matches[1], matches[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
                            return;
                        }
                        this.state = 3 /* ParserState.Moves */; // fall through
                    case 3 /* ParserState.Moves */: {
                        if (freshLine) {
                            if (isCommentLine(line))
                                return;
                            if (isWhitespace(line))
                                return this.emit(undefined);
                        }
                        const tokenRegex = /(?:[NBKRQ]?[a-h]?[1-8]?[-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|[pnbrqkPNBRQK]?@[a-h][1-8]|O-O-O|0-0-0|O-O|0-0)[+#]?|--|Z0|0000|@@@@|{|;|\$\d{1,4}|[?!]{1,2}|\(|\)|\*|1-0|0-1|1\/2-1\/2/g;
                        let match;
                        while ((match = tokenRegex.exec(line))) {
                            const frame = this.stack[this.stack.length - 1];
                            let token = match[0];
                            if (token === ';')
                                return;
                            else if (token.startsWith('$'))
                                this.handleNag(parseInt(token.slice(1), 10));
                            else if (token === '!')
                                this.handleNag(1);
                            else if (token === '?')
                                this.handleNag(2);
                            else if (token === '!!')
                                this.handleNag(3);
                            else if (token === '??')
                                this.handleNag(4);
                            else if (token === '!?')
                                this.handleNag(5);
                            else if (token === '?!')
                                this.handleNag(6);
                            else if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
                                if (this.stack.length === 1 && token !== '*')
                                    this.game.headers.set('Result', token);
                            }
                            else if (token === '(') {
                                this.consumeBudget(100);
                                this.stack.push({ parent: frame.parent, root: false });
                            }
                            else if (token === ')') {
                                if (this.stack.length > 1)
                                    this.stack.pop();
                            }
                            else if (token === '{') {
                                const openIndex = tokenRegex.lastIndex;
                                const beginIndex = line[openIndex] === ' ' ? openIndex + 1 : openIndex;
                                line = line.slice(beginIndex);
                                this.state = 4 /* ParserState.Comment */;
                                continue continuedLine;
                            }
                            else {
                                this.consumeBudget(100);
                                if (token === 'Z0' || token === '0000' || token === '@@@@')
                                    token = '--';
                                else if (token.startsWith('0'))
                                    token = token.replace(/0/g, 'O');
                                if (frame.node)
                                    frame.parent = frame.node;
                                frame.node = new ChildNode({
                                    san: token,
                                    startingComments: frame.startingComments,
                                });
                                frame.startingComments = undefined;
                                frame.root = false;
                                frame.parent.children.push(frame.node);
                            }
                        }
                        return;
                    }
                    case 4 /* ParserState.Comment */: {
                        const closeIndex = line.indexOf('}');
                        if (closeIndex === -1) {
                            this.commentBuf.push(line);
                            return;
                        }
                        else {
                            const endIndex = closeIndex > 0 && line[closeIndex - 1] === ' ' ? closeIndex - 1 : closeIndex;
                            this.commentBuf.push(line.slice(0, endIndex));
                            this.handleComment();
                            line = line.slice(closeIndex);
                            this.state = 3 /* ParserState.Moves */;
                            freshLine = false;
                        }
                    }
                }
            }
        }
        handleNag(nag) {
            var _a;
            this.consumeBudget(50);
            const frame = this.stack[this.stack.length - 1];
            if (frame.node) {
                (_a = frame.node.data).nags || (_a.nags = []);
                frame.node.data.nags.push(nag);
            }
        }
        handleComment() {
            var _a, _b;
            this.consumeBudget(100);
            const frame = this.stack[this.stack.length - 1];
            const comment = this.commentBuf.join('\n');
            this.commentBuf = [];
            if (frame.node) {
                (_a = frame.node.data).comments || (_a.comments = []);
                frame.node.data.comments.push(comment);
            }
            else if (frame.root) {
                (_b = this.game).comments || (_b.comments = []);
                this.game.comments.push(comment);
            }
            else {
                frame.startingComments || (frame.startingComments = []);
                frame.startingComments.push(comment);
            }
        }
        emit(err) {
            if (this.state === 4 /* ParserState.Comment */)
                this.handleComment();
            if (err)
                return this.emitGame(this.game, err);
            if (this.found)
                this.emitGame(this.game, undefined);
            this.resetGame();
        }
    }
    const parsePgn = (pgn, initHeaders = defaultHeaders) => {
        const games = [];
        new PgnParser(game => games.push(game), initHeaders, NaN).parse(pgn);
        return games;
    };
    const parseVariant = (variant) => {
        switch ((variant || 'chess').toLowerCase()) {
            case 'chess':
            case 'chess960':
            case 'chess 960':
            case 'standard':
            case 'from position':
            case 'classical':
            case 'normal':
            case 'fischerandom': // Cute Chess
            case 'fischerrandom':
            case 'fischer random':
            case 'wild/0':
            case 'wild/1':
            case 'wild/2':
            case 'wild/3':
            case 'wild/4':
            case 'wild/5':
            case 'wild/6':
            case 'wild/7':
            case 'wild/8':
            case 'wild/8a':
                return 'chess';
            case 'crazyhouse':
            case 'crazy house':
            case 'house':
            case 'zh':
                return 'crazyhouse';
            case 'king of the hill':
            case 'koth':
            case 'kingofthehill':
                return 'kingofthehill';
            case 'three-check':
            case 'three check':
            case 'threecheck':
            case 'three check chess':
            case '3-check':
            case '3 check':
            case '3check':
                return '3check';
            case 'antichess':
            case 'anti chess':
            case 'anti':
                return 'antichess';
            case 'atomic':
            case 'atom':
            case 'atomic chess':
                return 'atomic';
            case 'horde':
            case 'horde chess':
                return 'horde';
            case 'racing kings':
            case 'racingkings':
            case 'racing':
            case 'race':
                return 'racingkings';
            default:
                return;
        }
    };
    const startingPosition = (headers, opts) => {
        const rules = parseVariant(headers.get('Variant'));
        if (!rules)
            return n.err(new PositionError(IllegalSetup.Variant));
        const fen = headers.get('FEN');
        if (fen)
            return parseFen(fen).chain(setup => setupPosition(rules, setup, opts));
        else
            return n.ok(defaultPosition(rules));
    };
    function parseCommentShapeColor(str) {
        switch (str) {
            case 'G':
                return 'green';
            case 'R':
                return 'red';
            case 'Y':
                return 'yellow';
            case 'B':
                return 'blue';
            default:
                return;
        }
    }
    const parseCommentShape = (str) => {
        const color = parseCommentShapeColor(str.slice(0, 1));
        const from = parseSquare(str.slice(1, 3));
        const to = parseSquare(str.slice(3, 5));
        if (!color || !defined(from))
            return;
        if (str.length === 3)
            return { color, from, to: from };
        if (str.length === 5 && defined(to))
            return { color, from, to };
        return;
    };
    const parseComment = (comment) => {
        let emt, clock;
        const shapes = [];
        const text = comment
            .replace(/(\s?)\[%(emt|clk)\s(\d{1,5}):(\d{1,2}):(\d{1,2}(?:\.\d{0,5})?)\](\s?)/g, (_, prefix, annotation, hours, minutes, seconds, suffix) => {
            const value = parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseFloat(seconds);
            if (annotation === 'emt')
                emt = value;
            else if (annotation === 'clk')
                clock = value;
            return prefix && suffix;
        })
            .replace(/(\s?)\[%(?:csl|cal)\s([RGYB][a-h][1-8](?:[a-h][1-8])?(?:,[RGYB][a-h][1-8](?:[a-h][1-8])?)*)\](\s?)/g, (_, prefix, arrows, suffix) => {
            for (const arrow of arrows.split(',')) {
                shapes.push(parseCommentShape(arrow));
            }
            return prefix && suffix;
        });
        return {
            text,
            shapes,
            emt,
            clock,
        };
    };

    function translate$1(translator) {
        return translator || defaultTranslator;
    }
    const defaultTranslator = (key) => defaultTranslations[key] || key;
    const defaultTranslations = {
        flipTheBoard: 'Flip the board',
        analysisBoard: 'Analysis board',
        practiceWithComputer: 'Practice with computer',
        getPgn: 'Get PGN',
        download: 'Download',
        viewOnLichess: 'View on Lichess',
        viewOnSite: 'View on site',
    };

    const colors = ['white', 'black'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const invRanks = [...ranks].reverse();
    const allKeys = Array.prototype.concat(...files.map(c => ranks.map(r => c + r)));
    const pos2key = (pos) => allKeys[8 * pos[0] + pos[1]];
    const key2pos = (k) => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];
    const uciToMove = (uci) => {
        if (!uci)
            return undefined;
        if (uci[1] === '@')
            return [uci.slice(2, 4)];
        return [uci.slice(0, 2), uci.slice(2, 4)];
    };
    const allPos = allKeys.map(key2pos);
    function memo(f) {
        let v;
        const ret = () => {
            if (v === undefined)
                v = f();
            return v;
        };
        ret.clear = () => {
            v = undefined;
        };
        return ret;
    }
    const timer = () => {
        let startAt;
        return {
            start() {
                startAt = performance.now();
            },
            cancel() {
                startAt = undefined;
            },
            stop() {
                if (!startAt)
                    return 0;
                const time = performance.now() - startAt;
                startAt = undefined;
                return time;
            },
        };
    };
    const opposite = (c) => (c === 'white' ? 'black' : 'white');
    const distanceSq = (pos1, pos2) => {
        const dx = pos1[0] - pos2[0], dy = pos1[1] - pos2[1];
        return dx * dx + dy * dy;
    };
    const samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
    const posToTranslate = (bounds) => (pos, asWhite) => [((asWhite ? pos[0] : 7 - pos[0]) * bounds.width) / 8, ((asWhite ? 7 - pos[1] : pos[1]) * bounds.height) / 8];
    const translate = (el, pos) => {
        el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
    };
    const translateAndScale = (el, pos, scale = 1) => {
        el.style.transform = `translate(${pos[0]}px,${pos[1]}px) scale(${scale})`;
    };
    const setVisible = (el, v) => {
        el.style.visibility = v ? 'visible' : 'hidden';
    };
    const eventPosition = (e) => {
        var _a;
        if (e.clientX || e.clientX === 0)
            return [e.clientX, e.clientY];
        if ((_a = e.targetTouches) === null || _a === void 0 ? void 0 : _a[0])
            return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
        return; // touchend has no position!
    };
    const isRightButton = (e) => e.buttons === 2 || e.button === 2;
    const createEl = (tagName, className) => {
        const el = document.createElement(tagName);
        if (className)
            el.className = className;
        return el;
    };
    function computeSquareCenter(key, asWhite, bounds) {
        const pos = key2pos(key);
        if (!asWhite) {
            pos[0] = 7 - pos[0];
            pos[1] = 7 - pos[1];
        }
        return [
            bounds.left + (bounds.width * pos[0]) / 8 + bounds.width / 16,
            bounds.top + (bounds.height * (7 - pos[1])) / 8 + bounds.height / 16,
        ];
    }

    class Path {
        constructor(path) {
            this.path = path;
            this.size = () => this.path.length / 2;
            this.head = () => this.path.slice(0, 2);
            // returns an invalid path doesn't starting from root
            this.tail = () => new Path(this.path.slice(2));
            this.init = () => new Path(this.path.slice(0, -2));
            this.last = () => this.path.slice(-2);
            this.empty = () => this.path == '';
            this.contains = (other) => this.path.startsWith(other.path);
            this.isChildOf = (parent) => this.init() === parent;
            this.append = (id) => new Path(this.path + id);
            this.equals = (other) => this.path == other.path;
        }
    }
    Path.root = new Path('');

    // immutable
    class Game {
        constructor(initial, moves, players, metadata) {
            this.initial = initial;
            this.moves = moves;
            this.players = players;
            this.metadata = metadata;
            this.nodeAt = (path) => {
                if (path.empty())
                    return this.moves;
                const tree = this.moves.children.find(c => c.data.path.path == path.head());
                return tree && nodeAtPathFrom(tree, path.tail());
            };
            this.dataAt = (path) => {
                const node = this.nodeAt(path);
                return node ? (isMoveNode(node) ? node.data : this.initial) : undefined;
            };
            this.title = () => [this.players.white.title, this.players.white.name, 'vs', this.players.black.title, this.players.black.name]
                .filter(x => x && !!x.trim())
                .join('_')
                .replace(' ', '-');
            this.pathAtMainlinePly = (ply) => this.mainline[Math.max(0, Math.min(this.mainline.length - 1, ply == 'last' ? 9999 : ply))].path;
            this.mainline = Array.from(this.moves.mainline());
        }
    }
    const childById = (node, id) => node.children.find(c => c.data.path.last() == id);
    const nodeAtPathFrom = (node, path) => {
        if (path.empty())
            return node;
        const child = childById(node, path.head());
        return child ? nodeAtPathFrom(child, path.tail()) : node;
    };
    const isMoveNode = (n) => 'data' in n;
    const isMoveData = (d) => 'uci' in d;

    class State {
        constructor(pos, path, clocks) {
            this.pos = pos;
            this.path = path;
            this.clocks = clocks;
            this.clone = () => new State(this.pos.clone(), this.path, { ...this.clocks });
        }
    }
    const parseComments = (strings) => {
        const comments = strings.map(parseComment);
        const reduceTimes = (times) => times.reduce((last, time) => (typeof time == undefined ? last : time), undefined);
        return {
            texts: comments.map(c => c.text).filter(t => !!t),
            shapes: comments.flatMap(c => c.shapes),
            clock: reduceTimes(comments.map(c => c.clock)),
            emt: reduceTimes(comments.map(c => c.emt)),
        };
    };
    const makeGame = (pgn) => {
        var _a, _b;
        const game = parsePgn(pgn)[0] || parsePgn('*')[0];
        const start = startingPosition(game.headers).unwrap();
        const fen = makeFen(start.toSetup());
        const comments = parseComments(game.comments || []);
        const headers = new Map(Array.from(game.headers, ([key, value]) => [key.toLowerCase(), value]));
        const metadata = makeMetadata(headers);
        const initial = {
            fen,
            turn: start.turn,
            check: start.isCheck(),
            pos: start,
            comments: comments.texts,
            shapes: comments.shapes,
            clocks: {
                white: ((_a = metadata.timeControl) === null || _a === void 0 ? void 0 : _a.initial) || comments.clock,
                black: ((_b = metadata.timeControl) === null || _b === void 0 ? void 0 : _b.initial) || comments.clock,
            },
        };
        const moves = makeMoves(start, game.moves, metadata);
        const players = makePlayers(headers);
        return new Game(initial, moves, players, metadata);
    };
    const makeMoves = (start, moves, metadata) => transform(moves, new State(start, Path.root, {}), (state, node, _index) => {
        const move = parseSan(state.pos, node.san);
        if (!move)
            return undefined;
        const moveId = scalachessCharPair(move);
        const path = state.path.append(moveId);
        state.pos.play(move);
        state.path = path;
        const setup = state.pos.toSetup();
        const comments = parseComments(node.comments || []);
        const startingComments = parseComments(node.startingComments || []);
        const shapes = [...comments.shapes, ...startingComments.shapes];
        const ply = (setup.fullmoves - 1) * 2 + (state.pos.turn === 'white' ? 0 : 1);
        let clocks = (state.clocks = makeClocks(state.clocks, state.pos.turn, comments.clock));
        if (ply < 2 && metadata.timeControl)
            clocks = {
                white: metadata.timeControl.initial,
                black: metadata.timeControl.initial,
                ...clocks,
            };
        const moveNode = {
            path,
            ply,
            move,
            san: node.san,
            uci: makeUci(move),
            fen: makeFen(state.pos.toSetup()),
            turn: state.pos.turn,
            check: state.pos.isCheck(),
            comments: comments.texts,
            startingComments: startingComments.texts,
            nags: node.nags || [],
            shapes,
            clocks,
            emt: comments.emt,
        };
        return moveNode;
    });
    const makeClocks = (prev, turn, clk) => turn == 'white' ? { ...prev, black: clk } : { ...prev, white: clk };
    function makePlayers(headers) {
        const get = (color, field) => headers.get(`${color}${field}`);
        const makePlayer = (color) => ({
            name: get(color, ''),
            title: get(color, 'title'),
            rating: parseInt(get(color, 'elo') || '') || undefined,
        });
        return {
            white: makePlayer('white'),
            black: makePlayer('black'),
        };
    }
    function makeMetadata(headers) {
        var _a;
        const site = headers.get('site');
        const tcs = (_a = headers
            .get('timecontrol')) === null || _a === void 0 ? void 0 : _a.split('+').map(x => parseInt(x));
        const timeControl = tcs && tcs[0]
            ? {
                initial: tcs[0],
                increment: tcs[1] || 0,
            }
            : undefined;
        return {
            externalLink: site && site.startsWith('https://') ? site : undefined,
            isLichess: !!site && site.startsWith('https://lichess.org/'),
            timeControl,
        };
    }

    class Ctrl {
        constructor(opts, redraw) {
            this.opts = opts;
            this.redraw = redraw;
            this.flipped = false;
            this.pane = 'board';
            this.autoScrollRequested = false;
            this.curNode = () => this.game.nodeAt(this.path) || this.game.moves;
            this.curData = () => this.game.dataAt(this.path) || this.game.initial;
            this.goTo = (to) => {
                var _a, _b;
                const path = to == 'first'
                    ? Path.root
                    : to == 'prev'
                        ? this.path.init()
                        : to == 'next'
                            ? (_b = (_a = this.game.nodeAt(this.path)) === null || _a === void 0 ? void 0 : _a.children[0]) === null || _b === void 0 ? void 0 : _b.data.path
                            : this.game.pathAtMainlinePly('last');
                this.toPath(path || this.path);
            };
            this.canGoTo = (to) => (to == 'prev' || to == 'first' ? !this.path.empty() : !!this.curNode().children[0]);
            this.toPath = (path) => {
                this.path = path;
                this.pane = 'board';
                this.autoScrollRequested = true;
                this.redrawGround();
                this.redraw();
            };
            this.toggleMenu = () => {
                this.pane = this.pane == 'board' ? 'menu' : 'board';
                this.redraw();
            };
            this.togglePgn = () => {
                this.pane = this.pane == 'pgn' ? 'board' : 'pgn';
                this.redraw();
            };
            this.orientation = () => {
                const base = this.opts.orientation || 'white';
                return this.flipped ? opposite$1(base) : base;
            };
            this.flip = () => {
                this.flipped = !this.flipped;
                this.pane = 'board';
                this.redrawGround();
                this.redraw();
            };
            this.cgConfig = () => {
                const data = this.curData();
                const lastMove = isMoveData(data) ? uciToMove(data.uci) : undefined;
                return {
                    ...(this.opts.chessground || {}),
                    fen: this.curData().fen,
                    orientation: this.orientation(),
                    check: this.curData().check,
                    lastMove,
                    turnColor: data.turn,
                };
            };
            this.analysisUrl = () => (this.game.metadata.isLichess && this.game.metadata.externalLink) ||
                `https://lichess.org/analysis/${this.curData().fen.replace(' ', '_')}?color=${this.orientation}`;
            this.practiceUrl = () => `${this.analysisUrl()}#practice`;
            this.setGround = (cg) => {
                this.ground = cg;
                this.redrawGround();
            };
            this.redrawGround = () => this.withGround(g => {
                g.set(this.cgConfig());
                g.setShapes(this.curData().shapes.map(s => ({
                    orig: makeSquare(s.from),
                    dest: makeSquare(s.to),
                    brush: s.color,
                })));
            });
            this.withGround = (f) => this.ground && f(this.ground);
            this.game = makeGame(opts.pgn);
            this.translate = translate$1(opts.translate);
            this.path = this.game.pathAtMainlinePly(opts.initialPly);
        }
    }

    function diff(a, b) {
        return Math.abs(a - b);
    }
    function pawn(color) {
        return (x1, y1, x2, y2) => diff(x1, x2) < 2 &&
            (color === 'white'
                ? // allow 2 squares from first two ranks, for horde
                    y2 === y1 + 1 || (y1 <= 1 && y2 === y1 + 2 && x1 === x2)
                : y2 === y1 - 1 || (y1 >= 6 && y2 === y1 - 2 && x1 === x2));
    }
    const knight = (x1, y1, x2, y2) => {
        const xd = diff(x1, x2);
        const yd = diff(y1, y2);
        return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
    };
    const bishop = (x1, y1, x2, y2) => {
        return diff(x1, x2) === diff(y1, y2);
    };
    const rook = (x1, y1, x2, y2) => {
        return x1 === x2 || y1 === y2;
    };
    const queen = (x1, y1, x2, y2) => {
        return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
    };
    function king(color, rookFiles, canCastle) {
        return (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) ||
            (canCastle &&
                y1 === y2 &&
                y1 === (color === 'white' ? 0 : 7) &&
                ((x1 === 4 && ((x2 === 2 && rookFiles.includes(0)) || (x2 === 6 && rookFiles.includes(7)))) ||
                    rookFiles.includes(x2)));
    }
    function rookFilesOf(pieces, color) {
        const backrank = color === 'white' ? '1' : '8';
        const files = [];
        for (const [key, piece] of pieces) {
            if (key[1] === backrank && piece.color === color && piece.role === 'rook') {
                files.push(key2pos(key)[0]);
            }
        }
        return files;
    }
    function premove(pieces, key, canCastle) {
        const piece = pieces.get(key);
        if (!piece)
            return [];
        const pos = key2pos(key), r = piece.role, mobility = r === 'pawn'
            ? pawn(piece.color)
            : r === 'knight'
                ? knight
                : r === 'bishop'
                    ? bishop
                    : r === 'rook'
                        ? rook
                        : r === 'queen'
                            ? queen
                            : king(piece.color, rookFilesOf(pieces, piece.color), canCastle);
        return allPos
            .filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]))
            .map(pos2key);
    }

    function callUserFunction(f, ...args) {
        if (f)
            setTimeout(() => f(...args), 1);
    }
    function toggleOrientation(state) {
        state.orientation = opposite(state.orientation);
        state.animation.current = state.draggable.current = state.selected = undefined;
    }
    function setPieces(state, pieces) {
        for (const [key, piece] of pieces) {
            if (piece)
                state.pieces.set(key, piece);
            else
                state.pieces.delete(key);
        }
    }
    function setCheck(state, color) {
        state.check = undefined;
        if (color === true)
            color = state.turnColor;
        if (color)
            for (const [k, p] of state.pieces) {
                if (p.role === 'king' && p.color === color) {
                    state.check = k;
                }
            }
    }
    function setPremove(state, orig, dest, meta) {
        unsetPredrop(state);
        state.premovable.current = [orig, dest];
        callUserFunction(state.premovable.events.set, orig, dest, meta);
    }
    function unsetPremove(state) {
        if (state.premovable.current) {
            state.premovable.current = undefined;
            callUserFunction(state.premovable.events.unset);
        }
    }
    function setPredrop(state, role, key) {
        unsetPremove(state);
        state.predroppable.current = { role, key };
        callUserFunction(state.predroppable.events.set, role, key);
    }
    function unsetPredrop(state) {
        const pd = state.predroppable;
        if (pd.current) {
            pd.current = undefined;
            callUserFunction(pd.events.unset);
        }
    }
    function tryAutoCastle(state, orig, dest) {
        if (!state.autoCastle)
            return false;
        const king = state.pieces.get(orig);
        if (!king || king.role !== 'king')
            return false;
        const origPos = key2pos(orig);
        const destPos = key2pos(dest);
        if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1])
            return false;
        if (origPos[0] === 4 && !state.pieces.has(dest)) {
            if (destPos[0] === 6)
                dest = pos2key([7, destPos[1]]);
            else if (destPos[0] === 2)
                dest = pos2key([0, destPos[1]]);
        }
        const rook = state.pieces.get(dest);
        if (!rook || rook.color !== king.color || rook.role !== 'rook')
            return false;
        state.pieces.delete(orig);
        state.pieces.delete(dest);
        if (origPos[0] < destPos[0]) {
            state.pieces.set(pos2key([6, destPos[1]]), king);
            state.pieces.set(pos2key([5, destPos[1]]), rook);
        }
        else {
            state.pieces.set(pos2key([2, destPos[1]]), king);
            state.pieces.set(pos2key([3, destPos[1]]), rook);
        }
        return true;
    }
    function baseMove(state, orig, dest) {
        const origPiece = state.pieces.get(orig), destPiece = state.pieces.get(dest);
        if (orig === dest || !origPiece)
            return false;
        const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
        if (dest === state.selected)
            unselect(state);
        callUserFunction(state.events.move, orig, dest, captured);
        if (!tryAutoCastle(state, orig, dest)) {
            state.pieces.set(dest, origPiece);
            state.pieces.delete(orig);
        }
        state.lastMove = [orig, dest];
        state.check = undefined;
        callUserFunction(state.events.change);
        return captured || true;
    }
    function baseNewPiece(state, piece, key, force) {
        if (state.pieces.has(key)) {
            if (force)
                state.pieces.delete(key);
            else
                return false;
        }
        callUserFunction(state.events.dropNewPiece, piece, key);
        state.pieces.set(key, piece);
        state.lastMove = [key];
        state.check = undefined;
        callUserFunction(state.events.change);
        state.movable.dests = undefined;
        state.turnColor = opposite(state.turnColor);
        return true;
    }
    function baseUserMove(state, orig, dest) {
        const result = baseMove(state, orig, dest);
        if (result) {
            state.movable.dests = undefined;
            state.turnColor = opposite(state.turnColor);
            state.animation.current = undefined;
        }
        return result;
    }
    function userMove(state, orig, dest) {
        if (canMove(state, orig, dest)) {
            const result = baseUserMove(state, orig, dest);
            if (result) {
                const holdTime = state.hold.stop();
                unselect(state);
                const metadata = {
                    premove: false,
                    ctrlKey: state.stats.ctrlKey,
                    holdTime,
                };
                if (result !== true)
                    metadata.captured = result;
                callUserFunction(state.movable.events.after, orig, dest, metadata);
                return true;
            }
        }
        else if (canPremove(state, orig, dest)) {
            setPremove(state, orig, dest, {
                ctrlKey: state.stats.ctrlKey,
            });
            unselect(state);
            return true;
        }
        unselect(state);
        return false;
    }
    function dropNewPiece(state, orig, dest, force) {
        const piece = state.pieces.get(orig);
        if (piece && (canDrop(state, orig, dest) || force)) {
            state.pieces.delete(orig);
            baseNewPiece(state, piece, dest, force);
            callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
                premove: false,
                predrop: false,
            });
        }
        else if (piece && canPredrop(state, orig, dest)) {
            setPredrop(state, piece.role, dest);
        }
        else {
            unsetPremove(state);
            unsetPredrop(state);
        }
        state.pieces.delete(orig);
        unselect(state);
    }
    function selectSquare(state, key, force) {
        callUserFunction(state.events.select, key);
        if (state.selected) {
            if (state.selected === key && !state.draggable.enabled) {
                unselect(state);
                state.hold.cancel();
                return;
            }
            else if ((state.selectable.enabled || force) && state.selected !== key) {
                if (userMove(state, state.selected, key)) {
                    state.stats.dragged = false;
                    return;
                }
            }
        }
        if (isMovable(state, key) || isPremovable(state, key)) {
            setSelected(state, key);
            state.hold.start();
        }
    }
    function setSelected(state, key) {
        state.selected = key;
        if (isPremovable(state, key)) {
            state.premovable.dests = premove(state.pieces, key, state.premovable.castle);
        }
        else
            state.premovable.dests = undefined;
    }
    function unselect(state) {
        state.selected = undefined;
        state.premovable.dests = undefined;
        state.hold.cancel();
    }
    function isMovable(state, orig) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
    }
    function canMove(state, orig, dest) {
        var _a, _b;
        return (orig !== dest && isMovable(state, orig) && (state.movable.free || !!((_b = (_a = state.movable.dests) === null || _a === void 0 ? void 0 : _a.get(orig)) === null || _b === void 0 ? void 0 : _b.includes(dest))));
    }
    function canDrop(state, orig, dest) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            (orig === dest || !state.pieces.has(dest)) &&
            (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
    }
    function isPremovable(state, orig) {
        const piece = state.pieces.get(orig);
        return !!piece && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
    }
    function canPremove(state, orig, dest) {
        return (orig !== dest && isPremovable(state, orig) && premove(state.pieces, orig, state.premovable.castle).includes(dest));
    }
    function canPredrop(state, orig, dest) {
        const piece = state.pieces.get(orig);
        const destPiece = state.pieces.get(dest);
        return (!!piece &&
            (!destPiece || destPiece.color !== state.movable.color) &&
            state.predroppable.enabled &&
            (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
            state.movable.color === piece.color &&
            state.turnColor !== piece.color);
    }
    function isDraggable(state, orig) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            state.draggable.enabled &&
            (state.movable.color === 'both' ||
                (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled))));
    }
    function playPremove(state) {
        const move = state.premovable.current;
        if (!move)
            return false;
        const orig = move[0], dest = move[1];
        let success = false;
        if (canMove(state, orig, dest)) {
            const result = baseUserMove(state, orig, dest);
            if (result) {
                const metadata = { premove: true };
                if (result !== true)
                    metadata.captured = result;
                callUserFunction(state.movable.events.after, orig, dest, metadata);
                success = true;
            }
        }
        unsetPremove(state);
        return success;
    }
    function playPredrop(state, validate) {
        const drop = state.predroppable.current;
        let success = false;
        if (!drop)
            return false;
        if (validate(drop)) {
            const piece = {
                role: drop.role,
                color: state.movable.color,
            };
            if (baseNewPiece(state, piece, drop.key)) {
                callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                    premove: false,
                    predrop: true,
                });
                success = true;
            }
        }
        unsetPredrop(state);
        return success;
    }
    function cancelMove(state) {
        unsetPremove(state);
        unsetPredrop(state);
        unselect(state);
    }
    function stop(state) {
        state.movable.color = state.movable.dests = state.animation.current = undefined;
        cancelMove(state);
    }
    function getKeyAtDomPos(pos, asWhite, bounds) {
        let file = Math.floor((8 * (pos[0] - bounds.left)) / bounds.width);
        if (!asWhite)
            file = 7 - file;
        let rank = 7 - Math.floor((8 * (pos[1] - bounds.top)) / bounds.height);
        if (!asWhite)
            rank = 7 - rank;
        return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? pos2key([file, rank]) : undefined;
    }
    function getSnappedKeyAtDomPos(orig, pos, asWhite, bounds) {
        const origPos = key2pos(orig);
        const validSnapPos = allPos.filter(pos2 => {
            return queen(origPos[0], origPos[1], pos2[0], pos2[1]) || knight(origPos[0], origPos[1], pos2[0], pos2[1]);
        });
        const validSnapCenters = validSnapPos.map(pos2 => computeSquareCenter(pos2key(pos2), asWhite, bounds));
        const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
        const [, closestSnapIndex] = validSnapDistances.reduce((a, b, index) => (a[0] < b ? a : [b, index]), [validSnapDistances[0], 0]);
        return pos2key(validSnapPos[closestSnapIndex]);
    }
    function whitePov(s) {
        return s.orientation === 'white';
    }

    const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    const roles = {
        p: 'pawn',
        r: 'rook',
        n: 'knight',
        b: 'bishop',
        q: 'queen',
        k: 'king',
    };
    const letters = {
        pawn: 'p',
        rook: 'r',
        knight: 'n',
        bishop: 'b',
        queen: 'q',
        king: 'k',
    };
    function read(fen) {
        if (fen === 'start')
            fen = initial;
        const pieces = new Map();
        let row = 7, col = 0;
        for (const c of fen) {
            switch (c) {
                case ' ':
                case '[':
                    return pieces;
                case '/':
                    --row;
                    if (row < 0)
                        return pieces;
                    col = 0;
                    break;
                case '~': {
                    const piece = pieces.get(pos2key([col - 1, row]));
                    if (piece)
                        piece.promoted = true;
                    break;
                }
                default: {
                    const nb = c.charCodeAt(0);
                    if (nb < 57)
                        col += nb - 48;
                    else {
                        const role = c.toLowerCase();
                        pieces.set(pos2key([col, row]), {
                            role: roles[role],
                            color: c === role ? 'black' : 'white',
                        });
                        ++col;
                    }
                }
            }
        }
        return pieces;
    }
    function write(pieces) {
        return invRanks
            .map(y => files
            .map(x => {
            const piece = pieces.get((x + y));
            if (piece) {
                let p = letters[piece.role];
                if (piece.color === 'white')
                    p = p.toUpperCase();
                if (piece.promoted)
                    p += '~';
                return p;
            }
            else
                return '1';
        })
            .join(''))
            .join('/')
            .replace(/1{2,}/g, s => s.length.toString());
    }

    function applyAnimation(state, config) {
        if (config.animation) {
            deepMerge(state.animation, config.animation);
            // no need for such short animations
            if ((state.animation.duration || 0) < 70)
                state.animation.enabled = false;
        }
    }
    function configure(state, config) {
        var _a, _b;
        // don't merge destinations and autoShapes. Just override.
        if ((_a = config.movable) === null || _a === void 0 ? void 0 : _a.dests)
            state.movable.dests = undefined;
        if ((_b = config.drawable) === null || _b === void 0 ? void 0 : _b.autoShapes)
            state.drawable.autoShapes = [];
        deepMerge(state, config);
        // if a fen was provided, replace the pieces
        if (config.fen) {
            state.pieces = read(config.fen);
            state.drawable.shapes = [];
        }
        // apply config values that could be undefined yet meaningful
        if ('check' in config)
            setCheck(state, config.check || false);
        if ('lastMove' in config && !config.lastMove)
            state.lastMove = undefined;
        // in case of ZH drop last move, there's a single square.
        // if the previous last move had two squares,
        // the merge algorithm will incorrectly keep the second square.
        else if (config.lastMove)
            state.lastMove = config.lastMove;
        // fix move/premove dests
        if (state.selected)
            setSelected(state, state.selected);
        applyAnimation(state, config);
        if (!state.movable.rookCastle && state.movable.dests) {
            const rank = state.movable.color === 'white' ? '1' : '8', kingStartPos = ('e' + rank), dests = state.movable.dests.get(kingStartPos), king = state.pieces.get(kingStartPos);
            if (!dests || !king || king.role !== 'king')
                return;
            state.movable.dests.set(kingStartPos, dests.filter(d => !(d === 'a' + rank && dests.includes(('c' + rank))) &&
                !(d === 'h' + rank && dests.includes(('g' + rank)))));
        }
    }
    function deepMerge(base, extend) {
        for (const key in extend) {
            if (isPlainObject(base[key]) && isPlainObject(extend[key]))
                deepMerge(base[key], extend[key]);
            else
                base[key] = extend[key];
        }
    }
    function isPlainObject(o) {
        if (typeof o !== 'object' || o === null)
            return false;
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
    }

    function anim(mutation, state) {
        return state.animation.enabled ? animate(mutation, state) : render$2(mutation, state);
    }
    function render$2(mutation, state) {
        const result = mutation(state);
        state.dom.redraw();
        return result;
    }
    function makePiece(key, piece) {
        return {
            key: key,
            pos: key2pos(key),
            piece: piece,
        };
    }
    function closer(piece, pieces) {
        return pieces.sort((p1, p2) => {
            return distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos);
        })[0];
    }
    function computePlan(prevPieces, current) {
        const anims = new Map(), animedOrigs = [], fadings = new Map(), missings = [], news = [], prePieces = new Map();
        let curP, preP, vector;
        for (const [k, p] of prevPieces) {
            prePieces.set(k, makePiece(k, p));
        }
        for (const key of allKeys) {
            curP = current.pieces.get(key);
            preP = prePieces.get(key);
            if (curP) {
                if (preP) {
                    if (!samePiece(curP, preP.piece)) {
                        missings.push(preP);
                        news.push(makePiece(key, curP));
                    }
                }
                else
                    news.push(makePiece(key, curP));
            }
            else if (preP)
                missings.push(preP);
        }
        for (const newP of news) {
            preP = closer(newP, missings.filter(p => samePiece(newP.piece, p.piece)));
            if (preP) {
                vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
                anims.set(newP.key, vector.concat(vector));
                animedOrigs.push(preP.key);
            }
        }
        for (const p of missings) {
            if (!animedOrigs.includes(p.key))
                fadings.set(p.key, p.piece);
        }
        return {
            anims: anims,
            fadings: fadings,
        };
    }
    function step(state, now) {
        const cur = state.animation.current;
        if (cur === undefined) {
            // animation was canceled :(
            if (!state.dom.destroyed)
                state.dom.redrawNow();
            return;
        }
        const rest = 1 - (now - cur.start) * cur.frequency;
        if (rest <= 0) {
            state.animation.current = undefined;
            state.dom.redrawNow();
        }
        else {
            const ease = easing(rest);
            for (const cfg of cur.plan.anims.values()) {
                cfg[2] = cfg[0] * ease;
                cfg[3] = cfg[1] * ease;
            }
            state.dom.redrawNow(true); // optimisation: don't render SVG changes during animations
            requestAnimationFrame((now = performance.now()) => step(state, now));
        }
    }
    function animate(mutation, state) {
        // clone state before mutating it
        const prevPieces = new Map(state.pieces);
        const result = mutation(state);
        const plan = computePlan(prevPieces, state);
        if (plan.anims.size || plan.fadings.size) {
            const alreadyRunning = state.animation.current && state.animation.current.start;
            state.animation.current = {
                start: performance.now(),
                frequency: 1 / state.animation.duration,
                plan: plan,
            };
            if (!alreadyRunning)
                step(state, performance.now());
        }
        else {
            // don't animate, just render right away
            state.dom.redraw();
        }
        return result;
    }
    // https://gist.github.com/gre/1650294
    function easing(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    const brushes = ['green', 'red', 'blue', 'yellow'];
    function start$3(state, e) {
        // support one finger touch only
        if (e.touches && e.touches.length > 1)
            return;
        e.stopPropagation();
        e.preventDefault();
        e.ctrlKey ? unselect(state) : cancelMove(state);
        const pos = eventPosition(e), orig = getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
        if (!orig)
            return;
        state.drawable.current = {
            orig,
            pos,
            brush: eventBrush(e),
            snapToValidMove: state.drawable.defaultSnapToValidMove,
        };
        processDraw(state);
    }
    function processDraw(state) {
        requestAnimationFrame(() => {
            const cur = state.drawable.current;
            if (cur) {
                const keyAtDomPos = getKeyAtDomPos(cur.pos, whitePov(state), state.dom.bounds());
                if (!keyAtDomPos) {
                    cur.snapToValidMove = false;
                }
                const mouseSq = cur.snapToValidMove
                    ? getSnappedKeyAtDomPos(cur.orig, cur.pos, whitePov(state), state.dom.bounds())
                    : keyAtDomPos;
                if (mouseSq !== cur.mouseSq) {
                    cur.mouseSq = mouseSq;
                    cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                    state.dom.redrawNow();
                }
                processDraw(state);
            }
        });
    }
    function move$1(state, e) {
        if (state.drawable.current)
            state.drawable.current.pos = eventPosition(e);
    }
    function end$1(state) {
        const cur = state.drawable.current;
        if (cur) {
            if (cur.mouseSq)
                addShape(state.drawable, cur);
            cancel$1(state);
        }
    }
    function cancel$1(state) {
        if (state.drawable.current) {
            state.drawable.current = undefined;
            state.dom.redraw();
        }
    }
    function clear(state) {
        if (state.drawable.shapes.length) {
            state.drawable.shapes = [];
            state.dom.redraw();
            onChange(state.drawable);
        }
    }
    function eventBrush(e) {
        var _a;
        const modA = (e.shiftKey || e.ctrlKey) && isRightButton(e);
        const modB = e.altKey || e.metaKey || ((_a = e.getModifierState) === null || _a === void 0 ? void 0 : _a.call(e, 'AltGraph'));
        return brushes[(modA ? 1 : 0) + (modB ? 2 : 0)];
    }
    function addShape(drawable, cur) {
        const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
        const similar = drawable.shapes.find(sameShape);
        if (similar)
            drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
        if (!similar || similar.brush !== cur.brush)
            drawable.shapes.push(cur);
        onChange(drawable);
    }
    function onChange(drawable) {
        if (drawable.onChange)
            drawable.onChange(drawable.shapes);
    }

    function start$2(s, e) {
        if (!e.isTrusted || (e.button !== undefined && e.button !== 0))
            return; // only touch or left click
        if (e.touches && e.touches.length > 1)
            return; // support one finger touch only
        const bounds = s.dom.bounds(), position = eventPosition(e), orig = getKeyAtDomPos(position, whitePov(s), bounds);
        if (!orig)
            return;
        const piece = s.pieces.get(orig);
        const previouslySelected = s.selected;
        if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || !piece || piece.color !== s.turnColor))
            clear(s);
        // Prevent touch scroll and create no corresponding mouse event, if there
        // is an intent to interact with the board.
        if (e.cancelable !== false &&
            (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position)))
            e.preventDefault();
        const hadPremove = !!s.premovable.current;
        const hadPredrop = !!s.predroppable.current;
        s.stats.ctrlKey = e.ctrlKey;
        if (s.selected && canMove(s, s.selected, orig)) {
            anim(state => selectSquare(state, orig), s);
        }
        else {
            selectSquare(s, orig);
        }
        const stillSelected = s.selected === orig;
        const element = pieceElementByKey(s, orig);
        if (piece && element && stillSelected && isDraggable(s, orig)) {
            s.draggable.current = {
                orig,
                piece,
                origPos: position,
                pos: position,
                started: s.draggable.autoDistance && s.stats.dragged,
                element,
                previouslySelected,
                originTarget: e.target,
                keyHasChanged: false,
            };
            element.cgDragging = true;
            element.classList.add('dragging');
            // place ghost
            const ghost = s.dom.elements.ghost;
            if (ghost) {
                ghost.className = `ghost ${piece.color} ${piece.role}`;
                translate(ghost, posToTranslate(bounds)(key2pos(orig), whitePov(s)));
                setVisible(ghost, true);
            }
            processDrag(s);
        }
        else {
            if (hadPremove)
                unsetPremove(s);
            if (hadPredrop)
                unsetPredrop(s);
        }
        s.dom.redraw();
    }
    function pieceCloseTo(s, pos) {
        const asWhite = whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
        for (const key of s.pieces.keys()) {
            const center = computeSquareCenter(key, asWhite, bounds);
            if (distanceSq(center, pos) <= radiusSq)
                return true;
        }
        return false;
    }
    function dragNewPiece(s, piece, e, force) {
        const key = 'a0';
        s.pieces.set(key, piece);
        s.dom.redraw();
        const position = eventPosition(e);
        s.draggable.current = {
            orig: key,
            piece,
            origPos: position,
            pos: position,
            started: true,
            element: () => pieceElementByKey(s, key),
            originTarget: e.target,
            newPiece: true,
            force: !!force,
            keyHasChanged: false,
        };
        processDrag(s);
    }
    function processDrag(s) {
        requestAnimationFrame(() => {
            var _a;
            const cur = s.draggable.current;
            if (!cur)
                return;
            // cancel animations while dragging
            if ((_a = s.animation.current) === null || _a === void 0 ? void 0 : _a.plan.anims.has(cur.orig))
                s.animation.current = undefined;
            // if moving piece is gone, cancel
            const origPiece = s.pieces.get(cur.orig);
            if (!origPiece || !samePiece(origPiece, cur.piece))
                cancel(s);
            else {
                if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
                    cur.started = true;
                if (cur.started) {
                    // support lazy elements
                    if (typeof cur.element === 'function') {
                        const found = cur.element();
                        if (!found)
                            return;
                        found.cgDragging = true;
                        found.classList.add('dragging');
                        cur.element = found;
                    }
                    const bounds = s.dom.bounds();
                    translate(cur.element, [
                        cur.pos[0] - bounds.left - bounds.width / 16,
                        cur.pos[1] - bounds.top - bounds.height / 16,
                    ]);
                    cur.keyHasChanged || (cur.keyHasChanged = cur.orig !== getKeyAtDomPos(cur.pos, whitePov(s), bounds));
                }
            }
            processDrag(s);
        });
    }
    function move(s, e) {
        // support one finger touch only
        if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
            s.draggable.current.pos = eventPosition(e);
        }
    }
    function end(s, e) {
        const cur = s.draggable.current;
        if (!cur)
            return;
        // create no corresponding mouse event
        if (e.type === 'touchend' && e.cancelable !== false)
            e.preventDefault();
        // comparing with the origin target is an easy way to test that the end event
        // has the same touch origin
        if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
            s.draggable.current = undefined;
            return;
        }
        unsetPremove(s);
        unsetPredrop(s);
        // touchend has no position; so use the last touchmove position instead
        const eventPos = eventPosition(e) || cur.pos;
        const dest = getKeyAtDomPos(eventPos, whitePov(s), s.dom.bounds());
        if (dest && cur.started && cur.orig !== dest) {
            if (cur.newPiece)
                dropNewPiece(s, cur.orig, dest, cur.force);
            else {
                s.stats.ctrlKey = e.ctrlKey;
                if (userMove(s, cur.orig, dest))
                    s.stats.dragged = true;
            }
        }
        else if (cur.newPiece) {
            s.pieces.delete(cur.orig);
        }
        else if (s.draggable.deleteOnDropOff && !dest) {
            s.pieces.delete(cur.orig);
            callUserFunction(s.events.change);
        }
        if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
            unselect(s);
        else if (!s.selectable.enabled)
            unselect(s);
        removeDragElements(s);
        s.draggable.current = undefined;
        s.dom.redraw();
    }
    function cancel(s) {
        const cur = s.draggable.current;
        if (cur) {
            if (cur.newPiece)
                s.pieces.delete(cur.orig);
            s.draggable.current = undefined;
            unselect(s);
            removeDragElements(s);
            s.dom.redraw();
        }
    }
    function removeDragElements(s) {
        const e = s.dom.elements;
        if (e.ghost)
            setVisible(e.ghost, false);
    }
    function pieceElementByKey(s, key) {
        let el = s.dom.elements.board.firstChild;
        while (el) {
            if (el.cgKey === key && el.tagName === 'PIECE')
                return el;
            el = el.nextSibling;
        }
        return;
    }

    function explosion(state, keys) {
        state.exploding = { stage: 1, keys };
        state.dom.redraw();
        setTimeout(() => {
            setStage(state, 2);
            setTimeout(() => setStage(state, undefined), 120);
        }, 120);
    }
    function setStage(state, stage) {
        if (state.exploding) {
            if (stage)
                state.exploding.stage = stage;
            else
                state.exploding = undefined;
            state.dom.redraw();
        }
    }

    // see API types and documentations in dts/api.d.ts
    function start$1(state, redrawAll) {
        function toggleOrientation$1() {
            toggleOrientation(state);
            redrawAll();
        }
        return {
            set(config) {
                if (config.orientation && config.orientation !== state.orientation)
                    toggleOrientation$1();
                applyAnimation(state, config);
                (config.fen ? anim : render$2)(state => configure(state, config), state);
            },
            state,
            getFen: () => write(state.pieces),
            toggleOrientation: toggleOrientation$1,
            setPieces(pieces) {
                anim(state => setPieces(state, pieces), state);
            },
            selectSquare(key, force) {
                if (key)
                    anim(state => selectSquare(state, key, force), state);
                else if (state.selected) {
                    unselect(state);
                    state.dom.redraw();
                }
            },
            move(orig, dest) {
                anim(state => baseMove(state, orig, dest), state);
            },
            newPiece(piece, key) {
                anim(state => baseNewPiece(state, piece, key), state);
            },
            playPremove() {
                if (state.premovable.current) {
                    if (anim(playPremove, state))
                        return true;
                    // if the premove couldn't be played, redraw to clear it up
                    state.dom.redraw();
                }
                return false;
            },
            playPredrop(validate) {
                if (state.predroppable.current) {
                    const result = playPredrop(state, validate);
                    state.dom.redraw();
                    return result;
                }
                return false;
            },
            cancelPremove() {
                render$2(unsetPremove, state);
            },
            cancelPredrop() {
                render$2(unsetPredrop, state);
            },
            cancelMove() {
                render$2(state => {
                    cancelMove(state);
                    cancel(state);
                }, state);
            },
            stop() {
                render$2(state => {
                    stop(state);
                    cancel(state);
                }, state);
            },
            explode(keys) {
                explosion(state, keys);
            },
            setAutoShapes(shapes) {
                render$2(state => (state.drawable.autoShapes = shapes), state);
            },
            setShapes(shapes) {
                render$2(state => (state.drawable.shapes = shapes), state);
            },
            getKeyAtDomPos(pos) {
                return getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
            },
            redrawAll,
            dragNewPiece(piece, event, force) {
                dragNewPiece(state, piece, event, force);
            },
            destroy() {
                stop(state);
                state.dom.unbind && state.dom.unbind();
                state.dom.destroyed = true;
            },
        };
    }

    function defaults$1() {
        return {
            pieces: read(initial),
            orientation: 'white',
            turnColor: 'white',
            coordinates: true,
            ranksPosition: 'right',
            autoCastle: true,
            viewOnly: false,
            disableContextMenu: false,
            addPieceZIndex: false,
            blockTouchScroll: false,
            pieceKey: false,
            highlight: {
                lastMove: true,
                check: true,
            },
            animation: {
                enabled: true,
                duration: 200,
            },
            movable: {
                free: true,
                color: 'both',
                showDests: true,
                events: {},
                rookCastle: true,
            },
            premovable: {
                enabled: true,
                showDests: true,
                castle: true,
                events: {},
            },
            predroppable: {
                enabled: false,
                events: {},
            },
            draggable: {
                enabled: true,
                distance: 3,
                autoDistance: true,
                showGhost: true,
                deleteOnDropOff: false,
            },
            dropmode: {
                active: false,
            },
            selectable: {
                enabled: true,
            },
            stats: {
                // on touchscreen, default to "tap-tap" moves
                // instead of drag
                dragged: !('ontouchstart' in window),
            },
            events: {},
            drawable: {
                enabled: true,
                visible: true,
                defaultSnapToValidMove: true,
                eraseOnClick: true,
                shapes: [],
                autoShapes: [],
                brushes: {
                    green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                    red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                    blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                    yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                    paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                    paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                    paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                    paleGrey: {
                        key: 'pgr',
                        color: '#4a4a4a',
                        opacity: 0.35,
                        lineWidth: 15,
                    },
                },
                prevSvgHash: '',
            },
            hold: timer(),
        };
    }

    // append and remove only. No updates.
    function syncShapes(shapes, root, renderShape) {
        const hashesInDom = new Map(), // by hash
        toRemove = [];
        for (const sc of shapes)
            hashesInDom.set(sc.hash, false);
        let el = root.firstChild, elHash;
        while (el) {
            elHash = el.getAttribute('cgHash');
            // found a shape element that's here to stay
            if (hashesInDom.has(elHash))
                hashesInDom.set(elHash, true);
            // or remove it
            else
                toRemove.push(el);
            el = el.nextSibling;
        }
        // remove old shapes
        for (const el of toRemove)
            root.removeChild(el);
        // insert shapes that are not yet in dom
        for (const sc of shapes) {
            if (!hashesInDom.get(sc.hash))
                root.appendChild(renderShape(sc));
        }
    }

    function createElement$1(tagName) {
        return document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }
    function renderSvg(state, svg, customSvg) {
        const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = new Map(), bounds = state.dom.bounds(), nonPieceAutoShapes = d.autoShapes.filter(autoShape => !autoShape.piece);
        for (const s of d.shapes.concat(nonPieceAutoShapes).concat(cur ? [cur] : [])) {
            if (s.dest)
                arrowDests.set(s.dest, (arrowDests.get(s.dest) || 0) + 1);
        }
        const shapes = d.shapes.concat(nonPieceAutoShapes).map((s) => {
            return {
                shape: s,
                current: false,
                hash: shapeHash(s, arrowDests, false, bounds),
            };
        });
        if (cur)
            shapes.push({
                shape: cur,
                current: true,
                hash: shapeHash(cur, arrowDests, true, bounds),
            });
        const fullHash = shapes.map(sc => sc.hash).join(';');
        if (fullHash === state.drawable.prevSvgHash)
            return;
        state.drawable.prevSvgHash = fullHash;
        /*
          -- DOM hierarchy --
          <svg class="cg-shapes">      (<= svg)
            <defs>
              ...(for brushes)...
            </defs>
            <g>
              ...(for arrows and circles)...
            </g>
          </svg>
          <svg class="cg-custom-svgs"> (<= customSvg)
            <g>
              ...(for custom svgs)...
            </g>
          </svg>
        */
        const defsEl = svg.querySelector('defs');
        const shapesEl = svg.querySelector('g');
        const customSvgsEl = customSvg.querySelector('g');
        syncDefs(d, shapes, defsEl);
        syncShapes(shapes.filter(s => !s.shape.customSvg), shapesEl, shape => renderShape$1(state, shape, d.brushes, arrowDests, bounds));
        syncShapes(shapes.filter(s => s.shape.customSvg), customSvgsEl, shape => renderShape$1(state, shape, d.brushes, arrowDests, bounds));
    }
    // append only. Don't try to update/remove.
    function syncDefs(d, shapes, defsEl) {
        const brushes = new Map();
        let brush;
        for (const s of shapes) {
            if (s.shape.dest) {
                brush = d.brushes[s.shape.brush];
                if (s.shape.modifiers)
                    brush = makeCustomBrush(brush, s.shape.modifiers);
                brushes.set(brush.key, brush);
            }
        }
        const keysInDom = new Set();
        let el = defsEl.firstChild;
        while (el) {
            keysInDom.add(el.getAttribute('cgKey'));
            el = el.nextSibling;
        }
        for (const [key, brush] of brushes.entries()) {
            if (!keysInDom.has(key))
                defsEl.appendChild(renderMarker(brush));
        }
    }
    function shapeHash({ orig, dest, brush, piece, modifiers, customSvg }, arrowDests, current, bounds) {
        return [
            bounds.width,
            bounds.height,
            current,
            orig,
            dest,
            brush,
            dest && (arrowDests.get(dest) || 0) > 1,
            piece && pieceHash(piece),
            modifiers && modifiersHash(modifiers),
            customSvg && customSvgHash(customSvg),
        ]
            .filter(x => x)
            .join(',');
    }
    function pieceHash(piece) {
        return [piece.color, piece.role, piece.scale].filter(x => x).join(',');
    }
    function modifiersHash(m) {
        return '' + (m.lineWidth || '');
    }
    function customSvgHash(s) {
        // Rolling hash with base 31 (cf. https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
        }
        return 'custom-' + h.toString();
    }
    function renderShape$1(state, { shape, current, hash }, brushes, arrowDests, bounds) {
        let el;
        const orig = orient(key2pos(shape.orig), state.orientation);
        if (shape.customSvg) {
            el = renderCustomSvg(shape.customSvg, orig, bounds);
        }
        else {
            if (shape.dest) {
                let brush = brushes[shape.brush];
                if (shape.modifiers)
                    brush = makeCustomBrush(brush, shape.modifiers);
                el = renderArrow(brush, orig, orient(key2pos(shape.dest), state.orientation), current, (arrowDests.get(shape.dest) || 0) > 1, bounds);
            }
            else
                el = renderCircle(brushes[shape.brush], orig, current, bounds);
        }
        el.setAttribute('cgHash', hash);
        return el;
    }
    function renderCustomSvg(customSvg, pos, bounds) {
        const [x, y] = pos2user(pos, bounds);
        // Translate to top-left of `orig` square
        const g = setAttributes(createElement$1('g'), { transform: `translate(${x},${y})` });
        // Give 100x100 coordinate system to the user for `orig` square
        const svg = setAttributes(createElement$1('svg'), { width: 1, height: 1, viewBox: '0 0 100 100' });
        g.appendChild(svg);
        svg.innerHTML = customSvg;
        return g;
    }
    function renderCircle(brush, pos, current, bounds) {
        const o = pos2user(pos, bounds), widths = circleWidth(), radius = (bounds.width + bounds.height) / (4 * Math.max(bounds.width, bounds.height));
        return setAttributes(createElement$1('circle'), {
            stroke: brush.color,
            'stroke-width': widths[current ? 0 : 1],
            fill: 'none',
            opacity: opacity(brush, current),
            cx: o[0],
            cy: o[1],
            r: radius - widths[1] / 2,
        });
    }
    function renderArrow(brush, orig, dest, current, shorten, bounds) {
        const m = arrowMargin(shorten && !current), a = pos2user(orig, bounds), b = pos2user(dest, bounds), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
        return setAttributes(createElement$1('line'), {
            stroke: brush.color,
            'stroke-width': lineWidth(brush, current),
            'stroke-linecap': 'round',
            'marker-end': 'url(#arrowhead-' + brush.key + ')',
            opacity: opacity(brush, current),
            x1: a[0],
            y1: a[1],
            x2: b[0] - xo,
            y2: b[1] - yo,
        });
    }
    function renderMarker(brush) {
        const marker = setAttributes(createElement$1('marker'), {
            id: 'arrowhead-' + brush.key,
            orient: 'auto',
            markerWidth: 4,
            markerHeight: 8,
            refX: 2.05,
            refY: 2.01,
        });
        marker.appendChild(setAttributes(createElement$1('path'), {
            d: 'M0,0 V4 L3,2 Z',
            fill: brush.color,
        }));
        marker.setAttribute('cgKey', brush.key);
        return marker;
    }
    function setAttributes(el, attrs) {
        for (const key in attrs)
            el.setAttribute(key, attrs[key]);
        return el;
    }
    function orient(pos, color) {
        return color === 'white' ? pos : [7 - pos[0], 7 - pos[1]];
    }
    function makeCustomBrush(base, modifiers) {
        return {
            color: base.color,
            opacity: Math.round(base.opacity * 10) / 10,
            lineWidth: Math.round(modifiers.lineWidth || base.lineWidth),
            key: [base.key, modifiers.lineWidth].filter(x => x).join(''),
        };
    }
    function circleWidth() {
        return [3 / 64, 4 / 64];
    }
    function lineWidth(brush, current) {
        return ((brush.lineWidth || 10) * (current ? 0.85 : 1)) / 64;
    }
    function opacity(brush, current) {
        return (brush.opacity || 1) * (current ? 0.9 : 1);
    }
    function arrowMargin(shorten) {
        return (shorten ? 20 : 10) / 64;
    }
    function pos2user(pos, bounds) {
        const xScale = Math.min(1, bounds.width / bounds.height);
        const yScale = Math.min(1, bounds.height / bounds.width);
        return [(pos[0] - 3.5) * xScale, (3.5 - pos[1]) * yScale];
    }

    function renderWrap(element, s) {
        // .cg-wrap (element passed to Chessground)
        //   cg-container
        //     cg-board
        //     svg.cg-shapes
        //       defs
        //       g
        //     svg.cg-custom-svgs
        //       g
        //     cg-auto-pieces
        //     coords.ranks
        //     coords.files
        //     piece.ghost
        element.innerHTML = '';
        // ensure the cg-wrap class is set
        // so bounds calculation can use the CSS width/height values
        // add that class yourself to the element before calling chessground
        // for a slight performance improvement! (avoids recomputing style)
        element.classList.add('cg-wrap');
        for (const c of colors)
            element.classList.toggle('orientation-' + c, s.orientation === c);
        element.classList.toggle('manipulable', !s.viewOnly);
        const container = createEl('cg-container');
        element.appendChild(container);
        const board = createEl('cg-board');
        container.appendChild(board);
        let svg;
        let customSvg;
        let autoPieces;
        if (s.drawable.visible) {
            svg = setAttributes(createElement$1('svg'), {
                class: 'cg-shapes',
                viewBox: '-4 -4 8 8',
                preserveAspectRatio: 'xMidYMid slice',
            });
            svg.appendChild(createElement$1('defs'));
            svg.appendChild(createElement$1('g'));
            customSvg = setAttributes(createElement$1('svg'), {
                class: 'cg-custom-svgs',
                viewBox: '-3.5 -3.5 8 8',
                preserveAspectRatio: 'xMidYMid slice',
            });
            customSvg.appendChild(createElement$1('g'));
            autoPieces = createEl('cg-auto-pieces');
            container.appendChild(svg);
            container.appendChild(customSvg);
            container.appendChild(autoPieces);
        }
        if (s.coordinates) {
            const orientClass = s.orientation === 'black' ? ' black' : '';
            const ranksPositionClass = s.ranksPosition === 'left' ? ' left' : '';
            container.appendChild(renderCoords(ranks, 'ranks' + orientClass + ranksPositionClass));
            container.appendChild(renderCoords(files, 'files' + orientClass));
        }
        let ghost;
        if (s.draggable.enabled && s.draggable.showGhost) {
            ghost = createEl('piece', 'ghost');
            setVisible(ghost, false);
            container.appendChild(ghost);
        }
        return {
            board,
            container,
            wrap: element,
            ghost,
            svg,
            customSvg,
            autoPieces,
        };
    }
    function renderCoords(elems, className) {
        const el = createEl('coords', className);
        let f;
        for (const elem of elems) {
            f = createEl('coord');
            f.textContent = elem;
            el.appendChild(f);
        }
        return el;
    }

    function drop(s, e) {
        if (!s.dropmode.active)
            return;
        unsetPremove(s);
        unsetPredrop(s);
        const piece = s.dropmode.piece;
        if (piece) {
            s.pieces.set('a0', piece);
            const position = eventPosition(e);
            const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds());
            if (dest)
                dropNewPiece(s, 'a0', dest);
        }
        s.dom.redraw();
    }

    function bindBoard(s, onResize) {
        const boardEl = s.dom.elements.board;
        if ('ResizeObserver' in window)
            new ResizeObserver(onResize).observe(s.dom.elements.wrap);
        if (s.viewOnly)
            return;
        // Cannot be passive, because we prevent touch scrolling and dragging of
        // selected elements.
        const onStart = startDragOrDraw(s);
        boardEl.addEventListener('touchstart', onStart, {
            passive: false,
        });
        boardEl.addEventListener('mousedown', onStart, {
            passive: false,
        });
        if (s.disableContextMenu || s.drawable.enabled) {
            boardEl.addEventListener('contextmenu', e => e.preventDefault());
        }
    }
    // returns the unbind function
    function bindDocument(s, onResize) {
        const unbinds = [];
        // Old versions of Edge and Safari do not support ResizeObserver. Send
        // chessground.resize if a user action has changed the bounds of the board.
        if (!('ResizeObserver' in window))
            unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
        if (!s.viewOnly) {
            const onmove = dragOrDraw(s, move, move$1);
            const onend = dragOrDraw(s, end, end$1);
            for (const ev of ['touchmove', 'mousemove'])
                unbinds.push(unbindable(document, ev, onmove));
            for (const ev of ['touchend', 'mouseup'])
                unbinds.push(unbindable(document, ev, onend));
            const onScroll = () => s.dom.bounds.clear();
            unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
            unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
        }
        return () => unbinds.forEach(f => f());
    }
    function unbindable(el, eventName, callback, options) {
        el.addEventListener(eventName, callback, options);
        return () => el.removeEventListener(eventName, callback, options);
    }
    function startDragOrDraw(s) {
        return e => {
            if (s.draggable.current)
                cancel(s);
            else if (s.drawable.current)
                cancel$1(s);
            else if (e.shiftKey || isRightButton(e)) {
                if (s.drawable.enabled)
                    start$3(s, e);
            }
            else if (!s.viewOnly) {
                if (s.dropmode.active)
                    drop(s, e);
                else
                    start$2(s, e);
            }
        };
    }
    function dragOrDraw(s, withDrag, withDraw) {
        return e => {
            if (s.drawable.current) {
                if (s.drawable.enabled)
                    withDraw(s, e);
            }
            else if (!s.viewOnly)
                withDrag(s, e);
        };
    }

    // ported from https://github.com/lichess-org/lichobile/blob/master/src/chessground/render.ts
    // in case of bugs, blame @veloce
    function render$1(s) {
        const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds()), boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : new Map(), fadings = curAnim ? curAnim.plan.fadings : new Map(), curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = new Set(), sameSquares = new Set(), movedPieces = new Map(), movedSquares = new Map(); // by class name
        let k, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
        // walk over all board dom elements, apply animations and flag moved pieces
        el = boardEl.firstChild;
        while (el) {
            k = el.cgKey;
            if (isPieceNode(el)) {
                pieceAtKey = pieces.get(k);
                anim = anims.get(k);
                fading = fadings.get(k);
                elPieceName = el.cgPiece;
                // if piece not being dragged anymore, remove dragging style
                if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                    el.classList.remove('dragging');
                    translate(el, posToTranslate$1(key2pos(k), asWhite));
                    el.cgDragging = false;
                }
                // remove fading class if it still remains
                if (!fading && el.cgFading) {
                    el.cgFading = false;
                    el.classList.remove('fading');
                }
                // there is now a piece at this dom key
                if (pieceAtKey) {
                    // continue animation if already animating and same piece
                    // (otherwise it could animate a captured piece)
                    if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                        const pos = key2pos(k);
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                        el.classList.add('anim');
                        translate(el, posToTranslate$1(pos, asWhite));
                    }
                    else if (el.cgAnimating) {
                        el.cgAnimating = false;
                        el.classList.remove('anim');
                        translate(el, posToTranslate$1(key2pos(k), asWhite));
                        if (s.addPieceZIndex)
                            el.style.zIndex = posZIndex(key2pos(k), asWhite);
                    }
                    // same piece: flag as same
                    if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                        samePieces.add(k);
                    }
                    // different piece: flag as moved unless it is a fading piece
                    else {
                        if (fading && elPieceName === pieceNameOf(fading)) {
                            el.classList.add('fading');
                            el.cgFading = true;
                        }
                        else {
                            appendValue(movedPieces, elPieceName, el);
                        }
                    }
                }
                // no piece: flag as moved
                else {
                    appendValue(movedPieces, elPieceName, el);
                }
            }
            else if (isSquareNode(el)) {
                const cn = el.className;
                if (squares.get(k) === cn)
                    sameSquares.add(k);
                else
                    appendValue(movedSquares, cn, el);
            }
            el = el.nextSibling;
        }
        // walk over all squares in current set, apply dom changes to moved squares
        // or append new squares
        for (const [sk, className] of squares) {
            if (!sameSquares.has(sk)) {
                sMvdset = movedSquares.get(className);
                sMvd = sMvdset && sMvdset.pop();
                const translation = posToTranslate$1(key2pos(sk), asWhite);
                if (sMvd) {
                    sMvd.cgKey = sk;
                    translate(sMvd, translation);
                }
                else {
                    const squareNode = createEl('square', className);
                    squareNode.cgKey = sk;
                    translate(squareNode, translation);
                    boardEl.insertBefore(squareNode, boardEl.firstChild);
                }
            }
        }
        // walk over all pieces in current set, apply dom changes to moved pieces
        // or append new pieces
        for (const [k, p] of pieces) {
            anim = anims.get(k);
            if (!samePieces.has(k)) {
                pMvdset = movedPieces.get(pieceNameOf(p));
                pMvd = pMvdset && pMvdset.pop();
                // a same piece was moved
                if (pMvd) {
                    // apply dom changes
                    pMvd.cgKey = k;
                    if (pMvd.cgFading) {
                        pMvd.classList.remove('fading');
                        pMvd.cgFading = false;
                    }
                    const pos = key2pos(k);
                    if (s.addPieceZIndex)
                        pMvd.style.zIndex = posZIndex(pos, asWhite);
                    if (anim) {
                        pMvd.cgAnimating = true;
                        pMvd.classList.add('anim');
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                    }
                    translate(pMvd, posToTranslate$1(pos, asWhite));
                }
                // no piece in moved obj: insert the new piece
                // assumes the new piece is not being dragged
                else {
                    const pieceName = pieceNameOf(p), pieceNode = createEl('piece', pieceName), pos = key2pos(k);
                    pieceNode.cgPiece = pieceName;
                    pieceNode.cgKey = k;
                    if (anim) {
                        pieceNode.cgAnimating = true;
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                    }
                    translate(pieceNode, posToTranslate$1(pos, asWhite));
                    if (s.addPieceZIndex)
                        pieceNode.style.zIndex = posZIndex(pos, asWhite);
                    boardEl.appendChild(pieceNode);
                }
            }
        }
        // remove any element that remains in the moved sets
        for (const nodes of movedPieces.values())
            removeNodes(s, nodes);
        for (const nodes of movedSquares.values())
            removeNodes(s, nodes);
    }
    function renderResized$1(s) {
        const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds());
        let el = s.dom.elements.board.firstChild;
        while (el) {
            if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
                translate(el, posToTranslate$1(key2pos(el.cgKey), asWhite));
            }
            el = el.nextSibling;
        }
    }
    function updateBounds(s) {
        var _a, _b;
        const bounds = s.dom.elements.wrap.getBoundingClientRect();
        const container = s.dom.elements.container;
        const ratio = bounds.height / bounds.width;
        const width = (Math.floor((bounds.width * window.devicePixelRatio) / 8) * 8) / window.devicePixelRatio;
        const height = width * ratio;
        container.style.width = width + 'px';
        container.style.height = height + 'px';
        s.dom.bounds.clear();
        (_a = s.addDimensionsCssVarsTo) === null || _a === void 0 ? void 0 : _a.style.setProperty('--cg-width', width + 'px');
        (_b = s.addDimensionsCssVarsTo) === null || _b === void 0 ? void 0 : _b.style.setProperty('--cg-height', height + 'px');
    }
    function isPieceNode(el) {
        return el.tagName === 'PIECE';
    }
    function isSquareNode(el) {
        return el.tagName === 'SQUARE';
    }
    function removeNodes(s, nodes) {
        for (const node of nodes)
            s.dom.elements.board.removeChild(node);
    }
    function posZIndex(pos, asWhite) {
        const minZ = 3;
        const rank = pos[1];
        const z = asWhite ? minZ + 7 - rank : minZ + rank;
        return `${z}`;
    }
    function pieceNameOf(piece) {
        return `${piece.color} ${piece.role}`;
    }
    function computeSquareClasses(s) {
        var _a;
        const squares = new Map();
        if (s.lastMove && s.highlight.lastMove)
            for (const k of s.lastMove) {
                addSquare(squares, k, 'last-move');
            }
        if (s.check && s.highlight.check)
            addSquare(squares, s.check, 'check');
        if (s.selected) {
            addSquare(squares, s.selected, 'selected');
            if (s.movable.showDests) {
                const dests = (_a = s.movable.dests) === null || _a === void 0 ? void 0 : _a.get(s.selected);
                if (dests)
                    for (const k of dests) {
                        addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
                    }
                const pDests = s.premovable.dests;
                if (pDests)
                    for (const k of pDests) {
                        addSquare(squares, k, 'premove-dest' + (s.pieces.has(k) ? ' oc' : ''));
                    }
            }
        }
        const premove = s.premovable.current;
        if (premove)
            for (const k of premove)
                addSquare(squares, k, 'current-premove');
        else if (s.predroppable.current)
            addSquare(squares, s.predroppable.current.key, 'current-premove');
        const o = s.exploding;
        if (o)
            for (const k of o.keys)
                addSquare(squares, k, 'exploding' + o.stage);
        return squares;
    }
    function addSquare(squares, key, klass) {
        const classes = squares.get(key);
        if (classes)
            squares.set(key, `${classes} ${klass}`);
        else
            squares.set(key, klass);
    }
    function appendValue(map, key, value) {
        const arr = map.get(key);
        if (arr)
            arr.push(value);
        else
            map.set(key, [value]);
    }

    function render(state, autoPieceEl) {
        const autoPieces = state.drawable.autoShapes.filter(autoShape => autoShape.piece);
        const autoPieceShapes = autoPieces.map((s) => {
            return {
                shape: s,
                hash: hash(s),
                current: false,
            };
        });
        syncShapes(autoPieceShapes, autoPieceEl, shape => renderShape(state, shape, state.dom.bounds()));
    }
    function renderResized(state) {
        var _a;
        const asWhite = whitePov(state), posToTranslate$1 = posToTranslate(state.dom.bounds());
        let el = (_a = state.dom.elements.autoPieces) === null || _a === void 0 ? void 0 : _a.firstChild;
        while (el) {
            translateAndScale(el, posToTranslate$1(key2pos(el.cgKey), asWhite), el.cgScale);
            el = el.nextSibling;
        }
    }
    function renderShape(state, { shape, hash }, bounds) {
        var _a, _b, _c;
        const orig = shape.orig;
        const role = (_a = shape.piece) === null || _a === void 0 ? void 0 : _a.role;
        const color = (_b = shape.piece) === null || _b === void 0 ? void 0 : _b.color;
        const scale = (_c = shape.piece) === null || _c === void 0 ? void 0 : _c.scale;
        const pieceEl = createEl('piece', `${role} ${color}`);
        pieceEl.setAttribute('cgHash', hash);
        pieceEl.cgKey = orig;
        pieceEl.cgScale = scale;
        translateAndScale(pieceEl, posToTranslate(bounds)(key2pos(orig), whitePov(state)), scale);
        return pieceEl;
    }
    function hash(autoPiece) {
        var _a, _b, _c;
        return [autoPiece.orig, (_a = autoPiece.piece) === null || _a === void 0 ? void 0 : _a.role, (_b = autoPiece.piece) === null || _b === void 0 ? void 0 : _b.color, (_c = autoPiece.piece) === null || _c === void 0 ? void 0 : _c.scale].join(',');
    }

    function Chessground(element, config) {
        const maybeState = defaults$1();
        configure(maybeState, config || {});
        function redrawAll() {
            const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
            // compute bounds from existing board element if possible
            // this allows non-square boards from CSS to be handled (for 3D)
            const elements = renderWrap(element, maybeState), bounds = memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
                render$1(state);
                if (elements.autoPieces)
                    render(state, elements.autoPieces);
                if (!skipSvg && elements.svg)
                    renderSvg(state, elements.svg, elements.customSvg);
            }, onResize = () => {
                updateBounds(state);
                renderResized$1(state);
                if (elements.autoPieces)
                    renderResized(state);
            };
            const state = maybeState;
            state.dom = {
                elements,
                bounds,
                redraw: debounceRedraw(redrawNow),
                redrawNow,
                unbind: prevUnbind,
            };
            state.drawable.prevSvgHash = '';
            updateBounds(state);
            redrawNow(false);
            bindBoard(state, onResize);
            if (!prevUnbind)
                state.dom.unbind = bindDocument(state, onResize);
            state.events.insert && state.events.insert(elements);
            return state;
        }
        return start$1(redrawAll(), redrawAll);
    }
    function debounceRedraw(redrawNow) {
        let redrawing = false;
        return () => {
            if (redrawing)
                return;
            redrawing = true;
            requestAnimationFrame(() => {
                redrawNow();
                redrawing = false;
            });
        };
    }

    function createElement(tagName, options) {
        return document.createElement(tagName, options);
    }
    function createElementNS(namespaceURI, qualifiedName, options) {
        return document.createElementNS(namespaceURI, qualifiedName, options);
    }
    function createDocumentFragment() {
        return parseFragment(document.createDocumentFragment());
    }
    function createTextNode(text) {
        return document.createTextNode(text);
    }
    function createComment(text) {
        return document.createComment(text);
    }
    function insertBefore(parentNode, newNode, referenceNode) {
        if (isDocumentFragment$1(parentNode)) {
            let node = parentNode;
            while (node && isDocumentFragment$1(node)) {
                const fragment = parseFragment(node);
                node = fragment.parent;
            }
            parentNode = node !== null && node !== void 0 ? node : parentNode;
        }
        if (isDocumentFragment$1(newNode)) {
            newNode = parseFragment(newNode, parentNode);
        }
        if (referenceNode && isDocumentFragment$1(referenceNode)) {
            referenceNode = parseFragment(referenceNode).firstChildNode;
        }
        parentNode.insertBefore(newNode, referenceNode);
    }
    function removeChild(node, child) {
        node.removeChild(child);
    }
    function appendChild(node, child) {
        if (isDocumentFragment$1(child)) {
            child = parseFragment(child, node);
        }
        node.appendChild(child);
    }
    function parentNode(node) {
        if (isDocumentFragment$1(node)) {
            while (node && isDocumentFragment$1(node)) {
                const fragment = parseFragment(node);
                node = fragment.parent;
            }
            return node !== null && node !== void 0 ? node : null;
        }
        return node.parentNode;
    }
    function nextSibling(node) {
        var _a;
        if (isDocumentFragment$1(node)) {
            const fragment = parseFragment(node);
            const parent = parentNode(fragment);
            if (parent && fragment.lastChildNode) {
                const children = Array.from(parent.childNodes);
                const index = children.indexOf(fragment.lastChildNode);
                return (_a = children[index + 1]) !== null && _a !== void 0 ? _a : null;
            }
            return null;
        }
        return node.nextSibling;
    }
    function tagName(elm) {
        return elm.tagName;
    }
    function setTextContent(node, text) {
        node.textContent = text;
    }
    function getTextContent(node) {
        return node.textContent;
    }
    function isElement$1(node) {
        return node.nodeType === 1;
    }
    function isText(node) {
        return node.nodeType === 3;
    }
    function isComment(node) {
        return node.nodeType === 8;
    }
    function isDocumentFragment$1(node) {
        return node.nodeType === 11;
    }
    function parseFragment(fragmentNode, parentNode) {
        var _a, _b, _c;
        const fragment = fragmentNode;
        (_a = fragment.parent) !== null && _a !== void 0 ? _a : (fragment.parent = parentNode !== null && parentNode !== void 0 ? parentNode : null);
        (_b = fragment.firstChildNode) !== null && _b !== void 0 ? _b : (fragment.firstChildNode = fragmentNode.firstChild);
        (_c = fragment.lastChildNode) !== null && _c !== void 0 ? _c : (fragment.lastChildNode = fragmentNode.lastChild);
        return fragment;
    }
    const htmlDomApi = {
        createElement,
        createElementNS,
        createTextNode,
        createDocumentFragment,
        createComment,
        insertBefore,
        removeChild,
        appendChild,
        parentNode,
        nextSibling,
        tagName,
        setTextContent,
        getTextContent,
        isElement: isElement$1,
        isText,
        isComment,
        isDocumentFragment: isDocumentFragment$1,
    };

    function vnode(sel, data, children, text, elm) {
        const key = data === undefined ? undefined : data.key;
        return { sel, data, children, text, elm, key };
    }

    const array = Array.isArray;
    function primitive(s) {
        return (typeof s === "string" ||
            typeof s === "number" ||
            s instanceof String ||
            s instanceof Number);
    }

    function isUndef(s) {
        return s === undefined;
    }
    function isDef(s) {
        return s !== undefined;
    }
    const emptyNode = vnode("", {}, [], undefined, undefined);
    function sameVnode(vnode1, vnode2) {
        var _a, _b;
        const isSameKey = vnode1.key === vnode2.key;
        const isSameIs = ((_a = vnode1.data) === null || _a === void 0 ? void 0 : _a.is) === ((_b = vnode2.data) === null || _b === void 0 ? void 0 : _b.is);
        const isSameSel = vnode1.sel === vnode2.sel;
        const isSameTextOrFragment = !vnode1.sel && vnode1.sel === vnode2.sel
            ? typeof vnode1.text === typeof vnode2.text
            : true;
        return isSameSel && isSameKey && isSameIs && isSameTextOrFragment;
    }
    /**
     * @todo Remove this function when the document fragment is considered stable.
     */
    function documentFragmentIsNotSupported() {
        throw new Error("The document fragment is not supported on this platform.");
    }
    function isElement(api, vnode) {
        return api.isElement(vnode);
    }
    function isDocumentFragment(api, vnode) {
        return api.isDocumentFragment(vnode);
    }
    function createKeyToOldIdx(children, beginIdx, endIdx) {
        var _a;
        const map = {};
        for (let i = beginIdx; i <= endIdx; ++i) {
            const key = (_a = children[i]) === null || _a === void 0 ? void 0 : _a.key;
            if (key !== undefined) {
                map[key] = i;
            }
        }
        return map;
    }
    const hooks = [
        "create",
        "update",
        "remove",
        "destroy",
        "pre",
        "post",
    ];
    function init(modules, domApi, options) {
        const cbs = {
            create: [],
            update: [],
            remove: [],
            destroy: [],
            pre: [],
            post: [],
        };
        const api = domApi !== undefined ? domApi : htmlDomApi;
        for (const hook of hooks) {
            for (const module of modules) {
                const currentHook = module[hook];
                if (currentHook !== undefined) {
                    cbs[hook].push(currentHook);
                }
            }
        }
        function emptyNodeAt(elm) {
            const id = elm.id ? "#" + elm.id : "";
            // elm.className doesn't return a string when elm is an SVG element inside a shadowRoot.
            // https://stackoverflow.com/questions/29454340/detecting-classname-of-svganimatedstring
            const classes = elm.getAttribute("class");
            const c = classes ? "." + classes.split(" ").join(".") : "";
            return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
        }
        function emptyDocumentFragmentAt(frag) {
            return vnode(undefined, {}, [], undefined, frag);
        }
        function createRmCb(childElm, listeners) {
            return function rmCb() {
                if (--listeners === 0) {
                    const parent = api.parentNode(childElm);
                    api.removeChild(parent, childElm);
                }
            };
        }
        function createElm(vnode, insertedVnodeQueue) {
            var _a, _b, _c, _d;
            let i;
            let data = vnode.data;
            if (data !== undefined) {
                const init = (_a = data.hook) === null || _a === void 0 ? void 0 : _a.init;
                if (isDef(init)) {
                    init(vnode);
                    data = vnode.data;
                }
            }
            const children = vnode.children;
            const sel = vnode.sel;
            if (sel === "!") {
                if (isUndef(vnode.text)) {
                    vnode.text = "";
                }
                vnode.elm = api.createComment(vnode.text);
            }
            else if (sel !== undefined) {
                // Parse selector
                const hashIdx = sel.indexOf("#");
                const dotIdx = sel.indexOf(".", hashIdx);
                const hash = hashIdx > 0 ? hashIdx : sel.length;
                const dot = dotIdx > 0 ? dotIdx : sel.length;
                const tag = hashIdx !== -1 || dotIdx !== -1
                    ? sel.slice(0, Math.min(hash, dot))
                    : sel;
                const elm = (vnode.elm =
                    isDef(data) && isDef((i = data.ns))
                        ? api.createElementNS(i, tag, data)
                        : api.createElement(tag, data));
                if (hash < dot)
                    elm.setAttribute("id", sel.slice(hash + 1, dot));
                if (dotIdx > 0)
                    elm.setAttribute("class", sel.slice(dot + 1).replace(/\./g, " "));
                for (i = 0; i < cbs.create.length; ++i)
                    cbs.create[i](emptyNode, vnode);
                if (array(children)) {
                    for (i = 0; i < children.length; ++i) {
                        const ch = children[i];
                        if (ch != null) {
                            api.appendChild(elm, createElm(ch, insertedVnodeQueue));
                        }
                    }
                }
                else if (primitive(vnode.text)) {
                    api.appendChild(elm, api.createTextNode(vnode.text));
                }
                const hook = vnode.data.hook;
                if (isDef(hook)) {
                    (_b = hook.create) === null || _b === void 0 ? void 0 : _b.call(hook, emptyNode, vnode);
                    if (hook.insert) {
                        insertedVnodeQueue.push(vnode);
                    }
                }
            }
            else if (((_c = options === null || options === void 0 ? void 0 : options.experimental) === null || _c === void 0 ? void 0 : _c.fragments) && vnode.children) {
                vnode.elm = ((_d = api.createDocumentFragment) !== null && _d !== void 0 ? _d : documentFragmentIsNotSupported)();
                for (i = 0; i < cbs.create.length; ++i)
                    cbs.create[i](emptyNode, vnode);
                for (i = 0; i < vnode.children.length; ++i) {
                    const ch = vnode.children[i];
                    if (ch != null) {
                        api.appendChild(vnode.elm, createElm(ch, insertedVnodeQueue));
                    }
                }
            }
            else {
                vnode.elm = api.createTextNode(vnode.text);
            }
            return vnode.elm;
        }
        function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
            for (; startIdx <= endIdx; ++startIdx) {
                const ch = vnodes[startIdx];
                if (ch != null) {
                    api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
                }
            }
        }
        function invokeDestroyHook(vnode) {
            var _a, _b;
            const data = vnode.data;
            if (data !== undefined) {
                (_b = (_a = data === null || data === void 0 ? void 0 : data.hook) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a, vnode);
                for (let i = 0; i < cbs.destroy.length; ++i)
                    cbs.destroy[i](vnode);
                if (vnode.children !== undefined) {
                    for (let j = 0; j < vnode.children.length; ++j) {
                        const child = vnode.children[j];
                        if (child != null && typeof child !== "string") {
                            invokeDestroyHook(child);
                        }
                    }
                }
            }
        }
        function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
            var _a, _b;
            for (; startIdx <= endIdx; ++startIdx) {
                let listeners;
                let rm;
                const ch = vnodes[startIdx];
                if (ch != null) {
                    if (isDef(ch.sel)) {
                        invokeDestroyHook(ch);
                        listeners = cbs.remove.length + 1;
                        rm = createRmCb(ch.elm, listeners);
                        for (let i = 0; i < cbs.remove.length; ++i)
                            cbs.remove[i](ch, rm);
                        const removeHook = (_b = (_a = ch === null || ch === void 0 ? void 0 : ch.data) === null || _a === void 0 ? void 0 : _a.hook) === null || _b === void 0 ? void 0 : _b.remove;
                        if (isDef(removeHook)) {
                            removeHook(ch, rm);
                        }
                        else {
                            rm();
                        }
                    }
                    else if (ch.children) {
                        // Fragment node
                        invokeDestroyHook(ch);
                        removeVnodes(parentElm, ch.children, 0, ch.children.length - 1);
                    }
                    else {
                        // Text node
                        api.removeChild(parentElm, ch.elm);
                    }
                }
            }
        }
        function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
            let oldStartIdx = 0;
            let newStartIdx = 0;
            let oldEndIdx = oldCh.length - 1;
            let oldStartVnode = oldCh[0];
            let oldEndVnode = oldCh[oldEndIdx];
            let newEndIdx = newCh.length - 1;
            let newStartVnode = newCh[0];
            let newEndVnode = newCh[newEndIdx];
            let oldKeyToIdx;
            let idxInOld;
            let elmToMove;
            let before;
            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (oldStartVnode == null) {
                    oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
                }
                else if (oldEndVnode == null) {
                    oldEndVnode = oldCh[--oldEndIdx];
                }
                else if (newStartVnode == null) {
                    newStartVnode = newCh[++newStartIdx];
                }
                else if (newEndVnode == null) {
                    newEndVnode = newCh[--newEndIdx];
                }
                else if (sameVnode(oldStartVnode, newStartVnode)) {
                    patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                    oldStartVnode = oldCh[++oldStartIdx];
                    newStartVnode = newCh[++newStartIdx];
                }
                else if (sameVnode(oldEndVnode, newEndVnode)) {
                    patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newEndVnode = newCh[--newEndIdx];
                }
                else if (sameVnode(oldStartVnode, newEndVnode)) {
                    // Vnode moved right
                    patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                    api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
                    oldStartVnode = oldCh[++oldStartIdx];
                    newEndVnode = newCh[--newEndIdx];
                }
                else if (sameVnode(oldEndVnode, newStartVnode)) {
                    // Vnode moved left
                    patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                    api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                    oldEndVnode = oldCh[--oldEndIdx];
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    if (oldKeyToIdx === undefined) {
                        oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                    }
                    idxInOld = oldKeyToIdx[newStartVnode.key];
                    if (isUndef(idxInOld)) {
                        // New element
                        api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    }
                    else {
                        elmToMove = oldCh[idxInOld];
                        if (elmToMove.sel !== newStartVnode.sel) {
                            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                        }
                        else {
                            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                            oldCh[idxInOld] = undefined;
                            api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                        }
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
            if (newStartIdx <= newEndIdx) {
                before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
                addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
            }
            if (oldStartIdx <= oldEndIdx) {
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
        function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const hook = (_a = vnode.data) === null || _a === void 0 ? void 0 : _a.hook;
            (_b = hook === null || hook === void 0 ? void 0 : hook.prepatch) === null || _b === void 0 ? void 0 : _b.call(hook, oldVnode, vnode);
            const elm = (vnode.elm = oldVnode.elm);
            if (oldVnode === vnode)
                return;
            if (vnode.data !== undefined ||
                (isDef(vnode.text) && vnode.text !== oldVnode.text)) {
                (_c = vnode.data) !== null && _c !== void 0 ? _c : (vnode.data = {});
                (_d = oldVnode.data) !== null && _d !== void 0 ? _d : (oldVnode.data = {});
                for (let i = 0; i < cbs.update.length; ++i)
                    cbs.update[i](oldVnode, vnode);
                (_g = (_f = (_e = vnode.data) === null || _e === void 0 ? void 0 : _e.hook) === null || _f === void 0 ? void 0 : _f.update) === null || _g === void 0 ? void 0 : _g.call(_f, oldVnode, vnode);
            }
            const oldCh = oldVnode.children;
            const ch = vnode.children;
            if (isUndef(vnode.text)) {
                if (isDef(oldCh) && isDef(ch)) {
                    if (oldCh !== ch)
                        updateChildren(elm, oldCh, ch, insertedVnodeQueue);
                }
                else if (isDef(ch)) {
                    if (isDef(oldVnode.text))
                        api.setTextContent(elm, "");
                    addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
                }
                else if (isDef(oldCh)) {
                    removeVnodes(elm, oldCh, 0, oldCh.length - 1);
                }
                else if (isDef(oldVnode.text)) {
                    api.setTextContent(elm, "");
                }
            }
            else if (oldVnode.text !== vnode.text) {
                if (isDef(oldCh)) {
                    removeVnodes(elm, oldCh, 0, oldCh.length - 1);
                }
                api.setTextContent(elm, vnode.text);
            }
            (_h = hook === null || hook === void 0 ? void 0 : hook.postpatch) === null || _h === void 0 ? void 0 : _h.call(hook, oldVnode, vnode);
        }
        return function patch(oldVnode, vnode) {
            let i, elm, parent;
            const insertedVnodeQueue = [];
            for (i = 0; i < cbs.pre.length; ++i)
                cbs.pre[i]();
            if (isElement(api, oldVnode)) {
                oldVnode = emptyNodeAt(oldVnode);
            }
            else if (isDocumentFragment(api, oldVnode)) {
                oldVnode = emptyDocumentFragmentAt(oldVnode);
            }
            if (sameVnode(oldVnode, vnode)) {
                patchVnode(oldVnode, vnode, insertedVnodeQueue);
            }
            else {
                elm = oldVnode.elm;
                parent = api.parentNode(elm);
                createElm(vnode, insertedVnodeQueue);
                if (parent !== null) {
                    api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
                    removeVnodes(parent, [oldVnode], 0, 0);
                }
            }
            for (i = 0; i < insertedVnodeQueue.length; ++i) {
                insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
            }
            for (i = 0; i < cbs.post.length; ++i)
                cbs.post[i]();
            return vnode;
        };
    }

    function addNS(data, children, sel) {
        data.ns = "http://www.w3.org/2000/svg";
        if (sel !== "foreignObject" && children !== undefined) {
            for (let i = 0; i < children.length; ++i) {
                const child = children[i];
                if (typeof child === "string")
                    continue;
                const childData = child.data;
                if (childData !== undefined) {
                    addNS(childData, child.children, child.sel);
                }
            }
        }
    }
    function h(sel, b, c) {
        let data = {};
        let children;
        let text;
        let i;
        if (c !== undefined) {
            if (b !== null) {
                data = b;
            }
            if (array(c)) {
                children = c;
            }
            else if (primitive(c)) {
                text = c.toString();
            }
            else if (c && c.sel) {
                children = [c];
            }
        }
        else if (b !== undefined && b !== null) {
            if (array(b)) {
                children = b;
            }
            else if (primitive(b)) {
                text = b.toString();
            }
            else if (b && b.sel) {
                children = [b];
            }
            else {
                data = b;
            }
        }
        if (children !== undefined) {
            for (i = 0; i < children.length; ++i) {
                if (primitive(children[i]))
                    children[i] = vnode(undefined, undefined, undefined, children[i], undefined);
            }
        }
        if (sel[0] === "s" &&
            sel[1] === "v" &&
            sel[2] === "g" &&
            (sel.length === 3 || sel[3] === "." || sel[3] === "#")) {
            addNS(data, children, sel);
        }
        return vnode(sel, data, children, text, undefined);
    }

    const xlinkNS = "http://www.w3.org/1999/xlink";
    const xmlNS = "http://www.w3.org/XML/1998/namespace";
    const colonChar = 58;
    const xChar = 120;
    function updateAttrs(oldVnode, vnode) {
        let key;
        const elm = vnode.elm;
        let oldAttrs = oldVnode.data.attrs;
        let attrs = vnode.data.attrs;
        if (!oldAttrs && !attrs)
            return;
        if (oldAttrs === attrs)
            return;
        oldAttrs = oldAttrs || {};
        attrs = attrs || {};
        // update modified attributes, add new attributes
        for (key in attrs) {
            const cur = attrs[key];
            const old = oldAttrs[key];
            if (old !== cur) {
                if (cur === true) {
                    elm.setAttribute(key, "");
                }
                else if (cur === false) {
                    elm.removeAttribute(key);
                }
                else {
                    if (key.charCodeAt(0) !== xChar) {
                        elm.setAttribute(key, cur);
                    }
                    else if (key.charCodeAt(3) === colonChar) {
                        // Assume xml namespace
                        elm.setAttributeNS(xmlNS, key, cur);
                    }
                    else if (key.charCodeAt(5) === colonChar) {
                        // Assume xlink namespace
                        elm.setAttributeNS(xlinkNS, key, cur);
                    }
                    else {
                        elm.setAttribute(key, cur);
                    }
                }
            }
        }
        // remove removed attributes
        // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
        // the other option is to remove all attributes with value == undefined
        for (key in oldAttrs) {
            if (!(key in attrs)) {
                elm.removeAttribute(key);
            }
        }
    }
    const attributesModule = {
        create: updateAttrs,
        update: updateAttrs,
    };

    function updateClass(oldVnode, vnode) {
        let cur;
        let name;
        const elm = vnode.elm;
        let oldClass = oldVnode.data.class;
        let klass = vnode.data.class;
        if (!oldClass && !klass)
            return;
        if (oldClass === klass)
            return;
        oldClass = oldClass || {};
        klass = klass || {};
        for (name in oldClass) {
            if (oldClass[name] && !Object.prototype.hasOwnProperty.call(klass, name)) {
                // was `true` and now not provided
                elm.classList.remove(name);
            }
        }
        for (name in klass) {
            cur = klass[name];
            if (cur !== oldClass[name]) {
                elm.classList[cur ? "add" : "remove"](name);
            }
        }
    }
    const classModule = { create: updateClass, update: updateClass };

    function bindMobileMousedown(el, f, redraw) {
        for (const mousedownEvent of ['touchstart', 'mousedown']) {
            el.addEventListener(mousedownEvent, e => {
                f(e);
                e.preventDefault();
                if (redraw)
                    redraw();
            }, { passive: false });
        }
    }
    const bindNonPassive = (eventName, f, redraw) => bind(eventName, f, redraw, false);
    const bind = (eventName, f, redraw, passive = true) => onInsert(el => el.addEventListener(eventName, e => {
        const res = f(e);
        if (res === false)
            e.preventDefault();
        redraw === null || redraw === void 0 ? void 0 : redraw();
        return res;
    }, { passive }));
    function onInsert(f) {
        return {
            insert: vnode => f(vnode.elm),
        };
    }
    function stepwiseScroll(inner) {
        let scrollTotal = 0;
        return (e) => {
            scrollTotal += e.deltaY * (e.deltaMode ? 40 : 1);
            if (Math.abs(scrollTotal) >= 4) {
                inner(e, true);
                scrollTotal = 0;
            }
            else {
                inner(e, false);
            }
        };
    }
    function eventRepeater(action, e) {
        const repeat = () => {
            action();
            delay = Math.max(100, delay - delay / 15);
            timeout = setTimeout(repeat, delay);
        };
        let delay = 350;
        let timeout = setTimeout(repeat, 500);
        action();
        const eventName = e.type == 'touchstart' ? 'touchend' : 'mouseup';
        document.addEventListener(eventName, () => clearTimeout(timeout), { once: true });
    }

    const renderMenu = (ctrl) => h('div.lpv__menu.lpv__pane', [
        h('button.lpv__menu__entry.lpv__menu__flip.lpv__fbt', {
            hook: bind('click', ctrl.flip),
        }, ctrl.translate('flipTheBoard')),
        h('a.lpv__menu__entry.lpv__menu__analysis.lpv__fbt', {
            attrs: {
                href: ctrl.analysisUrl(),
                target: '_blank',
            },
        }, ctrl.translate('analysisBoard')),
        h('a.lpv__menu__entry.lpv__menu__practice.lpv__fbt', {
            attrs: {
                href: ctrl.practiceUrl(),
                target: '_blank',
            },
        }, ctrl.translate('practiceWithComputer')),
        h('button.lpv__menu__entry.lpv__menu__pgn.lpv__fbt', {
            hook: bind('click', ctrl.togglePgn),
        }, ctrl.translate('getPgn')),
        renderExternalLink(ctrl),
    ]);
    const renderExternalLink = (ctrl) => {
        const link = ctrl.game.metadata.externalLink;
        return (link &&
            h('a.lpv__menu__entry.lpv__fbt', {
                attrs: {
                    href: link,
                    target: '_blank',
                },
            }, ctrl.translate(ctrl.game.metadata.isLichess ? 'viewOnLichess' : 'viewOnSite')));
    };
    const renderControls = (ctrl) => h('div.lpv__controls', [
        ctrl.pane == 'board' ? undefined : dirButton(ctrl, 'first'),
        dirButton(ctrl, 'prev'),
        h('button.lpv__fbt.lpv__controls__menu', {
            class: { active: ctrl.pane != 'board' },
            hook: bind('click', ctrl.toggleMenu),
        }, ctrl.pane == 'board' ? '⋮' : 'X'),
        dirButton(ctrl, 'next'),
        ctrl.pane == 'board' ? undefined : dirButton(ctrl, 'last'),
    ]);
    const dirButton = (ctrl, to) => h(`button.lpv__controls__goto.lpv__controls__goto--${to}.lpv__fbt`, {
        class: { disabled: ctrl.pane == 'board' && !ctrl.canGoTo(to) },
        hook: onInsert(el => bindMobileMousedown(el, e => eventRepeater(() => ctrl.goTo(to), e))),
    });

    const renderMoves = (ctrl) => h('div.lpv__side', h('div.lpv__moves', {
        hook: {
            insert: vnode => {
                const el = vnode.elm;
                if (!ctrl.path.empty())
                    autoScroll(ctrl, el);
                el.addEventListener('mousedown', e => {
                    const path = e.target.getAttribute('p');
                    if (path)
                        ctrl.toPath(new Path(path));
                }, { passive: true });
            },
            postpatch: (_, vnode) => {
                if (ctrl.autoScrollRequested) {
                    autoScroll(ctrl, vnode.elm);
                    ctrl.autoScrollRequested = false;
                }
            },
        },
    }, [...ctrl.game.initial.comments.map(makeComment), ...makeMoveNodes(ctrl)]));
    const makeMoveNodes = (ctrl) => {
        const moveDom = renderMove(ctrl);
        const elms = [];
        let node, variations = ctrl.game.moves.children.slice(1);
        while ((node = (node ? node : ctrl.game.moves).children[0])) {
            const move = node.data;
            const oddMove = move.ply % 2 == 1;
            if (oddMove)
                elms.push(h('index', [moveTurn(move), '.']));
            elms.push(moveDom(move));
            const addEmptyMove = oddMove && (variations.length || move.comments.length) && node.children.length;
            if (addEmptyMove)
                elms.push(h('move.empty', '...'));
            move.comments.forEach(comment => elms.push(makeComment(comment)));
            variations.forEach(variation => elms.push(makeMainVariation(moveDom, variation)));
            if (addEmptyMove) {
                elms.push(h('index', [moveTurn(move), '.']));
                elms.push(h('move.empty', '...'));
            }
            variations = node.children.slice(1);
        }
        return elms;
    };
    const makeComment = (comment) => h('comment', comment);
    const makeMainVariation = (moveDom, node) => h('variation', [...node.data.startingComments.map(makeComment), ...makeVariationMoves(moveDom, node)]);
    const makeVariationMoves = (moveDom, node) => {
        let elms = [];
        let variations = [];
        if (node.data.ply % 2 == 0)
            elms.push(h('index', [moveTurn(node.data), '...']));
        do {
            const move = node.data;
            if (move.ply % 2 == 1)
                elms.push(h('index', [moveTurn(move), '.']));
            elms.push(moveDom(move));
            move.comments.forEach(comment => elms.push(makeComment(comment)));
            variations.forEach(variation => {
                elms = [...elms, ...[parenOpen(), ...makeVariationMoves(moveDom, variation), parenClose()]];
            });
            variations = node.children.slice(1);
            node = node.children[0];
        } while (node);
        return elms;
    };
    const parenOpen = () => h('paren.open', '(');
    const parenClose = () => h('paren.close', ')');
    const moveTurn = (move) => Math.floor((move.ply - 1) / 2) + 1;
    const renderMove = (ctrl) => (move) => h('move', {
        class: {
            current: ctrl.path.equals(move.path),
            ancestor: ctrl.path.contains(move.path),
        },
        attrs: {
            p: move.path.path,
        },
    }, move.san);
    const autoScroll = (ctrl, cont) => {
        const target = cont.querySelector('.current');
        if (!target) {
            cont.scrollTop = ctrl.path.empty() ? 0 : 99999;
            return;
        }
        cont.scrollTop = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight;
    };

    function renderPlayer(ctrl, side) {
        const color = side == 'bottom' ? ctrl.orientation() : opposite$1(ctrl.orientation());
        const player = ctrl.game.players[color];
        return h(`div.lpv__player.lpv__player--${side}`, [
            h('div.lpv__player__person', [
                player.title ? h('div.lpv__player__title', player.title) : undefined,
                h('div.lpv__player__name', player.name),
                player.rating ? h('div.lpv__player__rating', ['(', player.rating, ')']) : undefined,
            ]),
            ctrl.opts.showClocks ? renderClock(ctrl, color) : undefined,
        ]);
    }
    const renderClock = (ctrl, color) => {
        const move = ctrl.curData();
        const clock = move.clocks && move.clocks[color];
        return typeof clock == undefined
            ? undefined
            : h('div.lpv__player__clock', { class: { active: color == move.turn } }, clockContent(clock));
    };
    const clockContent = (seconds) => {
        if (!seconds && seconds !== 0)
            return ['-'];
        const date = new Date(seconds * 1000), sep = ':', baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
        return seconds >= 3600 ? [Math.floor(seconds / 3600) + sep + baseStr] : [baseStr];
    };
    const pad2 = (num) => (num < 10 ? '0' : '') + num;

    function view(ctrl) {
        return h('div.lpv', {
            class: {
                'lpv--menu': ctrl.pane != 'board',
                'lpv--moves': !!ctrl.opts.showMoves,
                'lpv--players': !!ctrl.opts.showPlayers,
            },
            hook: onInsert(el => ctrl.setGround(Chessground(el.querySelector('.cg-wrap'), makeConfig(ctrl, el)))),
        }, [
            ctrl.opts.showPlayers ? renderPlayer(ctrl, 'top') : undefined,
            renderBoard(ctrl),
            ctrl.opts.showPlayers ? renderPlayer(ctrl, 'bottom') : undefined,
            renderControls(ctrl),
            ctrl.opts.showMoves ? renderMoves(ctrl) : undefined,
            ctrl.pane == 'menu' ? renderMenu(ctrl) : ctrl.pane == 'pgn' ? renderPgnPane(ctrl) : undefined,
        ]);
    }
    const renderBoard = (ctrl) => h('div.lpv__board', {
        hook: wheelScroll(ctrl),
    }, h('div.cg-wrap'));
    const renderPgnPane = (ctrl) => {
        const blob = new Blob([ctrl.opts.pgn], { type: 'text/plain' });
        return h('div.lpv__pgn.lpv__pane', [
            h('a.lpv__pgn__download.lpv__fbt', {
                attrs: {
                    href: window.URL.createObjectURL(blob),
                    download: `${ctrl.game.title()}.pgn`,
                },
            }, ctrl.translate('download')),
            h('textarea.lpv__pgn__text', ctrl.opts.pgn),
        ]);
    };
    const wheelScroll = (ctrl) => 'ontouchstart' in window || !ctrl.opts.scrollToMove
        ? undefined
        : bindNonPassive('wheel', stepwiseScroll((e, scroll) => {
            e.preventDefault();
            if (e.deltaY > 0 && scroll)
                ctrl.goTo('next');
            else if (e.deltaY < 0 && scroll)
                ctrl.goTo('prev');
        }));
    const makeConfig = (ctrl, rootEl) => ({
        viewOnly: true,
        addDimensionsCssVarsTo: rootEl,
        draggable: {
            showGhost: false,
        },
        drawable: {
            enabled: false,
            visible: true,
        },
        ...ctrl.cgConfig(),
    });

    const defaults = {
        pgn: '*',
        showPlayers: true,
        showMoves: true,
        showClocks: true,
        scrollToMove: true,
        orientation: 'white',
        initialPly: 0,
        chessground: {},
    };
    function start(element, cfg) {
        const patch = init([classModule, attributesModule]);
        const opts = { ...defaults, ...cfg };
        const ctrl = new Ctrl(opts, redraw);
        const blueprint = view(ctrl);
        element.innerHTML = '';
        let vnode = patch(element, blueprint);
        function redraw() {
            vnode = patch(vnode, view(ctrl));
        }
    }

    return start;

})();
