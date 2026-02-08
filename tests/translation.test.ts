import { expect, test } from 'vitest';
import translation from '../src/translation';

test('default translator', () => {
  const t = translation();
  expect(t('flipTheBoard')).toBe('Flip the board');
  expect(t('viewOnSite')).toBe('View on site');
});

test('useless custom translator', () => {
  const t = translation(_ => undefined);
  expect(t('flipTheBoard')).toBe('Flip the board');
  expect(t('viewOnSite')).toBe('View on site');
});

test('dumb custom translator', () => {
  const t = translation(_ => 'DOH');
  expect(t('flipTheBoard')).toBe('DOH');
  expect(t('viewOnSite')).toBe('DOH');
});

test('partial custom translator', () => {
  const t = translation(k => (k == 'flipTheBoard' ? 'Flip it' : undefined));
  expect(t('flipTheBoard')).toBe('Flip it');
  expect(t('viewOnSite')).toBe('View on site');
});
