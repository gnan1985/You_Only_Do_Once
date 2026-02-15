const fs = require('fs');
const path = require('path');
const glob = require('glob');
const logger = require('../utils/logger');

/**
 * File System MCP Tool
 */

/**
 * List files in a directory
 */
async function list_files(params) {
  try {
    const { path: dirPath, pattern } = params;

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    let files = fs.readdirSync(dirPath);

    if (pattern) {
      const fullPattern = path.join(dirPath, pattern);
      files = glob.sync(fullPattern);
    }

    logger.debug(`Listed ${files.length} files in ${dirPath}`);
    return {
      success: true,
      files,
      count: files.length,
      directory: dirPath,
    };
  } catch (error) {
    logger.error('Error listing files:', error);
    throw error;
  }
}

/**
 * Read file contents
 */
async function read_file(params) {
  try {
    const { path: filePath } = params;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    logger.debug(`Read file: ${filePath} (${content.length} bytes)`);

    return {
      success: true,
      path: filePath,
      content,
      size: content.length,
    };
  } catch (error) {
    logger.error('Error reading file:', error);
    throw error;
  }
}

/**
 * Write file contents
 */
async function write_file(params) {
  try {
    const { path: filePath, content } = params;

    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`File written: ${filePath}`);

    return {
      success: true,
      path: filePath,
      bytesWritten: content.length,
    };
  } catch (error) {
    logger.error('Error writing file:', error);
    throw error;
  }
}

/**
 * Rename or move a file
 */
async function rename_file(params) {
  try {
    const { oldPath, newPath } = params;

    if (!fs.existsSync(oldPath)) {
      throw new Error(`File not found: ${oldPath}`);
    }

    // Create destination directory if needed
    const destDir = path.dirname(newPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.renameSync(oldPath, newPath);
    logger.info(`File renamed: ${oldPath} -> ${newPath}`);

    return {
      success: true,
      oldPath,
      newPath,
    };
  } catch (error) {
    logger.error('Error renaming file:', error);
    throw error;
  }
}

/**
 * Delete a file
 */
async function delete_file(params) {
  try {
    const { path: filePath } = params;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    fs.unlinkSync(filePath);
    logger.info(`File deleted: ${filePath}`);

    return {
      success: true,
      deletedPath: filePath,
    };
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Check if file exists
 */
async function file_exists(params) {
  try {
    const { path: filePath } = params;
    const exists = fs.existsSync(filePath);

    logger.debug(`File exists check: ${filePath} = ${exists}`);

    return {
      success: true,
      path: filePath,
      exists,
    };
  } catch (error) {
    logger.error('Error checking file:', error);
    throw error;
  }
}

/**
 * Copy a file
 */
async function copy_file(params) {
  try {
    const { source, destination } = params;

    if (!fs.existsSync(source)) {
      throw new Error(`Source file not found: ${source}`);
    }

    // Create destination directory if needed
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(source, destination);
    logger.info(`File copied: ${source} -> ${destination}`);

    return {
      success: true,
      source,
      destination,
    };
  } catch (error) {
    logger.error('Error copying file:', error);
    throw error;
  }
}

/**
 * Get file metadata
 */
async function get_file_info(params) {
  try {
    const { path: filePath } = params;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);

    return {
      success: true,
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    logger.error('Error getting file info:', error);
    throw error;
  }
}

module.exports = {
  list_files,
  read_file,
  write_file,
  rename_file,
  delete_file,
  file_exists,
  copy_file,
  get_file_info,
};
