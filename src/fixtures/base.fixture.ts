// Playwright's `test`, extended with the page objects and test data, so test bodies stay short and declarative.
// It builds on src/fixtures/ra (blocks requests to hosts outside the environment, records step screenshots and the
// live view, gives logins without putting passwords in code) and on src/execution (a cloud browser per test when
// EXECUTION_MODE=cloud). Add a fixture here for every new page object.
import { test as ra } from './ra/ra';
import { cloudFixtures } from '../execution/cloud.fixture';
import { BasePage } from '../pages/BasePage';
import { loadData } from '../utils/dataLoader';

type Fixtures = {
  /** The site's start page. */
  home: BasePage;
  /** Test data of the current environment: testData('users') reads src/data/<env>/users.json. */
  testData: typeof loadData;
};

export const test = ra.extend(cloudFixtures).extend<Fixtures>({
  home: async ({ page }, use) => use(new BasePage(page, '/')),
  testData: async ({}, use) => use(loadData),
});
