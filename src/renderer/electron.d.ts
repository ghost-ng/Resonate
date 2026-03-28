import type { IpcChannelMap, IpcEventMap } from '../shared/types/ipc.types';

interface ElectronAPI {
  invoke: <C extends keyof IpcChannelMap>(
    channel: C,
    args: IpcChannelMap[C]['args']
  ) => Promise<IpcChannelMap[C]['result']>;
  on: <E extends keyof IpcEventMap>(
    event: E,
    callback: (data: IpcEventMap[E]) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
