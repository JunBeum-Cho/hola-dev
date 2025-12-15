# hola-dev

Codex, Claude, Gemini 명령을 대화형으로 실행하는 Inquirer 기반 CLI입니다. 선택 시 고성능 설정을 홈 디렉터리에 자동 복사해 바로 쓸 수 있습니다. Node 18+가 필요합니다.

## 빠른 시작
1. 의존성 설치: `npm install`
2. 실행: `npm start` 또는 `node index.js`
3. 최초 실행 시 고성능 모드 사용 여부를 묻습니다. 허용하면 선택한 에이전트의 설정이 홈으로 복사됩니다.

## 메뉴 동작
- Codex / Claude / Gemini 실행: 해당 CLI가 없으면 `npm install -g`로 설치한 뒤 사전 정의된 옵션과 함께 실행합니다.
- 고성능 모드 설정: 저장된 구성(`configs/hola-config.json`)을 업데이트하고 선택한 에이전트의 설정 폴더를 다시 복사합니다.
- Agent 모드 설정: **현재 실행 디렉터리**에 `AGENTS.md`(Codex) / `CLAUDE.md`(Claude)를 생성해 프로젝트별로 모드를 적용합니다.

## 고성능 모드 주의
- `configs/.codex/config.toml` 등 기본 설정은 샌드박스 해제, 네트워크 전면 허용 등 위험한 옵션을 포함합니다.
- 개인 PC나 생산 환경에서는 사용하지 말고, 격리된 테스트 환경에서만 실행하세요.

## 커스터마이징
- 상태 파일: `configs/hola-config.json`에서 초기화 여부, 선택한 에이전트, 디렉터리별 Agent 모드/설치 상태를 기록합니다.
- 에이전트별 설정: `configs/.codex/`, `configs/.claude/`, `configs/.gemini/` 내용을 수정한 뒤 고성능 모드를 다시 실행하면 변경 사항이 홈 디렉터리에 반영됩니다.
