const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const diff = require('semver/functions/diff');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  this.extensionName = 'leandro-rodrigues.fluent-ui-vscode';

  this.cntx = context;
  this.extension = vscode.extensions.getExtension(this.extensionName);
  if (this.extension) {
    // grab current version
    this.version = this.extension.packageJSON.version;

    // grab last recorded version
    const prevVersion = context.globalState.get(`${this.extensionName}.version`);

    if (prevVersion) {
      // check it has changed.
      const d = diff(this.version, prevVersion);
      // show again on major or minor updates
      // if (d == 'major' || d == 'minor') {
      if (true) {
        showWhatsNewPage(this.version);
        context.globalState.update(`${this.extensionName}.version`, this.version);
      }
    } else {
      showWhatsNewPage(this.version);
      context.globalState.update(`${this.extensionName}.version`, this.version);
    }
  }

  const config = vscode.workspace.getConfiguration('fluent');
  let disableFilters = config && config.disableFilters ? !!config.disableFilters : false;
  let isCompact = config && config.compact ? !!config.compact : false;

  const themeMode = vscode.window.activeColorTheme;
  const isDark = themeMode.kind === 2;

  let disposable = vscode.commands.registerCommand('fluent.enableEffects', function () {
    const isWin = /^win/.test(process.platform);
    const appDir = path.dirname(require.main.filename);
    const base = appDir + (isWin ? '\\vs\\code' : '/vs/code');

    const htmlFile =
      base +
      (isWin
        ? '\\electron-browser\\workbench\\workbench.html'
        : '/electron-browser/workbench/workbench.html');

    const templateFile =
      base +
      (isWin
        ? '\\electron-browser\\workbench\\fluent.js'
        : '/electron-browser/workbench/fluent.js');

    try {
      let cssVars = fs.readFileSync(__dirname + '/css/light_vars.css', 'utf-8');

      if (isDark) {
        cssVars = fs.readFileSync(__dirname + '/css/dark_vars.css', 'utf-8');
      }

      let chromeStyles = fs.readFileSync(__dirname + '/css/editor_chrome.css', 'utf-8');
      const jsTemplate = fs.readFileSync(__dirname + '/js/theme_template.js', 'utf-8');

      const themeWithFilter = jsTemplate.replace(/\[DISABLE_FILTERS\]/g, disableFilters);
      const themeIsCompact = themeWithFilter.replace(/\[IS_COMPACT\]/g, isCompact);
      const themeWithChrome = themeIsCompact.replace(/\[CHROME_STYLES\]/g, chromeStyles);
      const themeWithVars = themeWithChrome.replace(/\[VARS\]/g, cssVars);

      fs.writeFileSync(templateFile, themeWithVars, 'utf-8');

      // modify workbench html
      const html = fs.readFileSync(htmlFile, 'utf-8');

      // check if the tag is already there
      const isEnabled = html.includes('fluent.js');

      if (!isEnabled) {
        let output = html.replace(
          /^.*(<!-- Fluent UI --><script src="fluent.js"><\/script><!-- Fluent UI -->).*\n?/gm,
          '',
        );
        // add script tag
        output = html.replace(
          /\<\/html\>/g,
          `	<!-- Fluent UI --><script src="fluent.js"></script><!-- Fluent UI -->\n`,
        );
        output += '</html>';

        fs.writeFileSync(htmlFile, output, 'utf-8');

        vscode.window
          .showInformationMessage(
            'Fluent UI is enabled. VS code must reload for this change to take effect.',
            { title: 'Restart editor to complete' },
          )
          .then(function (msg) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          });
      } else {
        vscode.window
          .showInformationMessage('Fluent UI is already enabled. Reload to refresh JS settings.', {
            title: 'Restart editor to refresh settings',
          })
          .then(function (msg) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          });
      }
    } catch (e) {
      console.error(e);
      if (/ENOENT|EACCES|EPERM/.test(e.code)) {
        vscode.window.showInformationMessage(
          'You must run VS code with admin priviliges in order to enable Fluent UI.',
        );
        return;
      } else {
        vscode.window.showErrorMessage('Something went wrong when starting Fluent UI');
        return;
      }
    }
  });

  let disable = vscode.commands.registerCommand('fluent.disableEffects', uninstall);

  context.subscriptions.push(disposable);
  context.subscriptions.push(disable);
}

exports.activate = activate;

function showWhatsNewPage(version) {
  const panel = vscode.window.createWebviewPanel(
    `fluent.whatsNew`,
    "What's new for Fluent UI",
    vscode.ViewColumn.One,
    { enableScripts: !0 },
  );

  // const viewPath = path.join(this.cntx.extensionPath, 'whats-new', 'index.html');

  const viewResourcePath = panel.webview.asWebviewUri(viewPath);
  const htmlContent = fs.readFileSync(`${__dirname}/whats-new/index.html`, 'utf-8');

  const output = htmlContent.replace(/\<\/version\>/g, `	<span>${version}</span>\n`);

  panel.webview.html = output;
}

function removeScript() {
  try {
    var isWin = /^win/.test(process.platform);
    var appDir = path.dirname(require.main.filename);
    var base = appDir + (isWin ? '\\vs\\code' : '/vs/code');
    var htmlFile =
      base +
      (isWin
        ? '\\electron-browser\\workbench\\workbench.html'
        : '/electron-browser/workbench/workbench.html');

    // modify workbench html
    const html = fs.readFileSync(htmlFile, 'utf-8');

    // check if the tag is already there
    const isEnabled = html.includes('fluent.js');

    if (isEnabled) {
      // delete fluent script tag
      let output = html.replace(
        /^.*(<!-- Fluent UI --><script src="fluent.js"><\/script><!-- Fluent UI -->).*\n?/gm,
        '',
      );
      fs.writeFileSync(htmlFile, output, 'utf-8');

      vscode.window
        .showInformationMessage(
          'Fluent UI is disabled. VS code must reload for this change to take effect',
          { title: 'Restart editor to complete' },
        )
        .then(function (msg) {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        });
    } else {
      vscode.window.showInformationMessage("Fluent UI isn't running.");
    }
  } catch (error) {
    vscode.window.showErrorMessage(error);
  }
}

// this method is called when your extension is deactivated
function deactivate() {
  // removeScript();
}

function uninstall() {
  removeScript();
}

module.exports = {
  activate,
  deactivate,
};
