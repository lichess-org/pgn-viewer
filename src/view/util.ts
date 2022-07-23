import { Hooks } from 'snabbdom';
import { BaseNode, MoveNode } from '../interfaces';

export function bindMobileMousedown(el: HTMLElement, f: (e: Event) => unknown, redraw?: () => void): void {
  for (const mousedownEvent of ['touchstart', 'mousedown']) {
    el.addEventListener(
      mousedownEvent,
      e => {
        f(e);
        e.preventDefault();
        if (redraw) redraw();
      },
      { passive: false }
    );
  }
}

export const bindNonPassive = <E extends Event>(eventName: string, f: (e: E) => any, redraw?: () => void): Hooks =>
  bind(eventName, f, redraw, false);

export const bind = <E extends Event>(
  eventName: string,
  f: (e: E) => any,
  redraw?: () => void,
  passive = true
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
      { passive }
    )
  );

export function onInsert<A extends HTMLElement>(f: (element: A) => void): Hooks {
  return {
    insert: vnode => f(vnode.elm as A),
  };
}

export function stepwiseScroll(inner: (e: WheelEvent, scroll: boolean) => void): (e: WheelEvent) => void {
  let scrollTotal = 0;
  return (e: WheelEvent) => {
    scrollTotal += e.deltaY * (e.deltaMode ? 40 : 1);
    if (Math.abs(scrollTotal) >= 4) {
      inner(e, true);
      scrollTotal = 0;
    } else {
      inner(e, false);
    }
  };
}

export function eventRepeater(action: () => void, e: Event) {
  const repeat = () => {
    action();
    delay = Math.max(100, delay - delay / 15);
    timeout = setTimeout(repeat, delay);
  };
  let delay = 350;
  let timeout = setTimeout(repeat, 500);
  action();
  const eventName = e.type == 'touchstart' ? 'touchend' : 'mouseup';
  document.addEventListener(eventName, () => clearTimeout(timeout), { once: true });
}

export const isMoveNode = (n: BaseNode): n is MoveNode => 'uci' in n;
