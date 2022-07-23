import { expect, test } from '@jest/globals';
import { uciToId } from './id';

test('from UCI', () => {
  expect(uciToId('a1b1')).toBe('#$');
  expect(uciToId('a1a2')).toBe('#+');
  expect(uciToId('h7h8')).toBe('Zb');
});
