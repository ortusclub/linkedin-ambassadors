const path = require('path');

/**
 * Tell Puppeteer to download Chromium into a local directory
 * so electron-builder can bundle it into the .app.
 */
module.exports = {
  cacheDirectory: path.join(__dirname, '.chromium'),
};
