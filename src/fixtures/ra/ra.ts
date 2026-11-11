// The only module a saved script may import: `import { test, expect, step, account } from './ra';`
//
// - test:    Playwright's test, with a guard that blocks every request to a host outside the environment's
//            hosts (RA_ALLOWED_HOSTS) and records it, so a script can never wander off to another site.
// - step:    one test-case step: runs it as a Playwright step and attaches a screenshot afterwards (evidence).
// - account: the login of a named account, from the runner's environment. Scripts never contain passwords.
// - Test data shared with later tests of the same run (only when this test passes):
//     saveAccount('newUser', { username, password }) -> account('newUser') in a later test (password stays secret)
//     save('orderNo', '12345')                       -> data('orderNo') in a later test
//     unique('qa.user', '@yopmail.com')              -> a fresh value on every run (e.g. a new user's email)
//   A test that needs data no earlier test saved is marked blocked, not failed.
// Live view: when RA_LIVE_DIR is set (by the server), the browser's screen is streamed there (latest.jpg, every time
// the page repaints) and step events are appended to events.jsonl, for the app's live preview. cursor.js (next to
// this file) draws the mouse pointer, click ripples and the field being typed into, since headless has no pointer.
import * as fs from 'fs';
import * as path from 'path';
import { test as base, expect, type Page } from '@playwright/test';

type Login = { username: string; password: string };

const allowed: string[] = JSON.parse(process.env.RA_ALLOWED_HOSTS || '[]');
const liveDir = process.env.RA_LIVE_DIR;

function hostAllowed(host: string): boolean {
  host = host.toLowerCase();
  return allowed.some((p) => (p.startsWith('*.') ? host === p.slice(2) || host.endsWith(p.slice(1)) : host === p));
}

function liveEvent(text: string) {
  if (!liveDir) return;
  try { fs.appendFileSync(path.join(liveDir, 'events.jsonl'), JSON.stringify({ text }) + '\n'); } catch { /* best effort */ }
}

function liveFrame(data: Buffer) {
  if (!liveDir) return;
  const tmp = path.join(liveDir, `frame-${process.pid}.tmp`);
  try { fs.writeFileSync(tmp, data); fs.renameSync(tmp, path.join(liveDir, 'latest.jpg')); } catch { /* being read: skip */ }
}

const cursorJs = path.join(__dirname, 'cursor.js');

let stepNo = 0;      // numbering of step() screenshots, restarted for every test by the guard

export const test = base.extend<{ guard: void; live: void }>({
  guard: [async ({ context }, use, testInfo) => {
    stepNo = 0;
    if (fs.existsSync(cursorJs)) await context.addInitScript({ path: cursorJs });
    const blocked: string[] = [];
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !hostAllowed(url.hostname)) {
        blocked.push(url.hostname);
        liveEvent(`Blocked a request to ${url.hostname} (not one of this environment's hosts)`);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await use();
    if (blocked.length) {
      await testInfo.attach('blocked-hosts', { body: [...new Set(blocked)].join('\n'), contentType: 'text/plain' });
    }
  }, { auto: true }],

  live: [async ({ page }, use, testInfo) => {
    if (!liveDir) { await use(); return; }
    liveEvent(`Started: ${testInfo.title}`);
    // Chrome's screencast sends a frame whenever the page repaints (smooth, shows the pointer moving).
    let cdp: any = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      cdp = await page.context().newCDPSession(page);
      cdp.on('Page.screencastFrame', (f: { data: string; sessionId: number }) => {
        liveFrame(Buffer.from(f.data, 'base64'));
        cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 1366, maxHeight: 900, everyNthFrame: 1 });
    } catch {
      cdp = null;                                  // fall back to a screenshot about once a second
      let busy = false;
      timer = setInterval(() => {
        if (busy) return;
        busy = true;
        page.screenshot({ type: 'jpeg', quality: 50, timeout: 3000 }).then(liveFrame).catch(() => {}).finally(() => { busy = false; });
      }, 1000);
    }
    try {
      await use();
    } finally {
      if (timer) clearInterval(timer);
      if (cdp) await cdp.send('Page.stopScreencast').catch(() => {});
      liveEvent(`Finished: ${testInfo.status === 'passed' ? 'passed' : testInfo.status === 'skipped' ? 'skipped' : 'failed'}`);
    }
  }, { auto: true }],
});

export { expect };

/** One step of the test case. A screenshot is attached after it, also when it fails. */
export async function step<T>(page: Page, title: string, body: () => Promise<T>): Promise<T> {
  const no = ++stepNo;
  return test.step(title, async () => {
    liveEvent(`▶ ${title}`);
    // Single-page apps attach their handlers after loading: a click before that does nothing (or submits the
    // bare form). Wait until the network is quiet first (max 10 s; pages that never go quiet just continue).
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    let ok = false;
    try {
      const out = await body();
      ok = true;
      return out;
    } finally {
      liveEvent(`${ok ? '✓' : '✗'} ${title}`);
      try {
        const shot = await page.screenshot({ type: 'jpeg', quality: 60, timeout: 5000 });
        liveFrame(shot);
        await test.info().attach(`step-${no}|${title}`, { body: shot, contentType: 'image/jpeg' });
      } catch { /* the page may be gone: no screenshot */ }
    }
  });
}

// ---- Test data shared between the tests of a run --------------------------------------------------------------

const envAccounts: Record<string, Login> = JSON.parse(process.env.RA_ACCOUNTS || '{}');
const shared: { values: Record<string, string>; accounts: Record<string, Login> } =
  JSON.parse(process.env.RA_DATA || '{"values":{},"accounts":{}}');
const MISSING = 'RA-MISSING-DATA';        // the runner turns this error into "blocked"
const DATA_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

function findKey(obj: Record<string, unknown>, name: string): string | undefined {
  return Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase());
}

function record(entry: Record<string, string>) {
  const out = process.env.RA_DATA_OUT;
  if (out) fs.appendFileSync(out, JSON.stringify({ file: path.basename(test.info().file), ...entry }) + '\n');
}

function checkName(name: string) {
  if (!DATA_NAME.test(name)) throw new Error(`Test data names start with a letter and use letters, digits, _ . - (got "${name}").`);
}

/** The login of an account: one of the environment's, or one an earlier test of this run saved ('default' when no name is given). */
export function account(name = 'default'): Login {
  const key = findKey(envAccounts, name);
  if (key) return envAccounts[key];
  const saved = findKey(shared.accounts, name);
  if (saved) return shared.accounts[saved];
  throw new Error(`${MISSING}: Needs the account "${name}": it is not an account of this environment and no earlier test in this run saved it.`);
}

/** Share a login (e.g. a user this test registered) with later tests of this run, as account(name). */
export function saveAccount(name: string, login: Login): void {
  checkName(name);
  if (findKey(envAccounts, name)) throw new Error(`"${name}" is an account of the environment: save the new login under another name.`);
  if (!login?.username) throw new Error(`saveAccount("${name}"): the username is empty.`);
  record({ kind: 'account', name, username: String(login.username), password: String(login.password ?? '') });
  shared.accounts[name] = { username: String(login.username), password: String(login.password ?? '') };
  liveEvent(`Saved the account "${name}" for later tests`);
}

/** Share a value (e.g. an order number) with later tests of this run, as data(name). */
export function save(name: string, value: string | number | boolean): void {
  checkName(name);
  const v = String(value);
  if (v.length > 2000) throw new Error(`save("${name}"): the value is longer than 2000 characters.`);
  record({ kind: 'value', name, value: v });
  shared.values[findKey(shared.values, name) ?? name] = v;
  liveEvent(`Saved the test data "${name}" for later tests`);
}

/** A value an earlier test of this run saved with save(name, ...). */
export function data(name: string): string {
  const key = findKey(shared.values, name);
  if (key === undefined) throw new Error(`${MISSING}: Needs the test data "${name}", which no earlier test in this run saved.`);
  return shared.values[key];
}

/** A value that is different on every run, e.g. unique('qa.user', '@yopmail.com') -> qa.user.20261007-142501-4f2a@yopmail.com */
export function unique(prefix = '', suffix = ''): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 6).padEnd(4, '0');
  return `${prefix}${prefix && !/[._-]$/.test(prefix) ? '.' : ''}${stamp}-${rand}${suffix}`;
}
