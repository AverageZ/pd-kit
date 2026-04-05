import type ts from 'typescript';

export type ExprIR =
  | { kind: 'arithmetic'; left: ExprIR; op: '+' | '-' | '*'; right: ExprIR }
  | {
      kind: 'comparison';
      left: ExprIR;
      op: '==' | '!=' | '>' | '<' | '>=' | '<=';
      right: ExprIR;
    }
  | { kind: 'index'; array: string; index: ExprIR }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'not'; operand: ExprIR }
  | { kind: 'prop'; name: string }
  | { bufferSize: number; kind: 'template'; parts: (string | ExprIR)[] };

export type TextContent =
  | { kind: 'prop'; name: string }
  | { kind: 'static'; value: string }
  | { expr: ExprIR & { kind: 'template' }; kind: 'template' };

export type OpIR =
  | {
      align: 'left' | 'center' | 'right';
      content: TextContent;
      italic: boolean;
      kind: 'text';
    }
  | { content: TextContent; kind: 'menuItem'; selected: ExprIR }
  | { condition: ExprIR; else?: OpIR[]; kind: 'conditional'; then: OpIR[] }
  | { kind: 'cursorSet'; y: number }
  | { kind: 'cursorShift'; y: number | ExprIR }
  | { kind: 'divider' }
  | { kind: 'gap'; pixels: number | ExprIR }
  | {
      array: string;
      body: OpIR[];
      indexName: string;
      itemName: string;
      kind: 'loop';
    }
  | { kind: 'marginSet'; x: number }
  | { align: 'left' | 'center' | 'right'; kind: 'paragraph'; lines: string[] }
  | { code: string; kind: 'rawC' };

export type LayoutIR = {
  lineGap?: number;
  marginX?: number;
  ops: OpIR[];
  y: number;
};

export type StaticArrayIR = {
  name: string;
  values: string[];
};

export type PropIR = {
  name: string;
  tsType: 'number' | 'boolean' | 'string' | 'string[]' | 'number[]';
};

export type ScreenIR = {
  border: number;
  hasRawC: boolean;
  layouts: LayoutIR[];
  name: string;
  props: PropIR[];
  sourceFile: string;
  staticArrays: StaticArrayIR[];
};

export type ParsedScreen = {
  functionName: string;
  jsxBody: ts.JsxElement;
  props: PropIR[];
  sourceFile: string;
  staticArrays: StaticArrayIR[];
};
