# Text Highlighter Sync Extension
# Code name: Wilmer, My little nephew who is Highlighter our lives lol!

A lightweight browser extension for Chrome-base navigators that allows you to highlight text on any webpage and automatically sync your highlights across devices using `chrome.storage.sync`.

## Features
- Mark text on any website following a reading model (key words, main ideas, secondary ideas, doubts).
- Floating toolbar next to the selection, plus keyboard shortcuts.
- Sync marks across all devices where the extension is installed (live, via `chrome.storage.sync`).
- Marks persist after page reload or browser restart.

##  Project Structure
##  Installation
1. Clone or download this repository.
2. Open **Brave** or **Chrome** and go to:
3. Enable **Developer Mode** (toggle in the top right).
4. Click **Load unpacked** and select the `marcador-sync` folder.
5. The extension will now be active in your browser.

## Usage
Select the text and pick a type in the floating toolbar, or use a shortcut:

| Type | Style | Shortcut |
|---|---|---|
| Key word | three lines under the text | **Ctrl+Shift+1** |
| Main idea | two lines | **Ctrl+Shift+2** |
| Secondary idea | one line | **Ctrl+Shift+3** |
| Doubt | red line | **Ctrl+Shift+4** |
| Highlight | yellow background | **Ctrl+Shift+H** |

- Marking the same passage again with another type changes its type.
- Remove: **Ctrl+Shift+X** (mark under the cursor or touched by the selection) or **Ctrl+Shift+click** on the mark.
- Reload the page — your marks will still be there.
- Log in to your browser account to enable cross-device sync.

## Limitations
- Works best on static web pages.
- Dynamic content (e.g., single-page applications, infinite scroll) may require additional handling using **Text Anchors** or DOM Range serialization.
- Marks are stored as text plus a little surrounding context; if the page text changes a lot, a mark may not be found again.
- `chrome.storage.sync` limits each page to ~8 KB of marks.

## Possible Improvements
- Add an options page for custom highlight colors.
- Provide an interface to list, search, and delete saved highlights.
- Implement a toolbar button to toggle highlight mode.
