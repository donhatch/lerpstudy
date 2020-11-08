"use strict";
console.log("in lerp.js")
registerSourceCodeLinesAndRequire([
  "./PRINT.js",
  "./CHECK.js",
  "./STRINGIFY.js",
], function(
  PRINT,
  CHECK,
  STRINGIFY,
  shouldBeUndefined
){
  console.log("    in lerp.js require callback");
  CHECK.EQ(shouldBeUndefined, undefined);
  console.log("    out lerp.js require callback");
});
console.log("out lerp.js")
