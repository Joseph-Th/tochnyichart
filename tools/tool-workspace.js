'use strict';

const fs = require('node:fs');
const { workspacePath } = require('../renderer/run-workspace');

const TOOLING_PROJECT_ID = 'tooling';

function freshToolWorkspace(projectRoot, toolName) {
  const target = workspacePath(projectRoot, TOOLING_PROJECT_ID, toolName);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  return target;
}

module.exports = {
  TOOLING_PROJECT_ID,
  freshToolWorkspace
};
