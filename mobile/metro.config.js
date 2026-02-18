const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude test files from bundling - they live alongside route files
// but should only be run by jest, not bundled by Metro/expo-router
config.resolver.blockList = [/\.test\.[jt]sx?$/];

module.exports = config;
