'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');
const { colors, indicators } = require('../brand');

/**
 * System health commands.
 *
 * Commands:
 *   citrus health             — Quick health check
 *   citrus health full        — Detailed system health (admin)
 *
 * Examples:
 *   $ citrus health
 *   $ citrus health full --json
 */
module.exports = function (program) {
  const health = program
    .command('health')
    .description('Check platform health')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      try {
        const data = await client.get('/health');
        if (output.isJson) {
          output.json(data);
        } else {
          output.success(`Platform is ${data.status || 'ok'} (${data.service || 'citrus-platform'} v${data.version || '?'})`);
        }
      } catch (err) {
        output.error(`Platform is unreachable: ${err.message}`);
        process.exit(1);
      }
    }));

  health
    .command('full')
    .description('Detailed system health (admin only)')
    .addHelpText('after', `
Examples:
  $ citrus health full
  $ citrus health full --json`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/health-monitor');

      if (output.isJson) {
        output.json(data);
        return;
      }

      const chalk = require('chalk');
      output.heading('System Health');

      // Process
      if (data.uptime) {
        output.log(`  ${colors.amber('Uptime')}      ${data.uptime.processFormatted || (Math.floor(data.uptime.process / 3600) + 'h ' + Math.floor((data.uptime.process % 3600) / 60) + 'm')}`);
      }
      if (data.process) {
        output.log(`  ${colors.amber('Node.js')}     ${data.process.nodeVersion || '?'}`);
        output.log(`  ${colors.amber('Platform')}    ${data.process.platform || '?'}`);
      }

      // Memory
      if (data.memory) {
        const used = (data.memory.heapUsed / 1024 / 1024).toFixed(1);
        const total = (data.memory.heapTotal / 1024 / 1024).toFixed(1);
        output.log(`  ${colors.amber('Memory')}      ${used} MB / ${total} MB heap`);
      }

      // Database
      if (data.database) {
        const latency = data.database.latency ?? data.database.latencyMs;
        const color = latency < 50 ? colors.green : latency < 200 ? colors.amber : colors.deepOrange;
        output.log(`  ${colors.amber('DB Latency')}  ${color(latency + 'ms')}`);
        output.log(`  ${colors.amber('DB Size')}     ${data.database.size || '?'}`);
      }

      // Stats
      if (data.stats) {
        output.log(`  ${colors.amber('Users')}       ${data.stats.users || 0}`);
        output.log(`  ${colors.amber('Workspaces')}  ${data.stats.workspaces || 0}`);
        output.log(`  ${colors.amber('Flows')}       ${data.stats.flows || 0}`);
      }

      output.log();
    }));
};
