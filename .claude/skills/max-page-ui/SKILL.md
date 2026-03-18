---
name: max-page-ui
description: Collaborative UI design workflow for building complete SvelteKit pages. Use this skill whenever the user wants to design, plan, or build a new page or view — even if they say "build me a page", "I need a dashboard", "create a settings screen", "design a landing page", or any similar request. This skill runs an interactive discovery process to nail down what goes on the page before handing off to frontend-design for high-quality implementation. ALWAYS use this skill rather than jumping straight into code when the user needs a full page — the discovery phase produces dramatically better results than guessing.
---

# Max Page UI

A collaborative, conversation-driven workflow for designing and building complete SvelteKit pages. The goal is to deeply understand what the page needs before any code is written, then hand off a rich, precise brief to the `frontend-design` skill for implementation.

---

## The Core Philosophy

Building a page without understanding it produces mediocre results. This workflow front-loads the thinking so that by the time code is written, both you and the user know exactly what they're getting. The conversation is the design work — implementation is just the output.

Don't ask all questions at once. Read the user's first message carefully; they've probably already answered several questions implicitly. Probe adaptively: ask what you genuinely don't know, skip what you can infer, and follow threads that matter.

---

## Phase 1 — Context Intake

Start by understanding the page at a high level. You need answers to these before moving on, but don't ask them all at once — gather them conversationally:

**Core questions to answer:**
- What is this page *for*? What does the user accomplish here?
- Where does it sit in the app? (standalone route, nested view, modal/drawer, etc.)
- Who uses it? (admin, end user, internal team, public visitor)
- What data does it display or capture?
- Are there any existing pages or components in the codebase this should feel consistent with?
- Any hard constraints? (auth-gated, performance-sensitive, mobile-first, specific SvelteKit patterns to follow)

**How to probe adaptively:**
- If the user says "dashboard" → ask what metrics/data, what actions they need to take, how often they'll use it
- If the user says "settings page" → ask what categories of settings, any destructive actions, admin vs user
- If the user says "landing page" → ask about the product/feature being promoted, the CTA, the target audience
- If the user says "form" → ask about the fields, validation requirements, multi-step or single-step, what happens on submit
- If the user is vague → ask for a brief description of what a user would *do* on this page

Summarize your understanding back to the user in 2-3 sentences before moving to Phase 2. Give them a chance to correct anything.

---

## Phase 2 — Feature & Section Recommendations

Based on the context you've gathered, propose what should go on the page. Present this as a numbered list so the user can easily respond by number.

**Format each recommendation as:**
```
[N]. **Section/Feature Name** `[Essential | Nice-to-have | Optional]`
     What it is and why it belongs on this page.
```

Aim for 5–10 recommendations. Think like a product designer: include obvious must-haves, a few value-adds that the user probably hasn't thought of, and 1-2 "nice-to-have" items that open discussion. Don't pad the list — every item should have a genuine reason to exist.

After presenting the list, ask: "Does this capture what you need? Let me know what to add, cut, or change — or just tell me your reaction and we'll work through it."

---

## Phase 3 — Iteration & Aesthetic Direction

This is the most important phase. Work through the feature list with the user until both of you are satisfied.

**Handle responses like:**
- "Drop #3, add X instead" → update the list, confirm the change
- "I'm not sure about #5" → explain the trade-off, offer alternatives, let them decide
- "Can we combine #2 and #4?" → explore whether that makes sense, propose how it would work
- "Looks good" → move to aesthetic direction

**Aesthetic direction** — before finalizing, also nail down the visual feel:

Ask the user if they have a direction in mind or want suggestions. Prompt them with: "Any thoughts on the visual direction? For example: clean and minimal, bold and expressive, dark/moody, data-dense and utilitarian, soft and friendly — or something else entirely?"

If they have a direction → capture it precisely (don't generalize "dark" into "dark mode", ask what kind of dark)
If they want suggestions → propose 2-3 contrasting options with brief descriptions, let them pick or blend

Also capture:
- Light vs dark preference (or "match the app's existing theme")
- Any specific DaisyUI theme they want to use or reference
- Anything they want to *avoid* aesthetically

**End state of Phase 3:** A finalized feature list + a clear aesthetic direction statement. Confirm both with the user explicitly: "Here's what we've landed on — [summary]. Ready to build?"

---

## Phase 4 — Brief Compilation & Handoff

Compile everything into a structured implementation brief, then invoke the `frontend-design` skill with it.

**Brief format:**
```
## Page Brief: [Page Name]

### Context
- **Purpose**: [what the user accomplishes here]
- **Route/placement**: [where it sits in the app]
- **Audience**: [who uses it]
- **Tech stack**: SvelteKit + DaisyUI + Tailwind CSS
- **Constraints**: [any hard requirements]

### Features & Sections
[Numbered list of finalized features with brief descriptions]

### Aesthetic Direction
- **Overall feel**: [the agreed direction]
- **Theme**: [DaisyUI theme if specified, or "choose appropriately"]
- **Light/Dark**: [preference]
- **Avoid**: [anything they explicitly don't want]
- **Reference points**: [any existing pages/components to feel consistent with]

### Additional Notes
[Anything else relevant that doesn't fit above]
```

Once the brief is compiled, invoke the `frontend-design` skill and pass it the complete brief. The brief is the handoff — it should be detailed enough that frontend-design can execute without any additional questions.

---

## SvelteKit-Specific Guidance

When the brief is handed to `frontend-design`, include these SvelteKit conventions in the constraints section if relevant:
- Pages live in `src/routes/` as `+page.svelte`
- Data loading happens in `+page.server.ts` (server) or `+page.ts` (universal)
- Components go in `src/lib/components/`
- DaisyUI classes are available — prefer semantic DaisyUI components over raw Tailwind where they exist
- Use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`) rather than legacy stores where appropriate

Don't impose these if the user hasn't indicated they're relevant to the current page — let context guide it.

---

## Conversation Tone

Be direct and engaged. This is a design conversation, not a form to fill out. Push back if a feature list is bloated. Suggest things the user hasn't thought of. Ask "why?" when something seems odd. The goal is a page the user will actually love, not just a page that technically satisfies the brief.

Keep responses focused — don't dump everything at once. One phase at a time, with clear transitions between them.
