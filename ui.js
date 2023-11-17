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
    dropdownButton.addEventListener("mousedown", function(event) {
        event.preventDefault();
    })
    dropdownButton.addEventListener("click", function() {
        dropdownBody.classList.add("editor-dropdown-show");
        function onClick(event) {
            if (!(event.target == dropdownBody)) {
                if (dropdownBody.classList.contains("editor-dropdown-show")) {
                    dropdownBody.classList.remove("editor-dropdown-show");
                }
                document.removeEventListener("mousedown", onClick);
            }
        }
        document.addEventListener("mousedown", onClick);
    });

    return {dropdown: dropdown, body: body, button: button};
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
