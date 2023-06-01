const forRegex = {
  reg: /^{#for\s(\w+)\sas\s(\w+),\s?(\w*)}$/,
  listVariable: 1,
  itemVariable: 2,
  indexVariable: 3,
};
const ifRegex = {
  reg: /^{#if\s(.*)}$/,
  condition: 1,
};

const templates = Array.from(document.querySelectorAll("template[name]"));
const components = {};

function evaluateCondition(context, condition) {
  const variables = Object.keys(context);
  const fn = new Function(...variables, `return ${condition}`);
  return fn(...variables.map((variable) => context[variable].value));
}

function parseTemplate(template, lookingFor = null) {
  const nodes = [];

  let acc = "";
  for (let i = 0; i < template.length; i++) {
    const char = template[i];
    if (acc[0] === "{") {
      if (char === "}") {
        acc += char;
        if (forRegex.reg.test(acc)) {
          const match = acc.match(forRegex.reg);
          const [children, newIndex] = parseTemplate(
            template.slice(i + 1),
            "for"
          );
          i += newIndex;
          nodes.push({
            type: "for",
            context: [
              match[forRegex.listVariable].trim(),
              match[forRegex.itemVariable].trim(),
              match[forRegex.indexVariable].trim(),
            ],
            children,
          });
        } else if (ifRegex.reg.test(acc)) {
          const match = acc.match(ifRegex.reg);
          const [children, newIndex] = parseTemplate(
            template.slice(i + 1),
            "if"
          );
          i += newIndex;
          const condition = match[ifRegex.condition].trim();
          const normalizedCondition = condition
            .replace(/&gt;/g, ">")
            .replace(/&lt;/g, "<")
            .replace(/&amp;/g, "&");
          nodes.push({
            type: "if",
            context: [normalizedCondition],
            children,
          });
        } else if (acc[1] === "/") {
          if (lookingFor !== acc.slice(2, -1).trim()) {
            throw new Error(
              `Unexpected closing tag, expected ${lookingFor}, got ${acc
                .slice(2, -1)
                .trim()}`
            );
          }
          return [nodes, i + 1];
        } else {
          nodes.push({
            type: "variable",
            context: [acc.slice(1, -1).trim()],
          });
        }

        acc = "";
        continue;
      }

      acc += char;
      continue;
    }

    if (char === "{") {
      acc = char;
      continue;
    }

    const lastNode = nodes[nodes.length - 1];
    if (!lastNode || lastNode.type !== "html") {
      nodes.push({ type: "html", value: "" });
    }
    nodes[nodes.length - 1].value += char;
    acc = char;
  }

  return [nodes, template.length];
}

function renderTemplate(parsedTemplate, context) {
  const nodes = [];
  for (const node of parsedTemplate) {
    if (node.type === "html") {
      nodes.push(node.value);
    } else if (node.type === "variable") {
      nodes.push(context[node.context[0]].value);
    } else if (node.type === "for") {
      const [list, item, index] = node.context;
      const listValue = context[list];
      if (listValue.type !== "variable") {
        continue;
      }
      const children = listValue.value.map((itemValue, i) => {
        const childContext = {
          ...context,
          [item]: { value: itemValue, type: "variable" },
        };
        if (index) {
          childContext[index] = { value: i, type: "variable" };
        }
        return renderTemplate(node.children, childContext);
      });
      nodes.push(children.join(""));
    } else if (node.type === "if") {
      const [condition] = node.context;
      if (evaluateCondition(context, condition)) {
        nodes.push(renderTemplate(node.children, context));
      }
    }
  }

  return nodes.join("");
}

let data = {};
data = new Proxy(data, {
  set(target, key, value) {
    target[key] = value;
  },
});

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

      this.shadowRoot.innerHTML = renderTemplate(
        parseTemplate(template.innerHTML)[0],
        context
      );
    }
  };

  customElements.define(name, components[name]);
});
