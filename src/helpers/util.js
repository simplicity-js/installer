"use strict";

const cp = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const extract = require("extract-zip");
const requireUncached = require("require-without-cache");
const getOra = () => import("ora").then(ora => ora.default);
const { normalizePath, writeToFile } = require("./file-system");
const { marker } = require("./printer");

const EOL = os.EOL;
const PADDING = " ";


module.exports = {
  exec,
  generateGithubRepoDownloadCommand,
  getOra,
  installPackageDependencies,
  unzip: unzipArchive,
};


function exec(command, args) {
  return new Promise((resolve, reject) => {
    const ps = cp.spawn(command, args, {
      stdio: "inherit",
      shell: true
    });

    ps.on("close", (code) => {
      if(code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });
  });
}

function generateGithubRepoDownloadCommand(options) {
  let url;
  let command;
  const { owner, repo, format, token, output } = options || {};
  const { directory: outputDirectory, filename: outputFilename } = output || {};
  const fileFormat = ["tar", "zip"].includes(format) ? format : "zip";

  url = `https://api.github.com/repos/${owner}/${repo}/${fileFormat}ball`;
  command = "curl -L -H \"Accept: application/vnd.github+json\"";

  if(token) {
    command += ` -H "Authorization: token ${token}"`;
  }

  command += " -o ";

  if(outputDirectory) {
    command += `${normalizePath(outputDirectory)}/`;
  }

  command += outputFilename;

  command += ` ${url}`;

  return command;
}

async function installPackageDependencies(packagePath, stdoutRedirectFile) {
  const pkg = requireWithoutCache(`${packagePath}${path.sep}package.json`);
  const dependencies = Object.entries(pkg.dependencies);
  const devDependencies = Object.entries(pkg.devDependencies);

  if(Array.isArray(dependencies) && dependencies.length > 0) {
    writeToFile(
      stdoutRedirectFile,
      `${EOL}${PADDING}${marker.info.text("Installing dependencies...")}${EOL}`
    );

    await installDependencies(dependencies, stdoutRedirectFile);

    writeToFile(
      stdoutRedirectFile,
      `${EOL}${PADDING}${marker.success.text("Dependencies installed.")}${EOL}`
    );
  }

  if(Array.isArray(devDependencies) && devDependencies.length > 0) {
    writeToFile(
      stdoutRedirectFile,
      `${EOL}${PADDING}${marker.info.text("Installing dev dependencies...")}${EOL}`
    );

    await installDependencies(devDependencies, stdoutRedirectFile);

    writeToFile(
      stdoutRedirectFile,
      `${EOL}${PADDING}${marker.success.text("Dev dependencies installed.")}${EOL}`
    );
  }
}

/**
 * @param {Array} deps: The dependencies to install
 */
async function installDependencies(dependencies, stdoutRedirectFile) {
  const ora = await getOra();

  dependencies.sort((a, b) => a[0].localeCompare(b[0]));

  for(let i = 0; i < dependencies.length; i++) {
    const [name, version] = dependencies[i];

    // Bypass installing the framework while developing
    // We can install it manually.
    if(name === "@simplicityjs/framework" && version === "file:../simplicity-framework") {
      continue;
    }

    const dependency = `${name}@${version}`;
    const spinner = ora(marker.info.text(`installing ${dependency}...`)).start();

    writeToFile(
      stdoutRedirectFile,
      marker.info.text(`installing ${dependency}...`)
    );

    await exec(`npm install ${dependency} >> ${stdoutRedirectFile} 2>&1`);

    spinner.succeed(marker.success.text(`${dependency} installed.`));

    writeToFile(
      stdoutRedirectFile,
      marker.success.text(`${dependency} installed.`)
    );
  }
}

function requireWithoutCache(module) {
  return requireUncached(module, require);
}

async function unzipArchive(input, output) {
  return await extract(input, { dir: output });
}
