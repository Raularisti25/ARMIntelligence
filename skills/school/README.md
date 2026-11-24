# /school — Portable course assistant

Turn any course's actual documents into a grounded assignment, tutoring, exam-preparation and course-planning workflow. No private ARM services are required.

## Download and use

- [Download SKILL.md](https://raw.githubusercontent.com/Raularisti25/ARMIntelligence/main/skills/school/SKILL.md) (open and save the raw file). The entire workflow is in this single file.
- [Download repository ZIP](https://github.com/Raularisti25/ARMIntelligence/archive/refs/heads/main.zip) and extract the `skills/school` folder, including its license.

Read the skill before installing. These are agent instructions, not a standalone executable or an LMS integration.

| Environment | Setup | Invoke |
| --- | --- | --- |
| Claude Code | Copy the school folder into `~/.claude/skills/` (or project `.claude/skills/`) | `/school` |
| Codex | Copy it into `~/.agents/skills/` (or project `.agents/skills/`) | `$school` or select in `/skills` |
| Other Agent Skills-compatible runtime | Install the school folder according to its skill-discovery instructions | Select school or use the runtime's invocation syntax |
| ChatGPT or another general chat assistant | Upload SKILL.md to a conversation or project and ask the assistant to follow it | `Follow the uploaded school skill. /school` |

On Windows, use the corresponding folders in your user profile. Restart or open a new session if needed for discovery. Keep an existing same-named skill rather than silently overwriting it. No shell command or privileged access is required for manual installation.

Official references: [OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills), [Claude skill documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

## First run

The assistant asks where you keep your course documents: uploads, a local folder, connected cloud storage, or an authorized LMS. Give it the course and objective. If documents are already attached, it uses those directly.

Examples:
- `/school Economics 101 — help me plan my semester from this syllabus`
- `/school Statistics — coach me through assignment 2 one question at a time`
- `/school Biology — prepare me for the midterm using these slides`
- `/school Accounting — audit this workbook against the rubric`

Use the equivalent invocation for your platform. Optional integrations require the student's permission and an available connector; if unavailable, upload the documents and work in chat. Only save course state to a private location you choose. Never enter your login credentials in chat.

## Smoke tests

After installing, try these with synthetic or authorized materials:

| Test | Expected behavior |
| --- | --- |
| New user, no documents | Asks where the course documents live and offers uploads |
| Uploaded rubric and course named | Reads them without redundant onboarding; maps requirements |
| Missing LMS access | Requests an export or upload; does not claim retrieval |
| Tutor mode | Asks one question and waits; does not edit the live original |
| Draft requested | Builds a reviewable copy if permitted, without mandatory tutoring |
| Source data has blank future actuals | Preserves blanks and separately labels forecasts |
| Deadline without a time | Records date only; never invents a time |
| Generic unrelated question | Does not activate the course workflow |

These are acceptance scenarios, not a claim of a live test on every runtime.

## License

MIT; see [LICENSE](LICENSE). The license applies to this skill only, not other repository contents or course materials supplied by students.
