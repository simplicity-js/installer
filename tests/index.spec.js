"use strict";

const os = require("node:os");
const path = require("node:path");
const { createDirectory, deleteFileOrDirectory, normalizePath, pathExists,
  readLinesFromFile
} = require("../src/helpers/file-system");
const createProject = require("../src");
const { chai, exec, normalizeHelpManual, spyOnConsoleOutput,
  verifyProjectDirectory
} = require("./test-helpers/test-helper");

let directoriesToDelete = [];

const EOL = os.EOL;
const PADDING = "  ";
const chdir = process.chdir;
const currDir = normalizePath(__dirname);
const srcDir = normalizePath(path.join(currDir, "..", "src"));
const HELP_MANUAL = `${srcDir}/manual/help.stub`;

describe("simplicity", function() {
  let expect;

  before(async function() {
    this.timeout(1000 * 60);

    expect = (await chai()).expect;

    /*
     * Change the current working directory accordingly
     * before running the tests
     */
    chdir(currDir);
  });

  after(function(done) {
    expect = null;

    directoriesToDelete.forEach(directory => (
      deleteFileOrDirectory(directory)));

    done();
  });

  describe("installer function", function() {
    it("should fail if the project directory is not empty", async function() {
      const { sinonSpy, restore } = spyOnConsoleOutput();

      await createProject(currDir);
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

      const projectName = "indexProject";
      const projectDir = path.join(currDir, projectName);
      const { sinonSpy, restore } = spyOnConsoleOutput();

      expect(pathExists(projectDir)).to.be.false;

      await createProject(currDir, projectName);
      restore();

      const expected = new RegExp(
        `To start the app, run \.*chdir ${projectName} && \.*bob serve`
      );

      expect(pathExists(projectDir)).to.be.true;
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      expect(verifyProjectDirectory(projectDir)).to.be.true;

      directoriesToDelete.push(projectDir);
    });

    it("should install the project in the current directory if no project name is specified", async function() {
      this.timeout(1000 * 60);

      const projectName = "index-project";
      const projectDir = path.join(currDir, projectName);
      const { sinonSpy, restore } = spyOnConsoleOutput();

      createDirectory(projectDir);
      expect(pathExists(projectDir)).to.be.true;
      expect(verifyProjectDirectory(projectDir)).to.be.false;

      process.chdir(projectDir);

      await createProject(process.cwd(), null);

      restore();
      process.chdir(currDir);

      const expected = /To start the app, run .*bob serve/;

      expect(pathExists(projectDir)).to.be.true;
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      expect(verifyProjectDirectory(projectDir)).to.be.true;

      directoriesToDelete.push(projectDir);
    });
  });

  describe("cli", function() {
    this.timeout(1000 * 120);

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

        await exec(`node ${srcDir} help`);
        restore();

        const expected = this.helpManual;
        const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });

      it("should display the help manual if the --help option is passed", async function() {
        const { sinonSpy, restore } = spyOnConsoleOutput();

        await exec(`node ${srcDir} --help`);
        restore();

        const expected = this.helpManual;
        const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });

      it("should display the help manual if the -h option is passed", async function() {
        const { sinonSpy, restore } = spyOnConsoleOutput();

        await exec(`node ${srcDir} -h`);
        restore();

        const expected = this.helpManual;
        const actual = normalizeHelpManual(sinonSpy.getCall(0).args[0]);

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });

      it("should display the help manual if no command is passed", async function() {
        const { sinonSpy, restore } = spyOnConsoleOutput();

        await exec(`node ${srcDir}`);
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
        await exec(`node ${srcDir} version`);
        restore();

        const expected = this.versionInfo.trim();
        const actual = (sinonSpy.getCall(0).args[0]).trim();

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });

      it("should display version information if the --version option is passed", async function() {
        const { sinonSpy, restore } = spyOnConsoleOutput();
        chdir(this.parentDir);
        await exec(`node ${srcDir} --version`);
        restore();

        const expected = this.versionInfo.trim();
        const actual = (sinonSpy.getCall(0).args[0]).trim();

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });

      it("should display version information if the -v option is passed", async function() {
        const { sinonSpy, restore } = spyOnConsoleOutput();
        chdir(this.parentDir);
        await exec(`node ${srcDir} -v`);
        restore();

        const expected = this.versionInfo.trim();
        const actual = (sinonSpy.getCall(0).args[0]).trim();

        expect(sinonSpy.calledOnce).to.be.true;
        expect(expected).to.equal(actual);
      });
    });

    describe("create-project", function() {
      before(function(done) {
        this.command = `node ${srcDir} create-project`;
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

        const projectName = "indexCliTestProject";
        const projectDir = path.join(currDir, projectName);
        const { sinonSpy, restore } = spyOnConsoleOutput();

        expect(pathExists(projectDir)).to.be.false;

        await exec(this.command, [projectName]);
        restore();

        const expected = new RegExp(
          `To start the app, run \.*chdir ${projectName} && \.*bob serve`
        );

        expect(pathExists(projectDir)).to.be.true;
        expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
        expect(verifyProjectDirectory(projectDir)).to.be.true;

        this.directoriesToDelete.push(projectDir);
      });

      it("should install the project in the current directory if no project name is specified", async function() {
        this.timeout(1000 * 60);

        const projectName = "index-cli-test-project";
        const projectDir = path.join(currDir, projectName);
        const { sinonSpy, restore } = spyOnConsoleOutput();

        createDirectory(projectDir);
        expect(pathExists(projectDir)).to.be.true;
        expect(verifyProjectDirectory(projectDir)).to.be.false;

        chdir(projectDir); // chdir to the project dir which becomes the CWD
        await exec(this.command); // The command will run inside the CWD.

        restore();
        chdir(currDir);

        const expected = /To start the app, run .*bob serve/;

        expect(pathExists(projectDir)).to.be.true;
        expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
        expect(verifyProjectDirectory(projectDir)).to.be.true;

        this.directoriesToDelete.push(projectDir);
      });

      it("should accept 'new' as an alias for 'create-project'", async function() {
        this.timeout(1000 * 60);

        const projectName = "index-cli-test-project-new-command";
        const projectDir = path.join(currDir, projectName);
        const { sinonSpy, restore } = spyOnConsoleOutput();

        expect(pathExists(projectDir)).to.be.false;

        await exec(`node ${srcDir} new`, [projectName]);
        restore();

        const expected = new RegExp(
          `To start the app, run \.*chdir ${projectName} && \.*bob serve`
        );

        expect(pathExists(projectDir)).to.be.true;
        expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
        expect(verifyProjectDirectory(projectDir)).to.be.true;

        this.directoriesToDelete.push(projectDir);
      });
    });
  });
});
