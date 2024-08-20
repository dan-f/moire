const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

const dist = "dist";

module.exports = {
  entry: "./src/bootstrap.js",
  output: {
    path: path.resolve(__dirname, dist),
    filename: "bootstrap.js",
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "public", to: dist }],
    }),
  ],
  experiments: {
    syncWebAssembly: true,
  },
};
