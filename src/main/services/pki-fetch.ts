import * as https from 'node:https';
import * as fs from 'node:fs';
import { SETTINGS_KEYS } from '../../shared/types/settings.types';

let cachedAgent: https.Agent | null = null;
let cachedSettings = '';

export interface SettingsReader {
  get: (key: string) => string | null | undefined;
}

/**
 * Create an HTTPS agent configured with PKI certificates from settings.
 * Returns undefined when PKI is not enabled.
 */
export function createPkiAgent(settings: SettingsReader): https.Agent | undefined {
  const enabled = settings.get(SETTINGS_KEYS.PKI_ENABLED);
  if (enabled !== 'true') return undefined;

  // Cache key to avoid recreating the agent on every request
  const cacheKey = [
    settings.get(SETTINGS_KEYS.PKI_CLIENT_CERT_PATH),
    settings.get(SETTINGS_KEYS.PKI_CLIENT_KEY_PATH),
    settings.get(SETTINGS_KEYS.PKI_CLIENT_PFX_PASSPHRASE),
    settings.get(SETTINGS_KEYS.PKI_CA_CERT_PATH),
    settings.get(SETTINGS_KEYS.PKI_REJECT_UNAUTHORIZED),
  ].join('|');

  if (cachedAgent && cachedSettings === cacheKey) return cachedAgent;

  const agentOptions: https.AgentOptions = {};

  // TLS verification
  const rejectUnauthorized = settings.get(SETTINGS_KEYS.PKI_REJECT_UNAUTHORIZED);
  agentOptions.rejectUnauthorized = rejectUnauthorized !== 'false';

  // Client certificate
  const certPath = settings.get(SETTINGS_KEYS.PKI_CLIENT_CERT_PATH);
  if (certPath && fs.existsSync(certPath)) {
    if (certPath.endsWith('.pfx') || certPath.endsWith('.p12')) {
      agentOptions.pfx = fs.readFileSync(certPath);
      const pass = settings.get(SETTINGS_KEYS.PKI_CLIENT_PFX_PASSPHRASE);
      if (pass) agentOptions.passphrase = pass;
    } else {
      agentOptions.cert = fs.readFileSync(certPath);
    }
  }

  // Client private key (PEM)
  const keyPath = settings.get(SETTINGS_KEYS.PKI_CLIENT_KEY_PATH);
  if (keyPath && fs.existsSync(keyPath)) {
    agentOptions.key = fs.readFileSync(keyPath);
  }

  // Custom CA certificate
  const caPath = settings.get(SETTINGS_KEYS.PKI_CA_CERT_PATH);
  if (caPath && fs.existsSync(caPath)) {
    agentOptions.ca = fs.readFileSync(caPath);
  }

  cachedAgent = new https.Agent(agentOptions);
  cachedSettings = cacheKey;
  return cachedAgent;
}

/**
 * Invalidate the cached agent. Call when PKI settings change.
 */
export function invalidatePkiAgent(): void {
  if (cachedAgent) {
    cachedAgent.destroy();
  }
  cachedAgent = null;
  cachedSettings = '';
}

/**
 * Apply PKI environment variables early in the process lifecycle.
 * - NODE_EXTRA_CA_CERTS for custom CA trust
 * - NODE_TLS_REJECT_UNAUTHORIZED for dev/test bypass
 *
 * These affect the global Node.js TLS stack including built-in fetch().
 */
export function applyPkiEnvironment(settings: SettingsReader): void {
  const enabled = settings.get(SETTINGS_KEYS.PKI_ENABLED);
  if (enabled !== 'true') return;

  const caPath = settings.get(SETTINGS_KEYS.PKI_CA_CERT_PATH);
  if (caPath && fs.existsSync(caPath)) {
    process.env.NODE_EXTRA_CA_CERTS = caPath;
    console.log('[PKI] Set NODE_EXTRA_CA_CERTS =', caPath);
  }

  const rejectUnauthorized = settings.get(SETTINGS_KEYS.PKI_REJECT_UNAUTHORIZED);
  if (rejectUnauthorized === 'false') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('[PKI] Set NODE_TLS_REJECT_UNAUTHORIZED = 0 (WARNING: TLS verification disabled)');
  }
}
