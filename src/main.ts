import Ctrl from './ctrl';
import view from './view/main';
import { init, attributesModule, classModule } from 'snabbdom';
import { Opts } from './interfaces';
import config from './config';

export default function start(element: HTMLElement, cfg: Opts) {
  const patch = init([classModule, attributesModule]);

  const opts = config(cfg);

  const ctrl = new Ctrl(opts, redraw);

  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
}
