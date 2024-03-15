const { register } = require('module');
const { pathToFileURL } = require('url');

register('./hooks.js', pathToFileURL(__filename));
