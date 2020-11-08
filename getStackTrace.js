console.log("in getStackTrace.js");

/*
  How to do this without re-downloading the script or page?
    - TODO: see how firebug lite finds the scripts (with line numbers!) it shows in its Scripts tab
        http://stackoverflow.com/questions/6885659/determining-source-line-and-file-of-function-reference-how-does-firebug-do-it
        A: oh, it just enumerates them... it's *not* showing line numbers relative to source file :-(
        And the answer seems to say firebug is an extension that uses privileges normal scripts don't have.
        But... can I write a really minimal extension that would give a script this ability?


        But... still a good thing to follow up on from there: 
    - TODO: (tangent) firebug lite faq says Fiddler is probably a great tool for problems with HTTP headers
*/


define([], function() {
  console.log("    in getStackTrace.js define callback");

  // Holy moly!
  // Return an array of [func, file, linenum, colnum].
  // func will be null if there was none (top level).
  // null will be returned on failure (unexpected thing happened).
  let getStackTrace = function() {
    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in getStackTrace");
    var errorNotReally = new Error('(not really an error; getting stack trace)');
    //console.log("errorNotReally = ",errorNotReally);
    if (false) {
      console.log("=====================================================");
      console.log("errorNotReally.prototype = ",errorNotReally.prototype);
      console.log("errorNotReally.keys = ",errorNotReally.keys);
      console.log("errorNotReally.length = ",errorNotReally.length);
      console.log("Error.length = ",Error.length);
      console.log("Error.prototype = ",Error.prototype);
      console.log("Error.toString() = ",Error.toString());
    }
    //console.log("errorNotReally.stack = ",JSON.stringify(errorNotReally.stack));
    if (false) {
      console.log("=====================================================");
    }
    var lines = errorNotReally.stack.split('\n');
    if (verboseLevel >= 1) console.log("lines = ",JSON.stringify(lines,null,4));

    lines = lines.slice(2); // skip initial description and this stack frame
    lines = lines.map(function(line) {return line.trim()}); // XXX or use call() or something?
    var stuff = lines.map(function(line) {
      // Sample lines:
      //   "    at CHECK (http://somewhere.com:8080/motf/dimple5.html?whichData=4&bucketSize=5:137:30)"
      //   "    at new PromiseThrottler (http://somewhere.com:8080/mapsapi/PromiseThrottler.js:14:3)"
      //   "    at new PromiseThrottler (http://somewhere.com:8080/mapsapi/file name with spaces.js:14:3)"
      //   "    at foofoo (http://somewhere.com:8080/mapsapi/file:name:with:colons.js:3:3)",
      //   "    at new PromiseThrottler (http://somewhere.com:8080/mapsapi/file%20name%20with%20spaces.js:14:3)"
      //   "    at http://somewhere.com:8080/motf/dimple5.html?whichData=4&bucketSize=5:158:9"
      // (although the case with spaces probably doesn't happen since they get replaced by %20)
      // Want to extract:
      //   function file line column

      // Note, the initial \s* rather than \s+ is sort of a hack
      // so that we'll match even if func was omitted, without too much
      // extra work.

      let reResult = /^\s*at\s*(.*)\s+\((\S*):(\d+):(\d+)\)$/.exec(line); // with parens
      if (reResult == null) {
        reResult = /^\s*at\s*(.*)\s+(\S*):(\d+):(\d+)$/.exec(line); // without parens
      }
      if (reResult == null) {
        return null;
      } else {
        let [all, func, file, linenum, colnum] = reResult;
        return [func, file, linenum, colnum];
      }
    });
    if (verboseLevel >= 1) console.log("            out getStackTrace, returning"+JSON.stringify(stuff,null,4));
    return stuff;
  };  // getStackTrace

  console.log("    out getStackTrace.js define callback");
  return getStackTrace;
});

console.log("out getStackTrace.js");
