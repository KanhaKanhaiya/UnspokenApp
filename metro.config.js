const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('json')
config.resolver.sourceExts.push('cjs')

//config.resolver.unstable_enablePackageExports = false

config.resolver.resolverMainFields = ["browser", 'react-native', 'main']


module.exports = withNativewind(config, { inlineRem: 16, input: './global.css' });
