import ts from 'typescript';

import type { ParsedScreen, ValidationError, ValidationResult } from './types';

const ALLOWED_ELEMENTS = new Set([
  'Screen',
  'Layout',
  'Text',
  'ItalicText',
  'Paragraph',
  'MenuItem',
  'Gap',
  'CursorSet',
  'CursorShift',
  'MarginSet',
  'Divider',
]);

const LAYOUT_ONLY_CHILDREN = new Set([
  'Layout',
  // Conditional/loop wrappers are checked structurally
]);

// Binary operators allowed in expressions
const ALLOWED_BINARY_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
]);

// Prefix unary operators allowed
const ALLOWED_PREFIX_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.MinusToken,
]);

type Context = {
  errors: ValidationError[];
  sf: ts.SourceFile;
  sourceFile: string;
  staticArrayNames: Set<string>;
};

function addError(ctx: Context, node: ts.Node, message: string): void {
  const pos = ts.getLineAndCharacterOfPosition(ctx.sf, node.getStart(ctx.sf));
  ctx.errors.push({
    col: pos.character + 1,
    file: ctx.sourceFile,
    line: pos.line + 1,
    message,
  });
}

function getElementName(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  sf: ts.SourceFile,
): string {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(sf);
  }

  return node.tagName.getText(sf);
}

function getJsxChildren(
  node: ts.JsxElement | ts.JsxFragment,
): ts.NodeArray<ts.JsxChild> {
  return node.children;
}

function isMapCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'map'
  );
}

function hasConditionalOrMap(children: ts.NodeArray<ts.JsxChild>): boolean {
  for (const child of children) {
    if (ts.isJsxExpression(child) && child.expression) {
      if (ts.isConditionalExpression(child.expression)) return true;
      if (isMapCall(child.expression)) return true;
      // Logical AND: x && <Elem/> — the right side may be conditional-ish
      if (
        ts.isBinaryExpression(child.expression) &&
        child.expression.operatorToken.kind ===
          ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        return true;
      }
    }
  }

  return false;
}

function getAttrValue(
  attrs: ts.JsxAttributes,
  name: string,
  sf: ts.SourceFile,
): string | undefined {
  for (const attr of attrs.properties) {
    if (
      ts.isJsxAttribute(attr) &&
      attr.name.getText(sf) === name &&
      attr.initializer &&
      ts.isStringLiteral(attr.initializer)
    ) {
      return attr.initializer.text;
    }
  }

  return undefined;
}

function validateCallExpression(ctx: Context, node: ts.CallExpression): void {
  // Only .map() calls are allowed
  if (!isMapCall(node)) {
    addError(ctx, node, 'Only .map() calls are allowed');

    return;
  }

  const propAccess = node.expression as ts.PropertyAccessExpression;

  // Reject optional chaining on the .map() target
  if (propAccess.questionDotToken) {
    addError(ctx, propAccess, 'Optional chaining (?.) is not supported');

    return;
  }

  // Check the .map() callback is an arrow function
  if (node.arguments.length !== 1 || !ts.isArrowFunction(node.arguments[0]!)) {
    addError(ctx, node, '.map() must have exactly one arrow function argument');

    return;
  }

  const callback = node.arguments[0]! as ts.ArrowFunction;

  // Validate callback parameters — only simple identifiers allowed
  for (const param of callback.parameters) {
    if (param.dotDotDotToken) {
      addError(
        ctx,
        param,
        'Rest parameters are not supported in .map() callbacks',
      );

      return;
    }

    if (!ts.isIdentifier(param.name)) {
      addError(
        ctx,
        param,
        'Destructuring parameters are not supported in .map() callbacks',
      );

      return;
    }
  }

  // Walk the object being mapped (.map target)
  walkNode(ctx, propAccess.expression, 'expression');

  // Walk callback body (but the arrow function + params are allowed)
  if (ts.isBlock(callback.body)) {
    addError(
      ctx,
      callback,
      '.map() callback must be an expression, not a block',
    );

    return;
  }

  walkNode(ctx, callback.body, 'expression');
}

function validateBinaryExpression(
  ctx: Context,
  node: ts.BinaryExpression,
): void {
  const op = node.operatorToken.kind;

  if (op === ts.SyntaxKind.QuestionQuestionToken) {
    addError(
      ctx,
      node.operatorToken,
      'Nullish coalescing (??) is not supported',
    );

    return;
  }

  if (!ALLOWED_BINARY_OPERATORS.has(op)) {
    addError(
      ctx,
      node.operatorToken,
      `Binary operator '${node.operatorToken.getText(ctx.sf)}' is not supported`,
    );

    return;
  }

  walkNode(ctx, node.left, 'expression');
  walkNode(ctx, node.right, 'expression');
}

function validateScreenChildren(ctx: Context, node: ts.JsxElement): void {
  const children = getJsxChildren(node);
  const meaningful = children.filter(
    (c) => !(ts.isJsxText(c) && c.text.trim() === ''),
  );

  if (meaningful.length === 0) {
    addError(ctx, node, '<Screen> must have at least one child');

    return;
  }

  for (const child of meaningful) {
    // Direct JSX elements must be Layout
    if (ts.isJsxElement(child)) {
      const name = getElementName(child, ctx.sf);
      if (!LAYOUT_ONLY_CHILDREN.has(name)) {
        addError(
          ctx,
          child,
          `<${name}> cannot be a direct child of <Screen> — only <Layout> is allowed`,
        );
      }
    } else if (ts.isJsxSelfClosingElement(child)) {
      const name = child.tagName.getText(ctx.sf);
      if (!LAYOUT_ONLY_CHILDREN.has(name)) {
        addError(
          ctx,
          child,
          `<${name}> cannot be a direct child of <Screen> — only <Layout> is allowed`,
        );
      }
    }
    // JsxExpressions (ternaries, &&) are ok — they produce Layouts at runtime
  }
}

function validateLayoutChildren(ctx: Context, node: ts.JsxElement): void {
  const children = getJsxChildren(node);
  const meaningful = children.filter(
    (c) => !(ts.isJsxText(c) && c.text.trim() === ''),
  );

  if (meaningful.length === 0) {
    addError(ctx, node, '<Layout> must have at least one child');

    return;
  }

  // Check align="center" restrictions
  const attrs = node.openingElement.attributes;
  const align = getAttrValue(attrs, 'align', ctx.sf);

  if (align === 'center' && hasConditionalOrMap(children)) {
    addError(
      ctx,
      node.openingElement,
      '<Layout align="center"> cannot contain conditional or .map() children — static content only',
    );
  }
}

function validateElementProps(
  ctx: Context,
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
): void {
  // MenuItem must not have align prop
  if (name === 'MenuItem') {
    for (const attr of node.attributes.properties) {
      if (ts.isJsxAttribute(attr) && attr.name.getText(ctx.sf) === 'align') {
        addError(ctx, attr, '<MenuItem> does not support the align prop');
      }
    }
  }
}

function walkNode(ctx: Context, node: ts.Node, parentContext: string): void {
  const kind = node.kind;

  // Special handling for nodes that need deeper validation
  if (ts.isCallExpression(node)) {
    // Check for hook calls (useXxx pattern)
    if (ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (/^use[A-Z]/.test(name)) {
        addError(ctx, node, `Hook '${name}' is not supported`);

        return;
      }
    }

    // Check for optional chaining in call
    if (node.questionDotToken) {
      addError(ctx, node, 'Optional chaining (?.) is not supported');

      return;
    }

    validateCallExpression(ctx, node);

    return;
  }

  if (ts.isBinaryExpression(node)) {
    validateBinaryExpression(ctx, node);

    return;
  }

  if (ts.isPrefixUnaryExpression(node)) {
    if (!ALLOWED_PREFIX_OPERATORS.has(node.operator)) {
      addError(
        ctx,
        node,
        `Prefix operator '${ts.tokenToString(node.operator) ?? '?'}' is not supported`,
      );

      return;
    }

    walkNode(ctx, node.operand, 'expression');

    return;
  }

  if (ts.isConditionalExpression(node)) {
    walkNode(ctx, node.condition, 'expression');
    walkNode(ctx, node.whenTrue, 'expression');
    walkNode(ctx, node.whenFalse, 'expression');

    return;
  }

  if (ts.isPropertyAccessExpression(node)) {
    if (node.questionDotToken) {
      addError(ctx, node, 'Optional chaining (?.) is not supported');

      return;
    }

    walkNode(ctx, node.expression, 'expression');

    return;
  }

  if (ts.isElementAccessExpression(node)) {
    if (node.questionDotToken) {
      addError(ctx, node, 'Optional chaining (?.) is not supported');

      return;
    }

    walkNode(ctx, node.expression, 'expression');
    walkNode(ctx, node.argumentExpression, 'expression');

    return;
  }

  if (ts.isParenthesizedExpression(node)) {
    walkNode(ctx, node.expression, parentContext);

    return;
  }

  if (ts.isArrowFunction(node)) {
    // Arrow functions are only allowed as .map() callbacks — handled in validateCallExpression
    // If we reach here, it's a standalone arrow function (closure)
    addError(ctx, node, 'Arrow functions are not supported outside .map()');

    return;
  }

  if (ts.isTemplateExpression(node)) {
    for (const span of node.templateSpans) {
      walkNode(ctx, span.expression, 'expression');
    }

    return;
  }

  // JSX elements — validate element name and walk children
  if (ts.isJsxElement(node)) {
    const name = getElementName(node, ctx.sf);
    if (!ALLOWED_ELEMENTS.has(name)) {
      addError(
        ctx,
        node.openingElement,
        `<${name}> is not a supported element`,
      );

      return;
    }

    validateElementProps(ctx, node.openingElement, name);

    if (name === 'Screen') {
      validateScreenChildren(ctx, node);
    } else if (name === 'Layout') {
      validateLayoutChildren(ctx, node);
    }

    // Walk attributes
    for (const attr of node.openingElement.attributes.properties) {
      if (ts.isJsxAttribute(attr) && attr.initializer) {
        if (ts.isJsxExpression(attr.initializer)) {
          if (attr.initializer.expression) {
            walkNode(ctx, attr.initializer.expression, 'expression');
          }
        }
        // StringLiteral initializers are fine
      } else if (ts.isJsxSpreadAttribute(attr)) {
        addError(ctx, attr, 'Spread attributes are not supported');
      }
    }

    // Walk children
    for (const child of node.children) {
      walkNode(ctx, child, 'jsx-child');
    }

    return;
  }

  if (ts.isJsxSelfClosingElement(node)) {
    const name = node.tagName.getText(ctx.sf);
    if (!ALLOWED_ELEMENTS.has(name)) {
      addError(ctx, node, `<${name}> is not a supported element`);

      return;
    }

    validateElementProps(ctx, node, name);

    // Walk attributes
    for (const attr of node.attributes.properties) {
      if (ts.isJsxAttribute(attr) && attr.initializer) {
        if (ts.isJsxExpression(attr.initializer)) {
          if (attr.initializer.expression) {
            walkNode(ctx, attr.initializer.expression, 'expression');
          }
        }
      } else if (ts.isJsxSpreadAttribute(attr)) {
        addError(ctx, attr, 'Spread attributes are not supported');
      }
    }

    return;
  }

  if (ts.isJsxFragment(node)) {
    for (const child of node.children) {
      walkNode(ctx, child, 'jsx-child');
    }

    return;
  }

  if (ts.isJsxExpression(node)) {
    if (node.dotDotDotToken) {
      addError(ctx, node, 'Spread operator is not supported');

      return;
    }

    if (node.expression) {
      walkNode(ctx, node.expression, 'expression');
    }

    return;
  }

  // Terminal nodes that are always ok
  if (ts.isJsxText(node)) return;
  if (ts.isIdentifier(node)) return;
  if (ts.isStringLiteral(node)) return;
  if (ts.isNumericLiteral(node)) return;
  if (
    kind === ts.SyntaxKind.TrueKeyword ||
    kind === ts.SyntaxKind.FalseKeyword
  ) {
    return;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) return;

  // Anything not explicitly handled is rejected
  addError(
    ctx,
    node,
    `Unsupported syntax: ${ts.SyntaxKind[kind]} is not allowed`,
  );
}

function validateTopLevel(ctx: Context, sf: ts.SourceFile): void {
  for (const stmt of sf.statements) {
    // const declarations for static arrays are ok (already validated by parser)
    if (ts.isVariableStatement(stmt)) {
      const isConst = !!(stmt.declarationList.flags & ts.NodeFlags.Const);
      if (!isConst) {
        const keyword =
          stmt.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'var';
        addError(
          ctx,
          stmt,
          `'${keyword}' declarations are not supported — only 'const' is allowed`,
        );
      } else {
        // Check each const declaration
        for (const decl of stmt.declarationList.declarations) {
          if (!decl.initializer) continue;
          // Static string arrays are ok
          if (ts.isArrayLiteralExpression(decl.initializer)) {
            const allStrings = decl.initializer.elements.every((el) =>
              ts.isStringLiteral(el),
            );
            if (!allStrings) {
              addError(
                ctx,
                decl.initializer,
                'Only string literal arrays are supported at top level',
              );
            }
          } else if (
            !ts.isArrowFunction(decl.initializer) &&
            !ts.isFunctionExpression(decl.initializer)
          ) {
            // Non-array, non-function const at top level — not supported
            addError(
              ctx,
              decl,
              'Only const string arrays are supported at top level',
            );
          }
        }
      }

      continue;
    }

    // Only 'type Props' is allowed
    if (ts.isTypeAliasDeclaration(stmt)) {
      if (stmt.name.text !== 'Props') {
        addError(
          ctx,
          stmt,
          `Only 'type Props' is allowed — '${stmt.name.text}' is not supported`,
        );
      }

      continue;
    }

    // The exported function declaration is ok
    if (ts.isFunctionDeclaration(stmt) && hasExportModifier(stmt)) continue;

    // Anything else at top level is rejected
    if (ts.isClassDeclaration(stmt)) {
      addError(ctx, stmt, 'Class declarations are not supported');

      continue;
    }

    if (ts.isFunctionDeclaration(stmt) && !hasExportModifier(stmt)) {
      addError(
        ctx,
        stmt,
        'Only the exported component function is allowed — nested/helper functions are not supported',
      );

      continue;
    }

    addError(
      ctx,
      stmt,
      `Unsupported top-level statement: ${ts.SyntaxKind[stmt.kind]}`,
    );
  }

  // Validate function body — only the return statement is allowed
  validateFunctionBody(ctx, sf);
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

function findExportedFunctionBody(sf: ts.SourceFile): ts.Block | undefined {
  for (const stmt of sf.statements) {
    if (
      ts.isFunctionDeclaration(stmt) &&
      hasExportModifier(stmt) &&
      stmt.body
    ) {
      return stmt.body;
    }

    if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer)) &&
          decl.initializer.body &&
          ts.isBlock(decl.initializer.body)
        ) {
          return decl.initializer.body;
        }
      }
    }
  }

  return undefined;
}

function validateFunctionBody(ctx: Context, sf: ts.SourceFile): void {
  const body = findExportedFunctionBody(sf);
  if (!body) return;

  for (const fnStmt of body.statements) {
    if (ts.isReturnStatement(fnStmt)) continue;

    // Check for variable declarations inside the function
    if (ts.isVariableStatement(fnStmt)) {
      const isConst = !!(fnStmt.declarationList.flags & ts.NodeFlags.Const);
      const keyword = isConst
        ? 'const'
        : fnStmt.declarationList.flags & ts.NodeFlags.Let
          ? 'let'
          : 'var';

      if (!isConst) {
        addError(
          ctx,
          fnStmt,
          `'${keyword}' declarations are not supported inside component functions`,
        );
      } else {
        addError(
          ctx,
          fnStmt,
          'Local variable declarations are not supported inside component functions',
        );
      }

      continue;
    }

    if (ts.isFunctionDeclaration(fnStmt)) {
      addError(ctx, fnStmt, 'Nested function declarations are not supported');

      continue;
    }

    addError(
      ctx,
      fnStmt,
      `Only return statements are allowed inside the component function`,
    );
  }
}

function validatePropsType(ctx: Context, sf: ts.SourceFile): void {
  const propsAlias = sf.statements.find(
    (s): s is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(s) && s.name.text === 'Props',
  );

  if (!propsAlias) return;

  const typeLiteral = propsAlias.type;
  if (!ts.isTypeLiteralNode(typeLiteral)) return;

  for (const member of typeLiteral.members) {
    if (!ts.isPropertySignature(member)) continue;

    // Reject optional props
    if (member.questionToken) {
      const name = member.name.getText(sf);
      addError(
        ctx,
        member,
        `Optional prop '${name}' is not supported — all props must be required`,
      );
    }

    // Reject boolean[] arrays
    if (member.type && ts.isArrayTypeNode(member.type)) {
      if (member.type.elementType.kind === ts.SyntaxKind.BooleanKeyword) {
        const name = member.name.getText(sf);
        addError(
          ctx,
          member.type,
          `'boolean[]' prop type is not supported for '${name}'`,
        );
      }
    }
  }
}

function validateDestructuring(ctx: Context, sf: ts.SourceFile): void {
  const body = findExportedFunctionBody(sf);
  if (!body) return;

  walkForDestructuring(ctx, body);
}

function walkForDestructuring(ctx: Context, node: ts.Node): void {
  if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)) {
    addError(
      ctx,
      node,
      'Destructuring is only allowed in the function parameter — not inside the function body',
    );

    return;
  }

  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)) {
    addError(ctx, node, 'Array destructuring is not supported');

    return;
  }

  ts.forEachChild(node, (child) => walkForDestructuring(ctx, child));
}

export function validateScreen(parsed: ParsedScreen): ValidationResult {
  const sf = parsed.jsxBody.getSourceFile();
  const ctx: Context = {
    errors: [],
    sf,
    sourceFile: parsed.sourceFile,
    staticArrayNames: new Set(parsed.staticArrays.map((a) => a.name)),
  };

  // Validate top-level statements
  validateTopLevel(ctx, sf);

  // Validate Props type for optional props and boolean[]
  validatePropsType(ctx, sf);

  // Check for destructuring beyond props
  validateDestructuring(ctx, sf);

  // Walk the JSX tree
  walkNode(ctx, parsed.jsxBody, 'root');

  if (ctx.errors.length === 0) {
    return { valid: true };
  }

  return { errors: ctx.errors, valid: false };
}
