// http://stackoverflow.com/questions/43140346/function-in-an-amd-module-needs-to-read-its-callers-source-code

// CBB: CHECK.LE(NaN, 0) reports internal error without giving the source code; should consider it a normal CHECK-fail

"use strict";
console.log("in CHECK.js");

define(['./sourceCodeLines.js', './STRINGIFY.js', './getStackTrace.js'], function(sourceCodeLines, STRINGIFY, getStackTrace) {
  console.log("    in CHECK.js define callback");

  // TODO: perhaps even more ambitious parse so we don't need to say CHECK.EQ(1+2, 3+4), can just say CHECK(1+2 === 3+4)
  // and it will know to print the values?  Not sure.

  let _CHECK_FAIL = function(failedConditionDescription) {

    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("    in _CHECK_FAIL(value="+STRINGIFY(value)+")");
    let stack_trace = getStackTrace();
    if (verboseLevel >= 2) console.log("stack_trace = ",STRINGIFY(stack_trace,null, 4));
    let stack_frame = stack_trace[2]; // [0] is me, [1] is the caller (CHECK or CHECK.EQ or whatever), [2] is the caller of CHECK or CHECK.EQ or whatever, which is what we want
    let callerURL = stack_frame[1];
    let linenum = stack_frame[2];
    let colnum = stack_frame[3];
    if (verboseLevel >= 2) console.log("callerURL = ",STRINGIFY(callerURL));

    let callerSourceCodeLines = sourceCodeLines[callerURL];
    if (verboseLevel >= 3) console.log("callerSourceCodeLines = "+STRINGIFY(callerSourceCodeLines));

    if (callerSourceCodeLines === undefined) {
        let error = new Error("Internal error during _CHECK_FAIL(failedConditionDescription="+JSON.stringify(failedConditionDescription)+"): couldn't get file contents for "+JSON.stringify(callerURL)+". Did you use registerSourceCodeLinesAndDefine in it?");
        console.error(error.message);  // spam console in addition to throwing
        throw error;
    }
    if (linenum < 1 || linenum > callerSourceCodeLines.length) {
        throw new Error("Internal error during _CHECK_FAIL(failedConditionDescription="+JSON.stringify(failedConditionDescription)+"): caller stack trace line "+JSON.stringify(callerStackTraceLine)+" says linenum="+JSON.stringify(linenum)+" but number of caller source code lines from "+JSON.stringify(callerURL)+" is "+callerSourceCodeLines.length);
    }
    let callerLine = callerSourceCodeLines[linenum-1];
    let callerPartOfLine = callerLine.slice(colnum-1);
    {
        // Note that if called via "CHECK.EQ(a,b);", then callerPartOfLine will be "EQ(a,b);"
        let reResult = /^\s*([A-Z_]+)\s*\((.*)\);\s*(\/\/.*)?$/.exec(callerPartOfLine); // oversimplistic regex
        if (reResult === null) {
            let error = new Error("Internal error during _CHECK_FAILED(failedConditionDescription="+JSON.stringify(failedConditionDescription)+"): couldn't parse caller part of line "+JSON.stringify(callerPartOfLine)+"]");
            console.error(error.message);
            throw error;
        }
        let [, CHECKfunctionName, expr] = reResult;

        let message;
        if (failedConditionDescription===null) {
          //message = "CHECK failed: "+expr;
          message = "CHECK("+expr+") failed";
        } else {
          //message = "CHECK failed: "+failedConditionDescription+" ["+CHECKfunctionName+"("+expr+")]";
          message = "CHECK."+CHECKfunctionName+"("+expr+") failed because !("+failedConditionDescription+")";
          // TODO: maybe would be nicer to say:
          //   CHECK failed: 1+2 === 3+4 (3 vs. 7) at http://darn.mtv.corp.google.com:8080/mapsapi/RocktreeBrowser.js:1953:7
          // Parens would be necessary around expressions containing any of the chars: &^|?:=
        };
        let error = new Error(message);

        let stackLines = error.stack.split('\n');
        // [0] is something
        // [1] is me
        // [2] is the caller (the CHECK or CHECK.EQ or whatever)
        // [3] is the caller of the CHECK or CHECK.EQ or whatever, which is what we want
        error.message += " "+stackLines[3].trim();

        // Spam the console, even though we are throwing.
        // This makes sure user sees something even if the error gets swallowed for some reason.
        // So, it's impossible to do a silent CHECK!
        console.error(error.message);

        throw error;
    }
  }; // _CHECK_FAIL

  let CHECK = function(cond) {
    if (arguments.length !== 1) {
      throw new Error("Bad CHECK: arguments.length is "+arguments.length+", should be 1");
    }
    if (!(cond === true)) {
      if (!(cond === false)) {
        throw new Error("Bad CHECK: cond="+STRINGIFY(cond)+" is of type "+typeof(cond)+", expected boolean");
      }
      _CHECK_FAIL(null);
    }
  };  // CHECK
  CHECK.LT = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.LT: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a < b)) {
      let condDescription = ""+STRINGIFY(a)+" < "+STRINGIFY(b);
      if (!(a >= b)) {
        throw new Error("Bad CHECK.LT: "+condDescription+" (neither < nor >=)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LT
  CHECK.GT = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.GT: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a > b)) {
      let condDescription = ""+STRINGIFY(a)+" > "+STRINGIFY(b);
      if (!(a <= b)) {
        throw new Error("Bad CHECK.GT: "+condDescription+" (neither > nor <=)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.GT
  CHECK.LE = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.LE: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a <= b)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b);
      if (!(a > b)) {
        throw new Error("Bad CHECK.LE: "+condDescription+" (neither <= nor >)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE
  CHECK.GE = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.GE: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a >= b)) {
      let condDescription = ""+STRINGIFY(a)+" >= "+STRINGIFY(b);
      if (!(a < b)) {
        throw new Error("Bad CHECK.GE: "+condDescription+" (neither >= nor <)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE
  CHECK.DEEPEQ = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.EQ: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(STRINGIFY(a) === STRINGIFY(b))) {
      let condDescription = ""+STRINGIFY(a)+" deep equals "+STRINGIFY(b);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.DEEPEQ
  // note, this checks that a===b, which is a stronger condition than a==b.  So it will fail more often than you might think.
  CHECK.EQ = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.EQ: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a === b)) {
      let condDescription = ""+STRINGIFY(a)+" === "+STRINGIFY(b);
      if (!(a !== b)) {
        throw new Error("Bad CHECK.EQ: "+condDescription+" (neither === nor !==)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.EQ
  // note, this checks that a!==b, *not* that a!=b.  So it will pass more often than you might think.
  CHECK.NE = function(a, b) {
    if (arguments.length !== 2) {
      throw new Error("Bad CHECK.NE: arguments.length is "+arguments.length+", should be 2");
    }
    if (!(a !== b)) {
      let condDescription = ""+STRINGIFY(a)+" !== "+STRINGIFY(b);
      if (!(a === b)) {
        throw new Error("Bad CHECK.NE: "+condDescription+" (neither !== nor ===)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.NE
  CHECK.LT_LT = function(a, b, c) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.LT_LT: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a < b && b < c)) {
      let condDescription = ""+STRINGIFY(a)+" < "+STRINGIFY(b)+" < "+STRINGIFY(c);
      if (!(a >= b || b >= c)) {
        throw new Error("Bad CHECK.LT_LT: "+condDescription+" (neither both < nor either >=)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LT_LT
  CHECK.LE_LT = function(a, b, c) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.LE_LT: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a <= b && b < c)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" < "+STRINGIFY(c);
      if (!(a > b || b >= c)) {
        throw new Error("Bad CHECK.LE_LT: "+condDescription+" (neither <=&&< nor >||>=)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE_LT
  CHECK.LT_LE = function(a, b, c) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.LT_LE: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a < b && b <= c)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" < "+STRINGIFY(c);
      if (!(a >= b || b > c)) {
        throw new Error("Bad CHECK.LT_LE: "+condDescription+" (neither <&&<= nor >=||>)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE_LT
  CHECK.LE_LE = function(a, b, c) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.LE_LE: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a <= b && b <= c)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" <= "+STRINGIFY(c);
      if (!(a > b || b > c)) {
        throw new Error("Bad CHECK.LE_LE: "+condDescription+" (neither both <= nor either >)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE_LE
  CHECK.EQ_EQ = function(a, b, c) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.EQ_EQ: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a === b && b === c)) {
      let condDescription = ""+STRINGIFY(a)+" === "+STRINGIFY(b)+" === "+STRINGIFY(c);
      if (!(a !== b || b !== c)) {
        throw new Error("Bad CHECK.EQ_EQ: "+condDescription+" (neither both === nor either !==)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.EQ_EQ

  CHECK.LE_LE_LE = function(a, b, c, d) {
    if (arguments.length !== 4) {
      throw new Error("Bad CHECK.LE_LE_LE: arguments.length is "+arguments.length+", should be 4");
    }
    if (!(a <= b && b <= c && c <= d)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" <= "+STRINGIFY(c)+" <= "+STRINGIFY(d);
      if (!(a > b || b > c || c > d)) {
        throw new Error("Bad CHECK.LE_LE_LE: "+condDescription+" (neither all <= nor any >)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE_LE_LE
  CHECK.LT_LT_LT = function(a, b, c, d) {
    if (arguments.length !== 4) {
      throw new Error("Bad CHECK.LT_LT_LT: arguments.length is "+arguments.length+", should be 4");
    }
    if (!(a < b && b < c && c < d)) {
      let condDescription = ""+STRINGIFY(a)+" < "+STRINGIFY(b)+" < "+STRINGIFY(c)+" < "+STRINGIFY(d);
      if (!(a >= b || b >= c || c >= d)) {
        throw new Error("Bad CHECK.LT_LT_LT: "+condDescription+" (neither all < nor any >=)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LT_LT_LT
  CHECK.LE_LT_LE = function(a, b, c, d) {
    if (arguments.length !== 4) {
      throw new Error("Bad CHECK.LE_LT_LE: arguments.length is "+arguments.length+", should be 4");
    }
    if (!(a <= b && b < c && c <= d)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" < "+STRINGIFY(c)+" <= "+STRINGIFY(d);
      if (!(a > b || b >= c || c > d)) {
        throw new Error("Bad CHECK.LT_LT_LT: "+condDescription+" (neither all of <=,<,<= nor any of >,>=,>)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LT_LT_LT
  CHECK.EQ_EQ_EQ = function(a, b, c, d) {
    if (arguments.length !== 4) {
      throw new Error("Bad CHECK.EQ_EQ: arguments.length is "+arguments.length+", should be 4");
    }
    if (!(a === b && b === c && c === d)) {
      let condDescription = ""+STRINGIFY(a)+" === "+STRINGIFY(b)+" === "+STRINGIFY(c)+" === "+STRINGIFY(d);
      if (!(a !== b || b !== c || c != d)) {
        throw new Error("Bad CHECK.EQ_EQ: "+condDescription+" (neither all === nor any !==)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.EQ_EQ_EQ

  CHECK.LE_LE_LE_LE = function(a, b, c, d, e) {
    if (arguments.length !== 5) {
      throw new Error("Bad CHECK.LE_LE_LE_LE: arguments.length is "+arguments.length+", should be 5");
    }
    if (!(a <= b && b <= c && c <= d && d <= e)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" <= "+STRINGIFY(c)+" <= "+STRINGIFY(d)+" <= "+STRINGIFY(e);
      if (!(a > b || b > c || c > d || d > e)) {
        throw new Error("Bad CHECK.LE_LE_LE: "+condDescription+" (neither all <= nor any >)");
      }
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.LE_LE_LE_LE

  CHECK.ALMOST_EQ = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_EQ: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(Math.abs(a-b) <= tol)) {
      let condDescription = ""+STRINGIFY(a)+" == "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_EQ
  // Hmm, confusing name.
  CHECK.ALMOST_NE = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_NE: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(Math.abs(a-b) > tol)) {
      let condDescription = ""+STRINGIFY(a)+" != "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_NE
  CHECK.ALMOST_LE = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_LE: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a-b <= tol)) {
      let condDescription = ""+STRINGIFY(a)+" <= "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_LE
  CHECK.ALMOST_GE = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_GE: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(b-a <= tol)) {
      let condDescription = ""+STRINGIFY(a)+" >= "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_GE
  CHECK.ALMOST_LT = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_LT: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(b-a > tol)) {
      let condDescription = ""+STRINGIFY(a)+" < "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_LT
  CHECK.ALMOST_GT = function(a, b, tol) {
    if (arguments.length !== 3) {
      throw new Error("Bad CHECK.ALMOST_GT: arguments.length is "+arguments.length+", should be 3");
    }
    if (!(a-b > tol)) {
      let condDescription = ""+STRINGIFY(a)+" > "+STRINGIFY(b)+" +-"+STRINGIFY(tol);
      _CHECK_FAIL(condDescription);
    }
  };  // CHECK.ALMOST_GT

  console.log("    out CHECK.js define callback, returning CHECK (with other functions as properties)");
  return CHECK;
});  // define callback

console.log("out CHECK.js");
