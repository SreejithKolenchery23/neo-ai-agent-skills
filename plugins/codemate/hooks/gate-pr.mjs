#!/usr/bin/env node
// PreToolUse hook: blocks `gh pr create` unless every pipeline gate is done with a valid
// receipt, or explicitly skipped by config. Exit 2 blocks the call and feeds stderr to Claude.
import { readFileSync } from 'node:fs';
import { REQUIRED_BEFORE_PR, git, isManaged, loadConfig, loadRuns, repoRoot, unmetGates } from './lib.mjs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const command = input.tool_input?.command ?? '';
if (input.tool_name !== 'Bash' || !/\bgh\b[^|;&\n]*\bpr\s+create\b/.test(command)) process.exit(0);

// Human escape hatch, read from the environment Claude was launched with. An inline
// `CODEMATE_SKIP=1 gh pr create` written by the agent does not reach this process.
if (process.env.CODEMATE_SKIP === '1') process.exit(0);

function block(lines) {
  process.stderr.write(`codemate: blocked \`gh pr create\`.\n${lines.join('\n')}\n`);
  process.exit(2);
}

try {
  const root = repoRoot(input.cwd ?? process.cwd());
  if (!root || !isManaged(root)) process.exit(0);

  const branch = git(root, 'branch', '--show-current');
  const config = loadConfig(root);
  const runs = loadRuns(root).filter((r) => r.error || r.run.branch === branch);

  if (runs.length === 0) {
    block([
      `No run file for branch "${branch}" in .codemate/runs/.`,
      'Open a run with codemate-implement and complete its gates before creating the PR.',
    ]);
  }

  const problems = [];
  for (const { file, run, error } of runs) {
    if (error) {
      problems.push(`${file}: ${error}`);
      continue;
    }
    for (const { gate, reason } of unmetGates(root, run, config, REQUIRED_BEFORE_PR)) {
      problems.push(`${file}: gate "${gate}" is unmet — ${reason}`);
    }
  }
  if (problems.length > 0) {
    block([...problems.map((p) => `  - ${p}`), 'Complete the gate (or have config skip it), then retry.']);
  }
} catch (e) {
  block([`gate-pr hook error: ${e.message}`]);
}
