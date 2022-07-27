import { Color, makeUci, Position } from 'chessops';
import { scalachessCharPair } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { parsePgn, parseComment, PgnNodeData, startingPosition, transform, Node, Comment } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Game } from './game';
import { MoveData, Initial, Players, Player, Comments, Metadata, Clocks } from './interfaces';
import { Path } from './path';

class State {
  constructor(readonly pos: Position, public path: Path, public clocks: Clocks) {}
  clone = () => new State(this.pos.clone(), this.path, { ...this.clocks });
}

export const parseComments = (strings: string[]): Comments => {
  const comments = strings.map(parseComment);
  const reduceTimes = (times: Array<number | undefined>) =>
    times.reduce<number | undefined>((last, time) => (typeof time == undefined ? last : time), undefined);
  return {
    texts: comments.map(c => c.text).filter(t => !!t),
    shapes: comments.flatMap(c => c.shapes),
    clock: reduceTimes(comments.map(c => c.clock)),
    emt: reduceTimes(comments.map(c => c.emt)),
  };
};

export const makeGame = (pgn: string): Game => {
  const game = parsePgn(pgn)[0] || parsePgn('*')[0];
  const start = startingPosition(game.headers).unwrap();
  const fen = makeFen(start.toSetup());
  const comments = parseComments(game.comments || []);
  const initial: Initial = {
    fen,
    turn: start.turn,
    check: start.isCheck(),
    pos: start,
    comments: comments.texts,
    shapes: comments.shapes,
    clocks: {
      white: comments.clock,
      black: comments.clock,
    },
  };
  const moves = makeMoves(start, game.moves);
  const headers = new Map(Array.from(game.headers, ([key, value]) => [key.toLowerCase(), value]));
  const players = makePlayers(headers);
  const metadata = makeMetadata(headers);
  return new Game(initial, moves, players, metadata);
};

const makeMoves = (start: Position, moves: Node<PgnNodeData>) =>
  transform<PgnNodeData, MoveData, State>(moves, new State(start, Path.root, {}), (state, node, _index) => {
    const move = parseSan(state.pos, node.san);
    if (!move) return undefined;
    const moveId = scalachessCharPair(move);
    const path = state.path.append(moveId);
    state.pos.play(move);
    state.path = path;
    const setup = state.pos.toSetup();
    const comments = parseComments(node.comments || []);
    const startingComments = parseComments(node.startingComments || []);
    const shapes = [...comments.shapes, ...startingComments.shapes];
    const clocks = (state.clocks = makeClocks(state.clocks, state.pos.turn, comments.clock));
    const moveNode: MoveData = {
      path,
      ply: (setup.fullmoves - 1) * 2 + (state.pos.turn === 'white' ? 0 : 1),
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

const makeClocks = (prev: Clocks, turn: Color, clk?: number): Clocks =>
  turn == 'white' ? { ...prev, black: clk } : { ...prev, white: clk };

type Headers = Map<string, string>;

function makePlayers(headers: Headers): Players {
  const get = (color: Color, field: string) => headers.get(`${color}${field}`);
  const makePlayer = (color: Color): Player => ({
    name: get(color, ''),
    title: get(color, 'title'),
    rating: parseInt(get(color, 'elo') || '') || undefined,
  });
  return {
    white: makePlayer('white'),
    black: makePlayer('black'),
  };
}

function makeMetadata(headers: Headers): Metadata {
  const site = headers.get('site');
  return {
    externalLink: site && site.startsWith('https://') ? site : undefined,
    isLichess: !!site && site.startsWith('https://lichess.org/'),
  };
}
