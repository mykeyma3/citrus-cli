'use strict';

const client = require('../client');
const output = require('../output');
const { colors, indicators, progressBar, statusBadge, box, logoCompact, separator } = require('../brand');
const { setup, withErrors, qs } = require('../middleware');
const chalk = require('chalk');

/**
 * Deployment management commands.
 *
 * Commands:
 *   citrus deploy list                        — List all deployments
 *   citrus deploy list --flow <flowId>        — List deployments for a flow
 *   citrus deploy get <deploymentId>          — Get deployment details (metrics, andons)
 *   citrus deploy stop <deploymentId>         — Stop a deployment
 *   citrus deploy dispatch <deploymentId>     — Dispatch a deployment event
 *   citrus deploy late <deploymentId>         — Mark deployment as late
 *   citrus deploy clear-late <deploymentId>   — Clear late status
 *   citrus deploy set-count <deploymentId>    — Set deployment count
 *   citrus deploy events <deploymentId>       — List deployment events
 *   citrus deploy anomalies <deploymentId>    — List deployment anomalies
 *   citrus deploy andons <deploymentId>       — List deployment andons
 *   citrus deploy metrics <deploymentId>      — Get deployment metrics
 *
 * Examples:
 *   $ citrus deploy list
 *   $ citrus deploy list --flow 12
 *   $ citrus deploy get 42
 *   $ citrus deploy stop 42
 *   $ citrus deploy metrics 42 --json
 */
module.exports = function (program) {
  const deploy = program
    .command('deploy')
    .alias('deployments')
    .description('Manage deployments and runtime');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'flow_name', label: 'Flow', width: 22 },
    { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
    { key: 'created_at', label: 'Deployed', width: 22, transform: v => output.date(v) }
  ];

  // ─── List ───────────────────────────────────────────────────
  deploy.command('list').alias('ls').description('List deployments')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('-f, --flow <flowId>', 'Filter by flow ID')
    .option('-a, --all', 'Show all deployments (default: active only)')
    .addHelpText('after', `
Examples:
  $ citrus deploy list --workspace <id>
  $ citrus deploy ls --flow <flowId>
  $ citrus deploy ls --all                    # include stopped
  $ citrus deploy ls --json`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      let url;
      if (opts.flow) {
        url = `/api/runtime/flow/${opts.flow}/deployments`;
      } else if (opts.workspace) {
        url = `/api/runtime/deployments?workspace_id=${opts.workspace}`;
      } else {
        output.error('Either --workspace or --flow is required');
        process.exit(1);
      }
      const data = await client.get(url);
      let rows = Array.isArray(data) ? data : data.deployments || [];
      if (!opts.all) {
        rows = rows.filter(r => r.status === 'running');
      }
      output.table(rows, COLS, { title: opts.all ? 'All Deployments' : 'Active Deployments', emptyMessage: 'No deployments found.' });
    }));

  // ─── Get (Metrics) ─────────────────────────────────────────
  deploy.command('get <id>').description('Get deployment details and metrics')
    .addHelpText('after', '\nExamples:\n  $ citrus deploy get 42\n  $ citrus deploy get 42 --json')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/runtime/deployments/${id}/metrics`);
      if (output.isJson) {
        output.json(data);
      } else {
        output.record(data, [
          { key: 'id', label: 'Deployment ID' },
          { key: 'flow_name', label: 'Flow' },
          { key: 'status', label: 'Status', transform: v => output.status(v) },
          { key: 'count', label: 'Count' },
          { key: 'target', label: 'Target' },
          { key: 'efficiency', label: 'Efficiency' },
          { key: 'created_at', label: 'Started', transform: v => output.date(v) }
        ], { title: `Deployment #${id}` });
      }
    }));

  // ─── Stop ───────────────────────────────────────────────────
  deploy.command('stop <id>').description('Stop a deployment')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/runtime/deployments/${id}/stop`);
      output.success(`Stopped deployment #${id}`);
    }));

  // ─── Dispatch ───────────────────────────────────────────────
  deploy.command('dispatch <id>').description('Dispatch a route')
    .requiredOption('-r, --route <name>', 'Route name')
    .option('--data <json>', 'Additional event data as JSON')
    .addHelpText('after', `
Examples:
  $ citrus deploy dispatch <deploymentId> --route A1
  $ citrus deploy dispatch <id> --route A1 --data '{"reason":"shift change"}'`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = opts.data ? { ...JSON.parse(opts.data), route: opts.route } : { route: opts.route };
      const data = await client.post(`/api/runtime/deployments/${id}/dispatch`, body);
      output.success(`Dispatched route ${opts.route} on deployment #${id}`);
      if (output.isJson) output.json(data);
    }));

  // ─── Late / Clear-Late ──────────────────────────────────────
  deploy.command('late <id>').description('Mark a route as late')
    .requiredOption('-r, --route <name>', 'Route name')
    .addHelpText('after', `
Examples:
  $ citrus deploy late <deploymentId> --route A1`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/runtime/deployments/${id}/late`, { route: opts.route });
      output.success(`Marked route ${opts.route} as late on deployment #${id}`);
    }));

  deploy.command('clear-late <id>').description('Clear late status for a route')
    .requiredOption('-r, --route <name>', 'Route name')
    .addHelpText('after', `
Examples:
  $ citrus deploy clear-late <deploymentId> --route A1`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/runtime/deployments/${id}/clear-late`, { route: opts.route });
      output.success(`Cleared late status for route ${opts.route} on deployment #${id}`);
    }));

  // ─── Hooked Up ────────────────────────────────────────────────
  deploy.command('hooked-up <id>').description('Toggle hooked-up status for a route')
    .requiredOption('-r, --route <name>', 'Route name')
    .addHelpText('after', `
Examples:
  $ citrus deploy hooked-up <deploymentId> --route A1`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/runtime/deployments/${id}/hooked-up`, { route: opts.route });
      const state = data.hooked_up ? 'CONNECTED' : 'DISCONNECTED';
      output.success(`Route ${opts.route} is now ${state} on deployment #${id}`);
      if (output.isJson) output.json(data);
    }));

  // ─── Set Count ──────────────────────────────────────────────
  deploy.command('set-count <id>').description('Set count for a route')
    .requiredOption('-r, --route <name>', 'Route name')
    .requiredOption('-c, --count <n>', 'Count value')
    .addHelpText('after', `
Examples:
  $ citrus deploy set-count <deploymentId> --route A1 --count 15`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/runtime/deployments/${id}/set-count`, { route: opts.route, count: parseInt(opts.count) });
      output.success(`Set count to ${opts.count} for route ${opts.route} on deployment #${id}`);
    }));

  // ─── Events ─────────────────────────────────────────────────
  deploy.command('events <id>').description('List deployment events')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/runtime/deployments/${id}/events`);
      const rows = Array.isArray(data) ? data : data.events || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'event_type', label: 'Type', width: 15 },
        { key: 'route_name', label: 'Route', width: 12 },
        { key: 'data', label: 'Data', width: 30, transform: v => typeof v === 'object' ? JSON.stringify(v) : (v || '') },
        { key: 'created_at', label: 'Time', width: 22, transform: v => output.date(v) }
      ], { title: `Events for Deployment #${id}` });
    }));

  // ─── Anomalies ──────────────────────────────────────────────
  deploy.command('anomalies <id>').description('List deployment anomalies')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/runtime/deployments/${id}/anomalies`);
      const rows = Array.isArray(data) ? data : data.anomalies || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'type', label: 'Type', width: 15 },
        { key: 'severity', label: 'Severity', width: 10 },
        { key: 'message', label: 'Message', width: 30 },
        { key: 'detected_at', label: 'Detected', width: 22, transform: v => output.date(v) }
      ], { title: `Anomalies for Deployment #${id}` });
    }));

  // ─── Andons (branded) ──────────────────────────────────────────
  deploy.command('andons <id>').description('Live andon display for a deployment')
    .option('-w, --watch', 'Watch mode — auto-refresh every 3 seconds')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);

      const renderAndon = async () => {
        const data = await client.get(`/api/runtime/deployments/${id}/andons`);
        const routes = data.routes || [];

        if (output.isJson) {
          output.json(data);
          return;
        }

        // Clear screen in watch mode
        if (opts.watch) process.stdout.write('\x1B[2J\x1B[H');

        console.log('');
        console.log(`  ${logoCompact()} ${colors.muted('›')} ${chalk.bold('Andon Board')}`);
        console.log(`  ${separator(55)}`);
        console.log('');

        if (routes.length === 0) {
          console.log(colors.muted('  No routes found for this deployment.'));
          return;
        }

        for (const r of routes) {
          const bar = progressBar(r.count, r.threshold, 25);
          const badge = statusBadge(r.status);
          const hook = r.hooked_up ? colors.green(' ⚡ HOOKED') : '';
          const disp = r.dispatched ? colors.amber(' ✓ DISPATCHED') : '';
          const late = r.backlog > 0 ? chalk.red(` ⚠ BACKLOG:${r.backlog}`) : '';

          console.log(`  ${colors.orange.bold(r.route.padEnd(8))} ${bar}  ${colors.white(`${r.count}/${r.threshold}`)}  C${r.cycle}  ${badge}${hook}${disp}${late}`);
        }

        console.log('');
        console.log(`  ${colors.muted(`Updated: ${new Date(data.timestamp).toLocaleTimeString()}`)}`);
        if (opts.watch) console.log(colors.muted('  Press Ctrl+C to stop watching'));
        console.log('');
      };

      await renderAndon();

      if (opts.watch) {
        setInterval(renderAndon, 3000);
        // Keep process alive
        await new Promise(() => {});
      }
    }));

  // ─── Metrics (branded) ──────────────────────────────────────────
  deploy.command('metrics <id>').description('Get deployment metrics')
    .addHelpText('after', '\nExamples:\n  $ citrus deploy metrics 42 --json')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/runtime/deployments/${id}/metrics`);
      if (output.isJson) {
        output.json(data);
      } else {
        console.log('');
        console.log(`  ${logoCompact()} ${colors.muted('›')} ${chalk.bold('Metrics')}`);
        console.log(`  ${separator(55)}`);
        console.log('');
        const s = data.summary || {};
        console.log(`  ${colors.orange('Routes:')} ${s.total_routes}   ${colors.green('OK:')} ${s.ok}   ${chalk.red('Late:')} ${s.late}   ${colors.amber('Dispatched:')} ${s.dispatched}`);
        console.log('');
        if (data.routes) {
          for (const r of data.routes) {
            const bar = progressBar(r.count, r.threshold, 20);
            console.log(`  ${colors.orange(r.route.padEnd(8))} ${bar}  ${statusBadge(r.status)}`);
          }
        }
        console.log('');
        if (data.today_events) {
          const te = data.today_events;
          console.log(`  ${colors.muted('Today:')} ${te.total} events · ${te.dispatches} dispatches · ${te.lates} lates`);
        }
        console.log('');
      }
    }));

  // ─── Engine Status ──────────────────────────────────────────────
  deploy.command('engine <id>').description('Get engine status for a deployment')
    .option('--start', 'Start the engine')
    .option('--stop', 'Stop the engine')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (opts.start) {
        const data = await client.post(`/api/runtime/deployments/${id}/engine/start`);
        console.log(`  ${indicators.engine} Engine started`);
        if (data.engine) {
          console.log(`  ${colors.muted('Ticks:')} ${data.engine.tickCount}  ${colors.muted('Interval:')} ${data.engine.interval}ms  ${colors.muted('Nodes:')} ${data.engine.nodeCount}`);
        }
      } else if (opts.stop) {
        await client.post(`/api/runtime/deployments/${id}/engine/stop`);
        console.log(`  ${indicators.stopped} Engine stopped`);
      } else {
        const data = await client.get(`/api/runtime/deployments/${id}/engine`);
        if (output.isJson) {
          output.json(data);
        } else {
          const e = data.engine || {};
          console.log('');
          console.log(`  ${logoCompact()} ${colors.muted('›')} ${chalk.bold('Engine')}`);
          console.log(`  ${separator(40)}`);
          console.log(`  ${colors.muted('Status:')}    ${e.running ? colors.green.bold('RUNNING') : chalk.red.bold('STOPPED')}`);
          console.log(`  ${colors.muted('Ticks:')}     ${e.tickCount || 0}`);
          console.log(`  ${colors.muted('Interval:')}  ${e.interval || '—'}ms`);
          console.log(`  ${colors.muted('Nodes:')}     ${e.nodeCount || 0}`);
          console.log(`  ${colors.muted('Triggers:')}  ${e.triggerCount || 0}`);
          console.log(`  ${colors.muted('Routes:')}    ${e.routeCount || 0}`);
          console.log('');
        }
      }
    }));

  // ─── Test Cycle Mode ────────────────────────────────────────────
  // Simulates count increments and shows live andon display
  deploy.command('test <id>').description('Run test cycle — simulates count increments with live display')
    .option('-s, --speed <ms>', 'Delay between increments (ms)', '1500')
    .option('-r, --route <name>', 'Test a specific route only')
    .option('--cycles <n>', 'Number of cycles to simulate', '2')
    .addHelpText('after', `
${colors.orange('Examples:')}
  $ citrus deploy test <deploymentId>
  $ citrus deploy test <id> --speed 500 --cycles 3
  $ citrus deploy test <id> --route A1`)
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);

      const speed = parseInt(opts.speed) || 1500;
      const maxCycles = parseInt(opts.cycles) || 2;
      const targetRoute = opts.route;

      // Get current andons to know routes
      const initial = await client.get(`/api/runtime/deployments/${id}/andons`);
      let routes = initial.routes || [];
      if (targetRoute) routes = routes.filter(r => r.route === targetRoute);

      if (routes.length === 0) {
        output.error('No routes found for this deployment.');
        return;
      }

      console.log('');
      console.log(`  ${logoCompact()} ${colors.muted('›')} ${colors.amber.bold('Test Cycle Mode')}`);
      console.log(`  ${separator(55)}`);
      console.log(`  ${colors.muted('Deployment:')} ${id}`);
      console.log(`  ${colors.muted('Routes:')}     ${routes.map(r => r.route).join(', ')}`);
      console.log(`  ${colors.muted('Speed:')}      ${speed}ms per increment`);
      console.log(`  ${colors.muted('Cycles:')}     ${maxCycles}`);
      console.log(`  ${separator(55)}`);
      console.log('');
      console.log(colors.amber('  ▶ Starting test cycle simulation...'));
      console.log('');

      let completedCycles = 0;

      for (let cycle = 1; cycle <= maxCycles; cycle++) {
        console.log(`  ${colors.orange.bold(`━━━ CYCLE ${cycle} ━━━━━━━━━━━━━━━━━━━━━━━━━━━`)}`);
        console.log('');

        for (const route of routes) {
          const threshold = route.threshold || 20;
          const sendCount = route.send_count || 0;

          for (let count = 1; count <= threshold; count++) {
            // Set count via API
            try {
              const result = await client.post(`/api/runtime/deployments/${id}/set-count`, {
                route: route.route,
                count
              });

              // If API returned cycle wrap (count reset to 0), show wrap message and break
              if (result && result.count === 0 && count > 1) {
                // Refresh andons for accurate cycle display
                const wrapState = await client.get(`/api/runtime/deployments/${id}/andons`);
                const wrapRoute = (wrapState.routes || []).find(r => r.route === route.route);
                if (wrapRoute) {
                  process.stdout.write('\r\x1B[K');
                  const bar = progressBar(wrapRoute.count, wrapRoute.threshold, 25);
                  const badge = statusBadge(wrapRoute.status);
                  process.stdout.write(`  ${colors.orange(route.route.padEnd(6))} ${bar}  ${colors.white(`${wrapRoute.count}/${wrapRoute.threshold}`)} C${wrapRoute.cycle} ${badge}`);
                }
                process.stdout.write(colors.green(`  ← CYCLE ${result.cycle} COMPLETE`));
                console.log('');
                break;
              }
            } catch (err) {
              // Ignore errors during test — might be cycle wrap
            }

            // Refresh andons
            const live = await client.get(`/api/runtime/deployments/${id}/andons`);
            const routeState = (live.routes || []).find(r => r.route === route.route);

            if (routeState) {
              // Clear line and redraw
              process.stdout.write('\r\x1B[K');
              const bar = progressBar(routeState.count, routeState.threshold, 25);
              const badge = statusBadge(routeState.status);
              const hook = routeState.hooked_up ? colors.green(' ⚡') : '';
              process.stdout.write(`  ${colors.orange(route.route.padEnd(6))} ${bar}  ${colors.white(`${routeState.count}/${routeState.threshold}`)} C${routeState.cycle} ${badge}${hook}`);
            }

            // Check for late threshold
            if (sendCount > 0 && count === sendCount + 1) {
              process.stdout.write(chalk.red(`  ← LATE DETECTED`));
            }

            // Wait
            await new Promise(resolve => setTimeout(resolve, speed));
          }
        }

        completedCycles++;
        console.log('');
      }

      // Final state
      console.log(`  ${separator(55)}`);
      console.log('');
      console.log(`  ${indicators.success} Test complete — ${completedCycles} cycle(s) simulated`);
      console.log('');

      // Show final andon board
      const final = await client.get(`/api/runtime/deployments/${id}/andons`);
      const finalRoutes = final.routes || [];
      for (const r of finalRoutes) {
        const bar = progressBar(r.count, r.threshold, 25);
        const badge = statusBadge(r.status);
        console.log(`  ${colors.orange(r.route.padEnd(8))} ${bar}  ${colors.white(`${r.count}/${r.threshold}`)}  C${r.cycle}  ${badge}`);
      }
      console.log('');
    }));
};
