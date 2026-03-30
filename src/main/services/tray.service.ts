import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';

/**
 * Creates and manages the system tray icon and menu.
 */
export class TrayService {
  private tray: Tray | null = null;
  private isRecording = false;

  constructor(private mainWindow: BrowserWindow) {}

  /**
   * Create the tray icon and context menu.
   */
  create(): void {
    // Generate a simple 16x16 colored square icon
    const icon = this.createIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Resonate');

    this.buildMenu();

    // Toggle window visibility on tray click
    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  /**
   * Update the tray to reflect recording state.
   */
  updateRecordingState(isRecording: boolean): void {
    this.isRecording = isRecording;
    if (this.tray) {
      this.tray.setToolTip(isRecording ? 'Resonate — Recording...' : 'Resonate');
      this.tray.setImage(this.createIcon());
      this.buildMenu();
    }
  }

  /**
   * Destroy the tray icon.
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private buildMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Resonate',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: this.isRecording ? 'Stop Recording' : 'Start Recording',
        click: () => {
          this.mainWindow.webContents.send(
            'tray:toggle-recording',
            !this.isRecording
          );
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Create a 16x16 nativeImage — red when recording, blue otherwise.
   */
  private createIcon(): Electron.NativeImage {
    const size = 16;
    const channels = 4; // RGBA
    const buffer = Buffer.alloc(size * size * channels);

    const r = this.isRecording ? 0xff : 0x6c;
    const g = this.isRecording ? 0x33 : 0x5c;
    const b = this.isRecording ? 0x33 : 0xfc;

    for (let i = 0; i < size * size; i++) {
      const offset = i * channels;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = 0xff; // alpha
    }

    return nativeImage.createFromBuffer(buffer, {
      width: size,
      height: size,
    });
  }
}
