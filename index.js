#!/usr/bin/env node
const { select, checkbox, confirm } = require('@inquirer/prompts');
const { spawn, execSync } = require('child_process');
const commandExists = require('command-exists');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');
let clipboardy;

try {
  clipboardy = require('clipboardy');
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    console.error(
      chalk.red.bold('clipboardy가 설치되어 있지 않습니다. npm install clipboardy 후 다시 실행하세요.')
    );
    process.exit(1);
  }
  throw error;
}

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

// Agent 모드 설정
const agentModes = {
  editors: {
    name: 'Editors Mode',
    codex: { file: 'senior-editor.md', displayName: 'Senior Editor' },
    claude: { file: 'chief-editor.md', displayName: 'Chief Editor' }
  },
  frontend_designer: {
    name: 'Frontend-Designer Mode',
    codex: { file: 'principal-frontend-engineer.md', displayName: 'Principal Frontend Engineer' },
    claude: { file: 'staff-designer.md', displayName: 'Staff Designer' }
  },
  server_engineering: {
    name: 'Server Engineering Mode',
    codex: { file: 'senior-server-engineer.md', displayName: 'Senior Server Engineer' },
    claude: { file: 'staff-server-engineer.md', displayName: 'Staff Server Engineer' }
  },
  quant: {
    name: 'Quant Mode',
    codex: { file: 'senior-quant-engineer.md', displayName: 'Senior Quant Engineer' },
    claude: { file: 'head-of-quant.md', displayName: 'Head of Quant' }
  }
};

const agentsDir = path.join(__dirname, 'agents');

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
      console.log(chalk.green(`${folderName} → ~/${folderName} 복사 완료`));
    } else {
      console.log(chalk.yellow(`${folderName} 소스 폴더가 없습니다`));
    }
  }
}

function getAgentModeStatus(config) {
  if (!config || !config.agentMode || !config.agentMode.mode) {
    return null;
  }
  const mode = agentModes[config.agentMode.mode];
  if (!mode) return null;
  return `Codex: ${mode.codex.displayName} | Claude: ${mode.claude.displayName}`;
}

const agentChoices = [
  { name: 'Claude', value: 'claude' },
  { name: 'Codex (GPT)', value: 'codex' },
  { name: 'Gemini', value: 'gemini' }
];

async function setupHighPerformanceMode() {
  const selectedAgents = await checkbox({
    message: '설정을 적용할 에이전트를 선택하세요 (스페이스바로 선택 / 엔터로 완료)',
    instructions: false,
    choices: agentChoices
  });
  
  if (selectedAgents.length > 0) {
    console.log(chalk.cyan('\n📁 설정 파일을 복사합니다...\n'));
    setupAgentConfigs(selectedAgents);
    console.log(chalk.green.bold('최고성능모드가 활성화되었습니다!\n'));
    
    // 설정 업데이트
    let config = loadConfig() || {};
    config.initialized = true;
    config.highPerformanceMode = true;
    config.selectedAgents = selectedAgents;
    saveConfig(config);
  } else {
    console.log(chalk.yellow.bold('선택된 에이전트가 없습니다.\n'));
  }
}

async function setupAgentMode() {
  const config = loadConfig() || {};

  // 현재 활성화된 모드 표시
  const currentStatus = getAgentModeStatus(config);
  if (currentStatus) {
    console.log(chalk.cyan(`\n현재 Agent 모드: ${currentStatus}\n`));
  }

  const modeChoices = [
    { name: 'Editors Mode', value: 'editors' },
    { name: 'Frontend-Designer Mode', value: 'frontend_designer' },
    { name: 'Server Engineering Mode', value: 'server_engineering' },
    { name: 'Quant Mode', value: 'quant' },
    { name: '초기화하기', value: 'reset' }
  ];

  const selectedMode = await select({
    message: 'Agent 모드를 선택하세요',
    choices: modeChoices
  });

  if (selectedMode === 'reset') {
    const codexDestDir = path.join(homeDir, '.codex');
    const claudeDestDir = path.join(homeDir, '.claude');
    const codexFilePath = path.join(codexDestDir, 'AGENTS.md');
    const claudeFilePath = path.join(claudeDestDir, 'CLAUDE.md');

    try {
      if (fs.existsSync(codexFilePath)) {
        fs.unlinkSync(codexFilePath);
        console.log(chalk.green('~/.codex/AGENTS.md 삭제 완료'));
      }
      if (fs.existsSync(claudeFilePath)) {
        fs.unlinkSync(claudeFilePath);
        console.log(chalk.green('~/.claude/CLAUDE.md 삭제 완료'));
      }

      // 설정에서 agentMode 제거
      delete config.agentMode;
      saveConfig(config);

      console.log(chalk.green.bold('\nAgent 모드가 초기화되었습니다!\n'));
    } catch (error) {
      console.error(chalk.red.bold(`초기화 실패: ${error.message}`));
    }
    return;
  }

  const mode = agentModes[selectedMode];

  // 대상 디렉토리 생성 및 파일 복사
  const codexDestDir = path.join(homeDir, '.codex');
  const claudeDestDir = path.join(homeDir, '.claude');

  try {
    // .codex 디렉토리 생성 (없으면)
    if (!fs.existsSync(codexDestDir)) {
      fs.mkdirSync(codexDestDir, { recursive: true });
    }
    // .claude 디렉토리 생성 (없으면)
    if (!fs.existsSync(claudeDestDir)) {
      fs.mkdirSync(claudeDestDir, { recursive: true });
    }

    // Codex용 파일 복사 → AGENTS.md
    const codexSrcPath = path.join(agentsDir, mode.codex.file);
    const codexDestPath = path.join(codexDestDir, 'AGENTS.md');
    fs.copyFileSync(codexSrcPath, codexDestPath);

    // Claude용 파일 복사 → CLAUDE.md
    const claudeSrcPath = path.join(agentsDir, mode.claude.file);
    const claudeDestPath = path.join(claudeDestDir, 'CLAUDE.md');
    fs.copyFileSync(claudeSrcPath, claudeDestPath);

    // 설정 저장
    config.agentMode = {
      mode: selectedMode,
      codex: mode.codex.displayName,
      claude: mode.claude.displayName
    };
    saveConfig(config);

  } catch (error) {
    console.error(chalk.red.bold(`Agent 모드 설정 실패: ${error.message}`));
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

const menuChoices = [
  ...actions.map(action => ({
    name: action.name,
    value: action.key
  })),
  { name: 'Agent 모드 설정', value: 'setup_agent_mode' },
  { name: '최고성능 활성화', value: 'setup_high_performance' },
  { name: 'Copy Multi-Agent Prompt', value: 'copy-multi-agent-prompt' }
];


async function main() {
  // 설정 로드
  let config = loadConfig();
  
  // 최초 실행 시 최고성능모드 물어보기
  if (!config || config.initialized !== true) {
    const enableHighPerformance = await confirm({
      message: '"최고성능모드"를 활성화 하시겠습니까?',
      default: true
    });
    
    if (enableHighPerformance) {
      // 다중 선택으로 agent 선택
      const selectedAgents = await checkbox({
        message: '설정을 적용할 에이전트를 선택하세요 (스페이스바로 선택 / 엔터로 완료)',
        instructions: false,
        choices: agentChoices
      });
      
      if (selectedAgents.length > 0) {
        console.log(chalk.cyan('설정 파일을 복사합니다...\n'));
        setupAgentConfigs(selectedAgents);
        console.log(chalk.green.bold('최고성능모드가 활성화되었습니다!\n'));
      } else {
        console.log(chalk.yellow.bold('선택된 에이전트가 없습니다.\n'));
      }
      
      config = { initialized: true, highPerformanceMode: true, selectedAgents };
    } else {
      console.log(chalk.yellow.bold('최고 성능 모드가 비활성화되었습니다.\n'));
      config = { initialized: true, highPerformanceMode: false, selectedAgents: [] };
    }
    
    saveConfig(config);
  }

  // 현재 Agent 모드 상태 표시
  const agentModeStatus = getAgentModeStatus(config);
  if (agentModeStatus) {
    console.log(chalk.cyan.bold(`\n[Active Agent Mode] ${agentModeStatus}\n`));
  }

  const selection = await select({
    message: '실행할 명령을 선택하세요',
    choices: menuChoices
  });

  if (selection === 'copy-multi-agent-prompt') {
    const MULTI_AGENT_PROMPT = `너는 퀀트 5년차 Senior Quant Trading Engineer 이야. 시장에 대해서 매우 잘알고 코드가 어떻게 돌아가는지에 대해서 그 누구보다도 잘알고 실수하나 없는 완벽한 Engineer이야.
    하지만 그 누구도 실수가 아예 없을 수 없으며 더 좋은 코드와 알고리즘을 만들기 위해 Principal Engineer 와 Staff Engineer와 함께 개발을 진행하고 있어.
    아래에 있는 Instruction을 완벽하게 파악하고 수정을 실행하기 전에 Principal Engineer 와 Staff Engineer 와 함께 검토를 거쳐야 해.
    { Princial Engineer: gemini -p "TEXT" --model gemini-2.5-pro 2>/dev/null, Staff Engineer: claude --model opus -p "TEXT" } 를 통해서 의견을 얻을 수 있어.

    
    너의 의견을 매우매우 디테일하게 정리해서 물어보고 만약 만장일치가 나오지 않는다면 왜 그렇게 생각하는지 다시 물어보고 토론을 거쳐서 만장일치가 나올때까지 이 과정을 반복해줘.
    만약 그 과정에서 너나 상대방이 혹시라도 틀렸거나 모호하다면 다시 수정안을 검토하고 토론 과정을 거쳐서 Best 답안을 도출해줘.
    DO NOT REVISE THE CODE BEFORE PRINCIPAL ENGINEER AND STAFF ENGINEER'S APPROVAL.
    참고로 살펴봐야할 항목들이 여러개라면 Princial Engineer와 Staff Engineer 에게 한번에 물어보지말고 하나하나씩 물어봐줘. 그리고 물어볼때는 꼭!! 파일 경로를 명시해줘야해.

    [Prompt]`;

    try {
      clipboardy.writeSync(MULTI_AGENT_PROMPT);
      console.log(chalk.green(`"${MULTI_AGENT_PROMPT}" 문구를 클립보드에 복사했습니다`));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`클립보드 복사 실패: ${error.message}`));
      process.exit(1);
    }
  }

  // Agent 모드 설정 선택 시
  if (selection === 'setup_agent_mode') {
    await setupAgentMode();
    return main(); // 다시 메뉴로 돌아가기
  }

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
    shell: process.platform == 'win32' 
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




