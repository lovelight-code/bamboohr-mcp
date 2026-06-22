# bamboohr-mcp

A **read-only** [Model Context Protocol](https://modelcontextprotocol.io) server
for BambooHR, maintained by Lovelight for the Lighthouse platform.

This is a fork of [evrimalacan/mcp-bamboohr](https://github.com/evrimalacan/mcp-bamboohr)
(MIT). See [NOTICE](NOTICE) for attribution and the full list of changes.

## Why this fork

Lighthouse exposes BambooHR to a per-user AI assistant. BambooHR is
sensitive HR data, so the design priorities are: **read-only by
construction**, **least privilege**, and **the workspace process holds no
credential**. The upstream server is a clean, well-tested base; this fork
hardens it for that posture:

- **Read-only by construction.** The HTTP client exposes only `get`/`getBuffer`
  — `post`/`put`/`delete` were removed, so no write tool can be added by
  accident. Every registered MCP tool is a `GET`.
- **Proxy-ready, credential-free.** Set `BAMBOO_BASE_URL` to a loopback
  token-proxy and the server sends **no** `Authorization` header — the proxy
  injects a fresh OAuth Bearer per request. The BambooHR credential never
  lives in this process.
- **Injectable config.** The credential is resolved in `config.ts` and passed
  into the client, not hardwired into a boot-time singleton — so a future
  multi-tenant/remote host can construct a per-request client without
  touching the tool layer.

## Configuration

Two shapes (see [.env.example](.env.example)):

**Proxied (the Lighthouse posture) — recommended for shared/sensitive use:**

```jsonc
{
  "mcpServers": {
    "bamboohr": {
      "command": "node",
      "args": ["build/index.js"],
      "type": "stdio",
      "env": {
        // A loopback proxy injects Authorization; no token here.
        "BAMBOO_BASE_URL": "http://127.0.0.1:7339"
      }
    }
  }
}
```

**Direct (a local/desktop setup with your own API key):**

```jsonc
{
  "mcpServers": {
    "bamboohr": {
      "command": "node",
      "args": ["build/index.js"],
      "type": "stdio",
      "env": {
        "BAMBOO_API_TOKEN": "your_api_token",
        "BAMBOO_COMPANY_DOMAIN": "your_company_subdomain"
      }
    }
  }
}
```

## Tools (all read-only)

| Tool | Purpose |
| --- | --- |
| `get-employee` | Employee record with selectable fields |
| `get-employee-photo` | Employee photo by size |
| `get-employee-directory` | Company-wide directory |
| `get-employee-goals` | Performance goals for an employee |
| `estimate-time-off-balance` | Projected time-off balances |
| `get-time-off-requests` | Time-off requests (filterable) |
| `get-whos-out` | Upcoming time off + holidays |
| `list-company-files` | Browse company files/categories (metadata) |
| `get-company-file` | Download a company document by id |
| `get-meta-fields` | Discover available BambooHR data fields |

> **Egress note.** Some tools (directory, file download) can return large
> volumes of PII. In the Lighthouse deployment, row/size caps and field
> scoping are enforced at the loopback proxy in front of this server, not
> in the tool layer — keep that boundary if you redeploy elsewhere.

## Development

```bash
npm install
npm run build
npm test
npm run dev      # watch mode
```

TypeScript (strict), ESM, Node ≥22. Tests run under Jest.

## Scope

Read-only data access only. There are deliberately no write tools. Adding any
write capability is an explicit decision (it would change the security
posture and, in Lighthouse, requires an ADR) — not a casual PR.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
