const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Recording Functions
  startRecording: (workflowName) => ipcRenderer.invoke('start-recording', workflowName),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  addIntent: (intent) => ipcRenderer.invoke('add-intent', intent),

  // Workflow Functions
  getWorkflows: () => ipcRenderer.invoke('get-workflows'),
  getWorkflow: (id) => ipcRenderer.invoke('get-workflow', id),
  deleteWorkflow: (id) => ipcRenderer.invoke('delete-workflow', id),
  executeWorkflow: (id) => ipcRenderer.invoke('execute-workflow', id),

  // Dialog Functions
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
});
