import { expect, test } from '@jest/globals';
import { isNormal, parseSquare } from 'chessops';
import { makeGame } from './pgn';

test('empty pgn', () => {
  expect(makeGame('')).toBe(undefined);
});
test('single move pgn', () => {
  const lastMove = makeGame('e4').game.moves.children[0].data;
  expect(lastMove.ply).toBe(1);
  expect(lastMove.uci).toBe('e2e4');
  expect(lastMove.san).toBe('e4');
  expect(lastMove.id).toBe('/?');
  expect(isNormal(lastMove.move) && lastMove.move.from).toBe(parseSquare('e2'));
});
test('wrong pgn', () => {
  const mainline = Array.from(makeGame('e4 Nh1').game.moves.mainline());
  expect(mainline.length).toBe(1);
});
test('couple moves pgn', () => {
  const lastMove = Array.from(makeGame('e4 Nf6').game.moves.mainline())[1];
  expect(lastMove.ply).toBe(2);
  expect(lastMove.uci).toBe('g8f6');
  expect(lastMove.san).toBe('Nf6');
  expect(lastMove.id).toBe('/?aP');
  expect(isNormal(lastMove.move) && lastMove.move.from).toBe(parseSquare('g8'));
});
