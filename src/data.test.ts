import test from "ava";
import { createHandler, resetSubscribers, subscribers } from "./data";

test("should get and set", (t) => {
  const state = new Proxy({}, createHandler());
  resetSubscribers();
  state.foo = "foo";
  t.is(state.foo, "foo");
});

test("should subscribe to changes", (t) => {
  const state = new Proxy({}, createHandler());
  resetSubscribers();
  let calls = 0;
  subscribers["foo"] = [() => calls++];

  state.foo = "foo";
  t.is(calls, 1);

  state.foo = "bar";
  t.is(calls, 2);
});

test("should subscribe to nested changes", (t) => {
  const state = new Proxy({}, createHandler());
  resetSubscribers();
  let calls = 0;
  subscribers["foo.bar"] = [() => calls++];

  state.foo = { bar: "foo" };
  t.is(calls, 1);

  state.foo.bar = "bar";
  t.is(calls, 2);

  let calls2 = 0;
  subscribers["foo.bar.baz"] = [() => calls2++];

  state.foo.bar = { baz: "baz" };
  t.is(calls, 3);
  t.is(calls2, 1);

  state.foo.bar.baz = "foo";
  t.is(calls, 4);
  t.is(calls2, 2);
});
