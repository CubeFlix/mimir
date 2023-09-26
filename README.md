# editor

a rich text editor for javascript

## notes

The rich text editor is split into two files: `editor.js` and `editor.css`. `editor.css` contains styling for the editor's menubar options and for certain elements. `editor.js` contains the code for creating and running the rich text editor. This code is primarily contained within the `Editor` class.

When the editor is initialized, the `Editor` class creates a menubar containing the styling options for the editor, as well as a `contenteditable` `div` for the content to be contained in. 

Styling is applied using `span` elements. `span`s may not be nested, and can only contain text nodes and `br` elements. Other styling tags (such as `b`, `strong`, etc.) may not exist within the editor, and are immediately converted to `span` nodes. `div`s and other elements may not contain styling, except for with classes, such as `editor-text-align-left`, etc.

In summary, the following count as invalid DOM:

- Nodes within `span` elements that are not text nodes or `br` tags
- Styling applied to elements that are not `spans` (except for with classes)
- Any elements that are not in the list of allowed elements

### additional notes
- Text must be contained within a p tag, header tag, table, or list
- Text is stored in text nodes or in spans
- Spans may only contain text nodes or br node
- only spans may have styling applied
- EXCEPT FOR the text-align property
- when copying text, make sure invisible characters are ignored

- Get all nodes between range: iteratively traverse through the node tree, starting at the start node and ending at the end node, returning all nodes in between
- Get all text nodes between range: iteratively traverse through the node tree like the previous function, but only return spans and text nodes. If a text node is contained within a span, return the parent span, not the text node.

Needs a special function for handling invalid DOM: this includes text styling on elements that aren't spans, etc., invalid tags (bold, ul, etc)

## todo
- handle invalid elements (bold, italic, etc.) and properly handle them
- retain selection when leaving focus
