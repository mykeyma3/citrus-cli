'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Schedule management commands.
 *
 * Commands:
 *   citrus schedules list <workspaceId>                  — List schedules
 *   citrus schedules get <workspaceId> <id>              — Get schedule details
 *   citrus schedules create <workspaceId>                — Create a schedule
 *   citrus schedules update <workspaceId> <id>           — Update a schedule
 *   citrus schedules delete <workspaceId> <id>           — Delete a schedule
 *   citrus schedules toggle <workspaceId> <id>           — Enable/disable
 *   citrus schedules run <workspaceId> <id>              — Trigger manual run
 *   citrus schedules runs <workspaceId> <id>             — List past runs
 *   citrus schedules presets                             — List cron presets
 *
 * Examples:
 *   $ citrus schedules list 3
 *   $ citrus schedules create 3 --name "Nightly Sync" --cron "0 2 * * *" --flow 12
 *   $ citrus schedules toggle 3 5
 *   $ citrus schedules run 3 5
 *   $ citrus schedules runs 3 5 --json
 */
module.exports = function (program) {
  const sched = program
    .command('schedules')
    .alias('sched')
    .description('Manage schedules');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'cron', label: 'Cron', width: 18 },
    { key: 'enabled', label: 'Enabled', width: 9, transform: v => output.bool(v) },
    { key: 'next_run', label: 'Next Run', width: 22, transform: v => output.date(v) }
  ];

  sched.command('presets').description('List available cron presets')
    .addHelpText('after', '\nExamples:\n  $ citrus schedules presets --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/schedules/presets');
      console.log(JSON.stringify(data, null, 2));
    }));

  sched.command('list').alias('ls').description('List schedules for a workspace')
    .option('-w, --workspace <id>', 'Workspace ID (lists all if omitted)')
    .addHelpText('after', '\nExamples:\n  $ citrus schedules list\n  $ citrus schedules list -w 3\n  $ citrus sched ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      if (opts.workspace) {
        const data = await client.get(`/api/schedules/${opts.workspace}`);
        const rows = Array.isArray(data) ? data : data.schedules || [];
        output.table(rows, COLS, { title: `Schedules (Workspace #${opts.workspace})`, emptyMessage: 'No schedules found.' });
      } else {
        // Fetch all workspaces and aggregate schedules
        const wsData = await client.get('/api/workspaces');
        const workspaces = wsData.workspaces || wsData || [];
        let allSchedules = [];
        for (const ws of workspaces) {
          try {
            const data = await client.get(`/api/schedules/${ws.id}`);
            const rows = Array.isArray(data) ? data : data.schedules || [];
            allSchedules = allSchedules.concat(rows);
          } catch (e) { /* skip */ }
        }
        output.table(allSchedules, COLS, { title: 'All Schedules', emptyMessage: 'No schedules found.' });
      }
    }));

  sched.command('get <workspaceId> <id>').description('Get schedule details')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/schedules/${wsId}/${id}`);
      output.record(data.schedule || data, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'cron', label: 'Cron' },
        { key: 'flow_id', label: 'Flow ID' },
        { key: 'enabled', label: 'Enabled', transform: v => output.bool(v) },
        { key: 'last_run', label: 'Last Run', transform: v => output.date(v) },
        { key: 'next_run', label: 'Next Run', transform: v => output.date(v) },
        { key: 'created_at', label: 'Created', transform: v => output.date(v) }
      ], { title: `Schedule #${id}` });
    }));

  sched.command('create <workspaceId>').description('Create a schedule')
    .requiredOption('-n, --name <name>', 'Schedule name')
    .requiredOption('--cron <expression>', 'Cron expression')
    .requiredOption('-f, --flow <flowId>', 'Flow ID to schedule')
    .option('--enabled', 'Enable immediately', true)
    .addHelpText('after', `
Examples:
  $ citrus schedules create 3 -n "Hourly Check" --cron "0 * * * *" -f 12`)
    .action(withErrors(async (wsId, opts, cmd) => {
      await setup(cmd);
      const body = {
        name: opts.name,
        cron: opts.cron,
        flow_id: opts.flow,
        enabled: opts.enabled !== false
      };
      const data = await client.post(`/api/schedules/${wsId}`, body);
      const r = data.schedule || data;
      output.success(`Created schedule "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  sched.command('update <workspaceId> <id>').description('Update a schedule')
    .option('-n, --name <name>', 'New name')
    .option('--cron <expression>', 'New cron expression')
    .option('-f, --flow <flowId>', 'New flow ID')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.cron) body.cron = opts.cron;
      if (opts.flow) body.flow_id = opts.flow;
      await client.put(`/api/schedules/${wsId}/${id}`, body);
      output.success(`Updated schedule #${id}`);
    }));

  sched.command('delete <workspaceId> <id>').description('Delete a schedule')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete schedule #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/schedules/${wsId}/${id}`);
      output.success(`Deleted schedule #${id}`);
    }));

  sched.command('toggle <workspaceId> <id>').description('Toggle schedule enabled/disabled')
    .addHelpText('after', '\nExamples:\n  $ citrus schedules toggle 3 5')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/schedules/${wsId}/${id}/toggle`);
      const r = data.schedule || data;
      output.success(`Schedule #${id} is now ${r.enabled ? 'enabled' : 'disabled'}`);
    }));

  sched.command('run <workspaceId> <id>').description('Trigger a manual run')
    .addHelpText('after', '\nExamples:\n  $ citrus schedules run 3 5')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/schedules/${wsId}/${id}/run`);
      output.success(`Triggered run for schedule #${id}`);
      if (output.isJson) output.json(data);
    }));

  sched.command('runs <workspaceId> <id>').description('List past runs')
    .addHelpText('after', '\nExamples:\n  $ citrus schedules runs 3 5 --json')
    .action(withErrors(async (wsId, id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/schedules/${wsId}/${id}/runs`);
      const rows = Array.isArray(data) ? data : data.runs || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
        { key: 'started_at', label: 'Started', width: 22, transform: v => output.date(v) },
        { key: 'finished_at', label: 'Finished', width: 22, transform: v => output.date(v) }
      ], { title: `Runs for Schedule #${id}` });
    }));
};
