import { attributesModule, classModule, init } from 'snabbdom';

import config from './config';
import { type Opts } from './interfaces';
import PgnViewer from './pgnViewer';
import view from './view/main';

export default function start(element: HTMLElement, cfg: Partial<Opts>): PgnViewer {
  const patch = init([classModule, attributesModule]);

  const opts = config(element, cfg);

  const ctrl = new PgnViewer(opts, redraw);

  const blueprint = view(ctrl);
  element.innerHTML = '';
  let vnode = patch(element, blueprint);
  ctrl.div = vnode.elm as HTMLElement;

  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }

  return ctrl;
}
