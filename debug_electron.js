const electron = require('electron');
console.log('require.resolve:', require.resolve('electron'));
console.log('process.versions:', process.versions);
console.log('Electron keys:', Object.keys(electron));
try {
    console.log('ipcMain type:', typeof electron.ipcMain);
} catch (e) {
    console.log('Error accessing ipcMain:', e);
}
