// The framework's own check: the environment's site opens. Generated tests go into tests/<module>/ next to it.
import { test, step } from '../../src/fixtures';

test.describe('Smoke', () => {
  test('Smoke: the site opens @smoke', async ({ page, home }) => {
    await step(page, '1. Open the site', async () => {
      await home.goto();
    });
    await step(page, 'Expected: the start page is shown', async () => {
      await home.expectLoaded();
    });
  });
});
