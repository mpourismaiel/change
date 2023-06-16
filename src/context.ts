import {
  ContextDataType,
  ContextValueType,
  IEventListener,
  ITextVariable,
  IVariable,
  Pointer,
  Pointers,
} from "./types";

export let pointers: Pointers = {};

export function createPointer(pathInContext?: string): Pointer | null {
  if (!pathInContext) {
    return null;
  }

  const splitPath = pathInContext.toLowerCase().split(".");

  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: (context: ContextDataType): ContextValueType =>
      splitPath.reduce(
        (acc, key) => (acc as any)[key].valueOf(),
        context
      ) as unknown as ContextValueType,
  };

  return pointers[pathInContext];
}

export class Variable implements IVariable {
  constructor(public value: unknown, public original: string) {}

  public valueOf() {
    return this.value;
  }
}

export class TextVariable extends Variable implements ITextVariable {
  constructor(public value: unknown, public original: string) {
    super(value, original);
  }
}

export class EventListener extends Variable implements IEventListener {
  constructor(
    public value: unknown,
    public original: string,
    public event: string
  ) {
    super(value, original);
  }
}
