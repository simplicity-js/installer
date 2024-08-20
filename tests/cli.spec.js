"use strict";

const childProcess = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const { createDirectory, deleteFileOrDirectory, normalizePath,
  pathExists, readLinesFromFile
} = require("../src/helpers/file-system");
const { print } = require("../src/helpers/printer");
const { chai, spyOnConsoleOutput, verifyProjectDirectory } = require(
  "./test-helpers/test-helper");

const EOL = os.EOL;
const PADDING = "  ";
const chdir = process.chdir;
const currDir = normalizePath(__dirname);
const binDir = normalizePath(path.join(currDir, "..", "src"));
const HELP_MANUAL = `${binDir}/manual/help.stub`;

function exec(command, args) {
  args = args || [];

  return new Promise((resolve, reject) => {
    let output = "";
    const start = Date.now();

    const ps = childProcess.spawn(command, args, {
      //stdio: ["ignore", out, err],
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

describe("cli", function() {
  this.timeout(1000 * 120);

  let expect;

  before(async function() {
    expect = (await chai()).expect;
  });

  describe("help (--help, -h)", function() {
    before(async function() {
      let helpManual = "";

      try {
        const lines = await readLinesFromFile(HELP_MANUAL);

        for await(const line of lines) {
          helpManual += `${PADDING}${line}${EOL}`;
        }
      } catch {
        helpManual += "";
      }

      this.helpManual = normalizeHelpManual(helpManual);
    });

    it("should display the help manual if the string 'help' is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await exec(`node ${binDir}/cli help`);
      restore();

      const expected = this.helpManual;
      const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });

    it("should display the help manual if the --help option is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await exec(`node ${binDir}/cli --help`);
      restore();

      const expected = this.helpManual;
      const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });

    it("should display the help manual if the -h option is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await exec(`node ${binDir}/cli -h`);
      restore();

      const expected = this.helpManual;
      const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });

    it("should display the help manual if no command is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await exec(`node ${binDir}/cli`);
      restore();

      const expected = this.helpManual;
      const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });
  });

  describe("version (--version, -v)", function() {
    before(function(done) {
      this.parentDir = path.dirname(__dirname);
      this.versionInfo = `${EOL}${PADDING}${"Simplicity Installer"}${` version ${require("../package").version} (cli)`}`;
      done();
    });

    it("should display version information if the string 'version' is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();
      chdir(this.parentDir);
      await exec(`node ${binDir}/cli version`);
      restore();

      const expected = this.versionInfo.trim();
      const actual = (sinonSpy.getCall(0).args[0]).trim();

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });

    it("should display version information if the --version option is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();
      chdir(this.parentDir);
      await exec(`node ${binDir}/cli --version`);
      restore();

      const expected = this.versionInfo.trim();
      const actual = (sinonSpy.getCall(0).args[0]).trim();

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });

    it("should display version information if the -v option is passed", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();
      chdir(this.parentDir);
      await exec(`node ${binDir}/cli -v`);
      restore();

      const expected = this.versionInfo.trim();
      const actual = (sinonSpy.getCall(0).args[0]).trim();

      expect(sinonSpy.calledOnce).to.be.true;
      expect(expected).to.equal(actual);
    });
  });

  describe("create-project", function() {
    before(function(done) {
      this.command = `node ${binDir}/cli create-project`;
      this.directoriesToDelete = [];

      /*
       * Change the current working directory accordingly
       * before running the tests
       */
      chdir(currDir);
      done();
    });

    after(function(done) {
      this.directoriesToDelete.forEach(directory => (
        deleteFileOrDirectory(directory)));

      done();
    });

    it("should fail if the project directory is not empty", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await exec(this.command);
      restore();

      const expected = new RegExp(
        `The '${path.basename(currDir)}' directory is not empty.`
      );

      expect(sinonSpy.calledOnce).to.be.true;
      expect(sinonSpy.getCall(0).args[0]).to.match(expected);
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
    });

    it("should create the project directory if it does not exist and install the project", async function() {
      this.timeout(1000 * 60);

      const projectName = "cliTestProject";
      const projectDir = path.join(currDir, projectName);
      const { sinonSpy, restore } = spyOnConsoleOutput();

      expect(pathExists(projectDir)).to.be.false;

      await exec(this.command, [projectName]);
      restore();

      const expected = new RegExp(
        `To start the app, run \.*chdir ${projectName} && \.*npm run start`
      );

      expect(pathExists(projectDir)).to.be.true;
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      expect(verifyProjectDirectory(projectDir)).to.be.true;

      this.directoriesToDelete.push(projectDir);
    });

    it("should install the project in the current directory if no project name is specified", async function() {
      this.timeout(1000 * 60);

      const projectName = "projectCliTest";
      const projectDir = path.join(currDir, projectName);
      const { sinonSpy, restore } = spyOnConsoleOutput();

      createDirectory(projectDir);
      expect(pathExists(projectDir)).to.be.true;
      expect(verifyProjectDirectory(projectDir)).to.be.false;

      chdir(projectDir); // chdir to the project dir which becomes the CWD
      await exec(this.command); // The command will run inside the CWD.

      restore();
      chdir(currDir);

      const expected = /To start the app, run .*npm run start/;

      expect(pathExists(projectDir)).to.be.true;
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      expect(verifyProjectDirectory(projectDir)).to.be.true;

      this.directoriesToDelete.push(projectDir);
    });
  });
});
