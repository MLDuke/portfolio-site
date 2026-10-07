# Architecture decision records

Decisions that span more than one app or package in this monorepo: what forced
them, what was chosen, and what that now costs or forbids. A decision that lives
inside one place belongs beside it instead. Sketchbook's are in
[`apps/sketchbook/docs/adr/`](../../apps/sketchbook/docs/adr/README.md), and the two
series are numbered separately. Read the ones that touch the area you're about to
work in.

- Files are `NNNN-kebab-title.md`, numbered in the order they were decided, and
  dated by the commit that introduced the decision.
- Don't rewrite an accepted ADR when the decision changes. Add a new one, and set
  the old one's status to `Superseded by NNNN`. When the new one changes only part
  of the old, set the status to `amended <date> by NNNN` and leave the text alone.
  Fix typos and broken links in place.
- Format: `Status`, then Context, Decision, Consequences.

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-controls-live-in-ui.md) | Control components live in `@mlduke/ui`, and sketches may use them | Accepted |
