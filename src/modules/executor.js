const axios = require('axios');
const logger = require('../utils/logger');
const mcpTools = require('./mcp-tools');

class Executor {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = 'claude-3-5-sonnet-20241022';
  }

  /**
   * Execute a workflow using Claude and MCP tools
   */
  async execute(workflow) {
    try {
      logger.info(`Starting execution of workflow: ${workflow.id}`);

      const analysis = workflow.analysis;
      if (!analysis || !analysis.steps) {
        throw new Error('Workflow analysis missing or invalid');
      }

      const executionLog = [];
      const results = [];

      for (let i = 0; i < analysis.steps.length; i++) {
        const step = analysis.steps[i];
        logger.info(`Executing step ${i + 1}: ${step.description}`);

        try {
          const result = await this.executeStep(step, executionLog);
          results.push(result);
          executionLog.push({
            step: i + 1,
            description: step.description,
            status: 'success',
            result,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error(`Error executing step ${i + 1}:`, error);
          executionLog.push({
            step: i + 1,
            description: step.description,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
          });

          // Handle error based on error_handling instruction
          if (step.error_handling === 'stop') {
            return {
              success: false,
              error: `Failed at step ${i + 1}: ${error.message}`,
              executionLog,
              completedSteps: i,
              totalSteps: analysis.steps.length,
            };
          } else if (step.error_handling === 'continue') {
            logger.warn(`Continuing after error in step ${i + 1}`);
            continue;
          } else {
            // Ask user for help (would require UI interaction)
            return {
              success: false,
              requiresUserInput: true,
              error: `Step ${i + 1} failed: ${error.message}`,
              executionLog,
            };
          }
        }
      }

      logger.info(`Workflow execution completed successfully: ${workflow.id}`);
      return {
        success: true,
        workflowId: workflow.id,
        executionLog,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error executing workflow:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step, previousLog) {
    try {
      const tool = step.tool;
      const toolAction = step.tool_action;
      const parameters = step.parameters || {};

      logger.debug(`Executing tool: ${tool}.${toolAction}`, { parameters });

      // Map tool names to categories for MCP execution
      const toolMapping = {
        filesystem: 'filesystem',
        file: 'filesystem',
        spreadsheet: 'spreadsheet',
        web: 'web',
        shell: 'shell',
      };

      const toolCategory = toolMapping[tool] || tool;

      const result = await mcpTools.executeTool(toolCategory, toolAction, parameters);

      return {
        tool,
        toolAction,
        parameters,
        result,
        success: true,
      };
    } catch (error) {
      logger.error('Error executing step:', error);
      throw error;
    }
  }

  /**
   * Execute workflow with user confirmation for each step
   */
  async executeWithConfirmation(workflow) {
    try {
      logger.info(`Starting execution with confirmation: ${workflow.id}`);

      const analysis = workflow.analysis;
      const executionLog = [];

      // Placeholder: In UI implementation, prompt user for confirmation
      for (let i = 0; i < analysis.steps.length; i++) {
        const step = analysis.steps[i];
        logger.info(`Step ${i + 1} ready: ${step.description}`);

        // TODO: Wait for user confirmation via IPC
        const result = await this.executeStep(step, executionLog);
        executionLog.push({
          step: i + 1,
          ...result,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        executionLog,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error executing workflow with confirmation:', error);
      throw error;
    }
  }

  /**
   * Dry run - simulate execution without making changes
   */
  async dryRun(workflow) {
    try {
      logger.info(`Starting dry run: ${workflow.id}`);

      const analysis = workflow.analysis;
      const simulationLog = [];

      for (let i = 0; i < analysis.steps.length; i++) {
        const step = analysis.steps[i];
        simulationLog.push({
          step: i + 1,
          description: step.description,
          tool: step.tool,
          parameters: step.parameters,
          expectedOutput: step.expected_output,
          wouldExecute: true,
        });
      }

      return {
        success: true,
        isDryRun: true,
        simulationLog,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error running dry run:', error);
      throw error;
    }
  }
}

module.exports = new Executor();
