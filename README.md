# Citrus CLI

> The official command-line interface for the [Citrus Platform](https://needcitrus.com). Manage workspaces, flows, apps, deployments, teams, and your entire operations infrastructure from the terminal.

[![npm version](https://img.shields.io/npm/v/@nichecitrus/cli)](https://www.npmjs.com/package/@nichecitrus/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Installation

```bash
npm install -g @nichecitrus/cli
```

Requires Node.js 16+.

## Quick Start

```bash
# 1. Authenticate
citrus login

# 2. Check your connection
citrus status

# 3. List your workspaces
citrus workspaces list

# 4. Create a workspace
citrus workspaces create --name "Production Monitoring"

# 5. Create a flow
citrus flows create --name "ETL Pipeline" --workspace 1

# 6. Deploy it
citrus flows deploy 1
```

## Authentication

```bash
# Interactive login
citrus login

# Non-interactive (CI/CD)
citrus login --email user@example.com --password secret

# Token-based (for API keys)
citrus login --token eyJhbG...

# Check who you are
citrus whoami

# Logout
citrus logout
```

### Profiles

Manage multiple environments (production, staging, local):

```bash
# Login to staging
citrus login --profile staging --base-url http://localhost:3400

# Switch active profile
citrus config use staging

# List all profiles
citrus config profiles

# Override per-command
citrus workspaces list --profile staging
```

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (ideal for scripting, piping to `jq`, or LLM consumption) |
| `--quiet` | Suppress decorative output (only essential data, IDs in quiet mode) |
| `--profile <name>` | Use a specific config profile |
| `--base-url <url>` | Override the API base URL for this command |
| `-v, --version` | Show CLI version |
| `-h, --help` | Show help |

## Command Reference

### Workspaces

```bash
citrus workspaces list                              # List all workspaces
citrus workspaces get 5                             # Get workspace details
citrus workspaces create --name "Prod" --description "Production"
citrus workspaces update 5 --name "Renamed"
citrus workspaces delete 5 --force
```

### Flows

```bash
citrus flows list                                   # List all flows
citrus flows list --workspace 3                     # Filter by workspace
citrus flows get 12                                 # Flow details
citrus flows create --name "Monitor" --workspace 3
citrus flows update 12 --name "Updated"
citrus flows delete 12 --force
citrus flows deploy 12                              # Deploy a flow
citrus flows export 12 --output flow.json           # Export to file
citrus flows import flow.json                       # Import from file

# Flow Code
citrus flows code get 12                            # Get flow definition
citrus flows code get 12 --output def.json          # Save to file
citrus flows code set 12 updated-def.json           # Update definition

# Flow Versions
citrus flows versions list 12                       # List versions
citrus flows versions create 12 --label "v1.0"      # Snapshot
citrus flows versions rollback 12 3                 # Rollback
citrus flows versions diff 12 1 2                   # Diff two versions
```

### Apps

```bash
citrus apps list                                    # List apps
citrus apps get 7                                   # App details
citrus apps create --name "Status Page" --workspace 3
citrus apps update 7 --name "Renamed"
citrus apps delete 7 --force
citrus apps publish 7                               # Publish an app
citrus apps unpublish 7                             # Unpublish

# Pages
citrus apps pages list 7                            # List pages
citrus apps pages create 7 --title "Dashboard"
citrus apps pages update 7 1 --title "Renamed"
citrus apps pages delete 7 1

# Configs
citrus apps configs list 7                          # List configs
citrus apps configs create 7 --key THEME --value dark
citrus apps configs delete 7 1

# Access Control
citrus apps access list 7                           # List access rules
citrus apps access grant 7 --user 5 --role editor
citrus apps access revoke 7 1

# Versions
citrus apps versions list 7
citrus apps versions rollback 7 2
```

### Deployments

```bash
citrus deploy list                                  # List deployments
citrus deploy list --flow 12                        # Filter by flow
citrus deploy get 42                                # Deployment details
citrus deploy stop 42                               # Stop deployment
citrus deploy dispatch 42 --data '{"event":"test"}'
citrus deploy late 42                               # Mark as late
citrus deploy clear-late 42                         # Clear late status
citrus deploy set-count 42 --count 150
citrus deploy events 42                             # List events
citrus deploy anomalies 42                          # List anomalies
citrus deploy andons 42                             # List andons
citrus deploy metrics 42                            # Get metrics
```

### Teams

```bash
citrus teams list                                   # List teams
citrus teams get 3                                  # Team details
citrus teams create --name "Backend" --description "Backend team"
citrus teams update 3 --name "Renamed"
citrus teams delete 3 --force

# Members
citrus teams members add 3 --user 7 --role lead
citrus teams members remove 3 7
citrus teams members role 3 7 --role member
```

### Integrations

```bash
citrus integrations list                            # List integrations
citrus integrations types                           # Available types
citrus integrations type slack                      # Type details
citrus integrations nodes                           # Builder nodes
citrus integrations create --name "Slack" --type slack --config '{"webhook":"..."}'
citrus integrations update 5 --config '{"channel":"#alerts"}'
citrus integrations delete 5 --force
citrus integrations test --type slack --config '{"webhook":"..."}'
citrus integrations exec 5 --data '{"message":"Hello"}'
```

### Schedules

```bash
citrus schedules list 3                             # List (workspace 3)
citrus schedules get 3 5                            # Schedule details
citrus schedules create 3 --name "Nightly" --cron "0 2 * * *" --flow 12
citrus schedules update 3 5 --cron "0 3 * * *"
citrus schedules delete 3 5 --force
citrus schedules toggle 3 5                         # Enable/disable
citrus schedules run 3 5                            # Manual trigger
citrus schedules runs 3 5                           # Run history
citrus schedules presets                            # Cron presets
```

### Templates

```bash
citrus templates list                               # List templates
citrus templates categories                         # Categories
citrus templates get 3                              # Template details
citrus templates create --name "ETL Starter" --category data
citrus templates update 3 --name "Renamed"
citrus templates delete 3 --force
citrus templates install 3 --workspace 1            # Install as flow
```

### Secrets

```bash
citrus secrets list 3                               # List (masked)
citrus secrets reveal 3 7                           # Reveal value
citrus secrets create 3 --key DB_PASS --value "s3cret"
citrus secrets update 3 7 --value "newvalue"
citrus secrets delete 3 7 --force
```

### Webhooks

```bash
citrus webhooks list 3                              # List webhooks
citrus webhooks get 3 7                             # Details
citrus webhooks create 3 --name "Deploy Hook" --url "https://..."
citrus webhooks update 3 7 --name "Renamed"
citrus webhooks delete 3 7 --force
citrus webhooks regenerate 3 7                      # New secret
```

### Search

```bash
citrus search "production"                          # Search everything
citrus search "etl" --type flows                    # Filter by type
citrus search "status" --json                       # JSON output
```

### Notifications

```bash
citrus notifications list                           # List all
citrus notifications list --filter unread           # Unread only
citrus notifications count                          # Unread count
citrus notifications read 15                        # Mark read
citrus notifications read-all                       # Mark all read
citrus notifications delete 15
citrus notifications clear --force                  # Clear all
citrus notifications prefs get                      # View preferences
citrus notifications prefs set --data '{"email_deployments":true}'
```

### Community

```bash
citrus community articles list                      # List articles
citrus community articles get 5                     # Article detail
citrus community articles create --title "Guide" --body "..." --status published
citrus community articles update 5 --title "Renamed"
citrus community articles delete 5 --force
citrus community articles categories                # Categories
citrus community forum posts                        # Forum posts
citrus community forum post 3                       # Post detail
citrus community forum create --title "Question" --body "Help?"
```

### Analytics

```bash
citrus analytics overview                           # Platform overview
citrus analytics activity                           # Activity metrics
citrus analytics deployments                        # Deployment stats
citrus analytics workspaces                         # Workspace stats
citrus analytics users                              # User stats
citrus analytics schedules                          # Schedule stats
citrus analytics growth                             # Growth over time
```

### Admin

```bash
citrus admin users list                             # List all users
citrus admin users approve 5                        # Approve user
citrus admin users suspend 5                        # Suspend user
citrus admin users role 5 --role admin              # Change role
citrus admin users delete 5 --force                 # Delete user
citrus admin invite --email user@co.com --role member
citrus admin audit list                             # Audit log
citrus admin audit list --limit 100 --action deploy
citrus admin audit export --output audit.csv        # CSV export
citrus admin import preview users.csv               # Preview import
citrus admin import run users.csv                   # Run import
citrus admin import history                         # Import history
```

### Health

```bash
citrus health                                       # Quick check
citrus health full                                  # Detailed (admin)
citrus health full --json                           # JSON output
```

### Configuration

```bash
citrus config show                                  # Current config
citrus config set-url http://localhost:3400          # Set API URL
citrus config profiles                              # List profiles
citrus config use staging                           # Switch profile
citrus config delete old-profile --force
citrus config reset --force                         # Reset everything
citrus config path                                  # Config file path
```

### Status

```bash
citrus status                                       # Connection + stats
citrus status --json                                # JSON output
```

## Output Formats

### Human-Readable (default)

```
Workspaces
┌──────┬────────────────────────────┬──────────────────────────────┬────────┬──────────────────────┐
│ ID   │ Name                       │ Description                  │ Flows  │ Created              │
├──────┼────────────────────────────┼──────────────────────────────┼────────┼──────────────────────┤
│ 1    │ Production                 │ Production monitoring         │ 5      │ 1/15/2025 10:30:00   │
│ 2    │ Staging                    │ Staging environment           │ 3      │ 1/20/2025 14:00:00   │
└──────┴────────────────────────────┴──────────────────────────────┴────────┴──────────────────────┘
```

### JSON (`--json`)

```json
[
  {
    "id": 1,
    "name": "Production",
    "description": "Production monitoring",
    "flow_count": 5,
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

### Quiet (`--quiet`)

```
1
2
```

## Scripting & Automation

```bash
# Get all workspace IDs
citrus workspaces list --quiet

# Deploy all flows in a workspace
for id in $(citrus flows list --workspace 3 --quiet); do
  citrus flows deploy $id
done

# Export all flows
citrus flows list --json | jq -r '.[].id' | while read id; do
  citrus flows export $id --output "flow-${id}.json"
done

# CI/CD pipeline
citrus login --token $CITRUS_TOKEN --base-url $CITRUS_URL
citrus flows update 12 --from-file flow.json
citrus flows deploy 12
citrus status --json
```

## LLM Integration

The CLI is designed to be used by AI agents and LLMs. Key features:

- **`--json` flag** on every command for structured, parseable output
- **`--quiet` flag** for minimal output (just IDs)
- **Consistent patterns**: Every resource follows `list`, `get`, `create`, `update`, `delete`
- **Non-interactive mode**: All prompts can be bypassed with `--force` or by providing all options
- **Predictable errors**: JSON error format with status codes
- **Comprehensive help**: `--help` on every command with examples

```bash
# LLM workflow: Create a complete workspace with flows
citrus login --token $TOKEN
WS_ID=$(citrus workspaces create --name "LLM Workspace" --quiet)
FLOW_ID=$(citrus flows create --name "Data Pipeline" --workspace $WS_ID --quiet)
citrus flows code set $FLOW_ID pipeline.json
citrus flows deploy $FLOW_ID
citrus status --json
```

## Configuration

Config is stored at `~/.config/citrus-cli/config.json` (or platform equivalent).

```bash
# View config location
citrus config path

# Multiple environments
citrus login --profile production
citrus login --profile staging --base-url http://localhost:3400
citrus config use production
```

## License

MIT — [Citrus Platform](https://needcitrus.com)
