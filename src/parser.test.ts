import test from "ava";
import jsdom from "jsdom";
import parseNode, {
  createPatternNode,
  createPatternVariables,
  createVariableNode,
  patterns,
} from "./parser";
import { ChangeVariableNode, Pointer } from "./types";
import { Variable } from "./context";

test("should create pattern variables", (t) => {
  const variables = createPatternVariables(
    patterns[0],
    "{#for list as item, i}"
  );
  t.is(variables.listVariable.path, "list");
  t.is(variables.itemVariable.path, "item");
  t.is(variables.indexVariable.path, "i");

  const variables2 = createPatternVariables(patterns[0], "{#for list as item}");
  t.is(variables2.listVariable.path, "list");
  t.is(variables2.itemVariable.path, "item");
  t.is(typeof variables2.indexVariable, "undefined");

  const variables3 = createPatternVariables(patterns[1], "{#if condition}");
  t.is(variables3.condition.path, "condition");

  const variables4 = createPatternVariables(
    patterns[1],
    "{#if a > b && b < c || c !== d}"
  );
  t.is(variables4.condition.path, "a > b && b < c || c !== d");
});

test("should create pattern node", (t) => {
  const node = createPatternNode(patterns[0], "{#for list as item, i}");
  t.is(node.node, "for");
  t.deepEqual(Object.keys(node.variables as Record<string, Pointer>), [
    "listVariable",
    "itemVariable",
    "indexVariable",
  ]);
  t.deepEqual(node.content, []);
  t.is(typeof node.render, "function");
  t.is(typeof node.addDependency, "function");

  const node2 = createPatternNode(patterns[1], "{#if condition}");
  t.is(node2.node, "if");
  t.deepEqual(Object.keys(node2.variables as Record<string, Pointer>), [
    "condition",
  ]);
  t.deepEqual(node2.content, []);
  t.is(typeof node2.render, "function");
  t.is(typeof node2.addDependency, "function");
});

test("should create variable node", (t) => {
  const node = createVariableNode("{variable}");
  t.is(node.node, "variable");
  t.is(typeof node["content"], "undefined");
  t.is(typeof node.render, "function");
  t.is(typeof node.addDependency, "function");
});

test("should render variable node", (t) => {
  const node = createVariableNode("{variable}");
  const context = {
    variable: new Variable("value", "variable"),
  };
  t.is((node as ChangeVariableNode).render(context), "value");
});

test("should render pattern node", (t) => {
  const node = createPatternNode(patterns[0], "{#for list as item, i}");
  node.content.push(createVariableNode("{item}"));
  const parent = document.createElement("div");
  const context = {
    list: new Variable(["a", "b", "c"], "list"),
  };
  node.render(context, parent);
  t.is(parent.innerHTML, "abc");

  node.content.push(createVariableNode("{i}"));
  node.render(context, parent);
  t.is(parent.innerHTML, "a0b1c2");
});

test("should create valid parsed node", (t) => {
  const dom = new jsdom.JSDOM(`
<template id="template">
  <div>
    Hello, <span>{name}</span>!
  </div>
</template>`);
  const result = parseNode(
    dom.window.document.querySelector("#template").content.cloneNode(true)
  );
  t.is((result.node as Node).nodeType, 11);
  t.is(result.content.length, 1);
  t.is((result.content[0].node as Node).nodeName, "DIV");
  t.is(result.content[0].eventListeners?.length, 0);
  t.is(result.content[0].content.length, 3);
  t.is(result.content[0].content[0] as string, "Hello,");
  t.is((result.content[0].content[1].node as Node).nodeName, "SPAN");
  t.is(result.content[0].content[1].eventListeners?.length, 0);
  t.is(result.content[0].content[1].content[0].node, "variable");
  t.is(result.content[0].content[2] as string, "!");
});
