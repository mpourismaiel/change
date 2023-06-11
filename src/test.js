import { subscribers } from "./context";
import { createHandler } from "./data";

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
