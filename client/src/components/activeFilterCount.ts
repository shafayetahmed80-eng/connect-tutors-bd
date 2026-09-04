/**
 * How many filters in a set are actually doing something.
 *
 * Every filter screen in the app spells "not filtering" differently - an empty
 * string here, `"all"` there, `undefined` for a number that was never typed -
 * so the count is comparison against that screen's own defaults rather than a
 * guess about what an idle value looks like.
 *
 * `ignore` is for the keys that are not filters at all. `page` is the obvious
 * one: turning to page three is not a filter, and counting it would put "1
 * active" on a panel nobody has touched.
 */
export function countActiveFilters<T extends Record<string, unknown>>(
  filters: T,
  defaults: T,
  { ignore = [], only }: { ignore?: Array<keyof T>; only?: Array<keyof T> } = {},
): number {
  const keys = (only ?? (Object.keys(defaults) as Array<keyof T>))
    .filter(key => !ignore.includes(key));

  return keys.reduce((count, key) => {
    const value = filters[key];
    const fallback = defaults[key];
    if (value === fallback) return count;
    // A cleared text box and a number nobody typed both read as untouched,
    // whichever empty the screen happens to use.
    if (value === "" || value === undefined || value === null) return count;
    return count + 1;
  }, 0);
}
