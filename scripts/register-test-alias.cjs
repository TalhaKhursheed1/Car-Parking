const Module = require('module');
const path = require('path');

const compiledSrcRoot = path.join(__dirname, '..', '.tmp', 'tests', 'src');
const originalResolveFilename = Module._resolveFilename;

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
}

if (!process.env.MONGODB_DB) {
  process.env.MONGODB_DB = 'test-db';
}

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const withoutAlias = request.slice(2);
    const candidate = path.join(compiledSrcRoot, withoutAlias);
    return originalResolveFilename.call(this, candidate, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

