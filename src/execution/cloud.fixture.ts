// EXECUTION_MODE=cloud: replaces Playwright's `context` fixture so that every test connects to its own browser
// session on the cloud provider (one session per test: its own video, status and link on the provider's dashboard).
// Everything built on the context keeps working: page, the request guard of src/fixtures/ra, step screenshots.
// Locally this is empty and Playwright launches the browsers itself.
import type {
  Fixtures, PlaywrightTestArgs, PlaywrightTestOptions, PlaywrightWorkerArgs, PlaywrightWorkerOptions,
} from '@playwright/test';
import { TIMEOUTS } from '../../config/constants';
import { cloudProvider, executionMode } from './index';

type TestArgs = PlaywrightTestArgs & PlaywrightTestOptions;
type WorkerArgs = PlaywrightWorkerArgs & PlaywrightWorkerOptions;

const cloud: Fixtures<object, object, TestArgs, WorkerArgs> = {
  context: async ({ playwright, browserName, contextOptions, baseURL, viewport, locale, timezoneId, userAgent,
    deviceScaleFactor, isMobile, hasTouch, colorScheme, ignoreHTTPSErrors, extraHTTPHeaders, permissions,
    geolocation, storageState, httpCredentials, acceptDownloads }, use, testInfo) => {
    const provider = cloudProvider();
    const kind = provider.browserKind() ?? browserName;
    const browser = await playwright[kind].connect(provider.endpoint(testInfo), { timeout: TIMEOUTS.navigation });
    const context = await browser.newContext({
      ...contextOptions, baseURL, viewport, locale, timezoneId, userAgent, deviceScaleFactor, isMobile, hasTouch,
      colorScheme, ignoreHTTPSErrors, extraHTTPHeaders, permissions, geolocation, storageState, httpCredentials,
      acceptDownloads,
    });
    context.setDefaultTimeout(TIMEOUTS.action);
    context.setDefaultNavigationTimeout(TIMEOUTS.navigation);
    try {
      await use(context);
    } finally {
      const page = context.pages()[0];
      if (page && provider.reportStatus) {
        await provider.reportStatus(page, testInfo).catch(() => { /* the session may already be gone */ });
      }
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  },
};

/** The fixtures to add for the current EXECUTION_MODE (none when local). */
export const cloudFixtures: Fixtures<object, object, TestArgs, WorkerArgs> = executionMode() === 'cloud' ? cloud : {};
