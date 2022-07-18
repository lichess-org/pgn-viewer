import Ctrl from './ctrl';
import view from './view';
import { init, attributesModule, classModule } from 'snabbdom';
import { Opts } from './interfaces';
import '../scss/lichess-pgn-viewer.scss';

export default function start(element: Element, opts: Opts) {
  const patch = init([classModule, attributesModule]);

  const ctrl = new Ctrl(opts, redraw);

  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
}
