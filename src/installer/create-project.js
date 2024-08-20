"use strict";

const os = require("node:os");
const path = require("node:path");
const {
  copy, createDirectory, deleteFileOrDirectory, getFilename,
  isDirectory, isEmpty, listDirectoryContents, normalizePath,
  pathExists, readFromFile, writeToFile
} = require("../helpers/file-system");
const {
  exec, generateGithubRepoDownloadCommand, getOra,
  installPackageDependencies, unzip
} = require("../helpers/util");
const { print, marker } = require("../helpers/printer");

const EOL = os.EOL;
const PADDING = "  ";

module.exports = async function createProject(dir, name) {
  dir = normalizePath(dir);

  let dependenciesInstalled;
  const ora = await getOra();
  const chdir = process.chdir;
  const cwd = normalizePath(process.cwd());
  const projectDir = name?.length > 0 ? `${dir}/${name}` : dir;
  const projectName = path.basename(projectDir);
  const installerFilename = "simplicity-installer.log";
  const stdoutRedirectFile = `${dir}/${installerFilename}`;

  if(!isDirectory(projectDir)) {
    createDirectory(projectDir);
  }

  if(!isEmpty(projectDir)) {
    const color = marker.error;

    return print(
      `${PADDING}${color.background("ERROR")} ` +
      color.text(`The '${projectName}' directory is not empty.`)
    );
  }

  //const repoUrl = "https://github.com/simplicity-js/simplicity/releases/latest";
  //const repoUrl = "https://github.com/simplicity-js/simplicity";

  print();

  const projectSpinner = ora(
    marker.info.text(`Creating project '${projectName}'`)).start();

  try {
    const tokenFile = path.join(__dirname, ".github-token");
    const token = pathExists(tokenFile) ? readFromFile(tokenFile) : "";
    const downloadCommand = generateGithubRepoDownloadCommand({
      owner  : "simplicity-js",
      repo   : "simplicity",
      format : "zip",
      token  : token?.trim(),
      output : { filename: "simplicity.zip", directory: projectDir },
    });

    await exec(`${downloadCommand} >> ${stdoutRedirectFile} 2>&1`);
  } catch {
    projectSpinner.fail(
      EOL +
      marker.error.text(
        "An error occurred while creating the project. " +
        `Check the '${getFilename(stdoutRedirectFile)}' file for more info.`
      ) +
      EOL
    );

    if(projectDir === cwd) {
      deleteFileOrDirectory(`${projectDir}/simplicity.zip`);
    } else {
      copy(
        `${dir}/${installerFilename}`,
        `${cwd}/${installerFilename}`
      );
      deleteFileOrDirectory(projectDir);
    }

    if(process.env.NODE_ENV === "test") {
      return;
    } else {
      process.exit(1);
    }
  }

  try {
    await unzip(`${projectDir}/simplicity.zip`, projectDir);
  } catch(e) { console.log("UNZIP ERROR: ", e);
    writeToFile(stdoutRedirectFile, require("node:util").format(e));

    projectSpinner.fail(EOL + marker.error.text(
      "An error occurred while extracting the project. " +
      `Check the '${getFilename(stdoutRedirectFile)}' file for more info.`
    ) + EOL);

    if(process.env.NODE_ENV === "test") {
      return;
    } else {
      process.exit(1);
    }
  }

  const files = listDirectoryContents(projectDir);

  for(const file of files) {
    const filePath = `${projectDir}/${file}`;
    if(isDirectory(filePath) && file.startsWith("simplicity-js-simplicity-")) {
      copy(filePath, projectDir);
      deleteFileOrDirectory(filePath);
    }
  }

  deleteFileOrDirectory(`${projectDir}/simplicity.zip`);

  projectSpinner.succeed(marker.success.text(`Project '${projectName}' created.`));

  if(projectDir !== cwd) {
    chdir(projectDir);
  }

  copy(".env.example", ".env"); // The CWD is the project directory

  print();

  try {
    if(process.env.NODE_ENV !== "test") {
      await installPackageDependencies(projectDir, stdoutRedirectFile);
    }

    dependenciesInstalled = true;
  } catch {
    dependenciesInstalled = false;

    print(
      `${EOL}${PADDING}` +
      marker.warn.text(
        "An error occurred while installing project dependencies. " +
        "You may still be able to run the project " +
        "after manually installing the dependencies. " +
        `Check the '${getFilename(stdoutRedirectFile)}' file ` +
        "for more on why dependencies installation failed."
      ) +
      EOL
    );
  }

  deleteFileOrDirectory(stdoutRedirectFile);
  chdir(dir);
  finalMessage();


  function finalMessage() {
    let msg = `${PADDING}To start the app, run `;
    const color = marker.info;
    const appStartMsg = dependenciesInstalled ? "" : "npm install && ";

    if(projectDir !== cwd) {
      msg += color.text(`chdir ${projectName} && `);
    }

    msg += `${color.text(`${appStartMsg}npm run start`)}.`;

    print();
    print(msg);
  }
};
