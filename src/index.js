const path = require("path");

const webpack = require("webpack");

const { validate } = require("schema-utils");

const schema = require("./options.json");
const { stat, readFile, memoize } = require("./utils");

const getNormalizePath = memoize(() =>
  // eslint-disable-next-line global-require
  require("normalize-path")
);

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
 * @property {string} filename
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

class EncreWebpackPlugin {
  /**
   * @param {PluginOptions} [options]
   */
  constructor(options) {
    // eslint-disable-next-line no-underscore-dangle
    const _options = { from: "encre.app.config.json", ...options };

    validate(/** @type {Schema} */ (schema), _options, {
      name: "Encre Plugin",
      baseDataPath: "options",
    });

    /**
     * @private
     * @type {PluginOptions}
     */
    this.options = _options;
  }

  /**
   * @private
   * @param {Compilation} compilation
   * @param {number} startTime
   * @param {string} dependency
   * @returns {Promise<Snapshot | undefined>}
   */
  static async createSnapshot(compilation, startTime, dependency) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      compilation.fileSystemInfo.createSnapshot(
        startTime,
        [dependency],
        // @ts-ignore
        // eslint-disable-next-line no-undefined
        undefined,
        // eslint-disable-next-line no-undefined
        undefined,
        null,
        (error, snapshot) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(/** @type {Snapshot} */ (snapshot));
        }
      );
    });
  }

  /**
   * @private
   * @param {Compilation} compilation
   * @param {Snapshot} snapshot
   * @returns {Promise<boolean | undefined>}
   */
  static async checkSnapshotValid(compilation, snapshot) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      compilation.fileSystemInfo.checkSnapshotValid(
        snapshot,
        (error, isValid) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(isValid);
        }
      );
    });
  }

  /**
   * @private
   * @param {Compiler} compiler
   * @param {Compilation} compilation
   * @param {WebpackLogger} logger
   * @param {CacheFacade} cache
   * @param {PluginOptions} inputOptions
   * @returns {Promise<CopiedResult | undefined>}
   */
  static async run(compiler, compilation, logger, cache, inputOptions) {
    const { RawSource } = compiler.webpack.sources;
    const options = { ...inputOptions };
    const originalFrom = options.from;
    const normalizedOriginalFrom = path.normalize(originalFrom);

    logger.log(`start process config from '${normalizedOriginalFrom}'`);

    let absoluteFrom;

    if (path.isAbsolute(normalizedOriginalFrom)) {
      absoluteFrom = normalizedOriginalFrom;
    } else {
      absoluteFrom = path.resolve(options.context, normalizedOriginalFrom);
    }

    logger.debug(`getting stats for '${absoluteFrom}'...`);

    const { inputFileSystem } = compiler;

    let stats;

    try {
      // @ts-ignore
      stats = await stat(inputFileSystem, absoluteFrom);
    } catch (error) {
      // Nothing
    }

    /**
     * @type {"file" | "dir" | "unknown"}
     */
    let fromType;

    if (stats) {
      if (stats.isDirectory()) {
        fromType = "dir";
        logger.debug(`determined '${absoluteFrom}' is a directory`);
      } else if (stats.isFile()) {
        fromType = "file";
        logger.debug(`determined '${absoluteFrom}' is a file`);
      } else {
        // Fallback
        fromType = "unknown";
        logger.debug(`determined '${absoluteFrom}' is unknown`);
      }
    } else {
      fromType = "unknown";
      logger.debug(`determined '${absoluteFrom}' is unknown`);
    }

    if (fromType === "unknown") {
      if (options.noErrorOnMissing) {
        logger.log(
          `finished to process a config from '${normalizedOriginalFrom}' using '${options.context}' context`
        );

        return;
      }

      const missingError = new Error(
        `unable to locate config from '${normalizedOriginalFrom}'`
      );

      compilation.errors.push(/** @type {WebpackError} */ (missingError));

      return;
    }

    if (fromType === "dir") {
      compilation.contextDependencies.add(absoluteFrom);

      logger.debug(`added '${absoluteFrom}' as a context dependency`);

      options.context = absoluteFrom;
    } else if (fromType === "file") {
      compilation.fileDependencies.add(absoluteFrom);

      logger.debug(`added '${absoluteFrom}' as a file dependency`);

      options.context = path.dirname(absoluteFrom);
    }

    try {
      const absoluteFilename =
        fromType === "dir"
          ? path.resolve(absoluteFrom, "encre.app.config.json")
          : absoluteFrom;

      logger.debug(`found '${absoluteFilename}'`);

      let filename = absoluteFilename;
      if (path.isAbsolute(filename)) {
        filename = path.relative(
          /** @type {string} */ (compiler.options.output.path),
          absoluteFilename
        );
      }

      const sourceFilename = getNormalizePath()(absoluteFilename);

      let cacheEntry;

      logger.debug(`getting cache for '${absoluteFilename}'...`);

      try {
        cacheEntry = await cache.getPromise(sourceFilename, null);
      } catch (error) {
        compilation.errors.push(/** @type {WebpackError} */ (error));

        return;
      }

      /**
       * @type {Asset["source"] | undefined}
       */
      let source;

      if (cacheEntry) {
        logger.debug(`found cache for '${absoluteFilename}'...`);

        let isValidSnapshot;

        logger.debug(`checking snapshot on valid for '${absoluteFilename}'...`);

        try {
          isValidSnapshot = await EncreWebpackPlugin.checkSnapshotValid(
            compilation,
            cacheEntry.snapshot
          );
        } catch (error) {
          compilation.errors.push(/** @type {WebpackError} */ (error));

          return;
        }

        if (isValidSnapshot) {
          logger.debug(`snapshot for '${absoluteFilename}' is valid`);

          ({ source } = cacheEntry);
        } else {
          logger.debug(`snapshot for '${absoluteFilename}' is invalid`);
        }
      } else {
        logger.debug(`missed cache for '${absoluteFilename}'`);
      }

      if (!source) {
        const startTime = Date.now();

        logger.debug(`reading '${absoluteFilename}'...`);

        let data;

        try {
          // @ts-ignore
          data = await readFile(inputFileSystem, absoluteFilename);
        } catch (error) {
          compilation.errors.push(/** @type {WebpackError} */ (error));

          return;
        }

        logger.debug(`read '${absoluteFilename}'`);

        source = new RawSource(data);

        let snapshot;

        logger.debug(`creating snapshot for '${absoluteFilename}'...`);

        try {
          snapshot = await EncreWebpackPlugin.createSnapshot(
            compilation,
            startTime,
            absoluteFilename
          );
        } catch (error) {
          compilation.errors.push(/** @type {WebpackError} */ (error));

          return;
        }

        if (snapshot) {
          logger.debug(`created snapshot for '${absoluteFilename}'`);
          logger.debug(`storing cache for '${absoluteFilename}'...`);

          try {
            await cache.storePromise(sourceFilename, null, {
              source,
              snapshot,
            });
          } catch (error) {
            compilation.errors.push(/** @type {WebpackError} */ (error));

            return;
          }

          logger.debug(`stored cache for '${absoluteFilename}'`);
        }
      }

      // eslint-disable-next-line consistent-return
      return {
        sourceFilename,
        absoluteFilename,
        source,
        filename,
      };
    } catch (error) {
      if (options.noErrorOnMissing) {
        logger.log(
          `finished to process a config from '${normalizedOriginalFrom}' using '${options.context}' context`
        );

        return;
      }

      const missingError = new Error(
        `unable to locate config from '${normalizedOriginalFrom}'`
      );

      compilation.errors.push(/** @type {WebpackError} */ (missingError));
    }
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    const pluginName = this.constructor.name;

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      const logger = compilation.getLogger("encre-webpack-plugin");
      const cache = compilation.getCache("EncreWebpackPlugin");

      compilation.hooks.processAssets.tapAsync(
        {
          name: "encre-webpack-plugin",
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async (unusedAssets, callback) => {
          /**
           * @type {PluginOptions}
           */
          const normalizedOptions = this.options;

          const context =
            typeof normalizedOptions.context === "undefined"
              ? compiler.context
              : path.isAbsolute(normalizedOptions.context)
                ? normalizedOptions.context
                : path.join(compiler.context, normalizedOptions.context);

          normalizedOptions.context = context;

          /**
           * @type {CopiedResult | undefined}
           */
          let copiedResult;

          try {
            copiedResult = await EncreWebpackPlugin.run(
              compiler,
              compilation,
              logger,
              cache,
              /** @type {PluginOptions & { context: string }} */ (
                normalizedOptions
              )
            );
          } catch (error) {
            compilation.errors.push(/** @type {WebpackError} */ (error));

            return;
          }

          if (!copiedResult) {
            return;
          }

          const { absoluteFilename, sourceFilename, filename, source } =
            copiedResult;

          logger.log(
            `writing '${filename}' from '${absoluteFilename}' to compilation assets...`
          );

          compilation.emitAsset(filename, source);

          logger.log(
            `written '${filename}' from '${absoluteFilename}' to compilation assets`
          );

          logger.log("finished to adding additional assets");

          const existingAsset = compilation.getStats().toJson().assets;

          const rawConfigData = source.source();
          const configData = Buffer.isBuffer(rawConfigData)
            ? rawConfigData.toString("utf8")
            : rawConfigData;

          let config;
          try {
            config = JSON.parse(configData);

            logger.debug(`parsed config '${sourceFilename}' into JSON Object`);
          } catch (error) {
            compilation.errors.push(/** @type {WebpackError} */ (error));

            return;
          }

          new webpack.DefinePlugin({
            "process.env.__ENCRE_APP_CONFIG": JSON.stringify(config),
          }).apply(compiler);

          logger.log("finished to load encre handler configuration");

          callback();
        }
      );

      if (compilation.hooks.statsPrinter) {
        compilation.hooks.statsPrinter.tap(pluginName, (stats) => {
          stats.hooks.print
            .for("asset.info.configured")
            .tap("encre-webpack-plugin", (configured, { green, formatFlag }) =>
              configured
                ? /** @type {Function} */ (green)(
                    /** @type {Function} */ (formatFlag)("configured")
                  )
                : ""
            );
        });
      }
    });
  }
}

module.exports = EncreWebpackPlugin;
