// What every page object has: its address, opening it, and checking it loaded. Page objects expose business
// actions (login, createOrder); assertions live only in expect* methods. Locators come from src/locators/.
import { expect, type Page } from '@playwright/test';
import { commonLocators } from '../locators/common.locators';

export class BasePage {
  protected readonly common: ReturnType<typeof commonLocators>;

  constructor(protected readonly page: Page, readonly path: string) {
    this.common = commonLocators(page);
  }

  /** Open this page (the address is relative to the environment's base URL). */
  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** The page has rendered. Override with something specific to the page (e.g. its heading). */
  async expectLoaded(): Promise<void> {
    await expect(this.common.body).toBeVisible();
  }
}
