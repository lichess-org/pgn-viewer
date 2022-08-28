import Ctrl from './ctrl';

const lpvs = new Set<Ctrl>();
let viewTarget: Ctrl | undefined;

initEventHandlers();

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

export function addCtrl(ctrl: Ctrl) {
  lpvs.add(ctrl);
  adjustViewTarget(); // after all lpvs are added, we only do this again after scrolling.
}

function initEventHandlers() {
  let scrollTimeout = 0;
  const debouncer = () => {
    if (scrollTimeout) window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(adjustViewTarget, 125);
  };
  window.visualViewport.addEventListener('scroll', debouncer);
  window.visualViewport.addEventListener('resize', debouncer);
  document.addEventListener('keydown', onKeyDown);
}

function suppressKeyNavOn(e: KeyboardEvent): boolean {
  const ae = document.activeElement;
  if (
    !viewTarget ||
    e.getModifierState('Shift') ||
    e.getModifierState('Alt') ||
    e.getModifierState('Control') ||
    e.getModifierState('Meta')
  )
    return true;
  else if (ae instanceof HTMLInputElement)
    switch ((ae as HTMLInputElement).type) {
      case 'button':
      case 'checkbox':
      case 'color':
      case 'image':
      case 'radio':
      case 'submit':
      case 'file':
        return false;
      default:
        return true;
    }
  else return ae instanceof HTMLTextAreaElement;
}

function onKeyDown(e: KeyboardEvent) {
  if (suppressKeyNavOn(e)) return;
  else if (e.key == 'ArrowLeft') viewTarget?.goTo('prev');
  else if (e.key == 'ArrowRight') viewTarget?.goTo('next');
  else if (e.key == 'f' && !(document.activeElement instanceof HTMLSelectElement)) viewTarget?.flip();
}

function adjustViewTarget() {
  let largestOnscreenLpvHeight = 0;
  viewTarget = undefined;
  lpvs.forEach((v: Ctrl) => {
    const r = v.div!.getBoundingClientRect();
    const onscreenLpvHeight = Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top);
    if (onscreenLpvHeight > largestOnscreenLpvHeight) {
      largestOnscreenLpvHeight = onscreenLpvHeight;
      viewTarget = v;
    }
  });
}
