// http://stackoverflow.com/questions/43140346/function-in-an-amd-module-needs-to-read-its-callers-source-code

// TODO: look over the following.
//      http://blog.novanet.no/4-strategies-for-passing-parameters-to-requirejs-modules/
//      http://enzolutions.com/articles/2014/09/16/how-to-pass-parameters-to-requirejs-modules/
//      http://stackoverflow.com/questions/10319027/requirejs-pass-parameters-into-module-for-initialization
//      http://stackoverflow.com/questions/23458009/requirejs-define-parameters
//      http://stackoverflow.com/questions/29367324/passing-parameters-in-requirejs-via-a-require-call-in-define
//      http://stackoverflow.com/questions/37238234/how-to-correctly-pass-parameters-to-requirejs-callback-function
//      http://stackoverflow.com/questions/9617984/url-cache-busting-parameters-with-requirejs
//      http://stackoverflow.com/questions/10463895/parameters-to-main-with-requirejs-and-data-main
// see my requirejs notes.
//

"use strict";
console.log("in PRINT.js");
define(['./sourceCodeLines.js', './STRINGIFY.js', './getStackTrace.js'], function(sourceCodeLines, STRINGIFY, getStackTrace) {
  console.log("    in PRINT.js define callback");

  if (false) {  // TODO: remove this if I can
    // XXX HACK- I am lost.
    // XXX why did I do this, exactly??
    // XXX maybe just so I can experiment in the console?
    if (window.STRINGIFY === undefined) {
      console.log("HACK HACK HACK-- setting window.STRINGIFY to STRINGIFY");
      window.STRINGIFY = STRINGIFY;
    }
  }

  let makePRINTlikeFunction = function(name,callback) {
    //console.log("    in makePRINTlikeFunction("name="+name+", callback="+callback+")");
    if (arguments.length !== 2) {
      throw new Error("makePRINTlikeFunction: expected arguments.length===3, got "+arguments.length);
    }
    let answer = function(value) {
        let verboseLevel = 0;
        if (verboseLevel >= 1) console.log("    in "+name+"(value="+STRINGIFY(value)+")");
        let stack_trace = getStackTrace();
        if (verboseLevel >= 2) console.log("stack_trace = ",JSON.stringify(stack_trace,null, 4)); // yes, JSON.stringify instead of STRINGIFY, for the formatting
        let stack_frame = stack_trace[1];
        if (stack_frame === null) {
          console.warn("internal error in "+name+": can't get stack frame");
        }
        let callerURL = stack_frame===null ? "????" : stack_frame[1];
        let linenum = stack_frame===null ? "???" : stack_frame[2];
        let colnum = stack_frame===null ? "??" : stack_frame[3];
        if (verboseLevel >= 2) console.log("callerURL = ",STRINGIFY(callerURL));

        let callerSourceCodeLines = sourceCodeLines[callerURL];
        if (verboseLevel >= 3) console.log("callerSourceCodeLines = "+STRINGIFY(callerSourceCodeLines));

        if (callerSourceCodeLines === undefined) {
            console.error("["+name+"(value="+JSON.stringify(value)+") failed: couldn't get file contents for "+JSON.stringify(callerURL)+" for some reason.  Did you use registerSourceCodeLinesAndDefine in it?]");
            return;
        }
        if (linenum < 1 || linenum > callerSourceCodeLines.length) {
            console.error("["+name+"(value="+JSON.stringify(value)+") failed: caller stack trace line "+JSON.stringify(callerStackTraceLine)+" says linenum="+JSON.stringify(linenum)+" but number of caller source code lines from "+JSON.stringify(callerURL)+" is "+callerSourceCodeLines.length);
            return;
        }
        let callerLine = callerSourceCodeLines[linenum-1];
        let callerPartOfLine = callerLine.slice(colnum-1);
        {
            //let reResult = /^.*PRINT\s*\((.*)\);\s*(\/\/.*)?$/.exec(callerPartOfLine); // oversimplistic regex
            let reResult = new RegExp('^.*'+name+'\\s*\\((.*)\\);\\s*(\\/\\/.*)?$').exec(callerPartOfLine); // oversimplistic regex
            if (reResult === null) {
                console.error("["+name+"(value="+JSON.stringify(value)+") failed: couldn't parse caller part of line "+JSON.stringify(callerPartOfLine)+"]");
                return;
            }
            let [, expr] = reResult;
            callback(expr, value);
        }
     }
     //console.log("    out makePRINTlikeFunction("name="+name+", callback="+callback+")");
     return answer;
   }; // makePRINTlikeFunction


  let PRINT = makePRINTlikeFunction('PRINT', (expr, value) => console.log(expr+" = "+STRINGIFY(value))); // XXX TODO: think about whether to use console.log's builtin printing in some cases

  // Hook on other conveniences
  PRINT.makePRINTlikeFunction = makePRINTlikeFunction;

  console.log("    out PRINT.js define callback, returning PRINT");
  return PRINT;
});
console.log("out PRINT.js");
