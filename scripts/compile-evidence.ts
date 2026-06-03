/**
 * Compile evidence/REPORT.md from the latest Playwright run.
 *
 *   npm run report:compile
 *
 * Reads evidence/results.json (produced by the json reporter) and the
 * per-test screenshot folders under evidence/<suite>/<test>/, then emits a
 * single markdown file with one section per scenario.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const RESULTS = path.join(EVIDENCE, 'results.json');
const OUTPUT = path.join(EVIDENCE, 'REPORT.md');

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function rel(p: string): string {
  return path.relative(EVIDENCE, p).split(path.sep).join('/');
}

interface PWLocation { file: string; line: number; column: number }
interface PWResult { status: string; duration: number; startTime: string; error?: { message?: string } }
interface PWTest { title: string; results: PWResult[] }
interface PWSpec { title: string; ok: boolean; tests: PWTest[]; file: string; line: number }
interface PWSuite { title: string; suites?: PWSuite[]; specs?: PWSpec[]; file?: string }
interface PWReport { suites: PWSuite[]; stats: { startTime: string; duration: number; expected: number; unexpected: number; skipped: number; flaky: number } }

interface ScenarioRow {
  suiteTitle: string;
  describeTitle: string;
  testTitle: string;
  status: string;
  durationMs: number;
  startedAt: string;
  errorMessage?: string;
  file: string;
  line: number;
}

function flatten(report: PWReport): ScenarioRow[] {
  const rows: ScenarioRow[] = [];

  const walk = (suite: PWSuite, fileTitle: string, describeChain: string[]) => {
    const here = suite.title && suite.title !== fileTitle ? [...describeChain, suite.title] : describeChain;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const result = test.results[test.results.length - 1];
        rows.push({
          suiteTitle: fileTitle,
          describeTitle: here.join(' › ') || fileTitle,
          testTitle: spec.title,
          status: result?.status ?? 'unknown',
          durationMs: result?.duration ?? 0,
          startedAt: result?.startTime ?? '',
          errorMessage: result?.error?.message,
          file: spec.file,
          line: spec.line,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, fileTitle, here);
  };

  for (const top of report.suites) {
    const fileTitle = top.title || top.file || 'suite';
    walk(top, fileTitle, []);
  }
  return rows;
}

function findEvidenceFolder(describeTitle: string, testTitle: string): string | undefined {
  // evidence/<slug(top-level describe)>/<slug(test title)>/
  // The describeTitle may include " › " chains — try a few candidates.
  const candidates = new Set<string>();
  const parts = describeTitle.split(' › ').map(slug).filter(Boolean);
  if (parts.length) {
    candidates.add(parts.join('-'));
    candidates.add(parts[parts.length - 1]);
    candidates.add(parts[0]);
  }
  const testSlug = slug(testTitle);

  for (const suiteSlug of candidates) {
    const dir = path.join(EVIDENCE, suiteSlug, testSlug);
    if (fs.existsSync(dir)) return dir;
  }

  // Fallback: scan top-level evidence dirs for one that contains the test slug.
  for (const entry of fs.readdirSync(EVIDENCE, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_') || entry.name === 'html-report') continue;
    const candidate = path.join(EVIDENCE, entry.name, testSlug);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function readNote(dir: string, name: string): string | undefined {
  const file = path.join(dir, `${name}.txt`);
  if (!fs.existsSync(file)) return undefined;
  return fs.readFileSync(file, 'utf8').trim();
}

function statusBadge(status: string): string {
  switch (status) {
    case 'passed':  return '✅ passed';
    case 'failed':  return '❌ failed';
    case 'timedOut': return '⏱ timed out';
    case 'skipped': return '⏭ skipped';
    case 'interrupted': return '⚠ interrupted';
    default: return status;
  }
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function main(): void {
  if (!fs.existsSync(RESULTS)) {
    console.error(`Missing ${RESULTS}. Run "npm test" first.`);
    process.exit(1);
  }
  const report: PWReport = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
  const rows = flatten(report);

  const lines: string[] = [];
  lines.push('# E2E Test Report — pandai.question');
  lines.push('');
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push(`- **Run started:** ${report.stats.startTime}`);
  lines.push(`- **Total duration:** ${fmtDuration(report.stats.duration)}`);
  lines.push(`- **Passed:** ${report.stats.expected} · **Failed:** ${report.stats.unexpected} · **Flaky:** ${report.stats.flaky} · **Skipped:** ${report.stats.skipped}`);
  lines.push('');

  // Table of contents
  lines.push('## Scenarios');
  lines.push('');
  lines.push('| # | Scenario | Status | Duration |');
  lines.push('|---|----------|--------|----------|');
  rows.forEach((r, i) => {
    const anchor = slug(`${i + 1}-${r.testTitle}`);
    lines.push(`| ${i + 1} | [${r.describeTitle} — ${r.testTitle}](#${anchor}) | ${statusBadge(r.status)} | ${fmtDuration(r.durationMs)} |`);
  });
  lines.push('');

  // Per-scenario detail
  rows.forEach((r, i) => {
    const anchor = `${i + 1}-${slug(r.testTitle)}`;
    lines.push(`## <a id="${anchor}"></a>${i + 1}. ${r.testTitle}`);
    lines.push('');
    lines.push(`- **Suite:** ${r.describeTitle}`);
    lines.push(`- **Status:** ${statusBadge(r.status)}`);
    lines.push(`- **Duration:** ${fmtDuration(r.durationMs)}`);
    lines.push(`- **Started:** ${r.startedAt}`);
    lines.push(`- **Source:** \`${r.file}:${r.line}\``);
    lines.push('');

    const dir = findEvidenceFolder(r.describeTitle, r.testTitle);
    if (!dir) {
      lines.push('> _No evidence folder found for this scenario._');
      lines.push('');
    } else {
      const scenarioInfo = readNote(dir, 'scenario-info');
      if (scenarioInfo) {
        lines.push('### Scenario info');
        lines.push('');
        lines.push('```');
        lines.push(scenarioInfo);
        lines.push('```');
        lines.push('');
      }

      const steps = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.png'))
        .sort();
      if (steps.length) {
        lines.push('### Steps');
        lines.push('');
        for (const file of steps) {
          const label = file.replace(/^(\d+)-/, '$1 · ').replace(/\.png$/, '').replace(/-/g, ' ');
          lines.push(`**${label}**`);
          lines.push('');
          lines.push(`![${label}](${rel(path.join(dir, file))})`);
          lines.push('');
        }
      }

      const finalUrl = readNote(dir, 'final-url');
      if (finalUrl) {
        lines.push(`**Final URL:** \`${finalUrl}\``);
        lines.push('');
      }
    }

    if (r.errorMessage) {
      lines.push('### Error');
      lines.push('');
      lines.push('```');
      lines.push(r.errorMessage.replace(/\[[0-9;]*m/g, ''));
      lines.push('```');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  fs.writeFileSync(OUTPUT, lines.join('\n'));
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} — ${rows.length} scenarios`);
}

main();
