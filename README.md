# neo-ai-agent-skills

A collection of [Claude Code](https://claude.com/claude-code) agents, skills, plugins and hooks.

## Contents

| Plugin | Description |
|---|---|
| [codemate](plugins/codemate/) | Story-to-PR pipeline: plan, TDD implementation, then verifier, security and code-review gates. |

## Repository layout

```
plugins/
└── <plugin>/
    ├── .claude-plugin/plugin.json   # plugin manifest
    ├── agents/                      # sub-agent definitions (markdown + frontmatter)
    ├── skills/                      # skills (planned)
    └── hooks/                       # hooks (planned)
```

## codemate

`codemate` takes an Azure DevOps story ID or a one-line task through to a reviewed pull request.

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
| `codemate` | sonnet | No | Entry point: fetches and confirms the story, routes to planning or implementation |
| `codemate-plan` | opus | No | Detects the stack, clarifies ambiguity (max 5 questions), writes the plan and Test Strategy |
| `codemate-implement` | sonnet | Yes | Drives the run-file gates: TDD, review orchestration, remediation, PR |
| `codemate-verifier` | sonnet | No | Traces each acceptance criterion to code and a genuinely-exercising test |
| `codemate-security-review` | opus | No | OWASP Top 10 / CWE Top 25 |
| `codemate-code-review` | sonnet | No | Layering, SOLID, patterns, test quality |

See the [plugin README](plugins/codemate/README.md) for details.

## Usage

Run the entry-point agent directly:

```sh
claude --plugin-dir plugins/codemate --agent codemate
```

Then give it a story ID or a one-line task.

> **Note:** Claude Code sub-agents cannot normally spawn other sub-agents. `codemate-implement` dispatches the reviewers, so it may need to run as the main agent (`claude --agent codemate-implement`). This has not been tested yet.

## Status

Early stage. The agents are in place; the skills and hooks described in the design (story intake, stack profiles, pipeline gates, and the PR-blocking hook) are not built yet, and their logic currently lives inline in the agents.
