import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const collection = vscode.languages.createDiagnosticCollection('clangTidy');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders !== undefined && workspaceFolders.length > 0) {
        const workspace = workspaceFolders[0];
        context.subscriptions.push(
            vscode.commands.registerCommand('clangTidyAdapter.checkWarnings', checkWarnings),
            vscode.window.onDidChangeActiveTextEditor(
                editor => {
                    if (undefined !== editor) {
                        checkWarnings(workspace, editor.document, collection);
                    }
                },
            ),
        );
    }
    else {
        console.info('clang-tidy adapter not activated because no workspace fodler was opened.');
    }
}

// helper function to get configurations for this extension
function getConfig<T>(name: string): T | undefined {
    return vscode.workspace.getConfiguration('clangTidyAdapter').get<T>(name);
}

// get language standard, if this is undefined do nothing
function getLanguageStandard(ext: string) : string | undefined {
    switch (ext) {
        case '.cpp':
        case '.cxx':
            return getConfig<string>('cppStandard');
        case '.c':
            return getConfig<string>('cStandard');
        default:
            return undefined;
    }
}

function checkWarnings(
    workspace: vscode.WorkspaceFolder,
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection) {
    // remove previous warnings from collection
    collection.clear();
    const languageStandard = getLanguageStandard(path.extname(document.uri.fsPath));
    if (languageStandard !== undefined) {
        // TODO
    }
}

export function deactivate() {
    // Intentionally left empty
}
