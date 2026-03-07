'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Workspace management commands.
 *
 * Commands:
 *   citrus workspaces list            — List all workspaces
 *   citrus workspaces get <id>        — Get workspace details
 *   citrus workspaces create          — Create a new workspace
 *   citrus workspaces update <id>     — Update a workspace
 *   citrus workspaces delete <id>     — Delete a workspace
 *
 * Examples:
 *   $ citrus workspaces list
 *   $ citrus workspaces list --json
 *   $ citrus workspaces get 5
 *   $ citrus workspaces create --name "Production Monitoring" --description "Main ops"
 *   $ citrus workspaces update 5 --name "Renamed"
 *   $ citrus workspaces delete 5
 */
module.exports = function (program) {
  const ws = program
    .command('workspaces')
    .alias('ws')
    .description('Manage workspaces');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 28 },
    { key: 'description', label: 'Description', width: 30, transform: v => output.truncate(v, 28) },
    { key: 'flow_count', label: 'Flows', width: 8 },
    { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
  ];

  const FIELDS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'flow_count', label: 'Flows' },
    { key: 'deployment_count', label: 'Deployments' },
    { key: 'member_count', label: 'Members' },
    { key: 'active_deployments', label: 'Active Deployments' },
    { key: 'schedule_count', label: 'Schedules' },
    { key: 'integration_count', label: 'Integrations' },
    { key: 'created_at', label: 'Created', transform: v => output.date(v) },
    { key: 'updated_at', label: 'Updated', transform: v => output.date(v) }
  ];

  // ─── List ───────────────────────────────────────────────────
  ws
    .command('list')
    .alias('ls')
    .description('List all workspaces')
    .addHelpText('after', `
Examples:
  $ citrus workspaces list
  $ citrus ws ls --json
  $ citrus ws ls --quiet          # IDs only`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/workspaces');
      const rows = Array.isArray(data) ? data : data.workspaces || [];
      output.table(rows, COLS, { title: 'Workspaces', emptyMessage: 'No workspaces found.' });
    }));

  // ─── Get ────────────────────────────────────────────────────
  ws
    .command('get <id>')
    .description('Get workspace details')
    .addHelpText('after', `
Examples:
  $ citrus workspaces get 5
  $ citrus ws get 5 --json`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/workspaces/${id}`);
      const record = data.workspace || data;
      output.record(record, FIELDS, { title: `Workspace #${id}` });
    }));

  // ─── Create ─────────────────────────────────────────────────
  ws
    .command('create')
    .description('Create a new workspace')
    .requiredOption('-n, --name <name>', 'Workspace name')
    .option('-d, --description <desc>', 'Workspace description')
    .addHelpText('after', `
Examples:
  $ citrus workspaces create --name "Prod Monitoring"
  $ citrus ws create -n "Dev" -d "Development workspace"
  $ citrus ws create -n "Staging" --json       # Returns created workspace as JSON`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name };
      if (opts.description) body.description = opts.description;
      const data = await client.post('/api/workspaces', body);
      const record = data.workspace || data;
      output.success(`Created workspace "${record.name}" (ID: ${record.id})`);
      if (output.isJson) output.json(record);
    }));

  // ─── Update ─────────────────────────────────────────────────
  ws
    .command('update <id>')
    .description('Update a workspace')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .addHelpText('after', `
Examples:
  $ citrus workspaces update 5 --name "New Name"
  $ citrus ws update 5 -d "Updated description"`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      const data = await client.put(`/api/workspaces/${id}`, body);
      const record = data.workspace || data;
      output.success(`Updated workspace #${id}`);
      if (output.isJson) output.json(record);
    }));

  // ─── Delete ─────────────────────────────────────────────────
  ws
    .command('delete <id>')
    .description('Delete a workspace')
    .option('-f, --force', 'Skip confirmation prompt')
    .addHelpText('after', `
Examples:
  $ citrus workspaces delete 5
  $ citrus ws delete 5 --force`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
          { type: 'confirm', name: 'confirm', message: `Delete workspace #${id}? This cannot be undone.`, default: false }
        ]);
        if (!confirm) { output.info('Cancelled.'); return; }
      }
      await client.del(`/api/workspaces/${id}`);
      output.success(`Deleted workspace #${id}`);
    }));
};
