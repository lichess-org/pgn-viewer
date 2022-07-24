import { h, VNode } from 'snabbdom';
import Ctrl from '../ctrl';
import { MoveNode } from '../game';
import { MoveData } from '../interfaces';
import { Path } from '../path';
import { bind } from './util';

export const renderMoves = (ctrl: Ctrl) =>
  h(
    'div.lpv__side',
    h(
      'div.lpv__moves',
      {
        hook: {
          ...bind<MouseEvent>('mousedown', e => {}),
          insert: vnode => {
            const el = vnode.elm as HTMLElement;
            if (!ctrl.path.empty()) autoScroll(ctrl, el);
            el.addEventListener(
              'mousedown',
              e => {
                const path = (e.target as HTMLElement).getAttribute('p');
                if (path) ctrl.toPath(new Path(path));
              },
              { passive: true }
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
      [...ctrl.game.initial.comments.map(makeComment), ...makeMoveNodes(ctrl)]
    )
  );

const makeMoveNodes = (ctrl: Ctrl): Array<VNode | undefined> => {
  const moveDom = renderMove(ctrl);
  const elms: VNode[] = [];
  let node: MoveNode | undefined,
    variations: MoveNode[] = ctrl.game.moves.children.slice(1);
  while ((node = (node ? node : ctrl.game.moves).children[0])) {
    const move = node.data;
    const oddMove = move.ply % 2 == 1;
    if (oddMove) elms.push(h('index', [moveTurn(move), '.']));
    elms.push(moveDom(move));
    if (oddMove && (variations.length || move.comments.length))
      if (move.ply % 2 == 1) elms.push(h('move.empty', '...'));
    move.comments.forEach(comment => elms.push(makeComment(comment)));
    variations.forEach(variation => elms.push(makeMainVariation(moveDom, variation)));
    if (oddMove && (variations.length || move.comments.length)) {
      elms.push(h('index', [moveTurn(move), '.']));
      elms.push(h('move.empty', '...'));
    }
    variations = node.children.slice(1);
  }
  return elms;
};

const makeComment = (comment: string) => h('comment', comment);

const makeMainVariation = (moveDom: MoveToDom, node: MoveNode) =>
  h('variation', [...node.data.startingComments.map(makeComment), ...makeVariationMoves(moveDom, node)]);

const makeVariationMoves = (moveDom: MoveToDom, node: MoveNode) => {
  let elms: VNode[] = [];
  let variations: MoveNode[] = [];
  if (node.data.ply % 2 == 0) elms.push(h('index', [moveTurn(node.data), '...']));
  do {
    const move = node.data;
    if (move.ply % 2 == 1) elms.push(h('index', [moveTurn(move), '.']));
    elms.push(moveDom(move));
    move.comments.forEach(comment => elms.push(makeComment(comment)));
    variations.forEach(variation => {
      elms = [...elms, ...[parenOpen(), ...makeVariationMoves(moveDom, variation), parenClose()]];
    });
    variations = node.children.slice(1);
    node = node.children[0];
  } while (node);
  return elms;
};

const parenOpen = () => h('paren.open', '(');
const parenClose = () => h('paren.close', ')');

type MoveToDom = (move: MoveData) => VNode;

const moveTurn = (move: MoveData) => Math.floor((move.ply - 1) / 2) + 1;

const renderMove = (ctrl: Ctrl) => (move: MoveData) =>
  h(
    'move',
    {
      class: {
        current: ctrl.path.equals(move.path),
        ancestor: ctrl.path.contains(move.path),
      },
      attrs: {
        p: move.path.path,
      },
    },
    move.san
  );

const autoScroll = (ctrl: Ctrl, cont: HTMLElement) => {
  const target = cont.querySelector<HTMLElement>('.current');
  if (!target) {
    cont.scrollTop = ctrl.path ? 99999 : 0;
    return;
  }
  cont.scrollTop = target.offsetTop - cont.offsetHeight / 2 + target.offsetHeight;
};
