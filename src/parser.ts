import { EventListener, Variable, createPointer } from "./context";
import { addSubsciption } from "./data";
import renderNode from "./render";
import {
  ChangeNode,
  ChangeNodeWithChildren,
  ChangePatternNode,
  ChangeVariableNode,
  Pattern,
  Pointer,
} from "./types";
import { variableReg } from "./utils";

export const patterns: Pattern[] = [
  {
    name: "for",
    open: /^{#for\s(\w+)\sas\s(\w+)(,\s?(\w*))?}$/,
    close: /^{\/for}$/,
    variables: [null, "listVariable", "itemVariable", null, "indexVariable"],
  },
  {
    name: "if",
    open: /^{#if\s(.*)}$/,
    close: /^{\/if}$/,
    variables: [null, "condition"],
  },
];

export function createPatternVariables(
  pattern,
  textContent
): Record<string, Pointer> {
  return textContent.match(pattern.open).reduce((acc, v, i) => {
    if (pattern.variables[i]) {
      const pointer = createPointer(v);
      if (!pointer) {
        return acc;
      }

      return { ...acc, [pattern.variables[i]]: pointer };
    } else {
      return acc;
    }
  }, {});
}

export function createPatternNode(pattern, textContent): ChangePatternNode {
  const content: ChangeNode[] = [];
  let original = "";
  const variables = createPatternVariables(pattern, textContent);

  function render(context, parent) {
    const list = variables.listVariable.lookup(context);
    if (!Array.isArray(list)) {
      throw new Error("List is not an array");
    }
    original = list.original;

    // Render list
    parent.innerHTML = "";
    (list.valueOf() as Array<unknown>).forEach((item, index) => {
      const itemContext = {
        ...context,
        [variables.itemVariable.path]: new Variable(
          item,
          `${original}.${variables.itemVariable.path}`
        ),
        [variables.indexVariable.path]: new Variable(
          index,
          `${original}.${variables.indexVariable.path}`
        ),
      };

      // Render item's content
      content.forEach((child) => {
        renderNode(parent, child, itemContext);
      });
    });
  }

  return {
    node: pattern.name,
    variables,
    content,
    render,
    addDependency(parent, context) {
      addSubsciption(original, context, (newValue) => {
        render(parent, context);
      });
    },
  };
}

export function createVariableNode(textContent): ChangeVariableNode {
  const matches: Pointer[] = [];
  let originalPaths = [];
  let match;
  const reg = new RegExp(variableReg, "g");
  while ((match = reg.exec(textContent)) !== null) {
    const pointer = createPointer(match[1]);
    if (!pointer) {
      continue;
    }
    matches.push(pointer);
  }

  const render = (context) => {
    const vars = matches.map((m) => m.lookup(context));
    return textContent.replace(reg, (_, key) => {
      let index = -1;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i].path === key) {
          index = i;
          break;
        }
      }
      return vars[index].valueOf();
    });
  };

  return {
    node: "variable",
    render,
    addDependency(node, context) {
      originalPaths.forEach(({ original, path }) => {
        addSubsciption(original, context, (newValue) => {
          node.textContent = render(context);
        });
      });
    },
  };
}

function parseNode(node: Node): ChangeNode {
  const result: ChangeNode = {
    node: node,
    content: [],
  };

  function processContent(childNodes) {
    let content: ChangeNode[] = [];
    let insideBlock = false;
    let currentPattern: Pattern | null = null;

    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const textContent = child.textContent.trim();

        if (insideBlock) {
          if (currentPattern && currentPattern.close.test(textContent)) {
            insideBlock = false;
            currentPattern = null;
          } else {
            (content[content.length - 1] as ChangePatternNode).content.push(
              textContent
            );
          }
        } else {
          const pattern = patterns.find((p) => p.open.test(textContent));

          if (pattern) {
            insideBlock = true;
            currentPattern = pattern;
            content.push(createPatternNode(pattern, textContent));
          } else {
            if (variableReg.test(textContent)) {
              content.push(createVariableNode(textContent));
            } else {
              content.push(textContent);
            }
          }
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const parsedChild = parseNode(child);

        parsedChild.eventListeners = Array.from(
          (parsedChild.node as HTMLElement).attributes
        ).reduce(
          (acc: EventListener[], attr: { name: string; value: string }) => {
            if (!attr.name.startsWith("on:") || !variableReg.test(attr.value)) {
              return acc;
            }

            (parsedChild.node as HTMLElement).removeAttribute(attr.name);
            const variable = attr.value.match(variableReg);
            if (!variable) {
              return acc;
            }

            const eventHandler = variable[1];
            acc.push(
              new EventListener(
                createPointer(eventHandler),
                eventHandler,
                attr.name.replace(/^on:/, "")
              )
            );
            return acc;
          },
          []
        );

        if (insideBlock) {
          (content[content.length - 1] as ChangeNodeWithChildren).content.push(
            parsedChild
          );
        } else {
          content.push(parsedChild);
        }
      }
    }

    return content;
  }

  result.content = processContent(node.childNodes);
  return result;
}

export default parseNode;
