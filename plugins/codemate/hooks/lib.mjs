import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The fixed gate set, in pipeline order. `pr` is the gate the hook guards, so it is
// not required to be done before `gh pr create`.
export const GATES = ['tdd', 'verifier', 'security-review', 'code-review', 'pr'];
export const REQUIRED_BEFORE_PR = GATES.filter((g) => g !== 'pr');

const SHA = /^[0-9a-f]{7,40}$/i;

export function git(cwd, ...args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function gitOk(cwd, ...args) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function repoRoot(cwd) {
  return git(cwd, 'rev-parse', '--show-toplevel');
}

// A repo is Codemate-managed once it has a .codemate directory (config or runs).
export function isManaged(root) {
  return existsSync(join(root, '.codemate'));
}

export function loadConfig(root) {
  try {
    const cfg = JSON.parse(readFileSync(join(root, '.codemate', 'config.json'), 'utf8'));
    return { skip: Array.isArray(cfg.skip) ? cfg.skip : [] };
  } catch {
    return { skip: [] };
  }
}

export function loadRuns(root) {
  const dir = join(root, '.codemate', 'runs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const file = `.codemate/runs/${f}`;
      try {
        return { file, run: JSON.parse(readFileSync(join(root, file), 'utf8')) };
      } catch (e) {
        return { file, error: `unreadable run file (${e.message})` };
      }
    });
}

export function isSettled(gate) {
  return gate?.status === 'done' || gate?.status === 'skipped_by_config';
}

// Returns the gates in `gates` that are not validly satisfied, each with a reason.
export function unmetGates(root, run, config, gates) {
  const unmet = [];
  for (const name of gates) {
    const gate = run.gates?.[name];
    if (!gate) {
      unmet.push({ gate: name, reason: 'missing from the run file' });
      continue;
    }
    if (gate.status === 'skipped_by_config') {
      if (!config.skip.includes(name)) {
        unmet.push({ gate: name, reason: 'marked skipped_by_config but .codemate/config.json does not skip it' });
      }
      continue;
    }
    if (gate.status !== 'done') {
      unmet.push({ gate: name, reason: `status is "${gate.status ?? 'unset'}"` });
      continue;
    }
    const r = gate.receipt;
    if (!r || !r.at || !r.commit || !r.evidence) {
      unmet.push({ gate: name, reason: 'marked done without a valid receipt (needs at, commit, evidence)' });
      continue;
    }
    if (!SHA.test(r.commit) || !gitOk(root, 'cat-file', '-e', `${r.commit}^{commit}`)) {
      unmet.push({ gate: name, reason: `receipt commit "${r.commit}" is not a commit in this repo` });
      continue;
    }
    if (!gitOk(root, 'merge-base', '--is-ancestor', r.commit, 'HEAD')) {
      unmet.push({ gate: name, reason: `receipt commit ${r.commit.slice(0, 8)} is not in this branch's history` });
      continue;
    }
    if (name !== 'tdd' && name !== 'pr' && r.verdict !== 'PASS') {
      unmet.push({ gate: name, reason: `reviewer verdict is "${r.verdict ?? 'missing'}", not PASS` });
      continue;
    }
    // The test/build proof must describe the code being shipped.
    if (name === 'tdd' && !gitOk(root, 'diff', '--quiet', r.commit, 'HEAD', '--', '.', ':(exclude).codemate')) {
      unmet.push({
        gate: name,
        reason: `code changed since the suite and build ran at ${r.commit.slice(0, 8)}; re-run them and refresh the receipt`,
      });
    }
  }
  return unmet;
}
