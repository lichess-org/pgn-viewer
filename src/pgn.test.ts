import { expect, test } from '@jest/globals';
import { isNormal, parseSquare } from 'chessops';
import { makeGame } from './pgn';

test('single move pgn', () => {
  const lastMove = makeGame('e4')!.moves.children[0].data;
  expect(lastMove.ply).toBe(1);
  expect(lastMove.uci).toBe('e2e4');
  expect(lastMove.san).toBe('e4');
  expect(lastMove.path.path).toBe('/?');
  expect(isNormal(lastMove.move) && lastMove.move.from).toBe(parseSquare('e2'));
});
test('wrong pgn', () => {
  const mainline = Array.from(makeGame('e4 Nh1')!.moves.mainline());
  expect(mainline.length).toBe(1);
});
test('couple moves pgn', () => {
  const lastMove = Array.from(makeGame('e4 Nf6')!.moves.mainline())[1];
  expect(lastMove.ply).toBe(2);
  expect(lastMove.uci).toBe('g8f6');
  expect(lastMove.san).toBe('Nf6');
  expect(lastMove.path.path).toBe('/?aP');
  expect(isNormal(lastMove.move) && lastMove.move.from).toBe(parseSquare('g8'));
});
test('longer mainline', () => {
  const mainline = Array.from(
    makeGame(
      '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5 6. Ndb5 d6 7. Bg5 a6 8. Na3 b5 9. Nd5 Be7 10. Bxf6 Bxf6 11. c3 O-O 12. Nc2 Bg5 13. a4 bxa4 14. b3 axb3 15. Nd4 b2 16. Nxc6 bxa1=Q'
    )!.moves.mainline()
  );
  const lastMove = mainline[mainline.length - 1];
  expect(lastMove.ply).toBe(32);
  expect(lastMove.uci).toBe('b2a1q');
  expect(lastMove.san).toBe('bxa1=Q');
  expect(lastMove.path.path).toBe('/?UE)8\\M.>E>8>aP$5WG>DVN%ISKD3TD5F`WIPWP-5_b3-PI+;D;,4;4->4,>M,c');
});
test('initial position', () => {
  expect(makeGame('').initial.pos.fullmoves).toBe(1);
  expect(makeGame('1. e4 c5 2. Nf3').initial.pos.fullmoves).toBe(1);
  expect(makeGame('[FEN "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2"]').initial.pos.fullmoves).toBe(2);
});
