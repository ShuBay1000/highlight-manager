import * as vscode from 'vscode';

declare module 'vscode' {
  // setKeysForSync exists since VS Code 1.49 but is missing from the bundled
  // typings; declared optional so callers can feature-detect it.
  export interface Memento {
    setKeysForSync?(keys: readonly string[]): void;
  }

  export interface Webview {
    options: any;
    html: string;
    onDidReceiveMessage(listener: (message: any) => any): vscode.Disposable;
    postMessage(message: any): Thenable<boolean>;
  }

  export interface WebviewView {
    readonly webview: Webview;
    readonly visible: boolean;
    onDidDispose(listener: () => any): vscode.Disposable;
    onDidChangeVisibility(listener: () => any): vscode.Disposable;
  }

  export interface WebviewViewProvider {
    resolveWebviewView(webviewView: WebviewView): void | Thenable<void>;
  }

  export namespace window {
    function registerWebviewViewProvider(viewId: string, provider: WebviewViewProvider): Disposable;
  }
}
