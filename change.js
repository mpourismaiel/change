const variableReg = /{\s*([.\w]+)\s*}/;
const templates = Array.from(document.querySelectorAll("template[name]"));
const components = {};
const pointers = {};
const subscribers = {};

function addSubsciption(pathToVariable, context, callback) {
  if (!subscribers[pathToVariable]) {
    subscribers[pathToVariable] = [];
  }
  subscribers[pathToVariable].push((newValue) => {
    // Update context using the new value
    let variable = context;
    const keys = pathToVariable.split(".");
    for (let i = 0; i < keys.length - 1; i++) {
      variable = variable[keys[i]];
    }
    variable[keys[keys.length - 1]] = newValue;
    callback();
  });
}

function createPointer(pathInContext) {
  const splitPath = pathInContext.toLowerCase().split(".");

  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: (context) => splitPath.reduce((acc, key) => acc[key], context),
  };

  return pointers[pathInContext];
}

function createVariable(value, original, type = "variable") {
  return { value, type: "variable", original };
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

  function createPatternVariables(pattern, textContent) {
    return textContent.match(pattern.open).reduce((acc, v, i) => {
      if (pattern.variables[i]) {
        return { ...acc, [pattern.variables[i]]: createPointer(v) };
      } else {
        return acc;
      }
    }, {});
  }

  function createPatternNode(pattern, textContent) {
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

  function createVariableNode(textContent) {
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

function handleEventListeners(node, context, element) {
  if (!node.eventListeners) {
    return element;
  }

  node.eventListeners.forEach(({ value, event }) => {
    const callback = value.lookup(context).value;
    element.addEventListener(event, callback);
  });

  return element;
}

function renderNode(parent, node, context) {
  if (typeof node === "string") {
    parent.appendChild(
      handleEventListeners(node, context, document.createTextNode(node))
    );
  } else if (node.node === "variable") {
    const textNode = document.createTextNode(node.render(context));
    node.addDependency(textNode, context);
    parent.appendChild(handleEventListeners(node, context, textNode));
  } else if (node.node === "for") {
    const container = new DocumentFragment();
    node.render(container, context);
    node.addDependency(parent, context);
    parent.appendChild(handleEventListeners(node, context, container));
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
      let tagName = node.node.tagName;
      if (components[tagName.toUpperCase()]) {
        element = new components[tagName.toUpperCase()](context);
      } else {
        element = document.createElement(tagName);
      }
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
        parent.appendChild(handleEventListeners(node, context, child));
      }
    } else {
      parent.appendChild(handleEventListeners(node, context, element));
    }
  }
}

const createHandler = (path = []) => ({
  get: (target, key) => {
    if (typeof target[key] === "object" && target[key] !== null) {
      return new Proxy(target[key], createHandler([...path, key]));
    } else {
      return target[key];
    }
  },
  set: (target, key, value) => {
    target[key] = value;

    const subscriberPath = [...path, key].join(".");
    if (subscribers[subscriberPath]) {
      subscribers[subscriberPath].forEach((fn) => fn(value));
    }
    return true;
  },
  ownKeys: (target) => {
    return Reflect.ownKeys(target);
  },
});

const data = new Proxy({}, createHandler());

const updateData = (newData) => {
  Object.assign(data, newData);
};

class ChangeComponent extends HTMLElement {
  constructor(parentContext = null) {
    super();

    const propsContext = parentContext ? parentContext : data;
    const props = {
      ...(parentContext || {}),
      ...Array.from(this.attributes).reduce((acc, attr) => {
        if (variableReg.test(attr.value)) {
          const variable = attr.value.match(variableReg)[1];
          const value = createPointer(variable).lookup(propsContext);
          acc[attr.name] = createVariable(value, variable);
        } else {
          acc[attr.name] = createVariable(attr.value, null, "text");
        }
        return acc;
      }, {}),
    };

    const instance = this.constructor.template.content.cloneNode(true);
    const parsed = parseNode(instance);
    renderNode(this, parsed, props);
  }
}

function render() {
  templates.forEach((template) => {
    const name = template.getAttribute("name");
    const componentName = name.toUpperCase();
    components[componentName] = class extends ChangeComponent {
      static template = template;
      constructor(parentContext) {
        super(parentContext);
      }
    };
    customElements.define(name, components[componentName]);
  });
}
