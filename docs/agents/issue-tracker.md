# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

`.scratch/` is intentionally gitignored. Treat it as a local planning and agent work area, not canonical repo history.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Each issue should include a `Triage:` line near the top using one of the triage labels in `triage-labels.md`
- Each issue should include a `Lifecycle:` line near the top using one of the lifecycle statuses in `triage-labels.md`
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` or `.scratch/<feature-slug>/issues/`, creating directories as needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.
