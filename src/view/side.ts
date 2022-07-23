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
        hook: bind<MouseEvent>('mousedown', e => {
          const path = (e.target as HTMLElement).getAttribute('p');
          if (path) ctrl.toPath(new Path(path));
        }),
      },
      makeMoveNodes(ctrl)
    )
  );

const makeMoveNodes = (ctrl: Ctrl): Array<VNode | undefined> => {
  const moveDom = renderMove(ctrl);
  const elms: VNode[] = [];
  let node: MoveNode,
    variations: MoveNode[] = ctrl.game.moves.children.slice(1);
  while ((node = (node ? node : ctrl.game.moves).children[0])) {
    const move = node.data;
    if (move.ply % 2 == 1) elms.push(h('index', moveTurn(move)));
    elms.push(moveDom(move));
    if (variations.length) {
      if (move.ply % 2 == 1) elms.push(h('move.empty', '...'));
      variations.forEach(variation => elms.push(makeMainVariation(moveDom, variation)));
      if (move.ply % 2 == 1) {
        elms.push(h('index', (move.ply - 1) / 2 + 1));
        elms.push(h('move.empty', '...'));
      }
    }
    variations = node.children.slice(1);
  }
  return elms;
};

const makeMainVariation = (moveDom: MoveToDom, node: MoveNode) => h('variation', makeVariationMoves(moveDom, node));

const makeVariationMoves = (moveDom: MoveToDom, node: MoveNode) => {
  const elms: VNode[] = [];
  // let node: MoveNode,
  //   variations: MoveNode[] = node.children.slice(1);
  if (node.data.ply % 2 == 0) elms.push(h('index', [moveTurn(node.data), '...']));
  do {
    const move = node.data;
    if (move.ply % 2 == 1) elms.push(h('index', moveTurn(move)));
    elms.push(moveDom(move));
    // if (variations.length) {
    //   if (move.ply % 2 == 1) elms.push(h('move.empty', '...'));
    //   variations.forEach(variation => elms.push(makeMainVariation(variation)));
    //   if (move.ply % 2 == 1) {
    //     elms.push(h('index', (move.ply - 1) / 2 + 1));
    //     elms.push(h('move.empty', '...'));
    //   }
    // }
    node = node.children[0];
  } while (node);
  return elms;
};

type MoveToDom = (move: MoveData) => VNode;

const moveTurn = (move: MoveData) => Math.floor((move.ply - 1) / 2) + 1;

const renderMove = (ctrl: Ctrl) => (move: MoveData) =>
  h(
    'move',
    {
      class: {
        current: move.path.equals(ctrl.path),
      },
      attrs: {
        p: move.path.path,
      },
    },
    move.san
  );
