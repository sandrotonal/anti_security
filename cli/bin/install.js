#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PLATFORM = process.platform;
const ARCH = process.arch;
const VERSION = require('../package.json').version;

const BINARY_NAME = PLATFORM === 'win32' ? 'securify.exe' : 'securify';

const RELEASE_URL = `https://github.com/omer/istanbul_api/releases/download/v${VERSION}/${BINARY_NAME}-${PLATFORM}-${ARCH}`;

const BIN_DIR = path.join(__dirname, '..', 'bin');
const BINARY_PATH = path.join(BIN_DIR, BINARY_NAME);

async function install() {
  // If binary already exists, skip download
  if (fs.existsSync(BINARY_PATH)) {
    console.log(`✔ securify binary already installed at ${BINARY_PATH}`);
    return;
  }

  // Try to use cargo as fallback
  try {
    console.log('🔧 building securify from source via cargo...');
    execSync('cargo install securify', { stdio: 'inherit' });
    console.log('✔ securify installed via cargo');
    return;
  } catch {
    console.log('⚠ cargo not available. checking for pre-built binary...');
  }

  console.error('✖ pre-built binary not available for your platform.');
  console.error('');
  console.error('  install via cargo instead:');
  console.error('    cargo install securify');
  console.error('');
  process.exit(1);
}

install().catch((err) => {
  console.error('✖ installation failed:', err.message);
  console.error('');
  console.error('  install via cargo instead:');
  console.error('    cargo install securify');
  console.error('');
  process.exit(1);
});
