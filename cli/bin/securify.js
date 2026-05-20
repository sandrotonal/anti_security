#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const PLATFORM = process.platform;
const BINARY_NAME = PLATFORM === 'win32' ? 'securify.exe' : 'securify';

// Look for binary in multiple locations
const possiblePaths = [
  path.join(__dirname, BINARY_NAME),
  path.join(__dirname, '..', BINARY_NAME),
];

// Check if cargo has it installed globally
function findBinary() {
  for (const p of possiblePaths) {
    try {
      require('fs').accessSync(p);
      return p;
    } catch {}
  }
  return null;
}

const binary = findBinary();
if (!binary) {
  console.error('✖ securify binary not found.');
  console.error('');
  console.error('  install via cargo:');
  console.error('    cargo install securify');
  console.error('');
  process.exit(1);
}

const result = spawnSync(binary, process.argv.slice(2), {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
