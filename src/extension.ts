'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace} from 'vscode';
import axios from 'axios'
// var WebSocketClient = require('websocket').w3cwebsocket
const WebSocket = require('ws');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mm-code" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.mmCode', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('started to connect mm-code server');
    });

    context.subscriptions.push(disposable);

    let controller = new WordCounterController();
    
    // WordCounterとWordCounterControllerのリソース開放
    context.subscriptions.push(controller);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class WordCounterController {
    
        private _disposable: Disposable;
        private _client;
    
        constructor() {
            const self = this
    
            let subscriptions: Disposable[] = [];
            window.onDidChangeTextEditorSelection(this._onDidChangeTextEditorSelection, this, subscriptions);
            window.onDidChangeActiveTextEditor(this._onDidChangeActiveTextEditor, this, subscriptions);

            workspace.onDidChangeTextDocument(function(e1: vscode.TextDocumentChangeEvent) {
                const updates = []
                e1.contentChanges.forEach(function(e2: vscode.TextDocumentContentChangeEvent) {
                    updates.push({
                        sr: e2.range.start.line,
                        sc: e2.range.start.character,
                        er: e2.range.end.line,
                        ec: e2.range.end.character,
                        t: e2.text
                    })
                })

                self._client.send('updates ' + JSON.stringify({
                    updates: updates
                }));
            })
            
    
            this._disposable = Disposable.from(...subscriptions);
            
            this._client = new WebSocket('ws://localhost:8080/ws');

            self._client.onerror = function() {
                console.log('Connection Error');
            };
            
            self._client.onopen = function() {
                console.log('WebSocket Client Connected');
            
                self._client.send('join ' + JSON.stringify({
                    name: 'room'
                }));
            };
            
            self._client.onclose = function() {
                console.log('echo-protocol Client Closed');
            };
            
            self._client.onmessage = function(e) {
                const data = JSON.parse(e.data)
                const type = data.type
            
                if (type === 'say') {
                } else if (type === 'text') {
                } else if (type === 'line') {
                } else if (type === 'join') {
                    // 誰か入室
                    self._putLatestFile()
                }
            };
        }
    
        dispose() {
            this._disposable.dispose();
        }

        private _getFileData() {
            // アクティブなエディタを取得
            const editor = window.activeTextEditor;
            return {
                fileName: editor ? editor.document.fileName : '',
                text: editor ? editor.document.getText() : ''
            }
        }

        private _putLatestFile(id = "") {
            const data = this._getFileData()
            this._client.send('follow ' + JSON.stringify({
                id: id,
                fileName: data.fileName,
                text: data.text,
            }));
        }
    
        private _onDidChangeActiveTextEditor(e: vscode.TextEditor) {
            this._putLatestFile()
        }
        
        private _onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
            // アクティブなエディタを取得
            const editor = e.textEditor;
            const lineIndex = editor.selection.anchor.line
            const columnIndex = editor.selection.anchor.character
            const lineText = editor.document.lineAt(lineIndex).text

            this._client.send('line ' + JSON.stringify({
                r: lineIndex,
                c: columnIndex,
                l: lineText
            }));
        }
    }