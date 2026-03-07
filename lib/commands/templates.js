'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Template management commands.
 *
 * Commands:
 *   citrus templates list            — List flow templates
 *   citrus templates categories      — List template categories
 *   citrus templates get <id>        — Get template details
 *   citrus templates create          — Create a template
 *   citrus templates update <id>     — Update a template
 *   citrus templates delete <id>     — Delete a template
 *   citrus templates install <id>    — Install a template as a new flow
 *
 * Examples:
 *   $ citrus templates list
 *   $ citrus templates install 3 --workspace 1
 */
module.exports = function (program) {
  const tmpl = program
    .command('templates')
    .alias('tmpl')
    .description('Manage flow templates');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'category', label: 'Category', width: 18 },
    { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
  ];

  tmpl.command('list').alias('ls').description('List flow templates')
    .addHelpText('after', '\nExamples:\n  $ citrus templates list\n  $ citrus tmpl ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/templates');
      const rows = Array.isArray(data) ? data : data.templates || [];
      output.table(rows, COLS, { title: 'Flow Templates', emptyMessage: 'No templates found.' });
    }));

  tmpl.command('categories').description('List template categories')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/templates/categories');
      console.log(JSON.stringify(data, null, 2));
    }));

  tmpl.command('get <id>').description('Get template details')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/templates/${id}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  tmpl.command('create').description('Create a template')
    .requiredOption('-n, --name <name>', 'Template name')
    .option('-d, --description <desc>', 'Description')
    .option('-c, --category <cat>', 'Category')
    .option('--definition <json>', 'Template definition as JSON')
    .addHelpText('after', '\nExamples:\n  $ citrus templates create -n "ETL Starter" -c data-pipeline')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name };
      if (opts.description) body.description = opts.description;
      if (opts.category) body.category = opts.category;
      if (opts.definition) body.definition = JSON.parse(opts.definition);
      const data = await client.post('/api/templates', body);
      const r = data.template || data;
      output.success(`Created template "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  tmpl.command('update <id>').description('Update a template')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('-c, --category <cat>', 'New category')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      if (opts.category) body.category = opts.category;
      await client.put(`/api/templates/${id}`, body);
      output.success(`Updated template #${id}`);
    }));

  tmpl.command('delete <id>').description('Delete a template')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete template #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/templates/${id}`);
      output.success(`Deleted template #${id}`);
    }));

  tmpl.command('install <id>').description('Install a template as a new flow')
    .option('-w, --workspace <id>', 'Target workspace ID')
    .addHelpText('after', '\nExamples:\n  $ citrus templates install 3 --workspace 1')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.workspace) body.workspace_id = opts.workspace;
      const data = await client.post(`/api/templates/${id}/install`, body);
      output.success(`Installed template #${id} as a new flow`);
      if (output.isJson) output.json(data);
    }));
};
