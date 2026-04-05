import fc from 'fast-check';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { ParseError, parseScreen } from './parse';

const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../test/fixtures',
);

const fixture = (name: string) => {
  const path = resolve(fixturesDir, name);

  return { content: readFileSync(path, 'utf8'), path };
};

describe('parseScreen', () => {
  describe('fixture parsing', () => {
    it('parses ConfirmNewGame with correct function name, props, and JSX root', () => {
      const { content, path } = fixture('ConfirmNewGame.tsx');
      const result = parseScreen(content, path);

      expect(result.functionName).toBe('ConfirmNewGameScreen');
      expect(result.props).toEqual([{ name: 'choice', tsType: 'number' }]);
      expect(result.staticArrays).toEqual([]);
      expect(result.jsxBody.kind).toBe(ts.SyntaxKind.JsxElement);

      const tagName = result.jsxBody.openingElement.tagName.getText();

      expect(tagName).toBe('Screen');
    });

    it('parses TitleScreen with multiple prop types', () => {
      const { content, path } = fixture('TitleScreen.tsx');
      const result = parseScreen(content, path);

      expect(result.functionName).toBe('TitleScreen');
      expect(result.props).toEqual([
        { name: 'bestScore', tsType: 'number' },
        { name: 'hasSave', tsType: 'boolean' },
        { name: 'titleChoice', tsType: 'number' },
      ]);
    });

    it('parses TournamentVictory with static arrays and props', () => {
      const { content, path } = fixture('TournamentVictory.tsx');
      const result = parseScreen(content, path);

      expect(result.functionName).toBe('TournamentVictoryScreen');
      expect(result.staticArrays).toEqual([
        {
          name: 'victoryChoiceLabels',
          values: [
            'Send the money home',
            'Keep the purse',
            'Enter the next tournament',
          ],
        },
      ]);
      expect(result.props).toEqual([
        { name: 'choice', tsType: 'number' },
        { name: 'confirmed', tsType: 'boolean' },
        { name: 'tournamentScore', tsType: 'number' },
      ]);
    });

    it('parses ScoreBoard with array prop types', () => {
      const { content, path } = fixture('ScoreBoard.tsx');
      const result = parseScreen(content, path);

      expect(result.functionName).toBe('ScoreBoardScreen');
      expect(result.props).toEqual([
        { name: 'names', tsType: 'string[]' },
        { name: 'scores', tsType: 'number[]' },
      ]);
    });

    it('parses LoreScreen successfully', () => {
      const { content, path } = fixture('LoreScreen.tsx');
      const result = parseScreen(content, path);

      expect(result.functionName).toBe('LoreScreen');
      expect(result.props).toEqual([{ name: 'choice', tsType: 'number' }]);
      expect(result.sourceFile).toBe(path);
    });
  });

  describe('error cases', () => {
    it('rejects file with no exported function', () => {
      const source =
        'const x = 1;\nfunction notExported() { return <Screen></Screen>; }';

      expect(() => parseScreen(source, 'test.tsx')).toThrow(ParseError);
      expect(() => parseScreen(source, 'test.tsx')).toThrow(
        /No exported function component found/,
      );
    });

    it('rejects file with two exported functions', () => {
      const source = [
        'export function ScreenA() { return <Screen></Screen>; }',
        'export function ScreenB() { return <Screen></Screen>; }',
      ].join('\n');

      expect(() => parseScreen(source, 'test.tsx')).toThrow(ParseError);
      expect(() => parseScreen(source, 'test.tsx')).toThrow(
        /Expected exactly one exported function, found 2/,
      );
    });

    it('includes file:line:col in error messages', () => {
      const source = 'const x = 1;';

      try {
        parseScreen(source, 'my-screen.tsx');
        expect.fail('should have thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/^my-screen\.tsx:\d+:\d+ —/);
      }
    });

    it('rejects unsupported prop types', () => {
      const source = [
        'type Props = { cb: () => void };',
        'export function Bad({ cb }: Props) { return <Screen></Screen>; }',
      ].join('\n');

      expect(() => parseScreen(source, 'test.tsx')).toThrow(
        /Unsupported prop type/,
      );
    });
  });

  describe('property-based tests', () => {
    it('round-trips random prop type combinations (100 runs)', () => {
      const propTypeArb = fc.constantFrom(
        'number',
        'boolean',
        'string',
        'string[]',
        'number[]',
      ) as fc.Arbitrary<
        'boolean' | 'number' | 'number[]' | 'string' | 'string[]'
      >;

      const propArb = fc.record({
        name: fc.stringMatching(/^[a-z][a-zA-Z]{0,10}$/),
        tsType: propTypeArb,
      });

      const propsArb = fc.array(propArb, { maxLength: 5, minLength: 1 });

      fc.assert(
        fc.property(propsArb, (props) => {
          // Deduplicate by name
          const unique = [...new Map(props.map((p) => [p.name, p])).values()];
          const typeDecl = `type Props = { ${unique.map((p) => `${p.name}: ${p.tsType};`).join(' ')} };`;
          const destructure = unique.map((p) => p.name).join(', ');
          const source = `${typeDecl}\nexport function TestScreen({ ${destructure} }: Props) { return (<Screen></Screen>); }`;
          const result = parseScreen(source, 'pbt.tsx');

          expect(result.functionName).toBe('TestScreen');
          expect(result.props).toEqual(unique);
        }),
        { numRuns: 100 },
      );
    });
  });
});
