import Ctrl from '../ctrl';
import { Chessground } from 'chessground';
import { Config as CgConfig } from 'chessground/config';
import { h, VNode } from 'snabbdom';
import { bindNonPassive, onInsert, stepwiseScroll } from './util';
import { renderMenu, renderControls } from './menu';
import { renderMoves } from './side';

export default function view(ctrl: Ctrl) {
  return h(
    'div.lpv',
    {
      class: {
        'lpv--menu': ctrl.menu,
        'lpv--moves': !!ctrl.opts.showMoves,
      },
      hook: onInsert(el => {
        ctrl.ground = Chessground(el.querySelector('.cg-wrap') as HTMLElement, makeConfig(ctrl, el));
      }),
    },
    [
      renderBoard(ctrl),
      renderControls(ctrl),
      ctrl.opts.showMoves ? renderMoves(ctrl) : undefined,
      ctrl.menu ? renderMenu(ctrl) : undefined,
    ]
  );
}

const renderBoard = (ctrl: Ctrl): VNode =>
  h(
    'div.lpv__board',
    {
      hook: wheelScroll(ctrl),
    },
    h('div.cg-wrap')
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

export const makeConfig = (ctrl: Ctrl, rootEl: HTMLElement): CgConfig => ({
  viewOnly: true,
  addDimensionsCssVarsTo: rootEl,
  drawable: {
    enabled: false,
    visible: false,
  },
  ...ctrl.cgConfig(),
});
