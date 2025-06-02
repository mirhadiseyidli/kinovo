const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro to load the ESM build of the Firebase SDK
config.resolver.resolveRequest = (context, moduleImport, platform) => {
  if (moduleImport.startsWith('@firebase/')) {
    return context.resolveRequest(
      { ...context, isESMImport: true },
      moduleImport,
      platform,
    );
  }
  return context.resolveRequest(context, moduleImport, platform);
};

module.exports = config;