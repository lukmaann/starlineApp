import { app, ipcMain } from 'electron';
console.log('App:', !!app);
console.log('ipcMain:', !!ipcMain);
if (app) app.quit();
