/** @typedef {import("webpack").Compilation["inputFileSystem"] } InputFileSystem */
/** @typedef {import("fs").Stats } Stats */

/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<undefined | Stats>}
 */
function stat(inputFileSystem, path) {
  return new Promise((resolve, reject) => {
    inputFileSystem.stat(
      path,
      /**
       * @param {null | undefined | NodeJS.ErrnoException} err
       * @param {undefined | Stats} stats
       */
      // @ts-ignore
      (err, stats) => {
        if (err) {
          reject(err);

          return;
        }

        resolve(stats);
      }
    );
  });
}

/**
 * @param {InputFileSystem} inputFileSystem
 * @param {string} path
 * @return {Promise<string | Buffer>}
 */
function readFile(inputFileSystem, path) {
  return new Promise((resolve, reject) => {
    inputFileSystem.readFile(
      path,
      /**
       * @param {null | undefined | NodeJS.ErrnoException} err
       * @param {undefined | string | Buffer} data
       */
      (err, data) => {
        if (err) {
          reject(err);

          return;
        }

        resolve(/** @type {string | Buffer} */ (data));
      }
    );
  });
}

/**
 * @template T
 * @param fn {(function(): any) | undefined}
 * @returns {function(): T}
 */
function memoize(fn) {
  let cache = false;
  /** @type {T} */
  let result;

  return () => {
    if (cache) {
      return result;
    }

    result = /** @type {function(): any} */ (fn)();
    cache = true;
    // Allow to clean up memory for fn
    // and all dependent resources
    // eslint-disable-next-line no-undefined, no-param-reassign
    fn = undefined;

    return result;
  };
}

module.exports = { stat, readFile, memoize };
