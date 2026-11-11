// Locators shared by every page (header, dialogs, messages). Order of preference: getByTestId (when the element has
// a test id) -> getByRole -> getByLabel -> getByText -> CSS (with a comment saying why). One definition per element,
// used everywhere.
import type { Page } from '@playwright/test';

export const commonLocators = (page: Page) => ({
  // CSS: the document body has no accessible role; it only tells that the page rendered.
  body: page.locator('body'),
  dialog: page.getByRole('dialog'),
  alert: page.getByRole('alert'),
});
