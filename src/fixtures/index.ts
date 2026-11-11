// The only module specs import from: `import { test, expect, step, account } from '../../src/fixtures';`
// - test:    Playwright's test with the page-object and data fixtures (base.fixture.ts)
// - step:    one test-case step, with a screenshot afterwards: await step(page, '1. Open the login page', async () => …)
// - account: a login from the environment (never in code): const admin = account('Admin')
// - save / saveAccount / data / unique: values shared between the tests of a run, and fresh unique values
export { test } from './base.fixture';
export { expect, step, account, save, saveAccount, data, unique } from './ra/ra';
