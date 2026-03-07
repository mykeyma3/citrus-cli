'use strict';

const client = require('../client');
const output = require('../output');
const { setup, withErrors } = require('../middleware');

/**
 * Team management commands.
 *
 * Commands:
 *   citrus teams list                          — List all teams
 *   citrus teams get <id>                      — Get team details
 *   citrus teams create                        — Create a team
 *   citrus teams update <id>                   — Update a team
 *   citrus teams delete <id>                   — Delete a team
 *   citrus teams members add <teamId>          — Add a member
 *   citrus teams members remove <teamId> <uid> — Remove a member
 *   citrus teams members role <teamId> <uid>   — Update member role
 *
 * Examples:
 *   $ citrus teams list
 *   $ citrus teams create --name "Backend" --description "Backend team"
 *   $ citrus teams members add 3 --user 7 --role member
 *   $ citrus teams members remove 3 7
 */
module.exports = function (program) {
  const teams = program
    .command('teams')
    .description('Manage teams and team membership');

  const COLS = [
    { key: 'id', label: 'ID', width: 6 },
    { key: 'name', label: 'Name', width: 22 },
    { key: 'description', label: 'Description', width: 30, transform: v => output.truncate(v, 28) },
    { key: 'member_count', label: 'Members', width: 10 },
    { key: 'created_at', label: 'Created', width: 22, transform: v => output.date(v) }
  ];

  const FIELDS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'member_count', label: 'Members' },
    { key: 'created_at', label: 'Created', transform: v => output.date(v) },
    { key: 'updated_at', label: 'Updated', transform: v => output.date(v) }
  ];

  teams.command('list').alias('ls').description('List all teams')
    .addHelpText('after', '\nExamples:\n  $ citrus teams list\n  $ citrus teams ls --json')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const data = await client.get('/api/teams');
      const rows = Array.isArray(data) ? data : data.teams || [];
      output.table(rows, COLS, { title: 'Teams', emptyMessage: 'No teams found.' });
    }));

  teams.command('get <id>').description('Get team details')
    .addHelpText('after', '\nExamples:\n  $ citrus teams get 3 --json')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const data = await client.get(`/api/teams/${id}`);
      output.record(data.team || data, FIELDS, { title: `Team #${id}` });
    }));

  teams.command('create').description('Create a team')
    .requiredOption('-n, --name <name>', 'Team name')
    .option('-d, --description <desc>', 'Team description')
    .addHelpText('after', '\nExamples:\n  $ citrus teams create -n "Frontend" -d "Frontend developers"')
    .action(withErrors(async (opts, cmd) => {
      await setup(cmd);
      const body = { name: opts.name };
      if (opts.description) body.description = opts.description;
      const data = await client.post('/api/teams', body);
      const r = data.team || data;
      output.success(`Created team "${r.name}" (ID: ${r.id})`);
      if (output.isJson) output.json(r);
    }));

  teams.command('update <id>').description('Update a team')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      const body = {};
      if (opts.name) body.name = opts.name;
      if (opts.description) body.description = opts.description;
      await client.put(`/api/teams/${id}`, body);
      output.success(`Updated team #${id}`);
    }));

  teams.command('delete <id>').description('Delete a team')
    .option('-f, --force', 'Skip confirmation')
    .action(withErrors(async (id, opts, cmd) => {
      await setup(cmd);
      if (!opts.force && !output.isQuiet) {
        const { confirm } = await require('inquirer').prompt([
          { type: 'confirm', name: 'confirm', message: `Delete team #${id}?`, default: false }
        ]);
        if (!confirm) return;
      }
      await client.del(`/api/teams/${id}`);
      output.success(`Deleted team #${id}`);
    }));

  // ─── Members ────────────────────────────────────────────────
  const members = teams.command('members').description('Manage team members');

  members.command('add <teamId>').description('Add a member to a team')
    .requiredOption('-u, --user <userId>', 'User ID to add')
    .option('-r, --role <role>', 'Role (member, lead)', 'member')
    .addHelpText('after', '\nExamples:\n  $ citrus teams members add 3 --user 7 --role lead')
    .action(withErrors(async (teamId, opts, cmd) => {
      await setup(cmd);
      await client.post(`/api/teams/${teamId}/members`, { user_id: opts.user, role: opts.role });
      output.success(`Added user #${opts.user} to team #${teamId} as ${opts.role}`);
    }));

  members.command('remove <teamId> <userId>').description('Remove a member')
    .action(withErrors(async (teamId, userId, opts, cmd) => {
      await setup(cmd);
      await client.del(`/api/teams/${teamId}/members/${userId}`);
      output.success(`Removed user #${userId} from team #${teamId}`);
    }));

  members.command('role <teamId> <userId>').description('Update member role')
    .requiredOption('-r, --role <role>', 'New role')
    .action(withErrors(async (teamId, userId, opts, cmd) => {
      await setup(cmd);
      await client.put(`/api/teams/${teamId}/members/${userId}`, { role: opts.role });
      output.success(`Updated user #${userId} role to "${opts.role}" in team #${teamId}`);
    }));
};
