'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * App management commands.
 *
 * Commands:
 *   citrus apps list                           — List all apps
 *   citrus apps get <id>                       — Get app details
 *   citrus apps create                         — Create a new app
 *   citrus apps update <id>                    — Update an app
 *   citrus apps delete <id>                    — Delete an app
 *   citrus apps publish <id>                   — Publish an app
 *   citrus apps unpublish <id>                 — Unpublish an app
 *   citrus apps pages list <appId>             — List app pages
 *   citrus apps pages create <appId>           — Create a page
 *   citrus apps pages update <appId> <pageId>  — Update a page
 *   citrus apps pages delete <appId> <pageId>  — Delete a page
 *   citrus apps configs list <appId>           — List app configs
 *   citrus apps configs create <appId>         — Create config
 *   citrus apps configs delete <appId> <cfgId> — Delete config
 *   citrus apps access list <appId>            — List access rules
 *   citrus apps access grant <appId>           — Grant access
 *   citrus apps access revoke <appId> <aId>    — Revoke access
 *   citrus apps versions list <appId>          — List app versions
 *   citrus apps versions rollback <appId> <vId>— Rollback
 *
 * Examples:
 *   $ citrus apps list
 *   $ citrus apps create --name "Status Page" --workspace 3
 *   $ citrus apps publish 7
 *   $ citrus apps pages list 7
 */
module.exports = function (program) {
  const apps = program
    .command('apps')
    .description('Manage apps, pages, configs, and access');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
    { key: 'slug', label: 'Slug', width: 18 },
    { key: 'updated_at', label: 'Updated', width: 22, transform: v => output.date(v) }
  ];

  const FIELDS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'slug', label: 'Slug' },
    { key: 'status', label: 'Status', transform: v => output.status(v) },
    { key: 'workspace_id', label: 'Workspace ID' },
    { key: 'published_at', label: 'Published', transform: v => output.date(v) },
    { key: 'created_at', label: 'Created', transform: v => output.date(v) },
    { key: 'updated_at', label: 'Updated', transform: v => output.date(v) }
  ];

  // ─── List ───────────────────────────────────────────────────
  apps.command('list').alias('ls').description('List all apps')
    .addHelpText('after', '\nExamples:\n  $ citrus apps list\n  $ citrus apps ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/apps');
      const rows = Array.isArray(data) ? data : data.apps || [];
      output.table(rows, COLS, { title: 'Apps', emptyMessage: 'No apps found.' });
    }));

  // ─── Get ────────────────────────────────────────────────────
  apps.command('get <id>').description('Get app details')
    .addHelpText('after', '\nExamples:\n  $ citrus apps get 7\n  $ citrus apps get 7 --json')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${id}`);
      output.record(data.app || data, FIELDS, { title: `App #${id}` });
    }));

  // ─── Create ─────────────────────────────────────────────────
  apps.command('create').description('Create a new app')
    .requiredOption('-n, --name <name>', 'App name')
    .option('-w, --workspace <id>', 'Workspace ID')
    .option('-d, --description <desc>', 'Description')
    .option('-s, --slug <slug>', 'URL slug')
    .addHelpText('after', '\nExamples:\n  $ citrus apps create -n "Status Page" -w 3')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name };
      if (opts.workspace) body.workspace_id = opts.workspace;
      if (opts.description) body.description = opts.description;
      if (opts.slug) body.slug = opts.slug;
      const data = await client.post('/api/apps', body);
      const r = data.app || data;
      output.success(`Created app "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  // ─── Update ─────────────────────────────────────────────────
  apps.command('update <id>').description('Update an app')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('-s, --slug <slug>', 'New slug')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.slug) body.slug = opts.slug;
      await client.put(`/api/apps/${id}`, body);
      output.success(`Updated app #${id}`);
    }));

  // ─── Delete ─────────────────────────────────────────────────
  apps.command('delete <id>').description('Delete an app')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete app #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/apps/${id}`);
      output.success(`Deleted app #${id}`);
    }));

  // ─── Publish / Unpublish ────────────────────────────────────
  apps.command('publish <id>').description('Publish an app')
    .addHelpText('after', '\nExamples:\n  $ citrus apps publish 7')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/apps/${id}/publish`);
      output.success(`Published app #${id}`);
      if (output.isJson) output.json(data);
    }));

  apps.command('unpublish <id>').description('Unpublish an app')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/apps/${id}/unpublish`);
      output.success(`Unpublished app #${id}`);
    }));

  // ─── Pages ──────────────────────────────────────────────────
  const pages = apps.command('pages').description('Manage app pages');

  pages.command('list <appId>').alias('ls').description('List app pages')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${appId}/pages`);
      const rows = Array.isArray(data) ? data : data.pages || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'title', label: 'Title', width: 25 },
        { key: 'slug', label: 'Slug', width: 20 },
        { key: 'sort_order', label: 'Order', width: 8 }
      ], { title: `Pages for App #${appId}` });
    }));

  pages.command('create <appId>').description('Create a page')
    .requiredOption('-t, --title <title>', 'Page title')
    .option('-s, --slug <slug>', 'Page slug')
    .option('-c, --content <json>', 'Page content as JSON')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const body = { title: opts.title };
      if (opts.slug) body.slug = opts.slug;
      if (opts.content) body.content = JSON.parse(opts.content);
      const data = await client.post(`/api/apps/${appId}/pages`, body);
      output.success(`Created page in app #${appId}`);
      if (output.isJson) output.json(data);
    }));

  pages.command('update <appId> <pageId>').description('Update a page')
    .option('-t, --title <title>', 'New title')
    .option('-c, --content <json>', 'Updated content as JSON')
    .action(withErrors(async (appId, pageId, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.title) body.title = opts.title;
      if (opts.content) body.content = JSON.parse(opts.content);
      await client.put(`/api/apps/${appId}/pages/${pageId}`, body);
      output.success(`Updated page #${pageId}`);
    }));

  pages.command('delete <appId> <pageId>').description('Delete a page')
    .action(withErrors(async (appId, pageId, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/apps/${appId}/pages/${pageId}`);
      output.success(`Deleted page #${pageId}`);
    }));

  // ─── Configs ────────────────────────────────────────────────
  const configs = apps.command('configs').description('Manage app configs');

  configs.command('list <appId>').alias('ls').description('List app configs')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${appId}/configs`);
      const rows = Array.isArray(data) ? data : data.configs || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'key', label: 'Key', width: 20 },
        { key: 'value', label: 'Value', width: 30, transform: v => output.truncate(String(v), 28) }
      ], { title: `Configs for App #${appId}` });
    }));

  configs.command('create <appId>').description('Create a config entry')
    .requiredOption('-k, --key <key>', 'Config key')
    .requiredOption('--value <value>', 'Config value')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/apps/${appId}/configs`, { key: opts.key, value: opts.value });
      output.success(`Created config "${opts.key}" for app #${appId}`);
    }));

  configs.command('delete <appId> <configId>').description('Delete a config entry')
    .action(withErrors(async (appId, configId, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/apps/${appId}/configs/${configId}`);
      output.success(`Deleted config #${configId}`);
    }));

  // ─── Access ─────────────────────────────────────────────────
  const access = apps.command('access').description('Manage app access');

  access.command('list <appId>').alias('ls').description('List access rules')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${appId}/access`);
      const rows = Array.isArray(data) ? data : data.access || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'user_id', label: 'User ID', width: 10 },
        { key: 'email', label: 'Email', width: 25 },
        { key: 'role', label: 'Role', width: 12 }
      ], { title: `Access for App #${appId}` });
    }));

  access.command('grant <appId>').description('Grant access')
    .requiredOption('-u, --user <userId>', 'User ID')
    .option('-r, --role <role>', 'Role (viewer, editor)', 'viewer')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/apps/${appId}/access`, { user_id: opts.user, role: opts.role });
      output.success(`Granted ${opts.role} access to user #${opts.user}`);
    }));

  access.command('revoke <appId> <accessId>').description('Revoke access')
    .action(withErrors(async (appId, accessId, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/apps/${appId}/access/${accessId}`);
      output.success(`Revoked access #${accessId}`);
    }));

  // ─── Protection Level ───────────────────────────────────────
  apps.command('protect <appId> <level>').description('Set app protection (open, passcode, login)')
    .addHelpText('after', '\nExamples:\n  $ citrus apps protect 7 passcode\n  $ citrus apps protect 7 open\n  $ citrus apps protect 7 login')
    .action(withErrors(async (appId, level, opts, cmd) => {
      await setup(cmd);
      if (!['open', 'passcode', 'login'].includes(level)) {
        output.error('Protection level must be: open, passcode, or login');
        return;
      }
      await client.put(`/api/apps/${appId}/protection`, { protection_level: level });
      output.success(`App #${appId} protection set to "${level}"`);
    }));

  // ─── Passcodes ──────────────────────────────────────────────
  const passcodes = apps.command('passcodes').description('Manage app passcodes');

  passcodes.command('list <appId>').alias('ls').description('List passcodes for an app')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${appId}/passcodes`);
      const rows = Array.isArray(data) ? data : data.passcodes || [];
      output.table(rows, [
        { key: 'user_name', label: 'User', width: 20 },
        { key: 'user_email', label: 'Email', width: 25 },
        { key: 'passcode', label: 'Passcode', width: 12 },
        { key: 'updated_at', label: 'Updated', width: 22, transform: v => output.date(v) }
      ], { title: `Passcodes for App #${appId}` });
    }));

  passcodes.command('set <appId>').description('Set passcode for a user')
    .requiredOption('-u, --user <userId>', 'User ID')
    .requiredOption('-p, --passcode <code>', 'Passcode (4-20 chars)')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/apps/${appId}/passcodes`, { user_id: opts.user, passcode: opts.passcode });
      output.success(`Passcode set for user #${opts.user}`);
    }));

  passcodes.command('generate <appId>').description('Generate passcodes for all users')
    .option('-l, --length <n>', 'Passcode length (4-12)', '6')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.post(`/api/apps/${appId}/passcodes/generate`, { length: parseInt(opts.length) || 6 });
      const rows = data.passcodes || [];
      output.success(`Generated ${data.count} passcodes`);
      output.table(rows, [
        { key: 'user_name', label: 'User', width: 20 },
        { key: 'user_email', label: 'Email', width: 25 },
        { key: 'passcode', label: 'Passcode', width: 12 }
      ], { title: 'Generated Passcodes' });
    }));

  passcodes.command('delete <appId> <passcodeId>').description('Remove a passcode')
    .action(withErrors(async (appId, passcodeId, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/apps/${appId}/passcodes/${passcodeId}`);
      output.success(`Removed passcode #${passcodeId}`);
    }));

  // ─── App Versions ───────────────────────────────────────────
  const appVer = apps.command('versions').description('Manage app versions');

  appVer.command('list <appId>').alias('ls').description('List app versions')
    .action(withErrors(async (appId, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/apps/${appId}/versions`);
      const rows = Array.isArray(data) ? data : data.versions || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'version_number', label: 'Version', width: 10 },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: `Versions for App #${appId}` });
    }));

  appVer.command('rollback <appId> <versionId>').description('Rollback to a version')
    .action(withErrors(async (appId, versionId, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/apps/${appId}/versions/${versionId}/rollback`);
      output.success(`Rolled back app #${appId} to version #${versionId}`);
    }));
};
