# Prediction-Market Research Lab

Portable, public research tooling for binary prediction markets.

This folder is deliberately **read-only and paper-only**. It provides a clean market-data intake plus the research context needed to build and test calibration and sizing logic without wallet access or order execution.

## Current state

The baseline scanner reads active Polymarket events from the public Gamma API and normalizes binary markets into a compact snapshot containing:

- market question and event title;
- YES/NO implied probabilities;
- liquidity and volume;
- best bid / ask / spread when available;
- expiry and resolution-source context;
- public CLOB token identifiers.

It intentionally does **not** produce a model fair value, an "edge", a trade recommendation, or any order.

## Files

- `public-scout.cjs` — public/no-auth market scanner and normalizer.
- `test/public-scout.test.cjs` — deterministic unit tests.
- `RESEARCH.md` — evidence and fact-check context behind this experiment.
- `PARTNER_PROMPT.md` — the two scoped research/engineering tasks for the collaborator-agent workflow.

## Quick start

Requires Node.js 20+.

```bash
node --test lab/prediction-market/test/public-scout.test.cjs
node lab/prediction-market/public-scout.cjs --max-events=50 --top=10 --min-liquidity=1000
```

The output is JSON and explicitly marks itself `readOnly: true` and `paperOnly: true`.

## Public data sources

- Polymarket Gamma API: https://gamma-api.polymarket.com
- Polymarket public agent docs: https://github.com/Polymarket/agent-skills

## Boundary

This package is for research and simulation. It contains no wallet integration, signing, account credentials, authenticated trading flow, or live-order path.
