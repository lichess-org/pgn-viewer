import { Hooks } from 'snabbdom';

export function bindMobileMousedown(el: HTMLElement, f: (e: Event) => unknown, redraw?: () => void): void {
  for (const mousedownEvent of ['touchstart', 'mousedown']) {
    el.addEventListener(
      mousedownEvent,
      e => {
        f(e);
        e.preventDefault();
        if (redraw) redraw();
      },
      { passive: false },
    );
  }
}

export const bind = <E extends Event>(
  eventName: string,
  f: (e: E) => any,
  redraw?: () => void,
  passive = true,
): Hooks =>
  onInsert(el =>
    el.addEventListener(
      eventName,
      e => {
        const res = f(e as E);
        if (res === false) e.preventDefault();
        redraw?.();
        return res;
      },
      { passive },
    ),
  );

export function onInsert<A extends HTMLElement>(f: (element: A) => void): Hooks {
  return {
    insert: vnode => f(vnode.elm as A),
  };
}

export const clockContent = (seconds: number | undefined): string[] => {
  if (!seconds && seconds !== 0) return ['-'];
  const date = new Date(seconds * 1000),
    sep = ':',
    baseStr = pad2(date.getUTCMinutes()) + sep + pad2(date.getUTCSeconds());
  return seconds >= 3600 ? [Math.floor(seconds / 3600) + sep + baseStr] : [baseStr];
};

const pad2 = (num: number): string => (num < 10 ? '0' : '') + num;
