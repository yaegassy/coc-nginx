import {
  commands,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  //RevealOutputChannelOn,
  ServerOptions,
  services,
  workspace,
  window,
} from 'coc.nvim';

import fs from 'fs';
import path from 'path';
import which from 'which';

import { nginxLsInstall } from './installer';

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;
  const extensionConfig = workspace.getConfiguration('nginx');
  const enable = extensionConfig.enable;
  if (!enable) return;

  const extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath);
  }

  // MEMO: Priority to detect pylsp
  //
  // 1. nginx.commandPath setting
  // 2. current environment (e.g. venv)
  // 3. builtin nginx-language-server
  let nginxLsPath = extensionConfig.get('commandPath', '');
  // 1
  if (!nginxLsPath) {
    // 2
    nginxLsPath = whichNginxLsCommand();
    if (
      fs.existsSync(path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server'))
    ) {
      // 3
      nginxLsPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server');
    }
  }

  // Install "nginx-language-server" if it does not exist.
  if (!nginxLsPath) {
    await installWrapper(context);
    nginxLsPath = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'nginx-language-server');
  }

  // If "nginx-language-server" does not exist completely, terminate the process.
  if (!nginxLsPath) {
    window.showErrorMessage('Exit because "nginx-language-server" does not exist.');
    return;
  }

  context.subscriptions.push(
    commands.registerCommand('nginx.installLanguageServer', async () => {
      await installWrapper(context);
    })
  );

  const command = nginxLsPath;
  const serverOptions: ServerOptions = {
    command,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ['nginx'],
    synchronize: {
      configurationSection: 'nginx-language-server',
    },
    outputChannelName: 'nginx-language-server',
    //revealOutputChannelOn: RevealOutputChannelOn.Never,
    //initializationOptions: extensionConfig.initializationOptions || {},
  };

  const client = new LanguageClient('nginx-language-server', 'Nginx Language Server', serverOptions, clientOptions);

  subscriptions.push(services.registLanguageClient(client));
}

async function installWrapper(context: ExtensionContext) {
  const msg = 'Install "nginx-language-server"?';
  context.workspaceState;

  let ret = 0;
  ret = await window.showQuickpick(['Yes', 'Cancel'], msg);
  if (ret === 0) {
    try {
      await nginxLsInstall(context);
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
