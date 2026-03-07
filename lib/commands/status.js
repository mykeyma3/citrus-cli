'use strict';

const client = require('../client');
const output = require('../output');
const config = require('../config');
const { setup, withErrors } = require('../middleware');
const { colors, indicators, logoCompact, separator } = require('../brand');

/**
 * Status command — quick overview of the platform and your connection.
 *
 * Commands:
 *   citrus status    — Show connection status, user info, and basic stats
 *
 * Examples:
 *   $ citrus status
 *   $ citrus status --json
 */
module.exports = function (program) {
  program
    .command('status')
    .description('Show connection status, user info, and platform summary')
    .addHelpText('after', `
Examples:
  $ citrus status
  $ citrus status --json
  $ citrus status --profile staging`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });

      const result = {
        profile: config.activeProfile,
        baseUrl: config.getBaseUrl(),
        authenticated: !!config.getToken(),
        platform: null,
        user: null,
        stats: null
      };

      // Check platform health
      try {
        const health = await client.get('/health');
        result.platform = {
          status: health.status || 'ok',
          version: health.version || '?',
          service: health.service || 'citrus-platform'
        };
      } catch {
        result.platform = { status: 'unreachable' };
      }

      // Check auth
      if (config.getToken()) {
        try {
          const me = await client.get('/api/auth/me');
          result.user = me.user || me;
        } catch {
          result.user = null;
          result.authenticated = false;
        }
      }

      // Get basic stats if authenticated
      if (result.authenticated) {
        try {
          const [workspaces, overview] = await Promise.all([
            client.get('/api/workspaces').catch(() => []),
            client.get('/api/analytics/overview').catch(() => null)
          ]);
          result.stats = {
            workspaces: (Array.isArray(workspaces) ? workspaces : workspaces.workspaces || []).length,
            flows: overview?.flows ?? 0
          };
        } catch {
          // ignore
        }
      }

      if (output.isJson) {
        output.json(result);
        return;
      }

      output.log('');
      output.log(`  ${logoCompact()}`);
      output.log(`  ${separator(45)}`);

      // Connection
      const statusColor = result.platform.status === 'ok' ? colors.green : colors.deepOrange;
      output.log(`  ${colors.amber('Platform')}    ${statusColor(result.platform.status)} ${result.platform.version ? colors.muted(`(v${result.platform.version})`) : ''}`);
      output.log(`  ${colors.amber('API URL')}     ${result.baseUrl}`);
      output.log(`  ${colors.amber('Profile')}     ${result.profile}`);

      // Auth
      if (result.authenticated && result.user) {
        output.log(`  ${colors.amber('User')}        ${indicators.success} ${result.user.name || result.user.email} ${colors.muted(`(${result.user.role || '?'})`)}`);
      } else {
        output.log(`  ${colors.amber('User')}        ${indicators.error} Not authenticated`);
      }

      // Stats
      if (result.stats) {
        output.log(`  ${colors.amber('Workspaces')}  ${result.stats.workspaces}`);
        output.log(`  ${colors.amber('Flows')}       ${result.stats.flows}`);
      }

      output.log('');
    }));
};
