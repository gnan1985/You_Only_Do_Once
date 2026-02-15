const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Unified AI Client for Claude and OpenAI APIs
 * Provides a single interface for both providers
 */
class AIClient {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'claude';
    
    if (this.provider === 'openai') {
      this.apiKey = process.env.OPENAI_API_KEY;
      this.baseUrl = 'https://api.openai.com/v1';
      this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo';
      
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY not found in environment variables');
      }
    } else if (this.provider === 'claude') {
      this.apiKey = process.env.CLAUDE_API_KEY;
      this.baseUrl = 'https://api.anthropic.com/v1';
      this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
      
      if (!this.apiKey) {
        throw new Error('CLAUDE_API_KEY not found in environment variables');
      }
    } else {
      throw new Error(`Unknown AI provider: ${this.provider}`);
    }
    
    logger.info(`AIClient initialized with provider: ${this.provider} (model: ${this.model})`);
  }

  /**
   * Send a message to the AI and get a response
   * @param {string} prompt - The user's prompt/message
   * @param {Object} options - Additional options (maxTokens, temperature, etc)
   * @returns {Promise<string>} - The AI response text
   */
  async sendMessage(prompt, options = {}) {
    try {
      if (this.provider === 'openai') {
        return await this.sendOpenAIMessage(prompt, options);
      } else {
        return await this.sendClaudeMessage(prompt, options);
      }
    } catch (error) {
      logger.error(`Error calling ${this.provider} API:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a message to Claude (Anthropic) API
   */
  async sendClaudeMessage(prompt, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: options.maxTokens || 2048,
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

      return response.data.content[0].text;
    } catch (error) {
      logger.error('Error calling Claude API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a message to OpenAI (GPT) API
   */
  async sendOpenAIMessage(prompt, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Error calling OpenAI API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Parse AI response expecting JSON
   * Handles JSON wrapped in markdown code blocks or plain JSON
   * @param {string} response - The AI response text
   * @returns {Object} - Parsed JSON or fallback object
   */
  parseJSONResponse(response) {
    try {
      // Try direct JSON parsing first
      return JSON.parse(response);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          logger.warn('Failed to parse JSON from markdown block');
        }
      }

      // Try to find JSON object in the response
      try {
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = response.substring(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr);
        }
      } catch (e3) {
        logger.warn('Failed to extract JSON object from response');
      }

      logger.warn('AI response is not valid JSON, returning raw content');
      return {
        raw_response: response,
        goal: 'Unable to parse structured response. See raw_response.',
        steps: [],
      };
    }
  }

  /**
   * Get information about current provider
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
    };
  }
}

module.exports = new AIClient();
