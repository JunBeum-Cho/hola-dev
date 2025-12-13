import chalk from 'chalk';
import { HOLA_CONFIG } from '../constants/paths.js';
import { safeReadJSON, safeWriteJSON } from './filesystem.js';

export function loadConfig() {
  return safeReadJSON(HOLA_CONFIG.file, null);
}

export function saveConfig(config) {
  try {
    safeWriteJSON(HOLA_CONFIG.file, config);
  } catch (error) {
    console.error(chalk.red.bold(`설정 저장 실패: ${error.message}`));
  }
}

export function updateConfig(updates) {
  const config = loadConfig() || {};
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}

export function isInitialized() {
  const config = loadConfig();
  return config && config.initialized === true;
}
