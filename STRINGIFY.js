'use strict';
console.log("in STRINGIFY.js");

// TODO: accept a filter and translation function, like JSON.parse does
// TODO: allow specification of multi-line formatting with indent, like JSON.parse has

// JSON.stringify is aggravating me-- it changes all sorts of stuff.
// See the documentation.

define([], function() {
  console.log("    in STRINGIFY.js define callback");

  // Naive STRINGIFY.  Works on non-cyclic structures; stack-overflows on cyclic ones.
  let STRINGIFYnaive = (x,dummy) => {
    if (dummy !== undefined) {
      throw new Error("STRINGIFY called with more than one arg, not supported yet");
    }
    if (x === undefined) return 'undefined';
    if (x === Infinity) return 'Infinity';
    if (x === -Infinity) return '-Infinity';
    if (typeof(x) === 'number' && isNaN(x)) return 'NaN';
    if (Array.isArray(x)) { // have to test this before 'object'
      let answer = '[';
      for (let i = 0; i < x.length; ++i) {
        if (i > 0) answer += ',';
        answer += STRINGIFYnaive(x[i]);
      }
      answer += ']';
      return answer;
    }
    if (x != null && typeof(x) == 'object') { // funky typeof(null) is 'object'
      let answer = '';
      if (x.constructor.name !== 'Object') {
        answer += '[object '+x.constructor.name+']';
      }
      answer += '{';
      let keys = Object.getOwnPropertyNames(x);
      for (let i = 0; i < keys.length; ++i) {
        let key = keys[i];
        if (i > 0) answer += ','
        if (typeof key === 'string' && /^[_a-zA-Z0-9]+$/.test(key)) { // conservative test; assume *not* an identifier if in doubt
          answer += key;
        } else {
          answer += STRINGIFYnaive(key);
        }
        answer += ':'+STRINGIFYnaive(x[key]);
      }
      answer += '}';
      return answer;
    }
    if (typeof x === 'function') { // JSON.stringify turns these into undefined
      let answer = 'function(...) {...}';
      return answer;
    }
    return JSON.stringify(x); // XXX hoping all recursion was handled by the above
  }; // STRINGIFYnaive

  // bootstrap; can't call the real CHECK since it will end up calling the code we're in
  let CHECK = function(cond, optionalMessage) {
    if (!cond) {
      throw new Error("bootstrap CHECK failed");
    }
  };  // CHECK  // CHECK bootstrap
  CHECK.EQ = function(a, b, optionalMessage) {
    if (!(a === b)) {
      throw new Error("bootstrap CHECK failed: "+JSON.stringify(a)+" === "+JSON.stringify(b));
    }
  };  // CHECK.EQ

  let STRINGIFYbasicTest = function(STRINGIFY) {
    console.log("        in STRINGIFYbasicTest");
    CHECK.EQ(STRINGIFY(undefined), 'undefined');
    CHECK.EQ(STRINGIFY(null), 'null');
    CHECK.EQ(STRINGIFY(2), '2');
    CHECK.EQ(STRINGIFY(NaN), 'NaN');
    CHECK.EQ(STRINGIFY([]), '[]');
    CHECK.EQ(STRINGIFY([[]]), '[[]]');
    CHECK.EQ(STRINGIFY([[],[]]), '[[],[]]');
    CHECK.EQ(STRINGIFY([1,2]), '[1,2]');
    CHECK.EQ(STRINGIFY({a:0}), '{a:0}');
    CHECK.EQ(STRINGIFY({a:0,b:1}), '{a:0,b:1}');
    CHECK.EQ(STRINGIFY({a0:0}), '{a0:0}');
    CHECK.EQ(STRINGIFY({'[':0}), '{"[":0}');
    CHECK.EQ(STRINGIFY(()=>{}), 'function(...) {...}');
    console.log("        out STRINGIFYbasicTest");
  };

  STRINGIFYnaive.test = function() {
    STRINGIFYbasicTest(STRINGIFYnaive);
  };

  // Attempt a version that doesn't get all tangled up when circular,
  // and also shows sharing.
  // Examples:
  //    let a = [];
  //    console.log(STRINGIFY([a,a])); // [x0=[],x0]
  //    let b = [];
  //    b.push(b);
  //    console.log(STRINGIFY(b)); // x0=[x0]  (it wouldn't really work for constructing it, but at least it shows what's going on)

  // pass 1: record every location in x.
  let pass1 = (x, locationToIndex, indexToRefCount) => {
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      let index = locationToIndex.get(x);
      if (index === undefined) {
        index = indexToRefCount.length;
        indexToRefCount.push(1);
        locationToIndex.set(x, index);
        if (Array.isArray(x)) { // have to test this before 'object'
          for (let i = 0; i < x.length; ++i) {
            pass1(x[i], locationToIndex, indexToRefCount);
          }
        } else if (typeof x === 'object') {
          let keys = Object.getOwnPropertyNames(x);
          for (let i = 0; i < keys.length; ++i) {
            let key = keys[i];
            pass1(key, locationToIndex, indexToRefCount);
            pass1(x[key], locationToIndex, indexToRefCount);
          }
        }
      } else {
        indexToRefCount[index]++;
      }
    }
  };  // pass1
  // pass 2: stringify using the information from pass 1 to avoid redundancy,
  // appending pieces of answer into answerPieces.
  let pass2 = (x, locationToIndex, locationIndexToVarIndex, varIndexToRefsSeenSoFar, answerPieces) => {
    if (x === undefined) answerPieces.push('undefined');
    else if (x === Infinity) answerPieces.push('Infinity');
    else if (x === -Infinity) answerPieces.push('-Infinity');
    else if (typeof(x) === 'number' && isNaN(x)) answerPieces.push('NaN');
    else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      let locationIndex = locationToIndex.get(x);
      let varIndex = locationIndexToVarIndex[locationIndex];
      if (varIndex != -1) {
        answerPieces.push('x'+varIndex);
        if (varIndexToRefsSeenSoFar[varIndex]++ > 0) {
          // It's the second or later occurrance of the given object.
          // Having emitted 'x0' or whatever, just return.
          return;
        }
        answerPieces.push('=');
      }
      if (Array.isArray(x)) { // have to test this before 'object'
        answerPieces.push('[');
        for (let i = 0; i < x.length; ++i) {
          if (i > 0) answerPieces.push(',');
          pass2(x[i], locationToIndex, locationIndexToVarIndex, varIndexToRefsSeenSoFar, answerPieces);
        }
        answerPieces.push(']');
      } else if (typeof x === 'object') {
        if (x.constructor.name !== 'Object') {
          answerPieces.push('[object '+x.constructor.name+']');
        }
        answerPieces.push('{');
        let keys = Object.getOwnPropertyNames(x);
        for (let i = 0; i < keys.length; ++i) {
          let key = keys[i];
          if (i > 0) answerPieces.push(',');
          if (typeof key === 'string' && /^[_a-zA-Z0-9]+$/.test(key)) { // conservative test; assume *not* an identifier if in doubt
            answerPieces.push(key);
          } else {
            pass2(key, locationToIndex, locationIndexToVarIndex, varIndexToRefsSeenSoFar, answerPieces);
          }
          answerPieces.push(':');
          pass2(x[key], locationToIndex, locationIndexToVarIndex, varIndexToRefsSeenSoFar, answerPieces);
        }
        answerPieces.push('}');
      } else if (typeof x === 'function') {
        answerPieces.push('function(...) {...}');
      } else {
        // this can't happen
        throw new Error("internal error in STRINGIFY");
      }
    } else {
      answerPieces.push(JSON.stringify(x));
    }
  };  // pass2

  let STRINGIFYsmart= (x,dummy) => {
    if (dummy !== undefined) {
      throw new Error("STRINGIFY called with more than one arg, not supported yet");
    }
    let locationToIndex = new Map();
    let locationIndexToRefCount = [];
    pass1(x, locationToIndex, locationIndexToRefCount);

    let locationIndexToVarIndex = [];

    let nVars = 0;
    for (let iLocation = 0; iLocation < locationIndexToRefCount.length; ++iLocation) {
      locationIndexToVarIndex.push(locationIndexToRefCount[iLocation] >= 2 ? nVars++ : -1);
    }
    let varIndexToRefsSeenSoFar = new Array(nVars).fill(0);
    let answerPieces = [];
    pass2(x, locationToIndex, locationIndexToVarIndex, varIndexToRefsSeenSoFar, answerPieces);
    return answerPieces.join('');
  };  // STRINGIFYsmart


  STRINGIFYsmart.test = function() {
    console.log("    in STRINGIFYsmart.test");
    STRINGIFYbasicTest(STRINGIFYsmart);
    {
      let a = [];
      CHECK.EQ(STRINGIFYsmart([a,a]), '[x0=[],x0]');
    }
    {
      let b = [];
      b.push(b);
      CHECK.EQ(STRINGIFYsmart(b), 'x0=[x0]');
      CHECK.EQ(STRINGIFYsmart([b,b]), '[x0=[x0],x0]');
    }
    {
      let c = [];
      let d = [c,c];
      d.push(d);
      CHECK.EQ(STRINGIFYsmart(d), 'x0=[x1=[],x1,x0]');
    }
    console.log("      passed!");
    console.log("    out STRINGIFYsmart.test");
  };

  if (false) {
    console.log("    out STRINGIFY.js define callback, returning STRINGIFYnaive");
    return STRINGIFYnaive;
  } else {
    console.log("    out STRINGIFY.js define callback, returning STRINGIFYsmart");
    return STRINGIFYsmart;
  }
});  // define callback

console.log("out STRINGIFY.js");
