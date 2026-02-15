const logger = require('../utils/logger');
const mcpTools = require('./mcp-tools');
const aiClient = require('./ai-client');

class WorkflowAnalyzer {
  constructor() {
    logger.info('WorkflowAnalyzer initialized');
  }

  /**
   * Analyze recorded workflow and generate procedures
   */
  async analyzeWorkflow(recordedData) {
    try {
      logger.info('Starting workflow analysis');

      const summary = this.createWorkflowSummary(recordedData);
      const toolDefinitions = mcpTools.getToolDefinitions();

      const prompt = `
You are an intelligent workflow automation assistant. Analyze the following recorded user workflow and generate a detailed, semantic procedure that can be executed by an AI with access to MCP tools.

## Recorded Workflow Summary:
- Name: ${recordedData.name}
- Duration: ${recordedData.duration}ms
- Actions captured: ${recordedData.actionCount}
- User intents: ${recordedData.intentCount}

## Actions:
${summary.actionsSummary}

## User Intents (what the user was trying to accomplish):
${summary.intentsSummary}

## Available MCP Tools and Methods:
${JSON.stringify(toolDefinitions, null, 2)}

## Task:
Generate a structured procedure that:
1. Describes WHAT the user is trying to accomplish (the goal)
2. Lists each major step in plain English
3. Identifies which MCP tools and methods should be used for each step
4. Extracts variables (filenames, patterns, data ranges, URLs, etc.)
5. Identifies conditional logic or loops if present
6. Handles errors gracefully

IMPORTANT: Use the EXACT method names from the tool definitions above (e.g., list_files, read_file, write_file, etc.)

Format your response as JSON with this structure:
{
  "goal": "high-level description of what this workflow accomplishes",
  "variables": [
    {"name": "sample_name", "type": "string", "extracted_from": "filename pattern", "value": ""}
  ],
  "steps": [
    {
      "step_number": 1,
      "description": "human-readable description",
      "tool": "filesystem|spreadsheet|web|shell",
      "tool_action": "read_file|write_file|list_files|etc",
      "parameters": {"key": "value"},
      "expected_output": "description of expected result",
      "error_handling": "stop|continue|ask"
    }
  ],
  "adaptive_rules": [
    "Rule to detect changes and adapt (e.g., 'if filename pattern changes')"
  ],
  "confidence_score": 0.9,
  "notes": "Any additional notes about the workflow"
}
`;

      const response = await this.callAI(prompt);
      logger.info('Workflow analysis completed');

      return response;
    } catch (error) {
      logger.error('Error analyzing workflow:', error);
      throw error;
    }
  }

  /**
   * Create a summary of recorded actions and intents
   */
  createWorkflowSummary(recordedData) {
    // Group actions by type
    const actionsByType = {};
    recordedData.actions.forEach(action => {
      if (!actionsByType[action.type]) {
        actionsByType[action.type] = [];
      }
      actionsByType[action.type].push(action);
    });

    // Create actions summary
    const actionsSummary = Object.entries(actionsByType)
      .map(([type, actions]) => {
        if (type === 'mouse-click') {
          return `- ${type}: ${actions.length} clicks at various coordinates`;
        } else if (type === 'mouse-move') {
          return `- ${type}: ${actions.length} movements`;
        } else if (type === 'keyboard') {
          return `- ${type}: ${actions.length} key presses`;
        } else if (type === 'app-context-change') {
          return `- ${type}: ${actions.map(a => `${a.appName}`).join(', ')}`;
        }
        return `- ${type}: ${actions.length} occurrences`;
      })
      .join('\n');

    // Create intents summary
    const intentsSummary = recordedData.intents
      .map((intent, idx) => `${idx + 1}. "${intent.description}" (at ${intent.timestamp}ms)`)
      .join('\n') || 'No intents recorded';

    return { actionsSummary, intentsSummary };
  }

  /**
   * Call AI API (Claude or OpenAI)
   */
  async callAI(prompt) {
    try {
      const response = await aiClient.sendMessage(prompt, { maxTokens: 2048 });
      return aiClient.parseJSONResponse(response);
    } catch (error) {
      logger.error('Error calling AI API:', error);
      throw error;
    }
  }

  /**
   * Validate if analysis looks reasonable
   */
  validateAnalysis(analysis) {
    if (!analysis.goal || !analysis.steps || analysis.steps.length === 0) {
      logger.warn('Analysis validation failed: missing goal or steps');
      return false;
    }
    return true;
  }
}

module.exports = new WorkflowAnalyzer();
