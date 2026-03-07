'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Analytics commands.
 *
 * Commands:
 *   citrus analytics overview        — Platform overview stats
 *   citrus analytics activity        — Recent activity metrics
 *   citrus analytics deployments     — Deployment analytics
 *   citrus analytics workspaces      — Workspace analytics
 *   citrus analytics users           — User analytics
 *   citrus analytics schedules       — Schedule analytics
 *   citrus analytics growth          — Growth metrics over time
 *
 * Examples:
 *   $ citrus analytics overview
 *   $ citrus analytics overview --json
 *   $ citrus analytics deployments --json | jq '.total_deployments'
 *   $ citrus analytics growth --json
 */
module.exports = function (program) {
  const analytics = program
    .command('analytics')
    .alias('stats')
    .description('View platform analytics and metrics');

  analytics.command('overview').description('Platform overview statistics')
    .addHelpText('after', '\nExamples:\n  $ citrus analytics overview\n  $ citrus stats overview --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/overview');
      if (output.isJson) {
        output.json(data);
      } else {
        output.heading('Platform Overview');
        const d = data.overview || data;
        Object.entries(d).forEach(([k, v]) => {
          const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          output.log(`  ${label}: ${v}`);
        });
        output.log();
      }
    }));

  analytics.command('activity').description('Recent activity metrics')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/activity');
      if (output.isJson) { output.json(data); return; }
      output.heading('Activity Metrics');
      console.log(JSON.stringify(data, null, 2));
    }));

  analytics.command('deployments').description('Deployment analytics')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/deployments');
      if (output.isJson) { output.json(data); return; }
      output.heading('Deployment Analytics');
      console.log(JSON.stringify(data, null, 2));
    }));

  analytics.command('workspaces').description('Workspace analytics')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/workspaces');
      if (output.isJson) { output.json(data); return; }
      output.heading('Workspace Analytics');
      console.log(JSON.stringify(data, null, 2));
    }));

  analytics.command('users').description('User analytics')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/users');
      if (output.isJson) { output.json(data); return; }
      output.heading('User Analytics');
      console.log(JSON.stringify(data, null, 2));
    }));

  analytics.command('schedules').description('Schedule analytics')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/schedules');
      if (output.isJson) { output.json(data); return; }
      output.heading('Schedule Analytics');
      console.log(JSON.stringify(data, null, 2));
    }));

  analytics.command('growth').description('Growth metrics over time')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/analytics/growth');
      if (output.isJson) { output.json(data); return; }
      output.heading('Growth Metrics');
      console.log(JSON.stringify(data, null, 2));
    }));
};
