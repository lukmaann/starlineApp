const electron = require('electron');
console.log('Type of electron export:', typeof electron);
console.log('Is string?', typeof electron === 'string');
console.log('Keys:', Object.keys(electron));
if (typeof electron === 'string') {
    console.log('Value:', electron);
} else {
    console.log('ipcMain present?', !!electron.ipcMain);
}
console.log('Process versions:', process.versions);
process.exit(0);
