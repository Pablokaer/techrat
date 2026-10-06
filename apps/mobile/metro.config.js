// Expo SDK 52+ configures Metro for npm workspaces automatically (watchFolders = repo root,
// nodeModulesPaths = app + root node_modules). The shared @techrat/* packages are TypeScript
// source symlinked into the root node_modules, which Metro resolves natively.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
