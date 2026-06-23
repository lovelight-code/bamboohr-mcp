# bamboohr-mcp

A **read-only** [Model Context Protocol](https://modelcontextprotocol.io) server
for BambooHR.

This is a fork of [evrimalacan/mcp-bamboohr](https://github.com/evrimalacan/mcp-bamboohr)
(MIT). See [NOTICE](NOTICE) for attribution and the full list of changes.

## Why this fork

BambooHR is sensitive HR data, so this fork hardens the upstream server for
exposing it to an AI assistant safely. Design priorities: **read-only by
construction**, **least privilege**, and **the host process holds no
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

**Proxied (recommended for shared / sensitive use):**

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
> volumes of PII. For shared / sensitive deployments, enforce row/size caps
> and field scoping at the proxy in front of this server, rather than
> trusting the tool layer.

## Activating / deactivating tools

Set `BAMBOO_ENABLED_TOOLS` to a comma- or space-separated allowlist to control
which tools register. Unset = all tools. This lets you switch tools on/off by
**config alone** — no code change — which is the clean way to keep tools whose
BambooHR OAuth scope you didn't grant switched off, so the agent is never
offered a tool that would `403`. Unknown names are warned and ignored (never
fail the server). Example (the read-only set covered by directory + employee
name/job/photo + time-off scopes):

```
BAMBOO_ENABLED_TOOLS=get-employee,get-employee-photo,get-employee-directory,estimate-time-off-balance,get-time-off-requests,get-whos-out,get-meta-fields
```

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
write capability is an explicit decision that changes the security posture —
not a casual PR.

## License

MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
