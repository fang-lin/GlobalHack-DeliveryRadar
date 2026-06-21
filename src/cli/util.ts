/** Shared CLI helpers (edge layer). */
export function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}
