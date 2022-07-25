import { opposite } from 'chessops';
import { h, VNode } from 'snabbdom';
import Ctrl from '../ctrl';

export default function renderPlayer(ctrl: Ctrl, side: 'top' | 'bottom'): VNode {
  const color = side == 'bottom' ? ctrl.orientation() : opposite(ctrl.orientation());
  const player = ctrl.game.players[color];
  return h(`div.lpv__player.lpv__player--${side}`, [
    h('div.lpv__player__person', [
      player.title ? h('div.lpv__player__title', player.title) : undefined,
      h('div.lpv__player__name', player.name),
      player.rating ? h('div.lpv__player__rating', ['(', player.rating, ')']) : undefined,
    ]),
  ]);
}
