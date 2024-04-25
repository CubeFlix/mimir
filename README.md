# Mimir

Mimir is a simple, lightweight yet powerful rich text editor written in vanilla JavaScript built by [cubeflix](https://github.com/cubeflix) and released under the MIT license. Much of the code in this library was hacked together over the course of a few months, so certain bugs may still be present, and the code isn't as clean as I'd like. My main goal was to build a working, bug-free rich text editor with *no* `execCommand` and zero dependencies (apart from [Bootstrap Icons](https://icons.getbootstrap.com)). However, I still think this is pretty usable!

Mimir runs as a wrapper around a single `contenteditable` container, representing the editor. The library provides styling and editing functionality on top of the default behavior of the browser, and smooths out some quirks with `contenteditable`, especially in Chrome. It also provides a custom UI interface and more complex features like copy and paste, drag'n'drop, nested lists, and history to create a more powerful editing experience. Have fun!

## Features

- Inline text styling (bold, italic, etc.)
- Paragraph styling (alignment, headers, etc.)
- Blockquotes
- Lists (bulleted, numbered, nested)
- Images and horizontal rules
- Find and replace
- Custom UI components (color picker, dropdowns, image editing overlay)
- Undo and redo history
- Paste and drag'n'drop (HTML normalization and sanitization)
- Nested block styles
- Bugfixes for certain `contenteditable` issues
- JSON serialization
- Simple API

## Example Usage

You can build the library using `npm run build` in the main directory. This should create a file called `mimir.js` in the `dist` directory. In an HTML file, load the `mimir.js` script, create a new Mimir object, and initialize it.

```html
<script src="dist/mimir.js"></script>
<div id="editor"></div>
<script>
    const container = document.getElementById("editor");
    const editor = new Mimir(container, { 
        height: "600px"
    });
    editor.init();
</script>
```

## Documentation
The Mimir API is documented [here](documentation.md).