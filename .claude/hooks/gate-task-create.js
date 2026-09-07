#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const flagFile = path.join(__dirname, '..', '.impact-analysis-done');

const impactAnalysisDone = fs.existsSync(flagFile);

if (!impactAnalysisDone) {
  console.error(
    JSON.stringify({
      continue: false,
      stopReason:
        'Impact analysis required before creating tasks. Run /impact-analysis first.'
    })
  );
  process.exit(1);
}
