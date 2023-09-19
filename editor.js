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
    }
    return node;
}

/* 
The rich text editor class. 
*/
class Editor {
    /* 
    Editor constants. 
    */
    trackedStyles = ["fontWeight", "fontStyle", "textDecoration", "fontFamily", "fontSize"];
    allowedTagTypes = ["span", "br"];

    invisible = "&#8290"; // Insert this into spans so that the cursor will latch to it.
    ascii = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

    /* 
    Create the editor. 
    */
    constructor(element, settings) {
        this.container = element;
        this.settings = settings;

        this.commands = ["bold", "italic", "underline"] || settings.commands;
        this.snapshotInterval = 5000 || settings.snapshotInterval;
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
                    this.menubarOptions.underline.innerHTML = "<span style=\"text-decoration: underline;\">U</span>";
                    this.menubarOptions.underline.addEventListener("click", this.underline.bind(this));
                    this.menubar.append(this.menubarOptions.underline);
                    break;
            }
        }
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
        const nodes = [];
        var currentNode = range.startContainer;
        var startOffset = range.startOffset;
        var endOffset = range.endOffset;

        // If the first node is not a text node, move the start node to the start offset.
        if (range.startContainer.nodeType != Node.TEXT_NODE) {
            currentNode = currentNode.childNodes[range.startOffset];
            startOffset = 0;
        }

        var haveTraversedLastNode = false;
        while (this.inEditor(currentNode)) {
            // We always want to fully traverse the end node.
            if (range.endContainer.contains(currentNode)) {
                haveTraversedLastNode = true;
            }

            // If we've finished traversing the last node or we've reached the bound of the last node, quit.
            if (haveTraversedLastNode && (!range.endContainer.contains(currentNode) || (Array.from(range.endContainer.childNodes).indexOf(currentNode) >= range.endOffset))) {
                break;
            }

            // Append the node.
            if (this.inEditor(currentNode)) {
                if (currentNode.nodeType == Node.TEXT_NODE) {
                    if (isSpan(currentNode.parentNode)) {
                        // If the parent node is a span, append the parent node.
                        nodes.push(currentNode.parentNode);
                    } else {
                        // The parent node is not a span.
                        nodes.push(currentNode);
                    }
                }
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
        if (range.endContainer.nodeType != Node.TEXT_NODE) {
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
            if (node.textContent == "") {
                continue;
            }

            // Go through each tracked style and calculate the overall style.
            for (const styleName of this.trackedStyles) {
                var styleValue = "";
                if (node.style) {
                    styleValue = node.style[styleName];
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

        if (nodes.length == 0) {
            // TODO: handle just pressing the button to create a new span to write in
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

            // Select the node.
            const newRange = new Range();
            newRange.selectNode(newNode);
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
        const currentStyling = this.detectStyling(range);

        // Set the style.
        switch (style) {
            case "bold":
                this.setStyle(range, style, {command: (currentStyling.fontWeight != "") ? "remove" : "apply"});
                break;
            case "italic":
                this.setStyle(range, style, {command: (currentStyling.fontStyle != "") ? "remove" : "apply"});
                break;
            case "underline":
                this.setStyle(range, style, {command: (currentStyling.textDecoration != "") ? "remove" : "apply"});
                break;
        }
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

        // TODO: testing
        const d1 = document.createElement("p");
        const d2 = document.createElement("p");
        d1.innerText = "abc";
        d2.innerText = "def";
        this.editor.append(d1, d2);

        // Apply min/max height.
        this.applySizeStyles();
    }
}