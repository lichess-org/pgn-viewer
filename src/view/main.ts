import Ctrl from '../ctrl';
import { Chessground } from 'chessground';
import { Config as CgConfig } from 'chessground/config';
import { h, VNode } from 'snabbdom';
import { bindNonPassive, stepwiseScroll } from '../util';
import { renderMenu, renderControls } from './menu';
import { renderMoves } from './side';

export default function view(ctrl: Ctrl) {
  return ctrl.menu ? renderMenu(ctrl) : renderReplay(ctrl);
}

const renderReplay = (ctrl: Ctrl): VNode =>
  h('div.lpv.lpv--replay', [
    renderBoard(ctrl),
    renderControls(ctrl),
    ctrl.opts.showMoves ? renderMoves(ctrl) : undefined,
  ]);

const renderBoard = (ctrl: Ctrl): VNode =>
  h(
    'div.lpv__board',
    {
      hook: wheelScroll(ctrl),
    },
    h('div.cg-wrap', {
      hook: {
        insert: vnode => (ctrl.ground = Chessground(vnode.elm as HTMLElement, makeConfig(ctrl))),
      },
    })
  );

const wheelScroll = (ctrl: Ctrl) =>
  'ontouchstart' in window || !ctrl.opts.scrollToMove
    ? undefined
    : bindNonPassive(
        'wheel',
        stepwiseScroll((e: WheelEvent, scroll: boolean) => {
          e.preventDefault();
          if (e.deltaY > 0 && scroll) ctrl.onward(1);
          else if (e.deltaY < 0 && scroll) ctrl.onward(-1);
        })
      );

export const makeConfig = (ctrl: Ctrl): CgConfig => ({
  viewOnly: true,
  addDimensionsCssVars: true,
  drawable: {
    enabled: false,
    visible: false,
  },
  ...ctrl.cgConfig(),
});
