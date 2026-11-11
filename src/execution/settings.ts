// Settings shared by the cloud providers. Values come from the environment (CI secrets and variables).

/** A required setting; fails at start-up when it is missing, naming the variable but never a value. */
export function setting(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`EXECUTION_MODE=cloud needs the environment variable ${name}.`);
  return value;
}

/** "<branch> #<run>" in CI, so the sessions of one pipeline run are grouped on the provider's dashboard. */
export function buildName(): string {
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  return branch ? `${branch} #${process.env.GITHUB_RUN_NUMBER ?? ''}`.trim() : `local ${new Date().toISOString().slice(0, 16)}`;
}
