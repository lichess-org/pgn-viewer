import { Color, opposite } from 'chessops';
import { h, VNode } from 'snabbdom';
import PgnViewer from '../pgnViewer';
import { clockContent } from './util';

export default function renderPlayer(ctrl: PgnViewer, side: 'top' | 'bottom'): VNode {
  const color = side == 'bottom' ? ctrl.orientation() : opposite(ctrl.orientation());
  const player = ctrl.game.players[color];
  const personEls = [
    player.title ? h('span.lpv__player__title', player.title) : undefined,
    h('span.lpv__player__name', player.name),
    player.rating ? h('span.lpv__player__rating', ['(', player.rating, ')']) : undefined,
  ];
  return h(`div.lpv__player.lpv__player--${side}`, [
    player.isLichessUser
      ? h(
          'a.lpv__player__person.ulpt.user-link',
          { 
            attrs: { 
              href: `${ctrl.opts.lichess}/@/${player.name}`,
              'aria-label': ctrl.translate('aria.viewProfileOnLichess', player.name || ''),
            }
          },
          personEls,
        )
      : h('span.lpv__player__person', personEls),
    ctrl.opts.showClocks ? renderClock(ctrl, color) : undefined,
  ]);
}

const renderClock = (ctrl: PgnViewer, color: Color): VNode | undefined => {
  const move = ctrl.curData();
  const clock = move.clocks && move.clocks[color];
  return typeof clock == undefined
    ? undefined
    : h('div.lpv__player__clock', { 
        class: { active: color == move.turn },
        attrs: {
          role: 'timer',
          'aria-label': clockContent(clock).join(''),
        }
      }, clockContent(clock));
};

