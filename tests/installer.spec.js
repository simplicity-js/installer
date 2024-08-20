"use strict";

const path = require("node:path");
const { createDirectory, deleteFileOrDirectory, normalizePath, pathExists
} = require("../src/helpers/file-system");
const createProject = require("../src/installer/create-project");
const { chai, spyOnConsoleOutput, verifyProjectDirectory } = require(
  "./test-helpers/test-helper");

let directoriesToDelete = [];
const currDir = normalizePath(__dirname);

describe("installer", function() {
  let expect;

  before(async function() {
    this.timeout(1000 * 60);

    expect = (await chai()).expect;

    /*
     * Change the current working directory accordingly
     * before running the tests
     */
    process.chdir(currDir);
  });

  after(function(done) {
    expect = null;

    directoriesToDelete.forEach(directory => (
      deleteFileOrDirectory(directory)));

    done();
  });

  describe("createProject", function() {
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

    it.only("should create the project directory if it does not exist and install the project", async function() {
      this.timeout(1000 * 60);

      const projectName = "testProject";
      const projectDir = path.join(currDir, projectName);
      //const { sinonSpy, restore } = spyOnConsoleOutput();

      expect(pathExists(projectDir)).to.be.false;

      await createProject(currDir, projectName);
      //restore();

      /*const expected = new RegExp(
        `To start the app, run \.*chdir ${projectName} && \.*npm run start`
      );*/
      //console.log("SINON SPY CALLED: ", sinonSpy.calledWithMatch(expected));
      //console.log("SINON CALLS: ", sinonSpy.getCalls());
      expect(pathExists(projectDir)).to.be.true;
      expect(verifyProjectDirectory(projectDir)).to.be.true;
      //expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      //expect(verifyProjectDirectory(projectDir)).to.be.true;

      directoriesToDelete.push(projectDir);
    });

    it("should install the project in the current directory if no project name is specified", async function() {
      this.timeout(1000 * 60);

      const projectName = "test-project";
      const projectDir = path.join(currDir, projectName);
      const { sinonSpy, restore } = spyOnConsoleOutput();

      createDirectory(projectDir);
      expect(pathExists(projectDir)).to.be.true;
      expect(verifyProjectDirectory(projectDir)).to.be.false;

      process.chdir(projectDir);

      await createProject(process.cwd(), null);

      restore();
      process.chdir(currDir);

      const expected = /To start the app, run .*npm run start/;

      expect(pathExists(projectDir)).to.be.true;
      expect(sinonSpy.calledWithMatch(expected)).to.equal(true);
      expect(verifyProjectDirectory(projectDir)).to.be.true;

      directoriesToDelete.push(projectDir);
    });
  });
});
