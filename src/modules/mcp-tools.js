const logger = require('../utils/logger');

/**
 * MCP Tools Manager
 * Defines and exposes tools available to Claude for workflow execution
 */
class MCPTools {
  constructor() {
    this.tools = {
      filesystem: require('../tools/filesystem'),
      spreadsheet: require('../tools/spreadsheet'),
      web: require('../tools/web'),
      shell: require('../tools/shell'),
    };
  }

  /**
   * Get all tool definitions for Claude
   */
  getToolDefinitions() {
    return {
      filesystem: {
        name: 'filesystem',
        description: 'File system operations',
        tools: [
          {
            name: 'list_files',
            description: 'List files in a directory with optional pattern matching',
            parameters: {
              path: { type: 'string', description: 'Directory path' },
              pattern: { type: 'string', description: 'Optional glob pattern' },
            },
          },
          {
            name: 'read_file',
            description: 'Read file contents',
            parameters: {
              path: { type: 'string', description: 'File path' },
            },
          },
          {
            name: 'write_file',
            description: 'Write contents to file',
            parameters: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content' },
            },
          },
          {
            name: 'rename_file',
            description: 'Rename or move a file',
            parameters: {
              oldPath: { type: 'string', description: 'Current file path' },
              newPath: { type: 'string', description: 'New file path' },
            },
          },
          {
            name: 'delete_file',
            description: 'Delete a file',
            parameters: {
              path: { type: 'string', description: 'File path' },
            },
          },
          {
            name: 'file_exists',
            description: 'Check if file exists',
            parameters: {
              path: { type: 'string', description: 'File path' },
            },
          },
          {
            name: 'copy_file',
            description: 'Copy a file',
            parameters: {
              source: { type: 'string', description: 'Source path' },
              destination: { type: 'string', description: 'Destination path' },
            },
          },
        ],
      },
      spreadsheet: {
        name: 'spreadsheet',
        description: 'Spreadsheet (Excel/CSV) operations',
        tools: [
          {
            name: 'read_spreadsheet',
            description: 'Read spreadsheet data',
            parameters: {
              path: { type: 'string', description: 'Excel or CSV file path' },
              sheet: { type: 'string', description: 'Sheet name (for Excel)' },
            },
          },
          {
            name: 'write_spreadsheet',
            description: 'Write data to spreadsheet',
            parameters: {
              path: { type: 'string', description: 'File path' },
              data: { type: 'object', description: 'Data to write' },
              sheet: { type: 'string', description: 'Sheet name' },
            },
          },
          {
            name: 'sort_data',
            description: 'Sort spreadsheet data',
            parameters: {
              path: { type: 'string', description: 'File path' },
              column: { type: 'string', description: 'Column to sort by' },
              order: { type: 'string', description: 'asc or desc' },
            },
          },
          {
            name: 'filter_data',
            description: 'Filter spreadsheet data',
            parameters: {
              path: { type: 'string', description: 'File path' },
              column: { type: 'string', description: 'Column to filter' },
              value: { type: 'string', description: 'Filter value' },
            },
          },
        ],
      },
      web: {
        name: 'web',
        description: 'Web and API operations',
        tools: [
          {
            name: 'fetch_url',
            description: 'Fetch content from URL',
            parameters: {
              url: { type: 'string', description: 'URL to fetch' },
              method: { type: 'string', description: 'GET, POST, etc.' },
              headers: { type: 'object', description: 'Request headers' },
              body: { type: 'object', description: 'Request body' },
            },
          },
          {
            name: 'parse_html',
            description: 'Parse HTML and extract data',
            parameters: {
              html: { type: 'string', description: 'HTML content' },
              selector: { type: 'string', description: 'CSS selector' },
            },
          },
          {
            name: 'submit_form',
            description: 'Submit web form (requires browser automation)',
            parameters: {
              url: { type: 'string', description: 'Form URL' },
              fields: { type: 'object', description: 'Form fields and values' },
            },
          },
        ],
      },
      shell: {
        name: 'shell',
        description: 'Shell command execution',
        tools: [
          {
            name: 'execute_command',
            description: 'Execute shell command',
            parameters: {
              command: { type: 'string', description: 'Command to execute' },
              cwd: { type: 'string', description: 'Working directory' },
            },
          },
        ],
      },
    };
  }

  /**
   * Execute a tool with given parameters
   */
  async executeTool(toolCategory, toolName, parameters) {
    try {
      logger.info(`Executing tool: ${toolCategory}.${toolName}`, { parameters });

      const toolModule = this.tools[toolCategory];
      if (!toolModule) {
        throw new Error(`Tool category not found: ${toolCategory}`);
      }

      if (typeof toolModule[toolName] !== 'function') {
        throw new Error(`Tool not found: ${toolCategory}.${toolName}`);
      }

      const result = await toolModule[toolName](parameters);
      logger.info(`Tool executed successfully: ${toolCategory}.${toolName}`);
      return result;
    } catch (error) {
      logger.error(`Error executing tool ${toolCategory}.${toolName}:`, error);
      throw error;
    }
  }

  /**
   * List all available tools
   */
  listAvailableTools() {
    const tools = [];
    Object.entries(this.getToolDefinitions()).forEach(([category, categoryDef]) => {
      categoryDef.tools.forEach(tool => {
        tools.push({
          category,
          name: tool.name,
          description: tool.description,
        });
      });
    });
    return tools;
  }
}

module.exports = new MCPTools();
