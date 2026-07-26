export const movePathFromEventTarget = (target: EventTarget | null): string | undefined => {
  const el = target as HTMLElement | null;
  return el?.closest?.('[data-path]')?.getAttribute('data-path') || undefined;
};
