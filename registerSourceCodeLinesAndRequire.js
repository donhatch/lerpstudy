console.log("in registerSourceCodeLinesAndRequire.js");
// http://stackoverflow.com/questions/43140346/function-in-an-amd-module-needs-to-read-its-callers-source-code

'use strict';

// Include require.js or dojo before this.

// Wrapper for require(), which also fetches and registers the caller's source
// code so the caller's source code will be available to PRINT and CHECK.
// Requires of PRINT and/or CHECK should use this instead of require().
let registerSourceCodeLinesAndRequire = function(deps0, callback0) {
    console.log("in registerSourceCodeLinesAndRequire");
    let stackTraceLines = new Error().stack.split('\n');
    let callerStackTraceLine = stackTraceLines[2].trim();
    let reResult = /^at (.+):\d+:\d+$/.exec(callerStackTraceLine); // oversimplistic regex
    if (reResult === null) {
        throw new Error("registerSourceCodeLinesAndRequire failed: couldn't parse caller stack trace line "+JSON.stringify(callerStackTraceLine));
    }
    let [, thisCallersURL] = reResult;
    // Assumes requirejs has been loaded
    require(['./sourceCodeLines.js', './text.js!'+thisCallersURL, ...deps0], function(sourceCodeLines, thisCallersFileContents, ...args0) {
        sourceCodeLines[thisCallersURL] = thisCallersFileContents.split('\n');
        callback0(...args0);
    });
    console.log("out registerSourceCodeLinesAndRequire");
}; // registerSourceCodeLinesAndRequire

// Wrapper for define(), which also fetches and registers the caller's source
// code so the caller's source code will be available to PRINT and CHECK.
// Modules that depend on PRINT and/or CHECK should define themselves using
// this instead of define().
let registerSourceCodeLinesAndDefine = function(deps0, callback0) {
    console.log("in registerSourceCodeLinesAndDefine");
    let stackTraceLines = new Error().stack.split('\n');
    let callerStackTraceLine = stackTraceLines[2].trim();
    let reResult = /^at (.+):\d+:\d+$/.exec(callerStackTraceLine); // oversimplistic regex
    if (reResult === null) {
        throw new Error("registerSourceCodeLinesAndDefine failed: couldn't parse caller stack trace line "+JSON.stringify(callerStackTraceLine));
    }
    let [, thisCallersURL] = reResult;
    // Assumes requirejs has been loaded
    define(['./sourceCodeLines.js', './text.js!'+thisCallersURL, ...deps0], function(sourceCodeLines, thisCallersFileContents, ...args0) {
        sourceCodeLines[thisCallersURL] = thisCallersFileContents.split('\n');
        return callback0(...args0);
    });
    console.log("out registerSourceCodeLinesAndDefine");
}; // registerSourceCodeLinesAndDefine
console.log("out registerSourceCodeLinesAndRequire.js");
