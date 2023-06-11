import { subscribers } from "./context";

export const createHandler = (path = []) => ({
  get: (target, key) => {
    if (typeof target[key] === "object" && target[key] !== null) {
      return new Proxy(target[key], createHandler([...path, key]));
    } else {
      return target[key];
    }
  },
  set: (target, key, value) => {
    target[key] = value;

    const subscriberPath = [...path, key].join(".");
    if (subscribers[subscriberPath]) {
      subscribers[subscriberPath].forEach((fn) => fn(value));
    }
    return true;
  },
  ownKeys: (target) => {
    return Reflect.ownKeys(target);
  },
});

const data = new Proxy({}, createHandler());

const updateData = (newData) => {
  Object.assign(data, newData);
  return data;
};

export default updateData;
