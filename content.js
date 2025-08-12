(function() {
    //Function to store marking in the storage 
    function saveMarking(url, marking) {
        chrome.storage.sync.set({ [url]: marking });
    }

    //Load marking 
    function loadMarking(url, callback) {
        chrome.storage.sync.get(url, data => {
            callback(data[url] || []);
        });
    }

    //Apply saved marking 
    function applyMarking(marking) {
        marking.forEach(m => {
            const bodyHTML = document.body.innerHTML;
            const pos = bodyHTML.indexOf(m.texto);
            if (pos !== -1) {
                document.body.innerHTML = bodyHTML.replace(
                    m.texto,
                    `<span class="mark">${m.texto}</span>`
                );
            }
        });
    }

    //Marking selected text 
    function markingSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const text = selection.toString();
            if (!text.trim()) return;

            loadMarking(location.href, marking => {
                marking.push({ text });
                saveMarking(location.href, marking);
                applyMarking([{ text }]);
            });
        }
    }

    //Ctrl+Shift+H to marker 
    document.addEventListener("keydown", e => {
        if (e.key.toLowerCase() === "a") {
            markingSelection();
        }
    });

    //When a page loads apply saved marking. 
    window.addEventListener("load", () => {
        loadMarking(location.href, applyMarking);
    });
})();
