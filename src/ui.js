/* ui.js - Custom UI components for the rich text editor. */

const MimirUI = {};

/*
Is touch input.
*/
MimirUI.isTouchInput = ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);

/*
Create a dropdown menu.
*/
MimirUI.dropdown = (button, content) => {
    // Create the dropdown.
    const dropdown = document.createElement("div");
    dropdown.classList.add("mimir-dropdown");
    const dropdownButton = document.createElement("div");
    dropdownButton.classList.add("mimir-dropdown-button");
    dropdown.append(dropdownButton);
    dropdownButton.append(button);
    const dropdownBody = document.createElement("div");
    dropdownBody.classList.add("mimir-dropdown-body");
    dropdown.append(dropdownBody);
    dropdownBody.append(content);

    dropdownBody.setAttribute("role", "dialog");
    dropdownBody.setAttribute("aria-hidden", "true");
    dropdownBody.setAttribute("aria-disabled", "true");
    dropdownButton.setAttribute("aria-haspopup", "true");
    dropdownButton.setAttribute("aria-expanded", "false");

    function onKeyPress(event) {
        if (event.key == "Escape") {
            close();
        }
    }

    // Add event listeners.
    function onClick(event) {
        if (!(dropdownBody.contains(event.target))) {
            if (dropdownBody.classList.contains("mimir-dropdown-show")) {
                dropdownBody.classList.remove("mimir-dropdown-show");
            }
            dropdownButton.setAttribute("aria-expanded", "false");
            dropdownBody.setAttribute("aria-hidden", "true");
            dropdownBody.setAttribute("aria-disabled", "true");
            if (button.contains(event.target)) ignoreNextClick = true;
            document.removeEventListener("mousedown", onClick);
            dropdown.dispatchEvent(new Event("editorDropdownClose", {bubbles: true}));
            dropdownButton.addEventListener("click", dropdownClick);
            document.removeEventListener("keydown", onKeyPress);
        }
    }
    dropdownButton.addEventListener("mousedown", function(event) {
        event.preventDefault();
    })
    var ignoreNextClick = false;
    function dropdownClick() {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }
        dropdownButton.removeEventListener("click", dropdownClick);
        dropdownBody.style.left = "";
        dropdownBody.classList.add("mimir-dropdown-show");
        dropdownButton.setAttribute("aria-expanded", "true");
        dropdownBody.setAttribute("aria-hidden", "false");
        dropdownBody.setAttribute("aria-disabled", "false");
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKeyPress);
        dropdown.dispatchEvent(new Event("editorDropdownOpen", {bubbles: true}));

        // Adjust the x offset of the dropdown to make sure it always appears on screen.
        const bounds = dropdownBody.getBoundingClientRect();
        if (bounds.right > window.innerWidth && (bounds.right - window.innerWidth) > 1) { // We don't want to push the dropdown too far left so it gets cut off.
            // Offset the modal left.
            dropdownBody.style.left = (Math.max(-(bounds.right - window.innerWidth), -bounds.left)).toString() + "px";
        }
    }
    dropdownButton.addEventListener("click", dropdownClick);

    // Close function.
    function close() {
        if (dropdownBody.classList.contains("mimir-dropdown-show")) {
            dropdownBody.classList.remove("mimir-dropdown-show");
        }
        dropdownButton.setAttribute("aria-expanded", "false");
        dropdownBody.setAttribute("aria-hidden", "true");
        dropdownBody.setAttribute("aria-disabled", "true");
        document.removeEventListener("mousedown", onClick);
        dropdown.dispatchEvent(new Event("editorDropdownClose", {bubbles: true}));
        dropdownButton.addEventListener("click", dropdownClick);
        document.removeEventListener("keydown", onKeyPress);
    }

    return {dropdown: dropdown, body: content, button: dropdownButton, close: close};
}

/*
Create a dropdown list.
*/
MimirUI.dropdownList = (optionValues, onChange) => {
    if (optionValues.length == 0) {return null;}

    // Create the input button.
    const inputButton = document.createElement("button");
    inputButton.classList.add("mimir-dropdown-list-open-button")
    
    // State.
    var currentSelected = optionValues[0].name;

    // Create the options.
    const options = [];
    const optionDiv = document.createElement("div");
    for (const option of optionValues) {
        const content = option.content;
        const name = option.name;

        // Create the button option.
        const button = document.createElement("button");
        button.append(content);
        options.push({name: name, button: button, content: content, buttonDisplay: option.buttonDisplay});
        const div = document.createElement("div");
        div.append(button);
        optionDiv.append(div);
        optionDiv.setAttribute("role", "menuitem");

        button.addEventListener("click", (e) => {
            setValue(name); 
            onChange(name);
            dropdownObj.close();
        });
    }
    optionDiv.classList.add("mimir-dropdown-list-options");

    // Create the modal.
    const dropdownObj = MimirUI.dropdown(inputButton, optionDiv);
    dropdownObj.dropdown.classList.add("mimir-dropdown-list");
    dropdownObj.dropdown.setAttribute("role", "listbox");

    // Get the current value.
    function getValue() {
        return currentSelected;
    }

    // Set the current value.
    function setValue(value) {
        if (!options.some((o) => o.name == value)) {
            value = options[0]?.name;
        }
        currentSelected = value;
        updateValue();
    }

    // Update value.
    function updateValue() {
        inputButton.innerHTML = "";
        const option = options.find((o) => o.name == currentSelected);
        if (!option) return;
        if (option.buttonDisplay) {
            inputButton.append(option.buttonDisplay.cloneNode(true))
        } else {
            inputButton.append(option.content.cloneNode(true));
        }
        inputButton.setAttribute("aria-valuetext", currentSelected);
    }

    updateValue();

    return {dropdown: dropdownObj, getValue: getValue, setValue: setValue, list: dropdownObj.dropdown};
}

/*
Create a number input.
*/
MimirUI.numberInput = (min, max) => {
    // Create the input field.
    const input = document.createElement("input");
    input.setAttribute("type", "number");
    input.setAttribute("min", min);
    input.setAttribute("max", max);
    input.classList.add("mimir-number-input-input");

    // Create the plus and minus buttons.
    const plus = document.createElement("button");
    plus.innerHTML = "+";
    plus.addEventListener("click", function() {
        input.value = Math.max(Math.min(parseFloat(input.value) + 1, max), min);
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
    });
    plus.classList.add("mimir-number-input-button");
    const minus = document.createElement("button");
    minus.innerHTML = "-";
    minus.addEventListener("click", function() {
        input.value = Math.max(Math.min(parseFloat(input.value) - 1, max), min);
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
    });
    minus.classList.add("mimir-number-input-button");

    // Create the combining DIV.
    const div = document.createElement("div");
    div.append(minus, input, plus);
    div.classList.add("mimir-number-input");
    return {numberInput: div, input: input, plus: plus, minus: minus};
}

/*
Convert RGB to HSV.
*/
MimirUI.rgbToHsv = (r, g, b) => { 
    r = r / 255.0; 
    g = g / 255.0; 
    b = b / 255.0; 
    var cmax = Math.max(r, Math.max(g, b));
    var cmin = Math.min(r, Math.min(g, b));
    var diff = cmax - cmin;
    var h = -1, s = -1; 
    if (cmax == cmin) 
        h = 0; 
    else if (cmax == r) 
        h = (60 * ((g - b) / diff) + 360) % 360; 
    else if (cmax == g) 
        h = (60 * ((b - r) / diff) + 120) % 360; 
    else if (cmax == b) 
        h = (60 * ((r - g) / diff) + 240) % 360; 

    if (cmax == 0) 
        s = 0; 
    else
        s = (diff / cmax) * 100; 

    var v = cmax * 100; 
    return [h, s, v];
} 

/*
Create a color input.
*/
MimirUI.colorInput = (callback, button, primaryWidth, hueWidth, height) => {
    // Create the body of the color picker.
    const body = document.createElement("div");
    body.classList.add("mimir-color-input-body");

    // First row of content.
    const rowOne = document.createElement("div");

    // Primary editor.
    const primaryContainer = document.createElement("div");
    primaryContainer.style.width = primaryWidth + "px";
    primaryContainer.style.height = height + "px";
    primaryContainer.setAttribute("role", "slider");
    primaryContainer.classList.add("mimir-color-picker-primary-container");
    const primary = document.createElement("canvas");
    primary.setAttribute("width", primaryWidth);
    primary.setAttribute("height", height)
    primary.setAttribute("role", "presentation");
    primary.classList.add("mimir-color-picker-primary-canvas");
    primaryContainer.append(primary);
    const primaryThumb = document.createElement("div");
    primaryThumb.classList.add("mimir-color-picker-primary-thumb");
    primaryThumb.setAttribute("role", "presentation");
    primaryContainer.append(primaryThumb);
    rowOne.append(primaryContainer);

    // Hue editor.
    const hueContainer = document.createElement("div");
    hueContainer.style.width = hueWidth + "px";
    hueContainer.style.height = height + "px";
    hueContainer.setAttribute("role", "slider");
    hueContainer.classList.add("mimir-color-picker-hue-container");
    const hue = document.createElement("canvas");
    hue.setAttribute("width", hueWidth);
    hue.setAttribute("height", height)
    hue.setAttribute("role", "presentation");
    hue.classList.add("mimir-color-picker-hue-canvas");
    hueContainer.append(hue);
    const hueSlider = document.createElement("div");
    hueSlider.classList.add("mimir-color-picker-hue-slider");
    hueSlider.setAttribute("role", "presentation");
    hueContainer.append(hueSlider);
    rowOne.append(hueContainer);

    // RGB form.
    const rgbForm = document.createElement("div");
    rgbForm.classList.add("mimir-color-picker-rgb-form");
    const rgbFormColor = document.createElement("div");
    rgbFormColor.setAttribute("role", "presentation");
    rgbFormColor.classList.add("mimir-color-picker-rgb-form-color");
    rgbForm.append(rgbFormColor);
    function createColorValueInput(label, aria) {
        const inputContainer = document.createElement("div");
        inputContainer.classList.add("mimir-color-picker-rgb-form-input-container");
        const colorLabel = document.createElement("label");
        colorLabel.append(label);
        colorLabel.setAttribute("aria-label", aria);
        colorLabel.classList.add("mimir-color-picker-rgb-form-input-label");
        const input = document.createElement("input");
        input.setAttribute("type", "number");
        input.setAttribute("min", "0");
        input.setAttribute("max", "255");
        input.addEventListener("change", () => {
            r = rgbFormInputR.value;
            g = rgbFormInputG.value;
            b = rgbFormInputB.value;

            // Clamp the value (because for some reason input doesn't do that).
            r = Math.min(Math.max(parseInt(r), 0), 255);
            g = Math.min(Math.max(parseInt(g), 0), 255);
            b = Math.min(Math.max(parseInt(b), 0), 255);
            rgbFormInputR.value = r;
            rgbFormInputG.value = g;
            rgbFormInputB.value = b;

            var [newH, newS, newV] = MimirUI.rgbToHsv(r, g, b);
            h = newH;
            primaryX = newS / 100 * primaryWidth;
            primaryY = height - newV / 100 * height;

            primaryCtx.fillStyle = `hsl(${h}deg 100% 50%)`;
            primaryCtx.fillRect(0, 0, primaryWidth, height);

            var whiteGradient = primaryCtx.createLinearGradient(0, 0, primaryWidth, 0);
            whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
            whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            primaryCtx.fillStyle = whiteGradient;
            primaryCtx.fillRect(0, 0, primaryWidth, height);

            var blackGradient = primaryCtx.createLinearGradient(0, 0, 0, height);
            blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
            blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
            primaryCtx.fillStyle = blackGradient;
            primaryCtx.fillRect(0, 0, primaryWidth, height);

            primaryThumb.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            primaryThumb.style.transform = `translate(${primaryX - 5}px, ${primaryY - 5}px`;
            rgbFormColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

            hueSlider.style.transform = `translate(0, ${h / 360 * height}px`;
        });
        inputContainer.append(colorLabel, input);
        return [inputContainer, input];
    }
    const [rgbFormInputContainerR, rgbFormInputR] = createColorValueInput("R", "Red component");
    const [rgbFormInputContainerG, rgbFormInputG] = createColorValueInput("G", "Green component");
    const [rgbFormInputContainerB, rgbFormInputB] = createColorValueInput("B", "Blue component");
    rgbForm.append(rgbFormInputContainerR, rgbFormInputContainerG, rgbFormInputContainerB)
    rowOne.append(rgbForm);

    body.append(rowOne);
    rowOne.classList.add("mimir-color-picker-row");

    // Row two.
    const rowTwo = document.createElement("div");

    // Save and remove buttons.
    const saveButton = document.createElement("button");
    saveButton.classList.add("mimir-color-picker-save-button", "mimir-action-button-primary");
    saveButton.innerHTML = "Save";
    saveButton.addEventListener("click", () => {callback(`rgb(${r}, ${g}, ${b})`); closeFunc();});
    saveButton.setAttribute("title", "Save Color");
    const removeButton = document.createElement("button");
    removeButton.classList.add("mimir-color-picker-remove-button", "mimir-action-button-secondary");
    removeButton.innerHTML = "Remove";
    removeButton.addEventListener("click", () => {callback(null); closeFunc();});
    removeButton.setAttribute("title", "Remove Color");
    rowTwo.append(saveButton, removeButton);

    body.append(rowTwo);
    rowTwo.classList.add("mimir-color-picker-row");
    
    // Create the button.
    button.classList.add("mimir-color-picker-button");

    // Create the dropdown.
    const dropdownObj = MimirUI.dropdown(button, body);
    const dropdown = dropdownObj.dropdown;
    const closeFunc = dropdownObj.close;

    // Variables.
    var h = 0;
    var r = 255;
    var g = 0;
    var b = 0;
    var primaryX = 0;
    var primaryY = 0;
    var primaryCtx = primary.getContext("2d", { willReadFrequently: true });
    var hueCtx = hue.getContext("2d");
    var dragPrimary = false;
    var dragHue = false;

    // Render the primary canvas.
    function renderPrimaryCanvas() {
        primaryCtx.fillStyle = `hsl(${h}deg 100% 50%)`;
        primaryCtx.fillRect(0, 0, primaryWidth, height);

        var whiteGradient = primaryCtx.createLinearGradient(0, 0, primaryWidth, 0);
        whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        primaryCtx.fillStyle = whiteGradient;
        primaryCtx.fillRect(0, 0, primaryWidth, height);

        var blackGradient = primaryCtx.createLinearGradient(0, 0, 0, height);
        blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
        primaryCtx.fillStyle = blackGradient;
        primaryCtx.fillRect(0, 0, primaryWidth, height);

        [r, g, b] = primaryCtx.getImageData(primaryX, primaryY, 1, 1).data;
        primaryThumb.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        primaryThumb.style.transform = `translate(${primaryX - 5}px, ${primaryY - 5}px`;
        rgbFormColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        rgbFormInputR.value = r;
        rgbFormInputG.value = g;
        rgbFormInputB.value = b;

        [h, s, v] = MimirUI.rgbToHsv(r, g, b);
        primary.setAttribute("aria-valuetext", `Saturation: ${s}, Value: ${v}`);
    }

    // Render the hue canvas.
    function renderHueCanvas() {
        hueCtx.rect(0, 0, hueWidth, height);

        var hueGradient = hueCtx.createLinearGradient(0, 0, 0, height);
        hueGradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
        hueGradient.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
        hueGradient.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
        hueGradient.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
        hueGradient.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
        hueGradient.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
        hueGradient.addColorStop(1, 'rgba(255, 0, 0, 1)');
        hueCtx.fillStyle = hueGradient;
        hueCtx.fill();

        primary.setAttribute("aria-valuetext", `Hue: ${h} degrees`);
    }

    // Update color on primary canvas.
    function primaryUpdateColor(e) {
        if (e.touches) {
            // Touch event.
            const rect = primary.getBoundingClientRect();
            primaryX = Math.min(Math.max(e.touches[0].clientX - rect.x, 0), primaryWidth - 1);
            primaryY = Math.max(Math.min(e.touches[0].clientY - rect.y, height - 1), 0);
        } else {
            // Mouse event.
            const rect = primary.getBoundingClientRect();
            primaryX = Math.min(Math.max(e.clientX - rect.x, 0), primaryWidth - 1);
            primaryY = Math.max(Math.min(e.clientY - rect.y, height - 1), 0);
        }
        [r, g, b] = primaryCtx.getImageData(primaryX, primaryY, 1, 1).data;        
        primaryThumb.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        primaryThumb.style.transform = `translate(${primaryX - 5}px, ${primaryY - 5}px`;
        rgbFormColor.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        rgbFormInputR.value = r;
        rgbFormInputG.value = g;
        rgbFormInputB.value = b;
    }

    // Mouse events for primary canvas.
    function mouseDownPrimary(e) {
        dragPrimary = true;
        primaryUpdateColor(e);
        document.addEventListener("mouseup", mouseUpPrimary);
        document.addEventListener("touchend", mouseUpPrimary);

        // Bind move listeners.
        document.addEventListener("mousemove", mouseMovePrimary, false);
        document.addEventListener("mouseup", mouseUpPrimary, false);
        document.addEventListener("touchmove", mouseMovePrimary, false);
        document.addEventListener("touchend", mouseUpPrimary, false);
    }
    function mouseMovePrimary(e) {
        e.preventDefault();
        if (dragPrimary) primaryUpdateColor(e);
    }
    function mouseUpPrimary(e) {
        dragPrimary = false;
        document.removeEventListener("mouseup", mouseUpPrimary);
        document.removeEventListener("touchend", mouseUpPrimary);

        // Remove move listeners.
        document.removeEventListener("mousemove", mouseMovePrimary);
        document.removeEventListener("mouseup", mouseUpPrimary);
        document.removeEventListener("touchmove", mouseMovePrimary);
        document.removeEventListener("touchend", mouseUpPrimary);
    }

    // Update color on hue canvas.
    function hueUpdateColor(e) {
        if (e.touches) {
            // Touch event.
            const rect = hue.getBoundingClientRect();
            const offset = Math.max(Math.min((e.touches[0].clientY - rect.y), height), 0);
            h = offset / height * 360;
            hueSlider.style.transform = `translate(0, ${offset}px`;
        } else {
            // Mouse event.
            const rect = hue.getBoundingClientRect();
            const offset = Math.max(Math.min((e.clientY - rect.y), height), 0);
            h = offset / height * 360;
            hueSlider.style.transform = `translate(0, ${offset}px`;
        }
        renderPrimaryCanvas();
    }

    // Mouse events for hue canvas.
    function mouseDownHue(e) {
        dragHue = true;
        hueUpdateColor(e);
        document.addEventListener("mouseup", mouseUpHue);
        document.addEventListener("touchend", mouseUpHue);

        // Bind move listeners.
        document.addEventListener("mousemove", mouseMoveHue, false);
        document.addEventListener("mouseup", mouseUpHue, false);
        document.addEventListener("touchmove", mouseMoveHue, false);
        document.addEventListener("touchend", mouseUpHue, false);
    }
    function mouseMoveHue(e) {
        e.preventDefault();
        if (dragHue) hueUpdateColor(e);
    }
    function mouseUpHue(e) {
        dragHue = false;
        document.removeEventListener("mouseup", mouseUpHue);
        document.removeEventListener("touchend", mouseUpHue);

        // Remove move listeners.
        document.removeEventListener("mousemove", mouseMoveHue);
        document.removeEventListener("mouseup", mouseUpHue);
        document.removeEventListener("touchmove", mouseMoveHue);
        document.removeEventListener("touchend", mouseUpHue);
    }

    // Input dropdown open.
    function onOpen() {
        renderPrimaryCanvas();
        renderHueCanvas();

        // Bind event listeners.
        primary.addEventListener("mousedown", mouseDownPrimary);
        primary.addEventListener("touchstart", mouseDownPrimary);
        hue.addEventListener("mousedown", mouseDownHue);
        hue.addEventListener("touchstart", mouseDownHue);
    }

    // Input dropdown close.
    function onClose() {
        // Remove event listeners.
        primary.removeEventListener("mousedown", mouseDownPrimary);
        primary.removeEventListener("touchstart", mouseDownPrimary);
        hue.removeEventListener("mousedown", mouseDownHue);
        hue.removeEventListener("touchstart", mouseDownHue);
    }

    // Bind events.
    dropdown.addEventListener("editorDropdownOpen", onOpen);
    dropdown.addEventListener("editorDropdownClose", onClose);

    function getValue() {
        return `rgb(${r}, ${g}, ${b})`;
    }

    return {colorInput: dropdown, dropdown: dropdownObj, getValue: getValue};
}

/*
Create a link input.
*/
MimirUI.linkInput = (callback, button) => {
    // Create the body of the link input.
    const body = document.createElement("div");
    body.classList.add("mimir-link-input-body");
    
    const title = document.createElement("h4");
    title.innerHTML = "Insert Link";
    title.classList.add("mimir-modal-label");
    const urlInput = document.createElement("input")
    urlInput.classList.add("mimir-link-input-input", "mimir-modal-input");
    urlInput.setAttribute("placeholder", "URL");
    urlInput.setAttribute("type", "url");
    body.append(title, urlInput);

    // Create the dropdown.
    button.classList.add("mimir-link-input-button");
    const dropdownObj = MimirUI.dropdown(button, body);
    const dropdown = dropdownObj.dropdown;
    const closeFunc = dropdownObj.close;

    // Value.
    var value = null;
    function getValue() {
        return value;
    }

    // Save and remove buttons.
    const saveButton = document.createElement("button");
    saveButton.classList.add("mimir-link-input-save-button", "mimir-action-button-primary");
    saveButton.innerHTML = "Save";
    saveButton.addEventListener("click", () => {callback(urlInput.value); value = urlInput.value; closeFunc(); urlInput.value = "";});
    saveButton.setAttribute("title", "Save Link");
    const removeButton = document.createElement("button");
    removeButton.classList.add("mimir-link-input-remove-button", "mimir-action-button-secondary");
    removeButton.innerHTML = "Remove";
    removeButton.addEventListener("click", () => {callback(null); closeFunc();});
    removeButton.setAttribute("title", "Remove Link");
    const buttonRow = document.createElement("div");
    buttonRow.classList.add("mimir-modal-row");
    buttonRow.append(saveButton, removeButton);
    body.append(buttonRow);

    return {linkInput: dropdown, dropdown: dropdownObj, getValue: getValue};
}

/*
Create a image input.
*/
MimirUI.imageInput = (callback, button, objectURLList) => {
    // Create the body of the image input.
    const body = document.createElement("div");
    body.classList.add("mimir-image-input-body");
    
    const title = document.createElement("h4");
    title.innerHTML = "Insert Image";
    title.classList.add("mimir-modal-label");
    const imageInput = document.createElement("input")
    imageInput.classList.add("mimir-image-input-input");
    imageInput.setAttribute("type", "file");
    imageInput.setAttribute("accept", "image/jpeg, image/png, image/gif, image/bmp, image/webp, image/tiff");
    const urlInput = document.createElement("input");
    urlInput.classList.add("mimir-image-url-input", "mimir-modal-input");
    urlInput.setAttribute("placeholder", "URL");
    urlInput.setAttribute("type", "url");
    const altInput = document.createElement("input")
    altInput.classList.add("mimir-image-alt-input", "mimir-modal-input");
    altInput.setAttribute("placeholder", "Alt Text");
    body.append(title, imageInput, urlInput, altInput);

    // Create the dropdown.
    button.classList.add("mimir-image-input-button");
    const dropdownObj = MimirUI.dropdown(button, body);
    const dropdown = dropdownObj.dropdown;
    const closeFunc = dropdownObj.close;

    // Save button.
    const saveButton = document.createElement("button");
    saveButton.classList.add("mimir-image-input-save-button");
    saveButton.innerHTML = "Insert";
    saveButton.addEventListener("click", () => {
        if (imageInput.files.length != 0) {
            const url = URL.createObjectURL(imageInput.files[0]);
            callback(url, altInput.value ? altInput.value : imageInput.files[0].name);
            objectURLList.push(url);
        } else if (urlInput.value) {
            callback(urlInput.value, altInput.value ? altInput.value : urlInput.value.split('/').pop());
        }
        imageInput.value = null;
        urlInput.value = "";
        closeFunc();
    });
    saveButton.setAttribute("title", "Insert Image");
    saveButton.classList.add("mimir-action-button-primary");
    const buttonRow = document.createElement("div");
    buttonRow.classList.add("mimir-modal-row");
    buttonRow.append(saveButton);
    body.append(buttonRow);

    return {imageInput: dropdown, dropdown: dropdownObj};
}

/*
Bind events and UI for moving, selecting, resizing, and deleting images.
*/
MimirUI.bindImageEditing = (editor, onEdit) => {
    // Create editing UI. The UI is absolute positioned and placed after the editor.
    const ui = document.createElement("div");
    ui.setAttribute("id", "mimir-image-editing-ui");
    editor.after(ui);

    // Side bars.
    const resizeBarTop = document.createElement("div");
    const resizeBarBottom = document.createElement("div");
    const resizeBarLeft = document.createElement("div");
    const resizeBarRight = document.createElement("div");
    resizeBarTop.classList.add("resize-bar", "resize-bar-horizontal", "resize-bar-top");
    resizeBarBottom.classList.add("resize-bar", "resize-bar-horizontal", "resize-bar-bottom");
    resizeBarLeft.classList.add("resize-bar", "resize-bar-vertical", "resize-bar-left");
    resizeBarRight.classList.add("resize-bar", "resize-bar-vertical", "resize-bar-right");
    ui.append(resizeBarTop, resizeBarBottom, resizeBarLeft, resizeBarRight);
    
    // Image corner resize boxes.
    const resizeBoxTopRight = document.createElement("div");
    const resizeBoxTopLeft = document.createElement("div");
    const resizeBoxBottomRight = document.createElement("div");
    const resizeBoxBottomLeft = document.createElement("div");
    resizeBoxTopRight.classList.add("resize-box", "resize-box-top-right");
    resizeBoxTopLeft.classList.add("resize-box", "resize-box-top-left");
    resizeBoxBottomRight.classList.add("resize-box", "resize-box-bottom-right");
    resizeBoxBottomLeft.classList.add("resize-box", "resize-box-bottom-left");
    resizeBoxTopRight.setAttribute("unselectable", "true");
    resizeBoxTopLeft.setAttribute("unselectable", "true");
    resizeBoxBottomRight.setAttribute("unselectable", "true");
    resizeBoxBottomLeft.setAttribute("unselectable", "true");
    ui.append(resizeBoxTopRight, resizeBoxTopLeft, resizeBoxBottomRight, resizeBoxBottomLeft);
    
    // State management.
    var selectedImage = null;
    var draggedCorner = null;
    var draggedSide = null;
    var lastX, lastY = 0;
    var currentWidth, currentHeight = 0;

    // Select an image.
    function selectImage(elem) {
        selectedImage = elem;
        resizeBoxTopRight.style.display = "block";
        resizeBoxTopLeft.style.display = "block";
        resizeBoxBottomRight.style.display = "block";
        resizeBoxBottomLeft.style.display = "block";
        resizeBarTop.style.display = "block";
        resizeBarBottom.style.display = "block";
        resizeBarLeft.style.display = "block";
        resizeBarRight.style.display = "block";
        updateUI();

        const computedStyle = getComputedStyle(selectedImage);
        const originalWidth = parseInt(computedStyle.width.slice(0, -2));
        const originalHeight = parseInt(computedStyle.height.slice(0, -2));
        currentWidth = originalWidth;
        currentHeight = originalHeight;

        // Bind events.
        window.addEventListener("resize", updateUI);
        editor.addEventListener("scroll", updateUI);

        // Disable user selection on the image.
        selectedImage.classList.add("mimir-hide-selection");

        document.getSelection().removeAllRanges();
    }

    // Deselect an image.
    function deselectImage() {
        if (!selectedImage) {return;}

        // Re-enable user selection on the image.
        selectedImage.classList.remove("mimir-hide-selection");

        selectedImage = null;
        resizeBoxTopRight.style.display = "none";
        resizeBoxTopLeft.style.display = "none";
        resizeBoxBottomRight.style.display = "none";
        resizeBoxBottomLeft.style.display = "none";
        resizeBarTop.style.display = "none";
        resizeBarBottom.style.display = "none";
        resizeBarLeft.style.display = "none";
        resizeBarRight.style.display = "none";

        // Unbind events.
        window.removeEventListener("resize", updateUI);
        editor.removeEventListener("scroll", updateUI);
    }

    // Update the UI.
    function updateUI() {
        if (!selectedImage) {return;}

        const rect = selectedImage.getBoundingClientRect();
        const scrollTop = document.documentElement.scrollTop;

        resizeBoxTopLeft.style.left = rect.left - 5 + "px";
        resizeBoxTopLeft.style.top = (rect.top + scrollTop) - 5  + "px";
        resizeBoxTopRight.style.left = rect.left + rect.width - 5 + "px";
        resizeBoxTopRight.style.top = (rect.top + scrollTop) - 5 + "px";
        resizeBoxBottomLeft.style.left = rect.left - 5 + "px";
        resizeBoxBottomLeft.style.top = (rect.bottom + scrollTop) - 5 + "px";
        resizeBoxBottomRight.style.left = rect.left + rect.width - 5 + "px";
        resizeBoxBottomRight.style.top = (rect.bottom + scrollTop) - 5 + "px";

        resizeBarTop.style.left = rect.left + "px";
        resizeBarTop.style.top = (rect.top + scrollTop) + "px";
        resizeBarTop.style.width = rect.width + "px";
        resizeBarBottom.style.left = rect.left + "px";
        resizeBarBottom.style.top = (rect.bottom + scrollTop) + "px";
        resizeBarBottom.style.width = rect.width + "px";
        resizeBarLeft.style.left = rect.left + "px";
        resizeBarLeft.style.top = (rect.top + scrollTop) + "px";
        resizeBarLeft.style.height = rect.height + "px";
        resizeBarRight.style.left = rect.left + rect.width + "px";
        resizeBarRight.style.top = (rect.top + scrollTop) + "px";
        resizeBarRight.style.height = rect.height + "px";
    }

    function startDragCorner(e) {
        if (!selectedImage) {return;}

        e.preventDefault();

        if (e.touches) {
            e = e.touches[0];
        }

        draggedCorner = e.target;
        lastX = e.clientX;
        lastY = e.clientY;
    }

    function dragCorner(e) {
        if (!selectedImage) {return;}
        if (!draggedCorner) {return;}

        e.preventDefault();

        if (e.touches) {
            e = e.touches[0];
        }

        // We want to ensure the image always maintains its original 
        // proportions. We first calculate two ratios (imgSin, imgCos), 
        // representing the ratio of the height to the hypotenuse and the
        // width to the hypotenuse, respectively. We then allow the image to
        // be scaled via the drag event, then calculate the new width and 
        // height. Using this, we can determine a new hypotenuse and match the
        // width and height to this value using the ratios calculated from 
        // before.
        const offsetX = e.clientX - lastX;
        const offsetY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // Find the old hypotenuse and calculate the two ratios.
        const hypot = Math.sqrt(currentWidth * currentWidth + currentHeight * currentHeight);
        const imgSin = currentWidth / hypot;
        const imgCos = currentHeight / hypot;
        
        switch (draggedCorner) {
            case resizeBoxTopLeft:
                // Calculate the new width and height.
                currentWidth = currentWidth - offsetX;
                currentHeight = currentHeight - offsetY;
                
                // Calculate the new hypotenuse.
                var newHypot = Math.sqrt(currentWidth * currentWidth + currentHeight * currentHeight);
                
                // Scale the image according to the new hypotenuse and the old ratios.
                currentWidth = imgSin * newHypot;
                currentHeight = imgCos * newHypot;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBoxTopRight:
                currentWidth = currentWidth + offsetX;
                currentHeight = currentHeight - offsetY;
                var newHypot = Math.sqrt(currentWidth * currentWidth + currentHeight * currentHeight);
                currentWidth = imgSin * newHypot;
                currentHeight = imgCos * newHypot;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBoxBottomLeft:
                currentWidth = currentWidth - offsetX;
                currentHeight = currentHeight + offsetY;
                var newHypot = Math.sqrt(currentWidth * currentWidth + currentHeight * currentHeight);
                currentWidth = imgSin * newHypot;
                currentHeight = imgCos * newHypot;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBoxBottomRight:
                currentWidth = currentWidth + offsetX;
                currentHeight = currentHeight + offsetY;
                var newHypot = Math.sqrt(currentWidth * currentWidth + currentHeight * currentHeight);
                currentWidth = imgSin * newHypot;
                currentHeight = imgCos * newHypot;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
        }
        updateUI();
    }

    function endDragCorner(e) {
        if (!selectedImage) {return;}
        if (!draggedCorner) {return;}

        draggedCorner = null;
        onEdit();
    }

    function bindListenersToResizeBox(b) {
        b.addEventListener("mousedown", startDragCorner);
        b.addEventListener("touchstart", startDragCorner);
    }
    bindListenersToResizeBox(resizeBoxTopRight);
    bindListenersToResizeBox(resizeBoxTopLeft);
    bindListenersToResizeBox(resizeBoxBottomRight);
    bindListenersToResizeBox(resizeBoxBottomLeft);
    document.addEventListener("mousemove", dragCorner);
    document.addEventListener("mouseup", endDragCorner);
    document.addEventListener("touchmove", dragCorner);
    document.addEventListener("touchend", endDragCorner);

    function startDragSide(e) {
        if (!selectedImage) {return;}

        e.preventDefault();

        if (e.touches) {
            e = e.touches[0];
        }

        draggedSide = e.target;
        lastX = e.clientX;
        lastY = e.clientY;
    }

    function dragSide(e) {
        if (!selectedImage) {return;}
        if (!draggedSide) {return;}

        e.preventDefault();

        if (e.touches) {
            e = e.touches[0];
        }

        const offsetX = e.clientX - lastX;
        const offsetY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        switch (draggedSide) {
            case resizeBarLeft:
                // Calculate the new width and height.
                currentWidth = currentWidth - offsetX;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBarRight:
                currentWidth = currentWidth + offsetX;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBarTop:
                currentHeight = currentHeight + offsetY;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
            case resizeBarBottom:
                currentHeight = currentHeight + offsetY;
                selectedImage.style.width = currentWidth + "px";
                selectedImage.style.height = currentHeight + "px";
                break;
        }
        updateUI();
    }

    function endDragSide(e) {
        if (!selectedImage) {return;}
        if (!draggedSide) {return;}

        draggedSide = null;
        onEdit();
    }

    function bindListenersToResizeSide(b) {
        b.addEventListener("mousedown", startDragSide);
        b.addEventListener("touchstart", startDragSide);
    }
    bindListenersToResizeSide(resizeBarTop);
    bindListenersToResizeSide(resizeBarLeft);
    bindListenersToResizeSide(resizeBarRight);
    bindListenersToResizeSide(resizeBarBottom);
    document.addEventListener("mousemove", dragSide);
    document.addEventListener("mouseup", endDragSide);
    document.addEventListener("touchmove", dragSide);
    document.addEventListener("touchend", endDragSide);

    // Bind image selection.
    editor.addEventListener("mousedown", (e) => {
        if (e.target == selectedImage) {
            return;
        }
        if (ui.contains(e.target)) {
            return;
        }

        if (e.target != selectedImage && selectedImage) {
            // Deselect the image.
            deselectImage();
        }

        if (e.target.tagName == "IMG") {
            selectImage(e.target);
        }
    });
    document.addEventListener("selectionchange", (e) => {
        if (selectedImage) {
            if (document.getSelection().rangeCount) deselectImage();
        };
    });
    window.addEventListener("mousedown", (e) => {
        if (!(editor.parentNode && editor.parentNode.contains(e.target)) && !ui.contains(e.target)) {
            deselectImage();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (!selectedImage) {return;}
        
        if (e.key == "Delete" || e.key == "Backspace") {
            selectedImage.remove();
            deselectImage();
        }
    });

    editor.addEventListener("keydown", (e) => {
        if (e.key == "c" && (e.ctrlKey || e.metaKey) && selectedImage && document.getSelection().rangeCount == 0) {
            // Copy the image. Select the image with the range then re-select the image with the UI.
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
        } else if (e.key == "x" && (e.ctrlKey || e.metaKey) && selectedImage && document.getSelection().rangeCount == 0) {
            // Cut the image. Select the image with the range then re-select the image with the UI.
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            deselectImage();
        } else if (e.key == "v" && (e.ctrlKey || e.metaKey) && selectedImage && document.getSelection().rangeCount == 0) {
            // Paste into the image. Delete the image and allow the paste event to occur.
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            selectedImage.remove();
            deselectImage();
        } else if (e.key == "ArrowLeft" && selectedImage && document.getSelection().rangeCount == 0) {
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            newRange.collapse(true);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            deselectImage();
        } else if (e.key == "ArrowRight" && selectedImage && document.getSelection().rangeCount == 0) {
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            newRange.collapse(false);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            deselectImage();
        } else if (e.key == "ArrowUp" && selectedImage && document.getSelection().rangeCount == 0) {
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            newRange.collapse(false);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            deselectImage();
        } else if (e.key == "ArrowDown" && selectedImage && document.getSelection().rangeCount == 0) {
            const newRange = new Range();
            newRange.selectNode(selectedImage);
            newRange.collapse(false);
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(newRange);
            deselectImage();
        }
    });

    return {getSelected: () => {return selectedImage;}, select: (img) => {
        selectImage(img);
    }, deselect: () => {deselectImage()}};
}

/*
Find and replace module.
*/
MimirUI.findAndReplace = (editor, onEdit, api) => {
    // Find and replace modal UI.
    const ui = document.createElement("div");
    ui.setAttribute("id", "mimir-find-and-replace-ui");
    ui.setAttribute("aria-hidden", "true");
    ui.setAttribute("aria-disabled", "true");
    editor.before(ui);

    // Find UI.
    const findDiv = document.createElement("div");
    findDiv.classList.add("mimir-modal-row");
    const findInput = document.createElement("input");
    findInput.classList.add("mimir-find-and-replace-find-input", "mimir-modal-input");
    findInput.setAttribute("placeholder", "Search for");
    findDiv.append(findInput);
    const findButton = document.createElement("button");
    findButton.classList.add("mimir-find-and-replace-find-button", "mimir-action-button-primary");
    findButton.innerHTML = "Find";
    findButton.setAttribute("title", "Find");
    findDiv.append(findButton);
    const findUpButton = document.createElement("button");
    findUpButton.classList.add("mimir-find-and-replace-find-up-button", "mimir-action-button-secondary");
    findUpButton.innerHTML = "&#9650;";
    findUpButton.setAttribute("title", "Find Up");
    findDiv.append(findUpButton);
    const findDownButton = document.createElement("button");
    findDownButton.classList.add("mimir-find-and-replace-find-down-button", "mimir-action-button-secondary");
    findDownButton.innerHTML = "&#9660;";
    findDownButton.setAttribute("title", "Find Down");
    findDiv.append(findDownButton);
    const toggleCaseSensitiveButton = document.createElement("button");
    toggleCaseSensitiveButton.classList.add("mimir-find-and-replace-toggle-case-sensitive-button");
    toggleCaseSensitiveButton.innerHTML = "Aa";
    toggleCaseSensitiveButton.classList.toggle("mimir-toggled", true);
    toggleCaseSensitiveButton.setAttribute("title", "Toggle Case Sensitive");
    toggleCaseSensitiveButton.setAttribute("aria-pressed", "true");
    findDiv.append(toggleCaseSensitiveButton);
    ui.append(findDiv);

    // Replace UI.
    const replaceDiv = document.createElement("div");
    replaceDiv.classList.add("mimir-modal-row");
    const replaceInput = document.createElement("input");
    replaceInput.classList.add("mimir-find-and-replace-replace-input", "mimir-modal-input");
    replaceInput.setAttribute("placeholder", "Replace with");
    replaceDiv.append(replaceInput);
    const replaceButton = document.createElement("button");
    replaceButton.classList.add("mimir-find-and-replace-replace-button", "mimir-action-button-primary");
    replaceButton.setAttribute("title", "Replace");
    replaceButton.innerHTML = "Replace";
    replaceDiv.append(replaceButton);
    const replaceAllButton = document.createElement("button");
    replaceAllButton.classList.add("mimir-find-and-replace-replace-all-button", "mimir-action-button-primary");
    replaceAllButton.innerHTML = "Replace All";
    replaceAllButton.setAttribute("title", "Replace All");
    replaceDiv.append(replaceAllButton);
    ui.append(replaceDiv);

    // State.
    var opened = false;
    var matches = null;
    var search = null;
    var selectedOffset = null;
    var ignoreNextClick = false;
    var caseSensitive = true;

    function open() {
        if (ignoreNextClick) {
            ignoreNextClick = false;
            return;
        }
        opened = true;
        ui.style.display = "flex";
        api.menubarOptions.openFindAndReplace.setAttribute("aria-expanded", "true");
        ui.setAttribute("aria-hidden", "false");
        ui.setAttribute("aria-disabled", "false");
        findInput.value = "";
        findUpButton.disabled = true;
        findDownButton.disabled = true;
        replaceInput.value = "";
        replaceButton.disabled = true;
        replaceAllButton.disabled = true;
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKeyPress);
        findInput.focus();

        updateModalPosition();
    }

    function updateModalPosition() {
        const rect = ui.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        ui.style.left = editorRect.right - rect.width + "px";
        ui.style.top = editorRect.top + "px";
    }

    function close() {
        opened = false;
        ui.style.display = "none";
        api.menubarOptions.openFindAndReplace.setAttribute("aria-expanded", "false");
        ui.setAttribute("aria-expanded", "false");
        ui.setAttribute("aria-hidden", "true");
        ui.setAttribute("aria-disabled", "true");
        removeSearch();
    }

    function onKeyPress(event) {
        if (event.key == "Escape") {
            close();
        }
    }

    function toggleCaseSensitive(event) {
        caseSensitive = !caseSensitive;
        toggleCaseSensitiveButton.classList.toggle("mimir-toggled", caseSensitive);
        toggleCaseSensitiveButton.setAttribute("aria-pressed", "" + caseSensitive);
        if (search) {
            find();
        }
    }
    toggleCaseSensitiveButton.addEventListener("click", toggleCaseSensitive);

    window.addEventListener("resize", () => {
        if (opened) updateModalPosition();
    });

    function onClick(event) {
        if (!(ui.contains(event.target))) {
            if (ui.style.display == "flex") {
                close();
            }
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKeyPress);
            if (api.menubarOptions.openFindAndReplace && api.menubarOptions.openFindAndReplace.contains(event.target)) {
                // If we click on the menubar button for opening find and replace
                ignoreNextClick = true;
            }
        }
    }

    function removeSearch() {
        if (search) {
            unhighlight(matches);
            matches = null;
            search = null;
            selectedOffset = null;
        }
    }

    function find() {
        removeSearch();
        if (findInput.value == "") {
            search = null;
            matches = null;
            selectedOffset = 0;
            findUpButton.disabled = true;
            findDownButton.disabled = true;
            replaceButton.disabled = true;
            replaceAllButton.disabled = true;
            return;
        }
        matches = findInEditor(findInput.value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
        if (!matches) {return;}
        matches = prepareMatches(matches);
        search = findInput.value;
        matches = highlight(matches);
        selectedOffset = 0;
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.add("mimir-find-and-replace-current"));
        findUpButton.disabled = false;
        findDownButton.disabled = false;
        replaceButton.disabled = false;
        replaceAllButton.disabled = false;
        if (matches[selectedOffset]) {
            matches[selectedOffset][0].wrapper?.scrollIntoView(false);
        }
    }

    function selectCurrent() {
        if (!matches[selectedOffset]) {return;}
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.add("mimir-find-and-replace-current"));
    }

    function next() {
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.remove("mimir-find-and-replace-current"));
        selectedOffset = (selectedOffset + 1) % matches.length;
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.add("mimir-find-and-replace-current"));
        if (matches[selectedOffset]) {
            matches[selectedOffset][0].wrapper?.scrollIntoView(false);
        }
    }

    function previous() {
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.remove("mimir-find-and-replace-current"));
        selectedOffset = selectedOffset - 1;
        if (selectedOffset == -1) {selectedOffset = matches.length - 1};
        matches[selectedOffset]?.forEach(n => n.wrapper.classList.add("mimir-find-and-replace-current"));
        if (matches[selectedOffset]) {
            matches[selectedOffset][0].wrapper?.scrollIntoView(false);
        }
    }

    findButton.addEventListener("click", find);
    findUpButton.addEventListener("click", previous);
    findDownButton.addEventListener("click", next);

    function findInEditor(re) {
        const blocks = ["BR", "DIV", "P", "OL", "UL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "HR"];
        if (!editor.firstChild) {return;}
        var aggregate = editor.textContent.split("\u00A0").join(" ");
        if (!caseSensitive) {
            aggregate = aggregate.toLowerCase();
            re = re.toLowerCase();
        }
        const matches = aggregate.matchAll(re);
        const matchGroups = [];

        function findNodesOfOffset(start, end) {
            var currentNode = editor.firstChild;
            var currentOffset = 0;
            const matchNodes = [];
            var foundFirstNode = false;
            while (currentOffset < end) {
                if (foundFirstNode && blocks.includes(currentNode.tagName)) {
                    return null;
                }

                if (currentOffset + currentNode.textContent.length > start) {
                    if (currentNode.nodeType == Node.TEXT_NODE) {
                        const offsetStart = Math.max(start - currentOffset, 0);
                        const offsetEnd = Math.min(end - currentOffset, currentNode.data.length);
                        matchNodes.push({node: currentNode, startOffset: offsetStart, endOffset: offsetEnd});
                        foundFirstNode = true;
                    } else {
                        if (currentNode.firstChild) {
                            currentNode = currentNode.firstChild;
                            continue;
                        }
                    }
                }

                currentOffset += currentNode.textContent.length;
                if (currentNode.nextSibling) {
                    currentNode = currentNode.nextSibling;
                } else {
                    while (!currentNode.nextSibling) {
                        currentNode = currentNode.parentNode;
                        if (currentNode == editor) {
                            return matchNodes;
                        }
                    }
                    currentNode = currentNode.nextSibling;
                }
            }
            return matchNodes;
        }

        for (const match of matches) {
            const group = findNodesOfOffset(match.index, match.index + match[0].length);
            if (group != null) {
                matchGroups.push(group);
            }
        }
        return matchGroups;
    }

    function newWrapper() {
        const wrapper = document.createElement("span");
        wrapper.classList.add("mimir-find-and-replace-match");
        return wrapper;
    }

    function replace(newText) {
        function removeExtraneousParents(node, insertBrIfNeeded) {
            var currentNode = node;
            while (api.inEditor(currentNode.parentNode) && currentNode.parentNode != editor && api.isEmpty(currentNode.parentNode) && (api.inlineStylingTags.includes(currentNode.parentNode.tagName) || currentNode.parentNode.tagName == "SPAN")) {
                currentNode = currentNode.parentNode;
            }
            // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
            if (insertBrIfNeeded) {
                const previousSibling = api.leftSiblingIgnoreEmpty(currentNode);
                const nextSibling = api.rightSiblingIgnoreEmpty(currentNode);
                // In case we were in a DIV and it has since became empty, add in a BR to retain the line.
                if (api.blockTags.includes(currentNode.parentNode.tagName) && api.isEmpty(currentNode.parentNode) && !api.childlessTags.includes(currentNode.parentNode.tagName)) {
                    currentNode.before(document.createElement("BR"));
                } else if ((previousSibling && api.blockTags.includes(previousSibling.tagName) && (!nextSibling || api.blockTags.includes(nextSibling.tagName)))
                        || (nextSibling && api.blockTags.includes(nextSibling.tagName) && (!previousSibling || api.blockTags.includes(previousSibling.tagName)))) {
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
            
            return currentNode;
        }

        if (matches[selectedOffset]) {
            const match = matches[selectedOffset];
            match[0].node.textContent = newText;
            if (match[0].wrapper && newText != "") {
                match[0].wrapper.after(match[0].node);
                match[0].wrapper.remove();
            }
            for (const nodeRange of match.slice(1, -1)) {
                removeExtraneousParents(nodeRange.node, false);
                nodeRange.node.remove();
                if (nodeRange.wrapper) {
                    nodeRange.wrapper.remove();
                }
            }
            // If newText is empty, remove extraneous nodes and insert a BR if necessary.
            if (newText == "") {
                removeExtraneousParents(match[0].node, true);
            }
            matches.splice(selectedOffset, 1);
            selectedOffset = selectedOffset % matches.length;
            matches[selectedOffset]?.forEach(n => n.wrapper.classList.add("mimir-find-and-replace-current"));
            if (matches[selectedOffset]) {
                matches[selectedOffset][0].wrapper?.scrollIntoView(false);
            }
        }
    }

    function replaceClick() {
        replace(replaceInput.value);
        onEdit();
    }

    function replaceAllClick() {
        while (matches.length != 0) {
            replace(replaceInput.value);
            onEdit();
        }
    }

    replaceButton.addEventListener("click", replaceClick);
    replaceAllButton.addEventListener("click", replaceAllClick);

    function prepareMatches(matches) {
        // This function takes in a list of matches and splits the text nodes so that the entire nodes are included in the match.
        // We work backwards so that the earlier matches don't mess up the offset values for later matches.
        for (const match of matches.reverse()) {
            for (const nodeRange of match) {
                // Split the node.
                const after = document.createTextNode(nodeRange.node.data.slice(nodeRange.endOffset, nodeRange.node.data.length));
                nodeRange.node.after(after);
                const including = document.createTextNode(nodeRange.node.data.slice(nodeRange.startOffset, nodeRange.endOffset));
                nodeRange.node.after(including);
                nodeRange.node.data = nodeRange.node.data.slice(0, nodeRange.startOffset);
                nodeRange.node = including;

                // Update the offsets after slicing the node.
                nodeRange.startOffset = 0;
                nodeRange.endOffset = 0;
            }
        }
        matches.reverse();
        return matches;
    }

    function highlight(matches) {
        for (const match of matches) {
            for (const nodeRange of match) {
                // Wrap the node.
                nodeRange.wrapper = newWrapper();
                nodeRange.node.after(nodeRange.wrapper);
                nodeRange.wrapper.append(nodeRange.node);
            }
        }
        return matches;
    }

    function unhighlight(matches) {
        for (const match of matches) {
            for (const nodeRange of match) {
                if (!nodeRange.wrapper) continue;
                nodeRange.wrapper.after(nodeRange.node);
                nodeRange.wrapper.remove();
            }
        }
        return matches;
    }

    function isOpen() {
        return !!matches;
    }

    function getMatches() {
        return matches;
    }

    function getCurrent() {
        return selectedOffset;
    }

    return {open: open, close: close, find: findInEditor, highlight: function() {highlight(matches)}, unhighlight: function() {unhighlight(matches)}, isOpen: isOpen, getMatches: getMatches, getCurrent: getCurrent, selectCurrent: selectCurrent};
}

module.exports = MimirUI;