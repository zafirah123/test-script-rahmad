import { test, type Page, type TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', 'evidence');

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const cleanedDirs = new Set<string>();

export function evidenceDir(testInfo: TestInfo): string {
  const suite = slug(testInfo.titlePath[testInfo.titlePath.length - 2] ?? 'suite');
  const title = slug(testInfo.title);
  const dir = path.join(ROOT, suite, title);
  const key = `${testInfo.testId}:${dir}`;
  if (!cleanedDirs.has(key)) {
    fs.rmSync(dir, { recursive: true, force: true });
    cleanedDirs.add(key);
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Capture a labeled step: takes a full-page screenshot, saves it under
 * evidence/<suite>/<test>/NN-<label>.png and attaches it to the HTML report.
 *
 * Usage:
 *   await step(page, 'open login page', async () => { await page.goto('/login'); });
 */
export async function step(
  page: Page,
  label: string,
  body?: () => Promise<void>,
): Promise<void> {
  const testInfo = test.info();
  await test.step(label, async () => {
    if (body) await body();

    const dir = evidenceDir(testInfo);
    const existing = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).length;
    const index = String(existing + 1).padStart(2, '0');
    const file = path.join(dir, `${index}-${slug(label)}.png`);

    const buffer = await page.screenshot({ fullPage: true });
    fs.writeFileSync(file, buffer);

    await testInfo.attach(`${index} - ${label}`, {
      body: buffer,
      contentType: 'image/png',
    });
  });
}

/**
 * Write a free-form note (e.g. URL, expected behavior) into the evidence folder
 * and attach it to the HTML report.
 */
export async function note(label: string, content: string): Promise<void> {
  const testInfo = test.info();
  const dir = evidenceDir(testInfo);
  const file = path.join(dir, `${slug(label)}.txt`);
  fs.writeFileSync(file, content);
  await testInfo.attach(label, { body: content, contentType: 'text/plain' });
}
