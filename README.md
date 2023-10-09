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
- [ ] div, brs, ps and lists in pastes
- [ ] pasting multiline content into lists
- [ ] spaces between pasted nodes
- [ ] pasting with empty editor
- [ ] update illegal tags
- [ ] bugs (fix empty styling elements, may be a possibility of text in empty text thing)
- [ ] history (restore selection and currentCursor)
- [ ] more styling options
- [ ] block styling options
- [ ] lists
- [ ] images