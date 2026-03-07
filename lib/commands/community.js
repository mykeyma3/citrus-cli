'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors, qs } = require('../middleware');

/**
 * Community commands (articles, forum, moderation).
 *
 * Commands:
 *   citrus community articles list               — List articles
 *   citrus community articles get <id>            — Get an article
 *   citrus community articles create              — Create an article
 *   citrus community articles update <id>         — Update an article
 *   citrus community articles delete <id>         — Delete an article
 *   citrus community articles categories          — List article categories
 *   citrus community forum posts                  — List forum posts
 *   citrus community forum post <id>              — Get a forum post
 *   citrus community forum create                 — Create a forum post
 *
 * Examples:
 *   $ citrus community articles list
 *   $ citrus community articles create --title "Getting Started" --body "..."
 *   $ citrus community forum posts --json
 */
module.exports = function (program) {
  const comm = program
    .command('community')
    .alias('comm')
    .description('Community articles, forum, and moderation');

  // ─── Articles ───────────────────────────────────────────────
  const articles = comm.command('articles').description('Manage articles');

  articles.command('list').alias('ls').description('List articles')
    .addHelpText('after', '\nExamples:\n  $ citrus community articles list\n  $ citrus comm articles ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/community/articles');
      const rows = Array.isArray(data) ? data : data.articles || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'title', label: 'Title', width: 30 },
        { key: 'status', label: 'Status', width: 12, transform: v => output.status(v) },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: 'Articles' });
    }));

  articles.command('get <id>').description('Get article details')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/community/articles/${id}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  articles.command('create').description('Create an article')
    .requiredOption('-t, --title <title>', 'Article title')
    .option('-b, --body <body>', 'Article body')
    .option('-c, --category <id>', 'Category ID')
    .option('-s, --status <status>', 'Status (draft, published)', 'draft')
    .addHelpText('after', '\nExamples:\n  $ citrus community articles create -t "My Article" -b "Content here" -s published')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { title: opts.title, status: opts.status };
      if (opts.body) body.body = opts.body;
      if (opts.category) body.category_id = opts.category;
      const data = await client.post('/api/community/articles', body);
      const r = data.article || data;
      output.success(`Created article "${r.title}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  articles.command('update <id>').description('Update an article')
    .option('-t, --title <title>', 'New title')
    .option('-b, --body <body>', 'New body')
    .option('-s, --status <status>', 'New status')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.title) body.title = opts.title;
      if (opts.body) body.body = opts.body;
      if (opts.status) body.status = opts.status;
      await client.put(`/api/community/articles/${id}`, body);
      output.success(`Updated article #${id}`);
    }));

  articles.command('delete <id>').description('Delete an article')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete article #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/community/articles/${id}`);
      output.success(`Deleted article #${id}`);
    }));

  articles.command('categories').description('List article categories')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/community/articles/categories');
      console.log(JSON.stringify(data, null, 2));
    }));

  // ─── Forum ──────────────────────────────────────────────────
  const forum = comm.command('forum').description('Forum posts');

  forum.command('list').alias('ls').alias('posts').description('List forum posts')
    .addHelpText('after', '\nExamples:\n  $ citrus community forum list\n  $ citrus comm forum ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/community/forum/posts');
      const rows = Array.isArray(data) ? data : data.posts || [];
      output.table(rows, [
        { key: 'id', label: 'ID', width: 6 },
        { key: 'title', label: 'Title', width: 30 },
        { key: 'reply_count', label: 'Replies', width: 9 },
        { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
      ], { title: 'Forum Posts' });
    }));

  forum.command('post <id>').description('Get a forum post')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/community/forum/posts/${id}`);
      console.log(JSON.stringify(data, null, 2));
    }));

  forum.command('create').description('Create a forum post')
    .requiredOption('-t, --title <title>', 'Post title')
    .option('-b, --body <body>', 'Post body')
    .option('-c, --category <id>', 'Category ID')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { title: opts.title };
      if (opts.body) body.body = opts.body;
      if (opts.category) body.category_id = opts.category;
      const data = await client.post('/api/community/forum/posts', body);
      const r = data.post || data;
      output.success(`Created forum post "${r.title}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));
};
