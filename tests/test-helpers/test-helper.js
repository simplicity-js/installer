"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const util = require("node:util");
const sinon = require("sinon");
const chai = () => import("chai").then(chai => chai);
const { createDirectory, createFile, isDirectory, isEmpty, pathExists
} = require("../../src/helpers/file-system");
const { print } = require("../../src/helpers/printer");

const testsDir = path.resolve(__dirname, "..").replace(/\\/g, "/");
const logDir  = `${testsDir}/.logs`;
const logFile = `${logDir}/console.log`;
const errFile = `${logDir}/console.error`;

after(function(done) {
  /*
   * Ensure output is flushed before exiting.
   * https://github.com/nodejs/node-v0.x-archive/issues/8329#issuecomment-54778937
   */
  process.nextTick(() => process.exit(0));
  done();
});

(createDirectory(logDir) && createFile(logFile) && createFile(errFile)) || process.exit(1);

function exec(command, args) {
  args = args || [];

  return new Promise((resolve, reject) => {
    let output = "";
    const start = Date.now();

    const ps = childProcess.spawn(command, args, {
      shell: true,
      env: { ...process.env, NODE_ENV: "test" },
    });

    ps.stdout.on("data", (data) => output += data);
    ps.stderr.on("data", (data) => output += data);
    ps.on("error", (err) => reject(err.toString()));
    ps.on("exit", (code, signal) => {
      const duration = Date.now() - start;
      resolve({ code, signal, duration });
    });

    ps.on("close", (code) => {
      if(code === 0) {
        print(output);
        resolve(output);
      } else {
        print(output);
        reject(output);
      }
    });
  });
};

function normalizeHelpManual(manual) {
  return manual.replace(/\r?\n/gm, "");
}

function spyOnConsoleOutput(object = "stdout") {
  object = `_${object}`;

  const originalMethod = console[object].write.bind(console[object]);

  // Overwrite the console._stdout.write used by our printer object internally.
  // So that it doesn't write to the actual console, cluttering our screen.
  // Instead, it writes to an output file.
  console[object].write = function() {
    fs.appendFileSync(logFile, util.inspect(arguments, { depth: 12 }));
  };

  // Handle any console error output
  // that might arise from pacakges we have no control over.
  const oldConsoleError = console.error;
  console.error = function() {
    fs.appendFileSync(errFile, util.inspect(arguments, { depth: 12 }));
  };

  // Handle ora spinner output
  const originalOraStream = process.stderr.write;
  process.stderr.write = function() {
    fs.appendFileSync(errFile, util.inspect(arguments, { depth: 12 }));
  };

  // spy on the overwritten console method
  const consoleSpy = sinon.spy(console[object], "write");

  return {
    sinonSpy: consoleSpy,
    restore: function() {
      // Restore the sinon spy and the original console method
      // so that the test result will be output to the screen, not to the file.
      sinon.restore();
      console[object].write = originalMethod;
      console.error = oldConsoleError;
      process.stderr.write = originalOraStream;
    }
  };
}

function verifyProjectDirectory(dir) {
  let verifiedProjectDir = true;

  const expectedFiles = ["bin", "src", "tests", ".env", "package.json"];
  const expectedSrcFiles = [
    "app",
    "bootstrap",
    "config",
    "public",
    "routes",
    "service-providers",
    "views",
    "index.js",
  ];

  for(const filename of expectedFiles) {
    if(!pathExists(path.join(dir, filename))) {
      verifiedProjectDir = false;
      break;
    }
  }

  for(const filename of expectedSrcFiles) {
    const file = path.join(dir, "src", filename);

    if(!verifiedProjectDir) {
      break;
    }

    if(!pathExists(file)) {
      verifiedProjectDir = false;
      break;
    }

    if(filename !== "index.js") {
      if(!isDirectory(file) || isEmpty(file)) {
        verifiedProjectDir = false;
        break;
      }
    }
  }

  return verifiedProjectDir;
}

module.exports = {
  chai,
  exec,
  normalizeHelpManual,
  spyOnConsoleOutput,
  verifyProjectDirectory,
};
