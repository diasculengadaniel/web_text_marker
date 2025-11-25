(function() {
    function saveMarking(url, marking) {
        chrome.storage.sync.set({ [url]: marking });
    }

    function loadMarking(url, callback) {
        chrome.storage.sync.get(url, data => {
            callback(data[url] || []);
        });
    }

    function removeAllMarkings() {
        document.querySelectorAll("span.mark").forEach(span => {
            span.replaceWith(document.createTextNode(span.textContent));
        });
    }

    function applyMarking(marking) {
        removeAllMarkings();
        marking.forEach(m => {
            const bodyHTML = document.body.innerHTML;
            // Escape special caracteres of the text 
            const escapedText = m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            document.body.innerHTML = document.body.innerHTML.replace(
                new RegExp(escapedText, "g"),
                `<span class="mark" data-mark-text="${encodeURIComponent(m.text)}">${m.text}</span>`
            );
        });
    }

    function markingSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const text = selection.toString();
            if (!text.trim()) return;

            loadMarking(location.href, marking => {
                //Avoid duplicate. 
                if (!marking.some(m => m.text === text)) {
                    marking.push({ text });
                    saveMarking(location.href, marking);
                    applyMarking(marking);
                }
            });
        }
    }

    function removeMarking(text) {
        loadMarking(location.href, marking => {
            const updated = marking.filter(m => m.text !== text);
            saveMarking(location.href, updated);
            applyMarking(updated);
        });
    }

    document.addEventListener("keydown", e => {
        // Ctrl+Shift+H to mark 
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
            markingSelection();
        }
        // Ctrl+Shift+R to remove 
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const text = selection.toString();
                if (text.trim()) {
                    removeMarking(text);
                } else {
                    // Remove mark under the cursor 
                    const node = selection.focusNode;
                    if (node && node.parentElement && node.parentElement.classList.contains("mark")) {
                        removeMarking(node.parentElement.textContent);
                    }
                }
            }
        }
    });

    document.addEventListener("click", e => {
//    Ctrl+Shift+click to remove mark.  
        if (e.ctrlKey && e.shiftKey && e.target.classList.contains("mark")) {
            removeMarking(e.target.textContent);
        }
    });

    window.addEventListener("load", () => {
        loadMarking(location.href, applyMarking);
    });

    //Simple style for mark 
    const style = document.createElement("style");
    style.textContent = `
        .mark {
            background: yellow;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
})();
