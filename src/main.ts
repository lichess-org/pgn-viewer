import Ctrl from './ctrl';
import view from './view/main';
import { init, attributesModule, classModule } from 'snabbdom';
import { Opts, GoTo } from './interfaces';
import config from './config';

export default function start(element: HTMLElement, cfg: Partial<Opts>) {
  const patch = init([classModule, attributesModule]);

  const opts = config(cfg);

  const ctrl = new Ctrl(opts, redraw);
  ['first', 'last', 'next', 'prev', 'flip'].map( goto => {
    element.addEventListener(goto, ctrl.goTo.bind(ctrl, goto as GoTo));
  });
  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
}
