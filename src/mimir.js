/* mimir.js - A simple, lightweight yet powerful rich text editor written in vanilla JavaScript. */

const _ = require("./assets/core.css")

/* 
The Mimir rich text editor class. 
*/
class Mimir {

    MimirUI = require("./ui.js");
    MimirIcons = require("./assets/icons.js");

    /* 
    Editor constants. 
    */
    ascii = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
    invisible = "&#xFEFF;"; // Insert this into spans so that the cursor will latch to it.

    contentTags = ["IMG", "BR", "HR"];
    stylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT", "SUP", "SUB", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"];
    inlineStylingTags = ["B", "STRONG", "I", "EM", "S", "U", "FONT", "SUP", "SUB", "A"];
    basicAllowedTags = ["DIV", "BR", "P", "IMG", "LI", "UL", "OL", "BLOCKQUOTE", "HR"];
    blockTags = ["BR", "DIV", "P", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "HR"];
    childlessTags = ["BR", "IMG", "HR"];

    inlineStylingCommands = ["bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub", "link"];
    blockStylingCommands = ["quote", "header", "align", "list", "indent", "outdent"];
    inlineBlockStylingCommands = ["header", "align"];
    requireSingleNodeToActivateStylingCommands = ["quote", "list"]; // These styles need only one node in the range to activate.
    multipleValueStylingCommands = ["font", "size", "foreColor", "backColor", "link"];
    noUIUpdateStylingCommands = ["foreColor", "backColor", "indent", "outdent", "link", "insertImage", "undo", "redo", "remove", "insertHorizontalRule"];
    cannotCreateCursorCommands = ["link"]; // These commands cannot create a cursor; entire text must be selected.
    insertCommands = ["insertImage", "insertHorizontalRule"];

    /* 
    Create the editor. 
    */
    constructor(element, settings) {
        settings = settings == null ? { } : settings;
        this.container = element;
        this.settings = settings;

        this.commands = ["bold", "italic", "underline", "strikethrough", 
                        "font", "size", "foreColor", "backColor", "sup", "sub", 
                        "link", "quote", "header", "align", "list", "indent", 
                        "outdent", "insertImage", "insertHorizontalRule", 
                        "undo", "redo"] || settings.commands;
        this.menubarSettings = [
            ["bold", "italic", "underline", "strikethrough", "font", "size", "foreColor", "backColor", "sup", "sub", "link", "remove"],
            ["quote", "header", "align", "list", "indent", "outdent"],
            ["insertImage", "insertHorizontalRule"],
            ["undo", "redo", "openFindAndReplace", "zoom"]
        ] || settings.menubar;
        this.snapshotInterval = settings.snapshotInterval || 5000;
        this.historyLimit = settings.historyLimit || 100;
        this.supportedFonts = settings.supportedFonts || ["Arial", "Times New Roman", "monospace", "Helvetica"];
        this.defaultFont = settings.defaultFont || "Arial";
        this.defaultSize = 16 || settings.defaultSize;
        this.spellcheck = settings.spellcheck == undefined ? true : !!settings.spellcheck;
        this.defaultImageWidth = settings.defaultImageWidth || "300px";
        this.useIcons = settings.useIcons == undefined ? true : !!settings.useIcons;
        this.allowPasteHTML = settings.allowPasteHTML == undefined ? true : !!settings.allowPasteHTML;
        this.zoomOptions = settings.zoomOptions || ["50", "75", "90", "100", "125", "150", "175", "200"];

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
        cursor.setAttribute("class", "mimir-temp-cursor");
        cursor.innerHTML = this.invisible;

        this.currentCursor = cursor;

        return cursor;
    }

    /* 
    Apply the height and width style options to the editor. 
    */
    applySizeStyles() {
        this.editor.style.width = this.settings.width || "600px";

        if (this.settings.height) {
            this.editorContainer.style.height = this.settings.height;
            this.editor.style.height = this.settings.height;
        } else if (this.settings.minHeight) {
            this.editorContainer.style.minHeight = this.settings.minHeight;
            this.editor.style.minHeight = this.settings.minHeight;
        } else {
            this.editorContainer.style.minHeight = "600px";
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
        function iconElem(name) {
            return this.MimirIcons[name];
        }
        iconElem = iconElem.bind(this);

        this.menubar = document.createElement("div");
        this.menubar.setAttribute("id", "mimir-menubar");
        this.menubar.setAttribute("role", "toolbar");
        this.menubar.setAttribute("aria-label", "Editor menubar");
        this.container.append(this.menubar);

        // Add the options.
        this.menubarOptions = {};
        for (const group of this.menubarSettings) {
            for (const command of group) {
                switch (command) {
                    case "bold":
                        this.menubarOptions.bold = document.createElement("button");
                        this.menubarOptions.bold.setAttribute("id", "mimir-menubar-option-bold");
                        this.menubarOptions.bold.innerHTML = this.useIcons ? iconElem("bold") : "B";
                        this.menubarOptions.bold.addEventListener("click", this.bold.bind(this));
                        this.menubarOptions.bold.setAttribute("title", "Bold");
                        this.menubarOptions.bold.setAttribute("aria-pressed", "false");
                        this.menubarOptions.bold.setAttribute("aria-label", "Editor toggle bold");
                        this.menubar.append(this.menubarOptions.bold);
                        break;
                    case "italic":
                        this.menubarOptions.italic = document.createElement("button");
                        this.menubarOptions.italic.setAttribute("id", "mimir-menubar-option-italic");
                        this.menubarOptions.italic.innerHTML = this.useIcons ? iconElem("italic") : "I";
                        this.menubarOptions.italic.addEventListener("click", this.italic.bind(this));
                        this.menubarOptions.italic.setAttribute("title", "Italic");
                        this.menubarOptions.italic.setAttribute("aria-pressed", "false");
                        this.menubarOptions.italic.setAttribute("aria-label", "Editor toggle italic");
                        this.menubar.append(this.menubarOptions.italic);
                        break;
                    case "underline":
                        this.menubarOptions.underline = document.createElement("button");
                        this.menubarOptions.underline.setAttribute("id", "mimir-menubar-option-underline");
                        this.menubarOptions.underline.innerHTML = this.useIcons ? iconElem("underline") : "U";
                        this.menubarOptions.underline.addEventListener("click", this.underline.bind(this));
                        this.menubarOptions.underline.setAttribute("title", "Underline");
                        this.menubarOptions.underline.setAttribute("aria-pressed", "false");
                        this.menubarOptions.underline.setAttribute("aria-label", "Editor toggle underline");
                        this.menubar.append(this.menubarOptions.underline);
                        break;
                    case "strikethrough":
                        this.menubarOptions.strikethrough = document.createElement("button");
                        this.menubarOptions.strikethrough.setAttribute("id", "mimir-menubar-option-strikethrough");
                        this.menubarOptions.strikethrough.innerHTML = this.useIcons ? iconElem("strikethrough") : "S";
                        this.menubarOptions.strikethrough.addEventListener("click", this.strikethrough.bind(this));
                        this.menubarOptions.strikethrough.setAttribute("title", "Strikethrough");
                        this.menubarOptions.strikethrough.setAttribute("aria-pressed", "false");
                        this.menubarOptions.strikethrough.setAttribute("aria-label", "Editor toggle strikethrough");
                        this.menubar.append(this.menubarOptions.strikethrough);
                        break;
                    case "font":
                        var options = [];
                        for (const font of this.supportedFonts) {
                            const newFontOption = document.createElement("div");
                            newFontOption.innerHTML = font;
                            newFontOption.style.fontFamily = font;
                            newFontOption.setAttribute("value", font);
                            newFontOption.setAttribute("title", font);
                            newFontOption.setAttribute("aria-label", "Editor select font " + font);
                            options.push({name: font, content: newFontOption});
                        }
                        this.menubarOptions.font = this.MimirUI.dropdownList(options, this.font.bind(this));
                        this.menubarOptions.font.list.setAttribute("id", "mimir-menubar-option-font");
                        this.menubarOptions.font.setValue(this.defaultFont);
                        this.menubar.append(this.menubarOptions.font.list);
                        this.menubarOptions.font.list.setAttribute("title", "Font");
                        this.menubarOptions.font.list.setAttribute("aria-label", "Editor select font");
                        this.menubarOptions.font.list.style.width = "130px";
                        break;
                    case "size":
                        const { numberInput, input, plus, minus } = this.MimirUI.numberInput(1, 200);
                        this.menubarOptions.size = input;
                        numberInput.setAttribute("id", "mimir-menubar-option-size");
                        this.menubarOptions.size.value = this.defaultSize;
                        this.menubarOptions.size.addEventListener("change", this.size.bind(this));
                        this.menubarOptions.size.setAttribute("title", "Size");
                        this.menubarOptions.size.setAttribute("aria-label", "Editor change size");
                        plus.setAttribute("title", "Increase Size");
                        plus.setAttribute("aria-label", "Editor change size increase");
                        minus.setAttribute("title", "Decrease Size");
                        minus.setAttribute("aria-label", "Editor change size decrease");
                        this.menubar.append(numberInput);
                        break;
                    case "foreColor":
                        const foreColorButton = document.createElement("button");
                        foreColorButton.innerHTML = this.useIcons ? iconElem("a") : "A";
                        if (this.useIcons) {
                            foreColorButton.childNodes[0].style.borderBottom = `2px solid rgb(255, 0, 0)`;
                        } else {
                            foreColorButton.style.textDecorationColor = `rgb(255, 0, 0)`;
                        }
                        foreColorButton.setAttribute("title", "Foreground Color");
                        foreColorButton.classList.add("mimir-menubar-option-fore-color-button");
                        foreColorButton.addEventListener("click", function() {this.foreColor(foreColorInput.getValue());}.bind(this));
                        const foreColorOpenButton = document.createElement("button");
                        foreColorOpenButton.innerHTML = "&#9660";
                        var foreColorInput = this.MimirUI.colorInput(this.foreColor.bind(this), foreColorOpenButton, 200, 40, 200);
                        this.menubarOptions.foreColor = foreColorInput;
                        foreColorInput.colorInput.setAttribute("id", "mimir-menubar-option-fore-color");
                        const foreColorButtonContainer = document.createElement("div");
                        foreColorButtonContainer.classList.add("mimir-menubar-option-fore-color-button-container");
                        foreColorButtonContainer.append(foreColorButton, foreColorInput.dropdown.button);
                        foreColorInput.colorInput.prepend(foreColorButtonContainer);
                        foreColorInput.dropdown.button.setAttribute("title", "Foreground Color");
                        foreColorInput.colorInput.setAttribute("aria-label", "Editor change foreground color");
                        this.menubar.append(foreColorInput.colorInput);
                        break;
                    case "backColor":
                        const backColorButton = document.createElement("button");
                        backColorButton.innerHTML = this.useIcons ? iconElem("fill") : "&#9639;";
                        if (this.useIcons) {
                            backColorButton.childNodes[0].style.borderBottom = `2px solid rgb(255, 0, 0)`;
                        } else {
                            backColorButton.style.textDecorationColor = `rgb(255, 0, 0)`;
                        }
                        backColorButton.setAttribute("title", "Background Color");
                        backColorButton.classList.add("mimir-menubar-option-back-color-button");
                        backColorButton.addEventListener("click", function() {this.backColor(backColorInput.getValue());}.bind(this));
                        const backColorOpenButton = document.createElement("button");
                        backColorOpenButton.innerHTML = "&#9660";
                        const backColorInput = this.MimirUI.colorInput(this.backColor.bind(this), backColorOpenButton, 200, 40, 200);
                        this.menubarOptions.backColor = backColorInput;
                        backColorInput.colorInput.setAttribute("id", "mimir-menubar-option-back-color");
                        const backColorButtonContainer = document.createElement("div");
                        backColorButtonContainer.classList.add("mimir-menubar-option-back-color-button-container");
                        backColorButtonContainer.append(backColorButton, backColorInput.dropdown.button);
                        backColorInput.colorInput.prepend(backColorButtonContainer);
                        backColorInput.dropdown.button.setAttribute("title", "Background Color");
                        backColorInput.colorInput.setAttribute("aria-label", "Editor change background color");
                        this.menubar.append(backColorInput.colorInput);
                        break;
                    case "sup":
                        this.menubarOptions.sup = document.createElement("button");
                        this.menubarOptions.sup.setAttribute("id", "mimir-menubar-option-sup");
                        this.menubarOptions.sup.innerHTML = this.useIcons ? iconElem("superscript") : "x<sup>2</sup>";
                        this.menubarOptions.sup.addEventListener("click", this.sup.bind(this));
                        this.menubarOptions.sup.setAttribute("title", "Superscript");
                        this.menubarOptions.sup.setAttribute("aria-pressed", "false");
                        this.menubarOptions.sup.setAttribute("aria-label", "Editor toggle superscript");
                        this.menubar.append(this.menubarOptions.sup);
                        break;
                    case "sub":
                        this.menubarOptions.sub = document.createElement("button");
                        this.menubarOptions.sub.setAttribute("id", "mimir-menubar-option-sub");
                        this.menubarOptions.sub.innerHTML = this.useIcons ? iconElem("subscript") : "x<sub>2</sub>";
                        this.menubarOptions.sub.addEventListener("click", this.sub.bind(this));
                        this.menubarOptions.sub.setAttribute("title", "Subscript");
                        this.menubarOptions.sub.setAttribute("aria-pressed", "false");
                        this.menubarOptions.sub.setAttribute("aria-label", "Editor toggle subscript");
                        this.menubar.append(this.menubarOptions.sub);
                        break;
                    case "link":
                        const linkButton = document.createElement("button");
                        linkButton.innerHTML = this.useIcons ? iconElem("link") : "&#128279;";
                        linkButton.classList.add("mimir-menubar-option-link-button");
                        const linkInput = this.MimirUI.linkInput(this.link.bind(this), linkButton);
                        this.menubarOptions.link = linkInput;
                        linkInput.linkInput.setAttribute("id", "mimir-menubar-option-link");
                        linkInput.dropdown.button.setAttribute("title", "Hyperlink");
                        linkInput.linkInput.setAttribute("aria-pressed", "false");
                        linkInput.linkInput.setAttribute("aria-label", "Editor insert link");
                        this.menubar.append(linkInput.linkInput);
                        break;
                    case "quote":
                        this.menubarOptions.quote = document.createElement("button");
                        this.menubarOptions.quote.setAttribute("id", "mimir-menubar-option-quote");
                        this.menubarOptions.quote.innerHTML = this.useIcons ? iconElem("quote") : "\"";
                        this.menubarOptions.quote.addEventListener("click", this.quote.bind(this));
                        this.menubarOptions.quote.setAttribute("title", "Blockquote");
                        this.menubarOptions.quote.setAttribute("aria-pressed", "false");
                        this.menubarOptions.quote.setAttribute("aria-label", "Editor toggle blockquote");
                        this.menubar.append(this.menubarOptions.quote);
                        break;
                    case "header":
                        var options = [];
                        const createHeaderFontTextElem = (s, t) => {const e = document.createElement("strong"); e.innerHTML = `<span style="font-size: ${s}px" title="${t}" aria-label="Editor select header ${t}">${t}</span>`; return e;};
                        const createParagraphFontTextElem = (t) => {const e = document.createElement("span"); e.innerHTML = `<span title="${t}" aria-label="Editor select header ${t}">${t}</span>`; return e;};
                        const createHeaderTextLabelElem = (t) => {const e = document.createElement("div"); e.innerHTML = `<span aria-label="Editor select header ${t}">${t}</span>`; return e;};
                        const headerToHTML = {
                            Paragraph: [createParagraphFontTextElem("Paragraph"), createHeaderTextLabelElem("Paragraph")], 
                            H1: [createHeaderFontTextElem(36, "Heading 1"), createHeaderTextLabelElem("Heading 1")],
                            H2: [createHeaderFontTextElem(24, "Heading 2"), createHeaderTextLabelElem("Heading 2")],
                            H3: [createHeaderFontTextElem(18, "Heading 3"), createHeaderTextLabelElem("Heading 3")],
                            H4: [createHeaderFontTextElem(16, "Heading 4"), createHeaderTextLabelElem("Heading 4")],
                            H5: [createHeaderFontTextElem(14, "Heading 5"), createHeaderTextLabelElem("Heading 5")],
                            H6: [createHeaderFontTextElem(12, "Heading 6"), createHeaderTextLabelElem("Heading 6")]}
                        for (const level of ["Paragraph", "H1", "H2", "H3", "H4", "H5", "H6"]) {
                            options.push({name: level, content: headerToHTML[level][0], buttonDisplay: headerToHTML[level][1]});
                        }
                        this.menubarOptions.header = this.MimirUI.dropdownList(options, this.header.bind(this));
                        this.menubarOptions.header.list.setAttribute("id", "mimir-menubar-option-header");
                        this.menubarOptions.header.dropdown.button.setAttribute("title", "Header");
                        this.menubarOptions.header.list.setAttribute("aria-label", "Editor select header");
                        this.menubar.append(this.menubarOptions.header.list);
                        break;
                    case "align":
                        var options = [];
                        for (const direction of ["Left", "Right", "Center", "Justify"]) {
                            const newAlignOption = document.createElement("div");
                            newAlignOption.innerHTML = this.useIcons ? iconElem("align-" + direction.toLowerCase()) : direction;
                            newAlignOption.style.width = "18px";
                            newAlignOption.setAttribute("value", direction.toLowerCase());
                            newAlignOption.setAttribute("title", direction);
                            newAlignOption.setAttribute("aria-label", "Editor change alignment " + direction);
                            options.push({name: direction.toLowerCase(), content: newAlignOption});
                        }
                        this.menubarOptions.align = this.MimirUI.dropdownList(options, this.align.bind(this));
                        this.menubarOptions.align.list.setAttribute("id", "mimir-menubar-option-align");
                        this.menubarOptions.align.dropdown.button.setAttribute("title", "Alignment");
                        this.menubarOptions.align.list.setAttribute("aria-label", "Editor change alignment");
                        this.menubar.append(this.menubarOptions.align.list);
                        break;
                    case "list":
                        this.menubarOptions.listOrdered = document.createElement("button");
                        this.menubarOptions.listOrdered.setAttribute("id", "mimir-menubar-option-ordered-list");
                        this.menubarOptions.listOrdered.innerHTML = this.useIcons ? iconElem("list-ordered") : "OL";
                        this.menubarOptions.listOrdered.addEventListener("click", this.listOrdered.bind(this));
                        this.menubarOptions.listOrdered.setAttribute("title", "Ordered List");
                        this.menubarOptions.listOrdered.setAttribute("aria-label", "Editor toggle ordered list");
                        this.menubar.append(this.menubarOptions.listOrdered);
                        this.menubarOptions.listUnordered = document.createElement("button");
                        this.menubarOptions.listUnordered.setAttribute("id", "mimir-menubar-option-unordered-list");
                        this.menubarOptions.listUnordered.innerHTML = this.useIcons ? iconElem("list-unordered") : "UL";
                        this.menubarOptions.listUnordered.addEventListener("click", this.listUnordered.bind(this));
                        this.menubarOptions.listUnordered.setAttribute("title", "Unordered List");
                        this.menubarOptions.listUnordered.setAttribute("aria-label", "Editor toggle unordered list");
                        this.menubar.append(this.menubarOptions.listUnordered);
                        break;
                    case "indent":
                        this.menubarOptions.indent = document.createElement("button");
                        this.menubarOptions.indent.setAttribute("id", "mimir-menubar-option-indent");
                        this.menubarOptions.indent.innerHTML = this.useIcons ? iconElem("indent") : ">";
                        this.menubarOptions.indent.addEventListener("click", this.indent.bind(this));
                        this.menubarOptions.indent.setAttribute("title", "Indent");
                        this.menubarOptions.indent.setAttribute("aria-label", "Editor increase indent");
                        this.menubar.append(this.menubarOptions.indent);
                        break;
                    case "outdent":
                        this.menubarOptions.outdent = document.createElement("button");
                        this.menubarOptions.outdent.setAttribute("id", "mimir-menubar-option-outdent");
                        this.menubarOptions.outdent.innerHTML = this.useIcons ? iconElem("outdent") : "<";
                        this.menubarOptions.outdent.addEventListener("click", this.outdent.bind(this));
                        this.menubarOptions.outdent.setAttribute("title", "Outdent");
                        this.menubarOptions.outdent.setAttribute("aria-label", "Editor decrease indent");
                        this.menubar.append(this.menubarOptions.outdent);
                        break;
                    case "insertImage":
                        const imageButton = document.createElement("button");
                        imageButton.innerHTML = this.useIcons ? iconElem("image") : "&#128444;";
                        imageButton.classList.add("mimir-menubar-option-image-button");
                        const imageInput = this.MimirUI.imageInput(this.insertImage.bind(this), imageButton, this.imageObjectURLs);
                        this.menubarOptions.insertImage = imageInput;
                        imageInput.imageInput.setAttribute("id", "mimir-menubar-option-image");
                        imageInput.dropdown.button.setAttribute("title", "Insert Image");
                        imageInput.imageInput.setAttribute("aria-label", "Editor insert image");
                        this.menubar.append(imageInput.imageInput);
                        break;
                    case "insertHorizontalRule":
                        this.menubarOptions.hr = document.createElement("button");
                        this.menubarOptions.hr.setAttribute("id", "mimir-menubar-option-hr");
                        this.menubarOptions.hr.innerHTML = this.useIcons ? iconElem("hr") : "&#9135;";
                        this.menubarOptions.hr.addEventListener("click", this.insertHR.bind(this));
                        this.menubarOptions.hr.setAttribute("title", "Horizontal Line");
                        this.menubarOptions.hr.setAttribute("aria-label", "Editor insert horizontal line");
                        this.menubar.append(this.menubarOptions.hr);
                        break;
                    case "undo":
                        this.menubarOptions.undo = document.createElement("button");
                        this.menubarOptions.undo.setAttribute("id", "mimir-menubar-option-undo");
                        this.menubarOptions.undo.innerHTML = this.useIcons ? iconElem("undo") : "&#8630;";
                        this.menubarOptions.undo.addEventListener("click", this.undo.bind(this));
                        this.menubarOptions.undo.setAttribute("title", "Undo");
                        this.menubarOptions.undo.setAttribute("aria-label", "Editor undo");
                        this.menubar.append(this.menubarOptions.undo);
                        break;
                    case "redo":
                        this.menubarOptions.redo = document.createElement("button");
                        this.menubarOptions.redo.setAttribute("id", "mimir-menubar-option-redo");
                        this.menubarOptions.redo.innerHTML = this.useIcons ? iconElem("redo") : "&#8631;";
                        this.menubarOptions.redo.addEventListener("click", this.redo.bind(this));
                        this.menubarOptions.redo.setAttribute("title", "Redo");
                        this.menubarOptions.redo.setAttribute("aria-label", "Editor redo");
                        this.menubar.append(this.menubarOptions.redo);
                        break;
                    case "remove":
                        this.menubarOptions.remove = document.createElement("button");
                        this.menubarOptions.remove.setAttribute("id", "mimir-menubar-option-remove");
                        this.menubarOptions.remove.innerHTML = this.useIcons ? iconElem("remove") : "X";
                        this.menubarOptions.remove.addEventListener("click", this.remove.bind(this));
                        this.menubarOptions.remove.setAttribute("title", "Remove Styling");
                        this.menubarOptions.remove.setAttribute("aria-label", "Editor remove all styling");
                        this.menubar.append(this.menubarOptions.remove);
                        break;
                    case "openFindAndReplace":
                        this.menubarOptions.openFindAndReplace = document.createElement("button");
                        this.menubarOptions.openFindAndReplace.setAttribute("id", "mimir-menubar-option-open-find-and-replace");
                        this.menubarOptions.openFindAndReplace.innerHTML = this.useIcons ? iconElem("search") : "&#128270;";
                        this.menubarOptions.openFindAndReplace.addEventListener("click", this.openFindAndReplace.bind(this));
                        this.menubarOptions.openFindAndReplace.setAttribute("title", "Find and Replace");
                        this.menubarOptions.openFindAndReplace.setAttribute("aria-label", "Editor open find and replace dialog");
                        this.menubarOptions.openFindAndReplace.setAttribute("aria-haspopup", "true");
                        this.menubarOptions.openFindAndReplace.setAttribute("aria-expanded", "false");
                        this.menubar.append(this.menubarOptions.openFindAndReplace);
                        break;
                    case "zoom":
                        var options = [];
                        for (const zoomLevel of this.zoomOptions) {
                            const newZoomOption = document.createElement("div");
                            newZoomOption.innerHTML = zoomLevel + "%";
                            newZoomOption.style.width = "34px";
                            newZoomOption.setAttribute("value", zoomLevel.toLowerCase());
                            newZoomOption.setAttribute("title", zoomLevel);
                            newZoomOption.setAttribute("aria-label", "Editor adjust zoom " + zoomLevel + "%");
                            options.push({name: zoomLevel, content: newZoomOption});
                        }
                        this.menubarOptions.zoom = this.MimirUI.dropdownList(options, this.changeZoom.bind(this));
                        this.menubarOptions.zoom.list.setAttribute("id", "mimir-menubar-option-zoom");
                        this.menubarOptions.zoom.dropdown.button.setAttribute("title", "Zoom level");
                        this.menubarOptions.zoom.list.setAttribute("aria-label", "Editor change zoom");
                        this.menubarOptions.zoom.setValue("100");
                        this.menubar.append(this.menubarOptions.zoom.list);
                        break;
                }
            }
            // Add a spacer.
            if (this.menubarSettings.indexOf(group) == this.menubarSettings.length - 1) {continue;}
            const spacer = document.createElement("div");
            spacer.classList.add("mimir-menubar-spacer");
            this.menubar.append(spacer);
        }
    }

    /*
    Check if the node is at the beginning of another predicate (is first child).
    */
    isAtBeginning(node, predicate) {
        while (!predicate(node)) {
            if (node.parentNode && this.inEditor(node.parentNode) && node.parentNode.firstChild == node) {
                node = node.parentNode;
            } else {
                return false;
            }
        }
        return true;
    }

    /*
    Check if the node is at the end of another predicate (is last child).
    */
    isAtEnd(node, predicate) {
        while (!predicate(node)) {
            if (node.parentNode && this.inEditor(node.parentNode) && node.parentNode.lastChild == node) {
                node = node.parentNode;
            } else {
                return false;
            }
        }
        return true;
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
            } else if (e.key.toLowerCase() == "a" && (e.ctrlKey || e.metaKey)) {
                // Select all. For some reason, Chrome is really slow with 
                // Ctrl-A, and I've found that a way to speed it up is to reset
                // innerHTML. Just need to remember to invalidate rangeCache and 
                // currentCursor.
                this.rangeCache = null;
                if (this.currentCursor) {
                    // Traverse up the tree until we find the highest empty node and remove the cursor.
                    var currentNode = this.currentCursor;
                    while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode) && (this.inlineStylingTags.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                        currentNode = currentNode.parentNode;
                    }

                    const previousSibling = this.leftSiblingIgnoreEmpty(currentNode);
                    const nextSibling = this.rightSiblingIgnoreEmpty(currentNode);
                    // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                    if (this.blockTags.includes(currentNode.parentNode.tagName) && this.isEmpty(currentNode.parentNode) && !this.childlessTags.includes(currentNode.parentNode.tagName)) {
                        currentNode.before(document.createElement("BR"));
                    } else if ((previousSibling && this.blockTags.includes(previousSibling.tagName) && (!nextSibling || this.blockTags.includes(nextSibling.tagName)))
                            || (nextSibling && this.blockTags.includes(nextSibling.tagName) && (!previousSibling || this.blockTags.includes(previousSibling.tagName)))) {
                        // If the next sibling or previous sibling is a BR, remove it.
                        if (nextSibling && nextSibling.tagName == "BR") {
                            nextSibling.remove();
                        }
                        if (previousSibling && previousSibling.tagName == "BR") {
                            previousSibling.remove();
                        }
                        
                        // If the current node is surrounded by blocks, insert a DIV with a BR (new paragraph).
                        const newDiv = document.createElement("div");
                        newDiv.append(document.createElement("br"));
                        currentNode.before(newDiv);
                    }
                    currentNode.remove();
                    this.currentCursor = null;
                }
                this.editor.innerHTML = this.editor.innerHTML;
                return;
            } else if (e.key.toLowerCase() == "f" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.openFindAndReplace();
                return;
            }

            if (e.key == "Enter") {
                // Enter key pressed, save history.
                this.saveHistory();
                this.shouldTakeSnapshotOnNextChange = true;
            }

            if (e.key == "Tab") {
                // Tab key, insert a tab.
                e.preventDefault();
                this.insertTab();
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
                    while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode) && (this.inlineStylingTags.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                        currentNode = currentNode.parentNode;
                    }
                    const previousSibling = this.leftSiblingIgnoreEmpty(currentNode);
                    const nextSibling = this.rightSiblingIgnoreEmpty(currentNode);
                    // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                    if (this.blockTags.includes(currentNode.parentNode.tagName) && this.isEmpty(currentNode.parentNode) && !this.childlessTags.includes(currentNode.parentNode.tagName)) {
                        currentNode.before(document.createElement("BR"));
                    } else if ((previousSibling && this.blockTags.includes(previousSibling.tagName) && (!nextSibling || this.blockTags.includes(nextSibling.tagName)))
                            || (nextSibling && this.blockTags.includes(nextSibling.tagName) && (!previousSibling || this.blockTags.includes(previousSibling.tagName)))) {
                        // If the next sibling or previous sibling is a BR, remove it.
                        if (nextSibling && nextSibling.tagName == "BR") {
                            nextSibling.remove();
                        }
                        if (previousSibling && previousSibling.tagName == "BR") {
                            previousSibling.remove();
                        }
                        
                        // If the current node is surrounded by blocks, insert a DIV with a BR (new paragraph).
                        const newDiv = document.createElement("div");
                        newDiv.append(document.createElement("br"));
                        currentNode.before(newDiv);
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
                    if ((range.startOffset == 0 && range.endOffset >= endLength && !(range.startOffset == range.endOffset && range.startContainer == range.endContainer) && e.key != "ArrowLeft") 
                            || (e.key == "Backspace" && range.commonAncestorContainer.textContent.length == 1 && range.endOffset >= 1)
                            || (e.key == "Delete" && range.commonAncestorContainer.textContent.length == 1 && range.endOffset == 0)) {
                        e.preventDefault();

                        if (range.startOffset == 0 && range.endOffset >= endLength && !(range.startOffset == range.endOffset && range.startContainer == range.endContainer)) {
                            // Handle deleting entire regions of text.

                            // Get the current styling.
                            const contents = range.extractContents(); // Extract the contents here so the only styles we track are the ones directly in the range.
                            if (this.imageModule.getSelected()) this.imageModule.deselect();
                            const nodes = [];
                            const walker = document.createTreeWalker(contents, NodeFilter.SHOW_TEXT);
                            while (walker.nextNode()) {
                                nodes.push(walker.currentNode);
                            }
                            if (nodes.length == 0) {return;}

                            const styling = [];
                            var firstNode = true;
                            for (const node of nodes) {
                                // If the node is empty, don't count it.
                                if (node.nodeType == Node.TEXT_NODE && node.textContent == "") {
                                    continue;
                                }
                    
                                // Traverse up the tree and track each style node passed on the way up.
                                var currentNode = node.parentNode;
                                var nodeStyling = [];
                                while (currentNode != contents) {
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

                            // Wait, handle special cases for lists.
                            if (["UL", "OL"].includes(range.startContainer.tagName) && range.startContainer == range.endContainer) {
                                if (this.isEmptyOrLineBreak(contents)) {
                                    // If there was nothing there, remove the list entirely.
                                    cursor = this.createCursor();
                                    range.startContainer.after(cursor);
                                    range.startContainer.remove();
                                    if (this.isEmpty(cursor.parentNode)) {
                                        cursor.append(document.createElement("br"));
                                    }
                                } else {
                                    const lis = range.startContainer.querySelectorAll("li");
                                    if (lis.length == 2) {
                                        // Remove the second one, place the cursor in the first.
                                        lis[1].remove();
                                        lis[0].append(lastNode);
                                    } else if (lis.length == 1) {
                                        lis[0].append(lastNode);
                                    }
                                }
                            } else {
                                range.insertNode(lastNode);
                            }

                            const newRange = new Range();
                            newRange.selectNodeContents(cursor);
                            newRange.collapse();
                            document.getSelection().removeAllRanges();
                            document.getSelection().addRange(newRange);
                            this.updateMenubarOptions();
                            return;
                        }

                        // Get the current styling.
                        const firstNodeRange = new Range();
                        const {nodes, startOffset, endOffset} = this.getTextNodesInRange(range);
                        if (nodes.length == 0) {return;}
                        firstNodeRange.selectNode(nodes[0]);
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
                        range.startContainer.textContent = "";
                        if (this.imageModule.getSelected()) this.imageModule.deselect();

                        // Insert the node at the current range and place the caret inside the cursor.
                        if (range.startContainer.nodeType == Node.TEXT_NODE) {
                            // Split the text node.
                            var placeAfter = range.startContainer;
                            if ((placeAfter.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(placeAfter.tagName) || placeAfter.tagName == "SPAN")) || (this.inlineStylingTags.includes(placeAfter.parentNode.tagName) || placeAfter.parentNode.tagName == "SPAN")) {
                                // Escape out of any styling nodes.
                                placeAfter = this.findLastParent(placeAfter, e => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN"));
                            }
                            // Split placeAfter at the startContainer node (if they are not the same node) and place in the cursor in between them.
                            if (range.startContainer != placeAfter) {
                                const splitAfterNode = this.splitNodeAtChild(placeAfter, range.startContainer);
                                placeAfter.after(lastNode, splitAfterNode);
                                if (this.isEmpty(splitAfterNode) && splitAfterNode != this.editor) {splitAfterNode.remove();}
                            } else {
                                placeAfter.after(lastNode);
                            }
                            if (placeAfter && this.isEmpty(placeAfter) && placeAfter != this.editor) placeAfter.remove();
                        } else {
                            // Place the node inside.
                            if (range.startContainer == this.editor) {
                                range.startContainer.prepend(lastNode);
                            } else {
                                var placeAfter = range.startContainer;
                                if ((placeAfter.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(placeAfter.tagName) || placeAfter.tagName == "SPAN")) || (this.inlineStylingTags.includes(placeAfter.parentNode.tagName) || placeAfter.parentNode.tagName == "SPAN")) {
                                    // Escape out of any styling nodes.
                                    placeAfter = this.findLastParent(placeAfter, e => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN"));
                                }
                                // Split placeAfter at the startContainer node (if they are not the same node) and place in the cursor in between them.
                                if (range.startContainer != placeAfter) {
                                    const splitAfterNode = this.splitNodeAtChild(placeAfter, range.startContainer);
                                    placeAfter.after(lastNode, splitAfterNode);
                                    if (this.isEmpty(splitAfterNode) && splitAfterNode != this.editor) {splitAfterNode.remove();}
                                } else {
                                    placeAfter.after(lastNode);
                                }
                                if (placeAfter && this.isEmpty(placeAfter) && placeAfter != this.editor) placeAfter.remove();
                            }
                        }

                        const newRange = new Range();
                        newRange.selectNodeContents(cursor);
                        newRange.collapse();
                        document.getSelection().removeAllRanges();
                        document.getSelection().addRange(newRange);
                        // this.scrollTextNodeIntoView(cursor);
                    }
                }
                this.updateMenubarOptions();
            }

            if (e.key.length == 1 && !e.ctrlKey && !e.metaKey) {
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
                    // this.scrollTextNodeIntoView(newTextNode);

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
            this.editor.dispatchEvent(new Event("mimiredited"));

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
                var didEscape = this.handleEscapeBlockquote(e);
                didEscape |= this.handleEscapeLists(e);
                if (!didEscape) this.handleEscapeCursorParagraph(e);
            } else if ((e.inputType == "insertText" || e.inputType.startsWith("deleteContent")) && !e.key) {
                this.removeCursor();
            }
        }.bind(this));
    }

    /*
    Handle escaping out of blockquote elements.
    */
    handleEscapeBlockquote(e) {
        // Find the topmost block container. We split out of extraneous DIVs.
        var container = this.getRange()?.commonAncestorContainer;
        while (!this.blockTags.includes(container.tagName) && this.inEditor(container)) {
            container = container.parentNode;
        }
        if (container.tagName == "DIV" || container.tagName == "P" || container.tagName == "BR") {
            // See W3 bug 13841.
            var outerContainer = container;
            while (outerContainer.tagName != "BLOCKQUOTE" && this.inEditor(outerContainer.parentNode)) {outerContainer = outerContainer.parentNode};
            if (outerContainer.tagName == "BLOCKQUOTE") {container = outerContainer;}
        }

        // If the outermost container is a BLOCKQUOTE and it is empty, escape out of it,
        if (container.tagName == "BLOCKQUOTE" && (this.isEmptyOrLineBreak(container))) {
            e.preventDefault();
            const newDiv = document.createElement("div");
            newDiv.append(...container.childNodes);
            container.after(newDiv);
            container.remove();
            container = newDiv;
            if (this.currentCursor && newDiv.contains(this.currentCursor)) {
                const range = new Range();
                range.selectNodeContents(this.currentCursor);
                range.collapse();
                document.getSelection().removeAllRanges();
                document.getSelection().addRange(range);
                return true;
            }
            const range = new Range();
            range.setStart(container, 0);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(range);
            // container.scrollIntoView(false);
            return true;
        }
        return false;
    }

    /*
    Handle escaping out of lists.
    */
    handleEscapeLists(e) {
        // Handles a specific Chrome bug where inserting a paragraph at the end of a nested list creates a OL/UL element directly within another OL/UL. Note that this does not occur in Mozilla UAs.
        // This overrides the standard contentEditable insertParagraph only when the user is pressing enter within an empty list element.
            
        // Find the topmost block container. We split out of extraneous DIVs.
        var container = this.getRange()?.commonAncestorContainer;
        while (!this.blockTags.includes(container.tagName) && this.inEditor(container)) {
            container = container.parentNode;
        }
        if (container.tagName == "DIV" || container.tagName == "P" || container.tagName == "BR") {
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
                if (container.parentNode.tagName == "LI") {
                    // Split the container into its parent.
                    const nodesAfterContainer = Array.from(container.parentNode.childNodes).slice(Array.from(container.parentNode.childNodes).indexOf(container) + 1, container.parentNode.childNodes.length);
                    container.parentNode.after(container, ...nodesAfterContainer);
                    if (container.previousSibling && this.isEmpty(container.previousSibling)) {
                        container.previousSibling.remove();
                    }
                } else {
                    const newDiv = document.createElement("div");
                    newDiv.append(...container.childNodes);
                    container.after(newDiv);
                    container.remove();
                    container = newDiv;
                }
            }
            
            if (this.currentCursor && container.contains(this.currentCursor)) {
                const range = new Range();
                range.selectNodeContents(this.currentCursor);
                range.collapse();
                document.getSelection().removeAllRanges();
                document.getSelection().addRange(range);
                return true;
            }
            const range = new Range();
            range.setStart(container, 0);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(range);
            // container.scrollIntoView(false);
            return true;
        }
        return false;
    }

    /*
    Get all inline siblings after a node.
    */
    inlineSiblingsAfterNode(n) {
        const s = [];
        while (n.nextSibling && !this.blockTags.includes(n.tagName)) {
            n = n.nextSibling;
            s.push(n);
        }
        return s;
    }

    /*
    Get all inline siblings before a node.
    */
    inlineSiblingsBeforeNode(n) {
        const s = [];
        while (n.previousSibling && !this.blockTags.includes(n.tagName)) {
            n = n.previousSibling;
            s.push(n);
        }
        return s;
    }

    /*
    Handle escaping a cursor on a paragraph.
    */
    handleEscapeCursorParagraph(e) {
        const range = this.getRange();
        if (!range) {return false;}
        if (!(this.currentCursor && this.currentCursor.contains(range.commonAncestorContainer))) {return false;}
        e.preventDefault();
        // Find the topmost block container. We split out of extraneous DIVs.
        var container = range.commonAncestorContainer;
        // Here, we look for the node to split. We want to split out of all extraneous nodes and single-line containers, but we stop at the first list we encounter.
        var lastBlock = null;
        var lastNode = null;
        while (!["LI"].includes(container.tagName) && this.inEditor(container) && container != this.editor) {
            lastNode = container;
            container = container.parentNode;
            if (this.blockTags.includes(container.tagName) && container != this.editor) {lastBlock = container;}
        }

        if (container == this.editor) {
            if (!lastBlock) {
                if (lastNode == this.currentCursor) {
                    // Last node is current cursor, so just place current cursor in a DIV.
                    const newDiv = document.createElement("div");
                    this.currentCursor.after(newDiv);
                    newDiv.append(this.currentCursor);
                    const newRange = new Range();
                    newRange.selectNodeContents(this.currentCursor);
                    newRange.collapse();
                    document.getSelection().removeAllRanges();
                    document.getSelection().addRange(newRange);
                    return true;
                }

                // Split the last node and insert the new split in a DIV. Insert all inline nodes after the cursor into a DIV.
                const afterCursor = this.splitNodeAtChild(lastNode, this.currentCursor, true);
                const inlineSiblings = this.inlineSiblingsAfterNode(lastNode);
                const newDiv = document.createElement("div");
                newDiv.append(afterCursor, ...inlineSiblings);
                lastNode.after(newDiv);
                const divForLastNode = document.createElement("div");
                lastNode.after(divForLastNode);
                divForLastNode.append(lastNode, ...this.inlineSiblingsBeforeNode(lastNode));
                if (this.isEmpty(divForLastNode)) {
                    // Handle empty last node.
                    var lastChild = divForLastNode;
                    while (lastChild.lastChild && !this.childlessTags.includes(lastChild.lastChild.tagName) && lastChild.lastChild.nodeType == Node.ELEMENT_NODE) {lastChild = lastChild.lastChild};
                    lastChild.append(document.createElement("br"));
                }
                const newRange = new Range();
                newRange.selectNodeContents(this.currentCursor);
                newRange.collapse();
                document.getSelection().removeAllRanges();
                document.getSelection().addRange(newRange);
                return true;
            }
            // We didn't find any lists. Split the last block.
            const afterCursor = this.splitNodeAtChild(lastBlock, this.currentCursor, true);
            lastBlock.after(afterCursor);

            // Insert a BR to the previous block.
            if (this.isEmpty(lastBlock)) {
                var lastChild = lastBlock;
                while (lastChild.lastChild && !this.childlessTags.includes(lastChild.lastChild.tagName) && lastChild.lastChild.nodeType == Node.ELEMENT_NODE) {lastChild = lastChild.lastChild};
                lastChild.append(document.createElement("br"));
            }
            
            // Set the cursor.
            const newRange = new Range();
            newRange.selectNodeContents(this.currentCursor);
            newRange.collapse();
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            return true;
        }

        // Split.
        const afterCursor = this.splitNodeAtChild(container, this.currentCursor, true);
        container.after(afterCursor);

        // Insert a BR to the previous block.
        if (this.isEmpty(container)) {
            var lastChild = container;
            while (lastChild.lastChild && !this.childlessTags.includes(lastChild.lastChild.tagName) && lastChild.lastChild.nodeType == Node.ELEMENT_NODE) {lastChild = lastChild.lastChild};
            lastChild.append(document.createElement("br"));
        }

        // Set the cursor.
        const newRange = new Range();
        newRange.selectNodeContents(this.currentCursor);
        newRange.collapse();
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
        return true;
    }

    /*
    Remove the cursor.
    */
    removeCursor(insertBrIfNeeded = true) {
        const range = this.getRange();
        if (this.currentCursor && this.currentCursor.contains(range.commonAncestorContainer)) {
            // Traverse up the tree until we find the highest empty node and remove the cursor.
            var currentNode = this.currentCursor;
            while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode) && (this.inlineStylingTags.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                currentNode = currentNode.parentNode;
            }
            // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
            if (insertBrIfNeeded) {
                const previousSibling = this.leftSiblingIgnoreEmpty(currentNode);
                const nextSibling = this.rightSiblingIgnoreEmpty(currentNode);
                // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                if (this.blockTags.includes(currentNode.parentNode.tagName) && this.isEmpty(currentNode.parentNode) && !this.childlessTags.includes(currentNode.parentNode.tagName)) {
                    currentNode.before(document.createElement("BR"));
                } else if ((previousSibling && this.blockTags.includes(previousSibling.tagName) && (!nextSibling || this.blockTags.includes(nextSibling.tagName)))
                        || (nextSibling && this.blockTags.includes(nextSibling.tagName) && (!previousSibling || this.blockTags.includes(previousSibling.tagName)))) {
                    // If the next sibling or previous sibling is a BR, remove it.
                    if (nextSibling && nextSibling.tagName == "BR") {
                        nextSibling.remove();
                    }
                    if (previousSibling && previousSibling.tagName == "BR") {
                        previousSibling.remove();
                    }
                    
                    // If the current node is surrounded by blocks, insert a DIV with a BR (new paragraph).
                    const newDiv = document.createElement("div");
                    newDiv.append(document.createElement("br"));
                    currentNode.before(newDiv);
                }
            }
            currentNode.remove();
            this.currentCursor = null;
            this.updateMenubarOptions();
        }
    }

    /*
    Handle ctrl-clicking on links.
    */
    handleClickLink(target) {
        const nearestLink = this.findClosestParent(target, (n) => n.tagName == "A");
        if (!nearestLink) {
            return;
        }
        const url = nearestLink.getAttribute("href");
        if (!url) {
            return;
        }
        window.open(url);
    }

    /*
    Bind click events.
    */
    bindClickEvents() {
        this.editor.addEventListener("click", function(e) {
            // Allow for ctrl-clicking on links.
            if (e.ctrlKey) {
                this.handleClickLink(e.target);
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
    Left sibling of node.
    */
    leftSibling(node) {
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode.previousSibling) {return currentNode.previousSibling};
            currentNode = currentNode.parentNode;
        }
        return null;
    }

    /*
    Right sibling of node.
    */
    rightSibling(node) {
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode.nextSibling) {return currentNode.nextSibling};
            currentNode = currentNode.parentNode;
        }
        return null;
    }

    /*
    Left sibling of node, ignoring empty nodes.
    */
    leftSiblingIgnoreEmpty(node) {
        var currentNode = node.previousSibling;
        while (currentNode && this.isEmpty(currentNode)) {
            currentNode = currentNode.previousSibling;
        }
        return currentNode;
    }

    /*
    Right sibling of node, ignoring empty nodes.
    */
    rightSiblingIgnoreEmpty(node) {
        var currentNode = node.nextSibling;
        while (currentNode && this.isEmpty(currentNode)) {
            currentNode = currentNode.nextSibling;
        }
        return currentNode;
    }

    /*
    Reconstruct a node's children.
    */
    reconstructNodeContents(node, parent, cachedInlineBlockStyles, removeExtraneousWhitespace = true, ignoreList = null) {
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

                // Set attributes.
                if (child.nodeType == Node.ELEMENT_NODE) {
                    var oldChild = child;
                    child = document.createElement(oldChild.tagName);
                    if (oldChild.tagName == "IMG") {
                        // Source attribute. If needed, convert data URLs into object URLs.
                        if (oldChild.getAttribute("src")) {
                            var src = oldChild.getAttribute("src");
                            if (src.toLowerCase().startsWith("http") || src.toLowerCase().startsWith("blob")) {
                                child.setAttribute("src", src);
                            } else if (src.toLowerCase().startsWith("data")) {
                                var mime = src.split(',')[0].split(':')[1].split(';')[0];
                                var binary = atob(src.split(',')[1]);
                                var array = [];
                                for (var i = 0; i < binary.length; i++) {
                                    array.push(binary.charCodeAt(i));
                                }
                                const blob = new Blob([new Uint8Array(array)], {type: mime});
                                src = URL.createObjectURL(blob);
                                child.setAttribute("src", src);
                                this.imageObjectURLs.push(src);
                            }
                        }

                        // Alt text.
                        if (oldChild.getAttribute("alt")) {
                            child.setAttribute("alt", oldChild.getAttribute("alt"));
                        }

                        // Width/height.
                        if (oldChild.getAttribute("width")) {
                            child.style.width = oldChild.getAttribute("width") + "px";
                        } else if (oldChild.style.width) {
                            child.style.width = oldChild.style.width;
                        }
                        if (oldChild.getAttribute("height")) {
                            child.style.height = oldChild.getAttribute("height") + "px";
                        } else if (oldChild.style.height) {
                            child.style.height = oldChild.style.height;
                        }
                    }
                }

                if (removeExtraneousWhitespace) {
                    // See https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace.
                    if (child.nodeType == Node.TEXT_NODE) {
                        // Collapse whitespace down into single spaces.
                        child.textContent = child.textContent.replace(/[\t\n\r ]+/g, " ");

                        if ((child.textContent.split(" ").join("") == "")) {
                            // Only trim whitespace on the edges if the node is just whitespace.
                            if (child.textContent[0] == " ") {
                                child.textContent = child.textContent.slice(1, child.textContent.length);
                            }
                            if (child.textContent[child.textContent.length - 1] == " ") {
                                child.textContent = child.textContent.slice(0, child.textContent.length - 1);
                            }
                        }
                        
                        if (child.textContent == "") {
                            continue;
                        }

                        // Trim whitespace on left. Only trim if the node on the left ends with a space.
                        // const leftSibling = this.leftSibling(child);
                        // const rightSibling = this.rightSibling(child);
                        // if (child.textContent[0] == " " && leftSibling && leftSibling.textContent.endsWith(" ")) {
                        //     child.textContent = child.textContent.slice(1, child.textContent.length);
                        // }
                        // if (child.textContent[child.textContent.length - 1] == " " && rightSibling && rightSibling.textContent.startsWith(" ")) {
                        //     child.textContent = child.textContent.slice(0, child.textContent.length - 1);
                        // }

                        // Sequences at the beginning and end of an element are removed.
                        if (!child.previousSibling) {
                            if (child.textContent[0] == " ") {
                                child.textContent = child.textContent.slice(1, child.textContent.length);
                            }
                        } else if (!child.nextSibling) {
                            if (child.textContent[child.textContent.length - 1] == " ") {
                                child.textContent = child.textContent.slice(0, child.textContent.length - 1);
                            }
                        }
                    }

                    // Reconstruct the styling.
                    child = this.addStylingToNode(child.cloneNode(), styling);

                    // Append the newly reconstructed node.
                    reconstructed.push(child);
                } else {
                    // Replace all line breaks with break nodes.
                    if (child.nodeType == Node.TEXT_NODE) {
                        const lines = child.textContent.split(/\r?\n|\r|\n/g);

                        var newTextNode = this.addStylingToNode(document.createTextNode(lines[0]), styling);
                        if (newTextNode.textContent != "") reconstructed.push(newTextNode);

                        for (const line of lines.slice(1)) {
                            const newBrNode = document.createElement("br");
                            newTextNode = this.addStylingToNode(document.createTextNode(line), styling);
                            if (newTextNode.textContent != "") {
                                reconstructed.push(newBrNode, newTextNode);
                            } else {
                                reconstructed.push(newBrNode);
                            }
                        }
                    } else {
                        child = this.addStylingToNode(child, styling);
                        reconstructed.push(child);
                    }
                }
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                if (ignoreList && ignoreList.includes(child.tagName)) {
                    continue;
                }

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
                    var newNode = document.createElement("div");

                    // Reconstruct the node's children.
                    const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);

                    // Append the newly reconstructed nodes.
                    newNode.append(...reconstructedChildren);

                    // If the node was a simple indenting node, apply the node style (simple indenting isn't a inline block style, which is why its added here).
                    if (child.style.marginLeft || child.style.paddingLeft) {
                        const value = child.style.marginLeft ? child.style.marginLeft : child.style.paddingLeft;
                        if (value.toLowerCase().endsWith("px")) {
                            const pixels = parseInt(value.slice(0, -2));
                            const numIndents = Math.ceil(pixels / 40);
                            // Wrap the element.
                            for (var i = 0; i < numIndents; i++) {
                                const newIndent = document.createElement("div");
                                newIndent.style.marginLeft = "40px";
                                newIndent.append(newNode);
                                newNode = newIndent;
                            }
                        }
                    }

                    reconstructed.push(newNode);

                    // Add this node to the list of cached inline block styles.
                    cachedInlineBlockStyles.push({node: newNode, inlineBlockStyling: this.getStylingOfElement(child).filter(s => this.inlineBlockStylingCommands.includes(s.type))});
                    continue;
                }

                // If this tag is a styling/illegal tag, ignore it but parse its children.
                if (!this.basicAllowedTags.includes(child.tagName)) {
                    // Reconstruct the node's children.
                    const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);

                    const blockTags = "address, article, aside, blockquote, canvas, dd, div, dl, dt, tr, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, noscript, ol, p, pre, section, table, tfoot, ul, video".toUpperCase().split(", ");

                    // If the node was a simple indenting node, apply the node style (simple indenting isn't a inline block style, which is why its added here).
                    // Also handle block tags.
                    if (blockTags.includes(child.tagName.toUpperCase())) {
                        var newNode = document.createElement("div");
                        newNode.append(...reconstructedChildren);
                        const value = child.style.marginLeft ? child.style.marginLeft : child.style.paddingLeft;
                        if (value && value.toLowerCase().endsWith("px")) {
                            const pixels = parseInt(value.slice(0, -2));
                            const numIndents = Math.ceil(pixels / 40);
                            // Wrap the element.
                            for (var i = 0; i < numIndents; i++) {
                                const newIndent = document.createElement("div");
                                newIndent.style.marginLeft = "40px";
                                newIndent.append(newNode);
                                newNode = newIndent;
                            }
                        }
                        // Append the newly reconstructed nodes.
                        reconstructed.push(newNode);
                        continue;
                    }

                    // Append the newly reconstructed nodes.
                    reconstructed.push(...reconstructedChildren);
                    continue;
                }

                // Clone the node without any attributes.
                var newNode = document.createElement(child.tagName);

                // Add this node to the list of cached inline block styles.
                const inlineBlockStyling = this.getStylingOfElement(child).filter(s => this.inlineBlockStylingCommands.includes(s.type));
                if (inlineBlockStyling.length != 0 && this.blockTags.includes(newNode.tagName)) {
                    cachedInlineBlockStyles.push({node: newNode, inlineBlockStyling: inlineBlockStyling});
                }

                // Add any important attributes.
                if (child.tagName == "A" && child.getAttribute("href")) {
                    if (child.getAttribute("href").trim().substring(0, 11).toLowerCase() !== "javascript:") {
                        newNode.setAttribute("href", child.getAttribute("href"));
                    }
                }

                // Reconstruct the node's children.
                const reconstructedChildren = this.reconstructNodeContents(child, parent, cachedInlineBlockStyles, removeExtraneousWhitespaceOnChildren);
                newNode.append(...reconstructedChildren);

                // If the node was a LI node, apply the node's list style.
                if (child.tagName == "LI" && child.style.listStyleType) {
                    newNode.style.listStyleType = child.style.listStyleType;
                }
                if (child.tagName == "LI" && child.style.listStyle && child.style.listStyle.split(" ").length > 0) {
                    newNode.style.listStyleType = child.style.listStyle.split(" ")[0];
                }
                if (["UL", "OL"].includes(child.tagName) && child.style.listStyleType) {
                    reconstructedChildren.forEach((c) => {c.style.listStyleType = child.style.listStyleType});
                }
                if (["UL", "OL"].includes(child.tagName) && child.style.listStyle && child.style.listStyle.split(" ").length > 0) {
                    const listStyle = child.style.listStyle.split(" ")[0];
                    reconstructedChildren.forEach((c) => {c.style.listStyleType = listStyle});
                }

                // If the node was a simple indenting node, apply the node style (simple indenting isn't a inline block style, which is why its added here).
                if (child.style.marginLeft || child.style.paddingLeft) {
                    const value = child.style.marginLeft ? child.style.marginLeft : child.style.paddingLeft;
                    if (value.toLowerCase().endsWith("px")) {
                        const pixels = parseInt(value.slice(0, -2));
                        const numIndents = Math.ceil(pixels / 40);
                        // Wrap the element.
                        for (var i = 0; i < numIndents; i++) {
                            const newIndent = document.createElement("div");
                            newIndent.style.marginLeft = "40px";
                            newIndent.append(newNode);
                            newNode = newIndent;
                        }
                    }
                }

                // Append the newly reconstructed node.
                reconstructed.push(newNode);
            }
        }

        return reconstructed;
    }

    /*
    Sanitize and reconstruct HTML data.
    */
    sanitize(contents, ignoreList = null) {
        // Place the data into a temporary node.
        const original = document.createElement("div");
        original.innerHTML = contents;

        // Reconstruct the node.
        const cachedInlineBlockStyles = [];
        const reconstructed = this.reconstructNodeContents(original, original, cachedInlineBlockStyles, true, ignoreList);

        // Remove trailing and leading whitespace nodes.
        const withoutWhitespace = [];
        for (const node of reconstructed) {
            // Remove beginning and trailing whitespace.
            if (reconstructed.indexOf(node) == 0 || reconstructed.indexOf(node) == reconstructed.length - 1) {
                if (node.nodeType == Node.TEXT_NODE && node.textContent.split("\n").join("").split("\r").join("").split(" ").join("") == "") {
                    continue;
                }
            }
            withoutWhitespace.push(node);
        }

        // Place the nodes inside a document fragment so that styles can be easily applied.
        const fragment = document.createDocumentFragment();
        fragment.append(...withoutWhitespace);

        // Apply each cached inline block style.
        for (const inlineBlockPair of cachedInlineBlockStyles) {
            if (!fragment.contains(inlineBlockPair.node)) {
                continue;
            }

            for (const style of inlineBlockPair.inlineBlockStyling) {
                var lastStyled = null;
                var joinNext = null;

                // Fix disallowed children of the node.
                const fixedNodes = [];
                if (style.type == "header") {
                    // For headers, disallowed children are all types of multi-line blocks and header tags as well.
                    var disallowedChildren = "blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6, div, p";
                } else if (this.inlineBlockStylingCommands.includes(style.type)) {
                    // For alignment and other types of inline block styling commands, disallowed children are all types of multi-line blocks, but not headers.
                    var disallowedChildren = "blockquote, ul, ol, li, div, p";
                }
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
                    // Sort the inline block styling so that the header styling is always on the inside.
                    const oldNode = node;
                    const toJoinNext = node.nextSibling;
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
    
                    // Join the nodes.
                    if (lastStyled && lastStyled.nextSibling == node && !this.blockTags.filter(t => t != "BR").includes(oldNode.tagName) && joinNext == oldNode) {
                        lastStyled.append(...node.childNodes);
                        node.remove();
                    } else {
                        lastStyled = node;
                    }
                    joinNext = toJoinNext;
                }
            }
        }

        // Remove extraneous DIV/P nodes.
        const divs = fragment.querySelectorAll("div, p");
        const extraneous = [];
        for (const div of divs) {
            if (!div.getAttribute("style") && Array.from(div.childNodes).every((n) => (this.blockTags.filter((t) => t != "BR").includes(n.tagName) || n.textContent == ""))) {
                extraneous.push(div);
            }
        }
        for (const div of extraneous) {
            div.after(...div.childNodes);
            div.remove();
        }

        return Array.from(fragment.childNodes);
    }

    /*
    Scroll a text node into view.
    */
    scrollTextNodeIntoView(node) {
        const a = document.createElement("a");
        a.innerHTML = " ";
        node.after(a);
        a.scrollIntoView({block: 'start'});
        a.remove();
    }

    /*
    Insert a tab.
    */
    insertTab() {
        const range = this.getRange();
        if (!range) {
            return;
        }
        
        this.editor.dispatchEvent(new Event("mimiredited"));
        if (this.currentCursor && this.currentCursor.contains(range.commonAncestorContainer)) {
            const tabNode = document.createTextNode("\t");
            this.currentCursor.after(tabNode);
            this.currentCursor.remove();
            this.currentCursor = null;

            const newRange = new Range();
            newRange.selectNodeContents(tabNode);
            newRange.collapse(false);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
            // this.scrollTextNodeIntoView(tabNode);
            return;
        }

        range.deleteContents();
        if (this.imageModule.getSelected()) this.imageModule.deselect();
        const tabNode = document.createTextNode("\t");

        // Never insert nodes into childless nodes.
        if (this.childlessTags.includes(range.commonAncestorContainer)) {
            range.commonAncestorContainer.after(tabNode);
            range.commonAncestorContainer.remove();
            const newRange = new Range();
            newRange.selectNodeContents(tabNode);
            newRange.collapse(false);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(newRange);
            // this.scrollTextNodeIntoView(tabNode);
            return;
        }

        // Insert the tab.
        if (this.isEmptyOrLineBreak(range.commonAncestorContainer)) {
            // Remove the line break.
            const br = range.commonAncestorContainer.querySelector("br");
            if (br) {
                br.replaceWith(tabNode);
                const newRange = new Range();
                newRange.selectNodeContents(tabNode);
                newRange.collapse(false);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);
                // this.scrollTextNodeIntoView(tabNode);
                return;
            }
        }

        range.insertNode(tabNode);

        const newRange = new Range();
        newRange.selectNodeContents(tabNode);
        newRange.collapse(false);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(newRange);
        // this.scrollTextNodeIntoView(tabNode);
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
    insertHTML(startNode, data, select = "end", nodesToInsert = null, ignoreList = null) {
        if (data) {
            // Reconstruct the data.
            var reconstructed = this.sanitize(data, ignoreList);
            if (reconstructed.length == 0) {
                return;
            }
        } else if (nodesToInsert) {
            var reconstructed = nodesToInsert;
        } else {
            return;
        }

        // If the only content node in the HTML is an img, select it.
        if (reconstructed.length == 1 && reconstructed[0].textContent == "") {
            if (reconstructed[0].tagName == "IMG") {
                select = null;
                this.onNodeDrawn(reconstructed[0], function() {this.imageModule.select(reconstructed[0])}.bind(this));
            }
            const contentTagsInReconstructed = reconstructed[0].querySelectorAll(this.contentTags.join(", "));
            if ((contentTagsInReconstructed.length == 1 && contentTagsInReconstructed[0].tagName == "IMG")) {
                select = null;
                this.onNodeDrawn(contentTagsInReconstructed[0], function() {this.imageModule.select(contentTagsInReconstructed[0])}.bind(this));
            }
        }

        // Add each node.
        var currentLastNode = startNode;
        var firstNode = null;
        for (var node of reconstructed) {
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
                if (node.tagName == "BR") {
                    const wrapperDiv = document.createElement("div");
                    wrapperDiv.append(node);
                    node = wrapperDiv;
                }
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
        } else if (select == "all") {
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
            this.editor.dispatchEvent(new Event("mimiredited"));
            this.saveHistory();
            this.imageModule.deselect();
            this.removeCursor(false);

            // Paste HTML data.
            if (e.clipboardData.getData("text/html") && this.allowPasteHTML) {
                e.preventDefault();

                const range = this.getRange();
                if (range == null) {
                    return;
                }

                range.deleteContents();
                if (this.imageModule.getSelected()) this.imageModule.deselect();

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
            this.editor.dispatchEvent(new Event("mimiredited"));
            this.saveHistory();
            this.imageModule.deselect();
            this.removeCursor(false);

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
                            if (endOffset >= sliceOffset) {
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
                    if (this.imageModule.getSelected()) this.imageModule.deselect();
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
                this.menubarOptions.font.setValue(styling.find(s => s.type == "font") ? styling.find(s => s.type == "font").family : "");
                continue;
            }

            if (option == "header") {
                this.menubarOptions.header.setValue(styling.find(s => s.type == "header") ? styling.find(s => s.type == "header").level : "Paragraph");
                continue;
            }

            if (option == "align") {
                this.menubarOptions.align.setValue(styling.find(s => s.type == "align") ? styling.find(s => s.type == "align").direction : "left");
                continue;
            }

            if (option == "size") {
                this.menubarOptions.size.value = styling.find(s => s.type == "size") ? styling.find(s => s.type == "size").size : this.defaultSize;
                continue;
            }

            if (this.noUIUpdateStylingCommands.includes(option)) {continue;}

            if (option == "list") {
                if (styling.find(s => s.type == "list" && s.listType == "ordered")) {
                    if (!this.menubarOptions.listOrdered.classList.contains("mimir-pressed")) this.menubarOptions.listOrdered.classList.add("mimir-pressed");
                    this.menubarOptions.listOrdered.setAttribute("aria-pressed", "true");
                } else {
                    this.menubarOptions.listOrdered.classList.remove("mimir-pressed");
                    this.menubarOptions.listOrdered.setAttribute("aria-pressed", "false");
                }
                if (styling.find(s => s.type == "list" && s.listType == "unordered")) {
                    if (!this.menubarOptions.listUnordered.classList.contains("mimir-pressed")) this.menubarOptions.listUnordered.classList.add("mimir-pressed");
                    this.menubarOptions.listUnordered.setAttribute("aria-pressed", "true");
                } else {
                    this.menubarOptions.listUnordered.classList.remove("mimir-pressed");
                    this.menubarOptions.listUnordered.setAttribute("aria-pressed", "false");
                }
                continue;
            }

            if (styling.some(s => s.type == option)) {
                if (!this.menubarOptions[option].classList.contains("mimir-pressed")) this.menubarOptions[option].classList.add("mimir-pressed");
                this.menubarOptions[option].setAttribute("aria-pressed", "true");
            } else {
                if (this.menubarOptions[option].classList.contains("mimir-pressed")) this.menubarOptions[option].classList.remove("mimir-pressed");
                this.menubarOptions[option].setAttribute("aria-pressed", "false");
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
                // Traverse up the tree until we find the highest empty node and remove the cursor.
                var currentNode = this.currentCursor;
                while (this.inEditor(currentNode.parentNode) && currentNode.parentNode != this.editor && this.isEmpty(currentNode.parentNode) && (this.inlineStylingTags.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                    currentNode = currentNode.parentNode;
                }
                const previousSibling = this.leftSiblingIgnoreEmpty(currentNode);
                const nextSibling = this.rightSiblingIgnoreEmpty(currentNode);
                // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                if (this.blockTags.includes(currentNode.parentNode.tagName) && this.isEmpty(currentNode.parentNode) && !this.childlessTags.includes(currentNode.parentNode.tagName)) {
                    currentNode.before(document.createElement("BR"));
                } else if ((previousSibling && this.blockTags.includes(previousSibling.tagName) && (!nextSibling || this.blockTags.includes(nextSibling.tagName)))
                        || (nextSibling && this.blockTags.includes(nextSibling.tagName) && (!previousSibling || this.blockTags.includes(previousSibling.tagName)))) {
                    // If the next sibling or previous sibling is a BR, remove it.
                    if (nextSibling && nextSibling.tagName == "BR") {
                        nextSibling.remove();
                    }
                    if (previousSibling && previousSibling.tagName == "BR") {
                        previousSibling.remove();
                    }
                    
                    // If the current node is surrounded by blocks, insert a DIV with a BR (new paragraph).
                    const newDiv = document.createElement("div");
                    newDiv.append(document.createElement("br"));
                    currentNode.before(newDiv);
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
        const onChangeSelect = this.onChangeSelect.bind(this);

        this.editor.addEventListener("focus", function (e) {
            onChangeSelect();
            document.addEventListener("selectionchange", onChangeSelect);
        }.bind(this));
        this.editor.addEventListener("focusout", function (e) {
            // Set the range cache.
            const selection = document.getSelection();
            if (selection.rangeCount != 0) {
                const range = selection.getRangeAt(0);
                if (this.editor.contains(range.commonAncestorContainer)) {
                    this.rangeCache = range;
                }
            }

            onChangeSelect();
            document.removeEventListener("selectionchange", onChangeSelect);
        }.bind(this));
        this.editor.addEventListener("click", function (e) {
            // Handle extra range in triple click.
            if (e.detail == 3) {
                // Triple click.
                const range = this.getRange();
                var startContainer = range.startContainer;
                var startOffset = range.startOffset;
                var endContainer = range.endContainer;
                var endOffset = range.endOffset;

                // Push endOffset back if the current node is a empty node.
                while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset]))) {
                    if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
                    endOffset -= 1;
                }
                if (endOffset == 0 && endContainer != this.editor && !(endOffset == startOffset && endContainer == startContainer) && !this.childlessTags.includes(endContainer.tagName)) {
                    // If the end offset is at the start of a node, move it up.
                    // We don't want to do this if the end container is a childless tag, because an offset of zero on a childless tag indicates that the entire tag is selected.
                    while (endOffset == 0 && endContainer != this.editor) {
                        endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer);
                        endContainer = endContainer.parentNode;
                    
                        // Push endOffset back if the current node is a empty node.
                        while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset]))) {
                            if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
                            endOffset -= 1;
                        }
                    }
                }
                if (endContainer.childNodes[endOffset - 1]) {
                    endContainer = endContainer.childNodes[endOffset - 1];
                    endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
                }

                const newRange = new Range();
                newRange.setStart(startContainer, startOffset);
                newRange.setEnd(endContainer, endOffset);
                document.getSelection().removeAllRanges();
                document.getSelection().addRange(newRange);
            }
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
                if (this.editor.contains(range.commonAncestorContainer)) {
                    this.rangeCache = range;
                }
            }
        }.bind(this));

        document.addEventListener("keydown", function(e) {
            // Block external undo/redo commands.
            if ((e.metaKey || e.ctrlKey) && (e.key == "z" || e.key == "y")) {
                e.preventDefault();
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
        if (this.imageModule && this.imageModule.getSelected() && this.inEditor(this.imageModule.getSelected())) {
            const newRange = new Range();
            newRange.selectNode(this.imageModule.getSelected());
            return newRange;
        }

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
        if (this.editor.contains(range.commonAncestorContainer)) {
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
                if (currentNode.nodeType == Node.ELEMENT_NODE) {
                    if (this.childlessTags.includes(currentNode.tagName)) {
                        startOffset = 1;
                    } else {
                        startOffset = currentNode.childNodes.length;
                    }
                } else {
                    startOffset = currentNode.textContent.length;
                }
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
            if (haveTraversedLastNode && (!range.endContainer.contains(currentNode) || !range.isPointInRange(currentNode, 0))) {
                break;
            }

            // Append the node.
            if ((currentNode.nodeType == Node.TEXT_NODE || this.childlessTags.includes(currentNode.tagName))) {
                nodes.push(currentNode);
            }
        
            // We always want to fully traverse the end node.
            if (range.endContainer.contains(currentNode)) {
                haveTraversedLastNode = true;
            }

            if (currentNode.firstChild) {
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
            if (range.comparePoint(nodes.slice(-1)[0], 0) == 1) {
                // If the final node's endpoint is after the range, set endOffset to 0.
                endOffset = 0;
            } else {
                // If the end container is an element, set the end offset to be the end of the node.
                if (this.childlessTags.includes(nodes.slice(-1)[0].tagName)) {
                    endOffset = 1;
                } else {
                    endOffset = nodes.slice(-1)[0].textContent.length;
                }
            }
        }

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            // The reason this is done here is that block extending a range removes certain information about whether the final node is included or not.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
                endOffset = 1;
            }
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
            case "link":
                var elem = document.createElement("a");
                elem.setAttribute("href", style.url);
                return elem;
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
        if (node.nodeType != Node.ELEMENT_NODE) return [];

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
            case "A":
                styling.push({type: "link", url: node.getAttribute("href") || ""});
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
                if (trackOverrides) styling.push({type: "override", target: {type: "size"}});
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
            if (!styling.some(s => s.type == "backColor")) styling.push({type: "backColor", color: node.style.backgroundColor});
        }
        if (node.style.textAlign) {
            var direction = node.style.textAlign.toLowerCase();
            if (!styling.some(s => s.type == "align")) styling.push({type: "align", direction: direction});
        }

        // Add PRE and CODE font styling. Add this afterwards so that font styling takes precedence.
        if (node.tagName == "PRE" || node.tagName == "CODE") {
            if (!styling.some(s => s.type == "font")) styling.push({type: "font", family: "monospace"});
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
        // For certain styles with multiple possible values, we don't want to compare exact values, we just want to see if the style exists.
        if (styling.some(s => s.type == "foreColor") && style.type == "foreColor" && style.color == null) {return true;}
        if (styling.some(s => s.type == "backColor") && style.type == "backColor" && style.color == null) {return true;}
        if (styling.some(s => s.type == "size") && style.type == "size" && style.size == null) {return true;}
        if (styling.some(s => s.type == "link") && style.type == "link") {return true;}
        if (styling.some(s => s.type == "header") && style.type == "header" && style.level == null) {return true;}
        if (styling.some(s => s.type == "align") && style.type == "align" && style.direction == null) {return true;}
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
                return currentNode;
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
            this.currentCursor.after(newTextNode);
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
            if (!this.contentTags.includes(firstNode.tagName)) {
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
            if (!this.contentTags.includes(lastNode.tagName)) {
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
            if (this.cannotCreateCursorCommands.includes(style.type) && range.toString() == "") {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                return;
            }
            
            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = nodes[0];

            // Handle content nodes.
            if (this.contentTags.includes(node.tagName)) {
                // If the node being selected is an inline node and requires a cursor, it needs to be handled differently.
                if (node.tagName != "BR" && startOffset == endOffset) {
                    // Place the cursor before or after the node, depending on the offset.
                    const marker = document.createTextNode("");
                    if (startOffset == 0) {
                        node.before(marker);
                    } else {
                        node.after(marker);
                    }
                    const styledNode = this.applyStyleToNode(marker, style);
                    const cursor = this.createCursor();
                    marker.after(cursor);
                    marker.remove();

                    // Select the cursor.
                    const newRange = new Range();
                    newRange.selectNodeContents(cursor);
                    newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                } else {
                    const styledNode = this.applyStyleToNode(node, style);

                    // Select the new node.
                    const newRange = new Range();
                    newRange.selectNode(styledNode);
                    if (this.blockTags.includes(node.tagName)) newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                }
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

            if (this.cannotCreateCursorCommands.includes(style.type)) {
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
        while (node.contains(currentNode) && currentNode != null) {
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
                    if (elem.style.textAlign && (elem.style.textAlign.toLowerCase().includes(style.direction) || style.direction == null)) {
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
                    if (elem.tagName == style.level || style.level == null) {
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
            case "link":
                if (elem.tagName == "A") {
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
        while (this.inEditor(currentNode) && currentNode != this.editor && currentNode.parentNode != this.editor) {
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
        marker.remove();

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
            this.currentCursor.after(newTextNode);
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
            if (!this.contentTags.includes(firstNode.tagName)) {
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
            if (!this.contentTags.includes(lastNode.tagName)) {
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

            // Handle content nodes.
            if (this.contentTags.includes(node.tagName)) {
                // If the node being selected is an inline node and requires a cursor, it needs to be handled differently.
                if (node.tagName != "BR" && startOffset == endOffset) {
                    // Place the cursor before or after the node, depending on the offset.
                    const marker = document.createTextNode("");
                    if (startOffset == 0) {
                        node.before(marker);
                    } else {
                        node.after(marker);
                    }
                    const styledNode = this.removeStyleOnNode(marker, style);
                    const cursor = this.createCursor();
                    marker.after(cursor);
                    marker.remove();

                    // Select the cursor.
                    const newRange = new Range();
                    newRange.selectNodeContents(cursor);
                    newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                } else {
                    const styledNode = this.removeStyleOnNode(node, style);

                    // Select the new node.
                    const newRange = new Range();
                    newRange.selectNode(styledNode);
                    if (this.blockTags.includes(node.tagName)) newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                }
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
                    case "link":
                        currentReconstructedNode.setAttribute("href", style.url);
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
            this.currentCursor.after(newTextNode);
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
            if (!this.contentTags.includes(firstNode.tagName)) {                
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
            if (!this.contentTags.includes(lastNode.tagName)) {
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
            if (this.cannotCreateCursorCommands.includes(style.type) && range.toString() == "") {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                return;
            }

            this.saveHistory();
            this.shouldTakeSnapshotOnNextChange = true;

            const node = nodes[0];

            // Handle content nodes.
            if (this.contentTags.includes(node.tagName)) {
                // If the node being selected is an inline node and requires a cursor, it needs to be handled differently.
                if (node.tagName != "BR" && startOffset == endOffset) {
                    // Place the cursor before or after the node, depending on the offset.
                    const marker = document.createTextNode("");
                    if (startOffset == 0) {
                        node.before(marker);
                    } else {
                        node.after(marker);
                    }
                    const styledNode = this.changeStyleOnNode(marker, style);
                    const cursor = this.createCursor();
                    marker.after(cursor);
                    marker.remove();

                    // Select the cursor.
                    const newRange = new Range();
                    newRange.selectNodeContents(cursor);
                    newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                } else {
                    const styledNode = this.changeStyleOnNode(node, style);

                    // Select the new node.
                    const newRange = new Range();
                    newRange.selectNode(styledNode);
                    if (this.blockTags.includes(node.tagName)) newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                }
            }
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

            if (this.cannotCreateCursorCommands.includes(style.type)) {
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
    Remove all styles on a node.
    */
    removeAllStylesOnNode(node, style) {
        if (node.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(node.tagName) || node.tagName == "SPAN")) {
            // No need to do any splitting or reconstruction, just remove the style from the node and replace it.
            const childElems = node.querySelectorAll(((this.inlineStylingTags + ["SPAN"]).filter(t => t != "A")).join(", "));
            if (this.inlineStylingTags.includes(node.tagName) || node.tagName == "SPAN") {
                childElems.push(node);
            }
            for (const childElem of childElems) {
                childElem.after(...childElem.childNodes);
                chileElem.remove();
            }
            // TODO: this will result in a bug if `node` itself is removed. I don't know what went on in my head when i wrote this so i don't really care anyways
            return node;
        }

        // Traverse upwards and find the topmost style node.
        var topmostStyleNode = null;
        var currentNode = node;
        var linkNode = null; // Keep track of link nodes to re-apply.
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            currentNode = currentNode.parentNode;
            if (currentNode.nodeType == Node.ELEMENT_NODE && (this.inlineStylingTags.includes(currentNode.tagName) || currentNode.tagName == "SPAN")) {
                // Found the node.
                topmostStyleNode = currentNode;
                if (currentNode.tagName == "A") {linkNode = currentNode.cloneNode(false);}
            } else {
                break;
            }
        }

        if (!topmostStyleNode) {return node;}

        // Split the parent at the current node.
        const splitAfterNode = this.splitNodeAtChild(topmostStyleNode, node);
        if (!this.isEmpty(splitAfterNode)) topmostStyleNode.after(splitAfterNode);

        // Place in the reconstructed node and the reconstructed after node.
        topmostStyleNode.after(node);

        // Remove empty nodes.
        if (this.isEmpty(topmostStyleNode)) topmostStyleNode.remove();

        // Re-apply the link node, if necessary.
        if (linkNode) {
            node.after(linkNode);
            linkNode.append(node);
            node = linkNode;
        }

        return node;
    }

    /* 
    Remove all styles from a range.
    */
    removeAllStyles(style, range) {
        var nodes, startOffset, endOffset;
        if (this.currentCursor) {
            // If a cursor exists, remove it and perform styling on its parent.
            const newTextNode = document.createTextNode("");
            this.currentCursor.after(newTextNode);
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
            if (!this.contentTags.includes(firstNode.tagName)) {
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
            if (!this.contentTags.includes(lastNode.tagName)) {
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
            newEndNode = this.removeAllStylesOnNode(newEndNode, style);
            for (const node of nodes.slice(1, nodes.length - 1).reverse()) {
                this.removeAllStylesOnNode(node, style);
            }
            newStartNode = this.removeAllStylesOnNode(newStartNode, style);

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

            // Handle content nodes.
            if (this.contentTags.includes(node.tagName)) {
                // If the node being selected is an inline node and requires a cursor, it needs to be handled differently.
                if (node.tagName != "BR" && startOffset == endOffset) {
                    // Place the cursor before or after the node, depending on the offset.
                    const marker = document.createTextNode("");
                    if (startOffset == 0) {
                        node.before(marker);
                    } else {
                        node.after(marker);
                    }
                    const styledNode = this.removeAllStylesOnNode(marker, style);
                    const cursor = this.createCursor();
                    marker.after(cursor);
                    marker.remove();

                    // Select the cursor.
                    const newRange = new Range();
                    newRange.selectNode(cursor);
                    newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                } else {
                    const styledNode = this.removeAllStylesOnNode(node, style);

                    // Select the new node.
                    const newRange = new Range();
                    newRange.selectNodeContents(styledNode);
                    if (this.blockTags.includes(node.tagName)) newRange.collapse();
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);
                    return;
                }
            }

            // Split the node at the start and end offsets.
            var styledNode = document.createTextNode(node.textContent.slice(startOffset, endOffset));
            var endNode = document.createTextNode(node.textContent.slice(endOffset, node.textContent.length));
            node.textContent = node.textContent.slice(0, startOffset);
            node.after(styledNode, endNode);

            // Remove the styling on the middle node.
            styledNode = this.removeAllStylesOnNode(styledNode, style);

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
            const styledNode = this.removeAllStylesOnNode(node, style);

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
        var previousSibling = endContainer.childNodes[endOffset]?.previousSibling;
        while (previousSibling && this.isEmpty(previousSibling)) {previousSibling = previousSibling.previousSibling};
        if ((endContainer == this.editor && endOffset == this.editor.childNodes.length)
                 || this.isValidBlockNode(endContainer.childNodes[endOffset])
                 || (previousSibling && this.isValidBlockNode(previousSibling))
                 || (this.isValidBlockNode(endContainer) && endOffset == endContainer.childNodes.length)) {
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
    Get the first childless child of a node.
    */
    firstChildlessChild(node) {
        const original = node;
        while (node.firstChild) {
            node = node.firstChild;
        }
        return node;
    }

    /*
    Block extend a range.
    */
    blockExtendRange(range, ascendAncestors = true) {
        var startContainer = range.startContainer;
        var startOffset = range.startOffset;
        var endContainer = range.endContainer;
        var endOffset = range.endOffset;

        // Push endOffset back if the current node is a empty node.
        while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset]))) {
            if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
            endOffset -= 1;
        }
        if (endOffset == 0 && endContainer != this.editor && !(endOffset == startOffset && endContainer == startContainer) && !this.childlessTags.includes(endContainer.tagName) && !(this.firstChildlessChild(endContainer) && this.firstChildlessChild(endContainer).tagName == "BR")) {
            // If the end offset is at the start of a node, move it up.
            // We don't want to do this if the end container is a childless tag, because an offset of zero on a childless tag indicates that the entire tag is selected.
            while (endOffset == 0 && endContainer != this.editor) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer);
                endContainer = endContainer.parentNode;

                // Push endOffset back if the current node is a empty node.
                while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset]))) {
                    if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
                    endOffset -= 1;
                }
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
        if (currentNode.nodeType == Node.ELEMENT_NODE && !range.isPointInRange(currentNode, currentNode.childNodes.length) && !this.childlessTags.includes(currentNode.tagName)) {
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
        } else if (currentNode.nodeType == Node.TEXT_NODE && !range.intersectsNode(currentNode) && !this.childlessTags.includes(currentNode.tagName)) {
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
                /* } else if (currentNode == range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(currentNode).tagName)) {
                    nodes.push(this.firstChildlessChild(currentNode));
                    return nodes; */ // TODO: this fixes BR nodes, but it selects excess BRs 
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
    Adjust the start and end points of a range to be relative to inline nodes.
    */
    adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset) {
        // If endContainer is anchored onto a childless node, select it.
        var adjustEndOffset = true;
        if (endContainer.childNodes && endContainer.childNodes[endOffset] && this.childlessTags.includes(this.firstChildlessChild(endContainer.childNodes[endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            // The reason this is done here is that block extending a range removes certain information about whether the final node is included or not.
            const lastChildless = this.firstChildlessChild(endContainer.childNodes[endOffset]);
            endContainer = lastChildless;
            endOffset = 0;
            adjustEndOffset = false;
        }

        // Push endOffset back if the current node is a empty node.
        while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset])) && adjustEndOffset) {
            if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
            endOffset -= 1;
        }
        if (adjustEndOffset && endOffset == 0 && endContainer != this.editor && !(endOffset == startOffset && endContainer == startContainer) && !this.childlessTags.includes(endContainer.tagName) && !(this.firstChildlessChild(endContainer) && this.firstChildlessChild(endContainer).tagName == "BR")) {
            // If the end offset is at the start of a node, move it up.
            // We don't want to do this if the end container is a childless tag, because an offset of zero on a childless tag indicates that the entire tag is selected.
            while (endOffset == 0 && endContainer != this.editor) {
                endOffset = Array.from(endContainer.parentNode.childNodes).indexOf(endContainer);
                endContainer = endContainer.parentNode;

                // Push endOffset back if the current node is a empty node.
                while ((endContainer[endOffset] && this.isEmpty(endContainer[endOffset]))) {
                    if (endContainer == startContainer && endOffset == startOffset) {startOffset -= 1;}
                    endOffset -= 1;
                }
            }
        }

        // Adjust the start point so that it is always relative to inline nodes.
        while (startContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(startContainer.tagName) && !this.inlineStylingTags.includes(startContainer.tagName) && startContainer.tagName != "SPAN") {
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
        while (adjustEndOffset && endContainer.nodeType == Node.ELEMENT_NODE && !this.childlessTags.includes(endContainer.tagName) && !this.inlineStylingTags.includes(endContainer.tagName) && endContainer.tagName != "SPAN") {
            // If there are no children of this node, exit.
            if (endContainer.childNodes.length == 0) {
                break;
            }

            if (endOffset == 0) {
                if (this.childlessTags.includes(endContainer.childNodes[0].tagName) && endContainer.childNodes[0].tagName != "BR") {
                    const marker = document.createTextNode("");
                    endContainer.prepend(marker);
                    endContainer = marker;
                    endOffset = 0;
                } else {
                    endContainer = endContainer.childNodes[endOffset];
                    endOffset = 0;
                }
            } else {
                if (endContainer.childNodes[endOffset - 1].compareDocumentPosition(startContainer) == Node.DOCUMENT_POSITION_FOLLOWING && endContainer.childNodes[endOffset]) {
                    // Don't let the end container go before the start container;
                    endContainer = endContainer.childNodes[endOffset];
                    endOffset = 0;
                } else {
                    endContainer = endContainer.childNodes[endOffset - 1];
                    endOffset = endContainer.nodeType == Node.ELEMENT_NODE ? endContainer.childNodes.length : endContainer.textContent.length;
                }
            }
        }

        return [startContainer, startOffset, endContainer, endOffset];
    }

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
    Remove extraneous parents of a list of nodes. This will force certain nodes to be extraneous, if possible. 
    */
    removeExtraneousParents(nodes) {
        // Remove extraneous parent, if possible.
        const nodesWithoutExtraneousParents = [];
        function removeExtraneousNodeIfPossible(node) {
            if (node == this.editor) {
                nodesWithoutExtraneousParents.push(node); 
                return;
            }
            if (["DIV", "P"].includes(node.tagName) && Array.from(node.childNodes).some((n) => this.blockTags.filter((t) => t != "BR").includes(n.tagName)) && !node.getAttribute("style")) {
                // The node contains at least one block tag. Make it extraneous by forcing all the children into DIVs and joining inline nodes.
                const originalChildren = Array.from(node.childNodes);
                const children = [];
                while (originalChildren.length > 0) {
                    const child = originalChildren.shift();
                    if (this.blockTags.filter(t => t != "BR").includes(child.tagName)) {
                        children.push(child);
                    } else {
                        const newDiv = document.createElement("div");
                        newDiv.append(child);
                        while (originalChildren[0] && !this.blockTags.includes(originalChildren[0].tagName)) {
                            const inlineChild = originalChildren.shift();
                            newDiv.append(inlineChild);
                        }
                        children.push(newDiv);
                    }
                }
                nodesWithoutExtraneousParents.push(...children);
                node.after(...children);
                node.remove();
            } else {
                nodesWithoutExtraneousParents.push(node);
            }
        }
        removeExtraneousNodeIfPossible = removeExtraneousNodeIfPossible.bind(this);
        nodes.forEach(removeExtraneousNodeIfPossible);
        return nodesWithoutExtraneousParents;
    }

    /*
    Remove extraneous parents within a node. This will force certain nodes to be extraneous, if possible. 
    This function works recursively and removes all extraneous nodes within node.
    */
    removeExtraneousParentsRecursively(parent) {
        // Remove extraneous parent, if possible.
        const marker = document.createTextNode("");
        parent.after(marker);
        parent.remove();
        function removeExtraneousNodeIfPossible(node) {
            if (!node.firstChild) {return;}

            if (["DIV", "P"].includes(node.tagName) && Array.from(node.childNodes).some((n) => this.blockTags.filter((t) => t != "BR").includes(n.tagName)) && !node.getAttribute("style")) {
                // The node contains at least one block tag. Make it extraneous by forcing all the children into DIVs and joining inline nodes.
                const originalChildren = Array.from(node.childNodes);
                const children = [];
                while (originalChildren.length > 0) {
                    const child = originalChildren.shift();
                    if (this.blockTags.filter(t => t != "BR").includes(child.tagName)) {
                        children.push(child);
                    } else {
                        const newDiv = document.createElement("div");
                        newDiv.append(child);
                        while (originalChildren[0] && !this.blockTags.includes(originalChildren[0].tagName)) {
                            const inlineChild = originalChildren.shift();
                            newDiv.append(inlineChild);
                        }
                        children.push(newDiv);
                    }
                }
                node.after(...children);
                node.remove();
                for (const child of children) {
                    if (child.nodeType == Node.ELEMENT_NODE && (child.querySelector("div:not([style]), p:not([style])") || child.matches("div:not([style]), p:not([style])"))) removeExtraneousNodeIfPossible(child);
                }
            } else {
                for (const child of Array.from(node.childNodes)) {
                    if (child.nodeType == Node.ELEMENT_NODE && (child.querySelector("div:not([style]), p:not([style])") || child.matches("div:not([style]), p:not([style])"))) removeExtraneousNodeIfPossible(child);
                }
            }
        }
        removeExtraneousNodeIfPossible = removeExtraneousNodeIfPossible.bind(this);
        Array.from(parent.childNodes).forEach(removeExtraneousNodeIfPossible);
        marker.replaceWith(parent);
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

        var imageToReselect = this.imageModule.getSelected();
        this.imageModule.deselect();

        const shouldJoin = !this.inlineBlockStylingCommands.includes(style.type);

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);

        [startContainer, startOffset, endContainer, endOffset] = this.adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset);
        
        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            // The reason this is done here is that block extending a range removes certain information about whether the final node is included or not.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
            }
        }

        const nodesWithoutExtraneousParents = this.removeExtraneousParents(nodes);

        // Fix disallowed children. Inline block styles need to be applied on a line-by-line basis, so all multi-line blocks (P, DIV, etc.) need to be removed.
        const fixedNodes = [];
        if (style.type == "header") {
            // For headers, disallowed children are all types of multi-line blocks and header tags as well.
            var disallowedChildren = "blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6, div, p";
        } else if (this.inlineBlockStylingCommands.includes(style.type)) {
            // For alignment and other types of inline block styling commands, disallowed children are all types of multi-line blocks, but not headers.
            var disallowedChildren = "blockquote, ul, ol, li, div, p";
        } else {
            var disallowedChildren = null;
        }
        
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
        for (const node of nodesWithoutExtraneousParents) {
            fixDisallowedChildrenOfNode(node);
        }

        // If this is a header style, remove all font size nodes.
        if (style.type == "header") {
            for (const node of fixedNodes) {
                if (node.nodeType != Node.ELEMENT_NODE) {continue;}
                const inlines = Array.from(node.querySelectorAll("span, font"));
                if (node.matches("span, font")) {inlines.push(node)}
                for (const inline of inlines) {
                    if (inline.style.fontSize) {
                        inline.style.fontSize = "";
                    }
                    if (inline.getAttribute("size")) {
                        inline.removeAttribute("size");
                    }
                }
            }
        }

        // Fix disallowed parents.
        if (style.type == "quote" || style.type == "list") {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN" || ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName) || (e.style && (e.style.textAlign || e.style.marginLeft)));
        } else if (this.inlineBlockStylingCommands.includes(style.type)) {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN" || ["H1", "H2", "H3", "H4", "H5", "H6"].includes(e.tagName));
        } else {
            var disallowedParents = (e) => (this.inlineStylingTags.includes(e.tagName) || e.tagName == "SPAN");
        }

        // Style the nodes.
        var firstStyled = null;
        var lastStyled = null;
        var lastNode = null;
        var joinNext = null;
        for (const node of fixedNodes) {
            const toJoinNext = node.nextSibling;
            if (this.isEmpty(node) && !(this.currentCursor && node.contains(this.currentCursor))) {
                joinNext = toJoinNext;
                // Empty nodes.
                node.remove();
                continue;
            }

            if (node.contains(range.commonAncestorContainer) && node != range.commonAncestorContainer && this.blockTags.includes(node.tagName) && !this.childlessTags.includes(node.tagName)
                && !this.inlineBlockStylingCommands.includes(style.type) // Inline block styles cannot be placed inside.
                && !node.getAttribute("style") && !["H1", "H2", "H3", "H4", "H5", "H6"].includes(node.tagName) // Cannot place node inside header or text align.
            ) {
                var inside = true;
            } else {
                var inside = false;
            }
            const styledNode = this.applyBlockStyleToNode(node, style, disallowedParents, inside);
            this.removeExtraneousParents([styledNode.parentNode]);
            if (!firstStyled) firstStyled = styledNode;
            if (lastStyled && lastStyled.nextSibling == styledNode && joinNext == node) {
                if (!shouldJoin && this.blockTags.filter(t => t != "BR").includes(node.tagName)) { // Don't join block tags, but do join BR nodes.
                    // If shouldJoin is false, we only want to join inline nodes. Therefore, if the current node is not inline, don't join it.
                    lastStyled = styledNode;
                } else {
                    if (style.type == "list" && !this.blockTags.includes(node.tagName) && !this.blockTags.includes(lastNode.tagName) && this.firstChildlessChild(node).tagName != "BR") {
                        // For non-block lists, we want to join the interior nodes inside the LI.
                        lastStyled.lastChild.append(...styledNode.firstChild.childNodes);
                        styledNode.remove();
                    } else {
                        if (this.inlineBlockStylingCommands.includes(style.type) && this.blockTags.filter(t => t != "BR").includes(node.tagName)) {
                            // Don't join blocks.
                            lastStyled = styledNode;
                        } else {
                            lastStyled.append(...styledNode.childNodes);
                            styledNode.remove();
                        }
                    }
                }
            } else {
                lastStyled = styledNode;
            }
            if (inside && ["DIV", "P"].includes(node.tagName) && !node.getAttribute("style")) {
                // Extraneous node.
                node.after(...node.childNodes);
                node.remove();
                lastNode = node.childNodes[0];
            } else {
                lastNode = node;
            }
            joinNext = toJoinNext;
        }

        // In order to aid with joining, remove extraneous nodes on the common editor.
        this.removeExtraneousParentsRecursively(this.editor);

        // See if the first node and last node can be joined.
        if (style.type == "list") {
            if (firstStyled) {
                // Join.
                const previousSibling = this.leftSiblingIgnoreEmpty(firstStyled);
                if (previousSibling && previousSibling.tagName == firstStyled.tagName) {
                    previousSibling.append(...firstStyled.childNodes);
                    firstStyled.remove();
                    if (lastStyled == firstStyled) lastStyled = previousSibling;
                    firstStyled = previousSibling;
                }
            }
            if (lastStyled) {
                // Join.
                const nextSibling = this.rightSiblingIgnoreEmpty(lastStyled);
                if (nextSibling && nextSibling.tagName == lastStyled.tagName) {
                    // Join.
                    nextSibling.prepend(...lastStyled.childNodes);
                    lastStyled.remove();
                    lastStyled = nextSibling;
                }
            }
            
        }

        if (imageToReselect) {
            this.imageModule.select(imageToReselect);
            return;
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

            if (Array.from(styledNode.childNodes).every((e) => this.blockTags.filter((t) => t != "BR").includes(e.tagName))) {
                extraneousDivsToRemove.push(styledNode);
            }

            // Put the styled node back.
            marker.after(styledNode);
            marker.remove();

            // Remove extraneous parents as well.
            if (Array.from(styledNode.parentNode.childNodes).every((e) => this.blockTags.filter((t) => t != "BR").includes(e.tagName)) && !styledNode.parentNode.getAttribute("style") && styledNode.parentNode != this.editor && styledNode.parentNode.tagName == "DIV") {
                extraneousDivsToRemove.push(styledNode.parentNode);
            }
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

            if (Array.from(styledNode.childNodes).every((e) => this.blockTags.filter((t) => t != "BR").includes(e.tagName))) {
                extraneousDivsToRemove.push(styledNode);
            }
            marker.after(styledNode, splitAfterNode);
            marker.remove();

            // Remove extraneous parents as well.
            if (Array.from(styledNode.parentNode.childNodes).every((e) => this.blockTags.filter((t) => t != "BR").includes(e.tagName)) && !styledNode.parentNode.getAttribute("style") && styledNode.parentNode != this.editor && styledNode.parentNode.tagName == "DIV") {
                extraneousDivsToRemove.push(styledNode.parentNode);
            }
            
            if (parentNode != this.editor && this.isEmpty(parentNode)) {
                // Remove the original node.
                parentNode.remove();
            }
            if (parentNode.lastChild && this.isEmpty(parentNode.lastChild)) {
                // Remove the original node.
                parentNode.lastChild.remove();
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

        var imageToReselect = this.imageModule.getSelected();
        this.imageModule.deselect();

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);

        [startContainer, startOffset, endContainer, endOffset] = this.adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset);

        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
            }
        }

        const nodesWithoutExtraneousParents = this.removeExtraneousParents(nodes);

        // Style the nodes.
        var lastNodeNextSibling = null;
        var lastNode = null;
        for (const node of nodesWithoutExtraneousParents) {
            // First, check if we should join the nodes. Don't join if the current node is a block node. This is purely for inline nodes that have been separated.
            const shouldJoin = lastNodeNextSibling && lastNode && lastNodeNextSibling == node && (!this.blockTags.filter(t => t != "BR").includes(node.tagName));
            lastNodeNextSibling = node.nextSibling;

            const styledNode = this.removeBlockStyleOnNode(node, style, removeAllParents);

            // Join.
            if (shouldJoin && styledNode && !(styledNode instanceof Array)) {
                lastNode.append(...styledNode.childNodes);
                styledNode.remove();
            } else {
                lastNode = (styledNode instanceof Array) ? null : styledNode;
            }
        }

        if (imageToReselect) {
            this.imageModule.select(imageToReselect);
            return;
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
        
        var imageToReselect = this.imageModule.getSelected();
        this.imageModule.deselect();

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);

        [startContainer, startOffset, endContainer, endOffset] = this.adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset);
        
        // Get the block nodes within the range.
        const nodes = this.getBlockNodesInRange(blockExtended);

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
            }
        }

        // Style the nodes.
        oldStyle = oldStyle == "ordered" ? "OL" : "UL";
        style = style == "ordered" ? "OL" : "UL";
        for (const node of nodes) {
            this.replaceListsOnNode(node, oldStyle, style);
        }

        if (imageToReselect) {
            this.imageModule.select(imageToReselect);
            return;
        }
        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Join adjacent nested lists, leftwards. Returns the new node.
    */
    joinAdjacentNestedListsLeft(node) {
        // Join adjacent lists within a list.
        if (!node) {return node;}
        const previousSibling = this.leftSiblingIgnoreEmpty(node);
        if (previousSibling && ["OL", "UL"].includes(node.tagName) && previousSibling.tagName == node.tagName) {
            // Join.
            previousSibling.append(...node.childNodes);
            
            // Remove the original node.
            node.remove();
            return previousSibling;
        }
        if (!previousSibling && ["OL", "UL"].includes(node.tagName) && 
            node.parentNode.tagName == "LI" && 
            this.leftSiblingIgnoreEmpty(node.parentNode) && 
            this.leftSiblingIgnoreEmpty(node.parentNode).childNodes.length != 0 && 
            this.leftSiblingIgnoreEmpty(node.parentNode).childNodes[this.leftSiblingIgnoreEmpty(node.parentNode).childNodes.length - 1].tagName == node.tagName) {
            const previousSibling = this.leftSiblingIgnoreEmpty(node.parentNode);
            // Save the joined nodes.
            const outputNode = previousSibling.childNodes[previousSibling.childNodes.length - 1];

            // Join.
            previousSibling.childNodes[previousSibling.childNodes.length - 1].append(...node.childNodes);

            // Remove the original node. If possible, remove its parent as well.
            const nodeParent = node.parentNode;
            node.remove();
            if (nodeParent.childNodes.length == 0) {
                nodeParent.remove();
            }
            return outputNode;
        }
        return node;
    }

    /*
    Join adjacent nested lists, rightwards. Returns the new node.
    */
    joinAdjacentNestedListsRight(node) {
        // Join the last list rightwards.
        if (!node) {return node;}
        const nextSibling = this.rightSiblingIgnoreEmpty(node);
        if (nextSibling && ["OL", "UL"].includes(node.tagName) && nextSibling.tagName == node.tagName) {
            // Join.
            nextSibling.prepend(...node.childNodes);
            
            // Remove the original node.
            node.remove();
            return nextSibling;
        }

        if (!nextSibling && ["OL", "UL"].includes(node.tagName) && 
            node.parentNode.tagName == "LI" && 
            this.rightSiblingIgnoreEmpty(node.parentNode) && 
            this.rightSiblingIgnoreEmpty(node.parentNode).childNodes.length != 0 && 
            this.rightSiblingIgnoreEmpty(node.parentNode).childNodes[0].tagName == node.tagName) {
            const nextSibling = this.rightSiblingIgnoreEmpty(node.parentNode);
            // Join.
            nextSibling.childNodes[0].prepend(...node.childNodes);

            // Remove the original node. If possible, remove its parent as well.
            const nodeParent = node.parentNode;
            node.remove();
            if (nodeParent.childNodes.length == 0) {
                nodeParent.remove();
            }
        }
    }

    /*
    Update hidden list styling on nested lists.
    */
    updateHideNestedLists(node) {
        const liNodes = node.querySelectorAll("li");
        for (const li of liNodes) {
            if (li.firstChild && ["OL", "UL"].includes(li.firstChild.tagName)) {
                // If the first child is another list, hide the list styling.
                li.style.listStyleType = "none";
            } else {
                if (li.style.listStyleType.toLowerCase() == "none") li.style.listStyleType = "";
            }
        }

        // Update nested lists for ancestors of node.
        var currentNode = node;
        while (this.inEditor(currentNode) && currentNode != this.editor) {
            if (currentNode.tagName == "LI" && currentNode.firstChild && ["OL", "UL"].includes(currentNode.firstChild.tagName)) {
                // Hide the current node's list style.
                currentNode.style.listStyleType = "none";
            } else if (currentNode.tagName == "LI") {
                if (currentNode.style.listStyleType.toLowerCase() == "none") currentNode.style.listStyleType = "";
            }
            currentNode = currentNode.parentNode;
        }
    }

    /*
    Block indent a list of sibling nodes.
    */
    blockIndentSiblingNodes(siblings) {
        const parent = this.findClosestParent(siblings[0], (n) => n.nodeType == Node.ELEMENT_NODE && (["OL", "UL"].includes(n.tagName) || (n.style && n.style.marginLeft.toLowerCase() == "40px")));
        var lastIndented = null; // Store the first and last indented nodes so that we can join adjacent lists.
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

            // Try joining the parent LI node with its previous sibling.
            if (clone.parentNode.tagName == "LI" && clone.parentNode.previousSibling) {
                // if (firstIndented == clone) firstIndented = clone.parentNode.previousSibling;
                // lastIndented = clone.parentNode.previousSibling;
                const oldParent = clone.parentNode;
                oldParent.previousSibling.append(...oldParent.childNodes);
                oldParent.remove();
            }
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
                marker.remove();
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

                // Try joining the parent LI node with its previous sibling.
                if (clone.parentNode.tagName == "LI" && clone.parentNode.previousSibling) {
                    // if (firstIndented == clone) firstIndented = clone.parentNode.previousSibling;
                    // lastIndented = clone.parentNode.previousSibling;
                    const oldParent = clone.parentNode;
                    oldParent.previousSibling.append(...oldParent.childNodes);
                    oldParent.remove();
                }
            }
        }

        // Join adjacent nested lists.
        const firstIndentedWasLastIndented = firstIndented == lastIndented;
        const joinedNode = this.joinAdjacentNestedListsLeft(firstIndented);
        if (firstIndentedWasLastIndented) {lastIndented = joinedNode;}

        if (lastIndented) this.updateHideNestedLists(lastIndented);

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
        
        var imageToReselect = this.imageModule.getSelected();
        this.imageModule.deselect();

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);

        [startContainer, startOffset, endContainer, endOffset] = this.adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset);
        
        // Get the block nodes within the range.
        var nodes = this.getBlockNodesInRange(blockExtended);

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
            }
        }

        const nodesWithoutExtraneousParents = this.removeExtraneousParents(nodes);

        // If possible, get inner children.
        const fixedNodes = [];
        function getInnerChildren(node) {
            // If the current node is not a OL/UL element but contains a OL/UL, go inside.
            if (node.nodeType == Node.ELEMENT_NODE && (node == this.editor || (!["OL", "UL"].includes(node.tagName) && node.querySelector("blockquote, ul, ol, li, div, p")))) {
                // Append the children instead.
                for (const child of node.childNodes) {
                    getInnerChildren(child);
                }
            } else {
                // Append the node.
                fixedNodes.push(node);
            }
        }
        getInnerChildren = getInnerChildren.bind(this);
        for (const node of nodesWithoutExtraneousParents) {
            getInnerChildren(node);
        }

        // Style the nodes.
        nodes = fixedNodes.reverse();
        var lastIndented = null; // Store the last indented node so that we can join adjacent lists.
        while (nodes.length != 0) {
            const siblings = [nodes.pop()];
            while (nodes.length != 0 && siblings[siblings.length - 1].nextSibling == nodes[nodes.length - 1]) {
                siblings.push(nodes.pop());
            }

            lastIndented = this.blockIndentSiblingNodes(siblings);
        }

        this.joinAdjacentNestedListsRight(lastIndented);

        if (imageToReselect) {
            this.imageModule.select(imageToReselect);
            return;
        }
        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Block outdent a list of sibling nodes.
    */
    blockOutdentSiblingNodes(siblings) {
        // var firstOutdented = null;
        // var lastOutdented = null;
        for (const node of siblings) {
            // Find the nearest outdent-able node to outdent.
            const nearestOutdentableParent = this.findClosestParent(node, (n) => ["OL", "UL"].includes(n.tagName) || (n.style && n.style.marginLeft.toLowerCase() == "40px"));
            if (!nearestOutdentableParent) {
                // If there isn't an outdent-able parent, we know it won't be any of its children either, since the inner child traversal process gets all the outdent-able children.
                continue;
            } else if (["OL", "UL"].includes(nearestOutdentableParent.tagName)) {
                // Escape a list.
                if (nearestOutdentableParent == node) {
                    const list = Array.from(nearestOutdentableParent.childNodes);
                    const final = [];
                    for (const li of list) {
                        // Expand the children.
                        const children = Array.from(li.childNodes);
                        if (children.every((n) => this.blockTags.includes(n.tagName))) {
                            final.push(...children);
                        } else {
                            const newDiv = document.createElement("div");
                            newDiv.append(...children);
                            final.push(newDiv);
                        }
                    }
                    nearestOutdentableParent.after(...final);
                    const outdentableParentParent = nearestOutdentableParent.parentNode;
                    nearestOutdentableParent.remove();
                    this.updateHideNestedLists(outdentableParentParent);

                    // If the nodes we outdented are now inside another list, break them and place them on their own list elements.
                    if (final[0].parentNode.tagName == "LI") {
                        // First, split out of the parent LI node.
                        const parentLi = final[0].parentNode;
                        const nodesAfterFinal = Array.from(parentLi.childNodes).slice(Array.from(parentLi.childNodes).indexOf(final[final.length - 1]) + 1, parentLi.childNodes.length);
                        const newLiForSplitNodes = document.createElement("li");
                        newLiForSplitNodes.append(...nodesAfterFinal);
                        parentLi.after(newLiForSplitNodes);
                        if (this.isEmpty(newLiForSplitNodes)) {newLiForSplitNodes.remove()};

                        // Now, place each block in its own LI.
                        const list = [];
                        while (final.length != 0) {
                            const node = final[0];
                            if (this.blockTags.includes(node.tagName)) {
                                // Block nodes go in their own LI node.
                                const newLi = document.createElement("li");
                                newLi.append(node);
                                list.push(newLi);
                                final.shift();
                            } else {
                                // Inline nodes get combined.
                                const newLi = document.createElement("li");
                                newLi.append(node);
                                final.shift();
                                while (final.length != 0 && !this.blockTags.includes(final[0].tagName)) {
                                    newLi.append(final.shift());
                                }
                                list.push(newLi);
                            }
                            parentLi.after(...list);
                        }

                        // Hide nested lists.
                        list.forEach((l) => this.updateHideNestedLists(l));
                        this.updateHideNestedLists(parentLi);

                        if (this.isEmpty(parentLi)) {parentLi.remove();}
                    }
                    continue;
                }

                // Split out of the list.
                const splitIncludingNode = this.splitNodeAtChild(nearestOutdentableParent, node, true);
                const splitAfterNode = this.splitNodeAtChild(splitIncludingNode, node, false);
                const list = Array.from(splitIncludingNode.childNodes);
                const final = [];
                for (const li of list) {
                    // Expand the children.
                    const children = Array.from(li.childNodes);
                    if (children.every((n) => this.blockTags.includes(n.tagName))) {
                        final.push(...children);
                    } else {
                        const newDiv = document.createElement("div");
                        newDiv.append(...children);
                        final.push(newDiv);
                    }
                }
                nearestOutdentableParent.after(...final, splitAfterNode);
                splitIncludingNode.remove();
                if (this.isEmpty(nearestOutdentableParent)) {
                    nearestOutdentableParent.remove();
                }
                if (this.isEmpty(splitAfterNode)) {
                    splitAfterNode.remove();
                }
                if (final.length == 0) {continue;}

                // If the nodes we outdented are now inside another list, break them and place them on their own list elements.
                if (final[0].parentNode.tagName == "LI") {
                    // First, split out of the parent LI node.
                    const parentLi = final[0].parentNode;
                    const nodesAfterFinal = Array.from(parentLi.childNodes).slice(Array.from(parentLi.childNodes).indexOf(final[final.length - 1]) + 1, parentLi.childNodes.length);
                    const newLiForSplitNodes = document.createElement("li");
                    newLiForSplitNodes.append(...nodesAfterFinal);
                    parentLi.after(newLiForSplitNodes);
                    if (this.isEmpty(newLiForSplitNodes)) {newLiForSplitNodes.remove()};

                    // Now, place each block in its own LI.
                    const list = [];
                    while (final.length != 0) {
                        const node = final[0];
                        if (this.blockTags.includes(node.tagName)) {
                            // Block nodes go in their own LI node.
                            const newLi = document.createElement("li");
                            newLi.append(node);
                            list.push(newLi);
                            final.shift();
                        } else {
                            // Inline nodes get combined.
                            const newLi = document.createElement("li");
                            newLi.append(node);
                            final.shift();
                            while (final.length != 0 && !this.blockTags.includes(final[0].tagName)) {
                                newLi.append(final.shift());
                            }
                            list.push(newLi);
                        }
                        parentLi.after(...list);
                    }

                    // Hide nested lists.
                    this.updateHideNestedLists(newLiForSplitNodes);
                    list.forEach((l) => this.updateHideNestedLists(l));
                    this.updateHideNestedLists(parentLi);

                    if (this.isEmpty(parentLi)) {parentLi.remove();}
                }

                // Hide nested lists.
                this.updateHideNestedLists(nearestOutdentableParent);

                // Todo: join
                // if (!firstOutdented)
                // lastOutdented = this.joinAdjacentNestedListsLeft()
                // TODO: fix <ol><li><ol><li><ol><li>abc</li></ol></li></ol></li><li><ol><li>abc</li></ol></li></ol> (joining)
                // TODO: fix <ol><li><ol><li>asdasd</li><li><div>asdasd</div></li></ol></li></ol> (splitting)
            } else if (nearestOutdentableParent.nodeType == Node.ELEMENT_NODE && nearestOutdentableParent.style.marginLeft.toLowerCase() == "40px") {
                // Simple indent.
                if (nearestOutdentableParent == node) {
                    nearestOutdentableParent.style.marginLeft = "";
                    const children = Array.from(nearestOutdentableParent.childNodes);
                    if (children.every((n) => this.blockTags.includes(n.tagName)) && ["DIV", "P"].includes(nearestOutdentableParent.tagName) && !nearestOutdentableParent.getAttribute("style")) {
                        nearestOutdentableParent.after(...children);
                        nearestOutdentableParent.remove();
                    }
                    continue;
                }

                // Split out of the parent.
                const splitIncludingNode = this.splitNodeAtChild(nearestOutdentableParent, node, true);
                const splitAfterNode = this.splitNodeAtChild(splitIncludingNode, node, false);

                // Remove the style on the node and add the nodes back in. If possible, remove the node itself.
                splitIncludingNode.style.marginLeft = "";
                const children = Array.from(splitIncludingNode.childNodes);
                if (children.every((n) => this.blockTags.includes(n.tagName)) && ["DIV", "P"].includes(nearestOutdentableParent.tagName) && !nearestOutdentableParent.getAttribute("style")) {
                    nearestOutdentableParent.after(...children, splitAfterNode);
                } else {
                    nearestOutdentableParent.after(splitIncludingNode, splitAfterNode);
                }
                if (this.isEmpty(nearestOutdentableParent)) {
                    nearestOutdentableParent.remove();
                }
                if (this.isEmpty(splitAfterNode)) {
                    splitAfterNode.remove();
                }
            }
        }

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
        
        var imageToReselect = this.imageModule.getSelected();
        this.imageModule.deselect();

        // Block extend the range.
        const blockExtended = this.blockExtendRange(range);

        [startContainer, startOffset, endContainer, endOffset] = this.adjustStartAndEndPoints(startContainer, startOffset, endContainer, endOffset);
        
        // Get the block nodes within the range.
        var nodes = this.getBlockNodesInRange(blockExtended);

        if (range.endContainer.childNodes && range.endContainer.childNodes[range.endOffset] && this.childlessTags.includes(this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]).tagName)) {
            // If the original node ends on a childless element, add it.
            const lastChildless = this.firstChildlessChild(range.endContainer.childNodes[range.endOffset]);
            if (!nodes.includes(lastChildless) && !(nodes[nodes.length - 1] && nodes[nodes.length - 1].contains(lastChildless))) {
                nodes.push(lastChildless);
            }
        }

        const nodesWithoutExtraneousParents = this.removeExtraneousParents(nodes);

        // If possible, get inner children.
        const fixedNodes = [];
        function getInnerChildren(node) {
            // If the current node is not a indent-able node but contains an indent-able node, go inside.
            if (node.nodeType == Node.ELEMENT_NODE && (node == this.editor || (node.querySelector("ol, ul")) || (node.querySelector("[style*=\"margin-left: 40px\"]")))) {
                // Append the children instead.
                for (const child of node.childNodes) {
                    getInnerChildren(child);
                }
            } else {
                // Append the node.
                fixedNodes.push(node);
            }
        }
        getInnerChildren = getInnerChildren.bind(this);
        for (const node of nodesWithoutExtraneousParents) {
            getInnerChildren(node);
        }

        // Style the nodes.
        nodes = fixedNodes.reverse();
        var lastIndented = null; // Store the last indented node so that we can join adjacent lists.
        while (nodes.length != 0) {
            const siblings = [nodes.pop()];
            while (nodes.length != 0 && siblings[siblings.length - 1].nextSibling == nodes[nodes.length - 1]) {
                siblings.push(nodes.pop());
            }

            lastIndented = this.blockOutdentSiblingNodes(siblings);
        }

        // TODO: join

        if (imageToReselect) {
            this.imageModule.select(imageToReselect);
            return;
        }
        const newRange = new Range();
        newRange.setStart(startContainer, startOffset);
        newRange.setEnd(endContainer, endOffset);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
    }

    /*
    Bind a callback to when a node is drawn.
    */
    onNodeDrawn(n, callback) {
        if (!ResizeObserver) {return;}
        new ResizeObserver(function(e, o) {
            if (e[0].contentRect.height == 0) {return;} 
            callback();
            o.disconnect();
        }.bind(this)).observe(n);
    }

    /*
    Insert an image.
    */
    inlineInsertImage(style, range) {
        this.saveHistory();

        // Delete everything in the range.
        range.deleteContents();
        if (this.imageModule.getSelected()) this.imageModule.deselect();
        this.removeCursor(false);

        // Create a new image.
        const imgNode = document.createElement("img");
        imgNode.setAttribute("src", style.url);
        if (style.alt) imgNode.setAttribute("alt", style.alt);
        imgNode.style.width = this.defaultImageWidth;

        // Never insert nodes into childless nodes.
        if (this.childlessTags.includes(range.commonAncestorContainer)) {
            range.commonAncestorContainer.after(imgNode);
            range.commonAncestorContainer.remove();
            document.getSelection().removeAllRanges();
            this.onNodeDrawn(imgNode, function() {this.imageModule.select(imgNode)}.bind(this));
            return;
        }

        // Insert the image.
        if (this.isEmptyOrLineBreak(range.commonAncestorContainer)) {
            // Remove the line break.
            const br = range.commonAncestorContainer.querySelector("br");
            if (br) {
                br.replaceWith(imgNode);
                this.onNodeDrawn(imgNode, function() {this.imageModule.select(imgNode)}.bind(this));
                return;
            }
        }
        range.insertNode(imgNode);
        document.getSelection().removeAllRanges();
        this.onNodeDrawn(imgNode, function() {this.imageModule.select(imgNode)}.bind(this));
    }

    /*
    Insert a horizontal rule.
    */
    blockInsertHR(style, range) {
        this.saveHistory();

        // Delete everything in the range.
        range.deleteContents();
        if (this.imageModule.getSelected()) this.imageModule.deselect();
        this.removeCursor(false);

        // Calculate the insertion point.
        var insertionPoint;
        if (range.startContainer.nodeType == Node.TEXT_NODE) {
            // Split the text node.
            insertionPoint = range.startContainer;
            const after = document.createTextNode(insertionPoint.textContent.slice(range.startOffset, insertionPoint.textContent.length));
            insertionPoint.textContent = insertionPoint.textContent.slice(0, range.startOffset);
            insertionPoint.after(after);
        } else {
            if (this.childlessTags.includes(range.startContainer)) {
                insertionPoint = range.startContainer;
            } else {
                if (range.startOffset == 0) {
                    // Prepend an empty text node.
                    const emptyTextNode = document.createTextNode("");
                    insertionPoint = emptyTextNode;
                    range.startContainer.prepend(insertionPoint);
                } else {
                    insertionPoint = range.startContainer.childNodes[range.startOffset - 1];
                }
            }
        }

        // Find the uppermost inline block and split out of it. Then, insert the HR.
        const hr = document.createElement("hr");
        const uppermostInlineBlock = this.findLastParent(insertionPoint, (n) => (["H1", "H2", "H3", "H4", "H5", "H6"].includes(n.tagName) || (n.style && n.style.textAlign) || this.inlineStylingTags.includes(n.tagName) || n.tagName == "SPAN"));
        if (uppermostInlineBlock) {
            const after = this.splitNodeAtChild(uppermostInlineBlock, insertionPoint);
            uppermostInlineBlock.after(hr, after);
        } else {
            insertionPoint.after(hr);
        }

        // Put the range after the HR node.
        const newRange = new Range();
        newRange.selectNode(hr);
        newRange.collapse(false);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(newRange);
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

        this.editor.dispatchEvent(new Event("mimiredited"));

        // Set the style.
        if (style.type == "remove") {
            this.removeAllStyles(style, range);
        } else if (this.multipleValueStylingCommands.includes(style.type) && this.inlineStylingCommands.includes(style.type)) {
            if (((style.type == "foreColor" || style.type == "backColor") && style.color == null) || (style.type == "link" && style.url == null)) {
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
                    this.removeBlockStyle({type: "header", level: null}, range);
                    var newRange = this.getRange();
                    if (style.level != "Paragraph") this.applyBlockStyle(style, newRange);
                    break;
                case "align":
                    // We need to save history now since there might be multiple calls to removeBlockStyle or applyBlockStyle.
                    this.saveHistory();
                    this.removeBlockStyle({type: "align", direction: null}, range);
                    var newRange = this.getRange();
                    this.applyBlockStyle(style, newRange);
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
        } else if (this.insertCommands.includes(style.type)) {
            switch (style.type) {
                case "insertImage":
                    this.inlineInsertImage(style, range);
                    break;
                case "insertHorizontalRule":
                    this.blockInsertHR(style, range);
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
        this.performStyleCommand({type: "font", family: this.menubarOptions.font.getValue()});
    }

    /*
    Foreground color.
    */
    foreColor(color) {
        this.performStyleCommand({type: "foreColor", color: color});
        if (color != null) {
            if (this.useIcons) {
                this.menubarOptions.foreColor.colorInput.getElementsByClassName("mimir-menubar-option-fore-color-button")[0].childNodes[0].style.borderBottom = "2px solid " + color;
            } else {
                this.menubarOptions.foreColor.colorInput.getElementsByClassName("mimir-menubar-option-fore-color-button")[0].style.textDecorationColor = color;
            }
        }
    }

    /*
    Background color.
    */
    backColor(color) {
        this.performStyleCommand({type: "backColor", color: color});
        if (color != null) {
            if (this.useIcons) {
                this.menubarOptions.backColor.colorInput.getElementsByClassName("mimir-menubar-option-back-color-button")[0].childNodes[0].style.borderBottom = "2px solid " + color;
            } else {
                this.menubarOptions.backColor.colorInput.getElementsByClassName("mimir-menubar-option-back-color-button")[0].style.textDecorationColor = color;
            }
        }
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
    Link.
    */
    link(url) {
        if (url && url.trim().substring(0, 11).toLowerCase() == "javascript:") {url = "about:blank#blocked"};
        this.performStyleCommand({type: "link", url: url});
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
        this.performStyleCommand({type: "header", level: this.menubarOptions.header.getValue()});
    }

    /*
    Text align.
    */
    align() {
        this.performStyleCommand({type: "align", direction: this.menubarOptions.align.getValue()});
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
    Insert image.
    */
    insertImage(url, alt) {
        this.performStyleCommand({type: "insertImage", url: url, alt: alt});
    }

    /*
    Insert horizontal rule.
    */
    insertHR() {
        this.performStyleCommand({type: "insertHorizontalRule"});
    }

    /*
    Remove styling.
    */
    remove() {
        this.performStyleCommand({type: "remove"});
    }

    /*
    Open find and replace UI.
    */
    openFindAndReplace() {
        this.findAndReplaceModule.open();
    }

    /*
    Zoom the editor.
    */
    zoom(level) {
        this.currentZoom = level;
        this.editor.style.MozTransform = `scale(${level})`;
        this.editor.style.WebkitTransform = `scale(${level})`;
        this.editor.style.transformOrigin = "top left";
        this.imageModule.deselect();
    }

    /*
    Adjust the zoom level of the editor by percentage.
    */
    changeZoom(level) {
        this.zoom(parseInt(level) / 100);
    }

    /*
    Apply zoom programmatically.
    */
    applyZoom(level) {
        if (!this.zoomOptions.includes(level)) {
            throw new Error("Invalid zoom level.");
        }
        this.changeZoom(level);
        this.menubarOptions.zoom.setValue(level);
    }

    /*
    Serialize a node's contents to a object.
    */
    async serializeContents(node) {
        /*
        Convert a blob into data URL.
        */
        function blobToDataUrl(b) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(reader.result);
                reader.onerror = e => reject(reader.error);
                reader.onabort = e => reject(new Error("Failed to read blob"));
                reader.readAsDataURL(b);
              });
        }

        const serialized = [];
        for (const child of node.childNodes) {
            if (this.isEmpty(child)) {continue;}
            if (child.nodeType == Node.TEXT_NODE) {
                serialized.push(child.textContent);
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                const attrs = {};
                for (var i = 0; i < child.attributes.length; i++) {
                    if (child.attributes[i].name.toLowerCase() == "src" && child.tagName == "IMG" && child.attributes[i].value.toLowerCase().startsWith("blob")) {
                        const blob = await (await fetch(child.attributes[i].value)).blob();
                        const url = await blobToDataUrl(blob);
                        attrs["src"] = url;
                    } else {
                        attrs[child.attributes[i].name] = child.attributes[i].value;
                    }
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
                    if (elem.tag.toLowerCase() == "img" && attr.toLowerCase() == "src" && elem.attrs[attr].toLowerCase().startsWith("data")) {
                        var mime = elem.attrs[attr].split(',')[0].split(':')[1].split(';')[0];
                        var binary = atob(elem.attrs[attr].split(',')[1]);
                        var array = [];
                        for (var i = 0; i < binary.length; i++) {
                            array.push(binary.charCodeAt(i));
                        }
                        const blob = new Blob([new Uint8Array(array)], {type: mime});
                        var src = URL.createObjectURL(blob);
                        newElem.setAttribute("src", src);
                        this.imageObjectURLs.push(src);
                        continue;
                    }
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
        // Hide any find and replace annotations.
        if (this.findAndReplaceModule && this.findAndReplaceModule.isOpen()) {
            this.findAndReplaceModule.unhighlight();
        }

        const content = this.editor.cloneNode(true);
        var range = null;
        const selRange = this.getRange();
        if (selRange) {
            if (selRange && this.inEditor(selRange.commonAncestorContainer)) {
                range = this.serializeRange(selRange, this.editor);
            }
        }

        // Hide any find and replace annotations.
        if (this.findAndReplaceModule && this.findAndReplaceModule.isOpen()) {
            this.findAndReplaceModule.highlight();
            this.findAndReplaceModule.selectCurrent();
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
        if (this.history.length == 0) {
            return;
        }

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
        if (this.editor.getElementsByClassName("mimir-temp-cursor").length != 0) {
            this.currentCursor = this.editor.getElementsByClassName("mimir-temp-cursor")[0];
        }

        if (this.history.length == 0) {
            this.saveHistory();
        }

        this.editor.dispatchEvent(new Event("mimiredited"));
        this.imageModule.deselect();
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
        if (this.editor.getElementsByClassName("mimir-temp-cursor").length != 0) {
            this.currentCursor = this.editor.getElementsByClassName("mimir-temp-cursor")[0];
        }

        this.editor.dispatchEvent(new Event("mimiredited"));
        this.imageModule.deselect();
    }

    /*
    New document.
    */
    new() {
        // Initialize history.
        this.history = [];
        this.redoHistory = [];
        this.shouldTakeSnapshotOnNextChange = false;

        // Initialize the global range cache variable.
        this.rangeCache = null;

        // Clear the editor.
        this.editor.innerHTML = "";

        this.saveHistory();

        // Clear the image object URL list and release the URLs.
        while (this.imageObjectURLs.length != 0) {
            const url = this.imageObjectURLs.pop();
            URL.revokeObjectURL(url);
        }
    }

    /*
    Release image URLs.
    */
    releaseImageURLs() {
        // Clear the image object URL list and release the URLs.
        while (this.imageObjectURLs.length != 0) {
            const url = this.imageObjectURLs.pop();
            URL.revokeObjectURL(url);
        }
    }

    /*
    Export to document.
    */
    async export() {
        /*
        Convert a blob into data URL.
        */
        function blobToDataUrl(b) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(reader.result);
                reader.onerror = e => reject(reader.error);
                reader.onabort = e => reject(new Error("Failed to read blob"));
                reader.readAsDataURL(b);
              });
        }

        const content = this.snapshot().content;

        // Remove cursor.
        if (content.querySelector(".mimir-temp-cursor")) {
            // Traverse upwards and remove empty text tags.
            var currentNode = content.querySelector(".mimir-temp-cursor");
            while (currentNode.parentNode != content && !this.blockTags.includes(currentNode.parentNode.tagName)) {
                currentNode = currentNode.parentNode;
            }
            currentNode.remove();
        }

        // Prepare image sources.
        for (const child of content.querySelectorAll("img")) {
            if (child.getAttribute("src") && child.getAttribute("src").toLowerCase().startsWith("blob")) {
                const blob = await (await fetch(child.getAttribute("src"))).blob();
                const url = await blobToDataUrl(blob);
                child.setAttribute("src", url);
            }
        }

        const doc = { content: content.innerHTML };
        return doc;
    }

    /*
    Import a document.
    */
    import(doc) {
        // Sanitize elements and attributes.
        const temp = document.createElement("div");
        temp.innerHTML = doc.content;

        const allowed = []
            .concat(this.blockTags)
            .concat(this.stylingTags)
            .concat(this.contentTags)
            .concat(["SPAN", "A"]);
        const selector = allowed.map((t) => `:not(${t})`).join("");
        if (temp.querySelector(selector)) {
            throw new Error("Invalid tag in document content. Ensure the document is valid.");
        }

        const walker = document.createTreeWalker(temp, NodeFilter.SHOW_ELEMENT);
        const allowedAttrs = {
            "A": ["href", "alt", "style"],
            "IMG": ["src", "alt", "class", "style"],
            "FONT": ["size", "color", "face", "style"]
        };
        while (walker.nextNode()) {
            if (allowedAttrs[walker.currentNode.tagName] && walker.currentNode.hasAttributes()) {
                for (const attr of walker.currentNode.attributes) {
                    if (!(allowedAttrs[walker.currentNode.tagName].includes(attr.name.toLowerCase()))) {
                        throw new Error("Invalid attribute in document content. Ensure the document is valid.");
                    }
                }
                if (walker.currentNode.tagName == "A" && walker.currentNode.getAttribute("href")) {
                    if (walker.currentNode.getAttribute("href").trim().substring(0, 11).toLowerCase() == "javascript:") {
                        throw new Error("Invalid attribute in document content. Ensure the document is valid.");
                    }
                }
            } else if (walker.currentNode.hasAttributes()) {
                for (const attr of walker.currentNode.attributes) {
                    if (!(["style"].includes(attr.name.toLowerCase()))) {
                        throw new Error("Invalid attribute in document content. Ensure the document is valid.");
                    }
                }
            }
        }

        this.new();

        // Resolve image sources.
        for (const child of temp.querySelectorAll("img")) {
            if (child.getAttribute("src") && child.getAttribute("src").toLowerCase().startsWith("data")) {
                var mime = child.getAttribute("src").split(',')[0].split(':')[1].split(';')[0];
                var binary = atob(child.getAttribute("src").split(',')[1]);
                var array = [];
                for (var i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                }
                const blob = new Blob([new Uint8Array(array)], {type: mime});
                var src = URL.createObjectURL(blob);
                child.setAttribute("src", src);
                this.imageObjectURLs.push(src);
                continue;
            }
        }

        this.editor.append(...temp.childNodes);
        this.history = [];
    }

    /* 
    Initialize the editor. Must be called before using the editor. 
    */
    init() {
        // Current zoom level.
        this.currentZoom = 1;

        // Initialize history.
        this.history = [];
        this.redoHistory = [];
        this.shouldTakeSnapshotOnNextChange = false;

        // Initialize the image object URL list.
        this.imageObjectURLs = [];

        // Initialize the global range cache variable.
        this.rangeCache = null;

        this.ignoreNextSelectEvent = false;

        // Clear the container.
        this.container.innerHTML = "";
        this.container.setAttribute("role", "application");
        this.container.setAttribute("aria-label", "Editor");

        // Create menubar.
        this.createMenubar();

        // Insert the content editable div.
        this.editorContainer = document.createElement("div");
        this.editorContainer.setAttribute("id", "mimir-body-container");
        this.editor = document.createElement("div");
        this.editor.setAttribute("id", "mimir-body");
        this.editor.setAttribute("contenteditable", "true");
        this.editor.setAttribute("spellcheck", !!this.spellcheck);
        this.editor.setAttribute("role", "textbox");
        this.editor.setAttribute("aria-label", "Editor main editing area");
        this.editor.setAttribute("tabindex", "-1");
        this.editorContainer.append(this.editor);
        this.container.append(this.editorContainer);

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

        // Bind click events.
        this.bindClickEvents();

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

        // Bind events for image editing.
        this.imageModule = this.MimirUI.bindImageEditing(this.editor, function() {
            this.saveHistory(); 
            this.shouldTakeSnapshotOnNextChange = true;
            this.editor.dispatchEvent(new Event("mimiredited"));
        }.bind(this));

        // Find and replace module.
        this.findAndReplaceModule = this.MimirUI.findAndReplace(this.editor, function() {
            this.saveHistory(); 
            this.shouldTakeSnapshotOnNextChange = true;
            this.editor.dispatchEvent(new Event("mimiredited"));
        }.bind(this), this);
    }
}

module.exports = Mimir;