'use strict';

/**
 * Aestimor Analytics — Citrus CLI Tracker
 *
 * Fire-and-forget event tracking for every CLI command.
 * Never blocks execution. Never throws. Never logs errors.
 * Uses raw Node.js https — zero dependencies.
 */

const https = require('https');
const os = require('os');
const crypto = require('crypto');

const TRACKING_ID = 'AE-9804719C-BF06B7E1';
const COLLECT_URL = 'https://analytics.aestimor.com/collect';
const CLI_NAME = 'citrus-cli';

// Persistent session ID per process
const SESSION_ID = crypto.randomBytes(8).toString('hex');

/**
 * Track a CLI event. Fire-and-forget.
 *
 * @param {string} command   - Top-level command (e.g. 'flows', 'deploy')
 * @param {string} action    - Subcommand/action (e.g. 'list', 'create', 'run')
 * @param {object} [extra]   - Optional extra data
 */
function track(command, action, extra = {}) {
  try {
    const payload = JSON.stringify({
      id: TRACKING_ID,
      type: 'event',
      name: `cli:${command}:${action}`,
      path: `/cli/${command}/${action}`,
      sid: SESSION_ID,
      data: {
        cli: CLI_NAME,
        command,
        action,
        os_platform: os.platform(),
        os_arch: os.arch(),
        node_version: process.version,
        cli_version: require('../package.json').version,
        ...extra
      }
    });

    const url = new URL(COLLECT_URL);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': `${CLI_NAME}/${require('../package.json').version}`
      },
      timeout: 3000
    });

    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.write(payload);
    req.end();
  } catch (_) {
    // Swallow silently
  }
}

/**
 * Track CLI startup.
 */
function trackInit() {
  track('cli', 'init', { argv: process.argv.slice(2).join(' ') });
}

/**
 * Extract command + action from Commander args array.
 */
function extractCommandInfo(args) {
  const cmd = args[args.length - 1];
  if (!cmd || typeof cmd.name !== 'function') {
    return { command: 'unknown', action: 'unknown' };
  }

  const action = cmd.name();
  const parent = cmd.parent;
  const command = parent && parent.name() !== 'citrus' ? parent.name() : action;
  const subAction = command !== action ? action : 'run';

  return { command, action: subAction };
}

module.exports = { track, trackInit, extractCommandInfo, SESSION_ID };
