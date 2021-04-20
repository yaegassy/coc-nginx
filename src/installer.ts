import { ExtensionContext, window } from 'coc.nvim';

import path from 'path';

import rimraf from 'rimraf';
import child_process from 'child_process';
import util from 'util';

import { NGINX_LS_VERSION } from './constant';

const exec = util.promisify(child_process.exec);

export async function nginxLsInstall(context: ExtensionContext): Promise<void> {
  const pathVenv = path.join(context.storagePath, 'nginx-language-server', 'venv');
  const pathPip = path.join(pathVenv, 'bin', 'pip');

  const statusItem = window.createStatusBarItem(0, { progress: true });
  statusItem.text = `Install nginx-language-server ...`;
  statusItem.show();

  const installCmd =
    `python3 -m venv ${pathVenv} && ` + `${pathPip} install -U pip nginx-language-server==${NGINX_LS_VERSION}`;

  rimraf.sync(pathVenv);
  try {
    window.showWarningMessage(`Install nginx-language-server...`);
    await exec(installCmd);
    statusItem.hide();
    window.showWarningMessage(`nginx-language-server: installed!`);
  } catch (error) {
    statusItem.hide();
    window.showErrorMessage(`nginx-language-server: install failed. | ${error}`);
    throw new Error();
  }
}
