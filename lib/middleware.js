'use strict';

const client = require('./client');
const config = require('./config');
const output = require('./output');

/**
 * Shared middleware for all commands.
 * Call this at the start of every command action to:
 *   1. Configure output mode (json/quiet)
 *   2. Initialize the HTTP client with auth + base URL
 *   3. Verify authentication (unless skip is true)
 */
async function setup(cmd, { requireAuth = true } = {}) {
  // Walk up to root program to get global options
  let root = cmd;
  while (root.parent) root = root.parent;
  const globals = root.opts();

  // Configure output
  output.configure({ json: globals.json, quiet: globals.quiet });

  // Init client
  client.init({
    baseUrl: globals.baseUrl,
    profile: globals.profile
  });

  // Check auth
  if (requireAuth) {
    const token = config.getToken(globals.profile || config.activeProfile);
    if (!token) {
      output.error('Not authenticated. Run `citrus login` first.');
      process.exit(1);
    }
  }
}

/**
 * Wraps a command action with error handling.
 * Usage: .action(withErrors(async (args, opts, cmd) => { ... }))
 */
function withErrors(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      if (err.status) {
        output.error(`API Error (${err.status}): ${err.message}`);
      } else {
        output.error(err.message);
      }
      process.exit(1);
    }
  };
}

/**
 * Parse common list options from a command.
 */
function listOpts(opts) {
  const q = {};
  if (opts.limit) q.limit = opts.limit;
  if (opts.offset) q.offset = opts.offset;
  if (opts.search) q.search = opts.search;
  if (opts.sort) q.sort = opts.sort;
  if (opts.order) q.order = opts.order;
  return q;
}

/**
 * Build a query string from an object.
 */
function qs(params) {
  const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

module.exports = { setup, withErrors, listOpts, qs };
