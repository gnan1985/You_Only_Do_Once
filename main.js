const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
require('dotenv').config();

const isDev = process.env.NODE_ENV === 'development';

const logger = require('./src/utils/logger');
const recorder = require('./src/modules/recorder');
const executor = require('./src/modules/executor');
const storage = require('./src/modules/storage');

let mainWindow;
const REACT_DEVELOPER_TOOLS =
  'fmkadmapgofadopljbjfkapdkoienihi';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`;
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  createMenu();
  logger.info('Application started');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// =====================
// IPC Handlers
// =====================

ipcMain.handle('start-recording', async (event, workflowName) => {
  try {
    recorder.start(workflowName);
    logger.info(`Recording started: ${workflowName}`);
    return { success: true, message: 'Recording started' };
  } catch (error) {
    logger.error('Error starting recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async (event) => {
  try {
    const recordedData = recorder.stop();
    logger.info(`Recording stopped. Captured ${recordedData.actions.length} actions`);
    return { success: true, data: recordedData };
  } catch (error) {
    logger.error('Error stopping recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pause-recording', async (event) => {
  try {
    recorder.pause();
    return { success: true };
  } catch (error) {
    logger.error('Error pausing recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('resume-recording', async (event) => {
  try {
    recorder.resume();
    return { success: true };
  } catch (error) {
    logger.error('Error resuming recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-intent', async (event, intent) => {
  try {
    recorder.addIntent(intent);
    return { success: true };
  } catch (error) {
    logger.error('Error adding intent:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-workflows', async (event) => {
  try {
    const workflows = storage.getAllWorkflows();
    return { success: true, workflows };
  } catch (error) {
    logger.error('Error getting workflows:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-workflow', async (event, id) => {
  try {
    const workflow = storage.getWorkflow(id);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }
    return { success: true, workflow };
  } catch (error) {
    logger.error('Error getting workflow:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-workflow', async (event, id) => {
  try {
    storage.deleteWorkflow(id);
    logger.info(`Workflow deleted: ${id}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-workflow', async (event, id) => {
  try {
    logger.info(`Executing workflow: ${id}`);
    const result = await executor.execute(id);
    return { success: true, result };
  } catch (error) {
    logger.error('Error executing workflow:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});
