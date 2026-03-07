'use strict';

/**
 * Citrus CLI — Core Library
 *
 * Re-exports all internal modules for programmatic use.
 * LLMs and scripts can `require('@nichecitrus/cli')` to access:
 *   - client: HTTP client for Citrus API
 *   - config: Config/auth management
 *   - output: Formatting utilities
 *   - brand:  Colors, logo, styling
 */

const client = require('./client');
const config = require('./config');
const output = require('./output');
const brand = require('./brand');

module.exports = { client, config, output, brand };
