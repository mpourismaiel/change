import test from "ava";
import { subscribers } from "./context";
import { createHandler } from "./data";

test("should get and set", (t) => {
  const state = new Proxy({}, createHandler());
  state.foo = "foo";
  t.is(state.foo, "foo");
});

test("should subscribe to changes", (t) => {
  const state = new Proxy({}, createHandler());
  let calls = 0;
  subscribers["foo"] = [() => calls++];

  state.foo = "foo";
  t.is(calls, 1);

  state.foo = "bar";
  t.is(calls, 2);
});

test("should subscribe to nested changes", (t) => {
  const state = new Proxy({}, createHandler());
  let calls = 0;
  subscribers["foo.bar"] = [() => calls++];

  state.foo = { bar: "foo" };
  t.is(calls, 1);

  state.foo.bar = "bar";
  t.is(calls, 2);
});
