import { Browser, chromium, firefox, webkit, type FullConfig } from '@playwright/test';
import { frameworkConfig } from './config/framework.config';
import { SessionManager } from './utils/session-manager';
import { LoginPage } from './pages/login.page';

async function globalSetup(config: FullConfig): Promise<void> {
  if (!frameworkConfig.useSessionStorage) return;
  if (frameworkConfig.alreadySessionStorageAvailable && SessionManager.sessionStorageExists()) return;

  let browser: Browser | undefined;

  switch (frameworkConfig.browser) {
    case 'chromium':
      browser = await chromium.launch({ headless: frameworkConfig.headless, args: ['--start-maximized'] });
      break;
    case 'firefox':
      browser = await firefox.launch({ headless: frameworkConfig.headless, args: ['--start-maximized'] });
      break;
    case 'webkit':
      browser = await webkit.launch({ headless: frameworkConfig.headless, args: ['--start-maximized'] });
      break;
    case 'edge':
      browser = await chromium.launch({
        channel: 'msedge',
        headless: frameworkConfig.headless,
        args: ['--start-maximized'],
      });
      break;
    default:
      throw new Error(`Unsupported browser specified in configuration: ${frameworkConfig.browser}`);
  }

  if (!browser) throw new Error('Browser failed to launch');

  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();

  const loginPage = new LoginPage(page);

  try {
    await loginPage.goToLoginPage(frameworkConfig.baseUrl);

    await loginPage.login(frameworkConfig.baseUsername, frameworkConfig.basePassword);

    if (frameworkConfig.useSessionStorage) {
      await page.waitForURL((url) => url.href.startsWith(frameworkConfig.baseUrl), {
        timeout: frameworkConfig.navigationTimeout,
      });
      await page.waitForFunction(
        () => {
          const raw = localStorage.getItem('okta-token-storage');
          if (!raw) return false;
          try {
            return Object.keys(JSON.parse(raw)).length > 0;
          } catch {
            return false;
          }
        },
        { timeout: frameworkConfig.navigationTimeout },
      );

      await SessionManager.saveSessionStorage(page);
    }
  } finally {
     await context.close();
     await browser.close();
  }
}

export default globalSetup;
