const path = require('path');
const fs = require('fs');
const { Buffer } = require('buffer');
const { promisify } = require('util');

async function genScriptContent() {
  const sourcePath = path.resolve(__dirname, './script/index.js');
  const result = await promisify(fs.readFile)(sourcePath, 'utf-8');
  return result;
}

function base64Encode(file) {
  var bitmap = fs.readFileSync(file);
  return Buffer.from(bitmap).toString('base64');
}

module.exports = {
  genScriptContent,
  base64Encode,
};
