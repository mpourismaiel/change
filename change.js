const variableReg = /{\s*([.\w]+)\s*}/;
const templates = Array.from(document.querySelectorAll("template[name]"));
const components = {};

function createPointer(path) {
  return {
    path,
    lookup: function (context) {
      return path.split(".").reduce((acc, key) => acc[key], context);
    },
  };
}

function createVariable(path) {
  return createPointer(path);
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

  function createPatternNode(pattern, textContent) {
    return {
      node: pattern.name,
      variables: textContent
        .match(pattern.open)
        .reduce(
          (acc, v, i) =>
            pattern.variables[i]
              ? { ...acc, [pattern.variables[i]]: createPointer(v) }
              : acc,
          {}
        ),
      content: [],
    };
  }

  function createVariableNode(textContent) {
    const matches = [];
    let match;
    const reg = new RegExp(variableReg, "g");
    while ((match = reg.exec(textContent)) !== null) {
      matches.push(match[1]);
    }

    const render = (context) => {
      const vars = matches.map((m) => createPointer(m).lookup(context).value);
      return textContent.replace(reg, (match, key) => {
        const index = matches.indexOf(key);
        return vars[index];
      });
    };

    return {
      node: "variable",
      render,
    };
  }

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

function renderNode(parent, node, context) {
  if (typeof node === "string") {
    parent.appendChild(document.createTextNode(node));
  } else if (node.node === "variable") {
    parent.appendChild(document.createTextNode(node.render(context)));
  } else if (node.node === "for") {
    const content = node.content;
    const list = node.variables.listVariable.lookup(context);
    if (list.type !== "variable") {
      throw new Error("List is not a variable");
    }

    list.value.forEach((item, index) => {
      const itemContext = {
        ...context,
        [node.variables.itemVariable.path]: { value: item, type: "variable" },
        [node.variables.indexVariable.path]: { value: index, type: "variable" },
      };

      content.forEach((child) => {
        renderNode(parent, child, itemContext);
      });
    });
  } else if (node.node === "if") {
    // TODO: not working
    const condition = node.variables.condition.lookup(context);
    const content = node.content;
    if (condition) {
      content.forEach((child) => {
        renderNode(parent, child, context);
      });
    }
  } else {
    let element;
    if (node.node instanceof DocumentFragment) {
      element = document.createElement("div");
      element.setAttribute("change-is-fragment", "true");
    } else {
      element = document.createElement(node.node.tagName);
      Object.keys(node.node.attributes).forEach((key) => {
        let value = node.node.getAttribute(node.node.attributes[key].name);
        if (variableReg.test(value)) {
          const variable = value.match(variableReg)[1];
          value = createPointer(variable).lookup(context).value;
        }
        element.setAttribute(node.node.attributes[key].name, value);
      });
    }

    node.content.forEach((child) => {
      renderNode(element, child, context);
    });
    if (element.getAttribute("change-is-fragment") === "true") {
      for (const child of Array.from(element.children)) {
        parent.appendChild(child);
      }
    } else {
      parent.appendChild(element);
    }
  }
}

let data = {};
data = new Proxy(data, {
  set(target, key, value) {
    target[key] = value;
  },
});

function render() {
  templates.forEach((template) => {
    const name = template.getAttribute("name");
    components[name] = class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        const context = Array.from(this.attributes).reduce((acc, attr) => {
          acc[attr.name] = { value: attr.value, type: "text" };
          return acc;
        }, {});

        Object.keys(data).forEach((key) => {
          const variableKey = Array.from(this.attributes).find(
            (attr) => attr.value === key
          );

          if (variableKey) {
            context[variableKey.name] = { value: data[key], type: "variable" };
          }
        });

        const instance = template.content.cloneNode(true);
        const parsed = parseNode(instance);
        renderNode(this.shadowRoot, parsed, context);
      }
    };

    customElements.define(name, components[name]);
  });
}
