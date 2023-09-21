# editor

a rich text editor for javascript

## notes
Design specs:

- Text must be contained within a p tag, header tag, table, or list
- Text is stored in text nodes or in spans
- Spans may only contain text nodes
- only spans may have styling applied
- when copying text, make sure invisible characters are ignored

- Get all nodes between range: iteratively traverse through the node tree, starting at the start node and ending at the end node, returning all nodes in between
- Get all text nodes between range: iteratively traverse through the node tree like the previous function, but only return spans and text nodes. If a text node is contained within a span, return the parent span, not the text node.

## todo
- keyboard shortcuts
- display current styling on buttons/options
- when clicking button with nothing selected, create new span
- retain selection when leaving focus