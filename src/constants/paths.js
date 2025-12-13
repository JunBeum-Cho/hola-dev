import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 (src/constants에서 두 단계 위)
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

export const homeDir = os.homedir();

// 설정 디렉토리 (패키지 내부)
export const configDir = path.join(PROJECT_ROOT, 'configs');
export const agentsDir = path.join(PROJECT_ROOT, 'agents');

// Agent별 홈 디렉토리 경로
export const AGENT_PATHS = {
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
  }
};

// Hola 설정 파일 경로
export const HOLA_CONFIG = {
  dir: configDir,
  file: path.join(configDir, 'hola-config.json'),
};
