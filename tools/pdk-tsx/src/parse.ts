import ts from 'typescript';

import type { ParsedScreen, PropIR, StaticArrayIR } from './types';

export class ParseError extends Error {
  constructor(
    message: string,
    filename: string,
    sourceFile: ts.SourceFile,
    node?: ts.Node,
  ) {
    const pos = node
      ? ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile))
      : { character: 0, line: 0 };

    super(
      `${filename}:${pos.line + 1}:${pos.character + 1} \u2014 error: ${message}`,
    );
    this.name = 'ParseError';
  }
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

function mapPropType(
  typeNode: ts.TypeNode,
  propName: string,
  filename: string,
  sf: ts.SourceFile,
): PropIR['tsType'] {
  if (typeNode.kind === ts.SyntaxKind.NumberKeyword) {
    return 'number';
  }
  if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
    return 'boolean';
  }
  if (typeNode.kind === ts.SyntaxKind.StringKeyword) {
    return 'string';
  }
  if (ts.isArrayTypeNode(typeNode)) {
    const el = typeNode.elementType;
    if (el.kind === ts.SyntaxKind.NumberKeyword) {
      return 'number[]';
    }
    if (el.kind === ts.SyntaxKind.StringKeyword) {
      return 'string[]';
    }
  }

  throw new ParseError(
    `Unsupported prop type for '${propName}'. Supported: number, boolean, string, string[], number[]`,
    filename,
    sf,
    typeNode,
  );
}

function extractProps(
  sf: ts.SourceFile,
  filename: string,
  hasParams: boolean,
): PropIR[] {
  const propsAlias = sf.statements.find(
    (s): s is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(s) && s.name.text === 'Props',
  );

  if (!propsAlias) {
    if (hasParams) {
      throw new ParseError(
        "Function has parameters but no 'type Props' declaration found",
        filename,
        sf,
      );
    }

    return [];
  }

  const typeLiteral = propsAlias.type;
  if (!ts.isTypeLiteralNode(typeLiteral)) {
    throw new ParseError(
      "'type Props' must be a type literal (object type)",
      filename,
      sf,
      propsAlias,
    );
  }

  return typeLiteral.members
    .filter((m): m is ts.PropertySignature => ts.isPropertySignature(m))
    .map((member) => {
      const name = member.name.getText(sf);
      if (!member.type) {
        throw new ParseError(
          `Prop '${name}' must have an explicit type annotation`,
          filename,
          sf,
          member,
        );
      }

      return {
        name,
        tsType: mapPropType(member.type, name, filename, sf),
      };
    });
}

function extractStaticArrays(sf: ts.SourceFile): StaticArrayIR[] {
  const arrays: StaticArrayIR[] = [];

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    for (const decl of stmt.declarationList.declarations) {
      if (
        !(stmt.declarationList.flags & ts.NodeFlags.Const) ||
        !decl.initializer ||
        !ts.isArrayLiteralExpression(decl.initializer)
      ) {
        continue;
      }

      const allStrings = decl.initializer.elements.every((el) =>
        ts.isStringLiteral(el),
      );
      if (!allStrings) continue;

      arrays.push({
        name: decl.name.getText(sf),
        values: decl.initializer.elements.map(
          (el) => (el as ts.StringLiteral).text,
        ),
      });
    }
  }

  return arrays;
}

function unwrapParens(node: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(node)) {
    return unwrapParens(node.expression);
  }

  return node;
}

function findJsxReturn(
  body: ts.Block,
  filename: string,
  sf: ts.SourceFile,
): ts.JsxElement {
  let jsxReturn: ts.JsxElement | undefined;

  for (const stmt of body.statements) {
    if (!ts.isReturnStatement(stmt) || !stmt.expression) continue;

    const expr = unwrapParens(stmt.expression);
    if (!ts.isJsxElement(expr)) continue;

    const tagName = expr.openingElement.tagName.getText(sf);
    if (tagName !== 'Screen') {
      throw new ParseError(
        `Root JSX element must be <Screen>, found <${tagName}>`,
        filename,
        sf,
        expr.openingElement,
      );
    }

    jsxReturn = expr;
    break;
  }

  if (!jsxReturn) {
    throw new ParseError(
      'No JSX return with <Screen> root found in function body',
      filename,
      sf,
    );
  }

  return jsxReturn;
}

export function parseScreen(source: string, filename: string): ParsedScreen {
  const sf = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  // Find exported functions
  const exportedFunctions: {
    body: ts.Block;
    hasParams: boolean;
    name: string;
    node: ts.Node;
  }[] = [];

  for (const stmt of sf.statements) {
    if (
      ts.isFunctionDeclaration(stmt) &&
      hasExportModifier(stmt) &&
      stmt.name
    ) {
      if (!stmt.body) continue;
      exportedFunctions.push({
        body: stmt.body,
        hasParams: stmt.parameters.length > 0,
        name: stmt.name.text,
        node: stmt,
      });
    } else if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          !decl.initializer ||
          (!ts.isArrowFunction(decl.initializer) &&
            !ts.isFunctionExpression(decl.initializer))
        ) {
          continue;
        }
        const fn = decl.initializer;
        if (!fn.body || !ts.isBlock(fn.body)) continue;
        exportedFunctions.push({
          body: fn.body,
          hasParams: fn.parameters.length > 0,
          name: decl.name.getText(sf),
          node: stmt,
        });
      }
    }
  }

  if (exportedFunctions.length === 0) {
    throw new ParseError('No exported function component found', filename, sf);
  }

  if (exportedFunctions.length > 1) {
    throw new ParseError(
      `Expected exactly one exported function, found ${exportedFunctions.length}`,
      filename,
      sf,
      exportedFunctions[1]!.node,
    );
  }

  const fn = exportedFunctions[0]!;
  const props = extractProps(sf, filename, fn.hasParams);
  const staticArrays = extractStaticArrays(sf);
  const jsxBody = findJsxReturn(fn.body, filename, sf);

  return {
    functionName: fn.name,
    jsxBody,
    props,
    sourceFile: filename,
    staticArrays,
  };
}
