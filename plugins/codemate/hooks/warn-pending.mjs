#!/usr/bin/env node
// Stop hook: non-blocking. Lists unfinished gates so an abandoned run is visible and resumable.
import { readFileSync } from 'node:fs';
import { GATES, git, isManaged, isSettled, loadRuns, repoRoot } from './lib.mjs';

try {
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {}

  const root = repoRoot(input.cwd ?? process.cwd());
  if (!root || !isManaged(root)) process.exit(0);

  const branch = git(root, 'branch', '--show-current');
  const lines = [];
  for (const { file, run, error } of loadRuns(root)) {
    if (error) {
      lines.push(`${file}: ${error}`);
      continue;
    }
    if (run.branch !== branch) continue;
    const pending = GATES.filter((g) => !isSettled(run.gates?.[g]));
    if (pending.length > 0) lines.push(`${file} (${run.story?.id ?? 'no id'}): pending gates — ${pending.join(', ')}`);
  }

  if (lines.length > 0) {
    const message = `codemate: unfinished run on branch "${branch}". Resume it with codemate-implement next session.\n${lines.map((l) => `  - ${l}`).join('\n')}`;
    process.stdout.write(JSON.stringify({ systemMessage: message }));
  }
} catch {
  // Never let a reporting hook get in the way of stopping.
}
