export {};

declare global {
  interface Window {
    electronAPI?: {
      updater?: {
        getStatus: () => Promise<any>;
        checkForUpdates: () => Promise<any>;
        downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
        quitAndInstall: () => Promise<{ success: boolean; message?: string }>;
      };
    };
  }
}
