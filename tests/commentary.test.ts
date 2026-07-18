import { type VNode } from 'snabbdom';
import { expect, test } from 'vitest';

import { type Opts } from '../src/interfaces';

const collectText = (node: VNode | string | number | null | undefined): string => {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return (typeof node.text === 'string' ? node.text : '') + (node.children || []).map(collectText).join('');
};

const setup = async (pgn: string) => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
    },
    configurable: true,
  });

  const [{ default: PgnViewer }, { renderCommentary }] = await Promise.all([
    import('../src/pgnViewer'),
    import('../src/view/commentary'),
  ]);
  const ctrl = new PgnViewer(
    {
      pgn,
      chessground: {},
      showPlayers: false,
      showMoves: false,
      showClocks: false,
      showControls: false,
      showVariations: true,
      showCommentary: true,
      initialPly: 0,
      scrollToMove: false,
      keyboardToMove: false,
      drawArrows: false,
      menu: { getPgn: {} },
      lichess: false,
    } as Opts,
    () => undefined,
  );

  return { ctrl, render: () => collectText(renderCommentary(ctrl)) };
};

test('shows the game leading comment at the start position', async () => {
  const { render } = await setup('{Intro text before any moves} 1. e4 e5 *');
  expect(render()).toContain('Intro text before any moves');
});

test('shows a placeholder when the current position has no comment', async () => {
  const { render } = await setup('1. e4 e5 *');
  expect(render()).toContain('No comment for this move.');
});

test('shows the comment for the currently selected move, and updates on navigation', async () => {
  const { ctrl, render } = await setup(
    '1. e4 { first move comment } e5 { second move comment } *',
  );

  // At the start position, neither move's comment should show.
  expect(render()).not.toContain('first move comment');
  expect(render()).not.toContain('second move comment');

  ctrl.toPath(ctrl.game.mainline[0].path, false);
  expect(render()).toContain('first move comment');
  expect(render()).not.toContain('second move comment');

  ctrl.toPath(ctrl.game.mainline[1].path, false);
  expect(render()).toContain('second move comment');
  expect(render()).not.toContain('first move comment');
});
