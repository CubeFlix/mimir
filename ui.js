/* ui.js - Custom UI components for the rich text editor. */

const EditorUI = {};

/*
Create a dropdown menu.
*/
EditorUI.dropdown = (button, content) => {
    // Create the dropdown.
    const dropdown = document.createElement("div");
    dropdown.classList.add("editor-dropdown");
    const dropdownButton = document.createElement("div");
    dropdownButton.classList.add("editor-dropdown-button");
    dropdown.append(dropdownButton);
    dropdownButton.append(button);
    const dropdownBody = document.createElement("div");
    dropdownBody.classList.add("editor-dropdown-body");
    dropdown.append(dropdownBody);
    dropdownBody.append(content);

    // Add event listeners.
    function onClick(event) {
        if (!(dropdownBody.contains(event.target))) {
            if (dropdownBody.classList.contains("editor-dropdown-show")) {
                dropdownBody.classList.remove("editor-dropdown-show");
            }
            if (button.contains(event.target)) ignoreNextClick = true;
            document.removeEventListener("mousedown", onClick);
            dropdown.dispatchEvent(new Event("editorDropdownClose", {bubbles: true}));
            dropdownButton.addEventListener("click", dropdownClick);
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
        dropdownBody.classList.add("editor-dropdown-show");
        document.addEventListener("mousedown", onClick);
        dropdown.dispatchEvent(new Event("editorDropdownOpen", {bubbles: true}));
    }
    dropdownButton.addEventListener("click", dropdownClick);

    // Close function.
    function close() {
        if (dropdownBody.classList.contains("editor-dropdown-show")) {
            dropdownBody.classList.remove("editor-dropdown-show");
        }
        document.removeEventListener("mousedown", onClick);
        dropdown.dispatchEvent(new Event("editorDropdownClose", {bubbles: true}));
        dropdownButton.addEventListener("click", dropdownClick);
    }

    return {dropdown: dropdown, body: content, button: dropdownButton, close: close};
}

/*
Create a number input.
*/
EditorUI.numberInput = (min, max) => {
    // Create the input field.
    const input = document.createElement("input");
    input.setAttribute("type", "number");
    input.setAttribute("min", min);
    input.setAttribute("max", max);
    input.classList.add("editor-number-input-input");

    // Create the plus and minus buttons.
    const plus = document.createElement("button");
    plus.innerHTML = "+";
    plus.addEventListener("click", function() {
        input.value = Math.max(Math.min(parseFloat(input.value) + 1, max), min);
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
    });
    plus.classList.add("editor-number-input-button");
    const minus = document.createElement("button");
    minus.innerHTML = "-";
    minus.addEventListener("click", function() {
        input.value = Math.max(Math.min(parseFloat(input.value) - 1, max), min);
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
    });
    minus.classList.add("editor-number-input-button");

    // Create the combining DIV.
    const div = document.createElement("div");
    div.append(minus, input, plus);
    div.classList.add("editor-number-input");
    return {numberInput: div, input: input, plus: plus, minus: minus};
}

/*
Convert RGB to HSV.
*/
EditorUI.rgbToHsv = (r , g , b) => { 
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
EditorUI.colorInput = (callback, button, primaryWidth, hueWidth, height) => {
    // Create the body of the color picker.
    const body = document.createElement("div");
    body.classList.add("editor-color-input-body");

    // Primary editor.
    const primaryContainer = document.createElement("div");
    primaryContainer.style.width = primaryWidth + "px";
    primaryContainer.style.height = height + "px";
    primaryContainer.classList.add("editor-color-picker-primary-container");
    const primary = document.createElement("canvas");
    primary.setAttribute("width", primaryWidth);
    primary.setAttribute("height", height)
    primary.classList.add("editor-color-picker-primary-canvas");
    primaryContainer.append(primary);
    const primaryThumb = document.createElement("div");
    primaryThumb.classList.add("editor-color-picker-primary-thumb");
    primaryContainer.append(primaryThumb);
    body.append(primaryContainer);

    // Hue editor.
    const hueContainer = document.createElement("div");
    hueContainer.style.width = hueWidth + "px";
    hueContainer.style.height = height + "px";
    hueContainer.classList.add("editor-color-picker-hue-container");
    const hue = document.createElement("canvas");
    hue.setAttribute("width", hueWidth);
    hue.setAttribute("height", height)
    hue.classList.add("editor-color-picker-hue-canvas");
    hueContainer.append(hue);
    const hueSlider = document.createElement("div");
    hueSlider.classList.add("editor-color-picker-hue-slider");
    hueContainer.append(hueSlider);
    body.append(hueContainer);

    // RGB form.
    const rgbForm = document.createElement("div");
    rgbForm.classList.add("editor-color-picker-rgb-form");
    const rgbFormColor = document.createElement("div");
    rgbFormColor.classList.add("editor-color-picker-rgb-form-color");
    rgbForm.append(rgbFormColor);
    function createColorValueInput(label) {
        const inputContainer = document.createElement("div");
        inputContainer.classList.add("editor-color-picker-rgb-form-input-container");
        const colorLabel = document.createElement("label");
        colorLabel.append(label);
        colorLabel.classList.add("editor-color-picker-rgb-form-input-label");
        const input = document.createElement("input");
        input.setAttribute("type", "number");
        input.setAttribute("min", 0);
        input.setAttribute("max", 255);
        input.addEventListener("change", () => {
            r = rgbFormInputR.value;
            g = rgbFormInputG.value;
            b = rgbFormInputB.value;
            var [newH, newS, newV] = EditorUI.rgbToHsv(r, g, b);
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
    const [rgbFormInputContainerR, rgbFormInputR] = createColorValueInput("R");
    const [rgbFormInputContainerG, rgbFormInputG] = createColorValueInput("G");
    const [rgbFormInputContainerB, rgbFormInputB] = createColorValueInput("B");
    rgbForm.append(rgbFormInputContainerR, rgbFormInputContainerG, rgbFormInputContainerB)
    body.append(rgbForm);

    // Save and remove buttons.
    const saveButton = document.createElement("button");
    saveButton.classList.add("editor-color-picker-save-button");
    saveButton.innerHTML = "Save";
    saveButton.addEventListener("click", () => {callback(`rgb(${r}, ${g}, ${b})`); closeFunc();});
    const removeButton = document.createElement("button");
    removeButton.classList.add("editor-color-picker-remove-button");
    removeButton.innerHTML = "Remove";
    removeButton.addEventListener("click", () => {callback(null); closeFunc();});
    body.append(saveButton, removeButton);
    
    // Create the button.
    button.classList.add("editor-color-picker-button");

    // Create the dropdown.
    const dropdownObj = EditorUI.dropdown(button, body);
    const dropdown = dropdownObj.dropdown;
    const closeFunc = dropdownObj.close;

    // Variables.
    var h = 0;
    var r = 0;
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
    }

    // Update color on primary canvas.
    function primaryUpdateColor(e) {
        primaryX = Math.min(e.offsetX, primaryWidth - 1);
        primaryY = Math.max(Math.min(e.offsetY, height - 1), 0);
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
    }
    function mouseMovePrimary(e) {
        if (dragPrimary) primaryUpdateColor(e);
    }
    function mouseUpPrimary(e) {
        dragPrimary = false;
        document.removeEventListener("mouseup", mouseUpPrimary);
    }

    // Update color on hue canvas.
    function hueUpdateColor(e) {
        h = e.offsetY / height * 360;
        renderPrimaryCanvas();
        hueSlider.style.transform = `translate(0, ${e.offsetY}px`;
    }

    // Mouse events for hue canvas.
    function mouseDownHue(e) {
        dragHue = true;
        hueUpdateColor(e);
        document.addEventListener("mouseup", mouseUpHue);
    }
    function mouseMoveHue(e) {
        if (dragHue) hueUpdateColor(e);
    }
    function mouseUpHue(e) {
        dragHue = false;
        document.removeEventListener("mouseup", mouseUpHue);
    }

    // Input dropdown open.
    function onOpen() {
        renderPrimaryCanvas();
        renderHueCanvas();

        // Bind event listeners.
        primary.addEventListener("mousedown", mouseDownPrimary, false);
        primary.addEventListener("mousemove", mouseMovePrimary, false);
        primary.addEventListener("mouseup", mouseUpPrimary, false);
        hue.addEventListener("mousedown", mouseDownHue, false);
        hue.addEventListener("mousemove", mouseMoveHue, false);
        hue.addEventListener("mouseup", mouseUpHue, false);
    }

    // Input dropdown close.
    function onClose() {
        // Remove event listeners.
        primary.removeEventListener("mousedown", mouseDownPrimary);
        primary.removeEventListener("mousemove", mouseMovePrimary);
        primary.removeEventListener("mouseup", mouseUpPrimary);
        hue.removeEventListener("mousedown", mouseDownHue);
        hue.removeEventListener("mousemove", mouseMoveHue);
        hue.removeEventListener("mouseup", mouseUpHue);
    }

    // Bind events.
    dropdown.addEventListener("editorDropdownOpen", onOpen);
    dropdown.addEventListener("editorDropdownClose", onClose);

    return {colorInput: dropdown, dropdown: dropdownObj};
}