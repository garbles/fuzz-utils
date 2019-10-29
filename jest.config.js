const path = require("path");

const rootDir = path.join(process.cwd(), "src");
const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
const tsConfig = require(tsConfigPath);

module.exports = {
  verbose: true,
  rootDir,
  testEnvironment: "node",
  transform: {
    "\\.ts$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      tsConfig: tsConfig.compilerOptions
    }
  }
};
