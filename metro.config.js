const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

for (const extension of ['pmtiles', 'routing', 'wasm']) {
  if (!config.resolver.assetExts.includes(extension)) config.resolver.assetExts.push(extension);
}

// SQLite's web worker needs SharedArrayBuffer and an isolated browser context.
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhancedMiddleware = enhanceMiddleware
    ? enhanceMiddleware(middleware, server)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

module.exports = config;
