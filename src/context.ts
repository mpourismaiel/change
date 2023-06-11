export const pointers = {};
export const subscribers = {};

export function addSubsciption(pathToVariable, context, callback) {
  if (!subscribers[pathToVariable]) {
    subscribers[pathToVariable] = [];
  }
  subscribers[pathToVariable].push((newValue) => {
    // Update context using the new value
    let variable = context;
    const keys = pathToVariable.split(".");
    for (let i = 0; i < keys.length - 1; i++) {
      variable = variable[keys[i]];
    }
    variable[keys[keys.length - 1]] = newValue;
    callback();
  });
}

export function createPointer(pathInContext) {
  const splitPath = pathInContext.toLowerCase().split(".");

  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: (context) => splitPath.reduce((acc, key) => acc[key], context),
  };

  return pointers[pathInContext];
}

export function createVariable(value, original, type = "variable") {
  return { value, type: "variable", original };
}
