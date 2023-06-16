import { ContextDataType, Subscribers } from "./types";

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

const callSubscribers = (path, key, value) => {
  const subscriberPath = [...path, key].join(".");
  if (subscribers[subscriberPath]) {
    subscribers[subscriberPath].forEach((fn) => fn(value[key]));
  }
};

const changeNotifier = (target, path, key, value) => {
  for (let i = 0; i < path.length; i++) {
    callSubscribers(path.slice(0, i), path[i], target);
  }

  callSubscribers(path, key, value);

  if (typeof value === "object" && value !== null) {
    Object.keys(value).forEach((innerKey) => {
      callSubscribers([...path, key], innerKey, value[innerKey]);
    });
  }
};

export const createHandler = (path: string[] = []) => ({
  get: (target, key) => {
    if (typeof target[key] === "object" && target[key] !== null) {
      return new Proxy(target[key], createHandler([...path, key]));
    } else {
      return target[key];
    }
  },
  set: (target, key, value) => {
    target[key] = value;
    changeNotifier(target, path, key, value);
    return true;
  },
  ownKeys: (target) => {
    return Reflect.ownKeys(target);
  },
});

export const data = new Proxy({}, createHandler());

const updateData = (newData) => {
  Object.assign(data, newData);
  return data;
};

export default updateData;
