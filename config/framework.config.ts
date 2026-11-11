export interface FrameworkConfig {
  browser: 'chromium' | 'firefox' | 'webkit' | 'edge';
  headless: boolean;
  slowMo: number;
  environment: string;
  baseUrl: string;
  loginUrl: string;
  apiBaseUrl: string;
  baseUsername: string;
  basePassword: string;
  dealerType: string;
  dealerName: string;
  useSessionStorage: boolean;
  alreadySessionStorageAvailable: boolean;
  screenshotMode: 'each-step' | 'each-script' | 'only-on-failure' | 'off';
  traceMode: 'on' | 'off' | 'on-first-retry' | 'retain-on-failure';
  videoMode: 'on' | 'off' | 'retain-on-failure' | 'on-first-retry';
  defaultTimeout: number;
  navigationTimeout: number;
  expectTimeout: number;
  retries: number;
  workers: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getNumEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

export const frameworkConfig: FrameworkConfig = {
  browser: getEnvVar('BROWSER', 'chromium') as FrameworkConfig['browser'],
  headless: getBoolEnv('HEADLESS', true),
  slowMo: getNumEnv('SLOW_MO', 0),
  environment: getEnvVar('ENVIRONMENT', 'qa'),
  baseUrl: getEnvVar('BASE_URL', ''),
  loginUrl: getEnvVar('LOGIN_URL', ''),
  apiBaseUrl: getEnvVar('API_BASE_URL', ''),
  baseUsername: getEnvVar('BASE_USERNAME', ''),
  basePassword: getEnvVar('BASE_PASSWORD', ''),
  dealerType: getEnvVar('DEALER_TYPE', 'dealer1'),
  dealerName: getEnvVar('DEALER_NAME', 'Dealer One'),
  useSessionStorage: getBoolEnv('USE_SESSION_STORAGE', false),
  alreadySessionStorageAvailable: getBoolEnv('ALREADY_SESSION_STORAGE_AVAILABLE', false),
  screenshotMode: getEnvVar('SCREENSHOT_MODE', 'only-on-failure') as FrameworkConfig['screenshotMode'],
  traceMode: getEnvVar('TRACE_MODE', 'on-first-retry') as FrameworkConfig['traceMode'],
  videoMode: getEnvVar('VIDEO_MODE', 'off') as FrameworkConfig['videoMode'],
  defaultTimeout: getNumEnv('DEFAULT_TIMEOUT', 30000),
  navigationTimeout: getNumEnv('NAVIGATION_TIMEOUT', 60000),
  expectTimeout: getNumEnv('EXPECT_TIMEOUT', 10000),
  retries: getNumEnv('RETRIES', 1),
  workers: getNumEnv('WORKERS', 4),
};
