import path from "path";

/** @typedef {import("webpack").Asset} Asset */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Stats} Stats */

/**
 * @param {Asset} asset
 * @param {Compiler} compiler
 * @param {Stats} stats
 *
 * @returns {string | Buffer}
 */
export default (asset, compiler, stats) => {
  const usedFs = compiler.outputFileSystem;
  const outputPath = stats.compilation.outputOptions.path;

  let data = "";

  try {
    data = usedFs.readFileSync(path.join(outputPath, asset));
  } catch (error) {
    data = error.toString();
  }

  return data;
};
