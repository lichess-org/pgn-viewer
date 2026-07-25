import { expect, test } from 'vitest';

import { type Opts } from '../src/interfaces';

// 1. e4 e5 (1... c5 2. Nf3 (2. Nc3 Nc6) 2... Nc6) 2. Nf3 *
// Mainline: e4 e5 Nf3
// Variation at black's 1st move: c5, continuing 2.Nf3 Nc6, with a NESTED
// variation at white's 2nd move within that: Nc3 Nc6.
const pgn = '1. e4 e5 (1... c5 2. Nf3 (2. Nc3 Nc6) 2... Nc6) 2. Nf3 *';

async function setup() {
  Object.defineProperty(globalThis, 'window', {
    value: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
    },
    configurable: true,
  });
  const [{ default: PgnViewer }, { continuationArrows }] = await Promise.all([
    import('../src/pgnViewer'),
    import('../src/view/variationArrows'),
  ]);
  const ctrl = new PgnViewer(
    {
      pgn,
      chessground: {},
      showPlayers: false,
      showMoves: false,
      showClocks: false,
      showControls: false,
      showVariations: false,
      showCommentary: false,
      initialPly: 0,
      scrollToMove: false,
      keyboardToMove: false,
      drawArrows: false,
      menu: { getPgn: {} },
      lichess: false,
    } as Opts,
    () => undefined,
  );
  return { ctrl, continuationArrows };
}

test('continuationArrows lists mainline first, then variations', async () => {
  const { ctrl, continuationArrows } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path); // after 1. e4

  const arrows = continuationArrows(ctrl.curNode());
  expect(arrows).toHaveLength(2);
  expect(arrows[0].kind).toBe('mainline');
  expect(arrows[0].to).toBe('e5');
  expect(arrows[1].kind).toBe('variation');
  expect(arrows[1].to).toBe('c5');
});

test('mainlineArrow "never" omits the mainline arrow, keeping only variations', async () => {
  const { ctrl, continuationArrows } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path); // after 1. e4

  const arrows = continuationArrows(ctrl.curNode(), 'never');
  expect(arrows).toHaveLength(1);
  expect(arrows[0].kind).toBe('variation');
});

test('mainlineArrow "ifVariation" hides the mainline arrow at positions with no branch', async () => {
  const { ctrl, continuationArrows } = await setup();
  ctrl.toPath(ctrl.game.mainline[1].path); // after 1. e4 e5 — no variation branches here

  const arrows = continuationArrows(ctrl.curNode(), 'ifVariation');
  expect(arrows).toHaveLength(0);
});

test('mainlineArrow "ifVariation" still shows the mainline arrow where a variation does branch', async () => {
  const { ctrl, continuationArrows } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path); // after 1. e4 — c5 branches here

  const arrows = continuationArrows(ctrl.curNode(), 'ifVariation');
  expect(arrows).toHaveLength(2);
  expect(arrows[0].kind).toBe('mainline');
});

test('opening a variation popup shows the variation position without touching the main path', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path); // after 1. e4
  const variationNode = ctrl.curNode().children[1]; // 1... c5

  ctrl.openVariationPopup(variationNode.data.path);

  expect(ctrl.variationPopups).toHaveLength(1);
  expect(ctrl.variationPopups[0].path.equals(variationNode.data.path)).toBe(true);
  // The main path is untouched — still sitting after 1. e4.
  expect(ctrl.path.equals(ctrl.game.mainline[0].path)).toBe(true);
});

test('a popup can open a further nested popup from its own variation arrows', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path);
  const c5Node = ctrl.curNode().children[1];
  ctrl.openVariationPopup(c5Node.data.path);

  // Inside popup 0, after c5, the position has its own mainline (2. Nf3)
  // and its own nested variation (2. Nc3).
  const popupNode = ctrl.popupNodeAt(0);
  expect(popupNode.children).toHaveLength(2);
  const nestedVariation = popupNode.children[1]; // 2. Nc3

  ctrl.openVariationPopup(nestedVariation.data.path);

  expect(ctrl.variationPopups).toHaveLength(2);
  expect(ctrl.variationPopups[1].path.equals(nestedVariation.data.path)).toBe(true);
  // Popup 0 is unaffected by opening popup 1.
  expect(ctrl.variationPopups[0].path.equals(c5Node.data.path)).toBe(true);
});

test('popupGoTo navigates within a popup independently of the main path and other popups', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path);
  const c5Node = ctrl.curNode().children[1];
  ctrl.openVariationPopup(c5Node.data.path);

  ctrl.popupGoTo(0, 'next'); // c5 -> 2. Nf3 (this variation's own mainline)

  const expectedNext = ctrl.game.nodeAt(c5Node.data.path)?.children[0].data.path;
  expect(ctrl.variationPopups[0].path.equals(expectedNext!)).toBe(true);
  expect(ctrl.path.equals(ctrl.game.mainline[0].path)).toBe(true); // main path still untouched
});

test('closing a popup also closes any popups opened on top of it', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path);
  const c5Node = ctrl.curNode().children[1];
  ctrl.openVariationPopup(c5Node.data.path);
  const nestedVariation = ctrl.popupNodeAt(0).children[1];
  ctrl.openVariationPopup(nestedVariation.data.path);

  expect(ctrl.variationPopups).toHaveLength(2);
  ctrl.closeVariationPopupsFrom(0);
  expect(ctrl.variationPopups).toHaveLength(0);
});

test('navigating the main path closes all open popups', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path);
  const c5Node = ctrl.curNode().children[1];
  ctrl.openVariationPopup(c5Node.data.path);
  expect(ctrl.variationPopups).toHaveLength(1);

  ctrl.toPath(ctrl.game.mainline[1].path);

  expect(ctrl.variationPopups).toHaveLength(0);
});

test('a popup cannot rewind past the start of its own variation', async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path); // after 1. e4
  const c5Node = ctrl.curNode().children[1]; // 1... c5
  ctrl.openVariationPopup(c5Node.data.path);

  // Step forward once, then try to rewind twice — the second "prev" would
  // otherwise walk past c5 into the outer game's own history (1. e4).
  ctrl.popupGoTo(0, 'next'); // c5 -> 2. Nf3
  expect(ctrl.canPopupGoTo(0, 'prev')).toBe(true);
  ctrl.popupGoTo(0, 'prev'); // back to c5 (the popup's own root)
  expect(ctrl.variationPopups[0].path.equals(c5Node.data.path)).toBe(true);

  expect(ctrl.canPopupGoTo(0, 'prev')).toBe(false);
  ctrl.popupGoTo(0, 'prev'); // should be a no-op
  expect(ctrl.variationPopups[0].path.equals(c5Node.data.path)).toBe(true);
});

test("a popup's 'first' button goes to its own root, not the game start", async () => {
  const { ctrl } = await setup();
  ctrl.toPath(ctrl.game.mainline[0].path);
  const c5Node = ctrl.curNode().children[1];
  ctrl.openVariationPopup(c5Node.data.path);
  ctrl.popupGoTo(0, 'next');

  ctrl.popupGoTo(0, 'first');

  expect(ctrl.variationPopups[0].path.equals(c5Node.data.path)).toBe(true);
});
