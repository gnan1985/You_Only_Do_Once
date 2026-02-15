const express = require('express');
const path = require('path');
require('dotenv').config();

const logger = require('./src/utils/logger');
const workflowAnalyzer = require('./src/modules/workflow-analyzer');
const storage = require('./src/modules/storage');
const executor = require('./src/modules/executor');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

logger.info('Express server starting...');

// =====================
// API Routes
// =====================

/**
 * POST /api/workflows
 * Save a recorded workflow
 */
app.post('/api/workflows', async (req, res) => {
  try {
    const { name, recordedData } = req.body;

    if (!name || !recordedData) {
      return res.status(400).json({ error: 'Missing name or recordedData' });
    }

    // Analyze the recorded workflow
    logger.info(`Analyzing workflow: ${name}`);
    const analysis = await workflowAnalyzer.analyzeWorkflow(recordedData);

    const workflow = {
      id: require('uuid').v4(),
      name,
      recordedData,
      analysis,
      createdAt: new Date().toISOString(),
      executionHistory: [],
    };

    storage.saveWorkflow(workflow);
    logger.info(`Workflow saved: ${workflow.id}`);

    res.json({ success: true, workflow });
  } catch (error) {
    logger.error('Error saving workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workflows
 * Get all workflows
 */
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = storage.getAllWorkflows();
    res.json({ success: true, workflows });
  } catch (error) {
    logger.error('Error getting workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workflows/:id
 * Get a specific workflow
 */
app.get('/api/workflows/:id', (req, res) => {
  try {
    const workflow = storage.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.json({ success: true, workflow });
  } catch (error) {
    logger.error('Error getting workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute a workflow
 */
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const workflow = storage.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    logger.info(`Executing workflow: ${req.params.id}`);
    const executionResult = await executor.execute(workflow);

    // Save execution history
    workflow.executionHistory.push({
      timestamp: new Date().toISOString(),
      success: executionResult.success,
      result: executionResult,
    });
    storage.saveWorkflow(workflow);

    res.json({ success: true, result: executionResult });
  } catch (error) {
    logger.error('Error executing workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
app.delete('/api/workflows/:id', (req, res) => {
  try {
    storage.deleteWorkflow(req.params.id);
    logger.info(`Workflow deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analyze
 * Analyze recorded actions
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { recordedData } = req.body;

    if (!recordedData) {
      return res.status(400).json({ error: 'Missing recordedData' });
    }

    logger.info('Analyzing recorded data');
    const analysis = await workflowAnalyzer.analyzeWorkflow(recordedData);

    res.json({ success: true, analysis });
  } catch (error) {
    logger.error('Error analyzing workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// Health Check
// =====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================
// Error Handling
// =====================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// =====================
// Start Server
// =====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Express server running on port ${PORT}`);
});

module.exports = app;
