import test from "ava";
import { TextVariable, Variable, createPointer } from "./context";
import { Pointer } from "./types";

test("should create variable", (t) => {
  const variable = new Variable("value", "variable");
  t.is(variable.value, "value");
  t.is(variable.original, "variable");

  const variable2 = new TextVariable("value", "variable");
  t.is(variable2.value, "value");
  t.is(variable2.original, "variable");
});

test("should create pointer", (t) => {
  const nullPointer = createPointer();
  t.is(nullPointer, null);

  const pointer = createPointer("variable") as Pointer;
  t.is(pointer.path, "variable");
  t.deepEqual(pointer.dependencies, []);
  t.is(typeof pointer.lookup, "function");

  const context = {
    variable: new Variable("value", "variable"),
  };
  t.deepEqual(pointer.lookup(context), "value");
  t.is(nullPointer, null);

  const textPointer = createPointer("variable") as Pointer;
  t.is(pointer.path, "variable");
  t.deepEqual(pointer.dependencies, []);
  t.is(typeof pointer.lookup, "function");

  const context2 = {
    variable: new TextVariable("value", "variable"),
  };
  t.deepEqual(pointer.lookup(context), "value");
});
