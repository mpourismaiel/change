export interface IVariable {
  value: unknown;
  original: string;
}

export interface ITextVariable extends IVariable {}

export interface IEventListener extends IVariable {
  event: string;
}

export type ContextValueType = IVariable | ITextVariable;
export type ContextDataType = Record<string, ContextValueType>;

export type Pointer = {
  path: string;
  dependencies: string[];
  lookup: (context: ContextDataType) => ContextValueType;
};

export type Pointers = Record<string, Pointer>;

export type Subscribers = Record<string, Array<(newValue: unknown) => void>>;

export type Pattern = {
  name: string;
  open: RegExp;
  close: RegExp;
  variables: Array<string | null>;
};

export type ChangeBasicNode = {
  node: string | HTMLElement | Node;
  eventListeners?: Array<IEventListener>;
  content: Array<ChangeNode>;
};

export type ChangeNodeWithRender = {
  render: (context: ContextDataType, parent?: HTMLElement) => void | unknown;
};

export type ChangeNodeWithDependencies = ChangeBasicNode & {
  addDependency: (node: HTMLElement, context: ContextDataType) => void;
};

export type ChangeVariableNode = ChangeNodeWithDependencies &
  Required<ChangeNodeWithRender>;

export type ChangePatternNode = ChangeNodeWithDependencies &
  ChangeNodeWithRender & {
    content: Array<ChangeNode | string>;
    variables?: Record<string, Pointer>;
  };

export type ChangeNode =
  | ChangeBasicNode
  | ChangeVariableNode
  | ChangePatternNode;
