import { Color, opposite } from 'chessops';
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
    ctrl.opts.showClocks ? renderClock(ctrl, color) : undefined,
  ]);
}

const renderClock = (ctrl: Ctrl, color: Color): VNode | undefined => {
  const move = ctrl.curData();
  const clock = move.clocks && move.clocks[color];
  return typeof clock == undefined
    ? undefined
    : h('div.lpv__player__clock', { class: { active: color == move.turn } }, clockContent(clock));
};

const clockContent = (seconds: number | undefined): string[] => {
  if (!seconds && seconds !== 0) return ['-'];
  const date = new Date(seconds * 1000),
    sep = ':',
    baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
  return seconds >= 3600 ? [Math.floor(seconds / 3600) + sep + baseStr] : [baseStr];
};

const pad2 = (num: number): string => (num < 10 ? '0' : '') + num;
