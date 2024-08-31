/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Stats} Stats */

/**
 * @typedef {Object} CompileReturns
 * @property {Compiler} compiler
 * @property {Stats} stats
 */

/**
 * @param {Compiler} compiler
 *
 * @returns {Promise<CompileReturns>}
 */
export default (compiler) =>
  new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
      }

      return resolve({ stats, compiler });
    });
  });
