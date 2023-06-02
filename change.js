const variableReg = /^{\s*([.\w]+)\s*}$/;
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

function createVariable(declaration, variable) {
  return { [declaration]: createPointer(variable) };
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
              ? { ...acc, ...createVariable(pattern.variables[i], v) }
              : acc,
          {}
        ),
      content: [],
    };
  }

  function createVariableNode(variable) {
    return {
      node: "variable",
      variables: createVariable(variable, variable),
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
              const inside = textContent.match(variableReg);
              content.push(createVariableNode(inside[1]));
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
    const textNode = document.createTextNode(node);
    parent.appendChild(textNode);
  } else if (node.node === "variable") {
    const variable =
      node.variables[Object.keys(node.variables)[0]].lookup(context);
    const textNode = document.createTextNode(variable.value);
    parent.appendChild(textNode);
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
    } else {
      element = document.createElement(node.node.tagName);
      // append attributes
      Object.keys(node.node.attributes).forEach((key) => {
        let value = node.node.getAttribute(node.node.attributes[key].name);
        if (variableReg.test(value)) {
          const variable = value.match(variableReg)[1];
          value = createVariable(variable, variable)[variable].lookup(
            context
          ).value;
        }
        element.setAttribute(node.node.attributes[key].name, value);
      });
    }

    node.content.forEach((child) => {
      renderNode(element, child, context);
    });
    parent.appendChild(element);
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
        console.log(parsed);
        const rendered = renderNode(this.shadowRoot, parsed, context);
        console.log(rendered);
      }
    };

    customElements.define(name, components[name]);
  });
}
