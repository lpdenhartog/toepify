/**
 * Shortest unique uppercase prefix per name (D, J, S…; lengthens on collision,
 * e.g. "Da"/"Jo"). Used for the compact player labels on the scoreboard.
 */
export function getUniqueAbbreviations(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const lengths = new Map<string, number>();

  for (const name of names) {
    lengths.set(name, 1);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const abbrevToNames = new Map<string, string[]>();

    for (const name of names) {
      const len = lengths.get(name)!;
      const abbrev = name.slice(0, len).toUpperCase();
      if (!abbrevToNames.has(abbrev)) abbrevToNames.set(abbrev, []);
      abbrevToNames.get(abbrev)!.push(name);
    }

    for (const [, group] of abbrevToNames) {
      if (group.length > 1) {
        for (const name of group) {
          const cur = lengths.get(name)!;
          if (cur < name.length) {
            lengths.set(name, cur + 1);
            changed = true;
          }
        }
      }
    }
  }

  for (const name of names) {
    result.set(name, name.slice(0, lengths.get(name)!).toUpperCase());
  }
  return result;
}
