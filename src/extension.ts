'use strict';
import * as vscode from 'vscode';
import { DefinitionProvider, TextDocument, Position, CancellationToken, Definition } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let config = vscode.workspace.getConfiguration('tag_jump_or_peek');
    let file_search_regex = (config.get('fileSearchRegex') as Array<string>);
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('*', new FilePathAsDefinitionProvider(file_search_regex)));
    // console.log("TAG jump or peek started.");
}

export function deactivate() {
}

export default class FilePathAsDefinitionProvider implements DefinitionProvider {
    protected file_search_regex: string[] = [];

    constructor(file_search_regex: string[] = []) {
        this.file_search_regex = file_search_regex;
    }

    public async provideDefinition(document: TextDocument, position: Position, token: CancellationToken | boolean) {
        let linenumber = position.line
        let line = document.lineAt(position);
        let match;
        let file_path = '';
        let start;
        let end;
        let i;
        for (i = 0; i < this.file_search_regex.length; i++) {
            let re = new RegExp(this.file_search_regex[i] + '(:(\\d+)(:(\\d+))?)?', 'gi');
            while ((match = re.exec(line.text)) !== null) {
                file_path = match[1];
                start = new Position(linenumber, match.index);
                end = new Position(linenumber, re.lastIndex + 1);
                if (start.isBeforeOrEqual(position) && end.isAfter(position)) {
                    let target_linenumber = 0
                    let target_column = 0
                    if (match[match.length - 3]) {
                        target_linenumber = parseInt(match[match.length - 3]) - 1;
                        if (match[match.length - 1]) {
                            target_column = parseInt(match[match.length - 1]) - 1;
                        }
                    }
                    // console.log("Seaching Path : " + file_path + ":" + target_linenumber + ":" + target_column);
                    try {
                        fs.statSync(file_path);
                        // console.log('File : ' + file_path + ' Found');
                        return new vscode.Location(vscode.Uri.file(file_path), new vscode.Position(target_linenumber, target_column));
                    } catch (err) {
                    }
                    if (file_path.length < 2 || file_path[1] == ':' || file_path[0] == '\\' || file_path[0] == '/') {
                        return null;
                    }
                    let file_path2 = path.resolve(path.dirname(document.fileName), file_path);
                    try {
                        fs.statSync(file_path2);
                        // console.log('File : ' + file_path2 + ' Found');
                        return new vscode.Location(vscode.Uri.file(file_path2), new vscode.Position(target_linenumber, target_column));
                    } catch (err) {
                    }
                    file_path2 = path.resolve(vscode.workspace.rootPath, file_path);
                    try {
                        fs.statSync(file_path2);
                        // console.log('File : ' + file_path2 + ' Found');
                        return new vscode.Location(vscode.Uri.file(file_path2), new vscode.Position(target_linenumber, target_column));
                    } catch (err) {
                    }
                    const files = await vscode.workspace.findFiles('**/' + file_path, '', 1);
                    if (files.length > 0) {
                        file_path2 = files[0].fsPath
                        try {
                            fs.statSync(file_path2);
                            // console.log('File : ' + file_path2 + ' Found');
                            return new vscode.Location(vscode.Uri.file(file_path2), new vscode.Position(target_linenumber, target_column));
                        } catch (err) {
                        }
                    }
                }
            }
        }
        return null;
    }
}
