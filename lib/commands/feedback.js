'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, listOpts, qs } = require('../middleware');

/**
 * Feedback commands — report bugs, suggest features, track submissions.
 *
 * Commands:
 *   citrus feedback bug                  — Report a bug
 *   citrus feedback suggest              — Submit a suggestion or feature request
 *   citrus feedback list                 — List your submitted feedback
 *   citrus feedback get <id>             — Get details on a feedback item
 *
 * Examples:
 *   $ citrus feedback bug --title "Flow deploy fails on empty nodes" --body "Steps to reproduce..."
 *   $ citrus feedback suggest --title "Add dark mode to app builder"
 *   $ citrus feedback list --status open
 *   $ citrus feedback list --type bug --json
 */
module.exports = function (program) {
  const fb = program
    .command('feedback')
    .alias('fb')
    .description('Report bugs, suggest features, and track your submissions');

  // ─── Report a Bug ─────────────────────────────────────────────
  fb.command('bug')
    .description('Report a bug')
    .requiredOption('-t, --title <title>', 'Short description of the bug')
    .option('-b, --body <body>', 'Detailed description, steps to reproduce, expected vs actual')
    .option('-p, --priority <priority>', 'Priority: low, normal, high, critical', 'normal')
    .addHelpText('after', `
Examples:
  $ citrus feedback bug -t "Flow deploy fails on empty nodes"
  $ citrus feedback bug -t "Login timeout" -b "After 5 minutes idle, login fails silently" -p high
  $ citrus fb bug -t "Dashboard chart missing data" --json
`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const payload = {
        type: 'bug',
        title: opts.title,
        body: opts.body || null,
        priority: opts.priority,
        source: 'cli',
        metadata: { cli_version: require('../../package.json').version }
      };
      const data = await client.post('/api/feedback', payload);
      const fb = data.feedback || data;
      output.success(`Bug report submitted (ID: ${fb.id})`);
      output.info(`Status: ${fb.status} | Priority: ${fb.priority}`);
      if (output.isJson) output.json(fb);
    }));

  // ─── Suggest a Feature ────────────────────────────────────────
  fb.command('suggest')
    .alias('feature')
    .description('Submit a suggestion or feature request')
    .requiredOption('-t, --title <title>', 'Short description of your suggestion')
    .option('-b, --body <body>', 'More details about the feature you want')
    .option('-p, --priority <priority>', 'Priority: low, normal, high', 'normal')
    .addHelpText('after', `
Examples:
  $ citrus feedback suggest -t "Add dark mode to app builder"
  $ citrus fb suggest -t "Webhook retry config" -b "Would be great to configure retry count per webhook"
  $ citrus fb feature -t "Export flows as YAML" --json
`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const payload = {
        type: 'suggestion',
        title: opts.title,
        body: opts.body || null,
        priority: opts.priority,
        source: 'cli',
        metadata: { cli_version: require('../../package.json').version }
      };
      const data = await client.post('/api/feedback', payload);
      const fb = data.feedback || data;
      output.success(`Suggestion submitted (ID: ${fb.id})`);
      output.info(`We appreciate your feedback!`);
      if (output.isJson) output.json(fb);
    }));

  // ─── List Your Feedback ───────────────────────────────────────
  fb.command('list')
    .alias('ls')
    .description('List your submitted feedback')
    .option('--type <type>', 'Filter by type: bug, suggestion, feature, question')
    .option('--status <status>', 'Filter by status: open, in-progress, resolved, closed')
    .option('-l, --limit <n>', 'Max results', '25')
    .option('-o, --offset <n>', 'Offset for pagination', '0')
    .addHelpText('after', `
Examples:
  $ citrus feedback list
  $ citrus fb ls --type bug
  $ citrus fb ls --status open --json
`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const params = {};
      if (opts.type) params.type = opts.type;
      if (opts.status) params.status = opts.status;
      params.limit = opts.limit;
      params.offset = opts.offset;

      const data = await client.get(`/api/feedback${qs(params)}`);
      const rows = data.feedback || [];

      if (output.isQuiet) {
        rows.forEach(r => console.log(r.id));
        return;
      }

      output.table(rows, [
        { key: 'id', label: 'ID', width: 8, transform: v => v.slice(0, 8) },
        { key: 'type', label: 'Type', width: 12, transform: v => {
          const icons = { bug: '🐛 bug', suggestion: '💡 suggest', feature: '✨ feature', question: '❓ question' };
          return icons[v] || v;
        }},
        { key: 'title', label: 'Title', width: 35 },
        { key: 'status', label: 'Status', width: 14, transform: v => output.status(v) },
        { key: 'priority', label: 'Priority', width: 10 },
        { key: 'created_at', label: 'Created', width: 12, transform: v => output.date(v) }
      ], { title: `Your Feedback (${data.total || rows.length} total)` });
    }));

  // ─── Get Feedback Details ─────────────────────────────────────
  fb.command('get <id>')
    .description('Get details on a feedback item')
    .addHelpText('after', `
Examples:
  $ citrus feedback get abc12345
  $ citrus fb get abc12345 --json
`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/feedback/${id}`);
      const item = data.feedback || data;

      if (output.isJson) {
        output.json(item);
        return;
      }

      const typeIcons = { bug: '🐛', suggestion: '💡', feature: '✨', question: '❓' };
      const icon = typeIcons[item.type] || '📝';

      output.log('');
      output.log(`  ${icon} ${output.bold(item.title)}`);
      output.log(`  ${'─'.repeat(50)}`);
      output.log(`  Type:      ${item.type}`);
      output.log(`  Status:    ${output.status(item.status)}`);
      output.log(`  Priority:  ${item.priority}`);
      output.log(`  Source:    ${item.source}`);
      output.log(`  Created:   ${output.date(item.created_at)}`);
      if (item.body) {
        output.log('');
        output.log(`  ${item.body}`);
      }
      if (item.admin_notes) {
        output.log('');
        output.log(`  📋 Admin Notes: ${item.admin_notes}`);
      }
      output.log('');
    }));
};
