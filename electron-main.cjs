const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Gives sleek modern borderless feel on macOS
    backgroundColor: '#09090B', // Matching Zinc-950 dark background instantly on startup
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    }
  });

  // Decide source
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production loading of static bundle
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Handle external link clicks natively in standard user browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Generate elegant native application menu bar
function buildMenu() {
  const template = [
    {
      label: 'Application',
      submenu: [
        { label: 'About Captify AI', role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Toggle Full Screen', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation & Support',
          click: async () => {
            await shell.openExternal('https://ai.studio/build');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
