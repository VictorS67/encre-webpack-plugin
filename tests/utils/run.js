import path from "path";

// eslint-disable-next-line import/no-extraneous-dependencies
import { expect } from "@jest/globals";

import EncreWebpackPlugin from "../../src/index";

import compile from "./compile";
import getCompiler from "./getCompiler";
import readConfig from "./readConfig";

/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").WebpackError} WebpackError */
/** @typedef {import("webpack").Asset} Asset */
/** @typedef {ReturnType<Compilation["getLogger"]>} WebpackLogger */
/** @typedef {ReturnType<Compilation["getCache"]>} CacheFacade */
/** @typedef {ReturnType<Compilation["fileSystemInfo"]["mergeSnapshots"]>} Snapshot */

/**
 * @typedef {Object} CopiedResult
 * @property {string} sourceFilename
 * @property {string} absoluteFilename
 * @property {Asset["source"]} source
 */

/**
 * @typedef {boolean} NoErrorOnMissing
 */

/**
 * @typedef {string} From
 */

/**
 * @typedef {string} Context
 */

/**
 * @typedef {Object} PluginOptions
 * @property {From} from
 * @property {Context} [context]
 * @property {NoErrorOnMissing} [noErrorOnMissing]
 */

/**
 * @param {PluginOptions} [options]
 */

/**
 * @typedef {Object} Options
 * @property {Compiler} compiler
 * @property {PluginOptions} options
 * @property {WebpackError[]} expectedErrors
 * @property {WebpackError[]} expectedWarnings
 * @property {string} expectedConfigName
 * @property {string | object} expectedConfigContent
 */

/**
 * @typedef {Object} RunReturns
 * @property {Compilation} compilation
 * @property {Compiler} compiler
 * @property {Stats} stats
 */

/**
 * @param {Options} opts
 *
 * @returns {Promise<RunReturns>}
 */
function run(opts) {
  return new Promise((resolve, reject) => {
    const compiler = opts.compiler || getCompiler();

    new EncreWebpackPlugin(opts.options).apply(compiler);

    return compile(compiler)
      .then(({ stats }) => {
        const { compilation } = stats;

        if (opts.expectedErrors) {
          expect(compilation.errors).toEqual(opts.expectedErrors);
        } else if (compilation.errors.length > 0) {
          throw compilation.errors[0];
        }

        if (opts.expectedWarnings) {
          expect(compilation.warnings).toEqual(opts.expectedWarnings);
        } else if (compilation.warnings.length > 0) {
          throw compilation.warnings[0];
        }

        const enryPoint = path.resolve(__dirname, "enter.js");

        if (compilation.fileDependencies.has(enryPoint)) {
          compilation.fileDependencies.delete(enryPoint);
        }

        resolve({ compilation, compiler, stats });
      })
      .catch(reject);
  });
}

/** @param {Options} opts */
function runEmit(opts) {
  return run(opts).then(({ compilation, compiler, stats }) => {
    if (opts.expectedConfigName || opts.expectedConfigContent) {
      let configName = opts.expectedConfigName;

      if (path.isAbsolute(configName)) {
        configName = path.relative(
          /** @type {string} */ (compiler.options.output.path),
          configName,
        );
      } else {
        configName = path.relative(
          /** @type {string} */ (compiler.options.output.path),
          path.resolve(__dirname, configName),
        );
      }

      expect(compilation.assets[configName]).toBeDefined();

      if (opts.expectedConfigContent) {
        if (compilation.assets[configName]) {
          let expectedContent = opts.expectedConfigContent;
          let compiledContent = readConfig(configName, compiler, stats);

          if (!Buffer.isBuffer(expectedContent)) {
            expectedContent = Buffer.from(
              (typeof expectedContent === "string"
                ? expectedContent.trim()
                : JSON.stringify(expectedContent, null, 2).trim()
              ).replace(/\r\n/g, "\n"),
            );
          }

          if (!Buffer.isBuffer(compiledContent)) {
            compiledContent = Buffer.from(
              compiledContent.trim().replace(/\r\n/g, "\n"),
            );
          } else {
            compiledContent = Buffer.from(
              compiledContent.toString().trim().replace(/\r\n/g, "\n"),
            );
          }

          expect(Buffer.compare(expectedContent, compiledContent)).toBe(0);
        }
      }
    }
  });
}

export { run, runEmit };
