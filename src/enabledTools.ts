/**
 * Tool activation allowlist.
 *
 * An operator activates/deactivates tools purely via the
 * BAMBOO_ENABLED_TOOLS env (comma/space-separated tool names) — no code
 * change. Unset/empty → all tools register (backward compatible). Useful to
 * keep tools whose BambooHR OAuth scope wasn't granted switched off, so the
 * agent is never offered a tool that would 403.
 */
export function resolveEnabledTools(
  raw: string | undefined,
  all: readonly string[],
): { enabled: string[]; unknown: string[] } {
  const requested = (raw ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) return { enabled: [...all], unknown: [] };
  const allSet = new Set(all);
  return {
    enabled: requested.filter((t) => allSet.has(t)),
    unknown: requested.filter((t) => !allSet.has(t)),
  };
}
