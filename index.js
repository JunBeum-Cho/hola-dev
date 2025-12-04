#!/usr/bin/env node
const inquirer = require('inquirer');
const { spawn, execSync } = require('child_process');
const commandExists = require('command-exists');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 설정 파일 경로 (패키지가 설치된 곳의 configs 폴더)
const configDir = path.join(__dirname, 'configs');
const configPath = path.join(configDir, 'hola-config.json');
const homeDir = os.homedir();

// Agent별 설정 폴더 매핑
const agentConfigFolders = {
  codex: '.codex',
  claude: '.claude',
  gemini: '.gemini'
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // 설정 파일 로드 실패 시 기본값 반환
  }
  return null;
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error(chalk.red.bold(`설정 저장 실패: ${error.message}`));
  }
}

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

function setupAgentConfigs(selectedAgents) {
  for (const agentKey of selectedAgents) {
    const folderName = agentConfigFolders[agentKey];
    if (!folderName) continue;
    
    const srcFolder = path.join(configDir, folderName);
    const destFolder = path.join(homeDir, folderName);
    
    if (copyFolderRecursive(srcFolder, destFolder)) {
      console.log(chalk.green(`  ✅ ${folderName} → ~/${folderName} 복사 완료`));
    } else {
      console.log(chalk.yellow(`  ⚠️  ${folderName} 소스 폴더가 없습니다`));
    }
  }
}

async function setupHighPerformanceMode() {
  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: '설정을 적용할 에이전트를 선택하세요 (스페이스바로 선택, 엔터로 완료)',
      choices: [
        { name: 'Claude', value: 'claude', checked: true },
        { name: 'Codex (GPT)', value: 'codex', checked: true },
        { name: 'Gemini', value: 'gemini', checked: true }
      ]
    }
  ]);
  
  if (selectedAgents.length > 0) {
    console.log(chalk.cyan('\n📁 설정 파일을 복사합니다...\n'));
    setupAgentConfigs(selectedAgents);
    console.log(chalk.green.bold('\n✅ 최고성능모드가 활성화되었습니다!\n'));
    
    // 설정 업데이트
    let config = loadConfig() || {};
    config.initialized = true;
    config.highPerformanceMode = true;
    config.selectedAgents = selectedAgents;
    saveConfig(config);
  } else {
    console.log(chalk.yellow.bold('\n⚠️  선택된 에이전트가 없습니다.\n'));
  }
}

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

const choices = [
  ...actions.map(action => ({
    name: action.name,
    value: action.key
  })),
  new inquirer.Separator(),
  { name: '⚙️  최고성능 활성화', value: 'setup_high_performance' }
];


async function main() {
  // 설정 로드
  let config = loadConfig();
  
  // 최초 실행 시 최고성능모드 물어보기
  if (!config || config.initialized !== true) {
    console.log(chalk.cyan.bold('\n🚀 hola-dev에 오신 것을 환영합니다!\n'));
    
    const { enableHighPerformance } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableHighPerformance',
        message: '"최고성능모드"를 활성화 하시겠습니까?',
        default: true
      }
    ]);
    
    if (enableHighPerformance) {
      // 다중 선택으로 agent 선택
      const { selectedAgents } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedAgents',
          message: '설정을 적용할 에이전트를 선택하세요 (스페이스바로 선택, 엔터로 완료)',
          choices: [
            { name: 'Claude', value: 'claude', checked: true },
            { name: 'Codex (GPT)', value: 'codex', checked: true },
            { name: 'Gemini', value: 'gemini', checked: true }
          ]
        }
      ]);
      
      if (selectedAgents.length > 0) {
        console.log(chalk.cyan('\n📁 설정 파일을 복사합니다...\n'));
        setupAgentConfigs(selectedAgents);
        console.log(chalk.green.bold('\n✅ 최고성능모드가 활성화되었습니다!\n'));
      } else {
        console.log(chalk.yellow.bold('\n⚠️  선택된 에이전트가 없습니다.\n'));
      }
      
      config = { initialized: true, highPerformanceMode: true, selectedAgents };
    } else {
      console.log(chalk.yellow.bold('\n⚠️  최고성능모드가 비활성화되었습니다.\n'));
      config = { initialized: true, highPerformanceMode: false, selectedAgents: [] };
    }
    
    saveConfig(config);
  }

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: '실행할 명령을 선택하세요',
      choices
    }
  ]);

  // 최고성능 활성화 옵션 선택 시
  if (selection === 'setup_high_performance') {
    await setupHighPerformanceMode();
    return main(); // 다시 메뉴로 돌아가기
  }

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
