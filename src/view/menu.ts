import { h } from 'snabbdom';
import PgnViewer from '../pgnViewer';
import { GoTo } from '../interfaces';
import { bind, bindMobileMousedown, onInsert } from './util';
import { eventRepeater } from '../events';

export const renderMenu = (ctrl: PgnViewer) =>
  h(
    'div.lpv__menu.lpv__pane',
    {
      attrs: {
        role: 'menu',
        'aria-label': ctrl.translate('menu') ?? 'Menu',
      },
      hook: {
        insert: vnode => {
          const menuEl = vnode.elm as HTMLElement;
          // Focus first menu item when menu opens
          const firstItem = menuEl.querySelector<HTMLElement>('[role="menuitem"]');
          firstItem?.focus();

          setupMenuKeyboard(ctrl, menuEl);
        },
      },
    },
    [
      h(
        'button.lpv__menu__entry.lpv__menu__flip.lpv__fbt',
        {
          attrs: { role: 'menuitem' },
          hook: bind('click', ctrl.flip),
        },
        ctrl.translate('flipTheBoard'),
      ),
      ctrl.opts.menu.analysisBoard?.enabled
        ? h(
            'a.lpv__menu__entry.lpv__menu__analysis.lpv__fbt',
            {
              attrs: {
                role: 'menuitem',
                href: ctrl.analysisUrl(),
                target: '_blank',
                'aria-label': `${ctrl.translate('analysisBoard')}, link, opens in new tab`,
              },
            },
            ctrl.translate('analysisBoard'),
          )
        : undefined,
      ctrl.opts.menu.practiceWithComputer?.enabled
        ? h(
            'a.lpv__menu__entry.lpv__menu__practice.lpv__fbt',
            {
              attrs: {
                role: 'menuitem',
                href: ctrl.practiceUrl(),
                target: '_blank',
                'aria-label': `${ctrl.translate('practiceWithComputer')}, link, opens in new tab`,
              },
            },
            ctrl.translate('practiceWithComputer'),
          )
        : undefined,
      ctrl.opts.menu.getPgn.enabled
        ? h(
            'button.lpv__menu__entry.lpv__menu__pgn.lpv__fbt',
            {
              attrs: { role: 'menuitem' },
              hook: bind('click', ctrl.togglePgn),
            },
            ctrl.translate('getPgn'),
          )
        : undefined,
      renderExternalLink(ctrl),
    ],
  );

const renderExternalLink = (ctrl: PgnViewer) => {
  const link = ctrl.game.metadata.externalLink;
  const linkText = ctrl.translate(ctrl.game.metadata.isLichess ? 'viewOnLichess' : 'viewOnSite');
  return (
    link &&
    h(
      'a.lpv__menu__entry.lpv__fbt',
      {
        attrs: {
          role: 'menuitem',
          href: link,
          target: '_blank',
          'aria-label': `${linkText}, link, opens in new tab`,
        },
      },
      linkText,
    )
  );
};

export const renderControls = (ctrl: PgnViewer) =>
  h('div.lpv__controls', {
    attrs: {
      role: 'navigation',
      'aria-label': 'Game navigation controls',
    },
  }, [
    ctrl.pane == 'board' ? undefined : dirButton(ctrl, 'first', 'step-backward'),
    dirButton(ctrl, 'prev', 'left-open'),
    h(
      'button.lpv__fbt.lpv__controls__menu.lpv__icon',
      {
        class: {
          active: ctrl.pane != 'board',
          'lpv__icon-ellipsis-vert': ctrl.pane == 'board',
        },
        hook: {
          insert: vnode => {
            const el = vnode.elm as HTMLElement;
            el.addEventListener('click', ctrl.toggleMenu);
            // Store reference for focus management
            ctrl.menuButton = el;
          },
        },
        attrs: {
          'aria-label': ctrl.translate('menu') ?? 'Menu',
          'aria-expanded': String(ctrl.pane === 'menu'),
          'aria-haspopup': 'menu',
        },
      },
      ctrl.pane == 'board' ? undefined : 'X',
    ),
    dirButton(ctrl, 'next', 'right-open'),
    ctrl.pane == 'board' ? undefined : dirButton(ctrl, 'last', 'step-forward'),
  ]);

const dirButton = (ctrl: PgnViewer, to: GoTo, icon: string) => {
  const isDisabled = ctrl.pane == 'board' && !ctrl.canGoTo(to);
  return h(`button.lpv__controls__goto.lpv__controls__goto--${to}.lpv__fbt.lpv__icon.lpv__icon-${icon}`, {
    class: { disabled: isDisabled },
    hook: onInsert(el => bindMobileMousedown(el, e => eventRepeater(() => ctrl.goTo(to), e))),
    attrs: {
      'aria-label': ctrl.translate(to) ?? to,
      'aria-disabled': String(isDisabled),
      disabled: isDisabled,
    },
  });
};

const setupMenuKeyboard = (ctrl: PgnViewer, menuEl: HTMLElement) => {
  const handleMenuKeydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
        break;

      case 'Escape':
        e.preventDefault();
        ctrl.toggleMenu();
        break;
    }
  };

  menuEl.addEventListener('keydown', handleMenuKeydown);
};
