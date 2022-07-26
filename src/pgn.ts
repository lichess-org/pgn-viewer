import { Color, makeUci, Position } from 'chessops';
import { scalachessCharPair } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { parsePgn, parseComment, PgnNodeData, startingPosition, transform, Node, Comment } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Game } from './game';
import { MoveData, Initial, Players, Player, Comments } from './interfaces';
import { Path } from './path';

class State {
  constructor(readonly pos: Position, public path: Path) {}
  clone = () => new State(this.pos.clone(), this.path);
}

export const parseComments = (strings: string[]): Comments => {
  const comments = strings.map(parseComment);
  return {
    texts: comments.map(c => c.text).filter(t => !!t),
    shapes: comments.flatMap(c => c.shapes),
    clock: comments.reduce<number | undefined>((clk, com) => com.clock || clk, undefined),
    emt: comments.reduce<number | undefined>((emt, com) => com.emt || emt, undefined),
  };
};

export const makeGame = (pgn: string): Game => {
  const game = parsePgn(pgn)[0] || parsePgn('*')[0];
  const start = startingPosition(game.headers).unwrap();
  const fen = makeFen(start.toSetup());
  const comments = parseComments(game.comments || []);
  const initial: Initial = {
    fen,
    check: start.isCheck(),
    pos: start,
    comments: comments.texts,
    shapes: comments.shapes,
    clock: comments.clock,
  };
  const moves = makeMoves(start, game.moves);
  const players = makePlayers(game.headers);
  return new Game(initial, moves, players);
};

const makeMoves = (start: Position, moves: Node<PgnNodeData>) =>
  transform<PgnNodeData, MoveData, State>(moves, new State(start, Path.root), (state, node, _index) => {
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
    const moveNode: MoveData = {
      path,
      ply: (setup.fullmoves - 1) * 2 + (state.pos.turn === 'white' ? 0 : 1),
      move,
      san: node.san,
      uci: makeUci(move),
      fen: makeFen(state.pos.toSetup()),
      check: state.pos.isCheck(),
      comments: comments.texts,
      startingComments: startingComments.texts,
      nags: node.nags || [],
      shapes,
      clock: comments.clock,
      emt: comments.emt,
    };
    return moveNode;
  });

type Headers = Map<string, string>;

function makePlayers(headers: Headers): Players {
  const lower = new Map(Array.from(headers, ([key, value]) => [key.toLowerCase(), value]));
  const get = (color: Color, field: string) => lower.get(`${color}${field}`);
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
