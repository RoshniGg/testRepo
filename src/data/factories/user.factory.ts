// Dynamic test data: a fresh value on every run, for tests that create things (new users, orders).
import { unique } from '../../fixtures/ra/ra';

export function newUser(domain = 'example.com') {
  return { email: unique('qa.user', `@${domain}`), password: unique('Pw!') };
}
