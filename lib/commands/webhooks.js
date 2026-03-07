'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Webhook management commands.
 *
 * Commands:
 *   citrus webhooks list <workspaceId>               — List webhooks
 *   citrus webhooks get <workspaceId> <id>           — Get webhook details
 *   citrus webhooks create <workspaceId>             — Create a webhook
 *   citrus webhooks update <workspaceId> <id>        — Update a webhook
 *   citrus webhooks delete <workspaceId> <id>        — Delete a webhook
 *   citrus webhooks regenerate <workspaceId> <id>    — Regenerate webhook secret
 *
 * Examples:
 *   $ citrus webhooks list 3
 *   $ citrus webhooks create 3 --name "Deploy Hook" --url "https://..."
 */
module.exports = function (program) {
  const wh = program
    .command('webhooks')
    .alias('wh')
    .description('Manage webhooks');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'slug', label: 'Slug', width: 20 },
    { key: 'active', label: 'Active', width: 8, transform: v => output.bool(v) },
    { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
  ];

  wh.command('list <workspaceId>').alias('ls').description('List webhooks')
    .addHelpText('after', '\nExamples:\n  $ citrus webhooks list 3\n  $ citrus wh ls 3 --json')
    .action(withErrors(async (wsId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/webhooks/${wsId}`);
      const rows = Array.isArray(data) ? data : data.webhooks || [];
      output.table(rows, COLS, { title: `Webhooks (Workspace #${wsId})` });
    }));

  wh.command('get <workspaceId> <id>').description('Get webhook details')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/webhooks/${wsId}/${id}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  wh.command('create <workspaceId>').description('Create a webhook')
    .requiredOption('-n, --name <name>', 'Webhook name')
    .option('-u, --url <url>', 'Callback URL')
    .option('--events <events>', 'Comma-separated event types')
    .addHelpText('after', '\nExamples:\n  $ citrus webhooks create 3 -n "Deploy Hook" -u "https://..."')
    .action(withErrors(async (wsId, opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name };
      if (opts.url) body.url = opts.url;
      if (opts.events) body.events = opts.events.split(',');
      const data = await client.post(`/api/webhooks/${wsId}`, body);
      const r = data.webhook || data;
      output.success(`Created webhook "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  wh.command('update <workspaceId> <id>').description('Update a webhook')
    .option('-n, --name <name>', 'New name')
    .option('-u, --url <url>', 'New callback URL')
    .option('--events <events>', 'Comma-separated event types')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.url) body.url = opts.url;
      if (opts.events) body.events = opts.events.split(',');
      await client.put(`/api/webhooks/${wsId}/${id}`, body);
      output.success(`Updated webhook #${id}`);
    }));

  wh.command('delete <workspaceId> <id>').description('Delete a webhook')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete webhook #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/webhooks/${wsId}/${id}`);
      output.success(`Deleted webhook #${id}`);
    }));

  wh.command('regenerate <workspaceId> <id>').description('Regenerate webhook secret')
    .addHelpText('after', '\nExamples:\n  $ citrus webhooks regenerate 3 7')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/webhooks/${wsId}/${id}/regenerate`);
      output.success(`Regenerated secret for webhook #${id}`);
      if (output.isJson) output.json(data);
    }));
};
