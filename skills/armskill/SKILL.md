---
name: armskill
description: "Research, design, create, upgrade, split, merge, or re-architect homemade AI skills and their routing. Use for new skill ideas, skill upgrades, trigger/routing design, context reduction, public-skill research, tool/plugin reuse, and installation verification. External research automatically uses the embedded /steal methodology before architecture is frozen."
compatibility: "Portable to capable coding/agent LLM environments. Adapt paths and installation mechanics to the local runtime."
---

# /armskill

`/armskill <skill objective>` turns a capability idea into a researched, bounded, context-efficient, routed, and verifiably installed skill.

Default workflow:

**current truth -> concept gate -> research (/steal embedded) -> collision analysis -> skill contract -> authoring -> implementation -> landing verification -> adoption feedback**

## Core doctrine

1. Conceptual skill ideas get one short discovery/stress-test pass before architecture.
2. Research before inventing. Look for official guidance, public skills, libraries, plugins, MCPs, scripts, and reusable patterns.
3. Progressive disclosure. Keep always-loaded metadata/router text small; load references only when needed.
4. One clear owner per concern. Prefer upgrade/merge over near-duplicate skills.
5. Routers are optional. Create one only when materially different specialist paths exist.
6. Optimize for the actual target model/runtime, not legacy prompting habits.
7. Maximize useful trigger recall without context spam.
8. A file write is not a landing. Verify discovery, routing, positive trigger, and neighboring negative trigger.

# Stage 0 - current truth and collision scan

Before designing:

1. Inspect the local skill inventory and routing mechanism.
2. Search exact and neighboring names.
3. Read only adjacent skill descriptions/boundaries needed to answer who already owns part of the problem.
4. Decide whether this should be CREATE, MERGE, UPGRADE, ROUTER-ONLY, SCRIPT/TOOL, REFERENCE, or SKIP.
5. Preserve settled owner decisions instead of reopening discovery unnecessarily.

# Stage 0.5 - concept gate

Use a short concept pass when the request changes what a skill *is*: new doctrine, workflow, lifecycle, interaction model, responsibility, routing philosophy, or optimization target.

Skip the concept gate for mechanical edits such as wording fixes, exact trigger tuning, dead-path repair, install verification, deterministic refactors, or already-settled implementation.

Only one concept pass per case unless new evidence materially changes the idea.

# Stage 1 - research first

Research is first-class for substantive skill work.

Use current authoritative web/docs research and primary sources when possible. Research the capability as a skill-system decision, not only as a topic.

## Embedded /steal protocol

When research examines external skills, apps, products, public repositories, companies, workflows, frameworks, games, media, or analogous systems, automatically run this protocol. A separate `/steal` skill is not required.

### 1. Establish current truth

Write the local baseline first:
- what exists now;
- what problem is actually unsolved;
- current constraints;
- what must not change;
- what evidence would justify an adaptation.

### 2. Prefer primary evidence

Evidence order:
1. official docs/specs/product pages;
2. original repositories/source code/release notes;
3. papers, engineering posts, talks, patents where relevant;
4. strong technical analyses;
5. community reports as supporting evidence only.

Label material claims as:
- **Observed** - directly visible/tested;
- **Disclosed** - explicitly stated by the source;
- **Inferred** - reasoned from evidence;
- **Unknown** - not established.

Do not present inference as fact.

### 3. Study mechanisms, not surface features

For every useful external behavior ask:
- What user/job problem does it solve?
- What mechanism makes it work?
- What inputs/state/signals does it need?
- What tradeoff does it accept?
- What failure modes appear?
- What is portable to this system?

Abstract the mechanism before proposing an implementation.

### 4. Research perimeter

Inspect only dimensions that can change the skill decision, such as:
- triggering/discovery;
- context loading;
- orchestration;
- memory/state;
- tool use;
- verification/evidence;
- UX/interaction;
- reliability and recovery;
- security/privacy;
- cost/performance;
- licensing/IP constraints.

### 5. Evidence ledger

For each candidate mechanism record:
- source;
- evidence;
- certainty label;
- mechanism;
- local relevance;
- important caveat;
- license/IP status when applicable.

### 6. Compare before adapting

For each candidate score 0-5 on:
- problem fit;
- evidence strength;
- expected leverage;
- implementation simplicity;
- compatibility with current architecture;
- maintainability;
- reversibility.

Generate at least three adaptation alternatives when the decision is meaningful:
- minimal adaptation;
- balanced adaptation;
- ambitious adaptation.

### 7. Opportunity ranking

A useful default weighted score:
- problem fit 25%;
- leverage 20%;
- evidence 15%;
- compatibility 15%;
- simplicity 10%;
- maintainability 10%;
- reversibility 5%.

Use judgment rather than fake precision when evidence is sparse.

### 8. Separate legal/IP gate

Classify reuse separately from product merit:
- **GREEN** - ideas/mechanisms, permissive/open material, independently implemented patterns;
- **AMBER** - attribution/copyleft/unclear redistribution or branding constraints; inspect license before use;
- **RED** - proprietary code/assets, leaked/private material, credentialed copying, or anything requiring unauthorized access.

Never copy proprietary code, private material, secrets, or protected assets. Independently implement mechanisms from lawful evidence.

### 9. /steal output contract

Return:
- baseline/current truth;
- strongest observed external mechanisms;
- evidence/certainty;
- what is actually better than current state;
- adaptation options;
- ranked recommendation;
- IP/license gate;
- rejected ideas and why;
- source references sufficient to reopen research.

### 10. Research Capsule

Compress the full research into:
- 3-7 decisive findings;
- selected reusable tools/skills and why;
- licensing constraints;
- design implications;
- important rejected alternatives;
- source references.

Architecture consumes the capsule, not the whole research dump.

# Stage 2 - skill architecture

Create a compact Skill Contract:

- **Name** - canonical slash command/stable ID.
- **Purpose** - one sentence.
- **Positive triggers** - concrete task shapes.
- **Negative triggers** - similar tasks it must not own.
- **Owner boundary** - owns / does not own.
- **Adjacent handoffs** - local sibling skills if any.
- **Target model/runtime**.
- **Primary routes** - only if genuinely distinct.
- **Context budget** - always-loaded vs on-demand.
- **Evidence/proof** - minimum validation.
- **Stop/escalation conditions**.
- **Landing targets** - local canonical/install/router locations.

## Router test

Create a router only when at least two routes need materially different tools or instructions.

Good: `tiny intake -> classify -> load one specialist packet -> execute -> proof/handoff`

Bad: `load everything -> choose after consuming all context`

Default to one primary specialist plus at most one cross-cutting specialist.

## Artifact shape

Use the smallest shape that solves the problem:
- one `SKILL.md` for compact guidance;
- `SKILL.md` + `references/` for selective detail;
- `SKILL.md` + deterministic `scripts/` for automatable checks;
- wrapper around an existing public tool when safer/cheaper than copying;
- router-only change when discovery is the only defect;
- merge/delete when duplicated.

# Stage 3 - author for invocation and context efficiency

Metadata is routing infrastructure. The description should state what the skill does, concrete trigger shapes, and likely neighboring exclusions.

Main body should contain:
1. purpose/boundary;
2. cheap preflight;
3. primary decision tree/execution loop;
4. specialist loading rules;
5. stop/handoff rules;
6. proportional verification;
7. landing rule when runtime state changes.

Move long examples, volatile facts, and framework-specific detail into on-demand references.

Prefer concise high-signal constraints over repetitive self-review rituals.

# Stage 4 - implementation and wiring

Adapt to the local runtime's canonical skill mechanism.

General rules:
1. keep one canonical source;
2. install/mirror using the runtime's supported mechanism;
3. update discovery/router metadata only where required;
4. do not duplicate entire skill bodies in routers;
5. preserve historical files as historical unless active call sites need migration;
6. do not invent compatibility shims for infrastructure that does not exist.

# Stage 5 - Landing Verification Chip

Every new skill, rename, router change, or material cross-runtime update gets:

```text
Skill:
Canonical source:
Target runtime(s):
Router/call-site changed:
Install/sync mechanism:
Positive trigger test:
Negative trigger test:
Path/readability check:
Evidence:
Rollback/recovery:
Status: LANDED / PENDING / FAILED
```

A positive trigger proves intended discovery/routing. A negative trigger proves a neighboring task does not incorrectly invoke it.

# Stage 6 - adoption feedback

For important recurring skills, improve from evidence:
- trigger recall/precision;
- context cost;
- route distribution;
- repeat failure patterns;
- instructions repeatedly ignored or rediscovered;
- obsolete scaffolding;
- deterministic checks that should become scripts;
- duplicates/ambiguous descriptions.

Optimize for **more correct invocations per useful token**.

# Completion report

Return useful receipts only:
- concept gate decision;
- research route + Research Capsule;
- CREATE/MERGE/UPGRADE/SKIP decision;
- skill boundary;
- files/router changes;
- landing verification status;
- unresolved risk, if any.

Do not paste the entire skill or research report unless asked.