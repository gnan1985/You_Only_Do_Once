const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const logger = require('../utils/logger');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
const workflowsDir = path.join(dataDir, 'workflows');

// Ensure directories exist
if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true });
}

class Storage {
  /**
   * Save a workflow
   */
  saveWorkflow(workflow) {
    try {
      const filePath = path.join(workflowsDir, `${workflow.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
      logger.info(`Workflow saved: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error('Error saving workflow:', error);
      throw error;
    }
  }

  /**
   * Get a specific workflow
   */
  getWorkflow(id) {
    try {
      const filePath = path.join(workflowsDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Workflow not found: ${id}`);
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Get all workflows
   */
  getAllWorkflows() {
    try {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
      return files
        .map(file => {
          try {
            const content = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            logger.error(`Error reading workflow file ${file}:`, error);
            return null;
          }
        })
        .filter(w => w !== null)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      logger.error('Error getting all workflows:', error);
      return [];
    }
  }

  /**
   * Delete a workflow
   */
  deleteWorkflow(id) {
    try {
      const filePath = path.join(workflowsDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Workflow deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Update a workflow
   */
  updateWorkflow(id, updates) {
    try {
      const workflow = this.getWorkflow(id);
      if (!workflow) {
        throw new Error(`Workflow not found: ${id}`);
      }

      const updated = { ...workflow, ...updates, id };
      return this.saveWorkflow(updated);
    } catch (error) {
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Save execution history
   */
  saveExecutionHistory(workflowId, execution) {
    try {
      const workflow = this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (!workflow.executionHistory) {
        workflow.executionHistory = [];
      }

      workflow.executionHistory.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...execution,
      });

      return this.saveWorkflow(workflow);
    } catch (error) {
      logger.error('Error saving execution history:', error);
      throw error;
    }
  }

  /**
   * Get execution history for a workflow
   */
  getExecutionHistory(workflowId) {
    try {
      const workflow = this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }
      return workflow.executionHistory || [];
    } catch (error) {
      logger.error('Error getting execution history:', error);
      throw error;
    }
  }

  /**
   * Search workflows by name
   */
  searchWorkflows(query) {
    try {
      const allWorkflows = this.getAllWorkflows();
      return allWorkflows.filter(
        w =>
          w.name.toLowerCase().includes(query.toLowerCase()) ||
          w.id.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      logger.error('Error searching workflows:', error);
      return [];
    }
  }

  /**
   * Get workflow by name
   */
  getWorkflowByName(name) {
    try {
      const allWorkflows = this.getAllWorkflows();
      return allWorkflows.find(w => w.name === name) || null;
    } catch (error) {
      logger.error('Error getting workflow by name:', error);
      return null;
    }
  }

  /**
   * Save or update workflow (upsert by name)
   */
  saveOrUpdateWorkflow(workflow) {
    try {
      // Check if a workflow with this name already exists
      const existing = this.getWorkflowByName(workflow.name);
      
      if (existing) {
        // Update existing workflow, preserve ID and createdAt
        const updated = {
          ...workflow,
          id: existing.id,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        };
        return this.saveWorkflow(updated);
      } else {
        // Create new workflow
        if (!workflow.id) {
          workflow.id = uuidv4();
        }
        if (!workflow.createdAt) {
          workflow.createdAt = new Date().toISOString();
        }
        return this.saveWorkflow(workflow);
      }
    } catch (error) {
      logger.error('Error in saveOrUpdateWorkflow:', error);
      throw error;
    }
  }

  /**
   * Search workflows by name
   */

  /**
   * Get workflow statistics
   */
  getStatistics() {
    try {
      const allWorkflows = this.getAllWorkflows();
      const totalExecutions = allWorkflows.reduce(
        (sum, w) => sum + (w.executionHistory?.length || 0),
        0
      );

      return {
        totalWorkflows: allWorkflows.length,
        totalExecutions,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      return { totalWorkflows: 0, totalExecutions: 0 };
    }
  }
}

module.exports = new Storage();
