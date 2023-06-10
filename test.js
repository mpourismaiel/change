let subscribers = {};

const createHandler = (path = []) => ({
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

function createPointer(pathInContext) {
  const splitPath = pathInContext.toLowerCase().split(".");

  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: (context) => splitPath.reduce((acc, key) => acc[key], context),
  };

  return pointers[pathInContext];
}

function test(name, fn) {
  console.log(`Test: ${name}`);
  subscribers = {};
  const assert = (value, extra) => {
    if (!value) {
      throw new Error(
        "Test failed, " +
          (extra ? JSON.stringify(extra) : "no extra info provided")
      );
    }
  };

  try {
    fn(assert);
  } catch (e) {
    console.error(e);
    console.log("The above error occured in test: ", name);
  }
}

test("should get and set", (assert) => {
  const state = new Proxy({}, createHandler());
  state.foo = "foo";
  assert(state.foo === "foo");
});

test("should subscribe to changes", (assert) => {
  const state = new Proxy({}, createHandler());
  let calls = 0;
  subscribers["foo"] = [() => calls++];

  state.foo = "foo";
  assert(calls === 1);

  state.foo = "bar";
  assert(calls === 2);
});

test("should subscribe to nested changes", (assert) => {
  const state = new Proxy({}, createHandler());
  let calls = 0;
  subscribers["foo.bar"] = [() => calls++];

  state.foo = { bar: "foo" };
  assert(calls === 1, subscribers);

  state.foo.bar = "bar";
  assert(calls === 2, subscribers);
});
