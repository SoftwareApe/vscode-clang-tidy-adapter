import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    const collection = vscode.languages.createDiagnosticCollection('clangTidy');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders !== undefined && workspaceFolders.length > 0) {
        const workspace = workspaceFolders[0];

        // execute once on preopened doc
        const editors = vscode.window.visibleTextEditors;
        if (editors.length > 0) {
            checkWarnings(workspace, editors[0].document, collection);
        }
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

// construct the clang-tidy command
function constructCommand(workspace: vscode.WorkspaceFolder, document: vscode.TextDocument) : string | undefined {
    const languageStandard = getLanguageStandard(path.extname(document.uri.fsPath));
    if (languageStandard === undefined) {
        // either not a C, C++ file or no language standard defined
        return undefined;
    }

    // get clang-tidy executable location from settings
    const executableLocation = getConfig<string>('executableLocation');
    if (executableLocation === undefined) {
        console.error(`Missing "executableLocation" for clang-tidy.`);
        return undefined;
    }

    const extraCompilerArgs = getConfig<string[]>('extraCompilerArgs');
    if (extraCompilerArgs === undefined) {
        console.error(`Missing "extraCompilerArgs" for clang-tidy.`);
        return undefined;
    }

    const checks = getConfig<string[]>('checks');
    if (checks === undefined) {
        console.error(`Missing "checks" for clang-tidy.`);
        return undefined;
    }

    const pathFilters = getConfig<string[]>('pathFilters');
    if (pathFilters === undefined) {
        console.error(`Missing "pathFilters" for clang-tidy.`);
        return undefined;
    }

    // relative path to input file
    const inputFile = path.relative(workspace.uri.fsPath, document.uri.fsPath);

    const compilerArgsJoined = extraCompilerArgs.join(' ') + ` -std=${languageStandard}`;
    const checksJoined = checks.join(',');
    const pathFiltersJoined = pathFilters.join(',');

    const command = `${executableLocation} -header-filter=${pathFiltersJoined} -checks=${checksJoined} ${inputFile} -- ${compilerArgsJoined}`;

    return command;
}

function updateDiagnostics(rawWarnings: string, collection: vscode.DiagnosticCollection) {
    // TODO
}

function checkWarnings(
    workspace: vscode.WorkspaceFolder,
    document: vscode.TextDocument,
    collection: vscode.DiagnosticCollection) {
    // remove previous warnings from collection
    collection.clear();

    const command = constructCommand(workspace, document);
    if (command === undefined) {
        return;
    }

    // good to go
    child_process.exec(
        command,
        {cwd: workspace.uri.fsPath,  maxBuffer: 10 * 1024 * 1024},
        (err, stdout, stderr) => {
            // clang-tidy returns error code if there are any compiler errors, but we want to know them
            if (null !== err) {
                console.error(stderr.toString());
            }
            const rawWarnings = stdout.toString();
            updateDiagnostics(rawWarnings, collection);
        },
    );
}

export function deactivate() {
    // Intentionally left empty
}
