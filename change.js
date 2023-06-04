const variableReg = /{\s*([.\w]+)\s*}/;
const templates = Array.from(document.querySelectorAll("template[name]"));
const components = {};
const pointers = {};
const subscribers = {};

function createPointer(pathInContext) {
  pointers[pathInContext] = {
    path: pathInContext,
    dependencies: [],
    lookup: function (context, { original, path, newValue } = {}) {
      if (newValue) {
        if (path === pathInContext) {
          // Update context using the new value
          // TODO: This should not happen during lookup, it should be done as a subscribtion call
          let variable = context;
          const keys = pathInContext.split(".");
          for (let i = 0; i < keys.length - 1; i++) {
            variable = variable[keys[i]];
          }
          variable[keys[keys.length - 1]] = newValue;
          return { value: newValue, type: "variable", original: pathInContext };
        }
      }
      const variable = pathInContext
        .split(".")
        .reduce((acc, key) => acc[key], context);
      return variable;
    },
  };

  return pointers[pathInContext];
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
    const content = [];
    let original = "";
    const variables = textContent.match(pattern.open).reduce((acc, v, i) => {
      if (pattern.variables[i]) {
        return { ...acc, [pattern.variables[i]]: createPointer(v) };
      } else {
        return acc;
      }
    }, {});

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
          [variables.itemVariable.path]: {
            value: item,
            type: "variable",
            original: `${original}.${variables.itemVariable.path}`,
          },
          [variables.indexVariable.path]: {
            value: index,
            type: "variable",
            original: `${original}.${variables.indexVariable.path}`,
          },
        };

        // Render item's content
        content.forEach((child) => {
          renderNode(parent, child, itemContext);
        });
      });
    }

    function addDependency(parent, context) {
      if (!subscribers[original]) {
        subscribers[original] = [];
      }
      subscribers[original].push((newValue) => {
        render(parent, context, {
          original,
          path: variables.listVariable.path,
          newValue,
        });
      });
    }

    return {
      node: pattern.name,
      render,
      variables,
      addDependency,
      content,
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
        if (!subscribers[original]) {
          subscribers[original] = [];
        }
        subscribers[original].push((newValue) => {
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
        // TODO: simplify this
        parsedChild.eventListeners = Array.from(parsedChild.node.attributes)
          .map((attr) => attr.name)
          .filter((name) => name.startsWith("on:"))
          .map((name) => name.replace(/^on:/, ""))
          .forEach((name) => parsedChild.node.removeAttribute(`on:${name}`));

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
    const textNode = document.createTextNode(node.render(context));
    node.addDependency(textNode, context);
    parent.appendChild(textNode);
  } else if (node.node === "for") {
    const container = new DocumentFragment();
    node.render(container, context);
    node.addDependency(parent, context);
    parent.appendChild(container);
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
      element.context = context;
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
      setTimeout(() => {
        // TODO: we should create new context for the node when calling subscribers, if not, they will use the old context of the component
        subscribers[subscriberPath].forEach((fn) => fn(value));
      }, 0);
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

function render() {
  templates.forEach((template) => {
    const name = template.getAttribute("name");
    components[name] = class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        const context = {
          ...(this.context || {}),
          ...Array.from(this.attributes).reduce((acc, attr) => {
            acc[attr.name] = { value: attr.value, type: "text" };
            return acc;
          }, {}),
        };

        Object.keys(data).forEach((key) => {
          const variableKey = Array.from(this.attributes).find(
            (attr) => attr.value === key
          );

          if (variableKey) {
            context[variableKey.name] = {
              original: key,
              value: data[key],
              type: "variable",
            };
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
