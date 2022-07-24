import { expect, test } from '@jest/globals';
import { parseComment } from './comment';

test('simple comment', () => {
  expect(parseComment('')).toStrictEqual(['', []]);
  expect(parseComment('test')).toStrictEqual(['test', []]);
  expect(parseComment('  test       ')).toStrictEqual(['test', []]);
});

test('circle', () => {
  expect(parseComment('[%csl Gb4]')).toStrictEqual(['', [{ orig: 'b4', brush: 'green' }]]);
  expect(parseComment('[%csl Gb4,Ye5,Zh1]')).toStrictEqual([
    '',
    [
      { orig: 'b4', brush: 'green' },
      { orig: 'e5', brush: 'yellow' },
      { orig: 'h1', brush: 'blue' },
    ],
  ]);
  expect(parseComment('[%csl Gb4] [%csl Ye5,Zh1]')).toStrictEqual([
    '',
    [
      { orig: 'b4', brush: 'green' },
      { orig: 'e5', brush: 'yellow' },
      { orig: 'h1', brush: 'blue' },
    ],
  ]);
});

test('arrow', () => {
  expect(parseComment('[%cal Ge2e4]')).toStrictEqual(['', [{ orig: 'e2', dest: 'e4', brush: 'green' }]]);
  expect(parseComment('[%cal Re2e4,Ye2d4,Ze2g4]')).toStrictEqual([
    '',
    [
      { orig: 'e2', dest: 'e4', brush: 'red' },
      { orig: 'e2', dest: 'd4', brush: 'yellow' },
      { orig: 'e2', dest: 'g4', brush: 'blue' },
    ],
  ]);
  expect(parseComment('[%cal Re2e4,Ye2d4] [%cal Ze2g4]')).toStrictEqual([
    '',
    [
      { orig: 'e2', dest: 'e4', brush: 'red' },
      { orig: 'e2', dest: 'd4', brush: 'yellow' },
      { orig: 'e2', dest: 'g4', brush: 'blue' },
    ],
  ]);
});

test('text and shape', () => {
  expect(parseComment('before [%cal Re2e4] between [%csl Ye5] after')).toStrictEqual([
    'before between after',
    [
      { orig: 'e5', brush: 'yellow' },
      { orig: 'e2', dest: 'e4', brush: 'red' },
    ],
  ]);
});
