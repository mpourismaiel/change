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

export default handleEventListeners;
