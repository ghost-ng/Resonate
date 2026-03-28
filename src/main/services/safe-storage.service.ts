let safeStorage: typeof import('electron').safeStorage | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  safeStorage = require('electron').safeStorage;
} catch {
  // Electron not available (e.g. in unit tests)
}

export class SafeStorageService {
  encrypt(plaintext: string): string {
    if (!this.isAvailable()) {
      console.warn(
        'SafeStorage: encryption unavailable — storing value as plain base64'
      );
      return Buffer.from(plaintext, 'utf-8').toString('base64');
    }
    const buffer = safeStorage!.encryptString(plaintext);
    return buffer.toString('base64');
  }

  decrypt(encrypted: string): string {
    if (!this.isAvailable()) {
      console.warn(
        'SafeStorage: decryption unavailable — treating value as plain base64'
      );
      return Buffer.from(encrypted, 'base64').toString('utf-8');
    }
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage!.decryptString(buffer);
  }

  isAvailable(): boolean {
    try {
      return safeStorage?.isEncryptionAvailable() ?? false;
    } catch {
      return false;
    }
  }
}
