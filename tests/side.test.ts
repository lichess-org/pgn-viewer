import { expect, test } from 'vitest';

import { movePathFromEventTarget } from '../src/view/events';

const targetWithClosest = (path: string | null) =>
  ({
    closest: (selector: string) =>
      selector === '[data-path]'
        ? {
            getAttribute: (name: string) => (name === 'data-path' ? path : null),
          }
        : null,
  }) as unknown as EventTarget;

test('finds move path from event target ancestors', () => {
  expect(movePathFromEventTarget(targetWithClosest('/abc'))).toBe('/abc');
});

test('returns undefined when event target has no move path', () => {
  expect(movePathFromEventTarget(targetWithClosest(null))).toBe(undefined);
  expect(movePathFromEventTarget({} as EventTarget)).toBe(undefined);
  expect(movePathFromEventTarget(null)).toBe(undefined);
});
