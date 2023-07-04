import { createHandler, resetSubscribers, subscribers } from "./data";

describe("data", () => {
  test("should get and set", () => {
    const state = new Proxy({}, createHandler());
    resetSubscribers();
    state.foo = "foo";
    expect(state.foo).toEqual("foo");
  });

  test("should subscribe to changes", () => {
    const state = new Proxy({}, createHandler());
    resetSubscribers();
    let calls = 0;
    subscribers["foo"] = [() => calls++];

    state.foo = "foo";
    expect(calls).toEqual(1);

    state.foo = "bar";
    expect(calls).toEqual(2);
  });

  test("should subscribe to nested changes", () => {
    const state = new Proxy({}, createHandler());
    resetSubscribers();
    let calls = 0;
    subscribers["foo.bar"] = [() => calls++];

    state.foo = { bar: "foo" };
    expect(calls).toEqual(1);

    state.foo.bar = "bar";
    expect(calls).toEqual(2);

    let calls2 = 0;
    subscribers["foo.bar.baz"] = [() => calls2++];

    state.foo.bar = { baz: "baz" };
    expect(calls).toEqual(3);
    expect(calls2).toEqual(1);

    state.foo.bar.baz = "foo";
    expect(calls).toEqual(4);
    expect(calls2).toEqual(2);
  });
});
