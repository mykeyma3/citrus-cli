'use strict';

const inquirer = require('inquirer');
const client = require('../client');
const config = require('../config');
const output = require('../output');
const { setup, withErrors } = require('../middleware');
const { colors, logoCompact, indicators } = require('../brand');

/**
 * Authentication commands.
 *
 * Commands:
 *   citrus login               — Authenticate with email/password
 *   citrus login --token <t>   — Authenticate with an existing token
 *   citrus logout              — Clear stored credentials
 *   citrus whoami              — Show current user info
 *
 * Examples:
 *   $ citrus login
 *   $ citrus login --email user@example.com --password secret
 *   $ citrus login --token eyJhbG...
 *   $ citrus logout
 *   $ citrus whoami
 *   $ citrus whoami --json
 */
module.exports = function (program) {

  // ─── Login ──────────────────────────────────────────────────
  program
    .command('login')
    .description('Authenticate with the Citrus Platform')
    .option('-e, --email <email>', 'Account email')
    .option('-p, --password <password>', 'Account password')
    .option('-t, --token <token>', 'Use an existing JWT token directly')
    .addHelpText('after', `
Examples:
  $ citrus login                              # Interactive prompt
  $ citrus login -e me@co.com -p secret       # Non-interactive
  $ citrus login --token eyJhbG...            # Direct token auth
  $ citrus login --base-url http://localhost:3400  # Dev server`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });

      let token, user;

      if (opts.token) {
        // Token-based login — verify it
        token = opts.token;
        client.setToken(token);
        const me = await client.get('/api/auth/me');
        user = me.user || me;
        output.success(`Authenticated as ${user.email || user.name}`);
      } else {
        // Email/password login
        let email = opts.email;
        let password = opts.password;

        if (!email || !password) {
          const answers = await inquirer.prompt([
            ...(!email ? [{ type: 'input', name: 'email', message: 'Email:' }] : []),
            ...(!password ? [{ type: 'password', name: 'password', message: 'Password:', mask: '*' }] : [])
          ]);
          email = email || answers.email;
          password = password || answers.password;
        }

        const result = await client.post('/api/auth/login', { email, password });
        token = result.token;
        user = result.user;
        output.success(`Logged in as ${user.name || user.email}`);
      }

      // Save credentials
      const root = cmd; let r = root; while (r.parent) r = r.parent;
      const profile = r.opts().profile || config.activeProfile;
      config.setAuth(token, user, profile);

      if (output.isJson) {
        output.json({ token, user });
      } else {
        output.info(`Credentials saved to profile "${profile}"`);
        output.dim(`Config: ${config.path}`);
      }
    }));

  // ─── Logout ─────────────────────────────────────────────────
  program
    .command('logout')
    .description('Clear stored credentials')
    .addHelpText('after', `
Examples:
  $ citrus logout
  $ citrus logout --profile staging`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd, { requireAuth: false });
      let root = cmd; while (root.parent) root = root.parent;
      const profile = root.opts().profile || config.activeProfile;
      config.clearAuth(profile);
      output.success(`Logged out from profile "${profile}"`);
    }));

  // ─── Whoami ─────────────────────────────────────────────────
  program
    .command('whoami')
    .description('Show current authenticated user')
    .addHelpText('after', `
Examples:
  $ citrus whoami
  $ citrus whoami --json`)
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const me = await client.get('/api/auth/me');
      const user = me.user || me;

      output.record(user, [
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status', transform: v => output.status(v) },
        { key: 'tenant_name', label: 'Org' }
      ], { title: 'Current User' });
    }));
};
