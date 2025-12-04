#!/usr/bin/env node
const inquirer = require('inquirer');
const { spawn, execSync } = require('child_process');
const commandExists = require('command-exists');
const chalk = require('chalk');

const actions = [
  {
    key: 'codex',
    name: 'Codex (GPT) 실행',
    command: 'codex',
    args: ['--dangerously-bypass-approvals-and-sandbox'],
    package: '@openai/codex'
  },
  {
    key: 'claude',
    name: 'Claude 실행',
    command: 'claude',
    args: ['--dangerously-skip-permissions'],
    env: { IS_SANDBOX: '1' },
    package: '@anthropic-ai/claude-code'
  },
  {
    key: 'gemini',
    name: 'Gemini 실행',
    command: 'gemini',
    args: ['--yolo'],
    package: '@google/gemini-cli'
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
  
  let installed = false;
  try {
    await commandExists(action.command);
    installed = true;
  } catch {
    // 명령어가 설치되어 있지 않음
  }
  
  if (!installed) {
    console.log(chalk.green.bold('==============================================\n'));
    console.log(chalk.green.bold(`${action.command}가 설치되어 있지 않습니다. 설치를 시작합니다...`));
    console.log(chalk.green.bold(`npm install -g ${action.package}\n`));
    console.log(chalk.green.bold('==============================================\n'));
    try {
      execSync(`npm install -g ${action.package}`, { stdio: 'inherit' });
      console.log(chalk.green.bold(`\n${action.package} 설치 완료!\n`));
    } catch (error) {
      console.error(chalk.red.bold(`\n설치 실패: ${error.message}\n`));
      process.exit(1);
    }
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
