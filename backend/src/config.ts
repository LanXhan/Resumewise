// Env vars are always strings. Express treats the number 1 as "trust one proxy hop"
// but the string "1" as a trusted IP address, which silently disables proxy trust.
export function parseTrustProxy(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
if (!trimmed) {
    return undefined;
  }
   if (!trimmed) return undefined;

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`TRUST_PROXY must be a whole number of proxy hops (e.g. 1), got "${value}".`);
  }
  return Number(trimmed);
}
