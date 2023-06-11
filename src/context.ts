import {
  ContextDataType,
  ContextValueType,
  Pointers,
  Subscribers,
} from "./types";

export let pointers: Pointers = {};
export let subscribers: Subscribers = {};

export function resetSubscribers() {
  subscribers = {};
}

export function addSubsciption(
  pathToVariable: string,
  context: ContextDataType,
  callback: Function
) {
  if (!subscribers[pathToVariable]) {
    subscribers[pathToVariable] = [];
  }
  subscribers[pathToVariable].push((newValue) => {
    // Update context using the new value
    let variable: ContextDataType = context;
    const keys = pathToVariable.split(".");
    for (let i = 0; i < keys.length - 1; i++) {
      variable = variable[keys[i]];
    }
    variable[keys[keys.length - 1]] = newValue;
    callback();
  });
}

export function createPointer(pathInContext: string) {
  const splitPath = pathInContext.toLowerCase().split(".");

  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: (context: ContextDataType): ContextValueType =>
      splitPath.reduce(
        (acc, key) => (acc as any)[key],
        context
      ) as unknown as ContextValueType,
  };

  return pointers[pathInContext];
}

export function createVariable(
  value: unknown,
  original: string,
  type: "variable" | "text" = "variable"
) {
  return { value, type: type || "variable", original };
}
