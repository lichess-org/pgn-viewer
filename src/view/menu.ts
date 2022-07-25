import { h } from 'snabbdom';
import Ctrl from '../ctrl';
import { bind, bindMobileMousedown, eventRepeater, onInsert } from './util';

export const renderMenu = (ctrl: Ctrl) =>
  h('div.lpv__menu.lpv__pane', [
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
    h(
      'button.lpv__menu__entry.lpv__menu__pgn.lpv__fbt',
      {
        hook: bind('click', ctrl.togglePgn),
      },
      ctrl.translate('viewDownloadPgn')
    ),
  ]);

export const renderControls = (ctrl: Ctrl) =>
  h('div.lpv__controls', [
    dirButton('backward', ctrl, -1),
    h(
      'button.lpv__fbt.lpv__controls__menu',
      {
        class: { active: ctrl.pane != 'board' },
        hook: bind('click', ctrl.toggleMenu),
      },
      ctrl.pane == 'board' ? '⋮' : 'X'
    ),
    dirButton('forward', ctrl, 1),
  ]);

const dirButton = (name: string, ctrl: Ctrl, dir: -1 | 1) =>
  h(`button.lpv__controls__${name}.lpv__fbt`, {
    class: { disabled: ctrl.pane == 'board' && !ctrl.canOnward(dir) },
    hook: onInsert(el => bindMobileMousedown(el, e => eventRepeater(() => ctrl.onward(dir), e))),
  });
