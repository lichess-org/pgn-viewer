import Ctrl from './ctrl';
import view from './view/main';
import { init, attributesModule, classModule } from 'snabbdom';
import { Opts } from './interfaces';

const defaults: Opts = {
  pgn: '*',
  showPlayers: true,
  showMoves: true,
  showClocks: true,
  scrollToMove: true,
  orientation: 'white',
  initialPly: 0,
  chessground: {},
  menu: {
    getPgn: {
      enabled: true,
      fileName: undefined,
    },
  },
};

export default function start(element: HTMLElement, cfg: Opts) {
  const patch = init([classModule, attributesModule]);

  const opts = defaults;
  deepMerge(opts, cfg);

  const ctrl = new Ctrl(opts, redraw);

  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
}

function deepMerge(base: any, extend: any): void {
  for (const key in extend) {
    if (isPlainObject(base[key]) && isPlainObject(extend[key])) deepMerge(base[key], extend[key]);
    else base[key] = extend[key];
  }
}

function isPlainObject(o: unknown): boolean {
  if (typeof o !== 'object' || o === null) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}
