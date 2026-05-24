const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const tools = {
  openWebsites: async (urls) => {
    try {
      let results = [];
      for (let url of urls) {
        // If the LLM just passes "youtube" instead of "youtube.com", fix it
        if (!url.includes('.')) url += '.com'; 
        if (!url.startsWith('http')) url = 'https://' + url;
        
        await execPromise(`start "" "${url}"`);
        results.push(`Opened ${url}`);
        await new Promise(r => setTimeout(r, 300)); // Small delay to prevent browser blocking
      }
      return `Successfully opened: ${results.join(', ')}`;
    } catch (e) {
      return `Failed to open websites: ${e.message}`;
    }
  },

  closeTabs: async (count) => {
    try {
      const script = `
        $wshell = New-Object -ComObject wscript.shell;
        $wshell.AppActivate('Google Chrome');
        Start-Sleep -Milliseconds 500;
        for ($i=0; $i -lt ${count}; $i++) {
            $wshell.SendKeys('^{w}');
            Start-Sleep -Milliseconds 200;
        }
      `;
      await execPromise(`powershell -Command "${script.replace(/\n/g, '')}"`);
      return `Successfully closed ${count} tabs in Chrome.`;
    } catch (e) {
      return `Failed to close tabs: ${e.message}`;
    }
  },

  openApplication: async (appName) => {
    try {
      // Try to start the app directly. If it fails, we return an error for the LLM to process.
      await execPromise(`start "" "${appName}"`);
      return `Successfully launched ${appName}.`;
    } catch (e) {
      return `Failed to launch ${appName}. The app might not be in the global PATH or requires a specific executable name.`;
    }
  },

  countDesktopFolders: async () => {
    try {
      const script = `(Get-ChildItem $env:USERPROFILE\\Desktop -Directory).Count`;
      const { stdout } = await execPromise(`powershell -Command "${script}"`);
      return `There are ${stdout.trim()} folders on the desktop.`;
    } catch (e) {
      return `Failed to count desktop folders: ${e.message}`;
    }
  }
};

module.exports = tools;
