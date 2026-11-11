// Where the browser runs: EXECUTION_MODE=local (default) or cloud. Tests and page objects never know which; only
// this folder does, so moving from a laptop to a grid is one setting, not a code change.
// - local: Playwright starts the browsers of the projects in playwright.config.ts (BROWSERS=chromium,firefox,…).
// - cloud: every test gets its own browser session on the provider chosen by CLOUD_PROVIDER (lambdatest, default,
//   or selfhosted). Each provider sits in its own file behind CloudProvider, so changing provider touches one file.
// The Requirement Analyzer app always runs locally (it sets RA_REPORT).
import type { Page, TestInfo } from '@playwright/test';
import { lambdatest } from './lambdatest';
import { selfhosted } from './selfhosted';

export type BrowserKind = 'chromium' | 'firefox' | 'webkit';

export interface CloudProvider {
  /** Shown as the project name in reports. */
  name: string;
  /** The browser engine to connect with; undefined: the project's browser (BROWSERS). */
  browserKind(): BrowserKind | undefined;
  /** WebSocket address of a new browser session for this test. */
  endpoint(testInfo: TestInfo): string;
  /** Tell the provider whether the test passed (otherwise its dashboard only says "completed"). */
  reportStatus?(page: Page, testInfo: TestInfo): Promise<void>;
}

const PROVIDERS: Record<string, CloudProvider> = { lambdatest, selfhosted };

export function executionMode(): 'local' | 'cloud' {
  if (process.env.RA_REPORT) return 'local';
  const mode = (process.env.EXECUTION_MODE || 'local').toLowerCase();
  if (mode !== 'local' && mode !== 'cloud') throw new Error(`EXECUTION_MODE must be local or cloud, not "${mode}".`);
  return mode;
}

export function cloudProvider(): CloudProvider {
  const name = (process.env.CLOUD_PROVIDER || 'lambdatest').toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`CLOUD_PROVIDER must be one of ${Object.keys(PROVIDERS).join(', ')}, not "${name}".`);
  return provider;
}

export { setting, buildName } from './settings';
