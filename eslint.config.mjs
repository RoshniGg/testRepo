// Lint rules, including the framework's conventions (see README.md):
// - no fixed waits and no page.pause() anywhere; no forgotten `await` (a floating promise races the test);
// - specs (tests/) and page objects (src/pages, src/components) never create locators: they live in src/locators/;
// - specs import test and expect only from src/fixtures;
// - no test.only, and no test switched off to get a green build (skip/fixme): fix it or quarantine it;
// - a quarantined test (@quarantine) names its owner, ticket and end date, and fails lint once that date has passed.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const noFixedWaits = {
  selector: "CallExpression[callee.property.name='waitForTimeout']",
  message: 'No fixed waits: rely on Playwright auto-waiting and web-first assertions (expect).',
};
const noPause = {
  selector: "CallExpression[callee.property.name='pause']",
  message: 'Remove page.pause(): it stops the run waiting for a person.',
};
const noOnly = {
  selector: "CallExpression[callee.property.name='only']",
  message: 'Remove .only: it silently drops every other test from the run.',
};
const noLocators = {
  selector: "CallExpression[callee.property.name=/^(locator|getByRole|getByLabel|getByText|getByTestId|getByPlaceholder|getByAltText|getByTitle)$/]",
  message: 'Declare locators in src/locators/ and use them through page objects.',
};
const fixturesOnly = {
  selector: "ImportDeclaration[source.value='@playwright/test']",
  message: 'Import test and expect from src/fixtures.',
};
const switchedOff =
  'Do not switch a test off to get a green build: fix it, or quarantine it (@quarantine with owner, ticket and end ' +
  "date). A skip with a real condition and reason, test.skip(browserName === 'webkit', 'why'), is allowed.";
const noFixme = { selector: "CallExpression[callee.property.name='fixme']", message: switchedOff };
const noSkip = [
  "CallExpression[callee.property.name='skip'][arguments.length=0]",               // test.skip() inside a test
  "CallExpression[callee.property.name='skip'][arguments.0.type='Literal']",       // test.skip('title', …) or skip(true)
  "CallExpression[callee.property.name='skip'][arguments.0.type='TemplateLiteral']",
].map((selector) => ({ selector, message: switchedOff }));
const everywhere = [noFixedWaits, noPause, noOnly];

// --- @quarantine: owner, ticket and end date, checked against today's date ---
const QUARANTINE_FORMAT = "annotation: { type: 'quarantine', description: 'owner: <name>; ticket: <id>; until: YYYY-MM-DD' }";

function text(node) {
  if (!node) return '';
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') return node.quasis.map((q) => q.value.cooked).join('');
  if (node.type === 'ArrayExpression') return node.elements.map(text).join(' ');
  return '';
}

function property(obj, name) {
  if (obj?.type !== 'ObjectExpression') return undefined;
  return obj.properties.find((p) => p.type === 'Property' && (p.key.name ?? p.key.value) === name)?.value;
}

const quarantineRule = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      CallExpression(node) {
        const callee = node.callee;
        const onTest = callee.type === 'Identifier' ? callee.name === 'test'
          : callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'test';
        if (!onTest) return;
        const [title, details] = node.arguments;
        if (!`${text(title)} ${text(property(details, 'tag'))}`.includes('@quarantine')) return;
        const annotations = property(details, 'annotation');
        const list = annotations?.type === 'ArrayExpression' ? annotations.elements : [annotations];
        const note = list.find((a) => text(property(a, 'type')) === 'quarantine');
        const description = text(property(note, 'description'));
        const owner = /owner:\s*[^;\s]+/i.test(description);
        const ticket = /ticket:\s*[^;\s]+/i.test(description);
        const until = /until:\s*(\d{4}-\d{2}-\d{2})/i.exec(description)?.[1];
        if (!owner || !ticket || !until) {
          context.report({ node, message: `A quarantined test needs its owner, ticket and end date: ${QUARANTINE_FORMAT}.` });
        } else if (until < today) {
          context.report({ node, message: `The quarantine ended on ${until}: fix the test and remove @quarantine, or agree a new date in the ticket.` });
        }
      },
    };
  },
};

export default tseslint.config(
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'src/fixtures/ra/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  // Playwright fixtures that need no other fixture are written `async ({}, use) => …`.
  { rules: { 'no-restricted-syntax': ['error', ...everywhere], 'no-empty-pattern': 'off' } },
  { files: ['src/pages/**/*.ts', 'src/components/**/*.ts'], rules: { 'no-restricted-syntax': ['error', ...everywhere, noLocators] } },
  {
    files: ['tests/**/*.ts'],
    plugins: { framework: { rules: { quarantine: quarantineRule } } },
    rules: {
      'no-restricted-syntax': ['error', ...everywhere, noLocators, fixturesOnly, noFixme, ...noSkip],
      'framework/quarantine': 'error',
    },
  },
);
