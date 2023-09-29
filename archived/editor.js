/* editor.js - A simple, lightweight rich text editor written in vanilla JavaScript. */

/* 
Check if a node is a span.
*/
function isSpan(node) {
    return node.nodeType == Node.ELEMENT_NODE && node.tagName == "SPAN";
}

/*
Apply formatting to a node.
*/
function applyFormatting(node, style, args) {
    switch (style) {
        case "bold":
            if (node.nodeType == Node.TEXT_NODE && args.command == "apply") {
                // Create a new span.
                const span = document.createElement("span");
                span.textContent = node.textContent;
                span.style.fontWeight = "bold";
                node = span;
            } else if (isSpan(node)) {
                if (args.command == "apply") {
                    node.style.fontWeight = "bold";
                } else {
                    node.style.fontWeight = "";
                }
            }
            break;
        case "italic":
            if (node.nodeType == Node.TEXT_NODE && args.command == "apply") {
                // Create a new span.
                const span = document.createElement("span");
                span.textContent = node.textContent;
                span.style.fontStyle = "italic";
                node = span;
            } else if (isSpan(node)) {
                if (args.command == "apply") {
                    node.style.fontStyle = "italic";
                } else {
                    node.style.fontStyle = "";
                }
            }
            break;
	    case "underline":
            if (node.nodeType == Node.TEXT_NODE && args.command == "apply") {
                // Create a new span.
                const span = document.createElement("span");
                span.textContent = node.textContent;
                span.style.textDecoration = "underline";
                node = span;
            } else if (isSpan(node)) {
                if (args.command == "apply") {
                    node.style.textDecoration = "underline";
                } else {
                    node.style.textDecoration = "";
                }
            }
            break;
        case "font":
            if (node.nodeType == Node.TEXT_NODE) {
                // Create a new span.
                const span = document.createElement("span");
                span.textContent = node.textContent;
                span.style.fontFamily = args.family;
                node = span;
            } else if (isSpan(node)) {
                node.style.fontFamily = args.family;
            }
            break;
    }
    return node;
}

/*
Check if a style attribute is valid for a non-span element. This means that it either contains no style attribute or the only style is text-align.
*/
function styleAttributeValidForNonSpan(attr) {
    if (attr == null) {
        attr = "";
    }
    attr = attr.trim();
    if (attr == "") {
        return true;
    }
    const splitAttrs = attr.split(";").map((s) => {return s.split(":").map((a) => {return a.trim()})});
    
    // TODO: EMPTY ATTRS

    if (splitAttrs.length != 0 && splitAttrs[0].length != 0 && splitAttrs[0][0].toLowerCase == "text-align") {
        return true;
    }
    return false;
}

/* 
The rich text editor class. 
*/
class Editor {
    /* 
    Editor constants. 
    */
    trackedStyles = ["fontWeight", "fontStyle", "textDecoration", "fontFamily", "fontSize"];

    invisible = "&#8290"; // Insert this into spans so that the cursor will latch to it.
    ascii = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

    allowedTags = ["DIV", "P", "SPAN", "BR"];

    /* 
    Create the editor. 
    */
    constructor(element, settings) {
        this.container = element;
        this.settings = settings;

        this.commands = ["bold", "italic", "underline", "font"] || settings.commands;
        this.snapshotInterval = 5000 || settings.snapshotInterval;
        this.supportedFonts = ["Arial", "Times New Roman", "monospace", "Helvetica"] || settings.supportedFonts;
        this.defaultFont = "Arial" || settings.defaultFont;

        // Parse the invisible entity as text.
        const temp = document.createElement("div");
        temp.innerHTML = this.invisible;
        this.invisibleParsed = temp.innerHTML;
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
                    this.menubarOptions.bold.innerHTML = "<b>B</b>";
                    this.menubarOptions.bold.addEventListener("click", this.bold.bind(this));
                    this.menubar.append(this.menubarOptions.bold);
                    break;
                case "italic":
                    this.menubarOptions.italic = document.createElement("button");
                    this.menubarOptions.italic.setAttribute("id", "editor-menubar-option-italic");
                    this.menubarOptions.italic.innerHTML = "<i>I</i>";
                    this.menubarOptions.italic.addEventListener("click", this.italic.bind(this));
                    this.menubar.append(this.menubarOptions.italic);
                    break;
		        case "underline":
                    this.menubarOptions.underline = document.createElement("button");
                    this.menubarOptions.underline.setAttribute("id", "editor-menubar-option-italic");
                    this.menubarOptions.underline.innerHTML = "<u>U</u>";
                    this.menubarOptions.underline.addEventListener("click", this.underline.bind(this));
                    this.menubar.append(this.menubarOptions.underline);
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
            }
        }
    }

    /*
    Bind event listeners for keyboard events.
    */
    bindKeyboardEvents() {
        this.editor.addEventListener("keydown", function(e) {
            if (e.key == "b" && e.ctrlKey) {
                // Bold.
                e.preventDefault();
                this.bold();
            } else if (e.key == "i" && e.ctrlKey) {
                // Italic.
                e.preventDefault();
                this.italic();
            } else if (e.key == "u" && e.ctrlKey) {
                // Underline.
                e.preventDefault();
                this.underline();
            }
        }.bind(this));
    }

    /*
    Called on selection change and on styling change.
    */
    onChangeSelect() {
        const range = this.getRange();
        if (range == null) {
            return;
        }
        const styling = this.detectStyling(range);

        // Alter the styling of each of the options.
        for (const styleName of this.trackedStyles) {
            switch (styleName) {
                case "fontWeight":
                    if (styling[styleName] == "bold") {
                        if (!this.menubarOptions.bold.classList.contains("editor-pressed")) this.menubarOptions.bold.classList.add("editor-pressed");
                    } else {
                        if (this.menubarOptions.bold.classList.contains("editor-pressed")) this.menubarOptions.bold.classList.remove("editor-pressed");
                    }
                    break;
                case "fontStyle":
                    if (styling[styleName] == "italic") {
                        if (!this.menubarOptions.italic.classList.contains("editor-pressed")) this.menubarOptions.italic.classList.add("editor-pressed");
                    } else {
                        if (this.menubarOptions.italic.classList.contains("editor-pressed")) this.menubarOptions.italic.classList.remove("editor-pressed");
                    }
                    break;
                case "textDecoration":
                    if (styling[styleName] == "underline") {
                        if (!this.menubarOptions.underline.classList.contains("editor-pressed")) this.menubarOptions.underline.classList.add("editor-pressed");
                    } else {
                        if (this.menubarOptions.underline.classList.contains("editor-pressed")) this.menubarOptions.underline.classList.remove("editor-pressed");
                    }
                    break;
                case "fontFamily":
                    this.menubarOptions.font.value = styling[styleName];
                    break;
            }
        }
    }

    /* 
    Copy styles from one style object to another.
    */
    copyStyles(src, dest) {
        for (const styleName of this.trackedStyles) {
            dest.style[styleName] = src[styleName];
        }
        return dest;
    }

    /*
    Check if a node is valid DOM.
    */
    checkNodeValid(node) {        
        // Traverse the node and ensure each node is valid.
        var currentNode = node;
        while (node.contains(currentNode) && this.inEditor(currentNode)) {
            // If the element is not a span and has styling, it is invalid.
            if (!isSpan(currentNode) && currentNode.nodeType == Node.ELEMENT_NODE && !styleAttributeValidForNonSpan(currentNode.getAttribute("style"))) {
                return false;
            }

            // If the element is a span, check that it only contains <br> and text nodes.
            if (isSpan(currentNode)) {
                for (const spanChild of currentNode.childNodes) {
                    if (spanChild.nodeType != Node.TEXT_NODE && spanChild.tagName != "BR") {
                        return false;
                    }
                    if (spanChild.childNodes.length != 0) {
                        return false;
                    }
                }
            }

            // If the element is one of the disallowed tags, it is invalid.
            if (currentNode.nodeType == Node.ELEMENT_NODE && !this.allowedTags.includes(currentNode.tagName)) {
                return false;
            }

            // Traverse the node tree.
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                currentNode = currentNode.firstChild;
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling) {
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
    Normalize an invalid node.
    */
    normalizeNode(node) {
        const output = document.createDocumentFragment();

        // Traverse the node and convert each child node.
        var currentNode = node;
        var currentNewNode = output;

        // Store the current number of parent nodes to traverse up through to get to the next valid node.
        var numParentNodesUntilValidNode = 0;

        while (node.contains(currentNode) && this.inEditor(currentNode)) {
            if (node.nodeType == Node.TEXT_NODE) {
                // Create a span for the text node.
                const newSpan = document.createElement("span");
                newSpan.textContent = node.textContent;
                newSpan = this.copyStyles(window.getComputedStyle(node.parentNode), newSpan);
                currentNewNode.append(newSpan);
            }

            // If the node is valid, insert it.
            // if (node.nodeType == )

            // If the node is invalid, or is a span, don't insert anything. Instead, 

            // Traverse the node tree.
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                currentNode = currentNode.firstChild;
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling) {
                    currentNode = currentNode.parentNode;
                }
                currentNode = currentNode.nextSibling;
            } else {
                // Go to the next node.
                currentNode = currentNode.nextSibling;
            }
        }

        return output;
    }
    
    /*
    Callback for mutation observer. Should handle invalid DOM structure cases and invalid DOM nodes.
    */
    onMutate(mutationList, observer) {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                const addedNodes = mutation.addedNodes;
                for (const node of addedNodes) {
                    if (!this.checkNodeValid(node) && this.inEditor(node)) {
                        console.log("INVALID!!!!!!!", node);
                        // 
                    }
                }
            }
        }
    }

    /*
    Bind event listeners for select event.
    */
    bindSelectEvents() {
        // Bind the onChangeSelect function with setTimeout so that it runs after the event bubbles.
        const onChangeSelect = setTimeout.bind(window, this.onChangeSelect.bind(this), 0);

        this.editor.addEventListener('focus', function (e) {
            document.addEventListener('selectionchange', onChangeSelect);
        });
        this.editor.addEventListener('focusout', function (e) {
            document.removeEventListener('selectionchange', onChangeSelect);
        });
    }

    /*
    Bind the mutation observer to the editor.
    */
    bindMutationObserver() {
        // Bind the mutation observer.
        const config = { attributes: true, childList: true, subtree: true };
        const observer = new MutationObserver(this.onMutate.bind(this));
        observer.observe(this.editor, config);
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
        if (this.rangeCache) {
            return this.rangeCache;
        }
        if (window.getSelection().rangeCount != 0) {
            return window.getSelection().getRangeAt(0);
        }
        return null;
    }

    /* 
    Get an array of all the inline nodes within a range. This includes spans and text nodes. 
    If the text node is contained within a span, it only returns the span. Returns the newly 
    calculated start and end offsets.
    */
    getInlineNodesInRange(range) {
        if (range == null) {
            return [];
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
            if (this.inEditor(currentNode)) {
                if (isSpan(currentNode.parentNode)) {
                    // If the parent node is a span, append the parent node.
                    if (!nodes.includes(currentNode.parentNode)) nodes.push(currentNode.parentNode);
                } else if (isSpan(currentNode)) {
                    // The current node is a span, so append it.
                    if (!nodes.includes(currentNode)) nodes.push(currentNode);
                } else if (currentNode.nodeType == Node.TEXT_NODE) {
                    // If the parent node is not a span and the current node is a text node, append the span.
                    if (!nodes.includes(currentNode)) nodes.push(currentNode);
                }
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
                while (!currentNode.nextSibling) {
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
    Detect the current styling of a range. For a style to be active, all of the nodes
    in the range must be the same.
    */
    detectStyling(range) {
        var styling = {};
        const nodes = this.getInlineNodesInRange(range).nodes;
        
        // Iterate through the inline nodes.
        for (const node of nodes) {
            // If the node is empty, don't count it.
            if (node.textContent.replace(this.invisibleParsed, "") == "" && nodes.length > 1) {
                continue;
            }

            // Go through each tracked style and calculate the overall style.
            const computedStyle = node.nodeType != Node.TEXT_NODE ? window.getComputedStyle(node) : window.getComputedStyle(node.parentNode);
            for (const styleName of this.trackedStyles) {
                var styleValue = computedStyle[styleName];
                
                // Normalize the style value in certain cases.
                switch (styleName) {
                    case "fontWeight":
                        if (styleValue == "700" || styleValue == "bold") {
                            styleValue = "bold";
                        } else {
                            styleValue = "";
                        }
                        break;
                    case "textDecoration":
                        if (styleValue.includes("underline")) {
                            styleValue = "underline";
                        } else {
                            styleValue = "";
                        }
                        break;
                    case "fontFamily":
                        // If there are multiple fonts, get the first font. Then, remove all quotes.
                        styleValue = styleValue.split(",")[0].replace("\"", "").replace("\"", "").replace("'", "").replace("'", "");
                        break;
                }

                if (styleName in styling) {
                    if (styling[styleName] != styleValue) {
                        styling[styleName] = "";
                    }
                } else {
                    styling[styleName] = styleValue;
                }
            }
        }

        // Set the default font in the styling.
        if (!("fontFamily" in styling) && this.trackedStyles.includes("fontFamily")) {
            styling.fontFamily = this.defaultFont;
        }
        
        return styling;
    }

    /* 
    Set the style on a range.
    */
    setStyle(range, style, args) {
        // Get all inline nodes within the range.
        const rangeOutput = this.getInlineNodesInRange(range);
        const nodes = rangeOutput.nodes;
        const startOffset = rangeOutput.startOffset;
        const endOffset = rangeOutput.endOffset;

        // If the editor is empty, place in a new span.
        if (this.editor.childNodes.length == 0) {
            var newNode = document.createElement("span");

            // Apply formatting to the new node.
            newNode = applyFormatting(newNode, style, args);

            // Append the node.
            this.editor.append(newNode);

            // Insert an invisible character for the cursor to latch on to.
            newNode.innerHTML += this.invisible;

            // Select the node.
            const newRange = new Range();
            newRange.setStart(newNode, 0);
            newRange.collapse();
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }

        // Set the style.
        if (nodes.length == 0) {
            return;
        } else if (nodes.length == 1) {
            // If there is only one node in the range, split the node.
            var newNode = nodes[0].cloneNode(true);
            var endNode = nodes[0].cloneNode(true);

            // The original node will be cut the the start offset.
            nodes[0].textContent = nodes[0].textContent.slice(0, startOffset);

            // The new node will contain the selected text.
            newNode.textContent = newNode.textContent.slice(startOffset, endOffset);

            // Apply formatting to the new node.
            newNode = applyFormatting(newNode, style, args);

            // The final node will contain the remainder of the text.
            endNode.textContent = endNode.textContent.slice(endOffset, endNode.textContent.length);

            // Append the nodes.
            nodes[0].after(newNode, endNode);

            // If the start or end nodes are empty, remove them.
            if (nodes[0].textContent == "") {
                nodes[0].remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            // If the new node is empty, place in invisible character for the cursor to latch onto.
            if (newNode.textContent == "") {
                newNode.innerHTML += this.invisible;
            }

            // Select the node.
            const newRange = new Range();
            newRange.selectNodeContents(newNode);
            if (newNode.innerHTML.replace(this.invisibleParsed, "") == "") {
                // If the node is empty, collapse the range.
                newRange.collapse();
            }
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else {
            // Split the first and last nodes.
            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            var newNodeStart = firstNode.cloneNode(true);
            var newNodeEnd = lastNode.cloneNode(true);

            // The original nodes will be cut.
            firstNode.textContent = firstNode.textContent.slice(0, startOffset);
            lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);

            // Cut the new nodes.
            newNodeStart.textContent = newNodeStart.textContent.slice(startOffset, newNodeStart.textContent.length);
            newNodeEnd.textContent = newNodeEnd.textContent.slice(0, endOffset);

            // Apply formatting to the new nodes.
            newNodeStart = applyFormatting(newNodeStart, style, args);
            newNodeEnd = applyFormatting(newNodeEnd, style, args);

            // Append the new start and end nodes.
            firstNode.after(newNodeStart);
            lastNode.before(newNodeEnd);
            
            // Apply formatting to all the nodes in between the first and last nodes.
            for (const node of nodes.slice(1, -1)) {
                const formattedNode = applyFormatting(node, style, args);

                // Replace the node.
                node.replaceWith(formattedNode);
            }

            // If the original nodes are empty, remove them.
            if (firstNode.textContent == "") {
                firstNode.remove();
            }
            if (lastNode.textContent == "") {
                lastNode.remove();
            }

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStart(newNodeStart, 0);
            newRange.setEndAfter(newNodeEnd);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }
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
        switch (style) {
            case "bold":
                this.setStyle(range, style, {command: (currentStyling.fontWeight == "bold") ? "remove" : "apply"});
                break;
            case "italic":
                this.setStyle(range, style, {command: (currentStyling.fontStyle == "italic") ? "remove" : "apply"});
                break;
            case "underline":
                this.setStyle(range, style, {command: (currentStyling.textDecoration == "underline") ? "remove" : "apply"});
                break;
            case "font":
                this.setStyle(range, style, {family: this.menubarOptions.font.value});
                break;
        }

        // Call the selection change event.
        this.onChangeSelect();
    }

    /*
    Bold.
    */
    bold() {
        this.performStyleCommand("bold");
    }

    /*
    Italic.
    */
    italic() {
        this.performStyleCommand("italic");
    }

    /*
    Underline.
    */
    underline() {
        this.performStyleCommand("underline");
    }

    /*
    Font change.
    */
    font() {
        this.performStyleCommand("font");
    }

    /* 
    Initialize the editor. Must be called before using the editor. 
    */
    init() {
        // Initialize history.
        this.history = [];
        this.redoHistory = [];

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

        // Apply min/max height.
        this.applySizeStyles();

        // Apply default font.
        this.applyDefaultFont();

        // Bind event listeners for keyboard events.
        this.bindKeyboardEvents();

        // Bind event listeners for select event.
        this.bindSelectEvents();

        // Bind mutation observer.
        this.bindMutationObserver();
    }
}