// Run configuration. The environment comes from TEST_ENV (see config/environments). When the Requirement Analyzer
// app runs the tests it sets RA_REPORT (and RA_OUTPUT_DIR, RA_VIDEO, RA_SLOW_MO) for its own results and live view;
// the app always runs Chromium locally.
//
// Settings (environment variables):
//   TEST_ENV         which config/environments/<name>.env.json to test
//   BROWSERS         local projects to run, comma separated (default chromium):
//                    chromium, firefox, webkit, mobile-chrome, mobile-safari. WebKit and the mobile projects are
//                    emulations; real Safari and real phones come from a cloud grid.
//   EXECUTION_MODE   local (default) or cloud, with CLOUD_PROVIDER (see src/execution)
//   RUN_QUARANTINE   1: also run tests tagged @quarantine, which CI otherwise leaves out of the gating run
import { defineConfig, devices, type Project } from '@playwright/test';
import { environment } from './config/environments';
import { TIMEOUTS } from './config/constants';
import { cloudProvider, executionMode } from './src/execution';

const env = environment();
const app = !!process.env.RA_REPORT;
const ci = !!process.env.CI;
const cloud = executionMode() === 'cloud';
const desktop = { viewport: { width: 1366, height: 900 } };

const BROWSERS: Record<string, Project['use']> = {
  chromium: { ...devices['Desktop Chrome'], ...desktop },
  firefox: { ...devices['Desktop Firefox'], ...desktop },
  webkit: { ...devices['Desktop Safari'], ...desktop },
  'mobile-chrome': { ...devices['Pixel 7'] },
  'mobile-safari': { ...devices['iPhone 15'] },
};

function projects(): Project[] {
  if (cloud && cloudProvider().browserKind()) return [{ name: cloudProvider().name, use: desktop }];
  const names = app ? ['chromium'] : (process.env.BROWSERS || 'chromium').split(',').map((b) => b.trim()).filter(Boolean);
  const unknown = names.filter((n) => !BROWSERS[n]);
  if (unknown.length) throw new Error(`BROWSERS: unknown ${unknown.join(', ')}; use ${Object.keys(BROWSERS).join(', ')}.`);
  return names.map((name) => ({ name, use: BROWSERS[name] }));
}

export default defineConfig({
  testDir: './tests',
  outputDir: process.env.RA_OUTPUT_DIR || 'test-results',
  timeout: TIMEOUTS.test,
  expect: { timeout: TIMEOUTS.expect },
  fullyParallel: false,
  workers: app ? 1 : ci ? 2 : 1,
  // Retries collect evidence: a test that passes only on retry is reported as flaky, never as passed.
  retries: app ? 0 : ci ? 1 : 0,
  forbidOnly: ci,
  // Quarantined tests (@quarantine, with owner, ticket and end date) run in CI's separate, non-blocking step.
  grepInvert: ci && !app && !process.env.RUN_QUARANTINE ? /@quarantine/ : undefined,
  reporter: app
    ? [['json', { outputFile: process.env.RA_REPORT }]]
    : [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: process.env.BASE_URL || env.baseURL,
    testIdAttribute: env.testIdAttribute || 'data-testid',
    headless: true,
    trace: app ? 'on' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: { mode: (process.env.RA_VIDEO as 'on' | 'retain-on-failure') || 'retain-on-failure', size: { width: 1366, height: 900 } },
    launchOptions: { slowMo: Number(process.env.RA_SLOW_MO || 0) },
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
    viewport: desktop.viewport,
  },
  projects: projects(),
});
