#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const flagFile = path.join(__dirname, '..', '.impact-analysis-done');

try {
  if (fs.existsSync(flagFile)) {
    fs.unlinkSync(flagFile);
  }
} catch (err) {
  console.error(`Failed to clear impact-analysis flag: ${err.message}`);
}
