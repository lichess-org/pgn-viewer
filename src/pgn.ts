import { makeUci, Position } from 'chessops';
import { scalachessCharPair } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { parsePgn, PgnNodeData, startingPosition, transform } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { MoveNode, RootNode, FullGame, Id } from './interfaces';

class State {
  constructor(readonly pos: Position, public path: Id) {}
  clone = () => new State(this.pos.clone(), this.path);
}

export function makeGame(pgn: string): FullGame | undefined {
  const game = parsePgn(pgn)[0];
  if (!game) return undefined;
  const start = startingPosition(game.headers).unwrap();
  const root: RootNode = {
    path: '',
    fen: makeFen(start.toSetup()),
    check: start.isCheck(),
    ply: 0,
  };
  const moves = transform<PgnNodeData, MoveNode, State>(
    game.moves,
    new State(start, root.path),
    (state, node, _index) => {
      const move = parseSan(state.pos, node.san);
      if (!move) return undefined;
      const moveId = scalachessCharPair(move);
      const path = state.path + moveId;
      state.pos.play(move);
      state.path = path;
      const setup = state.pos.toSetup();
      const moveNode: MoveNode = {
        path,
        ply: (setup.fullmoves - 1) * 2 + (state.pos.turn === 'white' ? 0 : 1),
        move,
        san: node.san,
        uci: makeUci(move),
        fen: makeFen(state.pos.toSetup()),
        check: state.pos.isCheck(),
      };
      return moveNode;
    }
  );
  return {
    root,
    game: {
      ...game,
      moves: moves,
    },
  };
}
