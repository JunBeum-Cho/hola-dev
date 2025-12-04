#!/usr/bin/env node
const inquirer = require('inquirer');
const { spawn } = require('child_process');

const actions = [
  {
    key: 'codex',
    name: 'Codex (GPT) 실행',
    command: 'codex',
    args: ['--dangerously-bypass-approvals-and-sandbox']
  },
  {
    key: 'claude',
    name: 'Claude 실행',
    command: 'claude',
    args: ['--dangerously-skip-permissions'],
    env: { IS_SANDBOX: '1' }
  },
  {
    key: 'gemini',
    name: 'Gemini 실행',
    command: 'gemini',
    args: ['--yolo']
  }
];

const choices = actions.map(action => ({
  name: action.name,
  value: action.key
}));

async function main() {
  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: '실행할 명령을 선택하세요',
      choices
    }
  ]);

  const action = actions.find(item => item.key === selection);
  if (!action) {
    console.error('Unknown option selected. Exiting.');
    process.exit(1);
  }

  runAction(action);
}

function runAction(action) {
  const displayEnv = action.env
    ? `env ${Object.entries(action.env)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')} `
    : '';
  const displayCwd = action.cwd ? `(cwd: ${action.cwd}) ` : '';
  const commandLine = [action.command, ...(action.args || [])].join(' ');
  console.log(`\n${displayEnv}${displayCwd}${commandLine}\n`);

  const child = spawn(action.command, action.args || [], {
    stdio: 'inherit',
    cwd: action.cwd || process.cwd(),
    env: { ...process.env, ...(action.env || {}) },
    shell: process.platform !== 'win32' 
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`Command exited due to signal: ${signal}`);
      process.exit(1);
    }
    process.exit(code || 0);
  });

  child.on('error', error => {
    console.error(`Failed to start command: ${error.message}`);
    process.exit(1);
  });
}

main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
