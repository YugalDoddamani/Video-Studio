'use strict';

/**
 * json.js - JSON parsing with line/column errors and a strict writer.
 *
 * Configs are authored by hand, so a parse failure should say where the
 * mistake is instead of throwing "Unexpected token".
 */

function parse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = /position (\d+)/.exec(String(error.message));
    if (match) {
      const position = Number(match[1]);
      const before = text.slice(0, position);
      const line = before.split('\n').length;
      const column = position - before.lastIndexOf('\n');
      throw new Error(`${error.message.replace(/\s*in JSON at position \d+/, '')} at line ${line}, column ${column}`);
    }
    throw error;
  }
}

function stringify(value, indent) {
  return JSON.stringify(value, null, indent === undefined ? 2 : indent) + '\n';
}

module.exports = { parse, stringify };
