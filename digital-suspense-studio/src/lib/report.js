'use strict';

/**
 * report.js - tiny console reporter. No dependencies, respects NO_COLOR.
 */

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const paint = (code) => (text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : String(text));

const color = {
  green: paint('32'),
  red: paint('31'),
  yellow: paint('33'),
  blue: paint('36'),
  gray: paint('90'),
  bold: paint('1'),
};

const symbols = {
  ok: color.green('✓'),
  fail: color.red('✗'),
  warn: color.yellow('!'),
  info: color.blue('›'),
};

function line(icon, message) {
  process.stdout.write(`  ${icon} ${message}\n`);
}

const log = {
  ok: (message) => line(symbols.ok, message),
  fail: (message) => line(symbols.fail, message),
  warn: (message) => line(symbols.warn, message),
  info: (message) => line(symbols.info, message),
  plain: (message) => process.stdout.write(`    ${message}\n`),
  blank: () => process.stdout.write('\n'),
  title: (message) => process.stdout.write(`\n${color.bold(message)}\n`),
  dim: (message) => process.stdout.write(`  ${color.gray(message)}\n`),
};

/** Print a compact table without pulling in a dependency. */
function table(rows, headers) {
  if (!rows.length) return;
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index] === undefined ? '' : row[index]).length))
  );
  const renderRow = (row) =>
    '  ' +
    row
      .map((cell, index) => String(cell === undefined ? '' : cell).padEnd(widths[index]))
      .join('  ')
      .trimEnd();
  process.stdout.write(color.gray(renderRow(headers)) + '\n');
  rows.forEach((row) => process.stdout.write(renderRow(row) + '\n'));
}

module.exports = { log, table, color };
