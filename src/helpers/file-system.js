"use strict";

const fs = require("node:fs");

module.exports = {
  createDirectory,
  createFile,
  deleteFileOrDirectory,
  isDirectory,
  isEmpty,
  isFile,
  pathExists,
};

/**
 * @param {String} dir: The directory to create.
 *   Supports nested directory structure.
 * @param {Function} ifNotExist (optional):
 *   A function to call the first time the directory is created.
 * @return {Boolean}
 */
function createDirectory(dir, ifNotExist) {
  try {
    !isDirectory(dir) && fs.mkdirSync(dir, { recursive: true });

    if(typeof ifNotExist === "function") {
      ifNotExist();
    }

    return true;
  } catch(err) {
    console.error("Error creating directory: '%s'. Error: %o", dir, err);
    return false;
  }
}

function createFile(filepath) {
  try {
    fs.closeSync(fs.openSync(filepath, "w"));
    return true;
  } catch(err) {
    console.error("Error creating file: '%s'. Error: %o", filepath, err);
    return false;
  }
}

function deleteFileOrDirectory(file) {
  try {
    if(isDirectory(file)) {
      fs.rmSync(file, { recursive: true, force: true });
    } else if(isFile(file)) {
      fs.rmSync(file, { force: true });
    }

    return true;
  } catch(err) {
    console.error("Error deleting file: '%s'. Error: %o", file, err);
    return false;
  }
}

function isDirectory(path) {
  return pathExists(path) && pathInfo(path).isDirectory();
}

function isFile(path) {
  return pathExists(path) && pathInfo(path).isFile();
}

function pathExists(path) {
  return fs.existsSync(path);
}

function pathInfo(path) {
  /* https://stackoverflow.com/a/15630832/1743192
  const stats = fs.lstatSync(path);
  stats.isFile()
  stats.isDirectory()
  stats.isBlockDevice()
  stats.isCharacterDevice()
  stats.isSymbolicLink() // (only valid with fs.lstat())
  stats.isFIFO()
  stats.isSocket()
  */
  return fs.lstatSync(path);
}

function isEmpty(dir) {
  return listDirectoryContents(dir).length === 0;
}
