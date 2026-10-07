(function() {
    // Reading model: each type maps to a visual style in style.css (.wtm-<type>).
    const TYPES = {
        keyword:   { label: "Palavra-chave",       code: "Digit1", shortcut: "Ctrl+Shift+1" },
        main:      { label: "Ideia principal",     code: "Digit2", shortcut: "Ctrl+Shift+2" },
        secondary: { label: "Ideia secundária",    code: "Digit3", shortcut: "Ctrl+Shift+3" },
        doubt:     { label: "Dúvida",              code: "Digit4", shortcut: "Ctrl+Shift+4" },
        highlight: { label: "Realce",              code: "KeyH",   shortcut: "Ctrl+Shift+H" }
    };
    const REMOVE_CODE = "KeyX";
    const CONTEXT_LENGTH = 32;
    const SKIP_SELECTOR = "script, style, noscript, textarea, select";
    // Containers where a <span> around whitespace would be invalid.
    const NO_SPAN_PARENTS = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "COLGROUP", "UL", "OL", "DL"]);
    const XHTML_NS = "http://www.w3.org/1999/xhtml";

    // Same page with a different #anchor shares its marks.
    const pageKey = location.href.split("#")[0];
    let marks = [];

    // ---------- Storage ----------

    function saveMarks() {
        const done = () => {
            if (chrome.runtime.lastError) {
                console.warn("[Wilmer] Não foi possível guardar as marcas:", chrome.runtime.lastError.message);
            }
        };
        if (marks.length) {
            chrome.storage.sync.set({ [pageKey]: marks }, done);
        } else {
            chrome.storage.sync.remove(pageKey, done);
        }
    }

    function newId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    // Old versions stored only { text } (yellow highlight) under the full URL.
    function normalizeMark(m) {
        return {
            id: m.id || newId(),
            type: TYPES[m.type] ? m.type : "highlight",
            text: m.text,
            prefix: m.prefix || "",
            suffix: m.suffix || ""
        };
    }

    function loadMarks() {
        chrome.storage.sync.get([pageKey, location.href], data => {
            const stored = data[pageKey] || data[location.href] || [];
            const legacy = !data[pageKey] && !!data[location.href];
            marks = stored.filter(m => m && m.text).map(normalizeMark);
            render();
            if (legacy || stored.some(m => !m.id || !m.type)) {
                saveMarks();
                if (legacy) chrome.storage.sync.remove(location.href);
            }
        });
    }

    // ---------- Text index (all visible text of the body as one string) ----------

    function buildTextIndex() {
        const nodes = [];
        let text = "";
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.namespaceURI !== XHTML_NS || parent.closest(SKIP_SELECTOR)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) {
            nodes.push({ node: walker.currentNode, start: text.length });
            text += walker.currentNode.data;
        }
        return { text, nodes };
    }

    // Converts a DOM boundary point (container, offset) into an offset in index.text.
    function toTextOffset(index, container, offset) {
        if (container.nodeType === Node.TEXT_NODE) {
            const entry = index.nodes.find(e => e.node === container);
            if (entry) return entry.start + offset;
        }
        const point = document.createRange();
        point.setStart(container, offset);
        const next = index.nodes.find(e => point.comparePoint(e.node, 0) >= 0);
        return next ? next.start : index.text.length;
    }

    // Finds where a stored mark lives in the current page text, using its context.
    function findOffsets(index, mark) {
        const candidates = [
            [mark.prefix + mark.text + mark.suffix, mark.prefix.length],
            [mark.prefix + mark.text, mark.prefix.length],
            [mark.text + mark.suffix, 0],
            [mark.text, 0]
        ];
        for (const [needle, shift] of candidates) {
            const pos = index.text.indexOf(needle);
            if (pos !== -1) return [pos + shift, pos + shift + mark.text.length];
        }
        return null;
    }

    // ---------- DOM wrapping (never touches innerHTML) ----------

    function wrapOffsets(index, start, end, mark) {
        const targets = index.nodes.filter(e => e.start < end && e.start + e.node.data.length > start);
        targets.forEach(entry => {
            let node = entry.node;
            const from = Math.max(0, start - entry.start);
            const to = Math.min(node.data.length, end - entry.start);
            if (!node.data.slice(from, to).trim() && NO_SPAN_PARENTS.has(node.parentNode.nodeName)) return;
            if (to < node.data.length) node.splitText(to);
            if (from > 0) node = node.splitText(from);
            const span = document.createElement("span");
            span.className = `wtm-mark wtm-${mark.type}`;
            span.dataset.wtmId = mark.id;
            node.parentNode.insertBefore(span, node);
            span.appendChild(node);
        });
    }

    function unwrapSpan(span) {
        const parent = span.parentNode;
        if (!parent) return;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        span.remove();
        parent.normalize();
    }

    function markSpans(id) {
        return document.querySelectorAll(`.wtm-mark[data-wtm-id="${CSS.escape(id)}"]`);
    }

    function applyMark(mark) {
        const index = buildTextIndex();
        const offsets = findOffsets(index, mark);
        if (offsets) wrapOffsets(index, offsets[0], offsets[1], mark);
    }

    function render() {
        document.querySelectorAll(".wtm-mark").forEach(unwrapSpan);
        marks.forEach(applyMark);
    }

    // ---------- Actions ----------

    function isEditable(node) {
        const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
        return !!el && (el.isContentEditable || !!el.closest("input, textarea, select"));
    }

    function currentRange() {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        if (isEditable(document.activeElement) || isEditable(range.commonAncestorContainer)) return null;
        return range;
    }

    function markSelection(type) {
        const range = currentRange();
        if (!range) return;
        const index = buildTextIndex();
        let start = toTextOffset(index, range.startContainer, range.startOffset);
        let end = toTextOffset(index, range.endContainer, range.endOffset);
        // Ignore leading/trailing whitespace (e.g. double-click selects the trailing space).
        while (start < end && /\s/.test(index.text[start])) start++;
        while (end > start && /\s/.test(index.text[end - 1])) end--;
        if (end <= start) return;

        const text = index.text.slice(start, end);
        const prefix = index.text.slice(Math.max(0, start - CONTEXT_LENGTH), start);
        const suffix = index.text.slice(end, end + CONTEXT_LENGTH);

        window.getSelection().removeAllRanges();
        hideToolbar();

        // Same passage marked again: just change its type.
        const existing = marks.find(m => m.text === text && m.prefix === prefix && m.suffix === suffix);
        if (existing) {
            if (existing.type === type) return;
            existing.type = type;
            markSpans(existing.id).forEach(span => { span.className = `wtm-mark wtm-${type}`; });
        } else {
            const mark = { id: newId(), type, text, prefix, suffix };
            wrapOffsets(index, start, end, mark);
            marks.push(mark);
        }
        saveMarks();
    }

    function removeMarks(ids) {
        if (!ids.size) return;
        ids.forEach(id => markSpans(id).forEach(unwrapSpan));
        marks = marks.filter(m => !ids.has(m.id));
        saveMarks();
    }

    // Removes the mark under the cursor, or every mark touched by the selection.
    function removeAtSelection() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const ids = new Set();
        if (selection.isCollapsed) {
            const node = selection.focusNode;
            const el = node && (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
            const span = el && el.closest(".wtm-mark");
            if (span) ids.add(span.dataset.wtmId);
        } else {
            const range = selection.getRangeAt(0);
            document.querySelectorAll(".wtm-mark").forEach(span => {
                if (range.intersectsNode(span)) ids.add(span.dataset.wtmId);
            });
        }
        removeMarks(ids);
    }

    // ---------- Floating toolbar ----------

    let toolbarHost = null;

    function getToolbar() {
        if (toolbarHost) return toolbarHost;
        toolbarHost = document.createElement("div");
        toolbarHost.style.cssText = "all: initial; position: absolute; z-index: 2147483647; display: none;";
        // Shadow DOM keeps the page CSS away from the toolbar.
        const root = toolbarHost.attachShadow({ mode: "open" });
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = chrome.runtime.getURL("style.css");
        link.addEventListener("load", updateToolbar);
        const bar = document.createElement("div");
        bar.className = "wtm-toolbar";
        Object.entries(TYPES).forEach(([type, info]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.title = `${info.label} (${info.shortcut})`;
            const sample = document.createElement("span");
            sample.className = `wtm-mark wtm-${type}`;
            sample.textContent = "Aa";
            button.appendChild(sample);
            // mousedown + preventDefault keeps the page selection alive.
            button.addEventListener("mousedown", e => {
                e.preventDefault();
                e.stopPropagation();
                markSelection(type);
            });
            bar.appendChild(button);
        });
        root.append(link, bar);
        document.documentElement.appendChild(toolbarHost);
        return toolbarHost;
    }

    function hideToolbar() {
        if (toolbarHost) toolbarHost.style.display = "none";
    }

    function updateToolbar() {
        const range = currentRange();
        if (!range || !range.toString().trim()) {
            hideToolbar();
            return;
        }
        const rect = range.getBoundingClientRect();
        const host = getToolbar();
        host.style.display = "block";
        const width = host.offsetWidth;
        const height = host.offsetHeight;
        const top = rect.top >= height + 8 ? rect.top - height - 8 : rect.bottom + 8;
        const maxLeft = document.documentElement.clientWidth - width - 8;
        const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, maxLeft));
        host.style.top = `${top + window.scrollY}px`;
        host.style.left = `${left + window.scrollX}px`;
    }

    // ---------- Events ----------

    document.addEventListener("keydown", e => {
        if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey || isEditable(e.target)) return;
        // e.code is layout independent (Shift+1 is "!" on PT keyboards).
        const type = Object.keys(TYPES).find(t => TYPES[t].code === e.code);
        if (type) {
            e.preventDefault();
            markSelection(type);
        } else if (e.code === REMOVE_CODE) {
            e.preventDefault();
            removeAtSelection();
        }
    }, true);

    // Ctrl+Shift+click to remove a mark.
    document.addEventListener("click", e => {
        if (!e.ctrlKey || !e.shiftKey || !(e.target instanceof Element)) return;
        const span = e.target.closest(".wtm-mark");
        if (!span) return;
        e.preventDefault();
        e.stopPropagation();
        removeMarks(new Set([span.dataset.wtmId]));
    }, true);

    document.addEventListener("mousedown", e => {
        if (e.target !== toolbarHost) hideToolbar();
    });
    document.addEventListener("mouseup", e => {
        if (e.target !== toolbarHost) setTimeout(updateToolbar, 0);
    });
    document.addEventListener("keyup", e => {
        if (e.shiftKey || e.key === "Shift") updateToolbar();
    });
    document.addEventListener("selectionchange", () => {
        if (window.getSelection().isCollapsed) hideToolbar();
    });

    // Live sync: marks changed on another device (our own saves are ignored).
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync" || !changes[pageKey]) return;
        const incoming = (changes[pageKey].newValue || []).filter(m => m && m.text).map(normalizeMark);
        if (JSON.stringify(incoming) === JSON.stringify(marks)) return;
        marks = incoming;
        render();
    });

    // Content scripts run at document_idle, usually after window "load": apply now.
    loadMarks();
})();
