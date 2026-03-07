'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Secrets management commands.
 *
 * Commands:
 *   citrus secrets list <workspaceId>                 — List secrets (masked)
 *   citrus secrets reveal <workspaceId> <id>          — Reveal a secret value
 *   citrus secrets create <workspaceId>               — Create a secret
 *   citrus secrets update <workspaceId> <id>          — Update a secret
 *   citrus secrets delete <workspaceId> <id>          — Delete a secret
 *
 * Examples:
 *   $ citrus secrets list 3
 *   $ citrus secrets create 3 --key DB_PASSWORD --value "s3cret!"
 *   $ citrus secrets reveal 3 7
 */
module.exports = function (program) {
  const sec = program
    .command('secrets')
    .description('Manage workspace secrets');

  sec.command('list <workspaceId>').alias('ls').description('List secrets (values masked)')
    .addHelpText('after', '\nExamples:\n  $ citrus secrets list 3\n  $ citrus secrets ls 3 --json')
    .action(withErrors(async (wsId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/secrets/${wsId}`);
      const rows = Array.isArray(data) ? data : data.secrets || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'key', label: 'Key', width: 25 },
        { key: 'masked_value', label: 'Value', width: 20 },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: `Secrets (Workspace #${wsId})` });
    }));

  sec.command('reveal <workspaceId> <id>').description('Reveal a secret value')
    .addHelpText('after', '\nExamples:\n  $ citrus secrets reveal 3 7')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/secrets/${wsId}/${id}/reveal`);
      if (output.isJson) {
        output.json(data);
      } else {
        output.log(data.value || data.secret || JSON.stringify(data));
      }
    }));

  sec.command('create <workspaceId>').description('Create a secret')
    .requiredOption('-k, --key <key>', 'Secret key name')
    .requiredOption('--value <value>', 'Secret value')
    .addHelpText('after', '\nExamples:\n  $ citrus secrets create 3 -k API_TOKEN --value "abc123"')
    .action(withErrors(async (wsId, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/secrets/${wsId}`, { key: opts.key, value: opts.value });
      output.success(`Created secret "${opts.key}" in workspace #${wsId}`);
      if (output.isJson) output.json(data);
    }));

  sec.command('update <workspaceId> <id>').description('Update a secret')
    .option('-k, --key <key>', 'New key name')
    .option('--value <value>', 'New value')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.key) body.key = opts.key;
      if (opts.value) body.value = opts.value;
      await client.put(`/api/secrets/${wsId}/${id}`, body);
      output.success(`Updated secret #${id}`);
    }));

  sec.command('delete <workspaceId> <id>').description('Delete a secret')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete secret #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/secrets/${wsId}/${id}`);
      output.success(`Deleted secret #${id}`);
    }));
};
