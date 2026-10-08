# /armpartner — Prediction-market research package

First read:

`skills/armpartner/SKILL.md`

Then read every file in:

`lab/prediction-market/`

You are working with Andrew as the human technical steward. Andrew owns judgment, architecture review, and proof quality. You should do most of the repo inspection, research, implementation, tests, debugging, and documentation.

The current baseline is a read-only public Polymarket scanner. It records implied probabilities and market metadata, but it intentionally does not claim a fair value or trading edge.

## Task 1 — Event probability calibration + historical settlement replay

Build a reproducible paper-research layer that can answer:

**When this system or a market says an event has probability p, how often do comparable events actually resolve YES?**

Desired capabilities:

- preserve point-in-time market snapshots;
- ingest final settled outcomes from public sources;
- preserve exact market question, resolution context, snapshot time, settlement time, and time-to-resolution;
- prevent future information from leaking into historical snapshots;
- support replay across historical events;
- compute at least:
  - Brier score;
  - log loss;
  - reliability/calibration bins;
  - sample count;
  - calibration slices by domain and time-to-resolution;
- support comparing:
  - market implied probability;
  - future model probability providers through a versioned interface;
- make insufficient sample sizes visible instead of overclaiming precision.

### Green & Clean for Task 1

A deterministic test fixture plus at least one real public-data replay demonstrates that snapshots remain point-in-time correct, resolved outcomes join correctly, and calibration metrics are reproducible.

Do not call model scores "calibrated probabilities" until the evidence supports that label.

## Task 2 — Uncertainty-aware fractional Kelly + correlated-event exposure

Build a **paper-only** sizing engine that consumes an estimated/calibrated event probability and a market price, then proposes a simulated position size.

It must not assume the estimate is exact.

Desired capabilities:

- fractional Kelly or risk-constrained Kelly;
- explicit uncertainty/shrinkage around the probability estimate;
- hard bankroll and gross-exposure limits;
- per-event exposure limits;
- correlated-contract/group exposure limits;
- mutually exclusive outcome handling;
- liquidity-aware size ceilings;
- abstention when edge is too small relative to uncertainty/costs;
- deterministic explanation of why a proposed size was reduced or rejected.

### Green & Clean for Task 2

Tests must prove safe behavior for:
- a strong-looking but highly uncertain estimate;
- several correlated contracts all pointing the same direction;
- mutually exclusive outcomes;
- low-liquidity markets;
- severe probability miscalibration;
- a normal independent-market case.

The engine stays simulation/paper-only. Do not add wallets, credentials, signing, authenticated order submission, or live trading.

## Freedom

These requirements define the outcomes, not the exact architecture. If Andrew or you find a cleaner design, use it.

You may challenge the proposed metrics or sizing approach, but back the alternative with evidence and preserve the same auditability and paper-only boundary.

## Starting points

- `lab/prediction-market/public-scout.cjs`
- `lab/prediction-market/RESEARCH.md`
- Polymarket public APIs/docs linked there
- existing tests in `lab/prediction-market/test/`

## Proof contract

Before calling either task done, return:

- architecture and data model;
- files changed;
- test output;
- one real-data demonstration where public data permits it;
- leakage/point-in-time checks;
- assumptions and remaining uncertainty;
- any design choice Andrew materially changed;
- Andrew's recommendation: MERGE / REWORK / HOLD.

Do not optimize for impressive backtest returns. Optimize for calibration, reproducibility, risk containment, and honest evidence.
