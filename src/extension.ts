import * as vscode from 'vscode';
import { colorForString } from './colors';

const STORAGE_KEY = 'highlightManager.registeredStrings';

type State = { registered: string[]; hidden: string[] };

function normalizeState(value: unknown): State {
  if (Array.isArray(value)) {
    return { registered: normalizeStrings(value), hidden: [] };
  }

  if (value && typeof value === 'object') {
    // @ts-ignore indexed access on unknown
    const registered = normalizeStrings((value as any).registered || (value as any).registeredStrings || []);
    const hidden = normalizeStrings((value as any).hidden || (value as any).hiddenStrings || []).filter((item) => registered.includes(item));
    return { registered, hidden };
  }

  return { registered: [], hidden: [] };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[ch]);
}

function normalizeStrings(values: unknown): string[] {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value.length > 0))];
}

function getNonce(): string {
  return Math.random().toString(36).slice(2, 14);
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function createDecorationType(vscodeApi: typeof vscode, value: string): vscode.TextEditorDecorationType {
  return vscodeApi.window.createTextEditorDecorationType({
    ...colorForString(value),
    borderRadius: '2px'
  } as vscode.DecorationRenderOptions);
}

function findMatches(text: string, term: string): Array<[number, number]> {
  const matches: Array<[number, number]> = [];

  let start = 0;

  while (start <= text.length) {
    const index = text.indexOf(term, start);
    if (index === -1) {
      break;
    }

    matches.push([index, index + term.length]);
    start = index + term.length;
  }

  return matches;
}

function renderPanel(state: State, nonce: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <style>
    :root {
      color-scheme: dark light;
      --bg: var(--vscode-sideBar-background);
      --panel: var(--vscode-sideBarSectionHeader-background);
      --panel-2: var(--vscode-editor-background);
      --text: var(--vscode-sideBar-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-focusBorder);
      --danger: var(--vscode-errorForeground);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 8px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text);
      background: var(--bg);
    }
    .shell {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel-2);
      overflow: hidden;
    }
    .hero {
      padding: 10px 12px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h1 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
    }
    button {
      appearance: none;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
    }
    .content {
      padding: 8px 12px 12px;
    }
    #strings {
      display: grid;
      gap: 4px;
    }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
    }
    code {
      white-space: pre-wrap;
      color: var(--text);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .label {
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .actionsRow {
      display: flex;
      gap: 4px;
      flex: 0 0 auto;
    }
    .item button {
      padding: 2px 6px;
      font-size: 11px;
    }
    .item.hidden {
      opacity: 0.6;
    }
    .item.hidden .label {
      text-decoration: line-through;
    }
    .empty {
      padding: 8px 0;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="hero">
      <h1>Keyword List</h1>
      <button id="clearAll" type="button" title="Clear all keywords" aria-label="Clear all keywords">Clear all</button>
    </header>
    <div class="content">
      <div id="strings"></div>
    </div>
  </div>
  <script id="initial-state" type="application/json">${escapeScriptJson(state)}</script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const list = document.getElementById('strings');
    const initialState = JSON.parse(document.getElementById('initial-state').textContent);

    function hashString(value) {
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function colorForString(value) {
      const hue = hashString(value) % 360;
      return {
        backgroundColor: 'hsla(' + hue + ', 90%, 60%, 0.28)',
        borderColor: 'hsla(' + hue + ', 90%, 42%, 0.75)'
      };
    }

    function renderStrings(registered, hidden) {
      list.textContent = '';

      if (!registered.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No Keyword';
        list.appendChild(empty);
        return;
      }

      const hiddenSet = new Set(hidden);

      for (const value of registered) {
        const color = colorForString(value);
        const item = document.createElement('div');
        item.className = 'item';
        if (hiddenSet.has(value)) {
          item.classList.add('hidden');
        }

        const row = document.createElement('div');
        row.className = 'row';

        const code = document.createElement('code');
        code.className = 'label';
        code.textContent = value;
        code.style.background = color.backgroundColor;
        code.style.border = '1px solid ' + color.borderColor;
        code.style.padding = '2px 4px';
        code.style.borderRadius = '4px';

        const actions = document.createElement('div');
        actions.className = 'actionsRow';

        const toggleHiddenButton = document.createElement('button');
        toggleHiddenButton.type = 'button';
        toggleHiddenButton.dataset.action = 'toggleHidden';
        toggleHiddenButton.dataset.value = value;
        toggleHiddenButton.textContent = hiddenSet.has(value) ? 'Show' : 'Hide';
        toggleHiddenButton.title = hiddenSet.has(value) ? 'Show keyword' : 'Hide keyword';
        toggleHiddenButton.setAttribute('aria-label', hiddenSet.has(value) ? 'Show keyword' : 'Hide keyword');

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.dataset.action = 'delete';
        deleteButton.dataset.value = value;
        deleteButton.textContent = 'Delete';
        deleteButton.title = 'Delete keyword';
        deleteButton.setAttribute('aria-label', 'Delete keyword');

        row.append(code);
        actions.append(toggleHiddenButton, deleteButton);
        item.append(row, actions);
        list.appendChild(item);
      }
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || message.type !== 'update') {
        return;
      }

      renderStrings(
        Array.isArray(message.registered) ? message.registered : [],
        Array.isArray(message.hidden) ? message.hidden : []
      );
    });

    document.getElementById('clearAll').addEventListener('click', () => {
      vscode.postMessage({ command: 'clearAll' });
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      vscode.postMessage({
        command: button.dataset.action,
        value: button.dataset.value
      });
    });

    renderStrings(initialState.registered || [], initialState.hidden || []);
  </script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
  const vscodeApi = vscode;
  const output = vscodeApi.window.createOutputChannel('Highlight Manager');
  context.subscriptions.push(output);
  const loadedState = normalizeState(context.globalState.get(STORAGE_KEY, [] as any));
  let registered = loadedState.registered;
  let hidden = loadedState.hidden;
  const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
  let sidebarView: vscode.WebviewView | undefined;

  const renderSidebarHtml = (webviewView: vscode.WebviewView) => {
    // Re-bake the HTML so the inlined initial-state always reflects the
    // current registered/hidden lists. VS Code reloads the webview from its
    // last `html` string whenever the view is hidden and shown again (the
    // default, since retainContextWhenHidden is off), and does NOT call
    // resolveWebviewView again. Without this, deleted keywords reappear after
    // collapsing/expanding the sidebar.
    webviewView.webview.html = renderPanel({ registered, hidden }, getNonce());
  };

  const viewProvider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView) {
      sidebarView = webviewView;
      output.appendLine('Webview resolved; sending initial state with ' + registered.length + ' registered items');
      webviewView.webview.options = { enableScripts: true };
      renderSidebarHtml(webviewView);
      webviewView.onDidChangeVisibility(() => {
        // On re-show VS Code reloads the stale baked HTML; refresh it with the
        // latest state so the list stays in sync.
        if (webviewView.visible) {
          renderSidebarHtml(webviewView);
        }
      });
      webviewView.webview.onDidReceiveMessage((message: any) => {
        output.appendLine('Webview message received: ' + JSON.stringify(message));
        if (!message || !message.command) {
          return;
        }

        if (message.command === 'clearAll') {
          clearAll();
          return;
        }

        if (message.command === 'delete') {
          deleteKeyword(message.value);
          return;
        }

        if (message.command === 'toggleHidden') {
          toggleHidden(message.value);
        }
      });
      webviewView.onDidDispose(() => {
        if (sidebarView === webviewView) {
          sidebarView = undefined;
        }
      });
    }
  };

  const refreshHighlights = () => {
    const active = registered.filter((value) => !hidden.includes(value));

    for (const editor of vscodeApi.window.visibleTextEditors) {
      for (const decorationType of decorationTypes.values()) {
        editor.setDecorations(decorationType, []);
      }

      for (const term of active) {
        const decorationType = decorationTypes.get(term) || createDecorationType(vscodeApi, term);
        decorationTypes.set(term, decorationType);
        const ranges = findMatches(editor.document.getText(), term).map(([start, end]) => new vscodeApi.Range(editor.document.positionAt(start), editor.document.positionAt(end)));
        editor.setDecorations(decorationType, ranges);
      }
    }

    if (sidebarView) {
      sidebarView.webview.postMessage({
        type: 'update',
        registered,
        hidden
      });
    }
  };

  const syncDecorationTypes = (nextRegistered: string[]) => {
    const next = new Set(nextRegistered);
    for (const [term, decorationType] of decorationTypes) {
      if (next.has(term)) {
        continue;
      }

      for (const editor of vscodeApi.window.visibleTextEditors) {
        editor.setDecorations(decorationType, []);
      }
      decorationType.dispose();
      decorationTypes.delete(term);
    }
  };

  const persist = async () => {
    await context.globalState.update(STORAGE_KEY, { registered, hidden });
    // Ensure the sidebar webview receives an explicit update after state persists
    try {
      refreshHighlights();
      output.appendLine('Persisted state. registered=' + JSON.stringify(registered));
      if (sidebarView && sidebarView.webview) {
        // postMessage returns Thenable<boolean> in webview API
        Promise.resolve(sidebarView.webview.postMessage({ type: 'update', registered, hidden })).catch(() => {});
        output.appendLine('Posted update to sidebar webview');
      } else {
        output.appendLine('No sidebar view active to post update');
      }
    } catch (err) {
      // swallow errors but keep functionality
    }
  };

  const selectedStrings = (editor: vscode.TextEditor) => normalizeStrings(editor.selections.map((selection) => editor.document.getText(selection)));

  const toggleSelection = async () => {
    const editor = vscodeApi.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const selected = selectedStrings(editor);
    if (!selected.length) {
      return;
    }

    const selectedSet = new Set(selected);
    const toAdd = selected.filter((value) => !registered.includes(value));
    const next = normalizeStrings([
      ...registered.filter((value) => !selectedSet.has(value)),
      ...toAdd
    ]);

    syncDecorationTypes(next);
    registered = next;
    output.appendLine('toggleSelection: selected=' + JSON.stringify(selected) + ' toAdd=' + JSON.stringify(toAdd) + ' registered=' + JSON.stringify(registered));
    for (const term of toAdd) {
      if (!decorationTypes.has(term)) {
        decorationTypes.set(term, createDecorationType(vscodeApi, term));
      }
    }
    await persist();
  };

  const contextToggleSelection = vscodeApi.commands.registerCommand('highlightManager.toggleSelection', toggleSelection);

  const deleteKeyword = async (value: unknown) => {
    if (typeof value !== 'string' || !value) {
      return;
    }

    if (!registered.includes(value)) {
      return;
    }

    registered = registered.filter((item) => item !== value);
    hidden = hidden.filter((item) => item !== value);
    decorationTypes.get(value)?.dispose();
    decorationTypes.delete(value);
    await persist();
  };

  const toggleHidden = async (value: unknown) => {
    if (typeof value !== 'string' || !value || !registered.includes(value)) {
      return;
    }

    hidden = hidden.includes(value) ? hidden.filter((item) => item !== value) : [...hidden, value];
    await persist();
  };

  const clearAll = async () => {
    if (!registered.length) {
      return;
    }

    const confirmed = await vscodeApi.window.showWarningMessage('Clear all keywords?', { modal: true }, 'Clear all');
    if (confirmed !== 'Clear all') {
      return;
    }

    for (const editor of vscodeApi.window.visibleTextEditors) {
      for (const decorationType of decorationTypes.values()) {
        editor.setDecorations(decorationType, []);
      }
    }
    for (const decorationType of decorationTypes.values()) {
      decorationType.dispose();
    }
    decorationTypes.clear();
    registered = [];
    hidden = [];
    await persist();
  };

  context.subscriptions.push(
    vscodeApi.window.registerWebviewViewProvider('highlightManager.sidebar', viewProvider),
    contextToggleSelection,
    vscodeApi.window.onDidChangeActiveTextEditor(refreshHighlights),
    vscodeApi.workspace.onDidChangeTextDocument((event) => {
      if (vscodeApi.window.visibleTextEditors.some((editor) => editor.document === event.document)) {
        refreshHighlights();
      }
    })
  );

  Promise.resolve(vscodeApi.commands.executeCommand('workbench.view.extension.highlightManager')).catch(() => {});
  refreshHighlights();
}

export function deactivate() {
  // ponytail: cleanup is intentionally simple; any leftover decoration types die with the extension host.
}

// helpers exported for tests
export { escapeHtml, findMatches };
