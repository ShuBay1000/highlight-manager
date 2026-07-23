import * as vscode from 'vscode';

declare module 'vscode' {
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
