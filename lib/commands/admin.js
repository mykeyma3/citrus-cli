'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Admin commands (user management, audit log, invitations).
 *
 * Commands:
 *   citrus admin users list                — List all users
 *   citrus admin users approve <id>        — Approve a user
 *   citrus admin users suspend <id>        — Suspend a user
 *   citrus admin users role <id>           — Change user role
 *   citrus admin users delete <id>         — Delete a user
 *   citrus admin invite                    — Invite a user by email
 *   citrus admin audit                     — View audit log
 *   citrus admin audit export              — Export audit log as CSV
 *   citrus admin import preview            — Preview a user import
 *   citrus admin import run                — Run user import
 *   citrus admin import history            — View import history
 *
 * Examples:
 *   $ citrus admin users list
 *   $ citrus admin users approve 5
 *   $ citrus admin invite --email user@example.com
 *   $ citrus admin audit --json
 *   $ citrus admin audit export --output audit.csv
 */
module.exports = function (program) {
  const admin = program
    .command('admin')
    .description('Admin operations (users, audit, import)');

  // ─── Users ──────────────────────────────────────────────────
  const users = admin.command('users').description('Manage platform users');

  users.command('list').alias('ls').description('List all users')
    .addHelpText('after', '\nExamples:\n  $ citrus admin users list\n  $ citrus admin users ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/auth/admin/users');
      const rows = Array.isArray(data) ? data : data.users || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'email', label: 'Email', width: 28 },
        { key: 'name', label: 'Name', width: 20 },
        { key: 'role', label: 'Role', width: 10 },
        { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: 'Users' });
    }));

  users.command('approve <id>').description('Approve a pending user')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/auth/admin/users/${id}/approve`);
      output.success(`Approved user #${id}`);
    }));

  users.command('suspend <id>').description('Suspend a user')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/auth/admin/users/${id}/suspend`);
      output.success(`Suspended user #${id}`);
    }));

  users.command('role <id>').description('Change user role')
    .requiredOption('-r, --role <role>', 'New role (admin, member, viewer)')
    .addHelpText('after', '\nExamples:\n  $ citrus admin users role 5 --role admin')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/auth/admin/users/${id}/role`, { role: opts.role });
      output.success(`Changed user #${id} role to "${opts.role}"`);
    }));

  users.command('delete <id>').description('Delete a user')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Permanently delete user #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/auth/admin/users/${id}`);
      output.success(`Deleted user #${id}`);
    }));

  // ─── Invite ─────────────────────────────────────────────────
  admin.command('invite').description('Invite a user by email')
    .requiredOption('-e, --email <email>', 'Email to invite')
    .option('-r, --role <role>', 'Role for invited user', 'member')
    .addHelpText('after', '\nExamples:\n  $ citrus admin invite -e user@co.com\n  $ citrus admin invite -e user@co.com -r admin')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.post('/api/auth/admin/invite', { email: opts.email, role: opts.role });
      output.success(`Invited ${opts.email} as ${opts.role}`);
      if (output.isJson) output.json(data);
    }));

  // ─── Audit Log ──────────────────────────────────────────────
  const audit = admin.command('audit').description('View audit/activity log');

  audit.command('list').alias('ls').description('List audit log entries')
    .option('-l, --limit <n>', 'Number of entries', '50')
    .option('--action <action>', 'Filter by action type')
    .option('--user <userId>', 'Filter by user ID')
    .addHelpText('after', '\nExamples:\n  $ citrus admin audit list\n  $ citrus admin audit ls --limit 100 --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const params = { limit: opts.limit };
      if (opts.action) params.action = opts.action;
      if (opts.user) params.user_id = opts.user;
      const data = await client.get(`/api/activity${qs(params)}`);
      const rows = Array.isArray(data) ? data : data.activities || data.activity || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'action', label: 'Action', width: 22 },
        { key: 'entity_type', label: 'Entity', width: 15 },
        { key: 'user_name', label: 'User', width: 22 },
        { key: 'created_at', label: 'Time', width: 22, transform: v => output.date(v) }
      ], { title: 'Audit Log' });
    }));

  audit.command('export').description('Export audit log as CSV')
    .option('-o, --output <path>', 'Output file path', 'audit.csv')
    .addHelpText('after', '\nExamples:\n  $ citrus admin audit export\n  $ citrus admin audit export -o my-audit.csv')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/activity/export', { raw: true });
      const fs = require('fs');
      fs.writeFileSync(opts.output, data.body);
      output.success(`Exported audit log to ${opts.output}`);
    }));

  // ─── Import ─────────────────────────────────────────────────
  const imp = admin.command('import').description('User import operations');

  imp.command('preview <file>').description('Preview a user import from CSV')
    .addHelpText('after', '\nExamples:\n  $ citrus admin import preview users.csv')
    .action(withErrors(async (file, opts, cmd) => {
      await setup(cmd);
      const data = await client.upload('/api/import/users/preview', 'file', file);
      console.log(JSON.stringify(data, null, 2));
    }));

  imp.command('run <file>').description('Run a user import from CSV')
    .addHelpText('after', '\nExamples:\n  $ citrus admin import run users.csv')
    .action(withErrors(async (file, opts, cmd) => {
      await setup(cmd);
      const data = await client.upload('/api/import/users', 'file', file);
      output.success('Import completed');
      if (output.isJson) output.json(data);
    }));

  imp.command('history').description('View import history')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/import/history');
      const rows = Array.isArray(data) ? data : data.imports || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'type', label: 'Type', width: 12 },
        { key: 'total', label: 'Total', width: 8 },
        { key: 'imported', label: 'Imported', width: 10 },
        { key: 'created_at', label: 'Date', width: 22, transform: v => output.date(v) }
      ], { title: 'Import History' });
    }));
};
