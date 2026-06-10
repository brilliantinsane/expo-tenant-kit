# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's local markdown issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a triage role, use the corresponding label string from this table in the issue's `Triage:` field.

## Local Lifecycle Statuses

Local markdown issues also need an explicit lifecycle because there is no GitHub-style closed state.

| Lifecycle status | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| `open`           | Active, not yet being worked                            |
| `in-progress`    | Currently being worked                                  |
| `blocked`        | Cannot progress without new input or an external change |
| `done`           | Completed and verified; local equivalent of closed      |
| `superseded`     | Replaced by another issue, plan, or decision            |

Use lifecycle statuses in the issue's `Lifecycle:` field. Do not use lifecycle statuses as triage labels.
