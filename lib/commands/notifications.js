'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Notification commands.
 *
 * Commands:
 *   citrus notifications list          — List notifications
 *   citrus notifications count         — Get unread count
 *   citrus notifications read <id>     — Mark one as read
 *   citrus notifications read-all      — Mark all as read
 *   citrus notifications delete <id>   — Delete a notification
 *   citrus notifications clear         — Clear all notifications
 *   citrus notifications prefs         — View notification preferences
 *   citrus notifications prefs set     — Update notification preferences
 *
 * Examples:
 *   $ citrus notifications list
 *   $ citrus notifications count
 *   $ citrus notifications read-all
 *   $ citrus notifications prefs --json
 */
module.exports = function (program) {
  const notif = program
    .command('notifications')
    .alias('notif')
    .description('Manage notifications');

  notif.command('list').alias('ls').description('List notifications')
    .option('-f, --filter <filter>', 'Filter: all, unread, read')
    .option('-t, --type <type>', 'Filter by notification type')
    .option('-l, --limit <n>', 'Number of notifications')
    .addHelpText('after', '\nExamples:\n  $ citrus notifications list\n  $ citrus notif ls --filter unread --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const params = {};
      if (opts.filter) params.filter = opts.filter;
      if (opts.type) params.type = opts.type;
      if (opts.limit) params.limit = opts.limit;
      const data = await client.get(`/api/notifications${qs(params)}`);
      const rows = Array.isArray(data) ? data : data.notifications || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'type', label: 'Type', width: 15 },
        { key: 'title', label: 'Title', width: 25 },
        { key: 'read', label: 'Read', width: 6, transform: v => output.bool(v) },
        { key: 'created_at', label: 'Time', width: 22, transform: v => output.date(v) }
      ], { title: 'Notifications' });
    }));

  notif.command('count').description('Get unread notification count')
    .addHelpText('after', '\nExamples:\n  $ citrus notifications count\n  $ citrus notif count --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/notifications/count');
      if (output.isJson) {
        output.json(data);
      } else {
        const count = data.count || data.unread || 0;
        output.log(`${count} unread notification${count !== 1 ? 's' : ''}`);
      }
    }));

  notif.command('read <id>').description('Mark a notification as read')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/notifications/${id}/read`);
      output.success(`Marked notification #${id} as read`);
    }));

  notif.command('read-all').description('Mark all notifications as read')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      await client.post('/api/notifications/read-all');
      output.success('Marked all notifications as read');
    }));

  notif.command('delete <id>').description('Delete a notification')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/notifications/${id}`);
      output.success(`Deleted notification #${id}`);
    }));

  notif.command('clear').description('Clear all notifications')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: 'Clear all notifications?', default: false }
        ]);
        if (!confirm) return;
      }
      await client.del('/api/notifications');
      output.success('Cleared all notifications');
    }));

  // ─── Preferences ────────────────────────────────────────────
  const prefs = notif.command('prefs').description('Notification preferences');

  prefs.command('get').description('View notification preferences')
    .addHelpText('after', '\nExamples:\n  $ citrus notifications prefs get --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/notifications/preferences');
      console.log(JSON.stringify(data, null, 2));
    }));

  prefs.command('set').description('Update notification preferences')
    .requiredOption('-d, --data <json>', 'Preferences as JSON')
    .addHelpText('after', `
Examples:
  $ citrus notif prefs set -d '{"email_deployments":true,"email_alerts":false}'`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = JSON.parse(opts.data);
      await client.put('/api/notifications/preferences', body);
      output.success('Updated notification preferences');
    }));
};
