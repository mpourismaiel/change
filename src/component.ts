import { createPointer, createVariable } from "./context";
import { data } from "./data";
import parseNode from "./parser";
import renderNode from "./render";
import { variableReg, components, templates } from "./utils";

class ChangeComponent extends HTMLElement {
  constructor(parentContext = null) {
    super();

    const propsContext = parentContext ? parentContext : data;
    const props = {
      ...(parentContext || {}),
      ...Array.from(this.attributes).reduce((acc, attr) => {
        if (variableReg.test(attr.value)) {
          const variable = attr.value.match(variableReg)?.[1];
          if (!variable) {
            throw new Error("Invalid variable");
          }

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

export default render;
