// ==================== STATE ==================== //

let appState = {
  currentView: 'dashboard',
  isRecording: false,
  currentWorkflow: null,
  workflows: [],
  recordingData: null,
  recordingStartTime: null,
  recordingTimerInterval: null,
};

const API_BASE = 'http://localhost:3000/api';

// ==================== INITIALIZATION ==================== //

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  console.log('Initializing application...');

  // Setup event listeners
  setupNavigationListeners();
  setupRecorderListeners();
  setupWorkflowsListeners();
  setupExecutionListeners();
  setupSettingsListeners();

  // Load initial data
  await loadWorkflows();
  updateDashboard();

  showToast('Application ready!', 'info');
}

// ==================== NAVIGATION ==================== //

function setupNavigationListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(viewName) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Show selected view
  const selectedView = document.getElementById(viewName);
  if (selectedView) {
    selectedView.classList.add('active');
    appState.currentView = viewName;

    // Load view-specific data
    if (viewName === 'workflows') {
      loadWorkflows();
    } else if (viewName === 'execute') {
      populateWorkflowDropdown();
    }
  }
}

// ==================== RECORDER ==================== //

function setupRecorderListeners() {
  const startBtn = document.getElementById('start-recording-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  const pauseBtn = document.getElementById('pause-recording-btn');
  const resumeBtn = document.getElementById('resume-recording-btn');
  const saveBtn = document.getElementById('save-workflow-btn');
  const reRecordBtn = document.getElementById('re-record-btn');

  if (startBtn) startBtn.addEventListener('click', startRecording);
  if (stopBtn) stopBtn.addEventListener('click', stopRecording);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseRecording);
  if (resumeBtn) resumeBtn.addEventListener('click', resumeRecording);
  if (saveBtn) saveBtn.addEventListener('click', saveWorkflow);
  if (reRecordBtn) reRecordBtn.addEventListener('click', resetRecorder);
}

async function startRecording() {
  const workflowName = document.getElementById('workflow-name').value;

  if (!workflowName) {
    showToast('Please enter a workflow name', 'error');
    return;
  }

  try {
    const result = await window.electronAPI.startRecording(workflowName);

    if (result.success) {
      appState.isRecording = true;
      appState.recordingStartTime = Date.now();

      // Switch UI to recording mode
      document.getElementById('recording-setup').classList.add('hidden');
      document.getElementById('recording-progress').classList.remove('hidden');

      // Start timer
      startRecordingTimer();

      showToast('Recording started! Describe your actions as you go.', 'info');
    }
  } catch (error) {
    showToast('Error starting recording: ' + error.message, 'error');
  }
}

function startRecordingTimer() {
  if (appState.recordingTimerInterval) {
    clearInterval(appState.recordingTimerInterval);
  }

  appState.recordingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - appState.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const timeDisplay = document.getElementById('recording-time');
    if (timeDisplay) {
      timeDisplay.textContent = timeStr;
    }
  }, 1000);
}

async function stopRecording() {
  try {
    clearInterval(appState.recordingTimerInterval);

    const result = await window.electronAPI.stopRecording();

    if (result.success) {
      appState.isRecording = false;
      appState.recordingData = result.data;

      // Show analysis results
      showAnalysisResults();

      showToast('Recording stopped. Analyzing workflow...', 'info');
    }
  } catch (error) {
    showToast('Error stopping recording: ' + error.message, 'error');
  }
}

async function pauseRecording() {
  try {
    await window.electronAPI.pauseRecording();
    document.getElementById('pause-recording-btn').classList.add('hidden');
    document.getElementById('resume-recording-btn').classList.remove('hidden');
    showToast('Recording paused', 'info');
  } catch (error) {
    showToast('Error pausing recording: ' + error.message, 'error');
  }
}

async function resumeRecording() {
  try {
    await window.electronAPI.resumeRecording();
    document.getElementById('pause-recording-btn').classList.remove('hidden');
    document.getElementById('resume-recording-btn').classList.add('hidden');
    showToast('Recording resumed', 'info');
  } catch (error) {
    showToast('Error resuming recording: ' + error.message, 'error');
  }
}

async function addIntent(event) {
  event.preventDefault();

  const intentInput = document.getElementById('intent-input');
  const intentText = intentInput.value.trim();

  if (!intentText) {
    return;
  }

  try {
    await window.electronAPI.addIntent(intentText);

    // Add to log
    const actionLog = document.getElementById('action-log');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `📝 Intent: "${intentText}"`;
    actionLog.insertBefore(logEntry, actionLog.firstChild);

    // Clear input
    intentInput.value = '';

    showToast('Intent recorded', 'success');
  } catch (error) {
    showToast('Error adding intent: ' + error.message, 'error');
  }
}

async function showAnalysisResults() {
  try {
    // Call backend to analyze
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordedData: appState.recordingData }),
    });

    const result = await response.json();

    if (result.success) {
      const analysis = result.analysis;

      // Hide recording progress
      document.getElementById('recording-progress').classList.add('hidden');

      // Show analysis results
      const analysisDiv = document.getElementById('analysis-results');
      const analysisContent = document.getElementById('analysis-content');

      let html = `
        <div class="form-group">
          <h4>Goal</h4>
          <p>${analysis.goal || 'Understanding your workflow...'}</p>
        </div>
        ${
          analysis.steps
            ? `
          <div class="form-group">
            <h4>Workflow Steps</h4>
            <ol style="margin-left: 20px; line-height: 1.8;">
              ${analysis.steps.map(step => `<li>${step.description}</li>`).join('')}
            </ol>
          </div>
        `
            : ''
        }
        ${
          analysis.variables && analysis.variables.length > 0
            ? `
          <div class="form-group">
            <h4>Identified Variables</h4>
            <ul style="margin-left: 20px;">
              ${analysis.variables.map(v => `<li>${v.name}: ${v.type}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      `;

      analysisContent.innerHTML = html;
      analysisDiv.classList.remove('hidden');

      // Store analysis in state
      appState.recordingData.analysis = analysis;
    }
  } catch (error) {
    showToast('Error analyzing workflow: ' + error.message, 'error');
  }
}

async function saveWorkflow() {
  try {
    if (!appState.recordingData) {
      showToast('No recording data to save', 'error');
      return;
    }

    const name = document.getElementById('workflow-name').value;
    if (!name) {
      showToast('Please enter a workflow name', 'error');
      return;
    }

    const response = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        recordedData: appState.recordingData,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showToast('Workflow saved successfully!', 'success');
      resetRecorder();
      await loadWorkflows();
    } else {
      showToast('Error saving workflow: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Error saving workflow: ' + error.message, 'error');
  }
}

function resetRecorder() {
  document.getElementById('workflow-name').value = '';
  document.getElementById('workflow-description').value = '';
  document.getElementById('recording-setup').classList.remove('hidden');
  document.getElementById('recording-progress').classList.add('hidden');
  document.getElementById('analysis-results').classList.add('hidden');
  document.getElementById('action-log').innerHTML = '';
  document.getElementById('intent-input').value = '';
  appState.recordingData = null;
}

// ==================== WORKFLOWS ==================== //

function setupWorkflowsListeners() {
  const searchInput = document.getElementById('workflow-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterWorkflows(e.target.value);
    });
  }
}

async function loadWorkflows() {
  try {
    const result = await window.electronAPI.getWorkflows();

    if (result.success) {
      appState.workflows = result.workflows;
      displayWorkflows(result.workflows);
      updateDashboard();
    }
  } catch (error) {
    console.error('Error loading workflows:', error);
  }
}

function displayWorkflows(workflows) {
  const list = document.getElementById('workflows-list');
  if (!list) return;

  if (workflows.length === 0) {
    list.innerHTML =
      '<p style="text-align: center; color: #718096; padding: 40px;">No workflows yet. Start recording one!</p>';
    return;
  }

  list.innerHTML = workflows
    .map(
      workflow => `
    <div class="workflow-item" onclick="showWorkflowModal('${workflow.id}')">
      <div class="workflow-item-header">
        <div class="workflow-item-title">${workflow.name}</div>
        <div style="font-size: 1.5em;">📋</div>
      </div>
      <div class="workflow-item-meta">
        <span>📅 ${new Date(workflow.createdAt).toLocaleDateString()}</span>
        <span>⚡ ${workflow.recordedData?.actionCount || 0} actions</span>
        <span>💭 ${workflow.recordedData?.intentCount || 0} intents</span>
      </div>
      <div class="workflow-item-desc">
        ${workflow.analysis?.goal || 'Click to view details'}
      </div>
      <div class="workflow-item-actions">
        <button class="btn btn-primary btn-sm" onclick="executeWorkflowDirect('${workflow.id}')">▶️ Execute</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteWorkflowItem('${workflow.id}')">🗑️ Delete</button>
      </div>
    </div>
  `
    )
    .join('');
}

function filterWorkflows(query) {
  const filtered = appState.workflows.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase())
  );
  displayWorkflows(filtered);
}

async function showWorkflowModal(workflowId) {
  const workflow = appState.workflows.find(w => w.id === workflowId);
  if (!workflow) return;

  const modal = document.getElementById('workflow-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const executeBtn = document.getElementById('modal-execute-btn');

  title.textContent = workflow.name;

  let html = `
    <div>
      <h4>Analysis</h4>
      <p><strong>Goal:</strong> ${workflow.analysis?.goal || 'N/A'}</p>
      ${
        workflow.analysis?.steps
          ? `
        <p><strong>Steps:</strong></p>
        <ol style="margin-left: 20px;">
          ${workflow.analysis.steps.map(s => `<li>${s.description}</li>`).join('')}
        </ol>
      `
          : ''
      }
      <p><strong>Created:</strong> ${new Date(workflow.createdAt).toLocaleString()}</p>
      <p><strong>Executions:</strong> ${workflow.executionHistory?.length || 0}</p>
    </div>
  `;

  body.innerHTML = html;
  executeBtn.onclick = () => {
    closeModal();
    executeWorkflowDirect(workflowId);
  };

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('workflow-modal').classList.add('hidden');
}

async function deleteWorkflowItem(workflowId) {
  if (!confirm('Are you sure you want to delete this workflow?')) {
    return;
  }

  try {
    const result = await window.electronAPI.deleteWorkflow(workflowId);
    if (result.success) {
      showToast('Workflow deleted', 'success');
      await loadWorkflows();
    }
  } catch (error) {
    showToast('Error deleting workflow: ' + error.message, 'error');
  }
}

// ==================== EXECUTION ==================== //

function setupExecutionListeners() {
  const selectElement = document.getElementById('execute-workflow-select');
  const executeBtn = document.getElementById('execute-btn');

  if (selectElement) {
    selectElement.addEventListener('change', (e) => {
      const hasSelection = e.target.value !== '';
      document.getElementById('execution-options').classList.toggle('hidden', !hasSelection);
      document.getElementById('execute-btn').classList.toggle('hidden', !hasSelection);
    });
  }

  if (executeBtn) {
    executeBtn.addEventListener('click', executeWorkflow);
  }
}

function populateWorkflowDropdown() {
  const select = document.getElementById('execute-workflow-select');
  if (!select) return;

  const options = appState.workflows.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

  select.innerHTML = '<option value="">Choose a workflow...</option>' + options;
}

async function executeWorkflow() {
  const selectElement = document.getElementById('execute-workflow-select');
  const workflowId = selectElement.value;

  if (!workflowId) {
    showToast('Please select a workflow', 'error');
    return;
  }

  try {
    const result = await window.electronAPI.executeWorkflow(workflowId);

    if (result.success) {
      showExecutionLog(result.result);
      showToast('Workflow executed successfully!', 'success');
    } else {
      showToast('Workflow execution failed: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Error executing workflow: ' + error.message, 'error');
  }
}

async function executeWorkflowDirect(workflowId) {
  try {
    const result = await window.electronAPI.executeWorkflow(workflowId);

    if (result.success) {
      showToast('Workflow executed successfully!', 'success');
      switchView('execute');
      // Lazy load the results
      setTimeout(() => {
        showExecutionLog(result.result);
      }, 100);
    } else {
      showToast('Workflow execution failed: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Error executing workflow: ' + error.message, 'error');
  }
}

function showExecutionLog(result) {
  const logDiv = document.getElementById('execution-log');
  const logEntries = document.getElementById('execution-log-entries');

  if (!logDiv) return;

  let html = result.executionLog
    ? result.executionLog
        .map(
          entry => `
      <div class="log-entry ${entry.status}">
        <strong>Step ${entry.step}:</strong> ${entry.description}
        <br/>
        <small>${entry.status === 'success' ? '✅ Success' : '❌ Error: ' + (entry.error || entry.result?.error)}</small>
      </div>
    `
        )
        .join('')
    : '<p>No execution log available</p>';

  logEntries.innerHTML = html;
  logDiv.classList.remove('hidden');
}

// ==================== SETTINGS ==================== //

function setupSettingsListeners() {
  const saveBtn = document.getElementById('save-settings-btn');
  const exportBtn = document.getElementById('export-workflows-btn');
  const clearBtn = document.getElementById('clear-history-btn');

  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (exportBtn) exportBtn.addEventListener('click', exportWorkflows);
  if (clearBtn) clearBtn.addEventListener('click', clearHistory);
}

function saveSettings() {
  const settings = {
    apiKey: document.getElementById('api-key').value,
    recordInterval: document.getElementById('record-interval').value,
    autoConfirmSteps: document.getElementById('auto-confirm-steps').checked,
  };

  localStorage.setItem('appSettings', JSON.stringify(settings));
  showToast('Settings saved!', 'success');
}

function exportWorkflows() {
  const dataStr = JSON.stringify(appState.workflows, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workflows_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Workflows exported!', 'success');
}

function clearHistory() {
  if (!confirm('Clear all execution history? This cannot be undone.')) {
    return;
  }

  appState.workflows.forEach(w => {
    w.executionHistory = [];
  });

  showToast('Execution history cleared', 'success');
}

// ==================== DASHBOARD ==================== //

function updateDashboard() {
  const totalWorkflows = appState.workflows.length;
  const totalExecutions = appState.workflows.reduce((sum, w) => sum + (w.executionHistory?.length || 0), 0);

  document.getElementById('stat-workflows').textContent = totalWorkflows;
  document.getElementById('stat-executions').textContent = totalExecutions;
  document.getElementById('stat-success-rate').textContent =
    totalWorkflows > 0 ? ((totalExecutions / totalWorkflows) * 100).toFixed(0) + '%' : '0%';
  document.getElementById('stat-time-saved').textContent = (totalExecutions * 0.5).toFixed(1) + 'h';

  // Show recent workflows
  const recentList = document.getElementById('recent-list');
  const recents = appState.workflows.slice(0, 3);

  if (recents.length === 0) {
    recentList.innerHTML =
      '<p style="text-align: center; color: #718096;">No workflows yet. Create your first one!</p>';
    return;
  }

  recentList.innerHTML = recents
    .map(
      w => `
    <div class="workflow-item">
      <div class="workflow-item-title">${w.name}</div>
      <div class="workflow-item-meta">
        <span>📅 ${new Date(w.createdAt).toLocaleDateString()}</span>
        <span>⚡ ${w.executionHistory?.length || 0} runs</span>
      </div>
    </div>
  `
    )
    .join('');
}

// ==================== UTILITIES ==================== //

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };
  return icons[type] || '📢';
}
