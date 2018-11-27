const fs = require("fs");
const path = require("path");
const util = require("util");
const cp = require("child_process");

util.promisify(cp.spawn);

exports.runOnAll = cmd => {
  const packagesDir = path.join(process.cwd(), "packages");
  const packages = fs.readdirSync(packagesDir);

  return Promise.all(
    packages.map(package => {
      const [root, ...args] = cmd.replace("#{package}", package).split(" ");
      return cp.spawn(root, args, {
        stdio: "inherit",
        cwd: path.join(packagesDir, package)
      });
    })
  );
};
