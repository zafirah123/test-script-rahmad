/**
 * Upload evidence/ to Cloudflare R2 and rewrite evidence/REPORT.md so its
 * image references point at the public R2 URLs.
 *
 *   npm run evidence:upload
 *
 * Required env (loaded from .env):
 *   R2_ACCOUNT_ID
 *   R2_BUCKET
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_PUBLIC_BASE     e.g. https://storage.dinoza.store
 *   R2_PREFIX          optional, defaults to "pandai-e2e"
 *
 * Each upload goes under: <R2_PREFIX>/<run-id>/<relative-path-from-evidence>
 * where <run-id> is a timestamp of the upload, so reports never overwrite each
 * other. Pass --reuse <run-id> to upload into an existing run folder.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

dotenv.config();

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const REPORT = path.join(EVIDENCE, 'REPORT.md');

interface Args {
  reuse?: string;
  dir?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--reuse' && argv[i + 1]) {
      out.reuse = argv[i + 1];
      i++;
    } else if (argv[i] === '--dir' && argv[i + 1]) {
      out.dir = argv[i + 1];
      i++;
    }
  }
  return out;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif':  return 'image/gif';
    case '.webp': return 'image/webp';
    case '.webm': return 'video/webm';
    case '.mp4':  return 'video/mp4';
    case '.zip':  return 'application/zip';
    case '.json': return 'application/json';
    case '.html': return 'text/html; charset=utf-8';
    case '.md':   return 'text/markdown; charset=utf-8';
    case '.txt':  return 'text/plain; charset=utf-8';
    case '.css':  return 'text/css; charset=utf-8';
    case '.js':   return 'application/javascript; charset=utf-8';
    case '.svg':  return 'image/svg+xml';
    case '.ico':  return 'image/x-icon';
    default:      return 'application/octet-stream';
  }
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  if (!fs.existsSync(EVIDENCE)) {
    throw new Error('evidence/ does not exist — run `npm test` first');
  }

  const accountId = requireEnv('R2_ACCOUNT_ID');
  const bucket    = requireEnv('R2_BUCKET');
  const accessKey = requireEnv('R2_ACCESS_KEY_ID');
  const secretKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const publicBase = requireEnv('R2_PUBLIC_BASE').replace(/\/+$/, '');
  const prefix     = (process.env.R2_PREFIX ?? 'pandai-e2e').replace(/^\/+|\/+$/g, '');

  const args = parseArgs(process.argv.slice(2));
  const runId = args.reuse
    ?? new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const runPrefix = `${prefix}/${runId}`;

  // Optional subdirectory of evidence/ to upload (e.g. a single scenario).
  let scanRoot = EVIDENCE;
  let keyBase = ''; // path inside runPrefix where the files land
  if (args.dir) {
    const abs = path.isAbsolute(args.dir) ? args.dir : path.resolve(ROOT, args.dir);
    if (!fs.existsSync(abs)) {
      throw new Error(`--dir not found: ${abs}`);
    }
    // Make sure the directory lives under evidence/
    const insideEvidence = path.relative(EVIDENCE, abs);
    if (insideEvidence.startsWith('..') || path.isAbsolute(insideEvidence)) {
      throw new Error(`--dir must be inside evidence/ (got ${abs})`);
    }
    scanRoot = abs;
    keyBase = insideEvidence.split(path.sep).join('/');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  const files = await walk(scanRoot);
  const targetPrefix = keyBase ? `${runPrefix}/${keyBase}` : runPrefix;
  console.log(`Uploading ${files.length} files to r2://${bucket}/${targetPrefix}/ …`);

  // Map local-relative path → public URL, used to rewrite REPORT.md afterwards.
  const urlMap = new Map<string, string>();
  let uploaded = 0;
  for (const file of files) {
    const relToScan = path.relative(scanRoot, file).split(path.sep).join('/');
    const relToEvidence = path.relative(EVIDENCE, file).split(path.sep).join('/');
    const key = keyBase
      ? `${runPrefix}/${keyBase}/${relToScan}`
      : `${runPrefix}/${relToScan}`;
    const body = fs.readFileSync(file);
    const cmd: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType(file),
    };
    await client.send(new PutObjectCommand(cmd));
    const url = `${publicBase}/${key}`;
    urlMap.set(relToEvidence, url);
    uploaded++;
    if (uploaded % 25 === 0 || uploaded === files.length) {
      console.log(`  ${uploaded}/${files.length} uploaded`);
    }
  }

  // If we only uploaded a sub-folder, print a quick file listing.
  if (args.dir) {
    console.log('\nUploaded files:');
    for (const url of urlMap.values()) console.log(`  ${url}`);
  }

  // Rewrite REPORT.md → REPORT.r2.md with image links pointing at R2.
  // Only meaningful when uploading the whole evidence/ tree.
  if (!args.dir && fs.existsSync(REPORT)) {
    let md = fs.readFileSync(REPORT, 'utf8');
    md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
      // Skip absolute URLs.
      if (/^[a-z]+:\/\//i.test(src)) return m;
      const normalized = src.split('/').join('/');
      const url = urlMap.get(normalized);
      return url ? `![${alt}](${url})` : m;
    });
    const out = path.join(EVIDENCE, 'REPORT.r2.md');
    fs.writeFileSync(out, md);
    // Also upload the rewritten report.
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${runPrefix}/REPORT.r2.md`,
      Body: md,
      ContentType: 'text/markdown; charset=utf-8',
    }));
    console.log(`\nReport with R2 URLs: ${path.relative(ROOT, out)}`);
    console.log(`Public URL:          ${publicBase}/${runPrefix}/REPORT.r2.md`);
    const indexHtmlUrl = `${publicBase}/${runPrefix}/html-report/index.html`;
    console.log(`HTML report:         ${indexHtmlUrl}`);
  }

  console.log(`\nRun ID: ${runId}`);
  console.log(`Base:   ${publicBase}/${targetPrefix}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
