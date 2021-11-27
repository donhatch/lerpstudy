'use strict';
console.log("in getURLParameter.js");
registerSourceCodeLinesAndDefine(['./CHECK.js'], function(CHECK) {
  console.log("    in getURLParameter.js define callback");

  let getURLParameter = function(name) {
    CHECK.EQ(arguments.length, 1);
    CHECK.EQ(typeof(name), 'string');
    return new URLSearchParams(window.location.search).get(name);  // null if it isn't there
  };
  let getURLParameterOr = function(name, defaultValue) {
    CHECK.EQ(arguments.length, 2);
    CHECK.EQ(typeof(name), 'string');
    let value = getURLParameter(name);
    return value!==null ? value : defaultValue;
  };
  // note that defaultValue need not be an int.
  let getURLParameterIntOr = function(name, defaultValue) {
    CHECK.EQ(arguments.length, 2);
    CHECK.EQ(typeof(name), 'string');
    let valueString = getURLParameter(name);
    if (valueString == null) return defaultValue;
    // Do not use parseInt for this, since that ignores trailing spaces.
    // However, beware that the Number constructor unhelpfully converts
    // zero-or-more spaces to 0.
    let value = /\s*/.test(valueString) ? NaN : Number(valueString);
    if (!Number.isInteger(value)) {
      throw Error('bad url param '+name+'='+valueString+'');
    }
    return value;
  };
  let getURLParameterFloatOr = function(name, defaultValue) {
    CHECK.EQ(arguments.length, 2);
    CHECK.EQ(typeof(name), 'string');
    let valueString = getURLParameter(name);
    if (valueString == null) return defaultValue;
    // Do not use parseFloat for this, since that ignores trailing spaces.
    // However, beware that the Number constructor unhelpfully converts
    // zero-or-more spaces to 0.
    let value = /^\s*$/.test(valueString) ? NaN : Number(valueString);
    if (isNaN(value)) {
      throw Error('bad url param '+name+'='+valueString+'');
    }
    return value;
  };

  let answer = {
    getURLParameter: getURLParameter,
    getURLParameterOr: getURLParameterOr,
    getURLParameterIntOr: getURLParameterIntOr,
    getURLParameterFloatOr: getURLParameterFloatOr,
  };
  console.log("    out getURLParameter.js define callback");
  return answer;
});
console.log("out getURLParameter.js");
