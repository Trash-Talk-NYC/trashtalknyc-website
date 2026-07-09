# Agent Protocol

Agents are roles, not autonomous workers.

Agents do not initiate work.

The Product Manager delegates work.

Before implementation, agents communicate with each other.

Each agent may request information from another agent.

Every task follows:

1. Scope
2. Audit
3. Plan
4. Implementation
5. Validation
6. Documentation

If the user says "debrief", agents must provide:

- Working On
- Why
- Recently Spoke To
- Information Received
- Information Shared
- Blockers
- Next Actions

Rules:

- Do not create work for the sake of work.
- Minimize complexity.
- Document decisions.
- Keep systems.md up to date.
- Prefer small iterations.
- Build tests that evolve with requirements.

## Human Work Principle

Agents must not create human work unless it is a true external dependency.

Every recommendation must be labeled as one of:

[CODE]
Claude can implement this entirely.

[CONFIG]
An existing third-party system configuration is required (Google Workspace, Netlify, GitHub, Brevo, etc.).

[EXTERNAL]
Requires access to a system Claude cannot access.

[HUMAN DECISION]
A subjective organizational decision requiring leadership input.

Before creating any non-code task, ask:

1. Is this absolutely required to achieve the goal?
2. Is this merely an optimization?
3. Can the existing system accomplish the same outcome?
4. Can Claude implement an alternative that avoids creating work?

If the answer to #1 is NO, the recommendation must not be promoted to a blocker.

Agents must never invent infrastructure, inboxes, vendors, accounts, databases, or workflows solely because they are theoretically cleaner.


## Debrief Protocol

At the end of every task, each consulted role must provide:

- What I worked on
- Why I worked on it
- What assumptions I made
- Which roles I communicated with
- What information I received
- What information I handed off
- Confidence (1-5)
- Recommended next action

Debriefs should be concise and action-oriented.

## Escalation Protocol

Before assigning work to a human, roles must attempt to determine if the task is:

[CODE]
Can be implemented entirely in the repository.

[CONFIGURATION]
Can be completed by changing settings in an existing platform.

[DOCUMENTATION]
Can be completed by updating project documentation.

[RESEARCH]
Requires gathering information.

[DECISION]
Requires a human preference or business decision.

[ADMIN]
Requires account ownership or platform access.

A role may only assign work to a human if it can explain why the task cannot be completed through one of the other categories.

## Visual QA, subjective feedback, and closing reports

The full procedure lives in the `visual-qa` skill (`.agents/skills/visual-qa/SKILL.md`): the breakpoint matrix, the per-width state checklist (including the EN/ES language toggle), how to translate subjective feedback and wording feedback into actionable design language, and the closing report every UI change must end with.

The non-negotiables it enforces:

- Do not assume passing tests implies good visual quality.
- Human subjective feedback is a first-class input; translate it, never dismiss it.
- A feature is not complete until a human can easily verify it — every UI change ends with the skill's closing report.
