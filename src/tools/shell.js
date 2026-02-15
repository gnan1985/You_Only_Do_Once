const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

const execPromise = util.promisify(exec);

/**
 * Shell Command MCP Tool
 */

/**
 * Execute a shell command
 */
async function execute_command(params) {
  try {
    const { command, cwd = process.cwd() } = params;

    if (!command) {
      throw new Error('Command parameter is required');
    }

    logger.info(`Executing command: ${command} (cwd: ${cwd})`);

    const { stdout, stderr } = await execPromise(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 30000, // 30 second timeout
    });

    logger.debug(`Command executed successfully`);

    return {
      success: true,
      command,
      cwd,
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error) {
    logger.error('Error executing command:', error);

    // Extract exit code if available
    const exitCode = error.code || error.status || 1;

    return {
      success: false,
      command: params.command,
      cwd: params.cwd || process.cwd(),
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode,
      error: error.message,
    };
  }
}

/**
 * List directory contents
 */
async function list_directory(params) {
  try {
    const { path = '.' } = params;

    logger.debug(`Listing directory: ${path}`);

    const { stdout } = await execPromise(`dir "${path}"`, {
      shell: 'cmd.exe', // Use cmd.exe for Windows compatibility
    });

    return {
      success: true,
      path,
      contents: stdout,
    };
  } catch (error) {
    logger.error('Error listing directory:', error);
    throw error;
  }
}

/**
 * Create a directory
 */
async function create_directory(params) {
  try {
    const { path } = params;

    if (!path) {
      throw new Error('Path parameter is required');
    }

    logger.info(`Creating directory: ${path}`);

    await execPromise(`mkdir "${path}"`, {
      shell: 'cmd.exe',
    });

    return {
      success: true,
      path,
      created: true,
    };
  } catch (error) {
    logger.error('Error creating directory:', error);
    throw error;
  }
}

/**
 * Remove a directory
 */
async function remove_directory(params) {
  try {
    const { path, recursive = false } = params;

    if (!path) {
      throw new Error('Path parameter is required');
    }

    logger.info(`Removing directory: ${path}`);

    const flag = recursive ? '/S /Q' : '';
    await execPromise(`rmdir ${flag} "${path}"`, {
      shell: 'cmd.exe',
    });

    return {
      success: true,
      path,
      removed: true,
    };
  } catch (error) {
    logger.error('Error removing directory:', error);
    throw error;
  }
}

/**
 * Get command output
 */
async function get_output(params) {
  try {
    const { command, cwd = process.cwd() } = params;

    if (!command) {
      throw new Error('Command parameter is required');
    }

    logger.debug(`Getting output from: ${command}`);

    const { stdout } = await execPromise(command, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      success: true,
      command,
      output: stdout.trim(),
    };
  } catch (error) {
    logger.error('Error getting command output:', error);
    throw error;
  }
}

module.exports = {
  execute_command,
  list_directory,
  create_directory,
  remove_directory,
  get_output,
};
