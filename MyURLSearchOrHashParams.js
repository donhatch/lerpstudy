'use strict';
console.log("in MyURLSearchOrHashParams.js");
registerSourceCodeLinesAndDefine(['./CHECK.js'], function(CHECK) {
  console.log("    in MyURLSearchOrHashParams.js define callback");

  // Like URLSearchParams, with helpers:
  //    getOrDefault()
  //    getIntOrDefaultOrThrow()
  //    getFloatOrDefaultOrThrow()
  // and the constructor ignores a leading '#' if any.
  // NOTE: only a subset of URLSearchParams's API is currently implemented.
  class MyURLSearchOrHashParams {
    // NOTE: would say "#url_search_params",
    // but firefox says "Uncaught SyntaxError: private fields are not currently supported"
    _url_search_params;
    constructor(window_location_search_or_hash) {
      CHECK.EQ(typeof window_location_search_or_hash, 'string');
      let old_search_or_hash = window_location_search_or_hash;
      if (old_search_or_hash.startsWith('#')) {
        old_search_or_hash = old_search_or_hash.slice(1);
      }
      this._url_search_params = new URLSearchParams(old_search_or_hash);
    }
    get(name) {
      return this._url_search_params.get(name);
    }
    set(name, value) {
      return this._url_search_params.set(name, value);
    }
    delete(name) {
      return this._url_search_params.delete(name);
    }
    // Note that the returned string does *not* include an initial '?' or '#'.
    toString() {
      let new_search_or_hash = this._url_search_params.toString();

      // These seem to be harmless,
      // and keeping them cleartext enhances readability.
      // (Thought: maybe the reason it so aggressively encodes
      // is to protect, e.g., when someone pastes a link into email
      // and then follows it by a ')' or something)
      // (OH, yes, hmm, if we don't encode ')' then we can't put it as-is
      // inside the []() syntax of markdown.)
      new_search_or_hash = new_search_or_hash.replaceAll('%2F', '/');
      new_search_or_hash = new_search_or_hash.replaceAll('%5B', '[');
      new_search_or_hash = new_search_or_hash.replaceAll('%5D', ']');
      new_search_or_hash = new_search_or_hash.replaceAll('%28', '(');
      new_search_or_hash = new_search_or_hash.replaceAll('%29', ')');
      new_search_or_hash = new_search_or_hash.replaceAll('%3F', '?');
      new_search_or_hash = new_search_or_hash.replaceAll('%3A', ':');
      new_search_or_hash = new_search_or_hash.replaceAll('%3D', '=');
      new_search_or_hash = new_search_or_hash.replaceAll('%2C', ',');

      return new_search_or_hash;
    }

    getOrDefault(name, defaultValue) {
      CHECK.EQ(arguments.length, 2);
      CHECK.EQ(typeof(name), 'string');
      CHECK.EQ(typeof(defaultValue), 'string');  // not sure about this-- maybe allow null?
      const value = this.get(name);
      return value !== null ? value : defaultValue;
    }  // getOrDefault

    getIntOrDefaultOrThrow(name, defaultValue) {
      CHECK.EQ(arguments.length, 2);
      CHECK.EQ(typeof(name), 'string');
      CHECK(Number.isInteger(defaultValue)); // not sure about this-- maybe allow null?
      const valueString = this.get(name);
      if (valueString === null) return defaultValue;
      // Do not use parseInt for this, since that ignores trailing spaces.
      // However, beware that the Number constructor unhelpfully converts
      // zero-or-more spaces to 0.
      let value = /^\s*$/.test(valueString) ? NaN : Number(valueString);
      if (!Number.isInteger(value)) {
        throw Error('bad url param '+name+'='+STRINGIFY(valueString)+'');
      }
      return value;
    }  // getIntOrDefaultOrThrow

    getFloatOrDefaultOrThrow(name, defaultValue) {
      CHECK.EQ(arguments.length, 2);
      CHECK.EQ(typeof(name), 'string');
      CHECK.EQ(typeof(defaultValue), 'number');  // not sure about this-- maybe allow null?
      const valueString = this.get(name);
      if (valueString === null) return defaultValue;
      // Do not use parseFloat for this, since that ignores trailing spaces.
      // However, beware that the Number constructor unhelpfully converts
      // zero-or-more spaces to 0.
      let value = /^\s*$/.test(valueString) ? NaN : Number(valueString);
      if (isNaN(value)) {
        throw Error('bad url param '+name+'='+STRINGIFY(valueString)+'');
      }
      return value;
    }  // getFloatOrDefaultOrThrow

  };  // MyURLSearchOrHashParams

  console.log("    out MyURLSearchOrHashParams.js define callback");
  return MyURLSearchOrHashParams;
});
console.log("out MyURLSearchOrHashParams.js");
