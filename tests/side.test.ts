import { type VNode } from 'snabbdom';
import { expect, test } from 'vitest';

import { type Opts } from '../src/interfaces';

type TextNode = VNode | string | number | null | undefined;

const collectText = (node: TextNode): string[] => {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  return [
    ...(typeof node.text === 'string' ? [node.text] : []),
    ...((node.children || []) as TextNode[]).flatMap(collectText),
  ];
};

const renderText = async (pgn: string) => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
    },
    configurable: true,
  });

  const [{ default: PgnViewer }, { renderMoves }] = await Promise.all([
    import('../src/pgnViewer'),
    import('../src/view/side'),
  ]);
  const ctrl = new PgnViewer(
    {
      pgn,
      chessground: {},
      showPlayers: false,
      showMoves: 'right',
      showClocks: false,
      showControls: false,
      initialPly: 0,
      scrollToMove: false,
      keyboardToMove: false,
      drawArrows: false,
      menu: { getPgn: {} },
      lichess: false,
    } as Opts,
    () => undefined,
  );

  return collectText(renderMoves(ctrl));
};

test('renders starting comments before variation moves', async () => {
  const text = await renderText(
    "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 ({Again, White has two main options. We'll see} Nd5 {in quite detail, but here, let's explore another knight jump that has gained some popularity recently.}) 9.Nab1 *",
  );

  expect(text).toContain("Again, White has two main options. We'll see");
});

test('renders starting comments before moves in nested variations', async () => {
  const text = await renderText('1. e4 e5 (1... c5 ({Nested comment} 1... e6) 2. Nf3) *');

  expect(text).toContain('Nested comment');
});
