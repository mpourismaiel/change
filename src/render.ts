import { createPointer } from "./context";
import handleEventListeners from "./events";
import { components, variableReg } from "./utils";

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

export default renderNode;
