# editor

a rich text editor for javascript

## todo

- [x] bug! (create bold, make substring italic, remove bold on substring)
- [x] splitNodeAtChild
- [x] styleToElement
- [x] elementHasStyle
- [x] removeStyleFromElement
- [x] solve bug with empty style elems
- [x] handle BR as content tag
- [x] issue with strikethrough and underline together not working on spans
- [x] clicking to create a new style elem
- [x] empty style elem
- [x] bug with styling completely empty editor/element
- [x] when making newline, retain styling options
- [x] when clicking to create style elem, it doesn't update style (not sure if this is just mobile)
- [x] when clicking to create style elem, properly handle back arrow
- [x] handle br node in style change
- [x] font support (handle font tag)
- [x] clicking to create font tag creates error
- [x] reload in cursor doesn't reload page
- [x] bug with removing/changing styling with styling already applied 
- [x] sanitization (handle spans, invalid elements, and nested styling)
- [x] bug with changeStyle and font tag
- [x] div, brs, ps and lists in pastes
- [x] pasting multiline content into lists
- [x] when pasting list into list, it sometimes places list at the end of the lists
- [x] spaces between pasted nodes
- [x] pasting with empty editor
- [x] update illegal tags (ignore the tags instead of removing them)
- [x] sanitize out stuff like `pre`, `code`, `h1`, etc.
- [x] urgent bug with styling line break (handle BR)
- [x] urgent bug with backspace with cursor
- [x] create new cursor when backspacing out of style node
- [x] issue with whitespace, pasting/dragging
- [ ] bugs (fix empty styling elements, may be a possibility of text in empty text thing)
- [x] bug with pasting styled within span
- [x] fix whitespace (handle `pre`)
- [x] history (restore selection and currentCursor)
- [x] history length limit
- [x] drag and drop
- [x] fix metaKey support on webkit
- [x] bug with styling br element
- [x] handle whitespace css
- [x] join multiple blocks (maybe)
- [x] removeBlockStyle is deleting content?!!?! (i might be going bobo) (i was not in fact bobo)
- [x] handle selection
- [x] handle empty editor
- [x] fix pasting (only combine lists on first)
- [ ] fix pasting (google docs does some weird stuff with B blocks and font-weight: normal ????)
- [x] order of operations
- [ ] paste block nodes
- [x] h1-h6
- [ ] handle lists
- [ ] more styling options
- [ ] retain selection when leaving editor
- [ ] block styling options
- [ ] lists
- [ ] images
- [ ] format indent up/down
- [ ] `sup`
- [ ] `pre`
- [ ] handle tab button
- [ ] a href (add mouse overlay, etc.)
- [ ] disallow pasting HTML option 
- [ ] overhaul UI (undo redo buttons, etc.)

## notes

Things that need to be handled during paste:
- Pasting inline into inline should return inline.
- Pasting list in list should split and combine the lists.
