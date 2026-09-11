---
name: armsafe
description: "Defensive security audit and hardening skill for systems the user owns. Supports posture sweeps, focused app/route reviews, stage-specific audits, hardening plans, and bounded owner-authorized pentest planning. Read-only by default; findings end in a smallest fix, a task, or an owner-only ask."
compatibility: "Portable defensive security skill. Adapt checks, standards, tools, hosts, accounts, and paths to the local environment."
---

# /armsafe

`/armsafe` is a defensive security skill for auditing and hardening systems the user owns or is explicitly authorized to assess.

## Safety posture

- Defensive only.
- Read-only by default.
- Never attack third-party systems.
- Never disable a control merely to test whether it works.
- Never print, echo, or expose secret values.
- Never assume authorization for external targets.
- If a check could affect a third party, stop and require explicit proof of authorization or replace it with a safe local/manual check.

## Invocation modes

| Invocation | Behavior |
| --- | --- |
| `/armsafe <route or feature>` | Focused application audit of one target. |
| `/armsafe posture` | Full posture sweep of the local estate. |
| `/armsafe stage <n>` | Deep audit of one security stage only. |
| `/armsafe plan` | No scanning; turn latest findings into a ranked hardening plan. |
| `/armsafe pentest <owned target>` | Optional bounded pentest workflow only when ownership/authorization is explicit. |

No argument: ask which mode in one short line.

# Eight-stage posture model

Use the closest applicable framework for the local environment. Good defaults include NIST/OWASP/CIS, or a regulated profile the user explicitly needs. If a control framework is used, cite control IDs consistently.

## Stage 1 - Identity, MFA, and credentials

Pass bar examples:
- phishing-resistant MFA where supported;
- no shared admin accounts;
- SSH/API credentials appropriately scoped and rotated;
- stale accounts removed;
- recovery methods reviewed;
- account inventory current.

## Stage 2 - Codebase and secret hygiene

Check:
- no tracked `.env` or credential files;
- secret scanning clean or triaged;
- dependencies scanned for known vulnerabilities;
- static-analysis findings triaged;
- pre-commit or CI secret checks where practical;
- no secrets printed to logs.

## Stage 3 - Application layer and authorization

Check:
- authentication/session handling;
- object-level authorization / IDOR;
- input validation;
- mass assignment;
- server-bounded pagination;
- path traversal guards;
- SSRF guards for outbound requests;
- safe file upload handling;
- least-privilege database access;
- per-user/per-tenant data isolation;
- mutation authorization;
- connection pooling and timeouts.

For managed databases with row-level security, verify policies actually cover every exposed table and mutation path.

## Stage 4 - Edge and transport

Check:
- modern TLS configuration;
- HSTS where appropriate;
- CSP and browser security headers;
- secure cookie flags;
- no mixed content;
- public services expose only necessary ports/protocols;
- reverse-proxy/CDN settings match the threat model.

## Stage 5 - Host and daemon hardening

Check:
- OS updates;
- least-functionality;
- firewall posture;
- no password/root remote login unless explicitly justified;
- disk encryption where applicable;
- secure boot / platform protections where available;
- persistent security logs;
- unnecessary daemons disabled;
- privileged services minimized.

## Stage 6 - Network boundary and segmentation

Check:
- trusted, server, IoT, and guest networks separated when relevant;
- IoT cannot freely reach sensitive hosts;
- UPnP/WPS disabled unless there is a documented need;
- no unexpected WAN-exposed services;
- DNS filtering/logging where useful;
- mDNS/reflection is deliberately scoped;
- remote administration uses a secure tunnel/VPN or equivalent.

A WAN exposure check must be performed from outside the LAN or by a trusted external scanner. An internal scan does not prove edge exposure.

## Stage 7 - AI/agent runtime security

Check:
- agents run with the minimum necessary OS/account privileges;
- no blanket passwordless sudo;
- credentials are injected at call time when practical instead of globally exported;
- plugins/MCP servers/connectors are pinned, reviewed, and permission-scoped;
- tool outputs and retrieved content are treated as untrusted input;
- prompt injection cannot silently grant extra authority;
- sensitive actions are logged;
- destructive operations require appropriate confirmation/authorization;
- agent workspaces do not leak secrets across projects/users.

## Stage 8 - Detection, incident response, backups, and endpoint resilience

Check:
- useful security logging exists;
- important alerts reach a human;
- containment steps are documented;
- restore procedures are tested periodically;
- backups follow an appropriate redundancy/offline strategy;
- endpoint encryption and account recovery are configured;
- the user knows what to do after credential theft, device loss, or compromise.

# Focused application audit checklist

For one route/feature, inspect:

### Auth/session
- rate limiting/lockout appropriate to the endpoint;
- generic login errors;
- secure, httpOnly cookies where applicable;
- session/token rotation on privilege change;
- secrets never logged;
- timing-safe comparison where relevant.

### Data exposure
- ownership checked server-side;
- client-supplied identifiers cannot escape authorization scope;
- bounded pagination;
- no privilege fields accepted through mass assignment;
- realpath/allowlist for filesystem access;
- SSRF guard or strict outbound allowlist for user-controlled URLs.

### Resilience
- pooled DB connections;
- request and external-call timeouts;
- isolation/retry policy appropriate to dependencies;
- graceful failure that does not expose internals.

### Second pass
If the local environment has an independent security-review capability, use it as a complementary second pass, never as a substitute for the checklist.

# Tooling

Use only installed/authorized tools. Examples when appropriate:
- secret scanners;
- dependency vulnerability scanners;
- static analyzers;
- TLS scanners;
- SSH auditors;
- host hardening auditors;
- container scanners;
- network scanners against owned ranges only.

If a scanner is missing, mark the check **SKIP** or **MANUAL**. Missing tooling is not a pass.

# Output contract

One row per finding:

`Stage | Control/Category | Check | Verdict | Evidence | Smallest fix | Owner`

Verdicts:
- **PASS**
- **FAIL**
- **SKIP** - tool/check unavailable;
- **MANUAL** - requires a human or external perspective.

Owner:
- **fix-now** - safe and within current scope;
- **file** - create a follow-up task/issue;
- **owner** - money, physical action, privileged credential, or policy choice only the owner can make.

End with:
- `PASS n / FAIL n / SKIP n / MANUAL n`
- the three highest-leverage fixes.

No lecture.

# Rules against security theater

Do not recommend weak controls as primary defenses, including:
- hiding SSIDs;
- MAC filtering;
- moving SSH to a random port as if that were access control;
- antivirus as a substitute for least privilege/hardening;
- disabling IPv6 without an actual threat-model reason;
- consumer VPN apps as a substitute for server/network security.

Explain why in one clause if asked.

# Pentest mode

Only when the user explicitly owns or is authorized to test the target:
1. confirm target and scope;
2. set bounded time/request/tool limits;
3. begin with passive/read-only enumeration where possible;
4. avoid destructive payloads, persistence, credential theft, or lateral movement;
5. record evidence and stop conditions;
6. report reproducible findings and smallest fixes.

If authorization is unclear, refuse active testing and offer a safe local/configuration audit instead.