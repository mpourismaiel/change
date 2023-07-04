import jsdom from "jsdom";
import parseNode, {
  createPatternNode,
  createPatternVariables,
  createVariableNode,
  patterns,
} from "./parser";
import { ChangeVariableNode, Pointer } from "./types";
import { Variable } from "./context";

describe("parser", () => {
  test("should create pattern variables", () => {
    const variables = createPatternVariables(
      patterns[0],
      "{#for list as item, i}"
    );
    expect(variables.listVariable.path).toEqual("list");
    expect(variables.itemVariable.path).toEqual("item");
    expect(variables.indexVariable.path).toEqual("i");

    const variables2 = createPatternVariables(
      patterns[0],
      "{#for list as item}"
    );
    expect(variables2.listVariable.path).toEqual("list");
    expect(variables2.itemVariable.path).toEqual("item");
    expect(typeof variables2.indexVariable).toEqual("undefined");

    const variables3 = createPatternVariables(patterns[1], "{#if condition}");
    expect(variables3.condition.path).toEqual("condition");

    const variables4 = createPatternVariables(
      patterns[1],
      "{#if a > b && b < c || c !== d}"
    );
    expect(variables4.condition.path).toEqual("a > b && b < c || c !== d");
  });

  test("should create pattern node", () => {
    const node = createPatternNode(patterns[0], "{#for list as item, i}");
    expect(node.node).toEqual("for");
    expect(Object.keys(node.variables as Record<string, Pointer>)).toEqual([
      "listVariable",
      "itemVariable",
      "indexVariable",
    ]);
    expect(node.content).toEqual([]);
    expect(typeof node.render).toEqual("function");
    expect(typeof node.addDependency).toEqual("function");

    const node2 = createPatternNode(patterns[1], "{#if condition}");
    expect(node2.node).toEqual("if");
    expect(Object.keys(node2.variables as Record<string, Pointer>)).toEqual([
      "condition",
    ]);
    expect(node2.content).toEqual([]);
    expect(typeof node2.render).toEqual("function");
    expect(typeof node2.addDependency).toEqual("function");
  });

  test("should create variable node", () => {
    const node = createVariableNode("{variable}");
    expect(node.node).toEqual("variable");
    expect(node.content).toEqual([]);
    expect(typeof node.render).toEqual("function");
    expect(typeof node.addDependency).toEqual("function");
  });

  test("should render variable node", () => {
    const node = createVariableNode("{variable}");
    const context = {
      variable: new Variable("value", "variable"),
    };
    expect((node as ChangeVariableNode).render(context)).toEqual("value");
  });

  test("should render pattern node", () => {
    const node = createPatternNode(patterns[0], "{#for list as item, i}");
    node.content.push(createVariableNode("{item}"));
    const parent = document.createElement("div");
    const context = {
      list: new Variable(["a", "b", "c"], "list"),
    };
    node.render(context, parent);
    expect(parent.innerHTML).toEqual("abc");

    node.content.push(createVariableNode("{i}"));
    node.render(context, parent);
    expect(parent.innerHTML).toEqual("a0b1c2");
  });

  test("should create valid parsed node", () => {
    const dom = new jsdom.JSDOM(`
<template id="template">
  <div>
    Hello, <span>{name}</span>!
  </div>
</template>`);
    const result = parseNode(
      dom.window.document.querySelector("#template").content.cloneNode(true)
    );
    expect((result.node as Node).nodeType).toEqual(11);
    expect(result.content.length).toEqual(1);
    expect((result.content[0].node as Node).nodeName).toEqual("DIV");
    expect(result.content[0].eventListeners?.length).toEqual(0);
    expect(result.content[0].content.length).toEqual(3);
    expect(result.content[0].content[0] as string).toEqual("Hello,");
    expect((result.content[0].content[1].node as Node).nodeName).toEqual(
      "SPAN"
    );
    expect(result.content[0].content[1].eventListeners?.length).toEqual(0);
    expect(result.content[0].content[1].content[0].node).toEqual("variable");
    expect(result.content[0].content[2] as string).toEqual("!");
  });
});
