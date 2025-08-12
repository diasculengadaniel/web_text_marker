# Text Highlighter Sync Extension
# Code name: Wilmer, My little nephew who is Highlighter our lives lol!

A lightweight browser extension for Chrome/Brave that allows you to highlight text on any webpage and automatically sync your highlights across devices using `chrome.storage.sync`.

## Features
- Highlight any text on any website.
- Sync highlights across all devices where the extension is installed.
- Keyboard shortcut for quick highlighting: **Ctrl+Shift+H**.
- Highlights persist after page reload or browser restart.

##  Project Structure
##  Installation
1. Clone or download this repository.
2. Open **Brave** or **Chrome** and go to:
3. Enable **Developer Mode** (toggle in the top right).
4. Click **Load unpacked** and select the `marcador-sync` folder.
5. The extension will now be active in your browser.

## Usage
1. Select the text you want to highlight.
2. Press **A** to **A**aplly a highlight.
3. Reload the page — your highlights will still be there.
4. Log in to your browser account to enable cross-device sync.

## Limitations
- Works best on static web pages.
- Dynamic content (e.g., single-page applications, infinite scroll) may require additional handling using **Text Anchors** or DOM Range serialization.
- Current implementation matches text by content string, so multiple identical texts may all be highlighted.

## Possible Improvements
- Use W3C **Text Anchors** for more precise and robust highlight storage.
- Add an options page for custom highlight colors.
- Provide an interface to list, search, and delete saved highlights.
- Implement a toolbar button to toggle highlight mode.
