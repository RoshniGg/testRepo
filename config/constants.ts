// Timeouts in milliseconds, shared by the configuration and the page objects.
export const TIMEOUTS = {
  test: 120_000,
  expect: 10_000,
  action: 15_000,
  navigation: 30_000,
} as const;
