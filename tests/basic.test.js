import path from "path";
import { describe, test } from "@jest/globals";

import { runEmit } from "./utils/run";

const CONTEXT_DIR = path.join(__dirname, "context");

describe("EncreWebpackPlugin", () => {
  describe("basic", () => {
    test("should read a config file", (done) => {
      runEmit({
        expectedConfigName: path.join(CONTEXT_DIR, "encre.app.config.json"),
      })
        .then(done)
        .catch(done);
    });

    test("should read a config file with specific name", (done) => {
      runEmit({
        expectedConfigName: path.join(CONTEXT_DIR, "encre.app.config.json"),
        options: {
          from: "encre.app.config.json",
        },
      })
        .then(done)
        .catch(done);
    });

    test("should read a config file from specific directory", (done) => {
      runEmit({
        expectedConfigName: path.join(
          CONTEXT_DIR,
          "directory",
          "encre.app.config.json"
        ),
        options: {
          context: "directory",
        },
      })
        .then(done)
        .catch(done);
    });

    test("should read and copy the config file into the assets", (done) => {
      runEmit({
        expectedConfigName: path.join(
          CONTEXT_DIR,
          "directory",
          "encre.app.config.json"
        ),
        expectedConfigContent: {
          workflow: "this/is/a/path/to/encre/file",
          handlers: {
            "dummy-input": {
              handlerType: "input",
              description: "A dummy input handler",
              event: "userInput",
              graphId: "XXX",
              nodeId: "XXX",
              portName: "xxx",
              dataType: "string",
            },
          },
        },
        options: {
          context: "directory",
        },
      })
        .then(done)
        .catch(done);
    });
  });
});
