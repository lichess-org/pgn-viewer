import { makeUci, Position } from 'chessops';
import { scalachessCharPair } from 'chessops/compat';
import { makeFen } from 'chessops/fen';
import { parsePgn, PgnNodeData, startingPosition, transform } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Game } from './game';
import { MoveData, Initial } from './interfaces';
import { Path } from './path';

class State {
  constructor(readonly pos: Position, public path: Path) {}
  clone = () => new State(this.pos.clone(), this.path);
}

export function makeGame(pgn: string): Game | undefined {
  const game = parsePgn(pgn)[0];
  if (!game) return undefined;
  const start = startingPosition(game.headers).unwrap();
  const initial: Initial = {
    fen: makeFen(start.toSetup()),
    check: start.isCheck(),
    pos: start,
  };
  const moves = transform<PgnNodeData, MoveData, State>(
    game.moves,
    new State(start, Path.root),
    (state, node, _index) => {
      const move = parseSan(state.pos, node.san);
      if (!move) return undefined;
      const moveId = scalachessCharPair(move);
      const path = state.path.append(moveId);
      state.pos.play(move);
      state.path = path;
      const setup = state.pos.toSetup();
      const moveNode: MoveData = {
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
  return new Game(initial, moves, game.headers, game.comments);
}
