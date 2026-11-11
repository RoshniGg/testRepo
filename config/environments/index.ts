// The environment the tests run against: TEST_ENV names one of the *.env.json files in this folder (default:
// qa). Switching environment needs no code change: TEST_ENV=staging npx playwright test.
// The file is checked when it is read, so a missing or mistyped setting fails at start-up, not in the middle of a run.
import * as fs from 'fs';
import * as path from 'path';

export interface Environment {
  name: string;
  baseURL: string;
  /** Hosts the tests may reach; every other request is blocked (see src/fixtures/ra). */
  allowedHosts: string[];
  /** The attribute getByTestId reads, when the site does not use data-testid (e.g. "data-test", "data-qa"). */
  testIdAttribute?: string;
}

export const DEFAULT_ENV = 'qa';

export function environmentNames(): string[] {
  return fs.readdirSync(__dirname).filter((f) => f.endsWith('.env.json')).map((f) => f.replace(/\.env\.json$/, ''));
}

function validate(value: unknown, file: string): Environment {
  const problems: string[] = [];
  const env = (value ?? {}) as Record<string, unknown>;
  if (typeof env.name !== 'string' || !env.name) problems.push('"name" must be a non-empty text');
  if (typeof env.baseURL !== 'string' || !/^https?:\/\/[^/\s]+/.test(env.baseURL)) {
    problems.push('"baseURL" must be an http(s) address');
  }
  if (!Array.isArray(env.allowedHosts) || !env.allowedHosts.every((h) => typeof h === 'string' && h)) {
    problems.push('"allowedHosts" must be a list of host names');
  }
  if (env.testIdAttribute !== undefined && (typeof env.testIdAttribute !== 'string' || !/^[a-z][a-z0-9-]*$/.test(env.testIdAttribute))) {
    problems.push('"testIdAttribute" must be an attribute name such as "data-test"');
  }
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}.`);
  return env as unknown as Environment;
}

export function environment(name = process.env.TEST_ENV || DEFAULT_ENV): Environment {
  const file = path.join(__dirname, `${name}.env.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No environment "${name}": use one of ${environmentNames().join(', ')} (TEST_ENV).`);
  }
  const env = validate(JSON.parse(fs.readFileSync(file, 'utf8')), file);
  // The request guard reads the allowed hosts from RA_ALLOWED_HOSTS; the app sets it, CI gets it from here.
  if (!process.env.RA_ALLOWED_HOSTS) process.env.RA_ALLOWED_HOSTS = JSON.stringify(env.allowedHosts);
  if (!process.env.TEST_ENV) process.env.TEST_ENV = name;
  return env;
}
