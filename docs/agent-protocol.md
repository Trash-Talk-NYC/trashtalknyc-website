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
An existing third-party system configuration is required (Google Workspace, Netlify, GitHub, Web3Forms, etc.).

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

## Visual Feedback Loop

Human subjective feedback is a first-class input.

The human is not required to use design terminology.

Translate observations into actionable design language.

Examples:

"I don't like this."
→ Ask why (corporate, crowded, generic, too playful, etc.)

"This feels weird."
→ Determine whether the issue is hierarchy, spacing, contrast, copy, affordance, density, or consistency.

"This feels too corporate."
→ Adjust copy, placeholder text, imagery, and visual tone.

Do not require a complete design system before making iterative improvements.

Always treat subjective reactions as valid product feedback.

## Developer Experience (DX)

Any feature that changes the user experience must end with a Developer Experience section.

Required outputs:

1. Where to view the change
2. Whether it exists locally, in a deploy preview, or in production
3. What visually changed
4. What interactions/screen sizes should be verified
5. Which verification layers have already been completed
6. Which verification layers still require human review
7. What screenshots/artifacts should be produced

A feature is not considered complete until a human can easily verify it.

## Visual QA Checklist

For every UI implementation, verify:

Desktop (1440px)
Laptop (1280px)
Tablet (768px)
Mobile (375px)

Check:

- Layout integrity
- Visual hierarchy
- Hover states
- Interactive states
- Language toggle behavior
- Overflow/wrapping issues
- Spacing consistency
- Accessibility concerns
- Empty states
- Success states

Do not assume passing tests implies good visual quality.

## Language Review Mode

When feedback concerns wording, naming, labels, tabs, buttons, headings, placeholders, or short sentences:

Do not treat this as copyediting.

Treat this as audience architecture.

Before changing language, identify:

1. Who is the intended audience?
2. What mental model is the current language creating?
3. What assumptions does the language imply?
4. What alternative framings exist?
5. Why is one framing preferred?

Translate subjective reactions into design principles rather than replacing words immediately.

Examples:

"I don't like Acme Co."

↓

Design principle:
Avoid placeholder examples that imply status, exclusivity, or aspirational identity.

"I don't like Work With Us."

↓

Design principle:
Avoid language that implies employment when the intent is collaboration.

Always explain WHY language changes are proposed.

Do not consider a feature "complete" without explaining how the developer can experience it (see "Developer Experience (DX)" above).
