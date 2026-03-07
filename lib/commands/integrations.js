'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Integration management commands.
 *
 * Commands:
 *   citrus integrations list          — List all integrations
 *   citrus integrations types         — List available integration types
 *   citrus integrations type <typeId> — Get integration type details
 *   citrus integrations nodes         — List builder integration nodes
 *   citrus integrations create        — Create an integration
 *   citrus integrations update <id>   — Update an integration
 *   citrus integrations delete <id>   — Delete an integration
 *   citrus integrations test          — Test an integration config
 *   citrus integrations exec <id>     — Execute an integration
 *
 * Examples:
 *   $ citrus integrations list
 *   $ citrus integrations types --json
 *   $ citrus integrations create --name "Slack" --type slack --config '{"webhook":"..."}'
 *   $ citrus integrations test --type slack --config '{"webhook":"..."}'
 */
module.exports = function (program) {
  const integ = program
    .command('integrations')
    .alias('int')
    .description('Manage integrations');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'type', label: 'Type', width: 15 },
    { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
    { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
  ];

  integ.command('list').alias('ls').description('List all integrations')
    .requiredOption('-w, --workspace <id>', 'Workspace ID')
    .addHelpText('after', '\nExamples:\n  $ citrus integrations list --workspace <id>\n  $ citrus int ls -w <id> --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/integrations?workspace_id=${opts.workspace}`);
      const rows = Array.isArray(data) ? data : data.integrations || [];
      output.table(rows, COLS, { title: 'Integrations', emptyMessage: 'No integrations found.' });
    }));

  integ.command('types').description('List available integration types')
    .addHelpText('after', '\nExamples:\n  $ citrus integrations types\n  $ citrus int types --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/integrations/types');
      const rows = Array.isArray(data) ? data : data.types || [];
      output.table(rows, [
        { key: 'id', label: 'Type ID', width: 18 },
        { key: 'name', label: 'Name', width: 22 },
        { key: 'description', label: 'Description', width: 40, transform: v => output.truncate(v, 38) }
      ], { title: 'Integration Types' });
    }));

  integ.command('type <typeId>').description('Get integration type details')
    .action(withErrors(async (typeId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/integrations/types/${typeId}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  integ.command('nodes').description('List builder integration nodes')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/integrations/builder-nodes');
      console.log(JSON.stringify(data, null, 2));
    }));

  integ.command('create').description('Create an integration')
    .requiredOption('-n, --name <name>', 'Integration name')
    .requiredOption('-t, --type <type>', 'Integration type ID')
    .option('-c, --config <json>', 'Configuration as JSON string')
    .option('-w, --workspace <id>', 'Workspace ID')
    .addHelpText('after', `
Examples:
  $ citrus integrations create -n "Slack Alerts" -t slack -c '{"webhook":"https://..."}'`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name, type: opts.type };
      if (opts.config) body.config = JSON.parse(opts.config);
      if (opts.workspace) body.workspace_id = opts.workspace;
      const data = await client.post('/api/integrations', body);
      const r = data.integration || data;
      output.success(`Created integration "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  integ.command('update <id>').description('Update an integration')
    .option('-n, --name <name>', 'New name')
    .option('-c, --config <json>', 'Updated config as JSON')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.config) body.config = JSON.parse(opts.config);
      await client.put(`/api/integrations/${id}`, body);
      output.success(`Updated integration #${id}`);
    }));

  integ.command('delete <id>').description('Delete an integration')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete integration #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/integrations/${id}`);
      output.success(`Deleted integration #${id}`);
    }));

  integ.command('test').description('Test an integration configuration')
    .requiredOption('-t, --type <type>', 'Integration type')
    .requiredOption('-c, --config <json>', 'Config to test as JSON')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.post('/api/integrations/test', {
        type: opts.type,
        config: JSON.parse(opts.config)
      });
      output.success('Integration test passed');
      if (output.isJson) output.json(data);
    }));

  integ.command('exec <id>').description('Execute an integration')
    .option('--data <json>', 'Execution data as JSON')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = opts.data ? JSON.parse(opts.data) : {};
      const data = await client.post(`/api/integrations/${id}/execute`, body);
      output.success(`Executed integration #${id}`);
      if (output.isJson) output.json(data);
    }));
};
