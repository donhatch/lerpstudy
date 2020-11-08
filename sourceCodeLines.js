// http://stackoverflow.com/questions/43140346/function-in-an-amd-module-needs-to-read-its-callers-source-code
'use strict';
console.log("in sourceCodeLines.js");
// Assumes require.js has been loaded
define([], function () {
    console.log("    in sourceCodeLines.js define callback");
    // Module value is just an initially blank object.
    // Callers of PRINT and CHECK register their source code lines by saying:
    //    sourceCodeLines[myURL] = mySourceCodeLines;
    // and then PRINT and CHECK can look up their caller's source code lines as:
    //    let myCallersSourceCodeLines = sourceCodeLines[myCallersURL];
    console.log("    out sourceCodeLines.js define callback, returning {}");
    return {};
});
console.log("out sourceCodeLines.js");
