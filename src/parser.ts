import { addSubsciption, createPointer, createVariable } from "./context";
import renderNode from "./render";
import { variableReg } from "./utils";

export function createPatternVariables(pattern, textContent) {
  return textContent.match(pattern.open).reduce((acc, v, i) => {
    if (pattern.variables[i]) {
      return { ...acc, [pattern.variables[i]]: createPointer(v) };
    } else {
      return acc;
    }
  }, {});
}

export function createPatternNode(pattern, textContent) {
  const content = [];
  let original = "";
  const variables = createPatternVariables(pattern, textContent);

  function render(parent, context, { path, newValue } = {}) {
    const list = variables.listVariable.lookup(context, {
      original,
      path,
      newValue,
    });
    if (list.type !== "variable") {
      throw new Error("List is not a variable");
    }
    original = list.original;

    // Render list
    parent.innerHTML = "";
    list.value.forEach((item, index) => {
      const itemContext = {
        ...context,
        [variables.itemVariable.path]: createVariable(
          item,
          `${original}.${variables.itemVariable.path}`
        ),
        [variables.indexVariable.path]: createVariable(
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
        render(parent, context, {
          original,
          path: variables.listVariable.path,
          newValue,
        });
      });
    },
  };
}

export function createVariableNode(textContent) {
  const matches = [];
  let originalPaths = [];
  let match;
  const reg = new RegExp(variableReg, "g");
  while ((match = reg.exec(textContent)) !== null) {
    matches.push(createPointer(match[1]));
  }

  const render = (context, { original, path, newValue } = {}) => {
    const vars = matches.map((m) =>
      m.lookup(context, { original, path, newValue })
    );
    originalPaths = vars.map((v, i) => ({
      original: v.original,
      path: matches[i].path,
      value: v.value,
    }));
    return textContent.replace(reg, (_, key) => {
      let index = -1;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i].path === key) {
          index = i;
          break;
        }
      }
      return vars[index].value;
    });
  };

  const addDependency = (node, context) => {
    originalPaths.forEach(({ original, path }) => {
      addSubsciption(original, context, (newValue) => {
        node.textContent = render(context, { original, path, newValue });
      });
    });
  };

  return {
    node: "variable",
    render,
    addDependency,
  };
}

function parseNode(node) {
  const result = {
    node: node,
    content: [],
  };

  const patterns = [
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

  function processContent(childNodes) {
    let content = [];
    let insideBlock = false;
    let currentPattern = null;

    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const textContent = child.textContent.trim();

        if (insideBlock) {
          if (currentPattern.close.test(textContent)) {
            insideBlock = false;
            currentPattern = null;
          } else {
            content[content.length - 1].content.push(textContent);
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
          parsedChild.node.attributes
        ).reduce((acc, attr) => {
          if (!attr.name.startsWith("on:") || !variableReg.test(attr.value)) {
            return acc;
          }

          parsedChild.node.removeAttribute(attr.name);
          const eventHandler = attr.value.match(variableReg)[1];
          acc.push({
            value: createPointer(eventHandler),
            original: eventHandler,
            event: attr.name.replace(/^on:/, ""),
            type: "eventListener",
          });
          return acc;
        }, []);

        if (insideBlock) {
          content[content.length - 1].content.push(parsedChild);
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
