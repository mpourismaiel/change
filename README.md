Zero-dependency, build-free framework inspired by [Strawberry](https://strawberry.quest/).

This framework is under heavy development and currently it's not even pre-alpha.
Only use it to test it and please report issues or if possible, create PRs.

# What's Going On?

As much as I love Svelte, React and any other Front End framework, using them in small projects is a not fun.
Sometimes I just want to test some small idea or my project isn't big enough to justify creating a project with a bunch of unnecessary details and dependencies and build times.

This is where this framework comes into play. I can just create a shortcut to it in my new project, create my data and call `render`.
It would take care of composition and reactivity and nothing else. The syntax for templates is minimal and provides basic functionality.

# Usage

Somehow grab the code and link it to your page. Download the build, use Github's raw content url, clone the repo and create a shortcut to the build.

After that you can write your HTML. When you want composability, create a template tag with a name that matches naming conventions of web components (hyphenated lower case with at least two words, ex. `some-component`), use that name as your tag name and that's it.

You can use different components inside each other, order of templates doesn't matter.

If you need reactivity you can call `updateData(YOUR_DATA_OBJECT)` and afterwards any change to `YOUR_DATA_OBJECT` will be reflected in your components. You can use `YOUR_DATA_OBJECT.some_key` in your components using `prop_name={some_key}`.

Here is a small example:

```html
<html>
  <head>
    ...
  </head>
  <template name="some-component">
    <h2>Hello, {name}!</h2>
  </template>
  <body>
    ...
    <some-component name="{username}"></some-component>
    ...
    <script src="./change.js"></script>
    <script>
      // Converts your object to an observable proxy which will react to changes by updating the page.
      updateData({
        username: prompt("Your name?"),
      });

      // This function should ONLY be called once. Rendered your components in the page.
      render();
    </script>
  </body>
</html>
```

# Syntax

This is meant to be a small framework handling only the most basic needs of a frontend application. Only for loops, if conditions and variables and event listeners are supported in the syntax.

```html
<template name="some-component">
  <div class="form">
    <label for="newItem">New Item</label>
    <input
      on:keypress="{handleKeyPress}"
      name="newItem"
      id="newItem"
      placeholder="Please enter a new value to be added to the list"
    />
  </div>
  {#for list as item, i}
  <li>{item} - {i}</li>
  {/for} {#if listIsEmpty}
  <p>Please add an item</p>
  {/if}
</template>
<script>
  updateData({
    handleKeyPress(e) {
      if (e.keyCode === 13) {
        this.list.push(e.target.value);
        this.listIsEmpty = false;
        e.target.value = "";
      }
    },
    list: [],
    listIsEmpty: true,
  });

  render();
</script>
```

For and If nodes can be nested. For attaching event handlers please use `on:event` syntax and pass the key to your event handler callback which should be located in your data that you passed to `updateData` function.

# Performace

There is no performance. This is a small framework meant for basic usage. Even though the codebase is very small and function calls have been optimized, the code is not tested thoroughly.
I'm planning on writing tests and profiling the code but even with that, if your project needs reliable performance, I suggest using Svelte or React or Lit or any other major framework.

# Plans

Right now a lot of stuff don't work reliably or don't work at all.
The framework is not ready for use as it's stated above.

Currently my plans are to make it work reliably, write tests and profile.

These are the features I'm planning:

- [x] Create compoents
- [x] Render components
- [x] Composable components
- [x] Handle props
  - [ ] Props with nested keys: `prop={some.nested.key.in.data}
- [x] Use props
- [x] Event handlers
  - [ ] Event handlers with nested keys (same as nested props)
- [ ] Unified context accross context and passed variables
- [x] Use event handlers
- [ ] Event handlers persisting over updates
- [ ] Comprehensive life cycle events (maybe?)

Also:

- [ ] Write tests
- [ ] Profile
- [ ] Improve syntax?
