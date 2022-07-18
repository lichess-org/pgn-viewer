import { makeUci, Position } from 'chessops';
import { makeFen } from 'chessops/fen';
import { Game, PgnNodeData, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { Node } from './interfaces';

export function makeNodes(game: Game<PgnNodeData>): Node[] {
  const pos = startingPosition(game.headers).unwrap();
  const toNode = (pos: Position) => ({ fen: makeFen(pos.toSetup()), check: pos.isCheck() });
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
