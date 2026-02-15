const axios = require('axios');
const logger = require('../utils/logger');
const mcpTools = require('./mcp-tools');

class WorkflowAnalyzer {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.model = 'claude-3-5-sonnet-20241022';
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

## Available MCP Tools:
${JSON.stringify(toolDefinitions, null, 2)}

## Task:
Generate a structured procedure that:
1. Describes WHAT the user is trying to accomplish (the goal)
2. Lists each major step in plain English
3. Identifies which MCP tools should be used for each step
4. Extracts variables (filenames, patterns, data ranges, URLs, etc.)
5. Identifies conditional logic or loops if present
6. Handles errors gracefully

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
      "tool_action": "read|write|execute|fetch|etc",
      "parameters": {"key": "value"},
      "expected_output": "description of expected result",
      "error_handling": "what to do if this fails"
    }
  ],
  "adaptive_rules": [
    "Rule to detect changes and adapt (e.g., 'if filename pattern changes')"
  ],
  "confidence_score": 0.9,
  "notes": "Any additional notes about the workflow"
}
`;

      const response = await this.callClaudeAPI(prompt);
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
   * Call Claude API
   */
  async callClaudeAPI(prompt) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        }
      );

      const content = response.data.content[0].text;

      try {
        // Try to parse as JSON
        return JSON.parse(content);
      } catch (e) {
        // If not valid JSON, return raw content
        logger.warn('Claude response is not valid JSON, returning raw content');
        return {
          raw_response: content,
          goal: 'Unable to parse structured response. See raw_response.',
          steps: [],
        };
      }
    } catch (error) {
      logger.error('Error calling Claude API:', error.response?.data || error.message);
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
