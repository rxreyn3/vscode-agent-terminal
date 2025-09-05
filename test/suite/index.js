'use strict';

const path = require('path');
const Mocha = require('mocha');

function run() {
  const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 30000 });
  // Load all integration test files
  mocha.addFile(path.resolve(__dirname, 'quickpick.test.js'));
  mocha.addFile(path.resolve(__dirname, 'basic.test.js'));

  return new Promise((resolve, reject) => {
    try {
      mocha.run(failures => {
        if (failures > 0) {
          reject(new Error(`${failures} test(s) failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { run };
