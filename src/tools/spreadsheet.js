const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Spreadsheet MCP Tool (Excel/CSV)
 */

/**
 * Read spreadsheet data
 */
async function read_spreadsheet(params) {
  try {
    const { path: filePath, sheet } = params;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);

    if (!workbook.SheetNames.length) {
      throw new Error('No sheets found in workbook');
    }

    const sheetName = sheet || workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    logger.info(`Read spreadsheet: ${filePath} (sheet: ${sheetName}, rows: ${data.length})`);

    return {
      success: true,
      path: filePath,
      sheet: sheetName,
      data,
      rowCount: data.length,
      columnCount: data.length > 0 ? Object.keys(data[0]).length : 0,
    };
  } catch (error) {
    logger.error('Error reading spreadsheet:', error);
    throw error;
  }
}

/**
 * Write spreadsheet data
 */
async function write_spreadsheet(params) {
  try {
    const { path: filePath, data, sheet } = params;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sheetName = sheet || 'Sheet1';
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

    xlsx.writeFile(workbook, filePath);

    logger.info(
      `Spreadsheet written: ${filePath} (sheet: ${sheetName}, rows: ${data.length})`
    );

    return {
      success: true,
      path: filePath,
      sheet: sheetName,
      rowsWritten: data.length,
    };
  } catch (error) {
    logger.error('Error writing spreadsheet:', error);
    throw error;
  }
}

/**
 * Sort spreadsheet data
 */
async function sort_data(params) {
  try {
    const { path: filePath, column, order, sheet } = params;

    // Read the spreadsheet
    const readResult = await read_spreadsheet({ path: filePath, sheet });
    let data = readResult.data;

    if (!column) {
      throw new Error('Column parameter required for sorting');
    }

    // Sort data
    const isAscending = order !== 'desc';
    data.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      if (valA < valB) return isAscending ? -1 : 1;
      if (valA > valB) return isAscending ? 1 : -1;
      return 0;
    });

    // Write back to file
    await write_spreadsheet({
      path: filePath,
      data,
      sheet: sheet || readResult.sheet,
    });

    logger.info(`Sorted spreadsheet by ${column} (${order})`);

    return {
      success: true,
      path: filePath,
      sortedBy: column,
      order: isAscending ? 'asc' : 'desc',
      rowsSorted: data.length,
    };
  } catch (error) {
    logger.error('Error sorting spreadsheet:', error);
    throw error;
  }
}

/**
 * Filter spreadsheet data
 */
async function filter_data(params) {
  try {
    const { path: filePath, column, value, sheet } = params;

    // Read the spreadsheet
    const readResult = await read_spreadsheet({ path: filePath, sheet });
    let data = readResult.data;

    if (!column || value === undefined) {
      throw new Error('Column and value parameters required for filtering');
    }

    // Filter data
    const filteredData = data.filter(row => row[column] == value);

    logger.info(`Filtered spreadsheet: ${column} = ${value} (${filteredData.length} rows matched)`);

    return {
      success: true,
      path: filePath,
      column,
      value,
      matchedRows: filteredData.length,
      data: filteredData,
    };
  } catch (error) {
    logger.error('Error filtering spreadsheet:', error);
    throw error;
  }
}

/**
 * Append data to spreadsheet
 */
async function append_data(params) {
  try {
    const { path: filePath, data, sheet } = params;

    // Read existing data
    const readResult = await read_spreadsheet({ path: filePath, sheet });
    const existingData = readResult.data;

    // Combine and write
    const combinedData = [...existingData, ...data];

    await write_spreadsheet({
      path: filePath,
      data: combinedData,
      sheet: sheet || readResult.sheet,
    });

    logger.info(`Appended ${data.length} rows to spreadsheet`);

    return {
      success: true,
      path: filePath,
      rowsAppended: data.length,
      totalRows: combinedData.length,
    };
  } catch (error) {
    logger.error('Error appending to spreadsheet:', error);
    throw error;
  }
}

/**
 * Get cell value
 */
async function get_cell(params) {
  try {
    const { path: filePath, sheet, row, column } = params;

    const readResult = await read_spreadsheet({ path: filePath, sheet });
    const data = readResult.data;

    if (!data[row]) {
      throw new Error(`Row ${row} not found`);
    }

    const value = data[row][column];

    return {
      success: true,
      row,
      column,
      value,
    };
  } catch (error) {
    logger.error('Error getting cell:', error);
    throw error;
  }
}

module.exports = {
  read_spreadsheet,
  write_spreadsheet,
  sort_data,
  filter_data,
  append_data,
  get_cell,
};
