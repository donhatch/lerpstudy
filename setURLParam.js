'use strict';
console.log("in setURLParam.js");
define([
  './STRINGIFY.js',
], function(
  STRINGIFY
) {

  // Split into two parst, on first occurrance of character c.
  // If c does not occur, the second part returned is the empty string.
  var splitOnFirst = function(s, c) {
    var ind = s.indexOf(c);
    if (ind == -1)
      return [s, ""];
    else
      return [s.substring(0, ind), s.substring(ind+1)];
  };  // splitOnFirst

  // utility used by setURLParam, but might be generally useful
  var parseURL = function(urlAndParamsAndHashString) {
    var splitParts = splitOnFirst(urlAndParamsAndHashString, '#');
    //console.log("splitParts = ",splitParts);
    var hash = splitParts[1];
    splitParts = splitOnFirst(splitParts[0], '?')
    var paramsString = splitParts[1];
    var url = splitParts[0];
    var paramStrings = paramsString==="" ? [] : paramsString.split("&");
    var params = paramStrings.map(function(paramString) {
      var equalsIndex = paramString.indexOf("=");
      if (equalsIndex != -1)
        return [decodeURIComponent(paramString.substring(0,equalsIndex)),
                decodeURIComponent(paramString.substring(equalsIndex+1))];
      else
        return [paramString, ""];
    });
    return [url, params, hash];
  };  // parseURL

  // utility used by setURLParam, but might be generally useful
  var formatURL = function(urlAndParamsAndHash, whetherToEncodeValue) {
    // CBB: whetherToEncodeValue is a hack added at the last minute, because I want things like scale=2/32^-2/10" to remain unmolested.  Probably not safe in general.
    if (arguments.length != 2) {
        throw new Error("formatURL got "+arguments.length+" args, expected 2");
    }
    var url = urlAndParamsAndHash[0];
    var params = urlAndParamsAndHash[1];
    var hash = urlAndParamsAndHash[2];
    var paramStrings = params.map(function(nameAndValue) {
      if (whetherToEncodeValue !== undefined && !whetherToEncodeValue) {
        return encodeURIComponent(nameAndValue[0])+"="+nameAndValue[1];
      } else {
        return encodeURIComponent(nameAndValue[0])+"="+encodeURIComponent(nameAndValue[1]);
      }
    });
    var answer = url;
    if (paramStrings.length !== 0) {
      answer += ("?" + paramStrings.join("&"));
    }
    if (hash.length != 0) {
      answer += ("#" + hash);
    }
    return answer;
  };  // formatURL

  // return a new urlAndParamsAndHashString
  var setURLParam = function(urlAndParamsAndHashString, name, value, whetherToEncodeValue) {
    // CBB: whetherToEncodeValue is a hack added at the last minute, because I want things like scale=2/32^-2/10" to remain unmolested.  Probably not safe in general.
    var verboseLevel = 0;  // increase to debug
    if (verboseLevel >= 1) console.log("    in setURLParam(\""+urlAndParamsAndHashString+"\", \""+name+"\", \""+value+"\")");
    var urlAndParamsAndHash = parseURL(urlAndParamsAndHashString);
    if (verboseLevel >= 1) console.log("      urlAndParams = ", urlAndParamsAndHash);

    var url = urlAndParamsAndHash[0];
    var params = urlAndParamsAndHash[1];
    var hash = urlAndParamsAndHash[2];
    if (verboseLevel >= 1) console.log("      url = ", url);
    if (verboseLevel >= 1) console.log("      params = ", params);
    if (verboseLevel >= 1) console.log("      hash = ", hash);
    var newParams = [];
    var foundIt = false;
    params.map(function(nameAndValue) {
      if (nameAndValue[0] === name) {
        if (!foundIt) {
          foundIt = true;
          if (value != null) {
            newParams.push([name, value]);
          }
        }
      } else {
        newParams.push(nameAndValue);
      }
    });
    if (!foundIt) {
      if (value != null) {
        newParams.push([name, value]);
      }
    }
    var newURLandParamsAndHash = [url, newParams, hash];
    if (verboseLevel >= 1) console.log("      newURLandParamsAndHash = ", newURLandParamsAndHash);
    var newURLandParamsAndHashString = formatURL(newURLandParamsAndHash, whetherToEncodeValue);
    if (verboseLevel >= 1) console.log("    out setURLParam(\""+urlAndParamsAndHashString+"\", \""+name+"\", \""+value+"\"), returning \""+newURLandParamsAndHashString+"\"");
    return newURLandParamsAndHashString;
  };  // setURLParam

  var unsetURLParam = function(urlAndParamsAndHashString, name) {
    return setURLParam(urlAndParamsAndHashString, name, null);
  };

  // returns a new urlAndParamsAndHashString.
  var setURLPartOfURLAndParamsAndHashString = function(urlAndParamsAndHashString, xformUrlPart, whetherToEncodeValue, verboseLevel) {
    if (arguments.length != 4) {
        throw new Error("setURLPartOfURLAndParamsAndHashString got "+arguments.length+" args, expected 4");
    }
    if (verboseLevel >= 1) console.log('        in setURLPartOfURLAndParamsAndHashString('+STRINGIFY(urlAndParamsAndHashString)+', xformUrl, whetherToEncodeValue='+STRINGIFY(whetherToEncodeValue)+')');
    const [url,params,hash] = parseURL(urlAndParamsAndHashString);
    if (verboseLevel >= 1) console.log('          [url,params,hash] = '+STRINGIFY([url,params,hash]));
    const answer = formatURL([xformUrlPart(url), params, hash], whetherToEncodeValue);
    if (verboseLevel >= 1) console.log('        out setURLPartOfURLAndParamsAndHashString, returning '+STRINGIFY(answer));
    return answer;
  };

  // We always print to console on this, because it's kind of heavyweight.
  // Any of the values can be null, meaning unset.
  var setURLAndParamsInURLBarWithVerboseLevel = function(xformUrlPart, nameValuePairs, whetherToEncodeValues, verboseLevel) {
    if (arguments.length != 4) {
        throw new Error("setURLParamsInURLBarWithVerbosity got "+arguments.length+" args, expected 4");
    }
    // CBB: whetherToEncodeValues is a hack added at the last minute, because I want things like scale=2/32^-2/10" to remain unmolested.  Probably not safe in general.
    if (verboseLevel >= 1) console.log('    in setURLParamsInURLBar(nameValuePairs='+STRINGIFY(nameValuePairs)+', whetherToEncodeValue='+STRINGIFY(whetherToEncodeValues)+')');
    var oldUrlAndParamsAndHashString = window.location.href; // that's the thing that contains the entire query string
    if (verboseLevel >= 1) console.log('      oldUrlAndParamsAndHashString = '+STRINGIFY(oldUrlAndParamsAndHashString));
    var newUrlAndParamsAndHashString = oldUrlAndParamsAndHashString;  // for starters
    for (var i = 0; i < nameValuePairs.length; ++i) {
      if (nameValuePairs[i].length != 2) {
        throw new Error("setURLParamsInURLBar called on something that's not a list of pairs: "+JSON.stringify(nameValuePairs));
      }
      var name = nameValuePairs[i][0];
      var value = nameValuePairs[i][1];
      if (typeof name !== 'string') {
        throw new Error("setURLParamsInURLBar called with name="+JSON.stringify(name)+" which is not a string");
      }
      newUrlAndParamsAndHashString = setURLParam(newUrlAndParamsAndHashString, name, value, whetherToEncodeValues);
    }
    newUrlAndParamsAndHashString = setURLPartOfURLAndParamsAndHashString(newUrlAndParamsAndHashString, xformUrlPart, whetherToEncodeValues, verboseLevel);
    if (verboseLevel >= 1) console.log('      newUrlAndParamsAndHashString = '+STRINGIFY(newUrlAndParamsAndHashString));
    window.history.replaceState("Object", "Title", newUrlAndParamsAndHashString);
    if (verboseLevel >= 1) console.log('    out setURLParamsInURLBar(nameValuePairs='+STRINGIFY(nameValuePairs)+', whetherToEncodeValue='+STRINGIFY(whetherToEncodeValues)+')');
  };
  var setURLAndParamsInURLBar = function(xformUrlPart, nameValuePairs, whetherToEncodeValues) {
    if (arguments.length != 3) {
        throw new Error("setURLParamsInURLBar got "+arguments.length+" args, expected 3");
    }
    return setURLAndParamsInURLBarWithVerboseLevel(xformUrlPart, nameValuePairs, whetherToEncodeValues, /*verboseLevel=*/1);
  };

  // Convenience for setting params without changing main part of url
  var setURLParamsInURLBar = function(nameValuePairs, whetherToEncodeValues) {
    if (arguments.length != 2) {
        throw new Error("setURLParamsInURLBar got "+arguments.length+" args, expected 2");
    }
    return setURLAndParamsInURLBar(x=>x, nameValuePairs, whetherToEncodeValues);
  }

  let answer = {
    setURLParamsInURLBar: setURLParamsInURLBar,
    setURLAndParamsInURLBarWithVerboseLevel: setURLAndParamsInURLBarWithVerboseLevel,
    setURLAndParamsInURLBar: setURLAndParamsInURLBar,
  };
  console.log("    out setURRLParam.js");
  return answer;
});  // define callback

console.log("out setURLParam.js");
