/**
 * Walks a copy object (English and the current language's hard-coded version
 * side by side) and lets the translations table override each string.
 *
 * `tText(english, amharicFallback)` returns the team's edited Amharic (or the
 * hard-coded Amharic when no row matches), so every Admin → Language Settings
 * edit shows up on the public site without a key per sentence.
 */
export function localiseCopy(english, current, tText) {
  const walk = (en, target) => {
    if (typeof en === "string") {
      return tText(en, typeof target === "string" ? target : en);
    }
    if (Array.isArray(en)) {
      return en.map((item, index) =>
        walk(item, Array.isArray(target) ? target[index] : item)
      );
    }
    if (en && typeof en === "object") {
      const result = {};
      for (const key of Object.keys(en)) {
        result[key] = walk(en[key], target ? target[key] : undefined);
      }
      return result;
    }
    return target ?? en;
  };

  return walk(english, current);
}
