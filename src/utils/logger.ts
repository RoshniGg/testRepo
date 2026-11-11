// A small logger for helpers and page objects; test steps themselves are reported by step() (src/fixtures).
// Everything it writes goes through redact(), so a password, token or access key never reaches a log or a report.

function secretValues(): string[] {
  const values: string[] = [];
  try {
    const accounts = JSON.parse(process.env.RA_ACCOUNTS || '{}') as Record<string, { password?: unknown }>;
    for (const a of Object.values(accounts)) if (a && typeof a.password === 'string') values.push(a.password);
  } catch { /* not JSON: nothing to hide from it */ }
  for (const name of ['LT_ACCESS_KEY']) if (process.env[name]) values.push(process.env[name] as string);
  return values.filter((v) => v.length >= 4);
}

/** The text with known secrets, bearer tokens and password/token/key values replaced by ***. */
export function redact(text: string): string {
  let out = text;
  for (const value of secretValues()) {
    out = out.split(value).join('***').split(encodeURIComponent(value)).join('***');
  }
  return out
    .replace(/(bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1***')
    .replace(/((?:password|passwd|token|secret|access_?key|authorization)"?\s*[:=]\s*"?(?:bearer\s+)?)[^"\s,&}]+/gi, '$1***');
}

export const logger = {
  info: (message: string) => console.log(`[info] ${redact(message)}`),
  warn: (message: string) => console.warn(`[warn] ${redact(message)}`),
};
