#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const flagFile = path.join(__dirname, '..', '.impact-analysis-done');

try {
  fs.writeFileSync(flagFile, '');
} catch (err) {
  console.error(`Failed to mark impact-analysis as done: ${err.message}`);
  process.exit(1);
}
