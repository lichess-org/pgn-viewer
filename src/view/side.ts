import { h, VNode } from 'snabbdom';
import Ctrl from '../ctrl';
import { Ply, BaseNode, MoveNode } from '../interfaces';

export const renderMoves = (ctrl: Ctrl) => h('div.lpv__moves', makeMoveNodes(ctrl));

const makeMoveNodes = (ctrl: Ctrl): Array<VNode | undefined> => {
  return [];
  // const nodes = ctrl.nodes;
  // const pairs: Array<Array<any>> = [];
  // const indexOffset = Math.trunc(nodes[0]!.ply / 2) + 1;
  // let startAt = 1;
  // if (nodes[0]?.ply % 2 === 1) {
  //   pairs.push([null, nodes[1]]);
  //   startAt = 2;
  // }
  // for (let i = startAt; i < nodes.length; i += 2) pairs.push([nodes[i], nodes[i + 1]]);

  // const els: Array<VNode | undefined> = [],
  //   curPly = ctrl.node()?.ply;
  // for (let i = 0; i < pairs.length; i++) {
  //   const pair = pairs[i];
  //   els.push(h('index', i + indexOffset + ''));
  //   els.push(renderMove(pair[0], curPly, true));
  //   els.push(renderMove(pair[1], curPly, false));
  // }

  // return els;
};

const renderMove = (node: MoveNode | undefined, curPly: Ply, orEmpty: boolean) =>
  node
    ? h(
        'move',
        {
          class: {
            cur: node.ply === curPly,
          },
        },
        node.san[0] === 'P' ? node.san.slice(1) : node.san
      )
    : orEmpty
    ? h('move', '…')
    : undefined;
