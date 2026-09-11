# ARMIntelligence

Portable, public versions of three homemade AI skills originally developed inside a larger private agent system.

## Included skills

- [`/armskill`](skills/armskill/SKILL.md) - research, design, create, upgrade, merge, split, and verify homemade AI skills. Includes the `/steal` competitive-research methodology directly inside the skill, so no separate `/steal` install is required.
- [`/armsafe`](skills/armsafe/SKILL.md) - defensive, read-only-by-default security posture and application audit skill for systems the user owns or is authorized to assess.
- [`/arms`](skills/arms/SKILL.md) - multi-agent orchestration doctrine: keep judgment/integration in the strongest session and delegate separable execution to lower-cost workers when worthwhile.

## Portability

These public copies intentionally omit private infrastructure, machine paths, credentials, queues, internal hosts, and owner-specific automation. They preserve the underlying behavior and should be adapted to the target LLM/runtime's own homemade-skill mechanism.

## Suggested install workflow

Give the repository URL to the target LLM and instruct it to:

1. Fetch and read all three `SKILL.md` files completely.
2. Inspect its own existing skill system before creating anything.
3. Classify each as CREATE, MERGE, UPGRADE, or SKIP.
4. Adapt paths, agent tools, model tiers, security tooling, and installation mechanics to its own runtime.
5. Preserve behavior and routing boundaries, not foreign infrastructure.
6. Test at least one positive trigger and one neighboring negative trigger per skill.

Repository: `https://github.com/Raularisti25/ARMIntelligence`
