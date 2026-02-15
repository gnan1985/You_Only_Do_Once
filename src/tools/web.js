const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Web & API MCP Tool
 */

/**
 * Fetch URL
 */
async function fetch_url(params) {
  try {
    const { url, method = 'GET', headers = {}, body = null } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    const config = {
      method,
      url,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = body;
    }

    logger.debug(`Fetching ${method} ${url}`);

    const response = await axios(config);

    let responseData = response.data;
    if (typeof responseData === 'object') {
      responseData = JSON.stringify(responseData, null, 2);
    }

    return {
      success: true,
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: response.headers,
    };
  } catch (error) {
    logger.error('Error fetching URL:', error);
    throw new Error(`Failed to fetch ${params.url}: ${error.message}`);
  }
}

/**
 * Parse HTML content
 */
async function parse_html(params) {
  try {
    const { html, selector } = params;

    if (!html) {
      throw new Error('HTML parameter is required');
    }

    if (!selector) {
      throw new Error('Selector parameter is required');
    }

    // Simple CSS selector parsing (limited functionality without jsdom)
    // In production, use jsdom or cheerio for full HTML parsing

    logger.debug(`Parsing HTML with selector: ${selector}`);

    // Extract text between tags (basic parsing)
    const regex = new RegExp(`<[^>]*>${selector}[^<]*<`, 'gi');
    const matches = html.match(regex) || [];

    return {
      success: true,
      selector,
      matches: matches.length,
      data: matches,
    };
  } catch (error) {
    logger.error('Error parsing HTML:', error);
    throw error;
  }
}

/**
 * Submit form (basic)
 */
async function submit_form(params) {
  try {
    const { url, fields = {} } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    logger.debug(`Submitting form to ${url}`);

    const response = await axios.post(url, fields, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      success: true,
      url,
      status: response.status,
      returnUrl: response.request.res.responseUrl,
    };
  } catch (error) {
    logger.error('Error submitting form:', error);
    throw error;
  }
}

/**
 * Parse JSON response
 */
async function parse_json(params) {
  try {
    const { jsonString } = params;

    if (!jsonString) {
      throw new Error('jsonString parameter is required');
    }

    const parsed = JSON.parse(jsonString);

    logger.debug('Parsed JSON successfully');

    return {
      success: true,
      data: parsed,
      type: typeof parsed,
    };
  } catch (error) {
    logger.error('Error parsing JSON:', error);
    throw error;
  }
}

/**
 * Get page title and meta data
 */
async function get_page_info(params) {
  try {
    const { url } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    const response = await axios.get(url);
    const html = response.data;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : null;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = descMatch ? descMatch[1] : null;

    logger.debug(`Got page info for ${url}`);

    return {
      success: true,
      url,
      title,
      description,
      contentLength: html.length,
    };
  } catch (error) {
    logger.error('Error getting page info:', error);
    throw error;
  }
}

module.exports = {
  fetch_url,
  parse_html,
  submit_form,
  parse_json,
  get_page_info,
};
