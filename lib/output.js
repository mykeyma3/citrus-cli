'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { colors, indicators, logoCompact } = require('./brand');

/**
 * Output formatting utilities for the Citrus CLI.
 *
 * Supports three modes:
 *   - Normal: Pretty, human-readable tables and messages
 *   - JSON:   Raw JSON for piping to jq, scripts, or LLMs
 *   - Quiet:  Minimal output (IDs only, no decoration)
 */

let _jsonMode = false;
let _quietMode = false;

const output = {
  /** Configure output mode from global CLI flags */
  configure(opts = {}) {
    _jsonMode = !!opts.json;
    _quietMode = !!opts.quiet;
  },

  get isJson() { return _jsonMode; },
  get isQuiet() { return _quietMode; },

  // ─── Primitives ──────────────────────────────────────────────

  /** Print a line */
  log(msg = '') {
    if (!_quietMode) console.log(msg);
  },

  /** Print success message */
  success(msg) {
    if (_jsonMode) return;
    if (!_quietMode) console.log(indicators.success + ' ' + msg);
  },

  /** Print warning message */
  warn(msg) {
    if (_jsonMode) return;
    console.log(indicators.warn + ' ' + msg);
  },

  /** Print error message */
  error(msg) {
    if (_jsonMode) {
      console.error(JSON.stringify({ error: msg }));
    } else {
      console.error(indicators.error + ' ' + msg);
    }
  },

  /** Print info message */
  info(msg) {
    if (_jsonMode) return;
    if (!_quietMode) console.log(indicators.info + ' ' + msg);
  },

  /** Print a heading */
  heading(msg) {
    if (_jsonMode || _quietMode) return;
    console.log('\n' + colors.orange.bold('◆ ') + chalk.bold(msg));
  },

  /** Print a dim/subtle line */
  dim(msg) {
    if (_jsonMode || _quietMode) return;
    console.log(colors.muted(msg));
  },

  // ─── Structured Output ──────────────────────────────────────

  /** Output JSON data */
  json(data) {
    console.log(JSON.stringify(data, null, 2));
  },

  /**
   * Output data as a table or JSON depending on mode.
   * @param {object[]} rows - Array of objects
   * @param {object[]} columns - Array of { key, label, width?, transform? }
   * @param {object} opts - { title?, emptyMessage? }
   */
  table(rows, columns, opts = {}) {
    if (_jsonMode) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    if (_quietMode) {
      // In quiet mode, just output the first column value per row
      rows.forEach(r => console.log(r[columns[0].key]));
      return;
    }

    if (opts.title) {
      console.log('\n' + colors.orange.bold('◆ ') + chalk.bold(opts.title));
    }

    if (!rows || rows.length === 0) {
      console.log(colors.muted(opts.emptyMessage || 'No results.'));
      return;
    }

    const table = new Table({
      head: columns.map(c => colors.amber(c.label)),
      colWidths: columns.map(c => c.width || null).some(w => w) 
        ? columns.map(c => c.width || undefined)
        : undefined,
      style: { head: [], border: ['dim'] },
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      },
      wordWrap: true
    });

    rows.forEach(row => {
      table.push(columns.map(c => {
        let val = row[c.key];
        if (val === null || val === undefined) val = '';
        if (c.transform) val = c.transform(val, row);
        return String(val);
      }));
    });

    console.log(table.toString());
  },

  /**
   * Output a single record as key-value pairs.
   * @param {object} record - The data object
   * @param {object[]} fields - Array of { key, label, transform? }
   * @param {object} opts - { title? }
   */
  record(record, fields, opts = {}) {
    if (_jsonMode) {
      console.log(JSON.stringify(record, null, 2));
      return;
    }

    if (_quietMode) {
      // In quiet mode, output just the id if present
      if (record.id) console.log(record.id);
      return;
    }

    if (opts.title) {
      console.log('\n' + colors.orange.bold('◆ ') + chalk.bold(opts.title));
    }

    const maxLabel = Math.max(...fields.map(f => f.label.length));
    fields.forEach(f => {
      let val = record[f.key];
      if (val === null || val === undefined) val = colors.muted('—');
      if (f.transform) val = f.transform(val, record);
      const label = f.label.padEnd(maxLabel + 1);
      console.log(`  ${colors.amber(label)} ${val}`);
    });
    console.log();
  },

  // ─── Helpers ────────────────────────────────────────────────

  /** Format a date string for display */
  date(str) {
    if (!str) return colors.muted('—');
    const d = new Date(str);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  },

  /** Format a boolean */
  bool(val) {
    return val ? colors.green('Yes') : colors.muted('No');
  },

  /** Format a status with color */
  status(val) {
    const s = String(val || '').toLowerCase();
    if (s === 'active' || s === 'running' || s === 'published' || s === 'approved') return colors.green(val);
    if (s === 'stopped' || s === 'suspended' || s === 'draft') return colors.amber(val);
    if (s === 'error' || s === 'failed' || s === 'rejected') return chalk.red(val);
    return val;
  },

  /** Truncate long strings */
  truncate(str, max = 40) {
    if (!str) return '';
    str = String(str);
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }
};

module.exports = output;
