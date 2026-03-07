'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Search command.
 *
 * Commands:
 *   citrus search <query>    — Search across all entities
 *
 * Options:
 *   --type <type>            — Filter by entity type (workspaces, flows, apps, etc.)
 *
 * Examples:
 *   $ citrus search "production"
 *   $ citrus search "etl" --type flows
 *   $ citrus search "status" --json
 */
module.exports = function (program) {
  program
    .command('search <query>')
    .description('Search across all platform entities')
    .option('-t, --type <type>', 'Filter by type (workspaces, flows, apps, deployments, integrations, templates, articles, users)')
    .addHelpText('after', `
Examples:
  $ citrus search "production"
  $ citrus search "etl" --type flows
  $ citrus search "monitor" --json
  $ citrus search "status page" --type apps`)
    .action(withErrors(async (query, opts, cmd) => {
      await setup(cmd);
      const params = { q: query };
      if (opts.type) params.type = opts.type;
      const data = await client.get(`/api/search${qs(params)}`);

      if (output.isJson) {
        output.json(data);
        return;
      }

      const results = data.results || [];
      if (results.length === 0) {
        output.info(`No results for "${query}"`);
        return;
      }

      output.table(results, [
        { key: 'type', label: 'Type', width: 15 },
        { key: 'title', label: 'Title', width: 30 },
        { key: 'description', label: 'Description', width: 35, transform: v => output.truncate(v, 33) }
      ], { title: `Search Results for "${query}" (${data.total || results.length} found)` });
    }));
};
