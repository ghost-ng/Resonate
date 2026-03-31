import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as fs from 'fs';
import * as path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/{better-sqlite3,native-recorder-nodejs}/**/*.{node,dll}',
    },
    icon: './resources/icon',
    extraResource: [
      './resources/whisper',
    ],
    // Exclude unnecessary files to reduce size
    ignore: [
      /^\/src\//,
      /^\/docs\//,
      /^\/\.github\//,
      /^\/\.gitattributes$/,
      /^\/\.gitignore$/,
      /^\/\.eslintrc/,
      /^\/tsconfig/,
      /^\/vite\..+\.config/,
      /^\/tailwind\.config/,
      /^\/postcss\.config/,
      /^\/yourecord-ui-playground/,
      /^\/README\.md$/,
    ],
    // Hook to strip non-English locales after packaging
    afterCopy: [
      (buildPath: string, _electronVersion: string, _platform: string, _arch: string, callback: (err?: Error | null) => void) => {
        const localesDir = path.join(buildPath, '..', 'locales');
        if (fs.existsSync(localesDir)) {
          const keep = new Set(['en-US.pak', 'en-GB.pak']);
          for (const file of fs.readdirSync(localesDir)) {
            if (!keep.has(file)) {
              try { fs.unlinkSync(path.join(localesDir, file)); } catch { /* ignore */ }
            }
          }
          console.log('[Forge] Stripped non-English locales');
        }
        callback();
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ iconUrl: 'file://resources/icon.ico', setupIcon: './resources/icon.ico' }),
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
