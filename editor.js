/* editor.js - A simple, lightweight rich text editor written in vanilla JavaScript. */

/* 
The rich text editor class. 
*/
class Editor {
    /* 
    Editor constants. 
    */
    ascii = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
    invisible = "&#8290"; // Insert this into spans so that the cursor will latch to it.

    contentTags = ["IMG", "BR"];
    stylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"];
    inlineStylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT"];
    basicAllowedTags = ["DIV", "BR", "P", "IMG", "A", "LI", "UL", "OL", "BLOCKQUOTE"];
    blockTags = ["BR", "DIV", "P", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"];
    childlessTags = ["BR", "IMG"];

    inlineStylingCommands = ["bold", "italic", "underline", "strikethrough", "font"];
    blockStylingCommands = ["quote", "header", "align"];

    /* 
    Create the editor. 
    */
    constructor(element, settings) {
        this.container = element;
        this.settings = settings;

        this.commands = ["bold", "italic", "underline", "strikethrough", "font", "quote", "header", "align"] || settings.commands;
        this.snapshotInterval = 5000 || settings.snapshotInterval;
        this.historyLimit = 50 || settings.historyLimit;
        this.supportedFonts = ["Arial", "Times New Roman", "monospace", "Helvetica"] || settings.supportedFonts;
        this.defaultFont = "Arial" || settings.defaultFont;

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
    Create the menubar.
    */
    createMenubar() {
        this.menubar = document.createElement("div");
        this.menubar.setAttribute("id", "editor-menubar");
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
                    this.menubarOptions.font.addEventListener("change", this.font.bind(this));
                    this.menubar.append(this.menubarOptions.font);
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
                    while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode)) {
                        currentNode = currentNode.parentNode;
                    }
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
                    if ((range.startOffset == 0 && range.endOffset >= endLength) 
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

                        // Delete the node.
                        range.commonAncestorContainer.textContent = "";

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

                        // Insert the node at the current range and place the caret inside the cursor.
                        if (range.startContainer.nodeType == Node.TEXT_NODE) {
                            // Split the text node.
                            range.startContainer.after(lastNode);
                        } else {
                            // Place the node inside.
                            if (range.startOffset == 0) {
                                if (!this.childlessTags.includes(range.startContainer.tagName)) {
                                    range.startContainer.prepend(lastNode);
                                } else {
                                    range.startContainer.before(lastNode);
                                }
                            } else {
                                range.startContainer.childNodes[range.startOffset - 1].after(lastNode);
                            }
                        }
                        const newRange = new Range();
                        newRange.selectNodeContents(cursor);
                        newRange.collapse();
                        document.getSelection().removeAllRanges();
                        document.getSelection().addRange(newRange);
                    }
                }
            }

            if (this.ascii.includes(e.key) && !e.ctrlKey && !e.metaKey) {
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
                    cursor.before(document.createTextNode(e.key));
                    cursor.remove();
                    this.currentCursor = null;
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
    reconstructNodeContents(node, parent, removeExtraneousWhitespace = true) {
        const reconstructed = [];

        // Reconstruct each of the children.
        for (var child of Array.from(node.childNodes)) {
            if (child.nodeType == Node.TEXT_NODE) {
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
                    child.textContent = child.textContent.split("\n").join("").split("\r").join("");

                    // Reconstruct the styling.
                    child = this.addStylingToNode(child, styling);

                    // Append the newly reconstructed node.
                    reconstructed.push(child);
                } else {
                    // Replace all line breaks with break nodes.
                    const lines = child.textContent.split(/\r?\n|\r|\n/g);

                    reconstructed.push(this.addStylingToNode(document.createTextNode(lines[0]), styling));
                    for (const line of lines.slice(1)) {
                        reconstructed.push(document.createElement("br"), this.addStylingToNode(document.createTextNode(line), styling));
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

                // If this tag is a styling/illegal tag, ignore it but parse its children.
                if (!this.basicAllowedTags.includes(child.tagName)) {
                    // Reconstruct the node's children.
                    const reconstructedChildren = this.reconstructNodeContents(child, parent, removeExtraneousWhitespaceOnChildren);

                    // Append the newly reconstructed nodes.
                    reconstructed.push(...reconstructedChildren);
                    continue;
                }

                // Clone the node without any attributes.
                const newNode = document.createElement(child.tagName);

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
                const reconstructedChildren = this.reconstructNodeContents(child, parent, removeExtraneousWhitespaceOnChildren);
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
        const reconstructed = this.reconstructNodeContents(original, original);

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

        return withoutWhitespace;
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
                        if (this.isEmpty(lowestJoinable)) {
                            currentLastNode = children.length != 0 ? children[children.length - 1] : currentLastNode;
                            lowestJoinable.innerHTML = "";
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
                            range.startContainer.before(emptyTextNode);
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
            // Notify the editor that we are starting a drag, 
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
                        range = document.createRange()
                        range.setStart(position.offsetNode, position.offset)
                        range.setEnd(position.offsetNode, position.offset)
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

                const rangeToRemove = this.getRange();
                const emptyTextNode = document.createTextNode("");
                if (rangeToRemove != null) {
                    // Split the start container at the start offset.
                    if (range.startContainer.nodeType == Node.TEXT_NODE) {
                        // Note that the range to remove will never overlap the range to add into.
                        if (rangeToRemove.startContainer == range.startContainer) {
                            if (rangeToRemove.startOffset >= sliceOffset) {
                                
                            } else if (rangeToRemove.startOffset < sliceOffset) {

                            }
                        }
                        if (rangeToRemove.startContainer == range.startContainer.parentNode) {

                        }

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
                    rangeToRemove.deleteContents();
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
        const range = this.getRange();
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
        });
        this.editor.addEventListener("focusout", function (e) {
            onChangeSelect();
            document.removeEventListener("selectionchange", onChangeSelect);
        });
    }
    
    /*
    Bind save history interval.
    */
    bindSaveHistoryInterval() {
        setInterval(function() {
            // Take periodic history snapshots.
            if (this.hash(this.editor.innerHTML) != this.history[this.history.length - 1].hash) {
                this.saveHistory();
            }
        }.bind(this), this.snapshotInterval);
    }

    /* 
    Check if a node is in the editor.
    */
    inEditor(node) {
        return this.editor.contains(node);
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
            return null;
        }
        
        // Something is selected.
        const range = selection.getRangeAt(0);
        if (selection.containsNode(this.editor) || this.editor.contains(range.commonAncestorContainer)) {
            return range;
        } else if (this.rangeCache) {
            return this.rangeCache;
        }
        return null;
    }

    /* 
    Get an array of all the text nodes within a range. Returns the newly calculated start and end offsets.
    */
    getTextNodesInRange(range) {
        if (range == null) {
            return null;
        }
        const nodes = [];
        var currentNode = range.startContainer;
        var startOffset = range.startOffset;
        var endOffset = range.endOffset;
    
        // If the first node is not a text node, move the start node to the start offset.
        if (range.startContainer.nodeType != Node.TEXT_NODE) {
            currentNode = currentNode.childNodes[range.startOffset] ? currentNode.childNodes[range.startOffset] : currentNode;
            startOffset = 0;
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
            case "quote":
                return document.createElement("blockquote");
            case "header":
                return document.createElement(style.level);
            case "align":
                var elem = document.createElement("div");
                elem.style.textAlign = style.direction;
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
                    var family = node.getAttribute("face");
                    family = family.replace("\"", "").replace("\"", "");
                    family = family.replace("'", "").replace("'", "");
                    styling.push({type: "font", family: family});
                }
                // TODO: color, text size, etc
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
            family = family.split("\"").join("");
            family = family.split("'").join("");
            if (!styling.some(s => s.type == "font")) styling.push({type: "font", family: family});
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
        for (const node of nodes) {
            // If the node is empty, don't count it.
            if (node.nodeType == Node.TEXT_NODE && node.textContent.replace(this.invisibleParsed, "") == "" && nodes.length > 1) {
                continue;
            }

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
            
            if (firstNode) {
                // If this is the first node being tracked, add its styles to the styling.
                styling.push(...nodeStyling);

                firstNode = false;
            } else {
                // If this is not, check that each of the current styles is included in this element's styling.
                for (const style of styling.slice(0, styling.length)) {
                    if (!nodeStyling.some(s => this.compareStyling(s, style))) {
                        // If the styling is not the same, remove the styling from the list.
                        styling.splice(styling.findIndex(s => s.type == style.type), 1);
                    }
                }
            }
        }

        // Add the default font styling.
        if (nodes.length == 0 && !styling.some(s => s.type == "font")) {
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
        if (this.blockTags.includes(node.tagName) && this.blockStylingCommands.includes(style.type)) {
            newElem.append(...node.childNodes);

            // If the node does not have styling, don't add it.
            if (node.getAttribute("style") || this.stylingTags.includes(node.tagName)) {
                node.append(newElem);
                console.log("newelem:", newElem.cloneNode(true));
                return newElem;
            } else {
                node.replaceWith(newElem);
                console.log("newElem:", newElem.cloneNode(true))
                return newElem;
            }
        } else {
            const marker = document.createTextNode("");
            node.after(marker);
            newElem.appendChild(node);
            marker.replaceWith(newElem);
            return newElem;
        }
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
    Split a node at a child. Returns the split node after the child.
    */
    splitNodeAtChild(parent, child, includeSelf = false) {
        var currentNode = child;
        var currentSplitNode = null;
        while (parent.contains(currentNode) && parent != currentNode) {
            // Get all the nodes after the current node.
            const siblings = Array.from(currentNode.parentNode.childNodes);
            if (includeSelf && currentSplitNode == null) {
                // If this is the first iteration, and we want to include the child, slice it with the child.
                var nodesAfterCurrentNode = siblings.slice(siblings.indexOf(currentNode), siblings.length);
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

            // Traverse up the tree.
            currentNode = currentNode.parentNode;
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
                        elem.style.textAlign = "";
                    }
                    break;
                case "quote":
                    if (elem.tagName == "BLOCKQUOTE") {
                        const temp = document.createElement("div");
                        temp.append(...elem.childNodes);
                        temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                        elem = temp;
                        elemRemoved = true;
                    }
                    break;
                case "header":
                    if (elem.tagName == style.level) {
                        const temp = document.createElement("div");
                        temp.append(...elem.childNodes);
                        temp.setAttribute("style", elem.getAttribute("style") ? elem.getAttribute("style") : "");
                        elem = temp;
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
                        } else if (currentReconstructedNode.tagName == "SPAN") {
                            currentReconstructedNode.style.fontFamily = style.family;
                        }
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
    Find the closest block node on the left side of a child.
    */
    findClosestBlockOnLeft(parent, child) {
        // Traverse left and find the closest block node (if it exists) within the parent node.
        // This returns null if it doesn't find a block node within the parent. 
        var currentNode = child;

        while (parent.contains(currentNode) && currentNode != parent) {
            // First, check if the current node is a block node (not including BR nodes).
            if (this.blockTags.filter(s => s != "BR").includes(currentNode.tagName) && !this.isEmpty(currentNode)) {
                // Found a block node.
                return currentNode;
            }

            // Traverse leftwards.
            while (!currentNode.previousSibling) {
                currentNode = currentNode.parentNode;
                if (!parent.contains(currentNode)) {
                    return null;
                }
            }
            currentNode = currentNode.previousSibling;
        }

        return null;
    }

    /*
    Find the closest block node on the right side of a child.
    */
    findClosestBlockOnRight(parent, child) {
        // Traverse right and find the closest block node (if it exists) within the parent node.
        // This returns null if it doesn't find a block node within the parent. 
        var currentNode = child;

        while (parent.contains(currentNode) && currentNode != parent) {
            // First, check if the current node is a block node (not including BR nodes).
            if (this.blockTags.filter(s => s != "BR").includes(currentNode.tagName) && !this.isEmpty(currentNode)) {
                // Found a block node.
                return currentNode;
            }

            // Traverse rightwards.
            while (!currentNode.nextSibling) {
                currentNode = currentNode.parentNode;
                if (!parent.contains(currentNode)) {
                    return null;
                }
            }
            currentNode = currentNode.nextSibling;
        }

        return null;
    }

    /*
    Find the topmost block node. If escape is not null, it should be a predicate function that determines whether or not to escape from a node.
    */
    findTopmostBlock(child, escape = null) {
        // Traverse up the node tree until the lowest valid (i.e. not contained within an escape tag) block node is reached.
        var currentNode = child;
        var blockNode = null;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (this.blockTags.filter(s => s != "BR").includes(currentNode.tagName)) {
                // Found a block node.
                if (escape) {
                    if (escape(currentNode)) {
                        blockNode = null;
                    } else {
                        if (blockNode == null) {
                            console.log("BN IS NULL?")
                            blockNode = currentNode;
                        } else if (currentNode.tagName == "DIV" || currentNode.tagName == "P") {
                            // Escape extraneous nodes.
                            blockNode = currentNode;
                        }
                    }
                } else {
                    if (blockNode == null) {
                        blockNode = currentNode;
                    } else if (currentNode.tagName == "DIV" || currentNode.tagName == "P") {
                        // Escape extraneous nodes.
                        blockNode = currentNode;
                    }
                }
            }
            currentNode = currentNode.parentNode;
        }
        console.log("blocnOd", blockNode.cloneNode(true))
        return blockNode;
    }

    /*
    Get and isolate the block associated with a text node.
    */
    getAndIsolateBlockNode(textNode, escape = null) {
        const blockNode = this.findTopmostBlock(textNode, escape);

        // Split the node.
        if (blockNode) {
            // Get the block nodes on the left and right, with respect to the parent block.
            var leftBlock = this.findClosestBlockOnLeft(blockNode, textNode);
            var rightBlock = this.findClosestBlockOnRight(blockNode, textNode);
            console.log(leftBlock.cloneNode(true), rightBlock.cloneNode(true))

            // Split the parent block at the left block.
            if (leftBlock) {
                var splitAfterLeft = this.splitNodeAtChild(blockNode, leftBlock);
                blockNode.after(splitAfterLeft);
            } else {
                var splitAfterLeft = blockNode;
            }

            // Split the newly split node at the right block.
            if (rightBlock) {
                var splitAfterRight = this.splitNodeAtChild(splitAfterLeft, rightBlock, true);
                splitAfterLeft.after(splitAfterRight);
            } else {
                var splitAfterRight = splitAfterLeft;
            }
            return splitAfterLeft;
        } else {
            // Get the block nodes on the left and right, with respect to the editor.
            var leftBlock = this.findClosestBlockOnLeft(this.editor, textNode);
            var rightBlock = this.findClosestBlockOnRight(this.editor, textNode);

            // Split the parent block at the left block.
            if (leftBlock) {
                var splitAfterLeft = this.splitNodeAtChild(this.editor, leftBlock);
            } else {
                var splitAfterLeft = this.editor;
            }

            // Split the newly split node at the right block.
            if (rightBlock) {
                var splitAfterRight = this.splitNodeAtChild(splitAfterLeft, rightBlock, true);
            } else {
                var splitAfterRight = null;
            }

            // Place the left block in its own DIV and add it.
            const newDiv = document.createElement("div");
            newDiv.append(...splitAfterLeft.childNodes);
            this.editor.append(newDiv);

            // If there is content after the split block, add it.            
            if (splitAfterRight) this.editor.append(...splitAfterRight.childNodes);

            return newDiv;
        }
    }

    /*
    -- NOTES -- 
    RULES:
    - H1-H6 are mutually exclusive
    - UL and OL are mutually exclusive
    - UL, OL, and BLOCKQUOTE join
    - Order of nodes (outermost to innermost): BLOCKQUOTE/LISTS (any order) -> H1-H6 -> styling nodes -> text nodes
    PASTING:
    - Track current styles on each node, and only allow one of each type of style to be added
    - Only apply inline styles
    */

    /*
    Apply a block style to a range.
    */
    applyBlockStyle(style, range, join = false) {
        var nodes, startOffset, endOffset;
        
        // Get the text nodes within the range.
        const output = this.getTextNodesInRange(range);
        if (!output) {
            return;
        }
        [{nodes, startOffset, endOffset} = output];

        this.saveHistory();
        this.shouldTakeSnapshotOnNextChange = true;

        if (nodes.length == 0) {
            if (!this.inEditor(range.commonAncestorContainer)) {
                return;
            }

            // Create a new BR node.
            const node = document.createElement("br");
            this.editor.append(node);
            nodes.push(node);
            startOffset = 0;
            endOffset = 0;
        }

        // Place each node in between in a new tag.
        if (!join) {
            const escape = (style.type == "quote" || style.type == "list" || style.type == "align") ? (e => ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName) || (e.style && e.style.textAlign)) : null; // Escape out of headers.
            for (const node of nodes) {
                const block = this.getAndIsolateBlockNode(node, escape);
                const styledBlock = this.applyStyleToNode(block, style);
            }
        } else {
            var lastJoined = null;
            const escape = (style.type == "quote" || style.type == "list" || style.type == "align") ? (e => ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName) || (e.style && e.style.textAlign)) : null; // Escape out of headers.
            for (const node of nodes) {
                if (lastJoined && lastJoined.contains(node)) {
                    // Don't re-style already styled text nodes.
                    continue;
                }

                const block = this.getAndIsolateBlockNode(node, escape);
                const styledBlock = this.applyStyleToNode(block, style);
                console.log(block.cloneNode(true), styledBlock.cloneNode(true))
                if (lastJoined && lastJoined.nextSibling == styledBlock) {
                    console.log(lastJoined, styledBlock);
                    // Join the current node and the last joined node.
                    const newDiv = document.createElement("div");
                    newDiv.append(...styledBlock.childNodes);
                    lastJoined.append(newDiv);
                    styledBlock.remove();
                } else {
                    lastJoined = styledBlock;
                }
            }
        }

        // Select the new nodes.
        const newRange = new Range();
        newRange.setStart(nodes[0], startOffset);
        newRange.setEnd(nodes[nodes.length - 1], endOffset);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(newRange);
    }

    /*
    Remove a block style from a range.
    */
    removeBlockStyle(style, range) {
        var nodes, startOffset, endOffset;
        
        // Get the text nodes within the range.
        const output = this.getTextNodesInRange(range);
        if (!output) {
            return;
        }
        [{nodes, startOffset, endOffset} = output];

        if (nodes.length == 0) {
            if (!this.inEditor(range.commonAncestorContainer)) {
                return;
            }

            // Create a new BR node.
            const node = document.createElement("br");
            this.editor.append(node);
            nodes.push(node);
            startOffset = 0;
            endOffset = 0;
        }

        // Place each node in between in a new tag.
        for (const node of nodes) {
            const block = this.getAndIsolateBlockNode(node);
            const styledBlock = this.removeStyleOnNode(block, style);
        }

        this.saveHistory();
        this.shouldTakeSnapshotOnNextChange = true;

        // Select the new nodes.
        const newRange = new Range();
        newRange.setStart(nodes[0], startOffset);
        newRange.setEnd(nodes[nodes.length - 1], endOffset);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(newRange);
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
        if (style.type == "font") {
            this.changeStyling(style, range);
        } else if (this.inlineStylingCommands.includes(style.type)) {
            if (currentStyling.some(s => s.type == style.type)) {
                this.removeStyle(style, range);
            } else {
                this.applyStyle(style, range);
            }
        } else if (this.blockStylingCommands.includes(style.type)) {
            const join = ["quote"].includes(style.type);
            switch (style.type) {
                case "quote":
                    if (currentStyling.some(s => s.type == style.type)) {
                        this.removeBlockStyle(style, range);
                    } else {
                        this.applyBlockStyle(style, range, join);
                    }
                    break;
                case "header":
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
                    if (style.direction == "left") {
                        const currentAlignStyle = currentStyling.find(s => s.type == "align");
                        if (currentAlignStyle) {
                            this.removeBlockStyle(currentAlignStyle, range);
                        }
                    } else {
                        // Remove the other header styling first.
                        const currentAlignStyle = currentStyling.find(s => s.type == "align");
                        if (currentAlignStyle) {
                            this.removeBlockStyle(currentAlignStyle, range);
                        }
                        const newRange = this.getRange();
                        this.applyBlockStyle(style, newRange);
                    }
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
            return;
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

        // Bind save history interval.
        this.bindSaveHistoryInterval();
    }
}
