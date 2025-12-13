# Hola-Dev 리팩토링 계획 (Phase 1)

## 현재 상태 분석

### 문제점 요약
| 문제 | 현황 | 심각도 |
|------|------|--------|
| 모놀리식 구조 | 598줄 단일 파일 (index.js) | 높음 |
| 코드 중복 | 경로 패턴 6회, 디렉토리 생성 5회 반복 | 높음 |

### 주요 중복 패턴
- `path.join(homeDir, '.codex/.claude')` - 6회 반복
- `fs.mkdirSync(..., { recursive: true })` - 5회 반복
- `fs.existsSync()` 체크 - 10회 반복

---

## 리팩토링 작업 목록

### Step 1: 상수 및 경로 중앙화
**생성**: `src/constants/paths.js`
```javascript
import os from 'os';
import path from 'path';

const homeDir = os.homedir();

export const PATHS = {
  home: homeDir,
  codex: {
    dir: path.join(homeDir, '.codex'),
    agents: path.join(homeDir, '.codex', 'AGENTS.md'),
    auth: path.join(homeDir, '.codex', 'auth.json'),
  },
  claude: {
    dir: path.join(homeDir, '.claude'),
    config: path.join(homeDir, '.claude', 'CLAUDE.md'),
    credentials: path.join(homeDir, '.claude', '.credentials.json'),
  },
  gemini: {
    dir: path.join(homeDir, '.gemini'),
  },
  hola: {
    configDir: path.join(homeDir, '.hola'),
    configFile: path.join(homeDir, '.hola', 'hola-config.json'),
  }
};
```

---

### Step 2: 파일 시스템 유틸리티
**생성**: `src/utils/filesystem.js`
```javascript
import fs from 'fs';
import path from 'path';

// 디렉토리 생성 (중복 5회 제거)
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// JSON 파일 안전하게 읽기
export function safeReadJSON(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    // 파싱 실패 시 기본값 반환
  }
  return defaultValue;
}

// JSON 파일 안전하게 쓰기
export function safeWriteJSON(filePath, data) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 파일 존재 확인
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// 폴더 재귀 복사 (기존 함수 이동)
export function copyFolderRecursive(src, dest) {
  ensureDir(dest);
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
}
```

---

### Step 3: 설정 관리 모듈
**생성**: `src/config/configManager.js`
```javascript
import { PATHS } from '../constants/paths.js';
import { safeReadJSON, safeWriteJSON } from '../utils/filesystem.js';

const DEFAULT_CONFIG = {
  initialized: false,
  highPerformanceMode: false,
  selectedAgents: [],
  lastCheckedTimestamp: null,
  agentMode: null
};

export function loadConfig() {
  return safeReadJSON(PATHS.hola.configFile, DEFAULT_CONFIG);
}

export function saveConfig(config) {
  safeWriteJSON(PATHS.hola.configFile, config);
}

export function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}
```

---

### Step 4: 에이전트 상수 분리
**생성**: `src/constants/agentModes.js`
```javascript
export const agentConfigFolders = {
  codex: '.codex',
  claude: '.claude',
  gemini: '.gemini'
};

export const agentModes = {
  editors: {
    name: 'Editors (편집자 모드)',
    codex: { file: 'senior-editor.md', displayName: 'Senior Editor' },
    claude: { file: 'chief-editor.md', displayName: 'Chief Editor' }
  },
  frontend_designer: {
    name: 'Frontend/Designer (프론트엔드/디자인 모드)',
    codex: { file: 'principal-frontend-engineer.md', displayName: 'Principal Frontend Engineer' },
    claude: { file: 'staff-designer.md', displayName: 'Staff Designer' }
  },
  server_engineering: {
    name: 'Server Engineering (서버 엔지니어링 모드)',
    codex: { file: 'senior-server-engineer.md', displayName: 'Senior Server Engineer' },
    claude: { file: 'staff-server-engineer.md', displayName: 'Staff Server Engineer' }
  },
  quant: {
    name: 'Quant (퀀트 트레이딩 모드)',
    codex: { file: 'senior-quant-engineer.md', displayName: 'Senior Quant Engineer' },
    claude: { file: 'head-of-quant.md', displayName: 'Head of Quant' }
  }
};

export const actions = [
  {
    key: 'codex',
    name: 'Codex',
    command: 'codex',
    args: [],
    package: '@openai/codex'
  },
  {
    key: 'claude',
    name: 'Claude',
    command: 'claude',
    args: [],
    package: '@anthropic-ai/claude-code'
  },
  {
    key: 'gemini',
    name: 'Gemini',
    command: 'gemini',
    args: [],
    package: '@anthropic-ai/claude-code' // 실제 패키지로 수정 필요
  }
];
```

---

### Step 5: index.js 수정
- 새 모듈들을 import
- 중복 코드를 유틸리티 함수 호출로 대체

```javascript
// 변경 전
import os from 'os';
const homeDir = os.homedir();
const configDir = path.join(homeDir, '.hola');
// ... 중복된 경로 패턴들

// 변경 후
import { PATHS } from './src/constants/paths.js';
import { ensureDir, copyFolderRecursive, fileExists } from './src/utils/filesystem.js';
import { loadConfig, saveConfig, updateConfig } from './src/config/configManager.js';
import { agentModes, agentConfigFolders, actions } from './src/constants/agentModes.js';
```

---

## 결과 구조
```
hola-dev/
├── src/
│   ├── constants/
│   │   ├── paths.js          # 경로 상수
│   │   └── agentModes.js     # 에이전트 관련 상수
│   ├── utils/
│   │   └── filesystem.js     # 파일 시스템 유틸리티
│   └── config/
│       └── configManager.js  # 설정 관리
├── index.js (축소됨 ~450줄)
├── agents/
├── configs/
└── package.json
```

---

## 예상 효과

| 지표 | 현재 | Phase 1 후 |
|------|------|-----------|
| index.js 줄 수 | 598 | ~450 |
| 모듈 수 | 1 | 5 |
| 코드 중복 | 높음 | 낮음 |
| 유지보수성 | 낮음 | 높음 |

---

## 향후 개선 방향 (Phase 2+)

1. **기능별 모듈 분리**: updateChecker, authManager, agentModeManager 등
2. **에러 처리 표준화**: 커스텀 에러 클래스, 통일된 로깅
3. **TypeScript 도입**: 타입 안전성 확보
4. **테스트 추가**: Vitest로 단위 테스트 작성
