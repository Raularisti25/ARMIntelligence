# ARMIntelligence

Portable, public versions of homemade AI skills originally developed inside a larger private agent system.

## Included skills

- [`/armskill`](skills/armskill/SKILL.md) - research, design, create, upgrade, merge, split, and verify homemade AI skills. Includes the `/steal` competitive-research methodology directly inside the skill, so no separate `/steal` install is required.
- [`/armsafe`](skills/armsafe/SKILL.md) - defensive, read-only-by-default security posture and application audit skill for systems the user owns or is authorized to assess.
- [`/arms`](skills/arms/SKILL.md) - multi-agent orchestration doctrine: keep judgment/integration in the strongest session and delegate separable execution to lower-cost workers when worthwhile.
- [`/armpartner`](skills/armpartner/SKILL.md) - partner-agent runtime for bounded collaboration on an owner-led project. The AI does most research, implementation, testing, debugging, and documentation while the human collaborator provides judgment, engineering direction, and quality review within the assigned scope.

## Portability

These public copies intentionally omit private infrastructure, machine paths, credentials, queues, internal hosts, owner-only orchestration, and confidential project context. They preserve the underlying behavior and should be adapted to the target LLM/runtime's own homemade-skill mechanism.

`/armpartner` is intentionally the **partner-agent side**, not the private owner/orchestrator skill. It expects a separate Partner Package that defines the authorized problem, desired result, scope, guardrails, starting points, and proof standard.

## Suggested install workflow

Give the repository URL to the target LLM and instruct it to:

1. Fetch and read the relevant `SKILL.md` completely.
2. Inspect its own existing skill system before creating anything.
3. Classify the skill as CREATE, MERGE, UPGRADE, or SKIP.
4. Adapt paths, agent tools, model tiers, security tooling, repository access, and installation mechanics to its own runtime.
5. Preserve behavior and routing boundaries, not foreign infrastructure.
6. Test at least one positive trigger and one neighboring negative trigger for installed skills.

For a LAB/ARM collaboration package, the collaborator's agent should install/read [`/armpartner`](skills/armpartner/SKILL.md) first, then consume the private Partner Package supplied by the project owner.

Repository: `https://github.com/Raularisti25/ARMIntelligence`
