/* editor.js - A simple, lightweight rich text editor written in vanilla JavaScript. */

/* 
The rich text editor class. 
*/
class Editor {
    /* 
    Editor constants. 
    */
    invisible = "&#8290"; // Insert this into spans so that the cursor will latch to it.
    ascii = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

    contentTags = ["IMG"];

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
        for (const option of this.commands) {
            if (option == "font") {
                this.menubarOptions.font.value = styling.find(s => s.type == "font") ? styling.find(s => s.type == "font").family : this.defaultFont;
                // TODO: this doesn't handle conflicting results
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
    Get an array of all the text nodes within a range. Returns the newly calculated start and end offsets.
    */
    getTextNodesInRange(range) {
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
            if (this.inEditor(currentNode) && currentNode.nodeType == Node.TEXT_NODE) {
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
    Get a list of styling that an element applies.
    */
    getStylingOfElement(node) {
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
                styling.push({type: "strikethrough"})
                break;
        }

        // Check the element's inline styling.
        if (node.style.fontWeight == "700" || node.style.fontWeight.toLowerCase() == "bold") {
            if (!styling.some(s => s.type == "bold")) styling.push({type: "bold"});
        }
        if (node.style.fontStyle.toLowerCase() == "italic") {
            if (!styling.some(s => s.type == "italic")) styling.push({type: "italic"});
        }
        if (node.style.textDecoration.toLowerCase().includes("underline")) {
            if (!styling.some(s => s.type == "underline")) styling.push({type: "underline"});
        }
        if (node.style.textDecoration.toLowerCase().includes("line-through")) {
            if (!styling.some(s => s.type == "strikethrough")) styling.push({type: "strikethrough"});
        }

        return styling;
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
            if (node.textContent.replace(this.invisibleParsed, "") == "" && nodes.length > 1) {
                continue;
            }

            // Traverse up the tree and track each style node passed on the way up.
            var currentNode = node.parentNode;
            var nodeStyling = [];
            while (this.inEditor(currentNode)) {
                nodeStyling.push(...this.getStylingOfElement(currentNode));
                currentNode = currentNode.parentNode;
            }
            
            if (firstNode) {
                // If this is the first node being tracked, add its styles to the styling.
                styling.push(...nodeStyling);
                firstNode = false;
            } else {
                // If this is not, check that each of the current styles is included in this element's styling.
                for (const style of styling.slice(0, styling.length)) {
                    if (!nodeStyling.some(s => s.type == style.type)) {
                        styling.splice(styling.findIndex(s => s.type == style.type), 1);
                    }
                }
            }
        }
        
        return styling;
    }

    /*
    Apply a style to a node.
    */
    applyStyleToNode(node, tag) {
        // Go up the DOM tree, and check if the tag has already been applied.
        var currentNode = node;
        while (this.inEditor(currentNode)) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && currentNode.tagName == tag.toUpperCase()) {
                // Found the node.
                return node;
            }
            currentNode = currentNode.parentNode;
        }

        // Create a new style element and place the node within it.
        const newElem = document.createElement(tag);
        newElem.appendChild(node.cloneNode(true));
        node.replaceWith(newElem);
        return newElem;
    }

    /*
    Apply a style to a range.
    */
    applyStyle(tag, range) {
        // Get the text nodes within the range.
        const {nodes, startOffset, endOffset} = this.getTextNodesInRange(range);

        if (nodes.length >= 2) {
            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            // Split the first node at the start offset and place the remainder in a new style element.
            var newStartNode = document.createTextNode(firstNode.textContent.slice(startOffset, firstNode.textContent.length));
            firstNode.textContent = firstNode.textContent.slice(0, startOffset);
            firstNode.after(newStartNode);
            newStartNode = this.applyStyleToNode(newStartNode, tag);
            if (firstNode.textContent == "") {
                firstNode.remove();
            }

            // Split the last node at the end offset and place the remainder in a new style element.
            var newEndNode = document.createTextNode(lastNode.textContent.slice(0, endOffset));
            lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);
            lastNode.before(newEndNode);
            newEndNode = this.applyStyleToNode(newEndNode, tag);
            if (lastNode.textContent == "") {
                lastNode.remove();
            }

            // Place each node in between in a new tag.
            for (const node of nodes.slice(1, nodes.length - 1)) {
                const styledNode = this.applyStyleToNode(node, tag);
                node.replaceWith(styledNode);
            }

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStartBefore(newStartNode);
            newRange.setEndAfter(newEndNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 1) {
            const node = nodes[0];

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Style the middle node.
            styledNode = this.applyStyleToNode(styledNode, tag);

            if (node.textContent == "") {
                node.remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            // Select the new node.
            const newRange = new Range();
            newRange.selectNodeContents(styledNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        }
    }

    /*
    Check if a node is empty (no text/content nodes).
    */
    isEmpty(node) {
        var currentNode = node;
        while (node.contains(currentNode)) {
            if (currentNode.nodeType == Node.ELEMENT_NODE && this.contentTags.includes(currentNode.tagName)) {
                return false;
            }
            if (currentNode.nodeType == Node.TEXT_NODE && currentNode.textContent != "") {
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
    Remove a style on a node.
    */
    removeStyleOnNode(node, tag) {
        // Go up the DOM tree until the tag is found, saving a list of elements passed on the way up.
        var currentReconstructedNode = node.cloneNode(true);
        var currentNode = node;
        var found = false;
        while (this.inEditor(currentNode)) {
            currentNode = currentNode.parentNode;

            if (currentNode.nodeType == Node.ELEMENT_NODE && currentNode.tagName == tag.toUpperCase()) {
                // Found the node.
                found = true;
                break;
            }

            // Add the node.
            var clone = currentNode.cloneNode(false);
            clone.appendChild(currentReconstructedNode);
            currentReconstructedNode = clone;
        }
        if (!found) {
            return node;
        }

        // Reconstruct all the nodes within the parent after the target text node.
        const parent = currentNode;
        currentNode = node;
        var currentReconstructedAfterNode = null;

        // First traversal.
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
            const currentNodeTemp = currentNode;
            currentNode = currentNode.nextSibling;
        }

        // Start reconstructing all the nodes after the target text node.
        while (parent.contains(currentNode)) {
            if (currentNode.childNodes.length != 0) {
                // If there are children of this node, enter the node.
                const currentNodeTemp = currentNode;
                currentNode = currentNode.firstChild;

                // Add the current node, along with the first child.
                clone = currentNodeTemp.cloneNode(false);
                if (currentReconstructedAfterNode != null) {
                    currentReconstructedAfterNode.after(clone);
                }
                currentReconstructedAfterNode = clone;
                if (currentNodeTemp.nodeType != Node.TEXT_NODE) {
                    clone = currentNodeTemp.cloneNode(false);
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.appendChild(clone);
                    }
                    currentReconstructedAfterNode = clone;
                } else {
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.appendChild(currentNodeTemp);
                    }
                    currentReconstructedAfterNode = currentNodeTemp;
                }
            } else if (!currentNode.nextSibling) {
                // If this is the last node in the parent, move to the parent's next neighbor.
                while (!currentNode.nextSibling && node.contains(currentNode)) {
                    if (!currentReconstructedAfterNode || !currentReconstructedAfterNode.parentNode) {
                        // No parent node, so reconstruct the parent.
                        clone = currentNode.parentNode.cloneNode(false);
                        if (currentReconstructedAfterNode != null) {
                            clone.appendChild(currentReconstructedAfterNode);
                        }
                        currentReconstructedAfterNode = clone;
                    }
                    currentNode = currentNode.parentNode;
                }
                
                const currentNodeTemp = currentNode;
                currentNode = currentNode.nextSibling;
                // Add in the next sibling.
                if (currentNodeTemp.nodeType != Node.TEXT_NODE) {
                    clone = currentNodeTemp.cloneNode(false);
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.after(clone);
                    }
                    currentReconstructedAfterNode = clone;
                } else {
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.after(currentNodeTemp);
                    }
                    currentReconstructedAfterNode = currentNodeTemp;
                }
            } else {
                // Go to the next node.
                const currentNodeTemp = currentNode;
                currentNode = currentNode.nextSibling;

                // Add in the current node.
                if (currentNodeTemp.nodeType != Node.TEXT_NODE) {
                    clone = currentNodeTemp.cloneNode(false);
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.after(clone);
                    }
                    currentReconstructedAfterNode = clone;
                } else {
                    if (currentReconstructedAfterNode != null) {
                        currentReconstructedAfterNode.after(currentNodeTemp);
                    }
                    currentReconstructedAfterNode = currentNodeTemp;
                }
            }
        }

        clone = parent.cloneNode(false);
        if (currentReconstructedAfterNode != null) {
            clone.appendChild(currentReconstructedAfterNode);
        }
        currentReconstructedAfterNode = clone;

        currentReconstructedAfterNode.remove();
        if (!this.isEmpty(currentReconstructedAfterNode)) parent.after(currentReconstructedAfterNode);

        // Place in the reconstructed node and the reconstructed after node.
        parent.after(currentReconstructedNode);

        if (this.isEmpty(parent)) parent.remove();

        // Remove the original node.
        node.remove();

        return currentReconstructedNode;
    }

    /* 
    Remove a style from a range.
    */
    removeStyle(tag, range) {
        // Get the text nodes within the range.
        const {nodes, startOffset, endOffset} = this.getTextNodesInRange(range);

        if (nodes.length >= 2) {
            const firstNode = nodes[0];
            const lastNode = nodes.slice(-1)[0];

            // Split the first node at the start offset.
            var newStartNode = document.createTextNode(firstNode.textContent.slice(startOffset, firstNode.textContent.length));
            firstNode.textContent = firstNode.textContent.slice(0, startOffset);
            firstNode.after(newStartNode);
            if (firstNode.textContent == "") {
                firstNode.remove();
            }

            // Split the last node at the end offset.
            var newEndNode = document.createTextNode(lastNode.textContent.slice(0, endOffset));
            lastNode.textContent = lastNode.textContent.slice(endOffset, lastNode.textContent.length);
            lastNode.before(newEndNode);
            if (lastNode.textContent == "") {
                lastNode.remove();
            }

            // Remove the styling for each node.
            newEndNode = this.removeStyleOnNode(newEndNode, tag);
            for (const node of nodes.slice(1, nodes.length - 1).reverse()) {
                this.removeStyleOnNode(node, tag);
            }
            newStartNode = this.removeStyleOnNode(newStartNode, tag);

            // Select the new nodes.
            const newRange = new Range();
            newRange.setStartBefore(newStartNode);
            newRange.setEndAfter(newEndNode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
        } else if (nodes.length == 1) {
            const node = nodes[0];

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Remove the styling on the middle node.
            styledNode = this.removeStyleOnNode(styledNode, tag);

            if (node.textContent == "") {
                node.remove();
            }
            if (endNode.textContent == "") {
                endNode.remove();
            }

            // Select the new node.
            const newRange = new Range();
            newRange.selectNodeContents(styledNode);
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
                if (currentStyling.some(s => s.type == "bold")) {
                    this.removeStyle("strong", range);
                } else {
                    this.applyStyle("strong", range);
                }
                break;
            case "italic":
                if (currentStyling.some(s => s.type == "italic")) {
                    this.removeStyle("em", range);
                } else {
                    this.applyStyle("em", range);
                }
                break;
            case "underline":
                if (currentStyling.some(s => s.type == "underline")) {
                    this.removeStyle("u", range);
                } else {
                    this.applyStyle("u", range);
                }
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
    }
}