const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Note: removed overly aggressive blockList that was blocking
// react-native's nested @react-native/* dependencies

module.exports = config;
