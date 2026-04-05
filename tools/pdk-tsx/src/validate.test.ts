import fc from 'fast-check';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import type { ValidationResult } from './types';

import { ParseError, parseScreen } from './parse';
import { validateScreen } from './validate';

const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../test/fixtures',
);

const fixture = (name: string) => {
  const path = resolve(fixturesDir, name);

  return { content: readFileSync(path, 'utf8'), path };
};

function parseAndValidate(
  source: string,
  filename = 'test.tsx',
): ValidationResult {
  const parsed = parseScreen(source, filename);

  return validateScreen(parsed);
}

function expectValid(source: string): void {
  const result = parseAndValidate(source);
  if (!result.valid) {
    throw new Error(
      `Expected valid, got errors:\n${result.errors.map((e) => `  ${e.file}:${e.line}:${e.col} — ${e.message}`).join('\n')}`,
    );
  }

  expect(result.valid).toBe(true);
}

function expectInvalid(
  source: string,
  messagePattern?: RegExp,
): ValidationResult & { valid: false } {
  const result = parseAndValidate(source);
  expect(result.valid).toBe(false);

  if (result.valid === false && messagePattern) {
    const hasMatch = result.errors.some((e) => messagePattern.test(e.message));
    if (!hasMatch) {
      throw new Error(
        `Expected error matching ${messagePattern}, got:\n${result.errors.map((e) => `  ${e.message}`).join('\n')}`,
      );
    }
  }

  return result as ValidationResult & { valid: false };
}

// Helper to wrap JSX in a valid component
const wrap = (jsx: string, props = '', typeDecl = '') =>
  `${typeDecl}\nexport function TestScreen(${props}) { return (\n${jsx}\n); }`;

const screen = (children: string) =>
  wrap(`<Screen border="standard">${children}</Screen>`);

const layout = (children: string, attrs = 'y={0}') =>
  screen(`<Layout ${attrs}>${children}</Layout>`);

describe('validateScreen', () => {
  describe('fixture validation', () => {
    const fixtureNames = [
      'ConfirmNewGame.tsx',
      'TitleScreen.tsx',
      'TournamentVictory.tsx',
      'ScoreBoard.tsx',
      'LoreScreen.tsx',
    ];

    for (const name of fixtureNames) {
      it(`validates ${name}`, () => {
        const { content, path } = fixture(name);
        const parsed = parseScreen(content, path);
        const result = validateScreen(parsed);

        if (!result.valid) {
          throw new Error(
            `Expected ${name} to be valid, got errors:\n${result.errors.map((e) => `  ${e.file}:${e.line}:${e.col} — ${e.message}`).join('\n')}`,
          );
        }

        expect(result.valid).toBe(true);
      });
    }
  });

  describe('supported constructs', () => {
    it('accepts function component with typed props', () => {
      expectValid(
        `type Props = { score: number };\nexport function TestScreen({ score }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{score}</Text></Layout></Screen>); }`,
      );
    });

    it('accepts number props', () => {
      expectValid(
        `type Props = { n: number };\nexport function TestScreen({ n }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{n}</Text></Layout></Screen>); }`,
      );
    });

    it('accepts boolean props', () => {
      expectValid(
        `type Props = { flag: boolean };\nexport function TestScreen({ flag }: Props) { return (<Screen border="standard"><Layout y={0}>{flag && <Text>yes</Text>}</Layout></Screen>); }`,
      );
    });

    it('accepts string props', () => {
      expectValid(
        `type Props = { name: string };\nexport function TestScreen({ name }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{name}</Text></Layout></Screen>); }`,
      );
    });

    it('accepts string[] props', () => {
      expectValid(
        `type Props = { items: string[] };\nexport function TestScreen({ items }: Props) { return (<Screen border="standard"><Layout y={0}>{items.map((item, i) => <Text>{item}</Text>)}</Layout></Screen>); }`,
      );
    });

    it('accepts number[] props', () => {
      expectValid(
        `type Props = { scores: number[] };\nexport function TestScreen({ scores }: Props) { return (<Screen border="standard"><Layout y={0}>{scores.map((s, i) => <Text>{s}</Text>)}</Layout></Screen>); }`,
      );
    });

    it('accepts ternary expressions', () => {
      expectValid(
        `type Props = { active: boolean };\nexport function TestScreen({ active }: Props) { return (<Screen border="standard">{active ? <Layout y={0}><Text>on</Text></Layout> : <Layout y={0}><Text>off</Text></Layout>}</Screen>); }`,
      );
    });

    it('accepts logical AND', () => {
      expectValid(
        `type Props = { show: boolean };\nexport function TestScreen({ show }: Props) { return (<Screen border="standard"><Layout y={0}>{show && <Text>visible</Text>}</Layout></Screen>); }`,
      );
    });

    it('accepts .map() on arrays', () => {
      const src = `const labels = ['a', 'b'];\ntype Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}>{labels.map((label, i) => <MenuItem selected={i === choice}>{label}</MenuItem>)}</Layout></Screen>); }`;
      expectValid(src);
    });

    it('accepts template literals', () => {
      expectValid(
        'type Props = { score: number };\nexport function TestScreen({ score }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{`Score: ${score}`}</Text></Layout></Screen>); }',
      );
    });

    it('accepts static string arrays', () => {
      expectValid(
        `const items = ['one', 'two'];\ntype Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}>{items.map((item, i) => <MenuItem selected={i === choice}>{item}</MenuItem>)}</Layout></Screen>); }`,
      );
    });

    it('accepts comparison operators in props', () => {
      expectValid(
        `type Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}><MenuItem selected={choice === 0}>A</MenuItem></Layout></Screen>); }`,
      );
    });

    it('accepts arithmetic in expressions', () => {
      expectValid(
        'type Props = { x: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{`val: ${x + 1}`}</Text></Layout></Screen>); }',
      );
    });

    it('accepts fragments', () => {
      expectValid(
        `type Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}><><Text>a</Text><Text>b</Text></></Layout></Screen>); }`,
      );
    });

    it('accepts all 11 JSX elements', () => {
      expectValid(
        `type Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0} lineGap={10} marginX={20}><Text>hi</Text><ItalicText>em</ItalicText><Paragraph>body text</Paragraph><MenuItem selected={choice === 0}>opt</MenuItem><Gap size="sm" /><CursorSet y={10} /><CursorShift y={5} /><MarginSet x={10} /><Divider /></Layout></Screen>); }`,
      );
    });
  });

  describe('rejected constructs', () => {
    it('rejects let declaration', () => {
      expectInvalid(
        `export function TestScreen() { let x = 1; return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /'let' declarations are not supported/,
      );
    });

    it('rejects var declaration', () => {
      expectInvalid(
        `export function TestScreen() { var x = 1; return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /'var' declarations are not supported/,
      );
    });

    it('rejects arrow function closure', () => {
      expectInvalid(
        layout(`{(() => <Text>hi</Text>)()}`),
        /Arrow functions are not supported outside \.map\(\)|Only \.map\(\) calls are allowed/,
      );
    });

    it('rejects class declaration', () => {
      expectInvalid(
        `class Foo {}\nexport function TestScreen() { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Class declarations are not supported/,
      );
    });

    it('rejects async', () => {
      expectInvalid(
        layout(`{async () => <Text>hi</Text>}`),
        /not supported|not allowed/,
      );
    });

    it('rejects spread operator in JSX expression', () => {
      expectInvalid(
        `type Props = { items: string[] };\nexport function TestScreen({ items }: Props) { return (<Screen border="standard"><Layout y={0}><Text {...items}>hi</Text></Layout></Screen>); }`,
        /Spread attributes are not supported/,
      );
    });

    it('rejects switch statement', () => {
      expectInvalid(
        `export function TestScreen() { switch (1) { case 1: break; } return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Only return statements are allowed|not supported/,
      );
    });

    it('rejects optional chaining (?.)', () => {
      // items?.map() — the ?. is on the PropertyAccessExpression
      expectInvalid(
        `type Props = { items: string[] };\nexport function TestScreen({ items }: Props) { return (<Screen border="standard"><Layout y={0}>{items?.map((x, i) => <Text>{x}</Text>)}</Layout></Screen>); }`,
        /Optional chaining \(\?\.\) is not supported/,
      );
    });

    it('rejects nullish coalescing (??)', () => {
      expectInvalid(
        `type Props = { name: string };\nexport function TestScreen({ name }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{name ?? "default"}</Text></Layout></Screen>); }`,
        /Nullish coalescing \(\?\?\) is not supported/,
      );
    });

    it('rejects as type assertion', () => {
      expectInvalid(
        `type Props = { x: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{(x as unknown) as string}</Text></Layout></Screen>); }`,
        /not allowed|not supported/,
      );
    });

    it('rejects typeof', () => {
      expectInvalid(
        `type Props = { x: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{typeof x}</Text></Layout></Screen>); }`,
        /not allowed|not supported/,
      );
    });

    it('rejects non-Props type aliases (keyof usage)', () => {
      // Extra type aliases beyond 'type Props' are not needed and indicate
      // unsupported patterns — the validator rejects them at top level
      expectInvalid(
        `type Props = { x: number };\ntype K = keyof Props;\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{x}</Text></Layout></Screen>); }`,
        /not supported|not allowed/,
      );
    });

    it('rejects hook call (useState)', () => {
      expectInvalid(
        `export function TestScreen() { const [x, setX] = useState(0); return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Hook 'useState' is not supported|not supported/,
      );
    });

    it('rejects nested components', () => {
      expectInvalid(
        `export function TestScreen() { function Inner() { return <Text>hi</Text>; } return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Nested function declarations are not supported/,
      );
    });

    it('rejects destructuring beyond props parameter', () => {
      expectInvalid(
        `type Props = { x: number };\nexport function TestScreen({ x }: Props) { const { a } = { a: 1 }; return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Destructuring is only allowed in the function parameter|not supported/,
      );
    });

    it('rejects optional props', () => {
      expectInvalid(
        `type Props = { choice?: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Optional prop.*is not supported/,
      );
    });

    it('rejects exported non-function const at top level', () => {
      expectInvalid(
        `export const magicNumber = 42;\nexport function TestScreen() { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        /Only const string arrays are supported at top level/,
      );
    });

    it('rejects rest parameters in .map() callback', () => {
      expectInvalid(
        `const items = ['a', 'b'];\ntype Props = { x: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}>{items.map((...args) => <Text>{args[0]}</Text>)}</Layout></Screen>); }`,
        /Rest parameters are not supported in \.map\(\) callbacks/,
      );
    });

    it('rejects destructuring parameters in .map() callback', () => {
      expectInvalid(
        `type Props = { items: string[] };\nexport function TestScreen({ items }: Props) { return (<Screen border="standard"><Layout y={0}>{items.map(({ name }) => <Text>{name}</Text>)}</Layout></Screen>); }`,
        /Destructuring parameters are not supported in \.map\(\) callbacks/,
      );
    });

    it('rejects boolean[] arrays (caught at parse layer)', () => {
      // boolean[] is rejected by the parser before validation runs
      expect(() =>
        parseScreen(
          `type Props = { flags: boolean[] };\nexport function TestScreen({ flags }: Props) { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
          'test.tsx',
        ),
      ).toThrow(ParseError);
    });
  });

  describe('structural rules', () => {
    it('rejects <Text> directly under <Screen>', () => {
      expectInvalid(
        wrap(`<Screen border="standard"><Text>hi</Text></Screen>`),
        /cannot be a direct child of <Screen>/,
      );
    });

    it('rejects empty <Layout>', () => {
      expectInvalid(
        screen(`<Layout y={0}></Layout>`),
        /<Layout> must have at least one child/,
      );
    });

    it('rejects empty <Screen>', () => {
      expectInvalid(
        wrap(`<Screen border="standard"></Screen>`),
        /<Screen> must have at least one child/,
      );
    });

    it('rejects <Layout align="center"> with ternary child', () => {
      expectInvalid(
        `type Props = { x: boolean };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout align="center">{x ? <Text>a</Text> : <Text>b</Text>}</Layout></Screen>); }`,
        /Layout align="center"> cannot contain conditional/,
      );
    });

    it('rejects <Layout align="center"> with .map() child', () => {
      expectInvalid(
        `const items = ['a'];\ntype Props = { x: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout align="center">{items.map((item, i) => <Text>{item}</Text>)}</Layout></Screen>); }`,
        /Layout align="center"> cannot contain conditional/,
      );
    });

    it('rejects <MenuItem align="left">', () => {
      expectInvalid(
        `type Props = { choice: number };\nexport function TestScreen({ choice }: Props) { return (<Screen border="standard"><Layout y={0}><MenuItem selected={choice === 0} align="left">opt</MenuItem></Layout></Screen>); }`,
        /<MenuItem> does not support the align prop/,
      );
    });
  });

  describe('error reporting', () => {
    it('includes file, line, col in errors', () => {
      const result = expectInvalid(
        `type Props = { x?: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
      );

      const err = result.errors[0]!;
      expect(err.file).toBe('test.tsx');
      expect(typeof err.line).toBe('number');
      expect(typeof err.col).toBe('number');
      expect(err.line).toBeGreaterThan(0);
      expect(err.col).toBeGreaterThan(0);
      expect(err.message.length).toBeGreaterThan(0);
    });
  });

  describe('property-based tests', () => {
    it('rejects random forbidden syntax kinds (100 runs)', () => {
      // Generate source snippets with various forbidden constructs
      const forbiddenSnippets = fc.constantFrom(
        // let/var
        `export function TestScreen() { let x = 1; return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        `export function TestScreen() { var x = 1; return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        // class
        `class Foo {}\nexport function TestScreen() { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        // nested function
        `export function TestScreen() { function inner() {} return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        // optional prop
        `type Props = { x?: number };\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>hi</Text></Layout></Screen>); }`,
        // extra type alias
        `type Props = { x: number };\ntype K = keyof Props;\nexport function TestScreen({ x }: Props) { return (<Screen border="standard"><Layout y={0}><Text>{x}</Text></Layout></Screen>); }`,
        // empty Layout
        `export function TestScreen() { return (<Screen border="standard"><Layout y={0}></Layout></Screen>); }`,
        // Text under Screen
        `export function TestScreen() { return (<Screen border="standard"><Text>hi</Text></Screen>); }`,
        // empty Screen
        `export function TestScreen() { return (<Screen border="standard"></Screen>); }`,
      );

      fc.assert(
        fc.property(forbiddenSnippets, (source) => {
          const result = parseAndValidate(source);

          return result.valid === false && result.errors.length > 0;
        }),
        { numRuns: 100 },
      );
    });
  });
});
