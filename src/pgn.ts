import { makeUci, Position } from 'chessops';
import { makeFen } from 'chessops/fen';
import { Game, parsePgn, startingPosition } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { MoveNode, RootNode, FullGame } from './interfaces';

export function makeGame(pgn: string): FullGame {
  throw 'todo';
  // const game = parsePgn(pgn)[0];
  // const r = startingPosition(game.headers).unwrap();
  // const root: RootNode = {
  //   fen: makeFen(r.toSetup()),
  //   check: r.isCheck(),
  //   ply: 0,
  // };
  // const toMoveNode = (pos: Position): MoveNode => {
  //   const setup = pos.toSetup();
  //   const ply = setup.fullmoves / 2 + (pos.turn === 'white' ? 0 : 1);
  //   return {
  //     id:
  //     ply,
  //     fen: makeFen(pos.toSetup()),
  //     check: pos.isCheck(),
  //   };
  // };
  // const nodes: Node[] = [toNode(pos)];
  // for (const n of game.moves.mainline()) {
  //   const move = parseSan(pos, n.san);
  //   if (!move) {
  //     console.error(n, game.headers, makeFen(pos.toSetup()));
  //     throw `Can't parse ${n}`;
  //   } else pos.play(move);
  //   nodes.push({ ...toNode(pos), san: n.san, uci: makeUci(move) });
  // }
  // return nodes;
}
