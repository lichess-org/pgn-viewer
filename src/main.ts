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
};

export default function start(element: HTMLElement, cfg: Partial<Opts>) {
  const patch = init([classModule, attributesModule]);

  const opts: Opts = { ...defaults, ...cfg };

  const ctrl = new Ctrl(opts, redraw);

  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
}
