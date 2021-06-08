import {
  commands,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  services,
  workspace,
  window,
  WorkspaceConfiguration,
  Disposable,
  DocumentSelector,
  TextEdit,
  languages,
} from 'coc.nvim';

import fs from 'fs';
import path from 'path';
import which from 'which';

import NginxFormattingEditProvider, { doFormat, fullDocumentRange } from './format';
import { nginxLsInstall } from './installer';

let formatterHandler: undefined | Disposable;

function disposeHandlers(): void {
  if (formatterHandler) {
    formatterHandler.dispose();
  }
  formatterHandler = undefined;
}

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;
  const extensionConfig = workspace.getConfiguration('nginx');
  const enable = extensionConfig.enable;
  if (!enable) return;

  const extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath);
  }

  // MEMO: Priority to detect nginx-language-server
  //
  // 1. nginx.commandPath setting
  // 2. current environment (e.g. venv)
  // 3. builtin nginx-language-server
  let nginxLsPath = extensionConfig.get('commandPath', '');
  // 1
  if (!nginxLsPath) {
    // 2
    nginxLsPath = whichNginxLsCommand();
    if (!nginxLsPath) {
      if (
        fs.existsSync(
          path.join(context.storagePath, 'nginx-language-server', 'venv', 'Scripts', 'nginx-language-server.exe')
        ) ||
        fs.existsSync(path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server'))
      ) {
        // 3
        if (process.platform === 'win32') {
          nginxLsPath = path.join(
            context.storagePath,
            'nginx-language-server',
            'venv',
            'Scripts',
            'nginx-language-server.exe'
          );
        } else {
          nginxLsPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server');
        }
      }
    }
  }

  const isRealpath = true;
  const pythonCommand = getPythonPath(extensionConfig, isRealpath);

  // Install "nginx-language-server" if it does not exist.
  if (!nginxLsPath) {
    if (pythonCommand) {
      await installWrapper(pythonCommand, context);
    } else {
      window.showErrorMessage('python3/python command not found');
    }

    if (process.platform === 'win32') {
      nginxLsPath = path.join(
        context.storagePath,
        'nginx-language-server',
        'venv',
        'Scripts',
        'nginx-language-server.exe'
      );
    } else {
      nginxLsPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server');
    }
  }

  // If "nginx-language-server" does not exist completely, terminate the process.
  if (!nginxLsPath) {
    window.showErrorMessage('Exit because "nginx-language-server" does not exist.');
    return;
  }

  context.subscriptions.push(
    commands.registerCommand('nginx.installLanguageServer', async () => {
      if (pythonCommand) {
        if (client.serviceState !== 5) {
          await client.stop();
        }
        await installWrapper(pythonCommand, context);
        client.start();
      } else {
        window.showErrorMessage('python3/python command not found');
      }
    })
  );

  const command = nginxLsPath;
  const serverOptions: ServerOptions = {
    command,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['nginx'],
    outputChannelName: 'nginx-language-server',
  };

  const client = new LanguageClient('nginx-language-server', 'Nginx Language Server', serverOptions, clientOptions);

  subscriptions.push(services.registLanguageClient(client));

  // ---- formatter ----

  const formatterOutputChannel = window.createOutputChannel('nginx-format');
  const editProvider = new NginxFormattingEditProvider(context, formatterOutputChannel);
  const priority = 1;
  const languageSelector: DocumentSelector = [{ language: 'nginx', scheme: 'file' }];

  function registerFormatter(): void {
    disposeHandlers();

    formatterHandler = languages.registerDocumentFormatProvider(languageSelector, editProvider, priority);
  }
  registerFormatter();

  context.subscriptions.push(
    commands.registerCommand('nginx.format', async () => {
      const doc = await workspace.document;

      const code = await doFormat(context, formatterOutputChannel, doc.textDocument, undefined);
      const edits = [TextEdit.replace(fullDocumentRange(doc.textDocument), code)];
      if (edits) {
        await doc.applyEdits(edits);
      }
    })
  );

  // ---- /formatterr ----
}

async function installWrapper(pythonCommand: string, context: ExtensionContext) {
  const msg = 'Install/Upgrade "nginx-language-server and more tools"?';
  context.workspaceState;

  let ret = 0;
  ret = await window.showQuickpick(['Yes', 'Cancel'], msg);
  if (ret === 0) {
    try {
      await nginxLsInstall(pythonCommand, context);
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}

function whichNginxLsCommand(): string {
  try {
    return which.sync('nginx-language-server');
  } catch (e) {
    return '';
  }
}

function getPythonPath(config: WorkspaceConfiguration, isRealpath?: boolean): string {
  let pythonPath = config.get<string>('builtin.pythonPath', '');
  if (pythonPath) {
    return pythonPath;
  }

  try {
    pythonPath = which.sync('python3');
    if (isRealpath) {
      pythonPath = fs.realpathSync(pythonPath);
    }
    return pythonPath;
  } catch (e) {
    // noop
  }

  try {
    pythonPath = which.sync('python');
    if (isRealpath) {
      pythonPath = fs.realpathSync(pythonPath);
    }
    return pythonPath;
  } catch (e) {
    // noop
  }

  return pythonPath;
}
