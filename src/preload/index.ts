import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  invoke: (channel: string, args?: unknown): Promise<unknown> => {
    return ipcRenderer.invoke(channel, args);
  },
  on: (event: string, callback: (data: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(event, handler);
    return () => ipcRenderer.removeListener(event, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
