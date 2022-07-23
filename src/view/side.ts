import { h, VNode } from 'snabbdom';
import Ctrl from '../ctrl';
import { Ply, MoveData } from '../interfaces';
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
  const nodes: VNode[] = [];
  ctrl.game.mainline.forEach(move => {
    if (move.ply % 2 == 1) nodes.push(h('index', (move.ply - 1) / 2 + 1));
    nodes.push(moveDom(move));
  });
  return nodes;
};

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
