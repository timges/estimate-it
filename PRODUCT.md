# Product

## Register

product

## Users

Agile software teams: developers, product managers, and scrum masters. They use estimate-it during sprint refinement and planning, usually remotely and often screen-shared on a call. The job to be done is simple and recurring: get the team to estimate a story, surface disagreement, and move on without one loud voice anchoring everyone else.

## Product Purpose

estimate-it is a real-time planning poker tool for bias-free story estimation. Teams create a room, share a memorable code (e.g. `coral-falcon`), and vote on story points privately. Votes stay hidden until everyone reveals at once, so estimates reflect what each person actually thinks rather than what the first or most senior person said. Success looks like a session that runs itself: low setup friction, honest spread of votes, and a clear moment of reveal that kicks off the real conversation.

## Brand Personality

Focused, honest, effortless. The dominant register is precise and quietly confident, engineering-grade, gets out of the way, never noisy. Playfulness is real but reserved: it lives in small, earned touches (the whimsical room codes, the bloom of the reveal) rather than coloring the whole surface. The interface stays calm and exacting while a team is deciding, then allows itself a moment of warmth when the votes flip. It should feel like a tool a team is happy to open every sprint, not enterprise software they tolerate, and never a toy.

## Anti-references

Heavyweight enterprise agile tooling. Avoid the Jira/scrum-board cliché: dense dashboards, busy gradients, cramped controls, and corporate-SaaS sterility. Nothing that feels like a backlog management suite. Also avoid generic AI-slop SaaS patterns: identical icon-heading-text card grids, gradient-text headings, and hero-metric templates.

## Design Principles

- **Bias-free by design.** The interface must never leak or nudge votes before the reveal. Hidden state is a feature, not a limitation, and the UI should make privacy obvious and trustworthy.
- **Frictionless entry.** Creating or joining a room is a few keystrokes. Never make a team fight the tool to start estimating.
- **The reveal is the moment.** The transition from hidden to revealed is the emotional peak of a session. Treat it with intention; everything else can be quiet.
- **Playful, not noisy.** Personality lives in small, deliberate touches (room codes, microcopy, the reveal), never in decoration that competes with the task.
- **Calm during the vote.** While people are deciding, the surface stays still and unintrusive so the discussion, not the tool, holds attention.

## Accessibility & Inclusion

Target WCAG 2.1 AA: sufficient contrast on text and controls, full keyboard navigation, and visible focus states (component-level a11y tests already exist). Because framer-motion drives transitions including the reveal, honor `prefers-reduced-motion` so motion-sensitive users get the state change without the animation.
