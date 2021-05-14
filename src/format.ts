import {
  DocumentFormattingEditProvider,
  Range,
  TextDocument,
  TextEdit,
  Uri,
  window,
  workspace,
  ExtensionContext,
  OutputChannel,
} from 'coc.nvim';

import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';

export async function doFormat(
  context: ExtensionContext,
  outputChannel: OutputChannel,
  document: TextDocument,
  range?: Range
): Promise<string> {
  if (document.languageId !== 'nginx') {
    throw '"nginxfmt" cannot run, not a nginx file';
  }

  const extensionConfig = workspace.getConfiguration('nginx');
  const nginxfmtIndent = extensionConfig.get<number>('nginxfmt.indent', 4);

  let toolPath = extensionConfig.get('nginxfmt.commandPath', '');
  if (!toolPath) {
    if (
      fs.existsSync(path.join(context.storagePath, 'nginx-language-server', 'venv', 'Scripts', 'nginxfmt.exe')) ||
      fs.existsSync(path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginxfmt'))
    ) {
      if (process.platform === 'win32') {
        toolPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'Scripts', 'nginxfmt.exe');
      } else {
        toolPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginxfmt');
      }
    } else {
      throw 'Unable to find the nginxfmt command.';
    }
  }

  const fileName = Uri.parse(document.uri).fsPath;
  const text = document.getText(range);

  const args: string[] = [];
  const opts = { cwd: path.dirname(fileName) };

  if (nginxfmtIndent) {
    args.push('--indent', nginxfmtIndent.toString());
  }

  const tmpFile = tmp.fileSync();
  fs.writeFileSync(tmpFile.name, text);

  // ---- Output the command to be executed to channel log. ----
  outputChannel.appendLine(`${'#'.repeat(10)} nginxfmt\n`);
  outputChannel.appendLine(`Cwd: ${opts.cwd}`);
  outputChannel.appendLine(`Run: ${toolPath} ${args.join(' ')} ${tmpFile.name}`);
  outputChannel.appendLine(`Args: ${args.join(' ')}`);

  return new Promise(function (resolve) {
    cp.execFile(toolPath, [...args, tmpFile.name], opts, function (err) {
      if (err) {
        tmpFile.removeCallback();
        outputChannel.appendLine(`\n==== Error ====\n${err.message}`);
        window.showErrorMessage('There was an error while running nginxfmt.');
        throw err;
      }

      const text = fs.readFileSync(tmpFile.name, 'utf-8');
      tmpFile.removeCallback();

      resolve(text);
    });
  });
}

export function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  const doc = workspace.getDocument(document.uri);

  return Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLineId).length, line: lastLineId });
}

class NginxFormattingEditProvider implements DocumentFormattingEditProvider {
  public _context: ExtensionContext;
  public _outputChannel: OutputChannel;

  constructor(context: ExtensionContext, outputChannel: OutputChannel) {
    this._context = context;
    this._outputChannel = outputChannel;
  }

  public provideDocumentFormattingEdits(document: TextDocument): Promise<TextEdit[]> {
    return this._provideEdits(document, undefined);
  }

  private async _provideEdits(document: TextDocument, range?: Range): Promise<TextEdit[]> {
    const code = await doFormat(this._context, this._outputChannel, document, range);
    if (!range) {
      range = fullDocumentRange(document);
    }
    return [TextEdit.replace(range, code)];
  }
}

export default NginxFormattingEditProvider;
