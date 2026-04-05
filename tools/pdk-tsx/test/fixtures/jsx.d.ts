type Align = 'left' | 'center' | 'right';

/** Restricts user-defined prop types to transpilable primitives. */
type PdkPropType = number | boolean | string | string[] | number[];

declare const __pdkElement: unique symbol;

/** Container children — accepts JSX expressions like {x && <A/>}, .map(), fragments */
type PdkNode =
  | JSX.Element
  | PdkNode[]
  | string
  | number
  | boolean
  | null
  | undefined;

declare namespace JSX {
  type Element = { readonly [__pdkElement]: true };
  type IntrinsicElements = unknown;
  type ElementChildrenAttribute = {
    children: unknown;
  };
}

declare function Screen(props: {
  border: number | 'tight' | 'standard' | 'wide';
  children: PdkNode;
}): JSX.Element;

// Layout overloads — align vs y are mutually exclusive
declare function Layout(props: {
  align: 'center';
  children: PdkNode;
}): JSX.Element;
declare function Layout(props: {
  align: 'top' | 'bottom';
  padding?: number;
  children: PdkNode;
}): JSX.Element;
declare function Layout(props: {
  y: number;
  lineGap?: number;
  marginX?: number;
  children: PdkNode;
}): JSX.Element;

declare function Text(props: { align?: Align; children?: string }): JSX.Element;

declare function ItalicText(props: {
  align?: Align;
  children?: string;
}): JSX.Element;

declare function Paragraph(props: {
  align?: Align;
  children: string;
}): JSX.Element;

declare function MenuItem(props: {
  selected: boolean;
  children: string;
}): JSX.Element;

// Gap overloads — exactly one sizing mode
declare function Gap(props: { size: 'xs' | 'sm' | 'md' | 'lg' }): JSX.Element;
declare function Gap(props: { pixels: number }): JSX.Element;

declare function CursorSet(props: { y: number }): JSX.Element;

declare function CursorShift(props: { y: number }): JSX.Element;

declare function MarginSet(props: { x: number }): JSX.Element;

declare function Divider(props: unknown): JSX.Element;
