import { config } from 'dotenv';

config();

export interface BambooConfig {
  // null when auth is injected upstream (proxy mode) — see below.
  apiToken: string | null;
  // null when BAMBOO_BASE_URL is set explicitly (the host is no longer
  // derived from the subdomain).
  companyDomain: string | null;
  baseUrl: string;
  debug: boolean;
}

/**
 * Resolve configuration from the environment.
 *
 * Two supported deployment shapes:
 *
 * 1. **Direct** (a local stdio process talking straight to BambooHR):
 *    set `BAMBOO_API_TOKEN` + `BAMBOO_COMPANY_DOMAIN`. The base URL is
 *    derived as `https://{companyDomain}.bamboohr.com/api/v1` and the
 *    client attaches HTTP Basic auth itself.
 *
 * 2. **Proxied / credential-free** (the Lighthouse posture): set
 *    `BAMBOO_BASE_URL` to a loopback token-proxy (e.g.
 *    `http://127.0.0.1:7339`). The proxy injects `Authorization` on every
 *    forwarded request, so this process holds **no credential** and sets
 *    no auth header. `BAMBOO_API_TOKEN` is then optional.
 *
 * Keeping the credential resolution here (rather than hardwired into the
 * client) is deliberate: it lets a future multi-tenant/remote host
 * construct a `BambooHRClient` with a per-request config instead of the
 * process-wide singleton below.
 */
export function loadConfig(): BambooConfig {
  const apiToken = process.env.BAMBOO_API_TOKEN || null;
  const companyDomain = process.env.BAMBOO_COMPANY_DOMAIN || null;
  const baseUrlOverride = process.env.BAMBOO_BASE_URL || null;
  const debug = process.env.DEBUG === 'true';

  let baseUrl: string;
  if (baseUrlOverride) {
    // Explicit override (loopback proxy) wins; strip any trailing slash so
    // endpoint joins stay clean.
    baseUrl = baseUrlOverride.replace(/\/+$/, '');
  } else {
    if (!companyDomain) {
      throw new Error(
        'Set BAMBOO_BASE_URL (e.g. a loopback proxy), or BAMBOO_COMPANY_DOMAIN ' +
          'to derive the default BambooHR API host'
      );
    }
    baseUrl = `https://${companyDomain}.bamboohr.com/api/v1`;
  }

  // A token is required UNLESS a base-URL override is in play, in which case
  // the upstream proxy is expected to inject Authorization and this process
  // stays credential-free.
  if (!apiToken && !baseUrlOverride) {
    throw new Error(
      'Set BAMBOO_API_TOKEN, or set BAMBOO_BASE_URL to a proxy that injects ' +
        'the Authorization header'
    );
  }

  return {
    apiToken,
    companyDomain,
    baseUrl,
    debug,
  };
}

export const bambooConfig = loadConfig();
