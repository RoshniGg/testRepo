// LambdaTest (renamed TestMu AI in January 2026; the technical names still say "lambdatest").
// Settings (CI secrets and variables, never in code):
//   LT_USERNAME, LT_ACCESS_KEY  credentials (secrets)
//   LT_BROWSER                  Chrome (default), MicrosoftEdge, pw-chromium, pw-firefox or pw-webkit
//   LT_PLATFORM                 e.g. "Windows 11" (default), "macOS Sequoia"
//   LT_TUNNEL_NAME              name of a running LambdaTest tunnel, for a site that is not on the internet
// Endpoints and capability names change: check https://www.lambdatest.com/support/docs/playwright-testing/ before
// an upgrade, and pin @playwright/test to a version the grid supports. Keep every provider detail in this file.
import type { Page, TestInfo } from '@playwright/test';
import type { BrowserKind, CloudProvider } from './index';
import { buildName, setting } from './settings';
import { redact } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- the client version the grid must match
const clientVersion: string = require('@playwright/test/package.json').version;

function browser(): string {
  return process.env.LT_BROWSER || 'Chrome';
}

export const lambdatest: CloudProvider = {
  name: 'lambdatest',

  browserKind(): BrowserKind {
    const b = browser().toLowerCase();
    return b.includes('firefox') ? 'firefox' : b.includes('webkit') ? 'webkit' : 'chromium';
  },

  endpoint(testInfo: TestInfo): string {
    const capabilities = {
      browserName: browser(),
      browserVersion: process.env.LT_BROWSER_VERSION || 'latest',
      'LT:Options': {
        platform: process.env.LT_PLATFORM || 'Windows 11',
        build: process.env.LT_BUILD || buildName(),
        name: testInfo.titlePath.slice(1).join(' › '),
        user: setting('LT_USERNAME'),
        accessKey: setting('LT_ACCESS_KEY'),
        video: true,
        network: true,
        console: true,
        tunnel: !!process.env.LT_TUNNEL_NAME,
        tunnelName: process.env.LT_TUNNEL_NAME,
        playwrightClientVersion: clientVersion,
      },
    };
    // The address carries the access key: never log it (the logger and CI secret masking hide it).
    return `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`;
  },

  async reportStatus(page: Page, testInfo: TestInfo): Promise<void> {
    if (testInfo.status === 'skipped') return;
    const status = testInfo.status === testInfo.expectedStatus ? 'passed' : 'failed';
    const remark = redact((testInfo.error?.message ?? status).split('\n')[0]).slice(0, 250);
    const action = { action: 'setTestStatus', arguments: { status, remark } };
    await page.evaluate(() => {}, `lambdatest_action: ${JSON.stringify(action)}`);
  },
};
