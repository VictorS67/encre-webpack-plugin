import path from "path";

// eslint-disable-next-line import/no-extraneous-dependencies
import { createFsFromVolume, Volume } from "memfs";
// eslint-disable-next-line import/no-extraneous-dependencies
import webpack from "webpack";

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Configuration} Configuration */

export default (config = {}) => {
  /** @type Configuration */
  const fullConfig = {
    mode: "development",
    context: path.resolve(__dirname, "../context"),
    entry: path.resolve(__dirname, "../utils/entry.js"),
    output: {
      path: path.resolve(__dirname, "../build"),
    },
    module: {
      rules: [
        {
          test: /\.json/,
          type: "asset/resource",
          generator: {
            filename: "asset-modules/[name][ext]",
          },
        },
      ],
    },
    ...config,
  };

  /** @type Compiler */
  const compiler = webpack(fullConfig);

  if (!config.outputFileSystem) {
    compiler.outputFileSystem = createFsFromVolume(new Volume());
  }

  return compiler;
};
