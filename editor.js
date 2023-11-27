/* editor.js - A simple, lightweight rich text editor written in vanilla JavaScript. */

/* 
The rich text editor class. 
*/
class Editor {
    /* 
    Editor constants. 
    */
    ascii = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
    invisible = "&#xFEFF;"; // Insert this into spans so that the cursor will latch to it.

    contentTags = ["IMG", "BR"];
    stylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT", "SUP", "SUB", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"];
    inlineStylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT", "SUP", "SUB"];
    basicAllowedTags = ["DIV", "BR", "P", "IMG", "A", "LI", "UL", "OL", "BLOCKQUOTE"];
    blockTags = ["BR", "DIV", "P", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"];
    childlessTags = ["BR", "IMG"];

    inlineStylingCommands = ["bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub"];
    blockStylingCommands = ["quote", "header", "align", "list", "indent", "outdent"];
    inlineBlockStylingCommands = ["header", "align", "indent", "outdent"];
    requireSingleNodeToActivateStylingCommands = ["quote", "list"]; // These styles need only one node in the range to activate.
    multipleValueStylingCommands = ["font", "size", "foreColor", "backColor"];
    noUIUpdateStylingCommands = ["foreColor", "backColor", "indent", "outdent"];

    /* 
    Create the editor. 
    */
    constructor(element, settings) {
        this.container = element;
        this.settings = settings;

        this.commands = ["bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub", "quote", "header", "align", "list", "indent", "outdent"] || settings.commands;
        this.snapshotInterval = 5000 || settings.snapshotInterval;
        this.historyLimit = 50 || settings.historyLimit;
        this.supportedFonts = ["Arial", "Times New Roman", "monospace", "Helvetica"] || settings.supportedFonts;
        this.defaultFont = "Arial" || settings.defaultFont;
        this.defaultSize = 16 || settings.defaultSize;

        // Parse the invisible entity as text.
        const temp = document.createElement("div");
        temp.innerHTML = this.invisible;
        this.invisibleParsed = temp.innerHTML;
    }

    /*
    Helper function for hashing HTML data. Source: cyrb53 (https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js).
    */
    hash(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for(let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    };
    

    /*
    Create the cursor object.
    */
    createCursor() {
        // Create the cursor object.
        const cursor = document.createElement("span");
        cursor.setAttribute("class", "editor-temp-cursor");
        cursor.innerHTML = this.invisible;

        this.currentCursor = cursor;

        return cursor;
    }

    /* 
    Apply the height and width style options to the editor. 
    */
    applySizeStyles() {
        this.editor.style.width = "600px" || this.settings.width;
        this.menubar.style.width = "600px" || this.settings.width;

        if (this.settings.height) {
            this.editor.style.height = this.settings.height;
        } else if (this.settings.minHeight) {
            this.editor.style.minHeight = this.settings.minHeight;
        } else {
            this.editor.style.minHeight = "600px";
        }
    }

    /*
    Apply the default font.
    */
    applyDefaultFont() {
        this.editor.style.fontFamily = this.defaultFont;
    }

    /*
    Apply the default size.
    */
    applyDefaultSize() {
        this.editor.style.fontSize = String(this.defaultSize) + "px";
    }

    /*
    Create the menubar.
    */
    createMenubar() {
        this.menubar = document.createElement("div");
        this.menubar.setAttribute("id", "editor-menubar");
        this.menubar.setAttribute("role", "toolbar");
        this.container.append(this.menubar);

        // Add the options.
        this.menubarOptions = {};
        for (const command of this.commands) {
            switch (command) {
                case "bold":
                    this.menubarOptions.bold = document.createElement("button");
                    this.menubarOptions.bold.setAttribute("id", "editor-menubar-option-bold");
                    this.menubarOptions.bold.innerHTML = "B";
                    this.menubarOptions.bold.addEventListener("click", this.bold.bind(this));
                    this.menubar.append(this.menubarOptions.bold);
                    break;
                case "italic":
                    this.menubarOptions.italic = document.createElement("button");
                    this.menubarOptions.italic.setAttribute("id", "editor-menubar-option-italic");
                    this.menubarOptions.italic.innerHTML = "I";
                    this.menubarOptions.italic.addEventListener("click", this.italic.bind(this));
                    this.menubar.append(this.menubarOptions.italic);
                    break;
		        case "underline":
                    this.menubarOptions.underline = document.createElement("button");
                    this.menubarOptions.underline.setAttribute("id", "editor-menubar-option-underline");
                    this.menubarOptions.underline.innerHTML = "U";
                    this.menubarOptions.underline.addEventListener("click", this.underline.bind(this));
                    this.menubar.append(this.menubarOptions.underline);
                    break;
                case "strikethrough":
                    this.menubarOptions.strikethrough = document.createElement("button");
                    this.menubarOptions.strikethrough.setAttribute("id", "editor-menubar-option-strikethrough");
                    this.menubarOptions.strikethrough.innerHTML = "S";
                    this.menubarOptions.strikethrough.addEventListener("click", this.strikethrough.bind(this));
                    this.menubar.append(this.menubarOptions.strikethrough);
                    break;
                case "font":
                    this.menubarOptions.font = document.createElement("select");
                    this.menubarOptions.font.setAttribute("id", "editor-menubar-option-font");
                    for (const font of this.supportedFonts) {
                        const newFontOption = document.createElement("option");
                        newFontOption.innerHTML = font;
                        newFontOption.style.fontFamily = font;
                        newFontOption.setAttribute("value", font);
                        this.menubarOptions.font.append(newFontOption);
                    }
                    this.menubarOptions.font.value = this.defaultFont;
                    this.menubarOptions.font.addEventListener("change", this.font.bind(this));
                    this.menubar.append(this.menubarOptions.font);
                    break;
                case "size":
                    const { numberInput, input, plus, minus } = EditorUI.numberInput(1, 200);
                    this.menubarOptions.size = input;
                    numberInput.setAttribute("id", "editor-menubar-option-size");
                    this.menubarOptions.size.value = this.defaultSize;
                    this.menubarOptions.size.addEventListener("change", this.size.bind(this));
                    this.menubar.append(numberInput);
                    break;
                case "foreColor":
                    const foreColorButton = document.createElement("button");
                    foreColorButton.innerHTML = "A";
                    foreColorButton.style.textDecorationColor = `rgb(255, 0, 0)`;
                    foreColorButton.classList.add("editor-menubar-option-fore-color-button");
                    foreColorButton.addEventListener("click", function() {this.foreColor(foreColorInput.getValue());}.bind(this));
                    const foreColorOpenButton = document.createElement("button");
                    foreColorOpenButton.innerHTML = "&#9660";
                    var foreColorInput = EditorUI.colorInput(this.foreColor.bind(this), foreColorOpenButton, 200, 40, 200);
                    this.menubarOptions.foreColor = foreColorInput;
                    foreColorInput.colorInput.setAttribute("id", "editor-menubar-option-fore-color");
                    const foreColorButtonContainer = document.createElement("div");
                    foreColorButtonContainer.classList.add("editor-menubar-option-fore-color-button-container");
                    foreColorButtonContainer.append(foreColorButton, foreColorInput.dropdown.button);
                    foreColorInput.colorInput.prepend(foreColorButtonContainer);
                    this.menubar.append(foreColorInput.colorInput);
                    break;
                case "backColor":
                    const backColorButton = document.createElement("button");
                    backColorButton.innerHTML = "&#9639;";
                    backColorButton.style.textDecorationColor = `rgb(255, 0, 0)`;
                    backColorButton.classList.add("editor-menubar-option-back-color-button");
                    backColorButton.addEventListener("click", function() {this.backColor(backColorInput.getValue());}.bind(this));
                    const backColorOpenButton = document.createElement("button");
                    backColorOpenButton.innerHTML = "&#9660";
                    const backColorInput = EditorUI.colorInput(this.backColor.bind(this), backColorOpenButton, 200, 40, 200);
                    this.menubarOptions.backColor = backColorInput;
                    backColorInput.colorInput.setAttribute("id", "editor-menubar-option-back-color");
                    const backColorButtonContainer = document.createElement("div");
                    backColorButtonContainer.classList.add("editor-menubar-option-back-color-button-container");
                    backColorButtonContainer.append(backColorButton, backColorInput.dropdown.button);
                    backColorInput.colorInput.prepend(backColorButtonContainer);
                    this.menubar.append(backColorInput.colorInput);
                    break;
                case "sup":
                    this.menubarOptions.sup = document.createElement("button");
                    this.menubarOptions.sup.setAttribute("id", "editor-menubar-option-sup");
                    this.menubarOptions.sup.innerHTML = "x<sup>2</sup>";
                    this.menubarOptions.sup.addEventListener("click", this.sup.bind(this));
                    this.menubar.append(this.menubarOptions.sup);
                    break;
                case "sub":
                    this.menubarOptions.sub = document.createElement("button");
                    this.menubarOptions.sub.setAttribute("id", "editor-menubar-option-sub");
                    this.menubarOptions.sub.innerHTML = "x<sub>2</sub>";
                    this.menubarOptions.sub.addEventListener("click", this.sub.bind(this));
                    this.menubar.append(this.menubarOptions.sub);
                    break;
                case "quote":
                    this.menubarOptions.quote = document.createElement("button");
                    this.menubarOptions.quote.setAttribute("id", "editor-menubar-option-quote");
                    this.menubarOptions.quote.innerHTML = "\"";
                    this.menubarOptions.quote.addEventListener("click", this.quote.bind(this));
                    this.menubar.append(this.menubarOptions.quote);
                    break;
                case "header":
                    this.menubarOptions.header = document.createElement("select");
                    this.menubarOptions.header.setAttribute("id", "editor-menubar-option-header");
                    for (const level of ["Paragraph", "H1", "H2", "H3", "H4", "H5", "H6"]) {
                        const newHeaderOption = document.createElement("option");
                        newHeaderOption.innerHTML = level;
                        newHeaderOption.setAttribute("value", level);
                        this.menubarOptions.header.append(newHeaderOption);
                    }
                    this.menubarOptions.header.addEventListener("change", this.header.bind(this));
                    this.menubar.append(this.menubarOptions.header);
                    break;
                case "align":
                    this.menubarOptions.align = document.createElement("select");
                    this.menubarOptions.align.setAttribute("id", "editor-menubar-option-align");
                    for (const direction of ["Left", "Right", "Center", "Justify"]) {
                        const newAlignOption = document.createElement("option");
                        newAlignOption.innerHTML = direction;
                        newAlignOption.setAttribute("value", direction.toLowerCase());
                        this.menubarOptions.align.append(newAlignOption);
                    }
                    this.menubarOptions.align.addEventListener("change", this.align.bind(this));
                    this.menubar.append(this.menubarOptions.align);
                    break;
                case "list":
                    this.menubarOptions.listOrdered = document.createElement("button");
                    this.menubarOptions.listOrdered.setAttribute("id", "editor-menubar-option-ordered-list");
                    this.menubarOptions.listOrdered.innerHTML = "OL";
                    this.menubarOptions.listOrdered.addEventListener("click", this.listOrdered.bind(this));
                    this.menubar.append(this.menubarOptions.listOrdered);
                    this.menubarOptions.listUnordered = document.createElement("button");
                    this.menubarOptions.listUnordered.setAttribute("id", "editor-menubar-option-unordered-list");
                    this.menubarOptions.listUnordered.innerHTML = "UL";
                    this.menubarOptions.listUnordered.addEventListener("click", this.listUnordered.bind(this));
                    this.menubar.append(this.menubarOptions.listUnordered);
                    break;
                case "indent":
                    this.menubarOptions.indent = document.createElement("button");
                    this.menubarOptions.indent.setAttribute("id", "editor-menubar-option-indent");
                    this.menubarOptions.indent.innerHTML = ">";
                    this.menubarOptions.indent.addEventListener("click", this.indent.bind(this));
                    this.menubar.append(this.menubarOptions.indent);
                    break;
                case "outdent":
                    this.menubarOptions.outdent = document.createElement("button");
                    this.menubarOptions.outdent.setAttribute("id", "editor-menubar-option-outdent");
                    this.menubarOptions.outdent.innerHTML = "<";
                    this.menubarOptions.outdent.addEventListener("click", this.outdent.bind(this));
                    this.menubar.append(this.menubarOptions.outdent);
                    break;
            }
        }
    }

    /*
    Bind event listeners for keyboard events.
    */
    bindKeyboardEvents() {
        this.editor.addEventListener("keydown", function(e) {
            if (e.key.toLowerCase() == "b" && (e.ctrlKey || e.metaKey)) {
                // Bold.
                e.preventDefault();
                this.bold();
                return;
            } else if (e.key.toLowerCase() == "i" && (e.ctrlKey || e.metaKey)) {
                // Italic.
                e.preventDefault();
                this.italic();
                return;
            } else if (e.key.toLowerCase() == "u" && (e.ctrlKey || e.metaKey)) {
                // Underline.
                e.preventDefault();
                this.underline();
                return;
            } else if (e.key.toLowerCase() == "z" && (e.ctrlKey || e.metaKey)) {
                // Undo.
                e.preventDefault();
                this.undo();
                return;
            } else if (e.key.toLowerCase() == "y" && (e.ctrlKey || e.metaKey)) {
                // Redo.
                e.preventDefault();
                this.redo();
                return;
            }

            if (e.key == "Enter") {
                // Enter key pressed, save history.
                this.saveHistory();
                this.shouldTakeSnapshotOnNextChange = true;
            }

            if (e.key == "ArrowLeft" || e.key == "Backspace" || e.key == "Delete") {
                // Check if the caret is inside a cursor.
                const range = this.getRange();
                if (!range) {
                    return;
                }
                if (this.currentCursor && this.currentCursor.contains(range.commonAncestorContainer)) {
                    // Traverse up the tree until we find the highest empty node and remove the cursor.
                    var currentNode = this.currentCursor;
                    while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode) && (this.inlineStylingCommands.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                        currentNode = currentNode.parentNode;
                    }
                    // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                    if (this.blockTags.includes(currentNode.parentNode.tagName) && this.isEmpty(currentNode.parentNode)) currentNode.before(document.createElement("BR"));
                    currentNode.remove();
                    this.currentCursor = null;
                    this.updateMenubarOptions();
                    return;
                } else {
                    // When deleting content, if the entire nodes are selected, store the current styling in order to create a cursor.
                    if (range.endContainer.nodeType == Node.TEXT_NODE) {
                        var endLength = range.endContainer.textContent.length;
                    } else {
                        var endLength = range.endContainer.childNodes.length;
                    }
                    if ((range.startOffset == 0 && range.endOffset >= endLength && !(range.startOffset == range.endOffset && range.startContainer == range.endContainer) && e.key != "ArrowLeft") 
                            || (e.key == "Backspace" && range.commonAncestorContainer.textContent.length == 1 && range.endOffset >= 1)
                            || (e.key == "Delete" && range.commonAncestorContainer.textContent.length == 1 && range.endOffset == 0)) {
                        e.preventDefault();

                        // Get the current styling.
                        const firstNodeRange = new Range();
                        if (range.startContainer.nodeType == Node.TEXT_NODE) {
                            firstNodeRange.selectNode(range.startContainer);
                        } else {
                            if (range.startContainer.childNodes.length == 0) {
                                firstNodeRange.selectNode(range.startContainer);
                            } else {
                                if (range.startContainer.childNodes.length >= range.startOffset) {
                                    firstNodeRange.selectNode(range.startContainer);
                                } else {
                                    firstNodeRange.selectNode(range.startContainer.childNodes[range.startOffset - 1]);
                                }
                            }
                        }
                        const styling = this.detectStyling(firstNodeRange);

                        // Create a cursor.
                        const cursor = this.createCursor();
                        
                        // Reconstruct inline styling.
                        var lastNode = cursor;
                        for (const style of styling) {
                            if (!this.inlineStylingCommands.includes(style.type)) {
                                continue;
                            }
                            const newElem = this.styleToElement(style);
                            newElem.append(lastNode);
                            lastNode = newElem;
                        }

                        // Delete the node.
                        range.commonAncestorContainer.textContent = "";

                        // Insert the node at the current range and place the caret inside the cursor.
                        if (range.startContainer.nodeType == Node.TEXT_NODE) {
                            // Split the text node.
                            var placeBefore = range.startContainer;
                            if ((placeBefore.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(placeBefore.tagName) || placeBefore.tagName == "SPAN")) || (this.inlineStylingTags.includes(placeBefore.parentNode.tagName) || placeBefore.parentNode.tagName == "SPAN")) {
                                // Escape out of any styling nodes.
                                placeBefore = this.findLastParent(placeBefore, e => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN"));
                            }
                            placeBefore.before(lastNode);
                        } else {
                            // Place the node inside.
                            if (range.startContainer == this.editor) {
                                range.startContainer.prepend(lastNode);
                            } else {
                                var placeBefore = range.startContainer;
                                if ((placeBefore.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(placeBefore.tagName) || placeBefore.tagName == "SPAN")) || (this.inlineStylingTags.includes(placeBefore.parentNode.tagName) || placeBefore.parentNode.tagName == "SPAN")) {
                                    // Escape out of any styling nodes.
                                    placeBefore = this.findLastParent(placeBefore, e => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN"));
                                }
                                placeBefore.before(lastNode);
                            }
                        }

                        if (placeBefore && this.isEmpty(placeBefore) && placeBefore != this.editor) placeBefore.remove();

                        const newRange = new Range();
                        newRange.selectNodeContents(cursor);
                        newRange.collapse();
                        document.getSelection().removeAllRanges();
                        document.getSelection().addRange(newRange);
                    }
                }
                this.updateMenubarOptions();
            }

            if ((this.ascii.includes(e.key) || /\p{Emoji}/u.test(e.key)) && !e.ctrlKey && !e.metaKey) {
                // Take a snapshot if needed.
                if (this.shouldTakeSnapshotOnNextChange) {
                    this.saveHistory();
                    this.shouldTakeSnapshotOnNextChange = false;
                }

                // Check if the caret is inside a cursor.
                const range = this.getRange();
                if (range != null && this.currentCursor && this.currentCursor.contains(range.commonAncestorContainer)) {
                    // Remove the cursor.
                    e.preventDefault();
                    const cursor = this.currentCursor;
                    const newTextNode = document.createTextNode(e.key);
                    cursor.before(newTextNode);
                    cursor.remove();
                    this.currentCursor = null;

                    const newRange = new Range();
                    newRange.selectNodeContents(newTextNode);
                    newRange.collapse(false);
                    document.getSelection().removeAllRanges();
                    document.getSelection().addRange(newRange);

                    this.updateMenubarOptions();
                    return;
                }
            }
        }.bind(this));
    }

    /*
    Bind event listeners for input events.
    */
    bindInputEvents() {
        this.editor.addEventListener("beforeinput", function(e) {
            if (e.inputType == "formatBold") {
                // Bold.
                e.preventDefault();
                this.bold();
                return;
            } else if (e.inputType == "formatItalic") {
                // Italic.
                e.preventDefault();
                this.italic();
                return;
            } else if (e.inputType == "formatUnderline") {
                // Underline.
                e.preventDefault();
                this.underline();
                return;
            } else if (e.inputType == "historyUndo") {
                // Undo.
                e.preventDefault();
                this.undo();
                return;
            } else if (e.inputType == "historyRedo") {
                // Redo.
                e.preventDefault();
                this.redo();
                return;
            } else if (e.inputType == "insertParagraph") {
                // Handles a specific Chrome bug where inserting a paragraph at the end of a nested list creates a OL/UL element directly within another OL/UL. Note that this does not occur in Mozilla UAs.
                // This overrides the standard contentEditable insertParagraph only when the user is pressing enter within an empty list element.
                
                // Find the topmost block container. We split out of extraneous DIVs.
                var container = this.getRange()?.commonAncestorContainer;
                while (!this.blockTags.includes(container.tagName) && this.inEditor(container)) {
                    container = container.parentNode;
                }
                if (container.tagName == "DIV" || container.tagName == "P") {
                    // See W3 bug 13841.
                    var outerContainer = container;
                    while (outerContainer.tagName != "LI" && this.inEditor(outerContainer.parentNode)) {outerContainer = outerContainer.parentNode};
                    if (outerContainer.tagName == "LI") {container = outerContainer;}
                }

                // If the outermost container is a LI and it is empty, escape out of it,
                if (container.tagName == "LI" && (this.isEmptyOrLineBreak(container))) {
                    e.preventDefault();
                    // Split out of the parent.
                    const parentList = container.parentNode;
                    const nodesAfterCurrentNode = Array.from(parentList.childNodes).slice(Array.from(parentList.childNodes).indexOf(container) + 1, parentList.childNodes.length);
                    const newList = parentList.cloneNode(false);
                    newList.append(...nodesAfterCurrentNode);
                    parentList.after(container, newList);

                    // Remove split lists if empty.
                    if (this.isEmpty(newList)) {
                        newList.remove();
                    }
                    if (this.isEmpty(parentList)) {
                        parentList.remove();
                    }

                    if (!["UL", "OL"].includes(container.parentNode.tagName)) {
                        // Don't leave dangling LI nodes.
                        const newDiv = document.createElement("div");
                        newDiv.append(...container.childNodes);
                        container.after(newDiv);
                        container.remove();
                        container = newDiv;
                    }
                    
                    const range = new Range();
                    range.setStart(container, 0);
                    document.getSelection().removeAllRanges();
                    document.getSelection().addRange(range);
                }
            }
        }.bind(this));
    }

    /*
    Add styling to a text node.
    */
    addStylingToNode(node, stylingList) {
        var currentReconstructedNode = node;
        for (const s of stylingList) {
            var newNode = this.styleToElement(s);
            newNode.append(currentReconstructedNode);
            currentReconstructedNode = newNode;
        }
        return currentReconstructedNode;
    }

    /*
    Reconstruct a node's children.
    */
    reconstructNodeContents(node, parent, cachedInlineBlockStyles, removeExtraneousWhitespace = true) {
        const reconstructed = [];

        // Reconstruct each of the children.
        for (var child of Array.from(node.childNodes)) {
            if (child.nodeType == Node.TEXT_NODE || this.contentTags.includes(child.tagName)) {
                // If the current node is a text node, calculate the styling of the node and reconstruct its styling.
                var styling = [];
                var currentNode = child;

                // When calculating styling, we need to respect overrides. If an override is hit (i.e. no bold), later elements cannot apply the style.
                var overrides = [];
                while (parent.contains(currentNode)) {
                    // Only push the styling if it hasn't been added yet.
                    if (currentNode.nodeType == Node.TEXT_NODE) {
                        currentNode = currentNode.parentNode;
                        continue;
                    }
                    var elementStyling = this.getStylingOfElement(currentNode, true);
                    elementStyling = elementStyling.filter(s => !styling.some(e => s.type == e.type));
                    elementStyling = elementStyling.filter(s => !overrides.some(e => s.type == e.target.type));
                    const elementOverrides = elementStyling.filter(s => s.type == "override");
                    elementStyling = elementStyling.filter(s => s.type != "override");
                    elementStyling = elementStyling.filter(s => this.inlineStylingCommands.includes(s.type));
                    styling.push(...elementStyling);

                    // Handle all element overrides.
                    overrides.push(...elementOverrides);

                    currentNode = currentNode.parentNode;
                }

                if (removeExtraneousWhitespace) {
                    if (child.nodeType == Node.TEXT_NODE) child.textContent = child.textContent.split("\n").join("").split("\r").join("");

                    // Reconstruct the styling.
                    child = this.addStylingToNode(child, styling);

                    // Append the newly reconstructed node.
                    reconstructed.push(child);
                } else {
                    // Replace all line breaks with break nodes.
                    if (child.nodeType == Node.TEXT_NODE) {
                        const lines = child.textContent.split(/\r?\n|\r|\n/g);

                        var newTextNode = this.addStylingToNode(document.createTextNode(lines[0]), styling);
                        reconstructed.push(newTextNode);

                        for (const line of lines.slice(1)) {
                            const newBrNode = document.createElement("br");
                            newTextNode = this.addStylingToNode(document.createTextNode(line), styling);
                            reconstructed.push(newBrNode, newTextNode);
                        }
                    } else {
                        child = this.addStylingToNode(child, styling);
                        reconstructed.push(child);
                    }
                }
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                var removeExtraneousWhitespaceOnChildren = removeExtraneousWhitespace;
                if (child.tagName == "PRE") {
                    removeExtraneousWhitespaceOnChildren = false;
                }
                if (["pre", "pre-wrap", "pre-line", "break-spaces"].some(s => child.style.whiteSpace.toLowerCase().includes(s))) {
                    removeExtraneousWhitespaceOnChildren = false;
                }

                // If this is a list with no LI tags within, ignore it.
                if (child.tagName == "OL" || child.tagName == "UL") {
                    if (!Array.from(child.childNodes).some(s => s.tagName == "LI")) {
                        continue;
                    }
                }

                // If this tag is a header tag, replace it with a new DIV node.
                if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(child.tagName)) {
                    const newNode = document.createElement("div");

                    // Reconstruct the node's children.
                    const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);

                    // Append the newly reconstructed nodes.
                    newNode.append(...reconstructedChildren);
                    reconstructed.push(newNode);

                    // Add this node to the list of cached inline block styles.
                    cachedInlineBlockStyles.push({node: newNode, inlineBlockStyling: this.getStylingOfElement(child).filter(s => this.inlineBlockStylingCommands.includes(s.type))});
                    continue;
                }

                // If this tag is a styling/illegal tag, ignore it but parse its children.
                if (!this.basicAllowedTags.includes(child.tagName)) {
                    // Reconstruct the node's children.
                    const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);

                    // Append the newly reconstructed nodes.
                    reconstructed.push(...reconstructedChildren);
                    continue;
                }

                // Clone the node without any attributes.
                const newNode = document.createElement(child.tagName);

                // Add this node to the list of cached inline block styles.
                const inlineBlockStyling = this.getStylingOfElement(child).filter(s => this.inlineBlockStylingCommands.includes(s.type));
                if (inlineBlockStyling.length != 0 && this.blockTags.includes(newNode.tagName)) {
                    cachedInlineBlockStyles.push({node: newNode, inlineBlockStyling: inlineBlockStyling});
                }

                // Add any important attributes.
                if (child.getAttribute("href")) {
                    if (child.getAttribute("href").trim().substring(0, 11).toLowerCase() !== "javascript:") {
                        newNode.setAttribute("href", child.getAttribute("href"));
                    }
                } else if (child.getAttribute("src")) {
                    newNode.setAttribute("src", child.getAttribute("src"));
                } else if (child.getAttribute("alt")) {
                    newNode.setAttribute("alt", child.getAttribute("alt"));
                }

                // Reconstruct the node's children.
                const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);
                newNode.append(...reconstructedChildren);

                // Append the newly reconstructed node.
                reconstructed.push(newNode);
            }
        }

        return reconstructed;
    }

    /*
    Sanitize and reconstruct HTML data.
    */
    sanitize(contents) {
        // Place the data into a temporary node.
        const original = document.createElement("div");
        original.innerHTML = contents;

        // Reconstruct the node.
        const cachedInlineBlockStyles = [];
        const reconstructed = this.reconstructNodeContents(original, original, cachedInlineBlockStyles);

        // Remove trailing and leading whitespace nodes.
        const withoutWhitespace = [];
        for (const node of reconstructed) {
            if (reconstructed.indexOf(node) == 0 || reconstructed.indexOf(node) == reconstructed.length - 1) {
                if (node.nodeType == Node.TEXT_NODE && node.textContent.split("\n").join("").split("\r").join("") == "") {
                    continue;
                }
            }
            withoutWhitespace.push(node);
        }

        // Place the nodes inside a document fragment so that styles can be easily applied.
        const fragment = document.createDocumentFragment();
        fragment.append(...withoutWhitespace);

        // Apply each cached inline block style.
        var lastStyled = null;
        var lastStyle = null;
        for (const inlineBlockPair of cachedInlineBlockStyles) {
            if (!fragment.contains(inlineBlockPair.node)) {
                continue;
            }

            // Fix disallowed children of the node.
            const fixedNodes = [];
            const disallowedChildren = "blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6, [style*=\"text-align\"]";
            function fixDisallowedChildrenOfNode(node) {
                if (node.nodeType == Node.ELEMENT_NODE && (disallowedChildren && (node.matches(disallowedChildren) || node.querySelector(disallowedChildren)))) {
                    // Append the children instead.
                    for (const child of node.childNodes) {
                        fixDisallowedChildrenOfNode(child);
                    }
                } else {
                    // Append the node.
                    fixedNodes.push(node);
                }
            }
            fixDisallowedChildrenOfNode = fixDisallowedChildrenOfNode.bind(this);
            fixDisallowedChildrenOfNode(inlineBlockPair.node);

            for (var node of fixedNodes) {
                for (const style of inlineBlockPair.inlineBlockStyling) {
                    const newElem = this.styleToElement(style);
                    const marker = document.createTextNode("");
                    node.after(marker);
                    if (newElem.childNodes.length == 0) {
                        newElem.appendChild(node);
                    } else {
                        newElem.childNodes[0].appendChild(node);
                    }
                    marker.replaceWith(newElem);
                    node = newElem;
                }

                // Join the nodes.
                if (lastStyled && lastStyle && lastStyled.nextSibling == node && lastStyle === inlineBlockPair.inlineBlockStyling) {
                    lastStyled.append(...node.childNodes);
                    node.remove();
                } else {
                    lastStyled = node;
                    lastStyle = inlineBlockPair.inlineBlockStyling;
                }
            }
        }

        return Array.from(fragment.childNodes);
    }

    /*
    Find the last parent of a node, given some sort of predicate.
    */
    findLastParent(node, predicate) {
        var currentNode = node;
        var topmostNode = null;
        while (this.inEditor(currentNode) && this.editor != currentNode) {
            if (predicate(currentNode)) {
                topmostNode = currentNode;
            }
            currentNode = currentNode.parentElement;
        }
        return topmostNode;
    }

    /*
    Find the closest parent of a node, given some sort of predicate.
    */
    findClosestParent(node, predicate) {
        var currentNode = node;
        while (this.inEditor(currentNode) && this.editor != currentNode) {
            if (predicate(currentNode)) {
                return currentNode;
            }
            currentNode = currentNode.parentElement;
        }
        return null;
    }

    /*
    Insert and sanitize HTML data.
    */
    insertHTML(startNode, data, select = "end") {
        // Reconstruct the data.
        var reconstructed = this.sanitize(data);
        if (reconstructed.length == 0) {
            return;
        }

        // Add each node.
        var currentLastNode = startNode;
        var firstNode = null;
        for (const node of reconstructed) {
            // Add in the node.
            if (node.nodeType == Node.TEXT_NODE) {
                currentLastNode.after(node);
                currentLastNode = node;
            } else if (node.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(node.tagName) || node.tagName == "SPAN")) {
                // Break out of any inline style nodes.
                var topmostInlineNode = this.findLastParent(currentLastNode, currentNode => currentNode.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(currentNode.tagName) || currentNode.tagName == "SPAN"));
                if (topmostInlineNode) {
                    // We found an inline node to break out of, so split it.
                    const splitAt = document.createTextNode("");
                    currentLastNode.after(splitAt);
                    const split = this.splitNodeAtChild(topmostInlineNode, splitAt);
                    if (split != null) {
                        if (!this.isEmpty(split)) topmostInlineNode.after(split);
                    }
                    currentLastNode = topmostInlineNode;
                }
                currentLastNode.after(node);
                if (this.isEmpty(currentLastNode)) currentLastNode.remove();
                currentLastNode = node;
            } else if (node.nodeType == Node.ELEMENT_NODE && node.tagName == "LI") {
                // If the current last node is in a list, split the list.
                var topmostNode = this.findLastParent(currentLastNode, currentNode => (currentNode.nodeType == Node.ELEMENT_NODE && (currentNode.tagName == "OL" || currentNode.tagName == "UL")));
                if (topmostNode) {
                    // Combine the current node with the split node.
                    const splitAt = document.createTextNode("");
                    currentLastNode.after(splitAt);
                    const split = this.splitNodeAtChild(topmostNode, splitAt);
                    currentLastNode = topmostNode;

                    // Combine the lists.
                    currentLastNode = node;
                    topmostNode.append(node);
                    if (split != null && !this.isEmpty(split)) {
                        topmostNode.append(...split.childNodes);
                    }
                } else {
                    // Break out of any block nodes and place the node in a new UL node.
                    var topmostBlockNode = this.findLastParent(currentLastNode, currentNode => (currentNode.nodeType == Node.ELEMENT_NODE && (this.blockTags.includes(node.tagName) || this.stylingTags.includes(currentNode.tagName) || currentNode.tagName == "SPAN")));
                    const nodeInList = document.createElement("li");
                    nodeInList.append(node);
                    node = nodeInList;
                    if (topmostBlockNode) {
                        // Split the topmost block node.
                        const splitAt = document.createTextNode("");
                        currentLastNode.after(splitAt);
                        const split = this.splitNodeAtChild(topmostBlockNode, splitAt);
                        if (split != null) {
                            if (!this.isEmpty(split)) topmostBlockNode.after(split);
                        }
                        currentLastNode = node;
                        topmostBlockNode.after(node);
                    } else {
                        currentLastNode.after(node);
                        currentLastNode = node;
                    }
                }
            } else {
                if (!firstNode) {
                    // If possible, join the nodes.
                    var lowestJoinable = this.findClosestParent(currentLastNode, currentNode => (currentNode.tagName == node.tagName));
                    if (lowestJoinable) {
                        // Split the node.
                        const splitAt = document.createTextNode("");
                        currentLastNode.after(splitAt);
                        const split = this.splitNodeAtChild(lowestJoinable, splitAt);
                        currentLastNode = lowestJoinable;

                        // Join the nodes.
                        const children = Array.from(node.childNodes).filter(n => !this.isEmpty(n));
                        if (this.isEmpty(currentLastNode.lastChild)) {
                            currentLastNode.lastChild.remove();
                            currentLastNode = children.length != 0 ? children[children.length - 1] : currentLastNode;
                            lowestJoinable.append(...children);
                            if (split != null && !this.isEmpty(split)) {
                                lowestJoinable.append(...split.childNodes);
                            }
                            firstNode = currentLastNode;
                        } else {
                            currentLastNode = children.length != 0 ? children[children.length - 1] : currentLastNode;
                            lowestJoinable.append(...children);
                            if (split != null && !this.isEmpty(split)) {
                                lowestJoinable.append(...split.childNodes);
                            }
                            firstNode = currentLastNode;
                        }
                        
                        continue;
                    }
                }
                // Break out of any block nodes. 
                var topmostNode = this.findLastParent(currentLastNode, currentNode => (currentNode.nodeType == Node.ELEMENT_NODE && (this.blockTags.includes(node.tagName) || this.stylingTags.includes(currentNode.tagName) || currentNode.tagName == "SPAN")));
                if (topmostNode) {
                    // We found an inline node to break out of, so split it.
                    const splitAt = document.createTextNode("");
                    currentLastNode.after(splitAt);
                    const split = this.splitNodeAtChild(topmostNode, splitAt);
                    if (split != null) {
                        if (!this.isEmpty(split)) topmostNode.after(split);
                    }
                    currentLastNode = topmostNode;
                }
                currentLastNode.after(node);
                if (this.isEmpty(currentLastNode)) currentLastNode.remove();
                currentLastNode = node;
            }

            if (!firstNode) {
                firstNode = currentLastNode;
            }
        }

        // Place the cursor after the reconstructed nodes.
        if (select == "end") {
            const newRange = new Range();
            newRange.selectNodeContents(currentLastNode);
            newRange.collapse(false);
            return newRange;
        } else {
            const newRange = new Range();
            newRange.setStart(firstNode, 0);
            newRange.setEndAfter(currentLastNode);
            return newRange;
        }
    }

    /*
    Bind event listeners for paste events.
    */
    bindPasteEvents() {
        this.editor.addEventListener("paste", function(e) {
            this.saveHistory();

            // Paste HTML data.
            if (e.clipboardData.getData("text/html")) {
                e.preventDefault();

                const range = this.getRange();
                if (range == null) {
                    return;
                }

                range.deleteContents();

                // Split the start container at the start offset.
                const emptyTextNode = document.createTextNode("");
                if (range.startContainer.nodeType == Node.TEXT_NODE) {
                    // Split the text node and place an empty node in between.
                    const endTextNode = document.createTextNode(range.startContainer.textContent.slice(range.startOffset, range.startContainer.textContent.length));
                    range.startContainer.textContent = range.startContainer.textContent.slice(0, range.startOffset);
                    range.startContainer.after(emptyTextNode, endTextNode);
                } else {
                    // Place the empty text node inside.
                    if (range.startOffset == 0) {
                        if (!this.childlessTags.includes(range.startContainer.tagName)) {
                            range.startContainer.prepend(emptyTextNode);
                        } else {
                            range.startContainer.after(emptyTextNode);
                        }
                    } else {
                        range.startContainer.childNodes[range.startOffset - 1].after(emptyTextNode);
                    }
                }

                const outputRange = this.insertHTML(emptyTextNode, e.clipboardData.getData("text/html"));
                if (outputRange) {
                    document.getSelection().removeAllRanges();
                    document.getSelection().addRange(outputRange);
                }
            }
        }.bind(this));
    }

    /*
    Bind event listeners for drag events.
    */
    bindDragEvents() {
        this.editor.addEventListener("drag", function(e) {
            // Set the range to remove during the drag.
            this.dragRangeToRemove = this.getRange();
        }.bind(this));

        this.editor.addEventListener("dragend", function(e) {
            // Set the range to remove during the drag.
            this.dragRangeToRemove = null;
        }.bind(this));

        this.editor.addEventListener("drop", function(e) {
            this.saveHistory();

            // Insert HTML data.
            if (e.dataTransfer.getData("text/html")) {
                // Get the drop range.
                e.preventDefault();
                if (document.caretRangeFromPoint) { // Chrome
                    var range = document.caretRangeFromPoint(e.clientX, e.clientY);
                } else if (document.caretPositionFromPoint) { // Firefox
                    const position = document.caretPositionFromPoint(e.clientX, e.clientY)
                    var range = document.createRange(); 
                    if (position) {
                        range = document.createRange();
                        range.setStart(position.offsetNode, position.offset);
                        range.setEnd(position.offsetNode, position.offset);
                    } else {
                        return;
                    }
                } else {
                    console.error("Cannot find selection drop range. Try using a newer browser.");
                    return;
                }
                if (!this.inEditor(range.commonAncestorContainer)) {
                    return;
                }

                const rangeToRemove = this.dragRangeToRemove;
                const emptyTextNode = document.createTextNode("");
                if (rangeToRemove) {
                    var startContainer = rangeToRemove.startContainer;
                    var startOffset = rangeToRemove.startOffset;
                    var endContainer = rangeToRemove.endContainer;
                    var endOffset = rangeToRemove.endOffset;

                    // Split the start container at the start offset.
                    if (range.startContainer.nodeType == Node.TEXT_NODE) {
                        // Insert the start node to begin inserting after. Modify the range to remove so that it stays consistent.
                        // Split the text node and place an empty node in between.
                        const sliceOffset = range.startOffset;
                        const endTextNode = document.createTextNode(range.startContainer.textContent.slice(sliceOffset, range.startContainer.textContent.length));
                        range.startContainer.textContent = range.startContainer.textContent.slice(0, sliceOffset);
                        range.startContainer.after(emptyTextNode, endTextNode);

                        // Update the range to remove offsets.
                        // Note that the range to remove will never overlap the range to add into.
                        if (startContainer == range.startContainer) {
                            if (startOffset >= sliceOffset) {
                                // The start offset is after the slice.
                                startContainer = endTextNode;
                                startOffset = startOffset - sliceOffset;
                            } else if (startOffset < sliceOffset) {
                                // The start offset is before the slice.
                            }
                        } else if (startContainer == range.startContainer.parentNode) {
                            // We're adding a new node, so we need to account for that.
                            if (startOffset >= Array.from(emptyTextNode.parentNode.childNodes).indexOf(emptyTextNode)) {
                                startOffset += 2;
                            }
                        }
                        if (endContainer == range.startContainer) {
                            if (endOffset >= endOffset) {
                                // The end offset is after the slice.
                                endContainer = endTextNode;
                                endOffset = endOffset - sliceOffset;
                            } else if (endOffset < sliceOffset) {
                                // The end offset is before the slice.
                            }
                        } else if (endContainer == range.startContainer.parentNode) {
                            // We're adding a new node, so we need to account for that.
                            if (endOffset >= Array.from(emptyTextNode.parentNode.childNodes).indexOf(emptyTextNode)) {
                                endOffset += 2;
                            }
                        }
                    } else {
                        // Place the empty text node inside.
                        if (range.startOffset == 0) {
                            if (!this.childlessTags.includes(range.startContainer.tagName)) {
                                range.startContainer.prepend(emptyTextNode);
                                if (startContainer == range.startContainer) {
                                    if (startOffset >= range.startOffset) {
                                        // The start offset is after the slice.
                                        startOffset += 1;
                                    }
                                }
                                if (endContainer == range.startContainer) {
                                    if (endOffset >= range.startOffset) {
                                        // The end offset is after the slice.
                                        endOffset += 1;
                                    }
                                }
                            } else {
                                range.startContainer.before(emptyTextNode);
                                if (startContainer == range.startContainer.parentNode) {
                                    if (startOffset >= Array.from(emptyTextNode.parentNode.childNodes).indexOf(emptyTextNode)) {
                                        // The start offset is after the slice.
                                        startOffset += 1;
                                    }
                                }
                                if (endContainer == range.startContainer.parentNode) {
                                    if (endOffset >= Array.from(emptyTextNode.parentNode.childNodes).indexOf(emptyTextNode)) {
                                        // The end offset is after the slice.
                                        endOffset += 1;
                                    }
                                }
                            }
                        } else {
                            range.startContainer.childNodes[range.startOffset - 1].after(emptyTextNode);
                            if (startContainer == range.startContainer) {
                                if (startOffset >= range.startOffset) {
                                    // The start offset is after the slice.
                                    startOffset += 1;
                                }
                            }
                            if (endContainer == range.startContainer) {
                                if (endOffset >= range.startOffset) {
                                    // The end offset is after the slice.
                                    endOffset += 1;
                                }
                            }
                        }
                    }

                    const newRangeToRemove = new Range();
                    newRangeToRemove.setStart(startContainer, startOffset);
                    newRangeToRemove.setEnd(endContainer, endOffset);
                    if (newRangeToRemove.intersectsNode(emptyTextNode)) {
                        console.error("Drag source contains drop location.");
                        return;
                    }
                    newRangeToRemove.deleteContents();
                } else {
                    // Split the start container at the start offset.
                    if (range.startContainer.nodeType == Node.TEXT_NODE) {
                        // Split the text node and place an empty node in between.
                        const sliceOffset = range.startOffset;
                        const endTextNode = document.createTextNode(range.startContainer.textContent.slice(sliceOffset, range.startContainer.textContent.length));
                        range.startContainer.textContent = range.startContainer.textContent.slice(0, sliceOffset);
                        range.startContainer.after(emptyTextNode, endTextNode);
                    } else {
                        // Place the empty text node inside.
                        if (range.startOffset == 0) {
                            if (!this.childlessTags.includes(range.startContainer.tagName)) {
                                range.startContainer.prepend(emptyTextNode);
                            } else {
                                range.startContainer.before(emptyTextNode);
                            }
                        } else {
                            range.startContainer.childNodes[range.startOffset - 1].after(emptyTextNode);
                        }
                    }
                }

                // Insert the content.
                const data = e.dataTransfer.getData("text/html");
                const outputRange = this.insertHTML(emptyTextNode, data, "all");
                if (outputRange) {
                    document.getSelection().removeAllRanges();
                    document.getSelection().addRange(outputRange);
                }
            }
        }.bind(this));
    }

    /*
    Update the styling of the menubar options.
    */
    updateMenubarOptions() {
        const range = this.getRange();
        if (range == null) {
            return;
        }

        // Alter the styling of each of the options.
        const styling = this.detectStyling(range);
        for (const option of this.commands) {
            if (option == "font") {
                this.menubarOptions.font.value = styling.find(s => s.type == "font") ? styling.find(s => s.type == "font").family : "";
                continue;
            }

            if (option == "header") {
                this.menubarOptions.header.value = styling.find(s => s.type == "header") ? styling.find(s => s.type == "header").level : "Paragraph";
                continue;
            }

            if (option == "align") {
                this.menubarOptions.align.value = styling.find(s => s.type == "align") ? styling.find(s => s.type == "align").direction : "left";
                continue;
            }

            if (option == "size") {
                this.menubarOptions.size.value = styling.find(s => s.type == "size") ? styling.find(s => s.type == "size").size : this.defaultSize;
                continue;
            }

            if (this.noUIUpdateStylingCommands.includes(option)) {continue;}

            if (option == "list") {
                if (styling.find(s => s.type == "list" && s.listType == "ordered")) {
                    if (!this.menubarOptions.listOrdered.classList.contains("editor-pressed")) this.menubarOptions.listOrdered.classList.add("editor-pressed");
                } else {
                    this.menubarOptions.listOrdered.classList.remove("editor-pressed");
                }
                if (styling.find(s => s.type == "list" && s.listType == "unordered")) {
                    if (!this.menubarOptions.listUnordered.classList.contains("editor-pressed")) this.menubarOptions.listUnordered.classList.add("editor-pressed");
                } else {
                    this.menubarOptions.listUnordered.classList.remove("editor-pressed");
                }
                continue;
            }

            if (styling.some(s => s.type == option)) {
                if (!this.menubarOptions[option].classList.contains("editor-pressed")) this.menubarOptions[option].classList.add("editor-pressed");
            } else {
                if (this.menubarOptions[option].classList.contains("editor-pressed")) this.menubarOptions[option].classList.remove("editor-pressed");
            }
        }
    }

    /*
    Called on selection change and on styling change.
    */
    onChangeSelect() {
        var range = this.getRange();
        if (range == null) {
            return;
        }

        // Check for a cursor element.
        if (this.currentCursor) {
            // If the cursor left the cursor element, remove the cursor.
            if (!this.currentCursor.contains(range.commonAncestorContainer)) {
                // Traverse up the tree until we find the highest empty node.
                var currentNode = this.currentCursor;
                while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode)) {
                    currentNode = currentNode.parentNode;
                }
                currentNode.remove();
                this.currentCursor = null;
            }
        }

        this.updateMenubarOptions();
    }

    /*
    Bind event listeners for select event.
    */
    bindSelectEvents() {
        // Bind the onChangeSelect function with setTimeout so that it runs after the event bubbles.
        const onChangeSelect = setTimeout.bind(window, this.onChangeSelect.bind(this), 0);

        this.editor.addEventListener("focus", function (e) {
            onChangeSelect();
            document.addEventListener("selectionchange", onChangeSelect);
        }.bind(this));
        this.editor.addEventListener("focusout", function (e) {
            // Set the range cache.
            const selection = document.getSelection();
            if (selection.rangeCount != 0) {
                const range = selection.getRangeAt(0);
                if (selection.containsNode(this.editor, true) || this.editor.contains(range.commonAncestorContainer)) {
                    this.rangeCache = range;
                }
            }

            onChangeSelect();
            document.removeEventListener("selectionchange", onChangeSelect);
        }.bind(this));
    }
    
    /*
    Bind save history interval.
    */
    bindSaveHistoryInterval() {
        setInterval(function() {
            // Take periodic history snapshots.
            this.saveHistory();
        }.bind(this), this.snapshotInterval);
    }

    /*
    Bind click events outside of the editor.
    */
    bindExternalClickEvents() {
        document.addEventListener("mousedown", function() {
            const selection = document.getSelection();
            if (selection.rangeCount != 0) {
                const range = selection.getRangeAt(0);
                if (selection.containsNode(this.editor, true) || this.editor.contains(range.commonAncestorContainer)) {
                    this.rangeCache = range;
                }
            }
        }.bind(this));
    }

    /* 
    Check if a node is in the editor.
    */
    inEditor(node) {
        return this.editor.contains(node);
    }

    /*
    Get a fallback range.
    */
    returnFallbackRange() {
        const range = new Range();
        range.setStart(this.editor, 0);
        range.setEnd(this.editor, 0);
        return range;
    }

    /*
    Get the current range.
    */
    getRange() {
        const selection = window.getSelection();
        
        // Nothing selected.
        if (selection.rangeCount == 0) {
            if (this.rangeCache) {
                return this.rangeCache;
            }
            return this.returnFallbackRange();
        }
        
        // Something is selected.
        const range = selection.getRangeAt(0);
        if (selection.containsNode(this.editor, true) || this.editor.contains(range.commonAncestorContainer)) {
            return range;
        } else if (this.rangeCache) {
            return this.rangeCache;
        }
        return this.returnFallbackRange();
    }

    /* 
    Get an array of all the text nodes within a range. Returns the newly calculated start and end offsets.
    */
    getTextNodesInRange(oldRange) {
        if (oldRange == null) {
            return null;
        }

        // Clone the range so it doesn't affect the user's current selection.
        const range = new Range();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.endContainer, oldRange.endOffset);

        const nodes = [];
        var currentNode = range.startContainer;
        var startOffset = range.startOffset;
        var endOffset = range.endOffset;
    
        while (currentNode.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(currentNode.tagName)) {
            // If there are no children of this node, exit.
            if (currentNode.childNodes.length == 0) {
                break;
            }

            if (startOffset == currentNode.childNodes.length) {
                currentNode = currentNode.childNodes[startOffset - 1];
                startOffset = currentNode.nodeType == Node.ELEMENT_NODE ? currentNode.childNodes.length : currentNode.textContent.length;
            } else {
                currentNode = currentNode.childNodes[startOffset];
                startOffset = 0;
            }
        }

        if (range.endOffset == 0 && range.endContainer != this.editor && !(range.endOffset == range.startOffset && range.endContainer == range.startContainer)) {
            // If the end offset is at the start of a node, move it up.
            while (range.endOffset == 0 && range.endContainer != this.editor) {
                const endOffset = Array.from(range.endContainer.parentNode.childNodes).indexOf(range.endContainer);
                const endContainer = range.endContainer.parentNode;
                range.setEnd(endContainer, endOffset);
            }
        }
    
        var haveTraversedLastNode = false;
        while (this.inEditor(currentNode)) {
            // If we've finished traversing the last node or we've reached the bound of the last node, quit.
            if (haveTraversedLastNode && (!range.endContainer.contains(currentNode) || (Array.from(range.endContainer.childNodes).indexOf(currentNode) >= range.endOffset))) {
                break;
            }
        
            // Append the node.
            if (this.inEditor(currentNode) && (currentNode.nodeType == Node.TEXT_NODE || currentNode.tagName == "BR")) {
                nodes.push(currentNode);
            }
        
            // We always want to fully traverse the end node.
            if (range.endContainer.contains(currentNode)) {
                haveTraversedLastNode = true;
            }
        
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                currentNode = currentNode.firstChild;
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling && this.inEditor(currentNode)) {
                    currentNode = currentNode.parentNode;
                } 
                currentNode = currentNode.nextSibling;
            } else {
                // Go to the next node.
                currentNode = currentNode.nextSibling;
            }
        }
    
        // If the final node is not a text node, set the end offset.
        if (range.endContainer.nodeType != Node.TEXT_NODE && this.inEditor(range.endContainer) && nodes.slice(-1)[0]) {
            endOffset = nodes.slice(-1)[0].textContent.length;
        }
    
        return {nodes: nodes, startOffset: startOffset, endOffset: endOffset};
    }

    /*
    Create the appropriate element for a style.
    */
    styleToElement(style) {
        switch (style.type) {
            case "bold":
                return document.createElement("strong");
            case "italic":
                return document.createElement("em");
            case "underline":
                return document.createElement("u");
            case "strikethrough":
                return document.createElement("s");
            case "font":
                var elem = document.createElement("span");
                elem.style.fontFamily = style.family;
                return elem;
            case "size":
                var elem = document.createElement("span");
                elem.style.fontSize = String(style.size) + "px";
                return elem;
            case "foreColor":
                var elem = document.createElement("span");
                elem.style.color = style.color;
                return elem;
            case "backColor":
                var elem = document.createElement("span");
                elem.style.backgroundColor = style.color;
                return elem;
            case "sup":
                return document.createElement("sup");
            case "sub":
                return document.createElement("sub");
            case "quote":
                return document.createElement("blockquote");
            case "header":
                return document.createElement(style.level);
            case "align":
                var elem = document.createElement("div");
                elem.style.textAlign = style.direction;
                return elem;
            case "list":
                var elem = document.createElement((style.listType == "ordered") ? "ol" : "ul");
                const firstLi = document.createElement("li");
                elem.append(firstLi);
                return elem;
        }
    }

    /*
    Get a list of styling that an element applies. For cases with unsanitized DOM (pasting, etc.), there is an option to track style overrides.
    */
    getStylingOfElement(node, trackOverrides = false) {
        var styling = [];
        
        // Check if the element itself applies styling.
        switch (node.tagName) {
            case "STRONG":
            case "B":
                styling.push({type: "bold"});
                break;
            case "EM":
            case "I":
            case "VAR":
                styling.push({type: "italic"});
                break;
            case "U":
                styling.push({type: "underline"});
                break;
            case "S":
                styling.push({type: "strikethrough"});
                break;
            case "FONT":
                if (node.getAttribute("face")) {
                    // Font family.
                    var family = node.getAttribute("face");
                    family = family.split("&quot;");
                    family = family.map(s => s.split("\"").join(""));
                    family = family.map(s => s.split("'").join(""));
                    styling.push({type: "font", family: family});
                }
                if (node.getAttribute("size") && (+node.getAttribute("size") != Number.NaN)) {
                    // Font size.
                    var size = parseInt(node.getAttribute("size"));
                    var mode = null;
                    if (node.getAttribute("size").trim()[0] == "+") {
                        mode = "plus";
                    } else if (node.getAttribute("size").trim()[0] == "-") {
                        mode = "minus";
                    }
                    if (mode == "plus" || mode == "minus") {
                        size = 3 + size;
                    }
                    if (size < 1) {
                        size = 1;
                    } else if (size > 7) {
                        size = 7;
                    }
                    var px = [10, 13, 16, 18, 24, 32, 48][size - 1];
                    styling.push({type: "size", size: px});
                }
                if (node.getAttribute("color")) {
                    styling.push({type: "foreColor", color: node.getAttribute("color")});
                }
                // TODO: color, etc
                break;
            case "SUP":
                styling.push({type: "sup"});
                break;
            case "SUB":
                styling.push({type: "sub"});
                break;
            case "BLOCKQUOTE":
                styling.push({type: "quote"});
                break;
            case "H1":
            case "H2":
            case "H3":
            case "H4":
            case "H5":
            case "H6":
                styling.push({type: "header", level: node.tagName});
                break;
            case "UL":
                styling.push({type: "list", listType: "unordered"});
                break;
            case "OL":
                styling.push({type: "list", listType: "ordered"});
                break;
        }

        // Check the element's inline styling.
        if (node.style.fontWeight == "700" || node.style.fontWeight.toLowerCase() == "bold") {
            if (!styling.some(s => s.type == "bold")) styling.push({type: "bold"});
        } else if (node.style.fontWeight == "400" || node.style.fontWeight.toLowerCase() == "normal") {
            if (styling.some(s => s.type == "bold")) styling.splice(styling.findIndex(s => s.type == "bold"), 1);
            if (trackOverrides) styling.push({type: "override", target: {type: "bold"}});
        }
        if (node.style.fontStyle.toLowerCase() == "italic") {
            if (!styling.some(s => s.type == "italic")) styling.push({type: "italic"});
        } else if (node.style.fontStyle.toLowerCase() == "normal") {
            if (styling.some(s => s.type == "italic")) styling.splice(styling.findIndex(s => s.type == "italic"), 1);
            if (trackOverrides) styling.push({type: "override", target: {type: "italic"}});
        }
        if (node.style.textDecoration.toLowerCase().includes("underline")) {
            if (!styling.some(s => s.type == "underline")) styling.push({type: "underline"});
        }
        if (node.style.textDecoration.toLowerCase().includes("line-through")) {
            if (!styling.some(s => s.type == "strikethrough")) styling.push({type: "strikethrough"});
        }
        if (node.style.fontFamily) {
            var family = node.style.fontFamily;
            family = family.split("&quot;").join("");
            family = family.split("\"").join("");
            family = family.split("'").join("");
            if (!styling.some(s => s.type == "font")) styling.push({type: "font", family: family});
        }
        if (node.style.fontSize) {
            var size = String(node.style.fontSize).trim().toLowerCase();
            if (size.endsWith("px") && +size.slice(0, -2) != Number.NaN) {
                var px = parseFloat(size.slice(0, -2));
                if (!styling.some(s => s.type == "size")) styling.push({type: "size", size: px});
            }
            // TODO: handle other types of font size
        }
        if (node.style.color) {
            if (!styling.some(s => s.type == "foreColor")) styling.push({type: "foreColor", color: node.style.color});
        }
        if (node.style.backgroundColor) {
            if (!styling.some(s => s.type == "backColor")) styling.push({type: "backColor", color: node.style.color});
        }
        if (node.style.textAlign) {
            var direction = node.style.textAlign.toLowerCase();
            if (!styling.some(s => s.type == "align")) styling.push({type: "align", direction: direction});
        }

        return styling;
    }

    /*
    Compare two styling objects.
    */
    compareStyling(a, b) {
        for (const e in a) {
            if (a[e] != b[e]) {
                return false;
            }
        }
        return true;
    }

    /*
    Check if an element applies a specific style.
    */
    elementHasStyle(elem, style) {
        const styling = this.getStylingOfElement(elem);
        if (styling.some(s => s.type == "foreColor") && style.type == "foreColor" && style.color == null) {return true;}
        if (styling.some(s => s.type == "backColor") && style.type == "backColor" && style.color == null) {return true;}
        return styling.some(s => this.compareStyling(s, style));
    }

    /*
    Detect the current styling of a range. For a style to be active, all of the nodes
    in the range must be the same.
    */
    detectStyling(range) {
        var styling = [];
        const nodes = this.getTextNodesInRange(range).nodes;
        
        // Iterate through the text nodes.
        var firstNode = true;
        var countedNodes = 0;
        for (const node of nodes) {
            // If the node is empty, don't count it.
            if (node.nodeType == Node.TEXT_NODE && node.textContent == "") {
                continue;
            }
            countedNodes += 1;

            // Traverse up the tree and track each style node passed on the way up.
            var currentNode = node.parentNode;
            var nodeStyling = [];
            while (this.inEditor(currentNode) && currentNode != this.editor) {
                nodeStyling.push(...this.getStylingOfElement(currentNode));
                currentNode = currentNode.parentNode;
            }

            // Add the default font styling.
            if (!nodeStyling.some(s => s.type == "font")) {
                nodeStyling.push({type: "font", family: this.defaultFont});
            }

            // Add the default size styling.
            if (!nodeStyling.some(s => s.type == "size")) {
                nodeStyling.push({type: "size", size: this.defaultSize});
            }
            
            if (firstNode) {
                // If this is the first node being tracked, add its styles to the styling.
                styling.push(...nodeStyling);

                firstNode = false;
            } else {
                // If this is not, check that each of the current styles is included in this element's styling.
                for (const style of styling.slice(0, styling.length)) {
                    if (!nodeStyling.some(s => this.compareStyling(s, style)) && !this.requireSingleNodeToActivateStylingCommands.includes(style.type)) {
                        // If the styling is not the same, remove the styling from the list.
                        styling.splice(styling.findIndex(s => s.type == style.type), 1);
                    }
                }
                for (const style of nodeStyling) {
                    if (this.requireSingleNodeToActivateStylingCommands.includes(style.type)) {
                        // If the style is not already applied, add it.
                        if (!styling.some(s => this.compareStyling(s, style))) styling.push(style);
                    }
                }
            }
        }

        // Add the default font styling.
        if (countedNodes == 0 && !styling.some(s => s.type == "font")) {
            styling.push({type: "font", family: this.defaultFont});
        }

        return styling;
    }

    /*
    Apply a style to a node.
    */
    applyStyleToNode(node, style) {
        // Go up the DOM tree, and check if the style has already been applied.
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && this.elementHasStyle(currentNode, style)) {
                // Found the node.
                return node;
            }
            currentNode = currentNode.parentNode;
        }

        // Create a new style element and place the node within it.
        const newElem = this.styleToElement(style);
        const marker = document.createTextNode("");
        node.after(marker);
        newElem.appendChild(node);
        marker.replaceWith(newElem);
        return newElem;
    }
    
    /*
    Check if a node is at the end of a parent.
    */
    isAtEndOfParentNode(node, parent) {
        var currentNode = node;
        while (parent.contains(currentNode) && parent != currentNode) {
            if (currentNode.nextSibling) return false;
            currentNode = currentNode.parentNode;
        }
        return true;
    }

    /*
    Apply a style to a range.
    */
    applyStyle(style, range) {
        var nodes, startOffset, endOffset;
        if (this.currentCursor) {
            // If a cursor exists, remove it and perform styling on its parent.
            const newTextNode = document.createTextNode("");
            this.currentCursor.parentElement.appendChild(newTextNode);
            nodes = [newTextNode];
            startOffset = 0;
            endOffset = 0;
            this.currentCursor.remove();
            this.currentCursor = null;
        } else {
            // Get the text nodes within the range.
            const output = this.getTextNodesInRange(range);
            if (!output) {
                return;
            }
            [{nodes, startOffset, endOffset} = output];
        }

        if (nodes.length >= 2) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            // Split the first node at the start offset and place the remainder in a new style element.
            if (firstNode.tagName != "BR") {
                var newStartNode = document.createTextNode(firstNode.textContent.slice(startOffset, firstNode.textContent.length));
                firstNode.textContent = firstNode.textContent.slice(0, startOffset);
                firstNode.after(newStartNode);
                newStartNode = this.applyStyleToNode(newStartNode, style);
                if (firstNode.textContent == "") {
                    firstNode.remove();
                }
            } else {
                newStartNode = this.applyStyleToNode(firstNode, style);
            }

            // Split the last node at the end offset and place the remainder in a new style element.
            if (lastNode.tagName != "BR") {
                var newEndNode = document.createTextNode(lastNode.textContent.slice(0, endOffset));
                lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);
                lastNode.before(newEndNode);
                newEndNode = this.applyStyleToNode(newEndNode, style);
                if (lastNode.textContent == "") {
                    lastNode.remove();
                }
            } else {
                newEndNode = this.applyStyleToNode(lastNode, style);
            }

            // Place each node in between in a new tag.
            for (const node of nodes.slice(1, nodes.length - 1)) {
                const styledNode = this.applyStyleToNode(node, style);
            }

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStartBefore(newStartNode);
            newRange.setEndAfter(newEndNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 1) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = nodes[0];

            // Handle BR nodes.
            if (node.tagName == "BR") {
                const styledNode = this.applyStyleToNode(node, style);

                // Select the new node.
                const newRange = new Range();
                newRange.selectNodeContents(styledNode);
                newRange.collapse();
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                return;
            }

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Style the middle node.
            styledNode = this.applyStyleToNode(styledNode, style);

            if (node.textContent == "") {
                node.remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            // If the styled node is at the end of a link node, escape.
            var currentNode = node.parentElement;
            var parentANode = null;
            var trackedNodes = [];
            while (this.inEditor(currentNode) && this.editor != currentNode) {
                if (currentNode.tagName == "A") {
                    parentANode = currentNode;
                    break;
                }
                trackedNodes.push(currentNode.cloneNode(false));
                currentNode = currentNode.parentElement;
            }
            if (parentANode && this.isAtEndOfParentNode(styledNode, parentANode)) {
                currentNode = styledNode;
                for (const node of trackedNodes) {
                    node.append(currentNode);
                    currentNode = node;
                }
                parentANode.after(currentNode);
            }

            if (styledNode.textContent == "") {
                // If the node is empty, create a cursor to bind the caret to.
                const cursor = this.createCursor();
                styledNode.appendChild(cursor);

                // Select the cursor.
                const newRange = new Range();
                newRange.selectNodeContents(cursor);
                newRange.collapse();
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                return;
            }

            // Select the new node.
            const newRange = new Range();
            newRange.selectNodeContents(styledNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 0) {
            if (!this.inEditor(range.commonAncestorContainer)) {
                return;
            }

            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            // Create a new node at the current range.
            const node = document.createTextNode("");
            const siblings = range.commonAncestorContainer.childNodes;
            if (siblings.length == 0) {
                range.commonAncestorContainer.append(node);
            } else {
                siblings[range.startOffset].after(node);
            }
            
            // Style the node.
            const styledNode = this.applyStyleToNode(node, style);

            // Place the cursor in the node.
            const cursor = this.createCursor();
            styledNode.appendChild(cursor);

            // Select the cursor.
            const newRange = new Range();
            newRange.selectNodeContents(cursor);
            newRange.collapse();
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }
    }

    /*
    Check if a node is empty (no text/content nodes).
    */
    isEmpty(node) {
        var currentNode = node;
        while (node.contains(currentNode) && currentNode != this.editor) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && this.contentTags.includes(currentNode.tagName)) {
                return false;
            }
            if (currentNode.nodeType == Node.TEXT_NODE && currentNode.textContent.replace(this.invisibleParsed, "") != "") {
                return false;
            }
        
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                currentNode = currentNode.firstChild;
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling && node.contains(currentNode) && node != currentNode) {
                    currentNode = currentNode.parentNode;
                } 
                currentNode = currentNode.nextSibling;
            } else {
                // Go to the next node.
                currentNode = currentNode.nextSibling;
            }
        }
        return true;
    }

    /*
    Check if a node is empty or only contains one BR node.
    */
    isEmptyOrLineBreak(node) {
        var currentNode = node;
        var brNodes = 0;
        const contentTags = this.contentTags.filter(t => t != "BR");
        while (node.contains(currentNode) && currentNode != this.editor) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && contentTags.includes(currentNode.tagName)) {
                return false;
            }
            if (currentNode.nodeType == Node.TEXT_NODE && currentNode.textContent.replace(this.invisibleParsed, "") != "") {
                return false;
            }
            if (currentNode.tagName == "BR") {
                if (brNodes == 1) {
                    return false;
                } else {
                    brNodes = 1;
                }
            }
        
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                currentNode = currentNode.firstChild;
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling && node.contains(currentNode) && node != currentNode) {
                    currentNode = currentNode.parentNode;
                } 
                currentNode = currentNode.nextSibling;
            } else {
                // Go to the next node.
                currentNode = currentNode.nextSibling;
            }
        }
        return true;
    }

    /*
    Split a node at a child. Returns the split node after the child.
    */
    splitNodeAtChild(parent, child, includeSelf = false) {
        var currentNode = child;
        var currentSplitNode = null;
        while (parent.contains(currentNode) && parent != currentNode) {
            // Traverse up the tree.
            const newCurrentNode = currentNode.parentNode;

            // Get all the nodes after the current node.
            const siblings = Array.from(currentNode.parentNode.childNodes);
            if (includeSelf && currentSplitNode == null) {
                // If this is the first iteration, and we want to include the child, slice it with the child.
                var nodesAfterCurrentNode = siblings.slice(siblings.indexOf(currentNode) + 0, siblings.length);
            } else {
                var nodesAfterCurrentNode = siblings.slice(siblings.indexOf(currentNode) + 1, siblings.length);
            }
            
            // Append the nodes after the current split node.
            if (currentSplitNode == null) {
                currentSplitNode = currentNode.parentNode.cloneNode(false);
                currentSplitNode.append(...nodesAfterCurrentNode);
            } else {
                const oldSplitNode = currentSplitNode;
                currentSplitNode = currentNode.parentNode.cloneNode(false);
                currentSplitNode.append(oldSplitNode, ...nodesAfterCurrentNode);
            }

            currentNode = newCurrentNode;
        }
        
        return currentSplitNode;
    }

    /*
    Remove a style from an element.
    */
    removeStyleFromElement(elem, style) {
        if (this.blockStylingCommands.includes(style.type)) {
            // Remove block styling.
            switch (style.type) {
                case "align":
                    if (elem.style.textAlign && elem.style.textAlign.toLowerCase().includes(style.direction)) {
                        const temp = document.createElement("div");
                        temp.append(...elem.childNodes);
                        temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                        temp.style.textAlign = "";
                        elem.remove();
                        elem = temp;
                        elemRemoved = true;
                    }
                    break;
                case "quote":
                    if (elem.tagName == "BLOCKQUOTE") {
                        const temp = document.createElement("div");
                        temp.append(...elem.childNodes);
                        temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                        elem.remove();
                        elem = temp;
                        elemRemoved = true;
                    }
                    break;
                case "header":
                    if (elem.tagName == style.level) {
                        const temp = document.createElement("div");
                        temp.append(...elem.childNodes);
                        temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                        elem.remove();
                        elem = temp;
                        elemRemoved = true;
                    }
                    break;
                case "list":
                    if (elem.tagName == (style.listType == "ordered" ? "OL" : "UL")) {
                        const outerDiv = document.createElement("div");
                        for (const li of Array.from(elem.childNodes)) {
                            if (!Array.from(li.childNodes).every((e) => this.blockTags.includes(e.tagName)) && !elem.getAttribute("style")) {
                                const temp = document.createElement("div");
                                temp.append(...li.childNodes);
                                temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                                li.remove();
                                outerDiv.append(temp);
                            } else {
                                outerDiv.append(...li.childNodes);
                                li.remove();
                            }
                        }
                        elem.remove();
                        elem = outerDiv;
                        elemRemoved = true;
                    }
                    break;
            }

            return elem;
        }


        if (elem.getAttribute("style")) {
            // Element contains styling. Determine if any of the styles applies the specified style.
            switch (style.type) {
                case "bold":
                    if (elem.style.fontWeight.toLowerCase() == "bold" || elem.style.fontWeight == "700") {
                        elem.style.fontWeight = "";
                    }
                    break;
                case "italic":
                    if (elem.style.fontStyle.toLowerCase() == "italic") {
                        elem.style.fontStyle = "";
                    }
                    break;
                case "underline":
                    if (elem.style.textDecoration.toLowerCase().includes("underline")) {
                        elem.style.textDecoration = elem.style.textDecoration.toLowerCase().replace("underline", "");
                    }
                    break;
                case "strikethrough":
                    if (elem.style.textDecoration.toLowerCase().includes("line-through")) {
                        elem.style.textDecoration = elem.style.textDecoration.toLowerCase().replace("line-through", "");
                    }
                    break;
                case "font":
                    if (elem.style.fontFamily) {
                        elem.style.fontFamily = "";
                    }
                    break;
                case "size":
                    if (elem.style.fontSize) {
                        elem.style.fontSize = "";
                    }
                    break;
                case "foreColor":
                    if (elem.style.color) {
                        elem.style.color = "";
                    }
                    break;
                case "backColor":
                    if (elem.style.backgroundColor) {
                        elem.style.backgroundColor = "";
                    }
                    break;
            }

            // If there aren't any styles left and the element itself doesn't apply a style, remove the element.
            if (!elem.getAttribute("style") && !this.stylingTags.includes(elem.tagName)) {
                elem = elem.firstChild;
                return elem;
            }
        }

        // If the element itself applies the specified style, remove the element.
        const savedStyles = elem.getAttribute("style");
        var elemRemoved = false;
        switch (style.type) {
            case "bold":
                if (elem.tagName == "B" || elem.tagName == "STRONG") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
            case "italic":
                if (elem.tagName == "I" || elem.tagName == "EM") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
            case "underline":
                if (elem.tagName == "U") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
            case "strikethrough":
                if (elem.tagName == "S") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
            case "font":
                if (elem.tagName == "FONT") {
                    if (elem.hasAttribute("face")) elem.removeAttribute("face");
                }
                break;
            case "size":
                if (elem.tagName == "FONT") {
                    if (elem.hasAttribute("size")) elem.removeAttribute("size");
                }
                break;
            case "foreColor":
                if (elem.tagName == "FONT") {
                    if (elem.hasAttribute("color")) elem.removeAttribute("color");
                }
                break;
            case "sup":
                if (elem.tagName == "SUP") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
            case "sub":
                if (elem.tagName == "SUB") {
                    elem = elem.firstChild;
                    elemRemoved = true;
                }
                break;
        }

        // If the previous element had styles on it, reapply the styles.
        if (savedStyles && elemRemoved) {
            const newElem = document.createElement("span");
            newElem.setAttribute("style", savedStyles);
            newElem.append(elem);
            elem = newElem;
        }

        return elem;
    }

    /*
    Remove a style on a node.
    */
    removeStyleOnNode(node, style) {
        if (node.nodeType == Node.ELEMENT_NODE && this.elementHasStyle(node, style)) {
            // No need to do any splitting or reconstruction, just remove the style from the node and replace it.
            const marker = document.createTextNode("");
            node.after(marker);
            const newNode = this.removeStyleFromElement(node, style);
            marker.after(newNode);
            marker.remove();
            if (newNode != node) node.remove();
            return newNode;
        }

        // Go up the DOM tree until the tag is found, saving a list of elements passed on the way up.
        // We want to preserve the original node, so we replace it with a empty marker.
        const marker = document.createTextNode("");
        node.after(marker);
        var currentNode = marker;
        var currentReconstructedNode = node;
        const oldNode = node;
        node = marker;
        var found = false;

        // Traverse upwards and reconstruct all the nodes passed on the way up.
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            currentNode = currentNode.parentNode;

            // Add the node.
            var clone = currentNode.cloneNode(false);
            clone.appendChild(currentReconstructedNode);
            currentReconstructedNode = clone;

            if (currentNode.nodeType == Node.ELEMENT_NODE && this.elementHasStyle(currentNode, style)) {
                // Found the node.
                found = true;
                break;
            }
        }
        if (!found) {
            // Re-insert the original node.
            marker.after(oldNode);
            marker.remove();
            return oldNode;
        }

        // Remove the style on the reconstructed node.
        currentReconstructedNode = this.removeStyleFromElement(currentReconstructedNode, style);

        const parent = currentNode;

        // Split the parent at the current node.
        const splitAfterNode = this.splitNodeAtChild(parent, node);
        if (!this.isEmpty(splitAfterNode)) parent.after(splitAfterNode);

        // Place in the reconstructed node and the reconstructed after node.
        parent.after(currentReconstructedNode);

        // Remove the original node.
        node.remove();

        // Remove empty nodes.
        if (this.isEmpty(parent)) parent.remove();

        return currentReconstructedNode;
    }

    /* 
    Remove a style from a range.
    */
    removeStyle(style, range) {
        var nodes, startOffset, endOffset;
        if (this.currentCursor) {
            // If a cursor exists, remove it and perform styling on its parent.
            const newTextNode = document.createTextNode("");
            this.currentCursor.parentElement.appendChild(newTextNode);
            nodes = [newTextNode];
            startOffset = 0;
            endOffset = 0;
            this.currentCursor.remove();
            this.currentCursor = null;
        } else {
            // Get the text nodes within the range.
            const output = this.getTextNodesInRange(range);
            if (!output) {
                return;
            }
            [{nodes, startOffset, endOffset} = output];
        }

        if (nodes.length >= 2) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            // Split the first node at the start offset.
            if (firstNode.tagName != "BR") {
                var newStartNode = document.createTextNode(firstNode.textContent.slice(startOffset, firstNode.textContent.length));
                firstNode.textContent = firstNode.textContent.slice(0, startOffset);
                firstNode.after(newStartNode);
                if (firstNode.textContent == "") {
                    firstNode.remove();
                }
            } else {
                var newStartNode = firstNode;
            }

            // Split the last node at the end offset.
            if (lastNode.tagName != "BR") {
                var newEndNode = document.createTextNode(lastNode.textContent.slice(0, endOffset));
                lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);
                lastNode.before(newEndNode);
                if (lastNode.textContent == "") {
                    lastNode.remove();
                }
            } else {
                var newEndNode = lastNode;
            }

            // Remove the styling for each node.
            newEndNode = this.removeStyleOnNode(newEndNode, style);
            for (const node of nodes.slice(1, nodes.length - 1).reverse()) {
                this.removeStyleOnNode(node, style);
            }
            newStartNode = this.removeStyleOnNode(newStartNode, style);

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStartBefore(newStartNode);
            newRange.setEndAfter(newEndNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 1) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = nodes[0];

            // Handle BR nodes.
            if (node.tagName == "BR") {
                const styledNode = this.removeStyleOnNode(node, style);

                // Select the new node.
                const newRange = new Range();
                newRange.selectNodeContents(styledNode);
                newRange.collapse();
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                return;
            }

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Remove the styling on the middle node.
            styledNode = this.removeStyleOnNode(styledNode, style);

            if (node.textContent == "") {
                node.remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            if (styledNode.textContent == "") {
                // If the node is empty, create a cursor to bind the caret to.
                const cursor = this.createCursor();
                var furthestInsideNode = styledNode;
                while (furthestInsideNode.childNodes && furthestInsideNode.childNodes.length != 0) {
                    furthestInsideNode = furthestInsideNode.childNodes[0];
                }
                if (furthestInsideNode.nodeType == Node.TEXT_NODE) {
                    furthestInsideNode.after(cursor);
                } else {
                    furthestInsideNode.append(cursor);
                }

                // Select the cursor.
                const newRange = new Range();
                newRange.selectNodeContents(cursor);
                newRange.collapse();
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                return;
            }

            // Select the new node.
            const newRange = new Range();
            newRange.selectNodeContents(styledNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 0) {
            if (!this.inEditor(range.commonAncestorContainer)) {
                return;
            }

            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            // Create a new node at the current range.
            const node = document.createTextNode("");
            const siblings = range.commonAncestorContainer.childNodes;
            if (siblings.length == 0) {
                range.commonAncestorContainer.append(node);
            } else {
                siblings[range.startOffset].after(node);
            }
            
            // Style the node.
            const styledNode = this.removeStyleOnNode(node, style);

            // Place the cursor in the node.
            const cursor = this.createCursor();
            var furthestInsideNode = styledNode;
            while (furthestInsideNode.childNodes && furthestInsideNode.childNodes.length != 0) {
                furthestInsideNode = furthestInsideNode.childNodes[0];
            }
            if (furthestInsideNode.nodeType == Node.TEXT_NODE) {
                furthestInsideNode.after(cursor);
            } else {
                furthestInsideNode.append(cursor);
            }

            // Select the cursor.
            const newRange = new Range();
            newRange.selectNodeContents(cursor);
            newRange.collapse();
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }
    }

    /*
    Change a style on a node.
    */
    changeStyleOnNode(node, style) {
        // Go up the DOM tree, and check if the style has already been applied. Reconstruct the node on the way up, in case it needs to be split.
        var currentNode = node;
        var currentReconstructedNode = node.cloneNode(true);

        currentNode = currentNode.parentNode;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode == this.editor) {
                break;
            }

            // Add the node.
            var clone = currentNode.cloneNode(false);
            clone.appendChild(currentReconstructedNode);
            currentReconstructedNode = clone;
            if (currentNode.nodeType == Node.ELEMENT_NODE && this.getStylingOfElement(currentNode).some(s => s.type == style.type) && currentNode != this.editor) {
                // Found the node. Split the node and change the styling.
                const splitAfterNode = this.splitNodeAtChild(currentNode, node);
                if (!this.isEmpty(splitAfterNode)) currentNode.after(splitAfterNode);

                // Place in the reconstructed node and the reconstructed after node.
                currentNode.after(currentReconstructedNode);

                // Remove the original node.
                node.remove();

                // Remove empty nodes.
                if (this.isEmpty(currentNode)) currentNode.remove();

                // Change the styling.
                switch (style.type) {
                    case "font":
                        if (currentReconstructedNode.tagName == "FONT") {
                            currentReconstructedNode.setAttribute("face", style.family);
                        } else {
                            currentReconstructedNode.style.fontFamily = style.family;
                        }
                        break;
                    case "size":
                        if (currentReconstructedNode.tagName == "FONT") {
                            if (currentReconstructedNode.hasAttribute("size")) currentReconstructedNode.removeAttribute("size");
                            currentReconstructedNode.style.fontSize = String(style.size) + "px";
                        } else {
                            currentReconstructedNode.style.fontSize = String(style.size) + "px";
                        }
                        break;
                    case "foreColor":
                        if (currentReconstructedNode.tagName == "FONT") {
                            currentReconstructedNode.setAttribute("color", style.color);
                        } else {
                            currentReconstructedNode.style.color = style.color;
                        }
                        break;
                    case "backColor":
                        currentReconstructedNode.style.backgroundColor = style.color;
                        break;
                }
                return currentReconstructedNode;
            }

            currentNode = currentNode.parentNode;
        }

        // Create a new style element and place the node within it.
        const newElem = this.styleToElement(style);
        newElem.appendChild(node.cloneNode(true));
        node.replaceWith(newElem);
        return newElem;
    }

    /*
    Change the styling on a range.
    */
    changeStyling(style, range) {
        var nodes, startOffset, endOffset;
        if (this.currentCursor) {
            // If a cursor exists, remove it and perform styling on its parent.
            const newTextNode = document.createTextNode("");
            this.currentCursor.parentElement.appendChild(newTextNode);
            nodes = [newTextNode];
            startOffset = 0;
            endOffset = 0;
            this.currentCursor.remove();
            this.currentCursor = null;
        } else {
            // Get the text nodes within the range.
            const output = this.getTextNodesInRange(range);
            if (!output) {
                return;
            }
            [{nodes, startOffset, endOffset} = output];
        }

        if (nodes.length >= 2) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            // Split the first node at the start offset.
            if (firstNode.tagName != "BR") {                
                var newStartNode = document.createTextNode(firstNode.textContent.slice(startOffset, firstNode.textContent.length));
                firstNode.textContent = firstNode.textContent.slice(0, startOffset);
                firstNode.after(newStartNode);
                if (firstNode.textContent == "") {
                    firstNode.remove();
                }
            } else {
                var newStartNode = firstNode;
            }

            // Split the last node at the end offset.
            if (lastNode.tagName != "BR") {
                var newEndNode = document.createTextNode(lastNode.textContent.slice(0, endOffset));
                lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);
                lastNode.before(newEndNode);
                if (lastNode.textContent == "") {
                    lastNode.remove();
                }
            } else {
                var newEndNode = lastNode;
            }

            // Change the styling for each node.
            newEndNode = this.changeStyleOnNode(newEndNode, style);
            for (const node of nodes.slice(1, nodes.length - 1).reverse()) {
                this.changeStyleOnNode(node, style);
            }
            newStartNode = this.changeStyleOnNode(newStartNode, style);

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStartBefore(newStartNode);
            newRange.setEndAfter(newEndNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 1) {
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = nodes[0];

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Remove the styling on the middle node.
            styledNode = this.changeStyleOnNode(styledNode, style);

            if (node.textContent == "") {
                node.remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            if (styledNode.textContent == "") {
                // If the node is empty, create a cursor to bind the caret to.
                const cursor = this.createCursor();
                var furthestInsideNode = styledNode;
                while (furthestInsideNode.childNodes && furthestInsideNode.childNodes.length != 0) {
                    furthestInsideNode = furthestInsideNode.childNodes[0];
                }
                if (furthestInsideNode.nodeType == Node.TEXT_NODE) {
                    furthestInsideNode.after(cursor);
                } else {
                    furthestInsideNode.append(cursor);
                }

                // Select the cursor.
                const newRange = new Range();
                newRange.selectNodeContents(cursor);
                newRange.collapse();
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                return;
            }

            // Select the new node.
            const newRange = new Range();
            newRange.selectNodeContents(styledNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 0) {
            // Create a new node at the current range.
            if (!this.inEditor(range.commonAncestorContainer)) {
                return;
            }

            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = document.createTextNode("");
            const siblings = range.commonAncestorContainer.childNodes;
            if (siblings.length == 0) {
                range.commonAncestorContainer.append(node);
            } else {
                siblings[range.startOffset].after(node);
            }
            
            // Style the node.
            const styledNode = this.changeStyleOnNode(node, style);

            // Place the cursor in the node.
            const cursor = this.createCursor();
            var furthestInsideNode = styledNode;
            while (furthestInsideNode.childNodes && furthestInsideNode.childNodes.length != 0) {
                furthestInsideNode = furthestInsideNode.childNodes[0];
            }
            if (furthestInsideNode.nodeType == Node.TEXT_NODE) {
                furthestInsideNode.after(cursor);
            } else {
                furthestInsideNode.append(cursor);
            }

            // Select the cursor.
            const newRange = new Range();
            newRange.selectNodeContents(cursor);
            newRange.collapse();
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }
    }

    /*
    Checks if a node is a valid block node.
    */
    isValidBlockNode(node) {
        if (!node) return false;
        if (node.nodeType != Node.ELEMENT_NODE) {
            return false;
        }
        if (!this.blockTags.includes(node.tagName) || node.tagName == "BR") {
            return false;
        }
        return true;
    }

    /*
    Check if a boundary point is a valid block start point.
    */
    isValidBlockStartPoint(startContainer, startOffset) {
        if ((startContainer == this.editor && startOffset == 0) || this.isValidBlockNode(startContainer.childNodes[startOffset - 1])) {
            if ((startContainer.nodeType == Node.TEXT_NODE ? startContainer.textContent.length : startContainer.childNodes.length) != 0) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /*
    Check if a boundary point is a valid block end point.
    */
    isValidBlockEndPoint(endContainer, endOffset) {
        if ((endContainer == this.editor && endOffset == this.editor.childNodes.length) || this.isValidBlockNode(endContainer.childNodes[endOffset])) {
            if ((endContainer.nodeType == Node.TEXT_NODE ? endContainer.textContent.length : endContainer.childNodes.length) != 0) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /*
    Block extend a range.
    */
    blockExtendRange(range, ascendAncestors = true) {
        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        if (endOffset == 0 && endContainer != this.editor && !(endOffset == startOffset && endContainer == startContainer)) {
            // If the end offset is at the start of a node, move it up.
            while (endOffset == 0 && endContainer != this.editor) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer);
                endContainer = endContainer.parentNode;
            }
        }

        // If the start offset is at the end of an element node, move it back one.
        if (startContainer.nodeType == Node.ELEMENT_NODE && startOffset == startContainer.childNodes.length && startOffset != 0) {
            startOffset -= 1;
        }
        
        // Move the start boundary to a valid block.
        while (!this.isValidBlockStartPoint(startContainer, startOffset)) {
            if (startOffset == 0) {
                startOffset = Array.from(startContainer.parentNode.childNodes).indexOf(startContainer);
                startContainer = startContainer.parentNode;
            } else {
                startOffset -= 1;
            }
            if (this.isValidBlockEndPoint(startContainer, startOffset)) {
                break;
            }
        }
        
        // We always want to ascend ancestors. That way, we can traverse back into them only if necessary.
        if (ascendAncestors) {
            while (startOffset == 0 && startContainer != this.editor) {
                startOffset = Array.from(startContainer.parentNode.childNodes).indexOf(startContainer);
                startContainer = startContainer.parentNode;
            }
        } else {
            // Only ascend out of extraneous ancestors.
            while (startOffset == 0 && startContainer != this.editor && ["DIV", "P"].includes(startContainer.tagName)) {
                startOffset = Array.from(startContainer.parentNode.childNodes).indexOf(startContainer);
                startContainer = startContainer.parentNode;
            }
        }

        // If the end offset is at the start of an element node, move it forward one.
        if (endContainer.nodeType == Node.ELEMENT_NODE && endOffset == 0 && endContainer.childNodes.length != 0) {
            endOffset += 1;
        }

        // Move the end boundary to a valid block.
        while (!this.isValidBlockEndPoint(endContainer, endOffset)) {
            if (endOffset == (endContainer.nodeType == Node.TEXT_NODE ? endContainer.textContent.length : endContainer.childNodes.length)) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer) + 1;
                endContainer = endContainer.parentNode;
            } else {
                endOffset += 1;
            }
            if (this.isValidBlockStartPoint(endContainer, endOffset)) {
                break;
            }
        }
        
        if (ascendAncestors) {
            while (endOffset == (endContainer.nodeType == Node.TEXT_NODE ? endContainer.textContent.length : endContainer.childNodes.length) && endContainer != this.editor) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer) + 1;
                endContainer = endContainer.parentNode;
            }
        } else {
            // Only ascend out of extraneous ancestors.
            while (endOffset == (endContainer.nodeType == Node.TEXT_NODE ? endContainer.textContent.length : endContainer.childNodes.length) && endContainer != this.editor && ["DIV", "P"].includes(endContainer.tagName)) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer) + 1;
                endContainer = endContainer.parentNode;
            }
        }

        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        return newRange;
    }

    /*
    Get all block nodes within a block extended range.
    */
    getBlockNodesInRange(range) {
        const nodes = [];

        // Get the start node.
        if (range.startContainer.nodeType != Node.ELEMENT_NODE) {
            var currentNode = range.startContainer;
        } else {
            if (range.startContainer.length == 0) {
                var currentNode = range.startContainer;
            } else {
                if (range.startContainer == this.editor && range.startOffset == this.editor.childNodes.length) {
                    // The range's start is at end of the editor.
                    return;
                } else if (range.startOffset == range.startContainer.childNodes.length) {
                    // The range's start is at the end of the start container. Escape out of the start container.
                    var startContainer = range.startContainer;
                    var startOffset = range.startOffset;
                    while (startOffset == startContainer.childNodes.length) {
                        startOffset = Array.from(startContainer.parentNode.childNodes).indexOf(startContainer);
                        startContainer = startContainer.parentNode;
                        if (startContainer == this.editor && range.startOffset == this.editor.childNodes.length) {
                            return;
                        }
                    }
                    var currentNode = startContainer.childNodes[startOffset];
                } else {
                    var currentNode = range.startContainer.childNodes[range.startOffset];
                }
            }
        }

        // Check if the whole node is within the range.
        if (currentNode.nodeType == Node.ELEMENT_NODE && !range.isPointInRange(currentNode, currentNode.childNodes.length)) {
            // The node isn't fully contained within the range. If there are children, move to the first child.
            if (currentNode.childNodes.length != 0 && range.intersectsNode(currentNode)) {
                // Continually move to the first child until the node is fully intersected within the range.
                while (currentNode.nodeType == Node.ELEMENT_NODE && !range.isPointInRange(currentNode, currentNode.childNodes.length)) {
                    currentNode = currentNode.firstChild;
                    if (currentNode.childNodes.length == 0 && !range.intersectsNode(currentNode)) {
                        return nodes;
                    }
                }
            } else {
                return nodes;
            }
        } else if (currentNode.nodeType == Node.TEXT_NODE && !range.intersectsNode(currentNode)) {
            // The node isn't contained within the range.
            return nodes;
        }

        nodes.push(currentNode);

        // Traverse through the range until we reach the end. Track each node passed on the way.
        while (this.inEditor(currentNode)) {
            // Move to the next node.
            if (currentNode.nextSibling) {
                currentNode = currentNode.nextSibling;
            } else {
                while (!currentNode.nextSibling) {
                    currentNode = currentNode.parentNode;
                }
                if (currentNode == this.editor || !this.inEditor(currentNode)) {
                    return nodes;
                }
                currentNode = currentNode.nextSibling;
            }

            // Check if the whole node is within the range.
            if (currentNode.nodeType == Node.ELEMENT_NODE && !range.isPointInRange(currentNode, currentNode.childNodes.length)) {
                // The node isn't fully contained within the range. If there are children, move to the first child.
                if (currentNode.childNodes.length != 0 && range.intersectsNode(currentNode)) {
                    // Continually move to the first child until the node is fully intersected within the range.
                    while (currentNode.nodeType == Node.ELEMENT_NODE && !range.isPointInRange(currentNode, currentNode.childNodes.length)) {
                        currentNode = currentNode.firstChild;
                        if (currentNode.childNodes.length == 0 && !range.intersectsNode(currentNode)) {
                            return nodes;
                        }
                    }
                } else {
                    return nodes;
                }
            } else if (currentNode.nodeType == Node.TEXT_NODE && !range.intersectsNode(currentNode)) {
                // The node isn't contained within the range.
                return nodes;
            }

            // Append the node.
            nodes.push(currentNode);
        }

        return nodes;
    }

    /*
    -- NOTES -- 
    RULES:
    - H1-H6 are mutually exclusive
    - UL and OL are mutually exclusive
    - UL, OL, and BLOCKQUOTE join
    - Order of nodes (outermost to innermost): BLOCKQUOTE/LISTS (any order) -> H1-H6 -> styling nodes -> text nodes
    - when applying block styles, don't needlessly exit parent node
    - when applying block styles that need to escape, always move up the DOM and find nodes the need to be escaped. if necessary, split them.
    - when applying block styles that need to go inside, always move down the DOM and apply to children.
    - when removing block styles, move up the parent as much as possible
    - when removing block styles, remove all styles within and move up the DOM, splitting and removing ALL parent nodes
    PASTING:
    - Track current styles on each node, and only allow one of each type of style to be added
    - Only apply inline styles
    - apply inline styles to all text nodes, BRs, and images
    - track certain block styles (text align, header, etc.) and apply them in afterwards
    TODO:
    - place certain nodes inside, certain nodes outside
    - when applying styles, don't needlessly place nodes around the current selection.
    - certain styles (blockquote, a href), etc. should activate if ANY of the children have that style applied (maybe)
    - removing styles
    */

    /*
    Apply a block style to a node. The disallowedParents value should be a predicate.
    */
    applyBlockStyleToNode(node, style, disallowedParents = null, inside = false) {
        // Go up the DOM tree, and check if the style has already been applied.
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && this.elementHasStyle(currentNode, style)) {
                // Found the node.
                return currentNode;
            }
            currentNode = currentNode.parentNode;
        }

        // Look for the topmost disallowed parent.
        const topmostDisallowedParent = disallowedParents ? this.findLastParent(node, disallowedParents) : null;

        if (topmostDisallowedParent && topmostDisallowedParent != node) {
            // Split the topmost parent, including the node.
            const splitIncludingNode = this.splitNodeAtChild(topmostDisallowedParent, node, true);

            // Split the split node, not including the node.
            const splitAfterNode = this.splitNodeAtChild(splitIncludingNode, node, false);

            topmostDisallowedParent.after(splitIncludingNode, splitAfterNode);
            if (topmostDisallowedParent != this.editor && this.isEmpty(topmostDisallowedParent)) {
                // Remove the topmost parent node.
                topmostDisallowedParent.remove();
            }
            if (splitAfterNode != this.editor && this.isEmpty(splitAfterNode)) {
                // Remove the split after node.
                splitAfterNode.remove();
            }

            node = splitIncludingNode;
        }

        // Since blockExtendRange and getBlockNodesInRange always ascended ancestors, we must re-traverse back through ancestors if the node must be placed inside.
        if (inside) {
            // Traverse all the way back down.
            while (node.nodeType == Node.ELEMENT_NODE && node.childNodes.length == 1 && this.blockTags.includes(node.childNodes[0].tagName) && !this.childlessTags.includes(node.childNodes[0].tagName)) {
                node = node.childNodes[0];
            }
        }

        // Create a new style element and place the node within it.
        const newElem = this.styleToElement(style);
        if (node.tagName == "LI") {
            // Style the interior nodes.
            if (newElem.childNodes.length == 0) {
                newElem.append(...node.childNodes);
            } else {
                newElem.childNodes[0].append(...node.childNodes);
            }
            node.append(newElem);
            return newElem;
        } else {
            if (!inside) {
                const marker = document.createTextNode("");
                node.after(marker);
                if (newElem.childNodes.length == 0) {
                    newElem.appendChild(node);
                } else {
                    newElem.childNodes[0].appendChild(node);
                }
                marker.replaceWith(newElem);
            } else {
                if (node.tagName == "OL" || node.tagName == "UL") {
                    if (node.childNodes.length != 0) {
                        newElem.appendChild(...node.childNodes[0].childNodes);
                        node.childNodes[0].append(newElem);
                    }
                } else {
                    if (newElem.childNodes.length == 0) {
                        newElem.append(...node.childNodes);
                    } else {
                        newElem.childNodes[0].append(...node.childNodes);
                    }
                    node.append(newElem);
                }
            }
            return newElem;
        }
    }

    /*
    Apply a block style to a range.
    */
    applyBlockStyle(style, range) {
        this.shouldTakeSnapshotOnNextChange = true;

        if (this.editor.innerHTML == "") {
            this.editor.append(document.createElement("br"));
            range = this.getRange();
        }

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        const shouldJoin = !this.inlineBlockStylingCommands.includes(style.type);

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName)) {
            // If there are no children of this node, exit.
            if (startContainer.childNodes.length == 0) {
                break;
            }

            if (startOffset == startContainer.childNodes.length) {
                startContainer = startContainer.childNodes[startOffset - 1];
                startOffset = startContainer.nodeType == Node.ELEMENT_NODE ? startContainer.childNodes.length : startContainer.textContent.length;
            } else {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }
        }

        // Adjust the end point so that it is always relative to inline nodes.
        while (endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName)) {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                endContainer = endContainer.childNodes[endOffset];
                endOffset = 0;
            } else {
                endContainer = endContainer.childNodes[endOffset - 1];
                endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
            }
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);
        
        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        // Fix disallowed children.
        const fixedNodes = [];
        const disallowedChildren = (this.inlineBlockStylingCommands.includes(style.type)) ? "blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6, [style*=\"text-align\"]" : null;
        function fixDisallowedChildrenOfNode(node) {
            if (node.nodeType == Node.ELEMENT_NODE && (node == this.editor || (disallowedChildren && (node.matches(disallowedChildren) || node.querySelector(disallowedChildren))))) {
                // Append the children instead.
                for (const child of node.childNodes) {
                    fixDisallowedChildrenOfNode(child);
                }
            } else {
                // Append the node.
                fixedNodes.push(node);
            }
        }
        fixDisallowedChildrenOfNode = fixDisallowedChildrenOfNode.bind(this);
        for (const node of nodes) {
            fixDisallowedChildrenOfNode(node);
        }

        // Fix disallowed parents.
        if (style.type == "quote" || style.type == "list") {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN" || ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName) || (e.style && e.style.textAlign));
        } else if (style.type == "header") {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN" || ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName));
        } else {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN");
        }

        // Style the nodes.
        var firstStyled = null;
        var lastStyled = null;
        var lastNode = null;
        for (const node of fixedNodes) {
            if (this.isEmpty(node)) {
                // Empty nodes.
                node.remove();
                continue;
            }

            if (node.contains(range.commonAncestorContainer) && node != range.commonAncestorContainer && this.blockTags.includes(node.tagName) && !this.childlessTags.includes(node.tagName)) {
                var inside = true;
            } else {
                var inside = false;
            }
            const styledNode = this.applyBlockStyleToNode(node, style, disallowedParents, inside);
            if (!firstStyled) firstStyled = styledNode;
            if (lastStyled && lastStyled.nextSibling == styledNode) {
                if (!shouldJoin && this.blockTags.includes(node.tagName)) {
                    // If shouldJoin is false, we only want to join inline nodes. Therefore, if the current node is not inline, don't join it.
                    lastStyled = styledNode;
                } else {
                    if (style.type == "list" && !this.blockTags.includes(node.tagName) && !this.blockTags.includes(lastNode.tagName)) {
                        // For non-block lists, we want to join the interior nodes inside the LI.
                        lastStyled.lastChild.append(...styledNode.firstChild.childNodes);
                        styledNode.remove();
                    } else {
                        lastStyled.append(...styledNode.childNodes);
                        styledNode.remove();
                    }
                }
            } else {
                lastStyled = styledNode;
            }
            if (inside && ["DIV", "P"].includes(node.tagName)) {
                // Extraneous node.
                node.after(...node.childNodes);
                node.remove();
                lastNode = node.childNodes[0];
            } else {
                lastNode = node;
            }
        }

        // See if the first node and last node can be joined.
        if (style.type == "list") {
            if (firstStyled.previousSibling?.tagName == firstStyled.tagName) {
                // Join.
                const previousSibling = firstStyled.previousSibling;
                previousSibling.append(...firstStyled.childNodes);
                firstStyled.remove();
                if (lastStyled == firstStyled) lastStyled = previousSibling;
                firstStyled = previousSibling;
            }
            if (lastStyled.nextSibling?.tagName == lastStyled.tagName) {
                // Join.
                const nextSibling = lastStyled.nextSibling;
                nextSibling.prepend(...lastStyled.childNodes);
                lastStyled.remove();
                lastStyled = nextSibling;
            }
        }

        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Remove a block style from a node.
    */
    removeBlockStyleOnNode(node, style, removeAllParents = true) {
        // Search the children of the node for any node that match the style.
        const iterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT, (e) => this.elementHasStyle(e, style) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
        var child;
        const nodesToRemove = [];
        while (child = iterator.nextNode()) {
            if (child != this.editor) nodesToRemove.push(child);
        }

        var finalStyled = null;
        const extraneousDivsToRemove = [];

        // Remove the styles on child nodes.
        for (const child of nodesToRemove) {
            // Remove the style.
            const marker = document.createTextNode("");
            child.after(marker);
            const styledNode = this.removeStyleFromElement(child, style);

            // If the original node was removed by this operation, set finalStyled to this node.
            if (!this.inEditor(node) && !finalStyled) {
                finalStyled = styledNode;
            }

            if (Array.from(styledNode.childNodes).every((e) => this.blockTags.includes(e.tagName))) {
                extraneousDivsToRemove.push(styledNode);
            }

            // Put the styled node back.
            marker.after(styledNode);
            marker.remove();
        }

        // Search the parents of the node for any node that matches the style.
        var parentNodesToRemove = [];
        node = finalStyled ? finalStyled : node;
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (this.elementHasStyle(currentNode, style)) {
                parentNodesToRemove.push(currentNode);
            }
            currentNode = currentNode.parentNode;
        }

        for (const parentNode of parentNodesToRemove) {
            if (removeAllParents == false && finalStyled) break;

            // Split the parent node at the node.
            const splitIncludingNode = this.splitNodeAtChild(parentNode, node, true);
            const splitAfterNode = this.splitNodeAtChild(splitIncludingNode, node);

            // Remove the style.
            const marker = document.createTextNode("");
            parentNode.after(marker);
            var styledNode = this.removeStyleFromElement(splitIncludingNode, style);

            // If the original node was removed by this operation, set finalStyled to this node.
            if (!this.inEditor(node) && !finalStyled) {
                finalStyled = styledNode;
            }

            if (Array.from(styledNode.childNodes).every((e) => this.blockTags.includes(e.tagName))) {
                extraneousDivsToRemove.push(styledNode);
            }
            marker.after(styledNode, splitAfterNode);
            marker.remove();
            
            if (parentNode != this.editor && this.isEmpty(parentNode)) {
                // Remove the original node.
                parentNode.remove();
            }
            if (splitAfterNode != this.editor && this.isEmpty(splitAfterNode)) {
                // Remove the split after node.
                splitAfterNode.remove();
            }
            if (splitAfterNode.firstChild && this.isEmpty(splitAfterNode.firstChild)) {
                // Remove the split after node.
                splitAfterNode.firstChild.remove();
            }

            // Set node to be the newly styled node.
            node = styledNode;
        }

        // Remove the extraneous DIV nodes.
        for (const extraneousDiv of extraneousDivsToRemove) {
            if (finalStyled == extraneousDiv) {
                finalStyled = extraneousDiv.childNodes.length != 1 ? Array.from(extraneousDiv.childNodes) : extraneousDiv.firstChild;
            }
            extraneousDiv.after(...extraneousDiv.childNodes);
            extraneousDiv.remove();
        }

        return finalStyled;
    }

    /*
    Remove a block style from a range.
    */
    removeBlockStyle(style, range, removeAllParents = true) {
        this.shouldTakeSnapshotOnNextChange = true;

        if (this.editor.innerHTML == "") {
            return;
        }

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName)) {
            // If there are no children of this node, exit.
            if (startContainer.childNodes.length == 0) {
                break;
            }

            if (startOffset == startContainer.childNodes.length) {
                startContainer = startContainer.childNodes[startOffset - 1];
                startOffset = startContainer.nodeType == Node.ELEMENT_NODE ? startContainer.childNodes.length : startContainer.textContent.length;
            } else {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }
        }

        // Adjust the end point so that it is always relative to inline nodes.
        while (endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName)) {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                endContainer = endContainer.childNodes[endOffset];
                endOffset = 0;
            } else {
                endContainer = endContainer.childNodes[endOffset - 1];
                endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
            }
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range, true);
        
        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        // Style the nodes.
        var lastNodeNextSibling = null;
        var lastNode = null;
        for (const node of nodes) {
            // First, check if we should join the nodes. Don't join if the current node is a block node. This is purely for inline nodes that have been separated.
            const shouldJoin = lastNodeNextSibling && lastNode && lastNodeNextSibling == node && (!this.blockTags.includes(node.tagName));
            lastNodeNextSibling = node.nextSibling;

            const styledNode = this.removeBlockStyleOnNode(node, style, removeAllParents);

            // Join.
            if (shouldJoin && !(styledNode instanceof Array)) {
                lastNode.append(...styledNode.childNodes);
                styledNode.remove();
            } else {
                lastNode = (styledNode instanceof Array) ? null : styledNode;
            }
        }

        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Replace lists on a node.
    */
    replaceListsOnNode(node, oldType, newType) {
        // Search the children of the node for any node that match the style.
        const iterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT, (e) => e.tagName == oldType ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
        var child;
        const nodesToRemove = [];
        while (child = iterator.nextNode()) {
            if (child != this.editor) nodesToRemove.push(child);
        }

        var hasReplacedOriginalNode = false;
        var finalStyled = null;

        // Replace the styles on child nodes.
        for (const child of nodesToRemove) {
            // Remove the style.
            const marker = document.createTextNode("");
            child.after(marker);
            const styledNode = document.createElement(newType);
            styledNode.append(...child.childNodes);
            child.remove();

            // If the original node was removed by this operation, set finalStyled to this node.
            if (!this.inEditor(node) && !finalStyled) {
                finalStyled = styledNode;
                hasReplacedOriginalNode = true;
            }

            // Put the styled node back.
            marker.after(styledNode);
            marker.remove();
        }

        if (!hasReplacedOriginalNode) {
            // Escape to the closest list parent.
            const closestListParent = this.findClosestParent(node, n => n.tagName == "OL" || n.tagName == "UL");
            if (closestListParent) {
                node = closestListParent;

                const marker = document.createTextNode("");
                node.after(marker);
                const styledNode = document.createElement(newType);
                styledNode.append(...node.childNodes);
                node.remove();
                marker.after(styledNode);
                marker.remove();
            }
        }
    }

    /*
    Replace list styling on a range.
    */
    replaceListStyle(oldStyle, style, range) {
        this.shouldTakeSnapshotOnNextChange = true;

        if (this.editor.innerHTML == "") {
            return;
        }

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        // If the end offset is at the start of a node, move it up.
        if (endOffset == 0 && endContainer != this.editor) {
            while (endOffset == 0 && endContainer != this.editor) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer);
                endContainer = endContainer.parentNode;
            }
        }

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName)) {
            // If there are no children of this node, exit.
            if (startContainer.childNodes.length == 0) {
                break;
            }

            if (startOffset == startContainer.childNodes.length) {
                startContainer = startContainer.childNodes[startOffset - 1];
                startOffset = startContainer.nodeType == Node.ELEMENT_NODE ? startContainer.childNodes.length : startContainer.textContent.length;
            } else {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }
        }

        // Adjust the end point so that it is always relative to inline nodes.
        while (endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName)) {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                endContainer = endContainer.childNodes[endOffset];
                startOffset = 0;
            } else {
                endContainer = endContainer.childNodes[endOffset - 1];
                endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
            }
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range, true);
        
        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        // Style the nodes.
        oldStyle = oldStyle == "ordered" ? "OL" : "UL";
        style = style == "ordered" ? "OL" : "UL";
        for (const node of nodes) {
            this.replaceListsOnNode(node, oldStyle, style);
        }

        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Block indent a list of sibling nodes.
    */
    blockIndentSiblingNodes(siblings) {
        const parent = this.findClosestParent(siblings[0], (n) => n.nodeType == Node.ELEMENT_NODE && (["OL", "UL"].includes(n.tagName) || n.style.marginLeft.toLowerCase() == "40px"));
        var lastIndented = null;
        var firstIndented = null;
        if (siblings[0].tagName == "LI") {
            // Wrap list nodes.
            const newLi = document.createElement("li");
            siblings[0].before(newLi);
            const clone = parent.cloneNode(false);
            clone.append(...siblings);
            newLi.append(clone);
            if (!firstIndented) firstIndented = clone;
            lastIndented = clone;
        } else {
            const clone = parent ? parent.cloneNode(false) : document.createElement("div");
            if (clone.tagName == "DIV") {
                // Simple indentation.
                clone.style.marginLeft = "40px";
                const marker = document.createTextNode("");
                siblings[0].before(marker);
                const elements = [];
                while (siblings.length != 0) {
                    const node = siblings[0];
                    if (this.blockTags.includes(node.tagName)) {
                        // Block nodes go in their own LI node.
                        const newClone = clone.cloneNode(false);
                        newClone.append(node);
                        elements.push(newClone);
                        siblings.shift();
                    } else {
                        // Inline nodes get combined.
                        const newClone = clone.cloneNode(false);
                        newClone.append(node);
                        siblings.shift();
                        while (siblings.length != 0 && !this.blockTags.includes(siblings[0].tagName)) {
                            newClone.append(siblings.shift());
                        }
                        elements.push(newClone);
                    }
                }
                marker.before(...elements);
                // No need to store the first and last indented nodes.
            } else if (["OL", "UL"].includes(clone.tagName)) {
                // List indentation.
                siblings[0].before(clone);
                const list = [];
                while (siblings.length != 0) {
                    const node = siblings[0];
                    if (this.blockTags.includes(node.tagName)) {
                        // Block nodes go in their own LI node.
                        const newLi = document.createElement("li");
                        newLi.append(node);
                        list.push(newLi);
                        siblings.shift();
                    } else {
                        // Inline nodes get combined.
                        const newLi = document.createElement("li");
                        newLi.append(node);
                        siblings.shift();
                        while (siblings.length != 0 && !this.blockTags.includes(siblings[0].tagName)) {
                            newLi.append(siblings.shift());
                        }
                        list.push(newLi);
                    }
                }
                clone.append(...list);
                if (!firstIndented) firstIndented = clone;
                lastIndented = clone;
            }
        }

        // Join adjacent lists within a list.
        if (["OL", "UL"].includes(firstIndented.tagName) && 
            firstIndented.parentNode.tagName == "LI" && 
            firstIndented.parentNode.previousSibling && 
            firstIndented.parentNode.previousSibling.childNodes.length != 0 && 
            firstIndented.parentNode.previousSibling.childNodes[firstIndented.parentNode.previousSibling.childNodes.length - 1].tagName == firstIndented.tagName) {
            // If first indented is the same as last indented, joining will mess up this process. 
            if (firstIndented == lastIndented) {
                lastIndented = firstIndented.parentNode.previousSibling.childNodes[firstIndented.parentNode.previousSibling.childNodes.length - 1];
            }

            // Join.
            firstIndented.parentNode.previousSibling.childNodes[firstIndented.parentNode.previousSibling.childNodes.length - 1].append(...firstIndented.childNodes);

            // Remove the original node. If possible, remove its parent as well.
            const firstIndentedParent = firstIndented.parentNode;
            firstIndented.remove();
            if (firstIndentedParent.childNodes.length == 0) {
                firstIndentedParent.remove();
            }
        }

        return lastIndented;
    }

    /*
    Block indent a range.
    */
    blockIndent(range) {
        this.saveHistory();
        this.shouldTakeSnapshotOnNextChange = true;

        if (this.editor.innerHTML == "") {
            this.editor.append(document.createElement("br"));
            range = this.getRange();
        }

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName)) {
            // If there are no children of this node, exit.
            if (startContainer.childNodes.length == 0) {
                break;
            }

            if (startOffset == startContainer.childNodes.length) {
                startContainer = startContainer.childNodes[startOffset - 1];
                startOffset = startContainer.nodeType == Node.ELEMENT_NODE ? startContainer.childNodes.length : startContainer.textContent.length;
            } else {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }
        }

        // Adjust the end point so that it is always relative to inline nodes.
        while (endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName)) {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                endContainer = endContainer.childNodes[endOffset];
                endOffset = 0;
            } else {
                endContainer = endContainer.childNodes[endOffset - 1];
                endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
            }
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);
        
        // Get the block nodes within the range.
        var nodes = this.getBlockNodesInRange(blockExtended);

        // Fix disallowed children.
        const fixedNodes = [];
        function fixDisallowedChildrenOfNode(node) {
            // If the current node is not a OL/UL element but contains a OL/UL, go inside.
            if (node.nodeType == Node.ELEMENT_NODE && (node == this.editor || (node.querySelector("ol, ul")))) {
                // Append the children instead.
                for (const child of node.childNodes) {
                    fixDisallowedChildrenOfNode(child);
                }
            } else {
                // Append the node.
                fixedNodes.push(node);
            }
        }
        fixDisallowedChildrenOfNode = fixDisallowedChildrenOfNode.bind(this);
        for (const node of nodes) {
            fixDisallowedChildrenOfNode(node);
        }

        // Style the nodes.
        nodes = fixedNodes.reverse();
        var firstIndented = null; // Store the first and last indented nodes so that we can join adjacent lists.
        var lastIndented = null;
        while (nodes.length != 0) {
            const siblings = [nodes.pop()];
            while (nodes.length != 0 && siblings[siblings.length - 1].nextSibling == nodes[nodes.length - 1]) {
                siblings.push(nodes.pop());
            }

            lastIndented = this.blockIndentSiblingNodes(siblings);
        }

        // Join the last list rightwards.
        if (["OL", "UL"].includes(lastIndented.tagName) && 
            lastIndented.parentNode.tagName == "LI" && 
            lastIndented.parentNode.nextSibling && 
            lastIndented.parentNode.nextSibling.childNodes.length != 0 && 
            lastIndented.parentNode.nextSibling.childNodes[0].tagName == lastIndented.tagName) {
            // Join.
            lastIndented.parentNode.nextSibling.childNodes[0].prepend(...lastIndented.childNodes);

            // Remove the original node. If possible, remove its parent as well.
            const lastIndentedParent = lastIndented.parentNode;
            lastIndented.remove();
            if (lastIndentedParent.childNodes.length == 0) {
                lastIndentedParent.remove();
            }
        }

        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Block outdent a range.
    */
    blockOutdent(range) {
        if (this.editor.innerHTML == "") {
            return;
        }

        this.saveHistory();
        this.shouldTakeSnapshotOnNextChange = true;

        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName)) {
            // If there are no children of this node, exit.
            if (startContainer.childNodes.length == 0) {
                break;
            }

            if (startOffset == startContainer.childNodes.length) {
                startContainer = startContainer.childNodes[startOffset - 1];
                startOffset = startContainer.nodeType == Node.ELEMENT_NODE ? startContainer.childNodes.length : startContainer.textContent.length;
            } else {
                startContainer = startContainer.childNodes[startOffset];
                startOffset = 0;
            }
        }

        // Adjust the end point so that it is always relative to inline nodes.
        while (endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName)) {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                endContainer = endContainer.childNodes[endOffset];
                endOffset = 0;
            } else {
                endContainer = endContainer.childNodes[endOffset - 1];
                endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
            }
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);
        
        // Get the block nodes within the range.
        var nodes = this.getBlockNodesInRange(blockExtended);
    }

    /*
    Perform a style command.
    */
    performStyleCommand(style) {
        // Get the current styling of the selected range.
        const range = this.getRange();
        if (range == null) {
            return;
        }
        const currentStyling = this.detectStyling(range);

        // Set the style.
        if (this.multipleValueStylingCommands.includes(style.type)) {
            if ((style.type == "foreColor" || style.type == "backColor") && style.color == null) {
                // Remove the styling.
                this.removeStyle(style, range);
            } else {
                this.changeStyling(style, range);
            }
        } else if (this.inlineStylingCommands.includes(style.type)) {
            if (currentStyling.some(s => s.type == style.type)) {
                this.removeStyle(style, range);
            } else {
                // Subscript and superscript are mutually exclusive.
                if (style.type == "sup" || style.type == "sub") {
                    const oppositeScriptStyle = style.type == "sub" ? "sup" : "sub";
                    this.removeStyle({type: oppositeScriptStyle}, range);
                    this.applyStyle(style, this.getRange());
                } else {
                    this.applyStyle(style, range);
                }
            }
        } else if (this.blockStylingCommands.includes(style.type)) {
            switch (style.type) {
                case "quote":
                    // We need to save history now since there might be multiple calls to removeBlockStyle or applyBlockStyle.
                    this.saveHistory();
                    if (currentStyling.some(s => s.type == style.type)) {
                        this.removeBlockStyle(style, range);
                    } else {
                        this.applyBlockStyle(style, range);
                    }
                    break;
                case "header":
                    // We need to save history now since there might be multiple calls to removeBlockStyle or applyBlockStyle.
                    this.saveHistory();
                    if (style.level == "Paragraph") {
                        const currentHeaderStyle = currentStyling.find(s => s.type == "header");
                        if (currentHeaderStyle) {
                            this.removeBlockStyle(currentHeaderStyle, range);
                        }
                    } else {
                        // Remove the other header styling first.
                        const currentHeaderStyle = currentStyling.find(s => s.type == "header");
                        if (currentHeaderStyle) {
                            this.removeBlockStyle(currentHeaderStyle, range);
                        }
                        const newRange = this.getRange();
                        this.applyBlockStyle(style, newRange);
                    }
                    break;
                case "align":
                    // We need to save history now since there might be multiple calls to removeBlockStyle or applyBlockStyle.
                    this.saveHistory();
                    if (style.direction == "left") {
                        const currentAlignStyle = currentStyling.find(s => s.type == "align");
                        if (currentAlignStyle) {
                            this.removeBlockStyle(currentAlignStyle, range);
                        }
                    } else {
                        // Remove the other align styling first.
                        const currentAlignStyle = currentStyling.find(s => s.type == "align");
                        if (currentAlignStyle) {
                            this.removeBlockStyle(currentAlignStyle, range);
                        }
                        const newRange = this.getRange();
                        this.applyBlockStyle(style, newRange);
                    }
                    break;
                case "list":
                    // We need to save history now since there might be multiple calls to removeBlockStyle or applyBlockStyle.
                    this.saveHistory();
                    if (style.listType == "ordered") {
                        const currentListStyle = currentStyling.find(s => s.type == "list" && s.listType == "ordered");
                        const oppositeListStyle = currentStyling.find(s => s.type == "list" && s.listType == "unordered");
                        if (currentListStyle) {
                            this.removeBlockStyle(currentListStyle, range);
                        } else if (oppositeListStyle) {
                            this.replaceListStyle("unordered", "ordered", range)
                        } else {
                            this.applyBlockStyle(style, range);
                        }
                    } else if (style.listType == "unordered") {
                        const currentListStyle = currentStyling.find(s => s.type == "list" && s.listType == "unordered");
                        const oppositeListStyle = currentStyling.find(s => s.type == "list" && s.listType == "ordered");
                        if (currentListStyle) {
                            this.removeBlockStyle(currentListStyle, range);
                        } else if (oppositeListStyle) {
                            this.replaceListStyle("ordered", "unordered", range)
                        } else {
                            this.applyBlockStyle(style, range);
                        }
                    }
                    break;
                case "indent":
                    this.blockIndent(range);
                    break;
                case "outdent":
                    this.blockOutdent(range);
                    break;
            }
        }

        // Call the selection change event.
        this.onChangeSelect();
    }

    /*
    Bold.
    */
    bold() {
        this.performStyleCommand({type: "bold"});
    }

    /*
    Italic.
    */
    italic() {
        this.performStyleCommand({type: "italic"});
    }

    /*
    Underline.
    */
    underline() {
        this.performStyleCommand({type: "underline"});
    }

    /*
    Strikethrough.
    */
    strikethrough() {
        this.performStyleCommand({type: "strikethrough"});
    }

    /*
    Font change.
    */
    font() {
        this.performStyleCommand({type: "font", family: this.menubarOptions.font.value});
    }

    /*
    Foreground color.
    */
    foreColor(color) {
        this.performStyleCommand({type: "foreColor", color: color});
        if (color != null) this.menubarOptions.foreColor.colorInput.getElementsByClassName("editor-menubar-option-fore-color-button")[0].style.textDecorationColor = color;
    }

    /*
    Background color.
    */
    backColor(color) {
        this.performStyleCommand({type: "backColor", color: color});
        if (color != null) this.menubarOptions.backColor.colorInput.getElementsByClassName("editor-menubar-option-back-color-button")[0].style.textDecorationColor = color;
    }

    /*
    Superscript.
    */
    sup() {
        this.performStyleCommand({type: "sup"});
    }

    /*
    Subscript.
    */
    sub() {
        this.performStyleCommand({type: "sub"});
    }

    /*
    Font size.
    */
    size() {
        this.performStyleCommand({type: "size", size: this.menubarOptions.size.value});
    }

    /*
    Blockquote.
    */
    quote() {
        this.performStyleCommand({type: "quote"});
    }

    /*
    Header.
    */
    header() {
        this.performStyleCommand({type: "header", level: this.menubarOptions.header.value});
    }

    /*
    Text align.
    */
    align() {
        this.performStyleCommand({type: "align", direction: this.menubarOptions.align.value});
    }

    /*
    Ordered list.
    */
    listOrdered() {
        this.performStyleCommand({type: "list", listType: "ordered"});
    }

    /*
    Unordered list.
    */
    listUnordered() {
        this.performStyleCommand({type: "list", listType: "unordered"});
    }

    /*
    Indent.
    */
    indent() {
        this.performStyleCommand({type: "indent"});
    }

    /*
    Outdent.
    */
    outdent() {
        this.performStyleCommand({type: "outdent"});
    }

    /*
    Serialize a node's contents to a object.
    */
    serializeContents(node) {
        const serialized = [];
        for (const child of node.childNodes) {
            if (child.nodeType == Node.TEXT_NODE) {
                serialized.push(child.textContent);
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                const attrs = {};
                for (var i = 0; i < child.attributes.length; i++) {
                    attrs[child.attributes[i].name] = child.attributes[i].value;
                }
                serialized.push({tag: child.tagName, children: this.serializeContents(child), attrs: attrs});
            }
        }
        return serialized;
    }

    /*
    Deserialize a serialized node object to a node.
    */
    deserializeContents(obj, node) {
        for (const elem of obj) {
            if (typeof elem == "string" || elem instanceof String) {
                // Text node.
                node.append(document.createTextNode(elem));
            } else {
                // Element.
                const newElem = document.createElement(elem.tag);
                for (const attr in elem.attrs) {
                    newElem.setAttribute(attr, elem.attrs[attr]);
                }
                this.deserializeContents(elem.children, newElem);
                node.append(newElem);
            }
        }
    }

    /*
    Serialize a range in the editor.
    */
    serializeRange(range) {
        // Serialize a node by traversing upwards and tracing a path to the node.
        function serializeNodePoint(node) {
            // Go up the node tree until we get to the common parent.
            var currentNode = node;
            const path = [];
            while (this.inEditor(currentNode) && currentNode != this.editor) {
                path.push(Array.from(currentNode.parentNode.childNodes).indexOf(currentNode));
                currentNode = currentNode.parentNode;
            }
            return path;
        }
        serializeNodePoint = serializeNodePoint.bind(this);
        const startContainerPath = serializeNodePoint(range.startContainer);
        const endContainerPath = serializeNodePoint(range.endContainer);
        return {startContainer: startContainerPath, 
            startOffset: range.startOffset,
            endContainer: endContainerPath,
            endOffset: range.endOffset};
    }

    /*
    Deserialize a range in the editor.
    */
    deserializeRange(serializedRange) {
        const newRange = new Range();
        function findNode(nodePath) {
            // Traverse the node point array and find the target node.
            var currentChild = this.editor;
            while (nodePath.length != 0) {
                currentChild = currentChild.childNodes[nodePath[nodePath.length - 1]];
                nodePath.pop();
            }
            return currentChild;
        }
        findNode = findNode.bind(this);
        const startNode = findNode(serializedRange.startContainer);
        const endNode = findNode(serializedRange.endContainer);
        newRange.setStart(startNode, serializedRange.startOffset);
        newRange.setEnd(endNode, serializedRange.endOffset);
        return newRange;
    }

    /*
    Take a snapshot of the editor.
    */
    snapshot() {
        const content = this.editor.cloneNode(true);
        var range = null;
        if (window.getSelection().rangeCount != 0) {
            const selRange = this.getRange();
            if (selRange && this.inEditor(selRange.commonAncestorContainer)) {
                range = this.serializeRange(selRange, this.editor);
            }
        }
        return {content: content, range: range, hash: this.hash(this.editor.innerHTML)};
    }

    /*
    Save a snapshot of the editor to history.
    */
    saveHistory() {
        if (this.hash(this.editor.innerHTML) == this.history[this.history.length - 1]?.hash) {
            this.history.pop();
        }

        if (this.history.length >= this.historyLimit) {
            this.history.shift();
        }

        const snap = this.snapshot();
        this.history.push(snap);
    }

    /*
    Undo.
    */
    undo() {
        var snap = this.history.pop();

        // If the undo snapshot is the same as the current content, ignore it.
        if (snap.hash == this.hash(this.editor.innerHTML) && this.history.length != 0) {
            snap = this.history.pop();
        }

        // Save to redo history.
        this.redoHistory.push(this.snapshot());

        // Replace the content of the editor with the snapshot.
        this.editor.innerHTML = "";
        this.editor.append(...snap.content.childNodes);
        if (snap.range != null) {
            const range = this.deserializeRange(snap.range, this.editor);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        }
        if (this.editor.getElementsByClassName("editor-temp-cursor").length != 0) {
            this.currentCursor = this.editor.getElementsByClassName("editor-temp-cursor")[0];
        }

        if (this.history.length == 0) {
            this.saveHistory();
        }
    }

    /*
    Redo.
    */
    redo() {
        if (this.redoHistory.length == 0) {
            return;
        }

        var snap = this.redoHistory.pop();
        this.saveHistory();

        // If the undo snapshot is the same as the current content, ignore it.
        if (snap.hash == this.hash(this.editor.innerHTML)) {
            snap = this.redoHistory.pop();
        }

        // Replace the content of the editor with the snapshot.
        this.editor.innerHTML = "";
        this.editor.append(...snap.content.childNodes);
        if (snap.range != null) {
            const range = this.deserializeRange(snap.range, editor);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        }
        if (this.editor.getElementsByClassName("editor-temp-cursor").length != 0) {
            this.currentCursor = this.editor.getElementsByClassName("editor-temp-cursor")[0];
        }
    }

    /* 
    Initialize the editor. Must be called before using the editor. 
    */
    init() {
        // Initialize history.
        this.history = [];
        this.redoHistory = [];
        this.shouldTakeSnapshotOnNextChange = false;

        // Initialize the global range cache variable.
        this.rangeCache = null;

        // Clear the container.
        this.container.innerHTML = "";

        // Create menubar.
        this.createMenubar();

        // Insert the content editable div.
        this.editor = document.createElement("div");
        this.editor.setAttribute("id", "editor-body");
        this.editor.setAttribute("contenteditable", "true");
        this.container.append(this.editor);

        this.saveHistory();

        // Apply min/max height.
        this.applySizeStyles();

        // Apply default font.
        this.applyDefaultFont();

        // Apply default size.
        this.applyDefaultSize();

        // Bind event listeners for keyboard events.
        this.bindKeyboardEvents();

        // Bind event listeners for input events.
        this.bindInputEvents();

        // Bind event listeners for select event.
        this.bindSelectEvents();

        // Bind event listeners for paste event.
        this.bindPasteEvents();

        // Bind event listeners for drag event.
        this.bindDragEvents();

        // Bind event listeners for clicks outside of the editor.
        this.bindExternalClickEvents();

        // Bind save history interval.
        this.bindSaveHistoryInterval();
    }
}
