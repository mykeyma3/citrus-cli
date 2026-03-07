'use strict';

const config = require('../config');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Configuration management commands.
 *
 * Commands:
 *   citrus config show             — Show current config
 *   citrus config set-url <url>    — Set the API base URL
 *   citrus config profiles         — List profiles
 *   citrus config use <name>       — Switch active profile
 *   citrus config delete <name>    — Delete a profile
 *   citrus config reset            — Reset all config
 *   citrus config path             — Show config file path
 *
 * Examples:
 *   $ citrus config show
 *   $ citrus config set-url http://localhost:3400
 *   $ citrus config profiles
 *   $ citrus config use staging
 *   $ citrus config path
 */
module.exports = function (program) {
  const cfg = program
    .command('config')
    .alias('cfg')
    .description('Manage CLI configuration and profiles');

  cfg.command('show').description('Show current configuration')
    .addHelpText('after', '\nExamples:\n  $ citrus config show\n  $ citrus cfg show --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      const profile = config.activeProfile;
      const data = config.getProfile(profile);

      if (output.isJson) {
        output.json({
          activeProfile: profile,
          baseUrl: config.getBaseUrl(profile),
          user: data.user || null,
          authenticated: !!data.token,
          configPath: config.path
        });
        return;
      }

      output.heading('CLI Configuration');
      output.log(`  Profile:        ${profile}`);
      output.log(`  API URL:        ${config.getBaseUrl(profile)}`);
      output.log(`  Authenticated:  ${data.token ? 'Yes' : 'No'}`);
      if (data.user) {
        output.log(`  User:           ${data.user.name || data.user.email}`);
        output.log(`  Role:           ${data.user.role || '?'}`);
      }
      output.log(`  Config File:    ${config.path}`);
      output.log();
    }));

  cfg.command('set-url <url>').description('Set the API base URL')
    .addHelpText('after', `
Examples:
  $ citrus config set-url http://localhost:3400
  $ citrus config set-url https://app.needcitrus.com`)
    .action(withErrors(async (url, opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      let root = cmd; while (root.parent) root = root.parent;
      const profile = root.opts().profile || config.activeProfile;
      config.setBaseUrl(url, profile);
      output.success(`API URL set to ${url} for profile "${profile}"`);
    }));

  cfg.command('profiles').description('List all profiles')
    .addHelpText('after', '\nExamples:\n  $ citrus config profiles')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      const profiles = config.listProfiles();
      const active = config.activeProfile;

      if (output.isJson) {
        output.json({ activeProfile: active, profiles });
        return;
      }

      output.heading('Profiles');
      if (profiles.length === 0) {
        output.dim('  No profiles configured.');
      } else {
        profiles.forEach(p => {
          const marker = p === active ? ' (active)' : '';
          const profile = config.getProfile(p);
          const authed = profile.token ? 'authenticated' : 'not authenticated';
          output.log(`  ${p}${marker} — ${config.getBaseUrl(p)} [${authed}]`);
        });
      }
      output.log();
    }));

  cfg.command('use <name>').description('Switch active profile')
    .addHelpText('after', '\nExamples:\n  $ citrus config use staging')
    .action(withErrors(async (name, opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      config.activeProfile = name;
      output.success(`Switched to profile "${name}"`);
    }));

  cfg.command('delete <name>').description('Delete a profile')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (name, opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      if (name === config.activeProfile) {
        output.error('Cannot delete the active profile. Switch to another profile first.');
        process.exit(1);
      }
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete profile "${name}"?`, default: false }
        ]);
        if (!confirm) return;
      }
      config.deleteProfile(name);
      output.success(`Deleted profile "${name}"`);
    }));

  cfg.command('reset').description('Reset all configuration')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: 'Reset ALL CLI configuration? This removes all profiles and credentials.', default: false }
        ]);
        if (!confirm) return;
      }
      config.reset();
      output.success('All configuration reset');
    }));

  cfg.command('path').description('Show config file path')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      if (output.isJson) {
        output.json({ path: config.path });
      } else {
        output.log(config.path);
      }
    }));
};
