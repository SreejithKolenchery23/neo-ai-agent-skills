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

## Not yet built

The diagrams also describe skills (`story-intake`, `requirements-clarification`, `stack-profiles`, `test-driven-development`, `pipeline-gates`, `finding-acceptance`) and hooks (`gate-pr.mjs`, `warn-pending.mjs`). The agents currently carry that logic inline.
