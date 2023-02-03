// // require('dotenv').config();
// const { notarize } = require('electron-notarize');

// exports.default = async function notarizing(context) {
//   const { electronPlatformName, appOutDir } = context;
//   if (electronPlatformName !== 'darwin') {
//     return;
//   }

//   const appName = context.packager.appInfo.productFilename;
//   let appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
//   if (!fs.existsSync(appPath)) {
//     throw new Error(`Cannot find application at: ${appPath}`);
//   }

//   console.log(`Notarizing ${appId} found at ${appPath}`);

//   return await notarize({
//     appBundleId: 'edu.weill.ClockIn',
//     // appPath: `${appOutDir}/${appName}.app`,
//     appPath: appPath,
//     appleId: 'rpp4001@med.cornell.edu',
//     appleIdPassword: 'bcwq-jcvj-prbj-opvr',
//   });
// };


const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function (params) {
    // Only notarize the app on Mac OS only.
    if (process.platform !== 'darwin') {
        return;
    }
    console.log('afterSign hook triggered', params);

    // Same appId in electron-builder.
    let appId = 'edu.weill.ClockIn'

    let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await electron_notarize.notarize({
            appBundleId: appId,
            appPath: appPath,
            ascProvider: 'N7T323633C',
            appleId: 'sut2008@med.cornell.edu',
            appleIdPassword: 'enej-byod-rims-zkud',
        });
    } catch (error) {
        console.error(error);
    }

    console.log(`Done notarizing ${appId}`);
};