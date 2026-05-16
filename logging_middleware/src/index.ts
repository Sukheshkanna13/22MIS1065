import * as path from 'path';

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // dotenv not available in browser/edge runtimes — env vars injected by bundler
}

const BASE_URL = 'http://4.224.186.213';
const LOG_ENDPOINT = `${BASE_URL}/evaluation-service/logs`;
const AUTH_ENDPOINT = `${BASE_URL}/evaluation-service/auth`;

type Stack = 'backend' | 'frontend';
type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type BackendPackage = 'cache' | 'controller' | 'cron_job' | 'db' | 'domain' | 'handler' | 'repository' | 'route' | 'service';
type FrontendPackage = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';
type SharedPackage = 'auth' | 'config' | 'middleware' | 'utils';
type Package = BackendPackage | FrontendPackage | SharedPackage;

interface TokenStore {
  accessToken: string;
  expiresAt: number;
}

interface Config {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

const configFromEnv = (): Config => {
  const email = process.env.LOG_EMAIL || '';
  const name = process.env.LOG_NAME || '';
  const rollNo = process.env.LOG_ROLL_NO || '';
  const accessCode = process.env.LOG_ACCESS_CODE || '';
  const clientID = process.env.LOG_CLIENT_ID || '';
  const clientSecret = process.env.LOG_CLIENT_SECRET || '';
  return { email, name, rollNo, accessCode, clientID, clientSecret };
};

let _tokenStore: TokenStore | null = null;

async function fetchToken(config: Config): Promise<string> {
  const body = JSON.stringify({
    email: config.email,
    name: config.name,
    rollNo: config.rollNo,
    accessCode: config.accessCode,
    clientID: config.clientID,
    clientSecret: config.clientSecret,
  });

  const res = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenStore = {
    accessToken: data.access_token,
    expiresAt: data.expires_in,
  };
  return data.access_token;
}

async function getToken(): Promise<string> {
  const config = configFromEnv();
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (_tokenStore && _tokenStore.expiresAt > nowSeconds + 60) {
    return _tokenStore.accessToken;
  }

  return fetchToken(config);
}

async function postLog(stack: Stack, level: Level, pkg: Package, message: string): Promise<void> {
  const token = await getToken();

  const body = JSON.stringify({
    stack,
    level,
    package: pkg,
    message,
  });

  const res = await fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    if (res.status === 401) {
      const config = configFromEnv();
      const newToken = await fetchToken(config);
      const retryRes = await fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body,
      });
      if (!retryRes.ok) {
        throw new Error(`Log POST failed after token refresh: ${retryRes.status}`);
      }
      return;
    }
    throw new Error(`Log POST failed: ${res.status}`);
  }
}

export async function Log(stack: Stack, level: Level, pkg: Package, message: string): Promise<void> {
  try {
    await postLog(stack, level, pkg, message);
  } catch (err: unknown) {
    try {
      const config = configFromEnv();
      await fetchToken(config);
      await postLog(stack, level, pkg, message);
    } catch (retryErr: unknown) {
      const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      process.stderr.write(`[logging_middleware] Failed to post log: ${errMsg}\n`);
    }
  }
}
