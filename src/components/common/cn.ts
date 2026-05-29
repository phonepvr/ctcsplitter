/** Tiny class-name joiner (avoids pulling in a dependency). */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');
