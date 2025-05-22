export function shellEscape(str: string): string {
  if (str === '') {
    return "''";
  }
  return `${str.replace(/'/g, `'\\''`)}`;
}
