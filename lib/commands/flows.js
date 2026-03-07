'use strict';

const fs = require('fs');
const path = require('path');
const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Flow management commands.
 *
 * Commands:
 *   citrus flows list                      — List flows (optionally by workspace)
 *   citrus flows get <id>                  — Get flow details
 *   citrus flows create                    — Create a new flow
 *   citrus flows update <id>               — Update a flow
 *   citrus flows delete <id>               — Delete a flow
 *   citrus flows deploy <id>               — Deploy a flow
 *   citrus flows export <id>               — Export flow as JSON file
 *   citrus flows import <file>             — Import a flow from JSON file
 *   citrus flows code get <flowId>         — Get flow code/definition
 *   citrus flows code set <flowId> <file>  — Set flow code from file
 *   citrus flows versions list <flowId>    — List flow versions
 *   citrus flows versions get <flowId> <versionId>  — Get a version
 *   citrus flows versions create <flowId>  — Create a version snapshot
 *   citrus flows versions rollback <flowId> <versionId> — Rollback
 *   citrus flows versions diff <flowId> <v1> <v2>   — Diff two versions
 *
 * Examples:
 *   $ citrus flows list
 *   $ citrus flows list --workspace 3
 *   $ citrus flows create --name "ETL Pipeline" --workspace 3
 *   $ citrus flows deploy 12
 *   $ citrus flows export 12 --output flow.json
 *   $ citrus flows import flow.json
 *   $ citrus flows code get 12 > flow-def.json
 *   $ citrus flows versions list 12
 */
module.exports = function (program) {
  const flows = program
    .command('flows')
    .description('Manage flows and flow versions');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 25 },
    { key: 'workspace_name', label: 'Workspace', width: 20 },
    { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
    { key: 'updated_at', label: 'Updated', width: 22, transform: v => output.date(v) }
  ];

  const FIELDS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'workspace_id', label: 'Workspace ID' },
    { key: 'workspace_name', label: 'Workspace' },
    { key: 'status', label: 'Status', transform: v => output.status(v) },
    { key: 'node_count', label: 'Nodes' },
    { key: 'created_at', label: 'Created', transform: v => output.date(v) },
    { key: 'updated_at', label: 'Updated', transform: v => output.date(v) }
  ];

  // ─── List ───────────────────────────────────────────────────
  flows
    .command('list')
    .alias('ls')
    .description('List flows')
    .option('-w, --workspace <id>', 'Filter by workspace ID')
    .addHelpText('after', `
Examples:
  $ citrus flows list
  $ citrus flows ls --workspace 3
  $ citrus flows ls --json`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      if (opts.workspace) {
        const data = await client.get(`/api/flows/workspace/${opts.workspace}`);
        const rows = Array.isArray(data) ? data : data.flows || [];
        output.table(rows, COLS, { title: 'Flows', emptyMessage: 'No flows found.' });
      } else {
        // No workspace specified — fetch all workspaces and aggregate flows
        const wsData = await client.get('/api/workspaces');
        const workspaces = wsData.workspaces || wsData || [];
        let allFlows = [];
        for (const ws of workspaces) {
          try {
            const data = await client.get(`/api/flows/workspace/${ws.id}`);
            const rows = (Array.isArray(data) ? data : data.flows || []).map(f => ({
              ...f,
              workspace_name: f.workspace_name || ws.name
            }));
            allFlows = allFlows.concat(rows);
          } catch (e) { /* skip inaccessible workspaces */ }
        }
        output.table(allFlows, COLS, { title: 'All Flows', emptyMessage: 'No flows found.' });
      }
    }));

  // ─── Get ────────────────────────────────────────────────────
  flows
    .command('get <id>')
    .description('Get flow details')
    .addHelpText('after', `
Examples:
  $ citrus flows get 12
  $ citrus flows get 12 --json`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/flows/${id}`);
      const record = data.flow || data;
      output.record(record, FIELDS, { title: `Flow #${id}` });
    }));

  // ─── Create ─────────────────────────────────────────────────
  flows
    .command('create')
    .description('Create a new flow')
    .requiredOption('-n, --name <name>', 'Flow name')
    .requiredOption('-w, --workspace <id>', 'Workspace ID')
    .option('-d, --description <desc>', 'Flow description')
    .option('--definition <json>', 'Flow definition as JSON string')
    .option('--from-file <path>', 'Flow definition from a JSON file')
    .addHelpText('after', `
Examples:
  $ citrus flows create -n "ETL Pipeline" -w 3
  $ citrus flows create -n "Monitor" -w 3 --from-file flow-def.json
  $ citrus flows create -n "Test" -w 1 --definition '{"nodes":[],"edges":[]}'`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name, workspace_id: opts.workspace };
      if (opts.description) body.description = opts.description;
      if (opts.fromFile) {
        const def = JSON.parse(fs.readFileSync(opts.fromFile, 'utf8'));
        // Spread nodes/edges/config directly into body (API reads them at top level)
        if (def.nodes !== undefined) body.nodes = def.nodes;
        if (def.edges !== undefined) body.edges = def.edges;
        if (def.config !== undefined) body.config = def.config;
        if (def.flow_type && !body.flow_type) body.flow_type = def.flow_type;
        if (def.description && !opts.description) body.description = def.description;
      } else if (opts.definition) {
        const def = JSON.parse(opts.definition);
        if (def.nodes !== undefined) body.nodes = def.nodes;
        if (def.edges !== undefined) body.edges = def.edges;
        if (def.config !== undefined) body.config = def.config;
        if (def.flow_type && !body.flow_type) body.flow_type = def.flow_type;
      }
      const data = await client.post('/api/flows', body);
      const record = data.flow || data;
      output.success(`Created flow "${record.name}" (ID: ${record.id})`);
      if (output.isJson) output.json(record);
    }));

  // ─── Update ─────────────────────────────────────────────────
  flows
    .command('update <id>')
    .description('Update a flow')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('--definition <json>', 'Updated definition as JSON string')
    .option('--from-file <path>', 'Updated definition from a JSON file')
    .addHelpText('after', `
Examples:
  $ citrus flows update 12 --name "Renamed Flow"
  $ citrus flows update 12 --from-file updated-def.json`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.fromFile) {
        const def = JSON.parse(fs.readFileSync(opts.fromFile, 'utf8'));
        // Spread nodes/edges/config directly into body (API reads them at top level)
        if (def.nodes !== undefined) body.nodes = def.nodes;
        if (def.edges !== undefined) body.edges = def.edges;
        if (def.config !== undefined) body.config = def.config;
        if (def.name && !opts.name) body.name = def.name;
        if (def.description && !opts.description) body.description = def.description;
      } else if (opts.definition) {
        const def = JSON.parse(opts.definition);
        if (def.nodes !== undefined) body.nodes = def.nodes;
        if (def.edges !== undefined) body.edges = def.edges;
        if (def.config !== undefined) body.config = def.config;
      }
      const data = await client.put(`/api/flows/${id}`, body);
      output.success(`Updated flow #${id}`);
      if (output.isJson) output.json(data.flow || data);
    }));

  // ─── Delete ─────────────────────────────────────────────────
  flows
    .command('delete <id>')
    .description('Delete a flow')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
          { type: 'confirm', name: 'confirm', message: `Delete flow #${id}?`, default: false }
        ]);
        if (!confirm) { output.info('Cancelled.'); return; }
      }
      await client.del(`/api/flows/${id}`);
      output.success(`Deleted flow #${id}`);
    }));

  // ─── Deploy ─────────────────────────────────────────────────
  flows
    .command('deploy <id>')
    .description('Deploy a flow')
    .addHelpText('after', `
Examples:
  $ citrus flows deploy 12
  $ citrus flows deploy 12 --json`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const ora = require('ora');
      const spinner = output.isJson || output.isQuiet ? null : ora('Deploying flow...').start();
      try {
        const data = await client.post(`/api/flows/${id}/deploy`);
        if (spinner) spinner.succeed('Flow deployed successfully');
        const dep = data.deployment || data;
        output.record(dep, [
          { key: 'id', label: 'Deployment ID' },
          { key: 'flow_id', label: 'Flow ID' },
          { key: 'status', label: 'Status', transform: v => output.status(v) },
          { key: 'created_at', label: 'Deployed At', transform: v => output.date(v) }
        ], { title: 'Deployment' });
      } catch (err) {
        if (spinner) spinner.fail('Deployment failed');
        throw err;
      }
    }));

  // ─── Export ─────────────────────────────────────────────────
  flows
    .command('export <id>')
    .description('Export flow as JSON')
    .option('-o, --output <path>', 'Output file path')
    .addHelpText('after', `
Examples:
  $ citrus flows export 12                    # Prints to stdout
  $ citrus flows export 12 -o flow.json       # Saves to file
  $ citrus flows export 12 --json | jq .      # Pipe to jq`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/flow-versions/${id}/export`);
      if (opts.output) {
        fs.writeFileSync(opts.output, JSON.stringify(data, null, 2));
        output.success(`Exported flow #${id} to ${opts.output}`);
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }));

  // ─── Import ─────────────────────────────────────────────────
  flows
    .command('import <file>')
    .description('Import a flow from JSON file')
    .addHelpText('after', `
Examples:
  $ citrus flows import flow.json
  $ citrus flows import ./exported-flow.json --json`)
    .action(withErrors(async (file, opts, cmd) => {
      await setup(cmd);
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      const data = await client.post('/api/flow-versions/import', content);
      const record = data.flow || data;
      output.success(`Imported flow "${record.name || 'flow'}" (ID: ${record.id || 'n/a'})`);
      if (output.isJson) output.json(record);
    }));

  // ─── Code subcommands ──────────────────────────────────────
  const code = flows
    .command('code')
    .description('Manage flow code/definition');

  code
    .command('get <flowId>')
    .description('Get flow code/definition')
    .option('-o, --output <path>', 'Save to file')
    .addHelpText('after', `
Examples:
  $ citrus flows code get 12                  # Print to stdout
  $ citrus flows code get 12 -o flow.json     # Save to file`)
    .action(withErrors(async (flowId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/code/${flowId}`);
      if (opts.output) {
        fs.writeFileSync(opts.output, JSON.stringify(data, null, 2));
        output.success(`Saved flow code to ${opts.output}`);
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }));

  code
    .command('set <flowId> <file>')
    .description('Update flow code from a file')
    .addHelpText('after', `
Examples:
  $ citrus flows code set 12 flow-def.json
  $ citrus flows code set 12 script.py

The file content is sent as-is to the API. For Python scripts, 
the file is read as plain text. For JSON, it is read as text too.`)
    .action(withErrors(async (flowId, file, opts, cmd) => {
      await setup(cmd);
      const content = fs.readFileSync(file, 'utf8');
      await client.put(`/api/code/${flowId}`, { content });
      output.success(`Updated flow #${flowId} code`);
    }));

  // ─── Versions subcommands ──────────────────────────────────
  const versions = flows
    .command('versions')
    .alias('ver')
    .description('Manage flow versions');

  versions
    .command('list <flowId>')
    .alias('ls')
    .description('List versions for a flow')
    .addHelpText('after', `
Examples:
  $ citrus flows versions list 12
  $ citrus flows ver ls 12 --json`)
    .action(withErrors(async (flowId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/flow-versions/${flowId}/versions`);
      const rows = Array.isArray(data) ? data : data.versions || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'version_number', label: 'Version', width: 10 },
        { key: 'label', label: 'Label', width: 25 },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: `Versions for Flow #${flowId}` });
    }));

  versions
    .command('get <flowId> <versionId>')
    .description('Get a specific version')
    .action(withErrors(async (flowId, versionId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/flow-versions/${flowId}/versions/${versionId}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  versions
    .command('create <flowId>')
    .description('Create a version snapshot')
    .option('-l, --label <label>', 'Version label')
    .addHelpText('after', `
Examples:
  $ citrus flows versions create 12 --label "v1.0 Release"`)
    .action(withErrors(async (flowId, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.label) body.label = opts.label;
      const data = await client.post(`/api/flow-versions/${flowId}/versions`, body);
      output.success(`Created version for flow #${flowId}`);
      if (output.isJson) output.json(data);
    }));

  versions
    .command('rollback <flowId> <versionId>')
    .description('Rollback a flow to a specific version')
    .action(withErrors(async (flowId, versionId, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/flow-versions/${flowId}/versions/${versionId}/rollback`);
      output.success(`Rolled back flow #${flowId} to version #${versionId}`);
      if (output.isJson) output.json(data);
    }));

  versions
    .command('diff <flowId> <v1> <v2>')
    .description('Diff two versions of a flow')
    .addHelpText('after', `
Examples:
  $ citrus flows versions diff 12 1 2`)
    .action(withErrors(async (flowId, v1, v2, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/flow-versions/${flowId}/versions/${v1}/diff/${v2}`);
      console.log(JSON.stringify(data, null, 2));
    }));
};
