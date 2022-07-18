import Ctrl from './ctrl';
import { Chessground } from 'chessground';
import { Config as CgConfig } from 'chessground/config';
import { h, VNode } from 'snabbdom';
import { bind, bindMobileMousedown, bindNonPassive, eventRepeater, onInsert, stepwiseScroll } from './util';

export default function view(ctrl: Ctrl) {
  return ctrl.menu ? renderMenu(ctrl) : h('div.lpv.lpv--board', [renderBoard(ctrl), renderControls(ctrl)]);
}

const renderMenu = (ctrl: Ctrl) =>
  h('div.lpv.lpv--menu', [
    h(
      'div.lpv__menu',
      h('div.lpv__menu__inner', [
        h(
          'button.lpv__menu__entry.lpv__menu__flip.lpv__fbt',
          {
            hook: bind('click', ctrl.flip),
          },
          ctrl.translate('flipTheBoard')
        ),
        h(
          'a.lpv__menu__entry.lpv__menu__analysis.lpv__fbt',
          {
            attrs: {
              href: ctrl.analysisUrl(),
              target: '_blank',
            },
          },
          ctrl.translate('analysisBoard')
        ),
        h(
          'a.lpv__menu__entry.lpv__menu__practice.lpv__fbt',
          {
            attrs: {
              href: ctrl.practiceUrl(),
              target: '_blank',
            },
          },
          ctrl.translate('practiceWithComputer')
        ),
      ])
    ),
    renderControls(ctrl),
  ]);

const renderControls = (ctrl: Ctrl) =>
  h('div.lpv__controls', [
    dirButton('backward', ctrl.index < 1, ctrl.backward),
    h(
      'button.lpv__fbt.lpv__controls__menu',
      {
        class: { active: ctrl.menu },
        hook: bind('click', ctrl.toggleMenu),
      },
      '⋮'
    ),
    dirButton('forward', ctrl.index > ctrl.nodes.length - 2, ctrl.forward),
  ]);

const dirButton = (name: string, disabled: boolean, action: () => void) =>
  h(`button.lpv__controls__${name}.lpv__fbt`, {
    class: { disabled },
    hook: onInsert(el => bindMobileMousedown(el, e => eventRepeater(action, e))),
  });

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
          if (e.deltaY > 0 && scroll) ctrl.forward();
          else if (e.deltaY < 0 && scroll) ctrl.backward();
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
