// Test data per environment: loadData('users') reads src/data/<TEST_ENV>/users.json. ${NAME} placeholders are
// filled from environment variables (CI secrets), so no secret is ever stored in a data file.
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_ENV } from '../../config/environments';

const DATA = path.join(__dirname, '..', 'data');

function resolve(value: unknown, file: string): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => {
      const v = process.env[name];
      if (v === undefined) throw new Error(`${file} needs the environment variable ${name}.`);
      return v;
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolve(v, file));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, file)]));
  }
  return value;
}

export function loadData<T = Record<string, unknown>>(name: string, env = process.env.TEST_ENV || DEFAULT_ENV): T {
  const file = path.join(DATA, env, `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No test data ${name} for the environment ${env} (${file}).`);
  return resolve(JSON.parse(fs.readFileSync(file, 'utf8')), file) as T;
}
