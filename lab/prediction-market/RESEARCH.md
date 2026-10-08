# Research context: Grok / Polymarket survival-agent claim

## What triggered this experiment

A viral claim described a Grok-based agent allegedly turning a $50 bankroll into $5,273 on Polymarket in roughly 48 hours while continuously scanning markets, comparing market probabilities to model probabilities, using Kelly-style sizing, and changing focus as conditions changed.

The claimed P&L should **not** be treated as evidence for the architecture.

## Public-record fact check

The public Polymarket address tied to the viral post was:

`0x1a81418ae297c76d7c67eabe4c3f790be0bc6cf9`

A public API check showed:

- two deposits on 2026-08-18: $1,000 and $4,000;
- cumulative P&L of $10,657.00 on 2026-08-21;
- cumulative P&L of $9,578.402 on 2026-08-24.

That public record contradicts the headline "$50 to $5,273" story. The public ledger also cannot prove whether a human, script, or specific model made the trades.

The useful engineering question is therefore: **which mechanisms are worth testing independently of the viral result?**

## Mechanisms worth testing

### 1. Prediction-market calibration

Prediction-market prices are useful probability aggregates, but they are not perfectly calibrated across every horizon or domain.

Useful reference:
- Lionel Page & Robert T. Clemen, "Do prediction markets produce well-calibrated probability forecasts?" Economic Journal. DOI: https://doi.org/10.1111/j.1468-0297.2012.02561.x

This supports measuring calibration directly rather than assuming every market price is an unbiased probability.

### 2. Fractional / risk-constrained Kelly

Kelly sizing is coherent only when the input probabilities are trustworthy. Probability estimation error can turn aggressive Kelly sizing into a major failure mode.

Useful references:
- Busseti, Ryu & Boyd, "Risk-Constrained Kelly Gambling": https://doi.org/10.3905/joi.2016.25.3.118
- Jiang, Saunders & Weng, "The reinforcement learning Kelly strategy": https://doi.org/10.1080/14697688.2022.2049356

For this experiment, Kelly-style sizing must come **after** calibration and must include portfolio-level exposure constraints.

### 3. Correlated event risk

Prediction markets frequently contain contracts that share the same underlying event, causal driver, or mutually dependent outcomes. A per-contract position cap is not enough.

The sizing layer should reason about:
- same-event contracts;
- mutually exclusive outcomes;
- common macro/political/sports drivers;
- domain concentration;
- aggregate bankroll exposure.

### 4. Social sentiment

Social-media sentiment can contain information in some financial contexts, but that does not establish a universal prediction-market edge. Sentiment should be treated as an optional feature to validate out of sample, not as a privileged signal.

## Public implementation references

- Polymarket public agent docs: https://github.com/Polymarket/agent-skills
- Public Grok/Polymarket bot example: https://github.com/gti20/poly-bot

The second link is useful as architecture evidence. Do not copy code unless its license clearly permits it.

## Current boundary

The baseline in this folder is intentionally read-only. It provides market metadata and implied probabilities only.

It does **not** yet provide:
- a fair-value model;
- a probability calibration ledger;
- settled-event replay;
- Kelly sizing;
- correlated-event exposure accounting;
- authenticated trading or live orders.

Those first four research gaps are exactly what the collaborator tasks are designed to address.
