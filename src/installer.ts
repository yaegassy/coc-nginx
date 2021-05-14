import { ExtensionContext, window } from 'coc.nvim';

import path from 'path';

import rimraf from 'rimraf';
import child_process from 'child_process';
import util from 'util';

import { NGINX_LS_VERSION, NGINX_FMT_VERSION } from './constant';

const exec = util.promisify(child_process.exec);

export async function nginxLsInstall(pythonCommand: string, context: ExtensionContext): Promise<void> {
  const pathVenv = path.join(context.storagePath, 'nginx-language-server', 'venv');

  let pathVenvPython = path.join(context.storagePath, 'nginx-language-server', 'venv', 'bin', 'python');
  if (process.platform === 'win32') {
    pathVenvPython = path.join(context.storagePath, 'nginx-language-server', 'venv', 'Scripts', 'python');
  }

  const statusItem = window.createStatusBarItem(0, { progress: true });
  statusItem.text = `Install nginx-language-server and more tools...`;
  statusItem.show();

  const installCmd =
    `${pythonCommand} -m venv ${pathVenv} && ` +
    `${pathVenvPython} -m pip install -U pip nginx-language-server==${NGINX_LS_VERSION} nginxfmt==${NGINX_FMT_VERSION}`;

  rimraf.sync(pathVenv);
  try {
    window.showMessage(`Install nginx-language-server and more tools...`);
    await exec(installCmd);
    statusItem.hide();
    window.showMessage(`nginx-language-server: installed!`);
  } catch (error) {
    statusItem.hide();
    window.showErrorMessage(`nginx-language-server: install failed. | ${error}`);
    throw new Error();
  }
}
