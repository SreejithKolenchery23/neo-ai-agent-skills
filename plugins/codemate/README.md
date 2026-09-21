# codemate

Story-to-PR pipeline for Claude Code.

```
codemate ──► codemate-plan ──(developer approves)──► codemate-implement
                                                     ├─ gate: tdd (RED → GREEN → REFACTOR)
                                                     ├─ gate: verifier
                                                     ├─ gate: security-review
                                                     ├─ gate: code-review
                                                     └─ gate: pr
```

| Agent | Model | Edits code? | Role |
|---|---|---|---|
| `codemate` | sonnet | No | Entry point — fetches and confirms the story, routes to planning or implementation |
| `codemate-plan` | opus | No | Detects stack, clarifies ambiguity (≤5 questions), writes plan + Test Strategy; no edit tool or terminal |
| `codemate-implement` | sonnet | Yes | Drives the run-file gates: TDD, review orchestration, remediation, PR |
| `codemate-verifier` | sonnet | No | Every acceptance criterion traced to code and a genuinely-exercising test |
| `codemate-security-review` | opus | No | OWASP Top 10 / CWE Top 25 |
| `codemate-code-review` | sonnet | No | Layering, SOLID, patterns, test quality |

`opus` is used where a single pass carries the most risk (the plan and the security verdict); `sonnet` elsewhere. The `model` fields use aliases so they track the latest release of each tier; pin a full model ID in the frontmatter if you need an exact version.

Run state lives in `.codemate/runs/<story-id>.json`. Severity vocabulary: `Critical · High · Medium · Low · Info`; Critical and High block the PR.

## Hooks — the deterministic gate

Hooks live in [hooks/](hooks/) and load automatically with the plugin. They need `node` on the PATH.

| Event | Script | Effect |
|---|---|---|
| `PreToolUse` (Bash) | `gate-pr.mjs` | Blocks `gh pr create` unless every gate before `pr` is `done` with a valid receipt, or `skipped_by_config`. The block message names each unmet gate. |
| `Stop` | `warn-pending.mjs` | Non-blocking. Lists unfinished gates for the current branch so an abandoned run is visible and resumable. |

What `gate-pr.mjs` checks, per gate:

- `done` needs a receipt with `at`, `commit`, `evidence`, and the commit must exist and be in the branch's history.
- Reviewer gates (`verifier`, `security-review`, `code-review`) also need `verdict: "PASS"`.
- The `tdd` receipt must match the code being shipped: any code change after its commit invalidates it.
- `skipped_by_config` counts only if `.codemate/config.json` lists the gate: `{ "skip": ["security-review"] }`.
- A repo with a `.codemate/` directory is managed, and needs a run file whose `branch` matches the current branch.

**Bypass (humans only):** launch Claude Code with `CODEMATE_SKIP=1` in the environment for a non-Codemate PR in a managed repo. An inline `CODEMATE_SKIP=1 gh pr create` typed by the agent does not work.

Suggested `.gitignore`: `.codemate/runs/` (per-developer state). Commit `.codemate/config.json` to make a repo managed for the whole team.

**Limits:** the hook guards `gh pr create` only, not other ways to open a PR. Receipts are written by the agent, so the hook proves shape, commit ancestry and freshness, not that a reviewer honestly ran. A repo with no `.codemate/` directory is not gated.

## Not yet built

The six skills from the design (`story-intake`, `requirements-clarification`, `stack-profiles`, `test-driven-development`, `pipeline-gates`, `finding-acceptance`) and the GitHub Copilot hook installer. The agents carry that logic inline.
