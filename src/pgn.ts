import { makeUci, Position } from 'chessops';
import { makeFen } from 'chessops/fen';
import { Game, PgnNodeData, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Node } from './interfaces';

export function makeNodes(game: Game<PgnNodeData>): Node[] {
  const pos = startingPosition(game.headers).unwrap();
  const toNode = (pos: Position) => {
    const setup = pos.toSetup();
    const ply = setup.fullmoves / 2 + (pos.turn === 'white' ? 0 : 1);
    return { fen: makeFen(pos.toSetup()), check: pos.isCheck(), ply };
  };
  const nodes: Node[] = [toNode(pos)];
  for (const n of game.moves.mainline()) {
    const move = parseSan(pos, n.san);
    if (!move) {
      console.error(n, game.headers, makeFen(pos.toSetup()));
      throw `Can't parse ${n}`;
    } else pos.play(move);
    nodes.push({ ...toNode(pos), san: n.san, uci: makeUci(move) });
  }
  return nodes;
}
