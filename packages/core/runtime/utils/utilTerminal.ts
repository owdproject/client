export function parseInput(
  input: string,
): { command: string; args: string[] } | null {
  const match = input.match(/(?:[^\s"]+|"[^"]*")+/g)
  if (!match) return null
  return {
    command: match[0],
    args: match.slice(1).map((arg) => arg.replace(/"/g, '')),
  }
}
