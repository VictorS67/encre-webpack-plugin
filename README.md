# encre-webpack-plugin

Load Encre Workflow Handler Configuration file into web apps.

## Getting Started

To begin, you'll need to install `encre-webpack-plugin`:

```console
npm install encre-webpack-plugin --save-dev
```

or

```console
yarn add -D encre-webpack-plugin
```

or

```console
pnpm add -D encre-webpack-plugin
```

Then add the plugin to your `webpack` config. For example:

**webpack.config.js**

```js
const EncreWebpackPlugin = require("encre-webpack-plugin");

module.exports = {
  plugins: [new EncreWebpackPlugin()],
};
```

> [!NOTE]
>
> `encre-webpack-plugin` is not designed to read encre config file generated from the build process; rather, it is to read the config file that already exist in the source tree, as part of the build process.

> [!NOTE]
>
> You can get the original source config filename from [Asset Objects](https://webpack.js.org/api/stats/#asset-objects).

## Options

- [`from`](#from)
- [`context`](#context)
- [`noErrorOnMissing`](#noerroronmissing)

### `from`

Type:

```ts
type from = string;
```

Default: `encre.app.config.json`

path from where we read the config file. The path can be a file path or a directory path.

> [!NOTE]
>
> If the config file name is not in the `from`, the plugin is reading the config file named `encre.app.config.json` on the corresponding `from` location.
>
> If `from` path is not provided, then the plugin is reading the config file from the root context location (e.g. where the `package.json` is located).

> [!WARNING]
>
> On Windows, the forward slash and the backward slash are both separators.
> Instead please use `/`.

**webpack.config.js**

```js
// relative directory path
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: "relative/path/to/dir",
    }),
  ],
};

// or absolute directory path
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: path.resolve(__dirname, "src", "dir"),
    }),
  ],
};

// or specific file path
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: "encre.app.config.json",
    }),
  ],
};
```

#### `For windows`

If you define `from` as absolute file path or absolute folder path on `Windows`, you can use windows path segment (`\\`)

```js
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: path.resolve(__dirname, "encre.app.config.json"),
    }),
  ],
};
```

### `context`

Type:

```ts
type context = string;
```

Default: `options.context|compiler.options.context`

A path to be (1) prepended to `from` and (2) removed from the start of the result path(s).

> [!WARNING]
>
> Don't use directly `\\` in `context` (i.e `path\to\context`) option because on UNIX the backslash is a valid character inside a path component, i.e., it's not a separator.
> On Windows, the forward slash and the backward slash are both separators.
> Instead please use `/` or `path` methods.

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: "encre.app.config.json",
      context: "app/",
    }),
  ],
};
```

`context` can be an absolute path or a relative path. If it is a relative path, then it will be converted to an absolute path based on `compiler.options.context`.

`context` should be explicitly set only when `from` contains a glob. Otherwise, `context` is automatically set, based on whether `from` is a file or a directory:

If `from` is a file, then `context` is its directory. The result path will be the filename alone.

If `from` is a directory, then `context` equals `from`. The result paths will be the paths of the directory's contents (including nested contents), relative to the directory.

### `noErrorOnMissing`

Type:

```ts
type noErrorOnMissing = boolean;
```

Default: `false`

Doesn't generate an error on missing file(s).

```js
module.exports = {
  plugins: [
    new EncreWebpackPlugin({
      from: path.resolve(__dirname, "encre.app.config.json"),
      noErrorOnMissing: true,
    }),
  ],
};
```
