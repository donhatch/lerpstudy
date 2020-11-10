'use strict';
console.log("in getURLParameter.js");
registerSourceCodeLinesAndDefine(['./CHECK.js'], function(CHECK) {
  console.log("    in getURLParameter.js define callback");

  // http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513
  // TODO: I think this returns null if the value is empty?  what an awful choice :-(
  let getURLParameter = function(name) {
    CHECK.EQ(arguments.length, 1);
    CHECK.EQ(typeof(name), 'string');
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
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
    let value = parseInt(valueString); // CBB: parseInt allows trailing garbage
    if (isNaN(value)) {
      throw Error('bad url param '+name+'='+valueString+'');
    }
    return value;
  };
  let getURLParameterFloatOr = function(name, defaultValue) {
    CHECK.EQ(arguments.length, 2);
    CHECK.EQ(typeof(name), 'string');
    let valueString = getURLParameter(name);
    if (valueString == null) return defaultValue;
    let value = parseFloat(valueString); // CBB: parseFloat allows trailing garbage
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
