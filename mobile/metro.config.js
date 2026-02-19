const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude test files from Metro's file map crawl.
// Defense-in-depth: if a test file is accidentally placed in src/app/,
// this prevents it from entering TreeFS (requires --clear for cache bust).
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /\.test\.[jt]sx?$/,
];

module.exports = config;
