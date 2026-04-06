const { notarize } = require('@electron/notarize');

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = packager.appInfo.productFilename;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping macOS notarization: Apple credentials are not fully configured.');
    return;
  }

  console.log(`Submitting ${appName}.app for macOS notarization...`);

  await notarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  });

  console.log('macOS notarization completed.');
};
