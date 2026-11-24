# ARMIntelligence

Portable AI-agent skills and selected experiments. Public releases are designed to be reviewed, adapted, and used without access to private ARM infrastructure.

## Skills

| Skill | Purpose |
| --- | --- |
| [`/armskill`](skills/armskill/SKILL.md) | Design, research, improve, and validate AI skills. Includes a lawful competitive-research method. |
| [`/armsafe`](skills/armsafe/SKILL.md) | Audit and harden authorized systems. Defensive and read-only by default. |
| [`/arms`](skills/arms/SKILL.md) | Coordinate bounded agent work with explicit permissions and verification. |
| [`/armpartner`](skills/armpartner/SKILL.md) | Support scoped human-agent engineering collaboration through a Partner Package. |
| [`/school`](skills/school/README.md) | Run any course with document onboarding, assignment coaching, artifact audits, exam preparation, and deadline tracking. |

Each skill has a standalone `SKILL.md`. Review the instructions before granting tools, credentials, or repository access.

## Experiments

Experimental work lives under `lab/` and is separate from the reusable skills:

- [Pi wake](lab/pi-wake/README.md): a systemd-based agent wake lifecycle.
- [Prediction markets](lab/prediction-market/README.md): public-data research, read-only and paper-only.
- [Hollowmere](lab/hollowmere/README.md): a local TypeScript game experiment.

## Use

1. Read the target `SKILL.md` and any referenced files.
2. Adapt tool names, permissions, and paths to your own agent runtime. Grant only the access required.
3. Verify one intended trigger and one nearby non-trigger before relying on the skill.

The skills contain instructions, not automatic trust or authorization. Do not run unreviewed commands, share secrets, or access systems outside your permissions. `/armpartner` requires a separately scoped Partner Package.

## Security

For suspected vulnerabilities, avoid posting credentials or exploit details in public issues. Contact the repository maintainer privately with a minimal reproduction and affected paths. Public examples intentionally exclude internal infrastructure and credentials.

[Repository](https://github.com/Raularisti25/ARMIntelligence)
