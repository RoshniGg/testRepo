// API helpers for test setup and teardown (seeding data is faster and steadier than clicking through the UI).
// Uses Playwright's request context, so it shares the base URL and the request guard of the tests.
import type { APIRequestContext } from '@playwright/test';

export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async getJson<T>(path: string): Promise<T> {
    const res = await this.request.get(path);
    if (!res.ok()) throw new Error(`GET ${path} answered ${res.status()}`);
    return (await res.json()) as T;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await this.request.post(path, { data: body });
    if (!res.ok()) throw new Error(`POST ${path} answered ${res.status()}`);
    return (await res.json()) as T;
  }
}
