import { TextVariable, Variable, createPointer } from "./context";
import { Pointer } from "./types";

describe("context", () => {
  test("should create variable", () => {
    const variable = new Variable("value", "variable");
    expect(variable.value).toEqual("value");
    expect(variable.original).toEqual("variable");

    const variable2 = new TextVariable("value", "variable");
    expect(variable2.value).toEqual("value");
    expect(variable2.original).toEqual("variable");
  });

  test("should create pointer", () => {
    const nullPointer = createPointer();
    expect(nullPointer).toEqual(null);

    const pointer = createPointer("variable") as Pointer;
    expect(pointer.path).toEqual("variable");
    expect(pointer.dependencies).toEqual([]);
    expect(typeof pointer.lookup).toEqual("function");

    const context = {
      variable: new Variable("value", "variable"),
    };
    expect(pointer.lookup(context)).toEqual("value");
    expect(nullPointer).toEqual(null);

    const textPointer = createPointer("variable") as Pointer;
    expect(pointer.path).toEqual("variable");
    expect(pointer.dependencies).toEqual([]);
    expect(typeof pointer.lookup).toEqual("function");

    const context2 = {
      variable: new TextVariable("value", "variable"),
    };
    expect(pointer.lookup(context)).toEqual("value");
  });
});
