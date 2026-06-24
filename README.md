
# Highlight Manager

Register selected text as keywords and highlight every match in the editor.

## Features

- Toggle a keyword from the current selection
- Show the registered keyword list in the primary sidebar
- Hide or show each keyword highlight from the sidebar
- Delete a keyword or clear all keywords from the sidebar
- Use a single command, context menu item, and shortcut for toggling

## Usage

1. Select text in the editor.
2. Run `Highlight: Toggle Highlight` from the Command Palette.
3. Or use the context menu / shortcut to toggle the selected text.
<img width="400" height="303" alt="usage" src="https://github.com/user-attachments/assets/6d5433b1-3674-49fb-a24d-82c1ad0fe640" />

## Shortcut

- `Ctrl+Alt+Z`

## Sidebar

- Open the `Highlight Manager` view in the Activity Bar.
- The sidebar shows the current `Keyword List`.
- Use `Hide` / `Show` to disable or enable a keyword highlight.
- Use `Delete` to remove one keyword.
- Use `Clear all` to remove every keyword.

## Notes

- Highlights update automatically when the registered keywords or the editor content changes.
- The same keyword list is stored in VS Code global state for this extension.
