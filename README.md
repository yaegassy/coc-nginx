# coc-nginx

[nginx-language-server](https://github.com/pappasam/nginx-language-server) extension for [coc.nvim](https://github.com/neoclide/coc.nvim)

<img width="780" alt="coc-nginx-demo" src="https://user-images.githubusercontent.com/188642/115322781-c329f900-a1c1-11eb-920e-c49f3bb96af1.gif">

## Features

- Completion
- Hover

## Install

**CocInstall**:

```vim
:CocInstall @yaegassy/coc-nginx
```

> scoped packages

**vim-plug**:

```vim
Plug 'yaegassy/coc-nginx', {'do': 'yarn install --frozen-lockfile'}
```

## Detect: nginx-language-server

1. `nginx.commandPath`
2. current environment PATH (e.g. nginx-language-server in venv, or global)
3. builtin nginx-language-server (Installation commands are also provided)

## Bult-in install

coc-nginx allows you to create an extension-only "venv" and install "nginx-language-server".

The first time you use coc-nginx, if nginx-language-server is not detected, you will be prompted to do a built-in installation.

You can also run the installation command manually.

```vim
:CocComannd nginx.installLanguageServer
```

## Configuration options

- `nginx.enable`: Enable coc-nginx extension, default: `true`
- `nginx.commandPath`: The custom path to the nginx-language-server (Absolute path), default: `""`
- `nginx.builtin.pythonPath`: Python 3.x path (Absolute path) to be used for built-in install, default: `""`

## Commands

- `nginx.installLanguageServer`: Install nginx-language-server (builtin)
  - It will be installed in this path:
    - Mac/Linux: `~/.config/coc/extensions/coc-nginx-data/nginx-language-server/venv/bin/nginx-language-server`
    - Windows: `~/AppData/Local/coc/extensions/coc-nginx-data/nginx-language-server/venv/Scripts/nginx-language-server.exe`

## Known issue I have identified

There seems to be an error when saving the file.

**Repro**:

`:CocCommand workspace.showOutput` -> `Choose by number:` -> "Enter" the number of the `nginx-language-server`.

## Thanks

- [pappasam/nginx-language-server](https://github.com/pappasam/nginx-language-server)

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
