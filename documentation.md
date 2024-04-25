# Documentation

## Quickstart

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

## Settings

A settings object can optionally be passed into the Mimir constructor. A list of allowed parameters and their function is included below.

- `commands`: A list of allowed commands to be enabled. See [Commands](#Commands) for more information. Defaults to `"bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub", "link", "quote", "header", "align", "list", "indent", "outdent", "insertImage", "insertHorizontalRule", "undo", "redo"`.
- `menubarSettings`: A template controlling the menubar layout. It should be a list of lists, each containing a number of menubar options, as strings. Defaults to:
```json
[
    ["bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub", "link", "remove"],
    ["quote", "header", "align", "list", "indent", "outdent"],
    ["insertImage", "insertHorizontalRule"],
    ["undo", "redo", "openFindAndReplace", "zoom"]
]
```
which contains all possible options. A spacer is placed in between each list group of items.
- `snapshotInterval`: A duration in milliseconds controlling the interval of time to wait before taking a history snapshot for the undo/redo manager. If the contents of the editor do not change between snapshots, they will not be saved. Defaults to `5000`, or 5 seconds.
- `historyLimit`: Maximum number of snapshots in the undo/redo history. Once this capacity is reached, old snapshots will be discarded. Defaults to `100`.
- `supportedFonts`: A list of fonts to be used in the editor. Fonts must be installed and accessible via styles. Defaults to `"Arial", "Times New Roman", "monospace", "Helvetica"`.
- `defaultFont`: The default font family. Defaults to `Arial`.
- `defaultSize`: The default font size. Defaults to `16`.
- `spellcheck`: A boolean controlling whether to enable the browser's spellchecking in the editor. Defaults to `true`.
- `allowPasteHTML`: Whether to allow pasting HTML content into the editor. If this is true, content will still be sanitized and normalized before being inserted. If this is false, editor will use the text content of the clipboard during pastes. Defaults to `true`.
- `zoomOptions`: A list of zoom percentages, as strings. Defaults to `"50", "75", "90", "100", "125", "150", "175", "200"`.

## Commands

Commands are what Mimir uses internally to communicate styling and information about editor actions. They are represented as objects with one required field: `type`. A command's type determines the type of command to execute. Additional command information (such as font size, for the `size` command), may be included as fields in the object. 

Most of these commands and menubar options are available as functions with the same name in the Mimir class API. Those which have differing names have a note explaining otherwise.

The following is a list of commands and menubar options.

### `bold`

Apply bold styling to the selection. If all the text is already bold, it will be removed. Both a command and menubar option. Shortcut: `Ctrl+B`.

### `italic`

Apply italic styling to the selection. If all the text is already italic, it will be removed. Both a command and menubar option. Shortcut: `Ctrl+I`.

### `underline`

Apply underline styling to the selection. If all the text is already underlined, it will be removed. Both a command and menubar option. Shortcut: `Ctrl+U`.

### `strikethrough`

Apply strikethrough styling to the selection. If all the text is already struckthrough, it will be removed. Both a command and menubar option.

### `font`

- `family`: The font family to apply.

Apply a font family to the selection. Both a command and menubar option.

### `size`

- `size`: The font size to apply, in pixels.

Apply a font size to the selection. Both a command and menubar option.

### `foreColor`

- `color`: The color to apply, as a CSS color value.

Apply a foreground color to the selection. Both a command and menubar option.

### `backColor`

- `color`: The color to apply, as a CSS color value.

Apply a background color to the selection. Both a command and menubar option.

### `sup`

Apply superscript styling to the selection. If all the text is already superscripted, it will be removed. Both a command and menubar option.

### `sub`

Apply subscript styling to the selection. If all the text is already subscripted, it will be removed. Both a command and menubar option.

### `link`

- `url`: The URL to apply. Will be sanitized before applying.

Apply link styling to the selection. If all the text is already hyperlinked, it will be removed. Both a command and menubar option.

### `remove`

Remove all inline styling from the selection. Both a command and menubar option.

### `quote`

Apply blockquote styling to the selection. As a block command, it will apply the style to the selected paragraphs, and attempt to join adjacent styled blocks. When the selection entirely within another block, the style will be applied within the parent block. When the selection extends over multiple blocks, the style will be applied outside the blocks and the newly styled blocks will be joined. Both a command and menubar option.

### `header`

- `level`: The header level to apply. Possible values are `H1` through `H6`, and `Paragraph`. `Paragraph` will remove all header styling from the text.

Apply header (Paragraph, H1-H6) styling to the selection. As a paragraph command, it will apply the style to the selected paragraphs, but will not join adjacent styled blocks. It will always be applied within blocks. Both a command and menubar option.

### `align`

- `direction`: The alignment direction. Possible values are `left`, `right`, `center`, and `justify`. `left` will remove all alignment from the text, as `left` is default.

Apply alignment styling to the selection. As a paragraph command, it will apply the style to the selected paragraphs, but will not join adjacent styled blocks. It will always be applied within blocks. Both a command and menubar option.

### `list`

- `listType`: The list type. Possible values are `ordered` and `unordered`. 

Apply list styling to the selection, and try to join the elements. If the selection contains no lists, the list of the specified type will be applied. If the selection already contains a list, it will be changed to the specified type, and non-list paragraphs will be placed in a list. If the selection already contains lists of the specified type, they will be removed. Nested lists will have the style applied to the closest layer to the selection.

As a block command, it will apply the style to the selected paragraphs, and attempt to join adjacent styled blocks. When the selection entirely within another block, the style will be applied within the parent block. When the selection extends over multiple blocks, the style will be applied outside the blocks and the newly styled blocks will be joined. Both a command and menubar option.

### `indent`

Increase the indent on the selection. On regular paragraphs, it will apply a 40 pixel indent to the left side. On lists, it will attempt to nest the selected lists by one layer, and join them to adjacent lists in the next layer.

As a block command, it will apply the style to the selected paragraphs, and attempt to join adjacent styled blocks. When the selection entirely within another block, the style will be applied within the parent block. When the selection extends over multiple blocks, the style will be applied outside the blocks and the newly styled blocks will be joined. Both a command and menubar option.

### `outdent`

Decrease the indent on the selection. On regular paragraphs, it will remove any 40 pixel indents on the left side. On lists, it will attempt to break out the selected lists by one layer, and join them to adjacent lists in the next layer. If there are no lists to break out of, the command will remove the list.

As a block command, it will apply the style to the selected paragraphs, and attempt to join adjacent styled blocks. When the selection entirely within another block, the style will be applied within the parent block. When the selection extends over multiple blocks, the style will be applied outside the blocks and the newly styled blocks will be joined. Both a command and menubar option.

### `insertImage`

- `url`: The URL of the image to insert. This command will not create an object URL to cache images. 
- `alt`: The alt text of the image. Optional.

Insert an image into the editor. Removes the current selection and inserts the image as an inline object at the cursor's position. Both a command and menubar option.

### `insertHorizontalRule`

Insert a horizontal rule into the editor. Removes the current selection and inserts the rule as a block object at the cursor's position. It may break paragraphs into two, in order to place the rule at a paragraph level. Both a command and menubar option. As an API function, it is called `insertHR`.

### `undo`

Undo the last command in the editor. Only a menubar option. Shortcut: `Ctrl+Z`.

### `redo`

Redo the last undone command in the editor. Only a menubar option. Shortcut: `Ctrl+Y`.

### `openFindAndReplace`

Open the find and replace dialog. Only a menubar option. Shortcut: `Ctrl+F`.

### `zoom`

- `level`: A string containing the zoom level percentage. The string should not include any units.

Zoom into the editor. Only a menubar option. As an API function, it is called `applyZoom`, as `zoom` is a function used internally.

## Formatting Options

Mimir supports three types of formatting: inline, inline-block/paragraph, and block. Inline formatting applies to runs of text within paragraphs, such as bold and italic. Paragraph formatting applies to single paragraphs only, like headers and alignment. Paragraph formatting cannot stretch over a single paragraph and cannot be less than a single paragraph. Finally, block styling applies to large blocks of text, over multiple paragraphs. 

### Inline
- Bold, italic, underline, strike-through
- Font family, font size
- Foreground and background color
- Superscript, subscript
- Hyperlink
- Remove all styling

### Paragraph
- Alignment
- Header (H1-H6)

### Block
- Blockquote
- Ordered and unordered list
- Indenting

### Miscellaneous
- Images
- Horizontal rule

## API

### Mimir

The Mimir editor class. The constructor takes in a container element in which to build the editor, and an optional settings object.

```js
constructor(element: HTMLElement, settings?: Settings)
```

See [Settings](#settings) for documentation on the allowed settings.

### `init`

```js
init()
```

Initialize the Mimir editor. This is the only function required by user code to run the Mimir editor. This function initializes global state values, the editor container and menubar, and binds events and UI to editor functions.

### Styling and Menubar Functions

Most, if not all styling and menubar functions are available as functions in the Mimir class API under a same or similar name. See [Commands](#commands) for a list of commands and their associated API names. These include inline, paragraph, and block formatting options, alongside other miscellaneous insertion and history functions.

If the commands take any arguments, such as `font`, they will be available as arguments in their associated API function as well.

### `new`

```js
new()
```

Reset the editor.

### `export`

```js
export(): Promise<{
    content: string
}>
```

Export the editor's contents to HTML. This will take a snapshot of the contents, convert all images blobs to data URLs, and remove internal invisible objects.

### `import`

```js
import(doc: {
    content: string
})
```

Import HTML content into the editor, replacing all other content. This will sanitize but not normalize the content (see [Normalization](#normalization)) and convert all data URLs into image blobs.

### `releaseImageURLs`

```js
releaseImageURLs()
```

Release and revoke all image object URLs allocated by the editor. If there are images on the page uploaded from the menu, they will likely break. This should ideally be done before destroying the editor, if the page is going to be used again.

### `saveHistory`

```js
saveHistory()
```

Take a snapshot of the editor and push it into the history stack. This can then be undone via the `undo` command. If this snapshot is identical to the last snapshot, it will be ignored.

### Internal Functions

There are a number of additional internal functions that may be useful, however, they are not always guaranteed to work exactly as advertised or stay consistent between versions. You can example the source code to understand what they do, but you should use them at your own risk, since they can break other things!

See [Code Layout](#code-layout) for more information.

## Normalization

A common function in Mimir is normalization and sanitization of HTML or DOM nodes. This is generally handled using document-adjacent DOM, which is then manipulated before being inserted into the editor. Normalization and sanitization are what allow Mimir to provide high-quality copy/paste and drag'n'drop functionality, without sacrificing robustness and safety.

Normalization is the process of

## Code Layout

Much of the code in Mimir is in one file, `src/mimir.js`, which defines the `Mimir` class and all the editing functionality. At some point I'd like to clean it up and refactor it, but for now it makes development simple. UI components are stored in `src/ui.js`, which exports a `MimirUI` object that is used internally in places such as a the toolbar.

Styling is done in plain CSS and is slit between `src/assets/core.css` and `src/assets/ui.css`. Bootstrap icons are loaded in `src/assets/icons.js`.

