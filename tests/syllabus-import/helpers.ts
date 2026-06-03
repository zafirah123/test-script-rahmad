import { type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const FIXTURES_DIR = path.join(__dirname, '..', '..', 'evidence', '_fixtures');

export function createExcelFile(filename: string, headers: string[], rows: any[][]): string {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const filePath = path.join(FIXTURES_DIR, filename);
  XLSX.writeFile(wb, filePath);
  return filePath;
}

export const CHAPTER_HEADERS = [
  'chapter_code', 'chapter_name', 'chapter_name_l2', 'chapter_name_l3',
  'short_chapter_name', 'short_chapter_name_l2', 'short_chapter_name_l3',
  'lesson_title', 'lesson_title_l2', 'lesson_title_l3',
  'overview', 'overview_l2', 'overview_l3',
  'status_lp', 'status_teacher', 'status_student', 'image',
];

export const TOPIC_HEADERS = [
  'chapter_code', 'topic_code', 'dskp_code', 'parent_topic_code',
  'topic_name', 'topic_name_l2', 'topic_name_l3',
  'short_topic_name', 'short_topic_name_l2', 'short_topic_name_l3',
  'classroom_activities', 'classroom_activities_l2', 'classroom_activities_l3',
  'status_lp', 'status_teacher', 'status_student',
];

export function chapterRow(code: string, name: string, opts?: {
  statusLp?: string; statusTeacher?: string; statusStudent?: string;
}): any[] {
  return [
    code, name, '', '', '', '', '',
    '', '', '', '', '', '',
    opts?.statusLp ?? 'Active', opts?.statusTeacher ?? 'Active', opts?.statusStudent ?? 'Active',
    '',
  ];
}

export function topicRow(chapterCode: string, topicCode: string, dskpCode: string, opts?: {
  parentTopicCode?: string; topicName?: string;
  statusLp?: string; statusTeacher?: string; statusStudent?: string;
}): any[] {
  return [
    chapterCode, topicCode, dskpCode, opts?.parentTopicCode ?? '',
    opts?.topicName ?? `Topic ${topicCode}`, '', '',
    '', '', '',
    '', '', '',
    opts?.statusLp ?? 'Active', opts?.statusTeacher ?? 'Active', opts?.statusStudent ?? 'Active',
  ];
}

export async function selectSelect2(page: Page, selectName: string, optionIndex: number): Promise<void> {
  // Wait for the native select to have real options (AJAX-populated selects start empty)
  await page.waitForFunction(
    (name: string) => {
      const sel = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!sel) return false;
      const opts = Array.from(sel.options).filter(o => o.value && o.value !== '' && o.value !== '0');
      return opts.length > 0;
    },
    selectName,
    { timeout: 10_000 }
  ).catch(() => {});

  // Get the real option values
  const optionValue = await page.evaluate(
    ({ name, idx }) => {
      const sel = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!sel) return null;
      const realOpts = Array.from(sel.options).filter(o => o.value && o.value !== '' && o.value !== '0');
      if (realOpts.length <= idx) return null;
      return realOpts[idx].value;
    },
    { name: selectName, idx: optionIndex }
  );

  if (!optionValue) return;

  // Use Playwright's native selectOption which properly sets the value
  await page.selectOption(`select[name="${selectName}"]`, optionValue);
  await page.waitForTimeout(300);

  // Also invoke the onchange handler function directly
  await page.evaluate(
    ({ name, val }) => {
      const sel = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!sel) return;
      const onchange = sel.getAttribute('onchange');
      if (onchange) {
        try {
          const fnMatch = onchange.match(/^(\w+)\(this\.value\)$/);
          if (fnMatch && typeof (window as any)[fnMatch[1]] === 'function') {
            (window as any)[fnMatch[1]](val);
          }
        } catch (e) { /* ignore */ }
      }
    },
    { name: selectName, val: optionValue }
  );

  // Wait for any AJAX triggered by onchange to complete
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

export async function selectSyllabusKSSR(page: Page): Promise<void> {
  await selectSelect2ByValue(page, 'syllabus_id', '1');
}

export async function selectSelect2ByValue(page: Page, selectName: string, value: string): Promise<void> {
  await page.selectOption(`select[name="${selectName}"]`, value);
  await page.waitForTimeout(300);

  await page.evaluate(
    ({ name, val }) => {
      const sel = document.querySelector(`select[name="${name}"]`) as HTMLSelectElement | null;
      if (!sel) return;
      const onchange = sel.getAttribute('onchange');
      if (onchange) {
        try {
          const fnMatch = onchange.match(/^(\w+)\(this\.value\)$/);
          if (fnMatch && typeof (window as any)[fnMatch[1]] === 'function') {
            (window as any)[fnMatch[1]](val);
          }
        } catch (e) { /* ignore */ }
      }
    },
    { name: selectName, val: value }
  );

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}
