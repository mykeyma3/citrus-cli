#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const pkg = require('../package.json');
const { banner, styledHelp, colors, logoCompact, versionTag } = require('../lib/brand');
const tracker = require('../lib/ae-tracker');

// Aestimor analytics — track CLI startup
tracker.trackInit();

// ─── Custom Help Formatter ──────────────────────────────────────
program.configureHelp(styledHelp(pkg.version));

// ─── Global Options ──────────────────────────────────────────────
program
  .name('citrus')
  .description('Citrus Platform CLI — manage workspaces, flows, apps, deployments, teams, and more.')
  .option('--json', 'Output raw JSON (useful for scripting & LLMs)')
  .option('--quiet', 'Suppress non-essential output')
  .option('--profile <name>', 'Use a named config profile', 'default')
  .option('--base-url <url>', 'Override the API base URL')
  .option('-v, --version', 'Show CLI version');

// Override version display to show branded banner
program.on('option:version', () => {
  console.log(banner(pkg.version));
  process.exit(0);
});

// ─── Register Command Groups ────────────────────────────────────
require('../lib/commands/auth')(program);
require('../lib/commands/workspaces')(program);
require('../lib/commands/flows')(program);
require('../lib/commands/apps')(program);
require('../lib/commands/deploy')(program);
require('../lib/commands/teams')(program);
require('../lib/commands/integrations')(program);
require('../lib/commands/schedules')(program);
require('../lib/commands/templates')(program);
require('../lib/commands/secrets')(program);
require('../lib/commands/webhooks')(program);
require('../lib/commands/search')(program);
require('../lib/commands/notifications')(program);
require('../lib/commands/community')(program);
require('../lib/commands/analytics')(program);
require('../lib/commands/admin')(program);
require('../lib/commands/health')(program);
require('../lib/commands/config')(program);
require('../lib/commands/status')(program);
require('../lib/commands/feedback')(program);

// ─── Parse & Execute ────────────────────────────────────────────
program.parse(process.argv);

// Show help if no command given
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
