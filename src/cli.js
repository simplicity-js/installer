#!/usr/bin/env node

"use strict";

require("./helpers/node-version-check");

const os = require("node:os");
const { parseArgs } = require("node:util");
const { normalizePath, readLinesFromFile } = require("./helpers/file-system");
const { print, printError } = require("./helpers/printer");
const createProject = require("./installer/create-project");

const { values: params, positionals: list } = readConsoleArgs();
const PARAMETER_1 = list[0];
const PARAMETER_2 = list[1];
const PADDING = "  ";
const NL_SPACE = `${os.EOL}${PADDING}`;
const HELP_MANUAL = `${normalizePath(__dirname)}/manual/help.stub`;

/**
 * Get command line arguments and options
 */
function readConsoleArgs() {
  const options = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  return options;
};

async function showHelp(target) {
  try {
    const lines = await readLinesFromFile(target);

    for await(const line of lines) {
      print(`${PADDING}${line}`);
    }
  } catch(e) {
    console.error(e);
  }
}

function showVersionInfo() {
  print(
    `${NL_SPACE}Simplicity Installer${` version ${require("../package").version} (cli)`}`
  );
}

async function runCreateProjectCommand(projectName) {
  const currDir = normalizePath(process.cwd());
  const OPTIONS_LIST = ["help"];

  Object.keys(params).forEach((o) => {
    const option = OPTIONS_LIST.includes(o) ? o : "";

    switch(option) {
    case "help": showHelp(HELP_MANUAL); return;
    default: break;
    }
  });

  return await createProject(currDir, projectName);
}

function main(c) {
  const COMMAND_LIST = [ "help", "version", "create-project" ];
  const command = COMMAND_LIST.includes(c) ? c : "";

  try {
    switch(command) {
    case "help": showHelp(HELP_MANUAL); break;
    case "version": showVersionInfo(); break;
    case "create-project": runCreateProjectCommand(PARAMETER_2); break;
    default:
      if(command) {
        print(`${PADDING}ERROR: Unkown Command '${command}'.`);
      }

      if(params.version) {
        showVersionInfo();
      } else {
        showHelp(HELP_MANUAL);
      }
    }
  } catch(err) {
    printError(err);
  }
}

main(PARAMETER_1);
