'use strict';

const chalk = require('chalk');

// ─── Citrus Brand Colors ────────────────────────────────────────
// Three overlapping circles + leaf
//   Top circle:    #f97316  (orange-500)
//   Bottom-left:   #ea580c  (orange-600)
//   Bottom-right:  #fbbf24  (amber-400)
//   Leaf:          #22c55e  (green-500)

const colors = {
  orange:     chalk.hex('#f97316'),
  deepOrange: chalk.hex('#ea580c'),
  amber:      chalk.hex('#fbbf24'),
  green:      chalk.hex('#22c55e'),
  citrus:     chalk.hex('#f97316'),    // Primary brand color
  slate:      chalk.hex('#94a3b8'),    // Soft secondary
  dark:       chalk.hex('#1e293b'),    // Dark text
  muted:      chalk.hex('#64748b'),
  dim:        chalk.dim,
  white:      chalk.white,
  bold:       chalk.bold,
  bgCitrus:   chalk.bgHex('#f97316').black,
  bgGreen:    chalk.bgHex('#22c55e').black,
  bgAmber:    chalk.bgHex('#fbbf24').black,
  bgRed:      chalk.bgHex('#ef4444').white,
};

// ─── ASCII Logo ─────────────────────────────────────────────────
// Clean geometric mark — Citrus identity
function logo() {
  const o = colors.orange;
  const d = colors.deepOrange;
  const a = colors.amber;
  const g = colors.green;

  return [
    ``,
    `        ${g('·  ╱╲')}`,
    `        ${g('  ╱  ╲')}`,
    `        ${g(' ╱ ᐳᐳ ╲')}`,
    `      ${o('┌──────────┐')}`,
    `     ${o('│')} ${d('◆')} ${o('CITRUS')} ${a('◆')} ${o('│')}`,
    `      ${o('└──────────┘')}`,
    `     ${d('╱╱╱')} ${a('╲╲╲')} ${d('╱╱╱')} ${a('╲╲╲')}`,
    ``,
  ].join('\n');
}

// ─── Full Display Logo (for --version and help) ────────────────
function logoFull() {
  const o = colors.orange;
  const d = colors.deepOrange;
  const a = colors.amber;
  const g = colors.green;

  return [
    ``,
    `   ${g('      ╱╲')}`,
    `   ${g('     ╱  ╲')}      ${o('░█████╗░')}${d('██╗')}${a('████████╗')}${o('██████╗░')}${d('██╗░░░██╗')}${a('░██████╗')}`,
    `   ${g('    ╱ ᐳᐳ ╲')}     ${o('██╔══██╗')}${d('██║')}${a('╚══██╔══╝')}${o('██╔══██╗')}${d('██║░░░██║')}${a('██╔════╝')}`,
    `   ${o('  ┌──────────┐')}  ${o('██║░░╚═╝')}${d('██║')}${a('░░░██║░░░')}${o('██████╔╝')}${d('██║░░░██║')}${a('╚█████╗░')}`,
    `   ${o(' │')} ${d('◆')} ${o('CITRUS')} ${a('◆')} ${o('│')} ${o('██║░░██╗')}${d('██║')}${a('░░░██║░░░')}${o('██╔══██╗')}${d('██║░░░██║')}${a('░╚═══██╗')}`,
    `   ${o('  └──────────┘')}  ${o('╚█████╔╝')}${d('██║')}${a('░░░██║░░░')}${o('██║░░██║')}${d('╚██████╔╝')}${a('██████╔╝')}`,
    `   ${d('  ╱╱╱')} ${a('╲╲╲')} ${d('╱╱╱')} ${a('╲╲╲')}  ${o('░╚════╝░')}${d('╚═╝')}${a('░░░╚═╝░░░')}${o('╚═╝░░╚═╝')}${d('░╚═════╝░')}${a('╚═════╝░')}`,
    ``,
  ].join('\n');
}

// ─── Compact Logo (for tight spaces) ──────────────────────────
function logoCompact() {
  return colors.orange('◆') + colors.deepOrange('◆') + colors.amber('◆') + colors.green(' ᐳ ') + colors.orange.bold('citrus');
}

// ─── Styled Version Tag ────────────────────────────────────────
function versionTag(version) {
  return colors.muted(`v${version}`);
}

// ─── Boot Banner ────────────────────────────────────────────────
function banner(version) {
  const m = colors.muted;
  const w = chalk.white;
  return [
    logoFull(),
    `   ${m('━'.repeat(60))}`,
    `    ${w.bold('Citrus Platform CLI')}  ${versionTag(version)}`,
    `    ${m('Build, deploy, and run operational systems')}`,
    `   ${m('━'.repeat(60))}`,
    ``
  ].join('\n');
}

// ─── Separator Line ─────────────────────────────────────────────
function separator(width = 55) {
  return colors.muted('─'.repeat(width));
}

// ─── Box Drawing ────────────────────────────────────────────────
function box(content, { title, width = 50, color = colors.orange } = {}) {
  const lines = content.split('\n');
  const innerW = width - 4;
  const top = title
    ? `${color('╭─')} ${chalk.bold(title)} ${color('─'.repeat(Math.max(0, innerW - title.length - 1)))}${color('╮')}`
    : `${color('╭' + '─'.repeat(width - 2) + '╮')}`;
  const bot = `${color('╰' + '─'.repeat(width - 2) + '╯')}`;
  const body = lines.map(l => {
    const stripped = l.replace(/\u001b\[[0-9;]*m/g, '');
    const pad = Math.max(0, innerW - stripped.length);
    return `${color('│')} ${l}${' '.repeat(pad)} ${color('│')}`;
  });
  return [top, ...body, bot].join('\n');
}

// ─── Section Header ─────────────────────────────────────────────
function sectionHeader(title) {
  return '\n' + colors.orange.bold('◆ ') + chalk.bold(title);
}

// ─── Progress Bar ───────────────────────────────────────────────
function progressBar(value, max, width = 20) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const color = pct >= 0.95 ? chalk.red : pct >= 0.7 ? colors.amber : colors.green;
  const bar = color('█'.repeat(filled)) + colors.muted('░'.repeat(empty));
  const label = `${Math.round(pct * 100)}%`;
  return `${bar} ${colors.muted(label)}`;
}

// ─── Status Badge ───────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'ok':
    case 'running':
    case 'active':
      return colors.bgGreen(` ${status.toUpperCase()} `);
    case 'late':
    case 'late_backlog':
    case 'error':
      return colors.bgRed(` ${status.toUpperCase()} `);
    case 'dispatched':
    case 'stopped':
      return colors.bgAmber(` ${status.toUpperCase()} `);
    default:
      return chalk.bgGray(` ${(status || 'unknown').toUpperCase()} `);
  }
}

// ─── Styled Help Formatter ──────────────────────────────────────
function styledHelp(version) {
  return {
    formatHelp(cmd, helper) {
      const lines = [];
      
      if (!cmd.parent) {
        lines.push(banner(version));
      } else {
        lines.push('');
        lines.push(`  ${logoCompact()} ${colors.muted('›')} ${chalk.bold(cmd.name())}`);
        lines.push('');
      }

      const desc = cmd.description();
      if (desc) {
        lines.push(`  ${desc}`);
        lines.push('');
      }

      lines.push(colors.orange.bold('  USAGE'));
      lines.push(`  ${colors.muted('$')} ${chalk.white(helper.commandUsage(cmd))}`);
      lines.push('');

      const cmds = cmd.commands;
      if (cmds.length > 0) {
        lines.push(colors.orange.bold('  COMMANDS'));
        const maxLen = Math.max(...cmds.map(c => c.name().length + (c.alias() ? c.alias().length + 3 : 0)));
        cmds.forEach(c => {
          const aliasStr = c.alias() ? colors.muted(` (${c.alias()})`) : '';
          const nameStr = colors.amber(c.name());
          const padding = ' '.repeat(Math.max(2, maxLen - c.name().length - (c.alias() ? c.alias().length + 3 : 0) + 4));
          lines.push(`    ${nameStr}${aliasStr}${padding}${colors.muted(c.description() || '')}`);
        });
        lines.push('');
      }

      const opts = cmd.options;
      if (opts.length > 0) {
        lines.push(colors.orange.bold('  OPTIONS'));
        const maxOpt = Math.max(...opts.map(o => o.flags.length));
        opts.forEach(o => {
          const flagStr = colors.amber(o.flags);
          const padding = ' '.repeat(Math.max(2, maxOpt - o.flags.length + 4));
          lines.push(`    ${flagStr}${padding}${colors.muted(o.description)}`);
        });
        lines.push('');
      }

      if (!cmd.parent) {
        lines.push(colors.muted(`  Run ${chalk.white('citrus <command> --help')} for detailed usage`));
        lines.push(colors.muted(`  Docs: ${chalk.white('https://needcitrus.com/cli')}`));
        lines.push('');
      }

      return lines.join('\n');
    }
  };
}

// ─── Spinner Branding ──────────────────────────────────────────
const spinnerConfig = {
  spinner: {
    interval: 80,
    frames: [
      colors.orange('◐'),
      colors.deepOrange('◓'),
      colors.amber('◑'),
      colors.green('◒'),
    ]
  },
  color: false
};

// ─── Status Indicators ────────────────────────────────────────
const indicators = {
  success:  colors.green('✔'),
  error:    chalk.red('✖'),
  warn:     colors.amber('⚠'),
  info:     colors.orange('ℹ'),
  bullet:   colors.orange('◆'),
  arrow:    colors.orange('›'),
  check:    colors.green('✓'),
  cross:    chalk.red('✗'),
  dot:      colors.muted('·'),
  engine:   colors.green('⚙'),
  rocket:   colors.orange('🚀'),
  deployed: colors.green('▶'),
  stopped:  chalk.red('■'),
  pulse:    colors.amber('◈'),
};

module.exports = {
  colors,
  logo,
  logoFull,
  logoCompact,
  banner,
  versionTag,
  separator,
  box,
  sectionHeader,
  progressBar,
  statusBadge,
  styledHelp,
  spinnerConfig,
  indicators,
};
