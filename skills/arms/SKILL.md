---
name: arms
description: "Portable multi-agent orchestration skill. Keep the strongest model/session on decomposition, architecture, integration, safety, and final review while delegating separable execution to cheaper/lower-intelligence workers when that improves quality-output per token/time. Adapt to the local runtime's actual agent/session tools."
compatibility: "Portable across capable agent runtimes. Replace model names, spawn tools, messaging, and effort controls with local equivalents."
---

# /arms - Agent Resource Management System

North star: **maximize quality-output per token and elapsed time without giving away judgment.**

The strongest available model/session should retain:
- decomposition of ambiguous work;
- architecture/product/safety tradeoffs;
- integration judgment;
- conflict resolution between worker reports;
- final review;
- user-facing synthesis.

Everything else is a candidate for delegation when the runtime supports it.

# 0. Default posture

For non-trivial work, prefer orchestration over doing all production inline.

Use at least one lower-cost/lower-intelligence worker for bulky execution when there is a clean boundary, such as:
- code writing from a settled spec;
- bounded file edits;
- test runs;
- log digestion;
- evidence collection;
- repository scans;
- documentation drafting;
- repetitive transformations.

Spawn additional workers when the task decomposes into independent slices worth parallelizing.

Solo execution is appropriate when:
- the task is below delegation break-even;
- all meaningful work is delicate judgment;
- the runtime has no reliable worker mechanism;
- orchestration overhead would exceed the work itself.

When solo, record a short reason if useful.

# 1. Delegation break-even

Delegate when one or more is true:
- a worker can absorb a large read/log/context load;
- multiple independent slices can run in parallel;
- a cheaper/lower-intelligence model can reliably execute the slice;
- work should continue independently from the orchestrator session;
- verification can be separated from implementation;
- the task contains bulky production but relatively little judgment.

Do not delegate tiny work just to satisfy a ritual.

# 2. Minimum sufficient intelligence

For every worker, choose the **lowest capability level that can reliably finish the bounded task**.

General floor examples:
- mechanical search/digest/formatting -> cheapest capable worker;
- bounded coding/verification -> mid-tier worker;
- hard but well-bounded technical slice -> stronger worker, still below orchestrator when the runtime supports hierarchy.

Under-provisioning is usually recoverable by escalation. Over-provisioning wastes cost/tokens and cannot be refunded.

Never encode vendor-specific model names as universal doctrine. Map the local runtime's available models/effort levels into a descending capability ladder.

# 3. Downward delegation rule

When the runtime exposes meaningful model/effort tiers, workers should normally be **strictly below the orchestrator's own capability level**.

Allowed:
- same model at lower reasoning/effort, if the runtime treats effort as a real capability tier;
- smaller model at any appropriate effort;
- recursive delegation where each child steps down again.

Avoid:
- equal-capability sibling spawns with no cost/throughput reason;
- upward spawns as a reflex;
- premium workers for mechanical tasks.

Escalation is allowed when a worker discovers that its bounded slice genuinely exceeds its floor.

# 4. Worker packet

Every worker should receive a cold-start-safe packet containing:
- exact objective;
- repo/project/path context needed;
- scope in;
- scope out;
- expected evidence/output format;
- verification command or success condition;
- stop conditions;
- authority limits;
- where/how to report back.

Write packets as though the worker has no parent-chat context.

Bad packet: `check auth stuff`

Good packet:
`Inspect the auth routes under X for IDOR and missing ownership checks. Do not edit files. Return file:line evidence, severity, and the smallest safe fix. Stop if the route architecture differs materially from the description.`

# 5. Worker authority floor

Workers must never receive more authority than needed.

Default worker posture:
- bounded workspace/path;
- least-privilege tools;
- no secret disclosure;
- no destructive operations unless specifically required and authorized;
- no unrelated refactors;
- no silent expansion of scope;
- stop and report when evidence contradicts the task packet.

If the runtime provides permission scopes, containers, worktrees, sandboxes, or approval gates, use them.

# 6. Escalation and replacement

A worker should escalate or return control when:
- code/state materially differs from the packet;
- the task requires architectural judgment;
- it needs out-of-scope files or permissions;
- verification fails after reasonable bounded retry;
- the chosen model floor is insufficient;
- safety/authorization is uncertain.

Prefer escalating the existing work context when the runtime supports it. Otherwise spawn a stronger replacement with the worker's evidence attached.

Do not let failed workers disappear with useful evidence trapped in their transcript.

# 7. Parallelism

Parallelize only independent slices.

Good parallel work:
- separate repository scans;
- independent test suites;
- unrelated modules;
- implementation vs verification;
- research across different sources;
- log clustering vs reproduction.

Avoid parallel edits to the same shared file unless the runtime has a deliberate merge/coordination mechanism.

The orchestrator owns integration order and conflict resolution.

# 8. Research, coding, testing, debugging defaults

## Research
- split independent evidence targets;
- let workers gather/cite evidence;
- orchestrator decides what changes the plan.

## Coding
- workers take bounded edits from settled specs;
- orchestrator owns shared-file coordination, architecture, and final review.

## Testing
- workers run suites/browser flows/log reduction;
- return exact commands, failures, and flaky-vs-real judgment evidence;
- orchestrator decides whether failures block shipment.

## Debugging
- workers reproduce, cluster logs, inspect suspected areas, or try small reversible fixes;
- orchestrator selects the diagnosis and integration path.

# 9. Evidence contract

Worker reports should contain only what helps integration:
- what was attempted;
- files/areas touched or inspected;
- commands/tests run;
- evidence/results;
- uncertainty;
- blockers;
- recommended next action.

Avoid long narrative transcripts unless requested.

# 10. Verification separation

For material changes, prefer an independent verifier when affordable.

The verifier should not merely repeat the implementer's summary. It should inspect the artifact/state and run the relevant test/check itself.

Use proportionate proof:
- tiny mechanical edit -> direct check;
- bounded feature -> focused tests/review;
- security/safety-critical change -> independent second pass;
- broad cross-system change -> integration verification.

# 11. Runtime adaptation

On installation, inspect the host environment and map these abstract roles:

- `orchestrator` -> strongest active session/model;
- `worker` -> subagent, child session, background agent, job, or delegated model call;
- `send/report` -> local messaging/event/result mechanism;
- `effort` -> reasoning tier, model tier, budget, or equivalent;
- `sandbox` -> local permission/worktree/container mechanism.

Do not preserve foreign tool names or paths if the host does not have them.

# 12. Naming and lineage

If the runtime benefits from named workers, use deterministic names that expose parentage and role, for example:

`L2[parent-role worker-label]`

or another local convention.

Useful properties:
- parent is identifiable;
- depth is identifiable when recursive orchestration exists;
- role/slice is human-readable;
- names are unique enough to address/report.

Do not require this if the runtime already has better native identifiers.

# 13. Stop conditions

Stop orchestrating and continue inline when:
- remaining work is integration/judgment only;
- worker overhead now exceeds remaining work;
- runtime reliability is poor;
- privacy/safety requires keeping the work in the parent;
- all separable slices are complete.

# Completion report

Return concise receipts:
- orchestration used or `solo: <reason>`;
- workers spawned and their floors/roles;
- parallel slices completed;
- escalations/replacements;
- verification performed;
- unresolved risk/blocker;
- final integrated result.

The goal is not maximum agent count. The goal is **better output with cheaper execution and centralized judgment**.