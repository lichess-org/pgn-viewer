import { h, type VNode } from 'snabbdom';

import { type MoveNode } from '../game';
import { type MoveData, type Translate } from '../interfaces';
import { Path } from '../path';
import type PgnViewer from '../pgnViewer';

import { ariaHidden, presentation } from './aria';
import { renderNag } from './glyph';
import { formatMoveForScreenReader } from './util';

export const renderMoves = (ctrl: PgnViewer) =>
  h('div.lpv__side', [
    h(
      'div.lpv__moves',
      {
        attrs: {
          role: 'complementary',
          'aria-label': ctrl.translate('aria.gameMoves'),
        },
        hook: {
          insert: vnode => {
            const el = vnode.elm as HTMLElement;
            if (!ctrl.path.empty()) autoScroll(ctrl, el);
            el.addEventListener(
              'click',
              e => {
                const path = (e.target as HTMLElement).getAttribute('data-path');
                if (path) ctrl.toPath(new Path(path));
              },
              { passive: true },
            );
          },
          postpatch: (_, vnode) => {
            if (ctrl.autoScrollRequested) {
              autoScroll(ctrl, vnode.elm as HTMLElement);
              ctrl.autoScrollRequested = false;
            }
          },
        },
      },
      [
        ...(ctrl.opts.showVariations ? ctrl.game.initial.comments.map(commentNode) : []),
        ...makeMoveNodes(ctrl),
        ...renderResultComment(ctrl),
      ],
    ),
  ]);

const renderResultComment = (ctrl: PgnViewer) => {
  const res = ctrl.game.metadata.result;
  return res && res !== '*'
    ? [
        h(
          'comment.result',
          { attrs: { role: 'note', 'aria-label': ctrl.translate('aria.gameResult') } },
          ctrl.game.metadata.result,
        ),
      ]
    : [];
};

const indexNode = (turn: number) => h('index', { attrs: presentation }, `${turn}.`);
const emptyMove = () => h('button.move.empty', { attrs: { 'aria-hidden': 'true', disabled: true } }, '...');
const commentNode = (comment: string) => h('comment', { attrs: { role: 'note' } }, comment);
const parenOpen = () => h('paren.open', { attrs: ariaHidden }, '(');
const parenClose = () => h('paren.close', { attrs: ariaHidden }, ')');
const moveTurn = (move: MoveData) => Math.floor((move.ply - 1) / 2) + 1;

const makeMoveNodes = (ctrl: PgnViewer): Array<VNode | undefined> =>
  ctrl.opts.showVariations ? makeFullMoveNodes(ctrl) : makeSimplifiedMoveNodes(ctrl);

// Full rendering: variations and per-move comments appear inline, recursively,
// the way upstream lichess-pgn-viewer always has.
const makeFullMoveNodes = (ctrl: PgnViewer): Array<VNode | undefined> => {
  const moveDom = renderMove(ctrl);
  const elms: VNode[] = [];
  let node: MoveNode | undefined,
    variations: MoveNode[] = ctrl.game.moves.children.slice(1);
  if (ctrl.game.initial.pos.turn === 'black' && ctrl.game.mainline[0])
    elms.push(indexNode(ctrl.game.initial.pos.fullmoves), emptyMove());
  while ((node = (node || ctrl.game.moves).children[0])) {
    const move = node.data;
    const oddMove = move.ply % 2 === 1;
    if (oddMove) elms.push(indexNode(moveTurn(move)));
    elms.push(moveDom(move));
    const addEmptyMove = oddMove && (variations.length || move.comments.length) && node.children.length;
    if (addEmptyMove) elms.push(emptyMove());
    move.comments.forEach(comment => elms.push(commentNode(comment)));
    variations.forEach(variation => elms.push(makeMainVariation(ctrl.translate, moveDom, variation)));
    if (addEmptyMove) elms.push(indexNode(moveTurn(move)), emptyMove());
    variations = node.children.slice(1);
  }
  return elms;
};

type MoveToDom = (move: MoveData) => VNode;

const makeMainVariation = (translate: Translate, moveDom: MoveToDom, node: MoveNode) =>
  h(
    'variation',
    { attrs: { role: 'group', 'aria-label': translate('aria.variation') } },
    makeVariationMoves(moveDom, node),
  );

const makeVariationMoves = (moveDom: MoveToDom, node: MoveNode) => {
  let elms: VNode[] = [];
  let variations: MoveNode[] = [];
  let firstMove = true;
  do {
    const move = node.data;
    move.startingComments.forEach(comment => elms.push(commentNode(comment)));
    if (firstMove && move.ply % 2 === 0)
      elms.push(h('index', { attrs: presentation }, [moveTurn(move), '...']));
    if (move.ply % 2 === 1) elms.push(h('index', { attrs: presentation }, [moveTurn(move), '.']));
    elms.push(moveDom(move));
    move.comments.forEach(comment => elms.push(commentNode(comment)));
    variations.forEach(variation => {
      elms = [...elms, parenOpen(), ...makeVariationMoves(moveDom, variation), parenClose()];
    });
    variations = node.children.slice(1);
    node = node.children[0];
    firstMove = false;
  } while (node);
  return elms;
};

// Simplified rendering: deliberately "quiet" — mainline only, no inline
// variations, no inline comments. Variations are reached via the board's
// variation arrows instead (see view/arrows.ts), and the current move's own
// comment gets a dedicated, prominent home (see view/commentary.ts) rather
// than being interleaved here move-by-move.
const makeSimplifiedMoveNodes = (ctrl: PgnViewer): Array<VNode | undefined> => {
  const moveDom = renderMove(ctrl);
  const elms: VNode[] = [];
  let node: MoveNode | undefined;
  if (ctrl.game.initial.pos.turn === 'black' && ctrl.game.mainline[0])
    elms.push(indexNode(ctrl.game.initial.pos.fullmoves), emptyMove());
  while ((node = (node || ctrl.game.moves).children[0])) {
    const move = node.data;
    if (move.ply % 2 === 1) elms.push(indexNode(moveTurn(move)));
    elms.push(moveDom(move));
  }
  return elms;
};

const renderMove = (ctrl: PgnViewer) => (move: MoveData) =>
  h(
    'button.move',
    {
      class: {
        current: ctrl.path.equals(move.path),
        ancestor: ctrl.path.contains(move.path),
        good: move.nags.includes(1),
        mistake: move.nags.includes(2),
        brilliant: move.nags.includes(3),
        blunder: move.nags.includes(4),
        interesting: move.nags.includes(5),
        inaccuracy: move.nags.includes(6),
      },
      attrs: {
        'data-path': move.path.path,
        role: 'button',
        'aria-label': ctrl.translate(
          'aria.move',
          Math.ceil(move.ply / 2).toString(),
          ctrl.translate(`aria.${move.ply % 2 === 1 ? 'white' : 'black'}`),
          formatMoveForScreenReader(move.san, move.nags, ctrl.translate),
        ),
      },
    },
    [move.san, ...move.nags.map(renderNag)],
  );

const autoScroll = (ctrl: PgnViewer, cont: HTMLElement) => {
  const target = cont.querySelector<HTMLElement>('.current');
  if (!target) {
    cont.scrollTop = ctrl.path.empty() ? 0 : 99_999;
    return;
  }
  cont.scrollTop = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight;
};
