// A self-hosted Playwright server or grid (e.g. `npx playwright run-server --port 3000` in a container next to the
// site). PW_WS_ENDPOINT is its address, e.g. ws://playwright-server:3000/. The browser engine is the project's
// (BROWSERS); the server must run the same Playwright version as this framework.
import type { CloudProvider } from './index';
import { setting } from './settings';

export const selfhosted: CloudProvider = {
  name: 'selfhosted',
  browserKind: () => undefined,
  endpoint: () => setting('PW_WS_ENDPOINT'),
};
