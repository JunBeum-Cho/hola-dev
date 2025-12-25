// Agent별 설정 폴더 매핑
export const agentConfigFolders = {
  codex: '.codex',
  claude: '.claude',
  gemini: '.gemini',
  crush: '.crush'
};

// Agent 모드 설정
export const agentModes = {
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
  },
  fullstack: {
    name: 'Fullstack Mode',
    codex: { file: 'senior-fullstack-engineer.md', displayName: 'Senior Fullstack Engineer' },
    claude: { file: 'staff-fullstack-engineer.md', displayName: 'Staff Fullstack Engineer' }
  }
};

// 실행 가능한 액션 목록
export const actions = [
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
  },
  {
    key: 'crush',
    name: 'Crush 실행',
    command: 'crush',
    args: ['--yolo'],
    package: '@charmland/crush'
  }
];

// 에이전트 선택 옵션
export const agentChoices = [
  { name: 'Claude', value: 'claude' },
  { name: 'Codex (GPT)', value: 'codex' },
  { name: 'Gemini', value: 'gemini' },
  { name: 'Crush', value: 'crush' }
];

// 모드 선택 옵션
export const modeChoices = [
  { name: 'Editors Mode', value: 'editors' },
  { name: 'Frontend-Designer Mode', value: 'frontend_designer' },
  { name: 'Server Engineering Mode', value: 'server_engineering' },
  { name: 'Quant Mode', value: 'quant' },
  { name: 'Fullstack Mode', value: 'fullstack' },
  { name: '초기화하기', value: 'reset' }
];

// 메뉴 선택지 생성
export const menuChoices = [
  ...actions.map(action => ({
    name: action.name,
    value: action.key
  })),
  { name: 'Agent 모드 설정', value: 'setup_agent_mode' },
  { name: '최고성능 활성화', value: 'setup_high_performance' },
  { name: 'Auth 설정', value: 'auth_settings' },
  { name: 'Copy Multi-Agent Prompt', value: 'copy-multi-agent-prompt' }
];
