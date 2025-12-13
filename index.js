#!/usr/bin/env node
import { select, checkbox, confirm, input } from '@inquirer/prompts';
import { spawn, execSync } from 'child_process';
import commandExists from 'command-exists';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import clipboardy from 'clipboardy';

// 모듈 import
import { homeDir, configDir, agentsDir, AGENT_PATHS } from './src/constants/paths.js';
import { ensureDir, copyFolderRecursive, fileExists, deleteFileIfExists } from './src/utils/filesystem.js';
import { loadConfig, saveConfig } from './src/config/configManager.js';
import {
  agentConfigFolders,
  agentModes,
  actions,
  agentChoices,
  modeChoices,
  menuChoices
} from './src/constants/agentModes.js';

// GitHub에서 최신 커밋 시간 가져오기
async function getLatestCommitTime() {
  try {
    const response = await fetch(`https://api.github.com/repos/JunBeum-Cho/hola-dev/commits/main`);
    if (!response.ok) {
      throw new Error(`GitHub API 응답 오류: ${response.status}`);
    }
    const data = await response.json();
    return new Date(data.commit.committer.date).getTime();
  } catch (error) {
    console.error(chalk.yellow(`업데이트 확인 실패: ${error.message}`));
    return null;
  }
}

// 패키지 업데이트 및 재실행
async function updateAndRestart() {
  console.log(chalk.cyan('\n업데이트를 진행할게요'));

  try {
    execSync(`npm install -g https://github.com/JunBeum-Cho/hola-dev`, { stdio: 'inherit' });
    console.log(chalk.green.bold('\n업데이트 완료! 재실행할게요\n'));

    const child = spawn(process.argv[0], process.argv.slice(1), {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

    return true;
  } catch (error) {
    console.error(chalk.red(`업데이트 실패: ${error.message}`));
    console.log(chalk.yellow('기존 버전으로 계속 진행합니다.\n'));
    return false;
  }
}

// 업데이트 확인
async function checkForUpdates() {
  let config = loadConfig() || {};

  if (!config.lastCheckedTimestamp) {
    config.lastCheckedTimestamp = Date.now();
    saveConfig(config);
    return false;
  }

  const latestCommitTime = await getLatestCommitTime();
  if (!latestCommitTime) {
    return false;
  }

  if (latestCommitTime > config.lastCheckedTimestamp) {
    const shouldUpdate = await confirm({
      message: '새로운 업데이트가 있습니다. 업데이트하시겠습니까?',
      default: true
    });

    if (shouldUpdate) {
      config.lastCheckedTimestamp = latestCommitTime;
      saveConfig(config);
      return await updateAndRestart();
    } else {
      config.lastCheckedTimestamp = latestCommitTime;
      saveConfig(config);
    }
  }

  return false;
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

async function setupHighPerformanceMode() {
  const selectedAgents = await checkbox({
    message: '설정을 적용할 에이전트를 선택하세요 (스페이스바로 선택 / 엔터로 완료)',
    instructions: false,
    choices: agentChoices
  });

  if (selectedAgents.length > 0) {
    console.log(chalk.cyan('\n설정 파일을 복사합니다...\n'));
    setupAgentConfigs(selectedAgents);
    console.log(chalk.green.bold('최고성능모드가 활성화되었습니다!\n'));

    let config = loadConfig() || {};
    config.initialized = true;
    config.highPerformanceMode = true;
    config.selectedAgents = selectedAgents;
    saveConfig(config);
  } else {
    console.log(chalk.yellow.bold('선택된 에이전트가 없습니다.\n'));
  }
}

async function setupAuthSettings() {
  const authAction = await select({
    message: 'Auth 작업을 선택하세요',
    choices: [
      { name: 'Auth 추출', value: 'extract' },
      { name: 'Auth 주입', value: 'inject' }
    ]
  });

  const authAgentChoices = [
    { name: 'Codex', value: 'codex' },
    { name: 'Claude', value: 'claude' },
    { name: 'Gemini (미구현)', value: 'gemini', disabled: true }
  ];

  const selectedAgent = await select({
    message: 'Agent를 선택하세요',
    choices: authAgentChoices
  });

  const targetPath = selectedAgent === 'codex'
    ? AGENT_PATHS.codex.auth
    : AGENT_PATHS.claude.credentials;

  if (authAction === 'extract') {
    try {
      if (!fileExists(targetPath)) {
        console.error(chalk.red(`파일이 존재하지 않습니다: ${targetPath}`));
        return;
      }
      const content = fs.readFileSync(targetPath, 'utf8');
      const singleLineContent = JSON.stringify(JSON.parse(content));
      clipboardy.writeSync(singleLineContent);
      console.log(chalk.green(`${selectedAgent} 인증 정보를 클립보드에 복사했습니다.`));
      console.log(chalk.gray(`경로: ${targetPath}`));
    } catch (error) {
      console.error(chalk.red(`파일 읽기 실패: ${error.message}`));
    }
  } else {
    const authContent = await input({
      message: `${selectedAgent} 인증 정보를 붙여넣으세요:`
    });

    if (!authContent || authContent.trim() === '') {
      console.log(chalk.yellow('입력이 취소되었습니다.'));
      return;
    }

    try {
      const dir = path.dirname(targetPath);
      ensureDir(dir);
      fs.writeFileSync(targetPath, authContent, 'utf8');
      console.log(chalk.green(`${selectedAgent} 인증 정보를 저장했습니다.`));
      console.log(chalk.gray(`경로: ${targetPath}`));
    } catch (error) {
      console.error(chalk.red(`파일 저장 실패: ${error.message}`));
    }
  }
}

async function setupAgentMode() {
  const config = loadConfig() || {};

  const currentStatus = getAgentModeStatus(config);
  if (currentStatus) {
    console.log(chalk.cyan(`\n현재 Agent 모드: ${currentStatus}\n`));
  }

  const selectedMode = await select({
    message: 'Agent 모드를 선택하세요',
    choices: modeChoices
  });

  if (selectedMode === 'reset') {
    try {
      if (deleteFileIfExists(AGENT_PATHS.codex.agents)) {
        console.log(chalk.green('~/.codex/AGENTS.md 삭제 완료'));
      }
      if (deleteFileIfExists(AGENT_PATHS.claude.config)) {
        console.log(chalk.green('~/.claude/CLAUDE.md 삭제 완료'));
      }

      const updatedConfig = { ...config };
      delete updatedConfig.agentMode;
      saveConfig(updatedConfig);

      console.log(chalk.green.bold('\nAgent 모드가 초기화되었습니다!\n'));
    } catch (error) {
      console.error(chalk.red.bold(`초기화 실패: ${error.message}`));
    }
    return;
  }

  const mode = agentModes[selectedMode];

  try {
    ensureDir(AGENT_PATHS.codex.dir);
    ensureDir(AGENT_PATHS.claude.dir);

    const codexSrcPath = path.join(agentsDir, mode.codex.file);
    fs.copyFileSync(codexSrcPath, AGENT_PATHS.codex.agents);

    const claudeSrcPath = path.join(agentsDir, mode.claude.file);
    fs.copyFileSync(claudeSrcPath, AGENT_PATHS.claude.config);

    const updatedConfig = {
      ...config,
      agentMode: {
        mode: selectedMode,
        codex: mode.codex.displayName,
        claude: mode.claude.displayName
      }
    };
    saveConfig(updatedConfig);
  } catch (error) {
    console.error(chalk.red.bold(`Agent 모드 설정 실패: ${error.message}`));
  }
}

async function main() {
  const restarted = await checkForUpdates();
  if (restarted) {
    return;
  }

  let config = loadConfig();

  if (!config || config.initialized !== true) {
    const enableHighPerformance = await confirm({
      message: '"최고성능모드"를 활성화 하시겠습니까?',
      default: true
    });

    if (enableHighPerformance) {
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

  if (selection === 'setup_agent_mode') {
    await setupAgentMode();
    return main();
  }

  if (selection === 'setup_high_performance') {
    await setupHighPerformanceMode();
    return main();
  }

  if (selection === 'auth_settings') {
    await setupAuthSettings();
    return main();
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
