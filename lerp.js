// TODO: the usual event screwup, need to listen on window instead
// TODO: the usual select-the-text screwup; how to disable?
// TODO: put the a and b labels next to the line
// TODO: label axes
// TODO: reconcile ability to change resolution with snapping.  I think I need to not snap?  Not sure.  Or, actually, maybe it's fine-- snapping still happens on mouse up, but if I change res and back without mousing, then no snapping happens and nothing changes.  cool.
// TODO: allow adjusting minExponent too
// TODO: show numFractionBits and minExponent
// TODO: change names so caller only says aIntent,bIntent, to reduce confusion
// TODO: hover-over a point should show details of calculation
// TODO: show in fractional form
// TODO: figure out if there's a better way!
// TODO: show more interesting lines for the various algorithms

"use strict";
console.log("in lerp.js")
registerSourceCodeLinesAndRequire([
  "./PRINT.js",
  "./CHECK.js",
  "./STRINGIFY.js",
], function(
  PRINT,
  CHECK,
  STRINGIFY,
  shouldBeUndefined
){
  console.log("    in lerp.js require callback");
  CHECK.EQ(shouldBeUndefined, undefined);

  //======================================
  // Begin float utilities
  const get_rounding_quantum = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const subnormalThreshold = 2**minExponent;
    if (Math.abs(x) < subnormalThreshold) {
      return subnormalThreshold / 2**numFractionBits;
    } else {
      const roundedDownToPowerOf2 = 2**Math.floor(Math.log2(Math.abs(x)));
      return roundedDownToPowerOf2 / 2**numFractionBits;
    }
  };
  const round_down_to_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.floor(x/quantum)*quantum;
  };
  const round_up_to_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    return Math.ceil(x/quantum)*quantum;
  };

  const round_to_nearest_representable_without_checking_against_opposite = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+")");
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    if (verboseLevel >= 1) console.log("              quantum = "+STRINGIFY(quantum));
    const Lo = Math.floor(x/quantum);
    const Hi = Math.ceil(x/quantum);
    if (verboseLevel >= 1) console.log("              Lo = "+STRINGIFY(Lo));
    if (verboseLevel >= 1) console.log("              Hi = "+STRINGIFY(Hi));
    let answer;
    if (Lo == Hi) {
      answer = Lo*quantum;
      if (verboseLevel >= 1) console.log("            out round_to_nearest_representable(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning Lo*quantum="+STRINGIFY(Lo*quantum)+" because Lo==Hi");
    } else {
      const lo = Lo*quantum;
      const hi = Hi*quantum;
      if (x-lo < hi-x) {
        answer = lo;
      } else if (x-lo > hi-x) {
        answer = hi;
      } else if (Lo%2 == 0) {
        answer = lo;
      } else {
        answer = hi;
      }
    }
    return answer;
  };

  const round_to_nearest_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const answer = round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, x);
    CHECK.EQ(round_to_nearest_representable_without_checking_against_opposite(numFractionBits, minExponent, -x), -answer);
    return answer;
  };

  const is_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    return round_down_to_representable(numFractionBits, minExponent, x) == x;
  };
  const pred_without_checking_against_succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    CHECK(is_representable(numFractionBits, minExponent, x));
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    // quantum is not exactly what we want.  but it's not more than a couple of orders of magnitude off.
    const answer = round_down_to_representable(numFractionBits, minExponent, x - quantum/4.);
    CHECK.LT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (answer+x)/2.));
    return answer;
  };
  const succ_without_checking_against_pred = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("            in succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+")");
    CHECK(is_representable(numFractionBits, minExponent, x));
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    // quantum is not exactly what we want.  but it's not more than a couple of orders of magnitude off.
    const answer = round_up_to_representable(numFractionBits, minExponent, x + quantum/4.);
    if (verboseLevel >= 1) console.log("            out succ_without_checking_against_pred(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", x="+STRINGIFY(x)+"), returning "+STRINGIFY(answer));
    CHECK.GT(answer, x);
    CHECK(is_representable(numFractionBits, minExponent, answer));
    CHECK(!is_representable(numFractionBits, minExponent, (x+answer)/2.));
    return answer;
  };
  const pred = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const answer = pred_without_checking_against_succ(numFractionBits, minExponent, x);
    CHECK.EQ(succ_without_checking_against_pred(numFractionBits, minExponent, answer), x);
    return answer;
  };
  const succ = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const answer = succ_without_checking_against_pred(numFractionBits, minExponent, x);
    CHECK.EQ(pred_without_checking_against_succ(numFractionBits, minExponent, answer), x);
    return answer;
  };
  const getFloatsInRange = (numFractionBits, minExponent, a, b) => {
    CHECK.NE(b, undefined);
    let verboseLevel = 0;
    if (verboseLevel >= 1) console.log("        in getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+STRINGIFY(a)+", b="+STRINGIFY(b)+")");
    const first = round_up_to_representable(numFractionBits, minExponent, a);
    const last = round_down_to_representable(numFractionBits, minExponent, b);
    const answer = [];
    for (let x = first; x <= last; x = succ(numFractionBits, minExponent, x)) {
      answer.push(x);
    }
    if (verboseLevel >= 1) console.log("        out getFloatsInRange(numFractionBits="+STRINGIFY(numFractionBits)+", minExponent="+STRINGIFY(minExponent)+", a="+STRINGIFY(a)+", b="+STRINGIFY(b)+"), returning "+STRINGIFY(answer));
    return answer;
  };
  const plus = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a+b);
  };
  const minus = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a-b);
  };
  const times = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    return round_to_nearest_representable(numFractionBits, minExponent, a*b);
  };
  const dividedby = (numFractionBits, minExponent, a, b) => {
    CHECK(is_representable(numFractionBits, minExponent, a));
    CHECK(is_representable(numFractionBits, minExponent, b));
    CHECK.NE(b, 0);  // we don't do nan or inf, so disallow division by 0
    return round_to_nearest_representable(numFractionBits, minExponent, a/b);
  };
  // End float utilities
  //======================================

  const relerp = (x, x0,x1, y0,y1) => {
    const answer = (x-x0)/(x1-x0)*(y1-y0)+y0;
    return answer;
  }

  //let numFractionBits = 2;
  //let minExponent = -5;

  let numFractionBits = 3;
  let minExponent = -6;  // 4 if using 512*1024

  const Round = x => round_to_nearest_representable(numFractionBits, minExponent, x);
  const Pred = x => pred(numFractionBits, minExponent, x);
  const Succ = x => succ(numFractionBits, minExponent, x);
  const Plus = (a,b) => plus(numFractionBits, minExponent, a, b);
  const Times = (a,b) => times(numFractionBits, minExponent, a, b);
  const Minus = (a,b) => minus(numFractionBits, minExponent, a, b);

  let Lerp;  // determined by the radio buttons

  let a = -1;
  let b = .5;


  // NOTE: the grid lines don't really look good when big, due to corners.  Hmm.
  const gridLineWidth = 1;

  // works well for gridLineWidth=2...
  //const width = 384+gridLineWidth;
  //const height = 768+gridLineWidth;

  const width = 512+gridLineWidth;
  const height = 1024+gridLineWidth;

  //const width = 256+gridLineWidth;
  //const height = 512+gridLineWidth;

  // input and output coords.
  const ox0 = gridLineWidth*.5;
  const ox1 = width-gridLineWidth*.5;
  const oy0 = height-gridLineWidth*.5;
  const oy1 = gridLineWidth*.5;

  const ix0 = 0.;
  const ix1 = 1.;
  // TODO: Extrapolation... maybe experiment some time
  //const ix0 = -1.;
  //const ix1 = 2.;
  const iy0 = -1.;
  const iy1 = 1.;


  const toFractionString = x => {
    let numerator = x;
    let denominator = 1.;
    while (Math.floor(numerator) != numerator) {
      numerator *= 2.;
      denominator *= 2.;
    }
    if (denominator == 1.)
      return ""+numerator;
    else
      return numerator+"/"+denominator;
  };


  const populateTheSVG = (svg, Lerp, aIntent, bIntent) => {
    CHECK.NE(bIntent, undefined);

    // TODO: rename
    const a = round_to_nearest_representable(numFractionBits, minExponent, aIntent);
    const b = round_to_nearest_representable(numFractionBits, minExponent, bIntent);

    const theTitlePart2 = document.getElementById("theTitlePart2");
    //theTitlePart2.innerHTML = "  a="+a+" b="+b;
    theTitlePart2.innerHTML = "  a="+a+"="+toFractionString(a)+"  b="+b+"="+toFractionString(b);

    const svgns = "http://www.w3.org/2000/svg";                                   

    svg.setAttribute("width", ""+width+"px");
    svg.setAttribute("height", ""+height+"px");
    svg.style.position = 'absolute';
    svg.style.top = '30px';
    svg.style.left = '0px';
    //svg.style.pointerEvents = 'none';  // to make it "click-through-able", and so tooltips of underlying are functional
    svg.style.border = "5px solid black";
    svg.innerHTML = '';  // clear old contents if any
    svg.innerHTML = (
        '<defs>'
      + '</defs>'
    );

    // Convert segments to "d" attribute of a path element of an svg.
    // E.g. [[[0,1],[2,3]],[[4,5],[6,7]],[[6,7],[8,9]]] -> "M0,1 L2,3 M4,5 L6,7 L8,9 Z"
    const segs2d = segs => {
      let answer = "";
      for (let i = 0; i < segs.length; ++i) {
        const seg = segs[i];
        if (i == 0 || seg[0] != segs[i-1][0] || seg[1] != segs[i-1][1]) {
          answer += "M"+seg[0][0]+","+seg[0][1]+" ";
        }
        answer += "L"+seg[1][0]+","+seg[1][1]+" ";
      }
      answer += "Z";
      return answer;
    };  // segs2d
    const setAttrs = (element, attrs) => {
      for (const attr in attrs) {
        element.setAttributeNS(null, attr, attrs[attr]);
      }
    };  // setAttrs
    const makePath = (segs) => {
      const path = document.createElementNS(svgns, "path");
      setAttrs(path, {
        "stroke" : "#cccccc",
        //"shape-rendering" : "crispEdges",  // prevent antialiasing  XXX not sure if I want this
        "d" : segs2d(segs),
      });
      return path;
    };  // makePath


    const xs = getFloatsInRange(numFractionBits, minExponent, ix0, ix1);
    const ys = getFloatsInRange(numFractionBits, minExponent, iy0, iy1);
    //PRINT(xs);
    //PRINT(ys);
    {
      const segs = [];
      for (const x of xs) {
        const ox = relerp(x, ix0,ix1, ox0,ox1);
        segs.push([[ox,oy0],[ox,oy1]]);
      }
      for (const y of ys) {
        const oy = relerp(y, iy0,iy1, oy0,oy1);
        segs.push([[ox0,oy],[ox1,oy]]);
      }
      //PRINT(segs);
      const path = makePath(segs);
      setAttrs(path, {"stroke-width" : ""+gridLineWidth});
      svg.appendChild(path);
    }



    // Horizontals at a and b, and lighter at aIntent and bIntent
    {
      let o0 = relerp(0., ix0,ix1,ox0,ox1);
      let o1 = relerp(1., ix0,ix1,ox0,ox1);
      let oa = relerp(a, iy0,iy1,oy0,oy1);
      let ob = relerp(b, iy0,iy1,oy0,oy1);
      let oaIntent = relerp(aIntent, iy0,iy1,oy0,oy1);
      let obIntent = relerp(bIntent, iy0,iy1,oy0,oy1);

      const pathIntent = makePath([[[o0,oaIntent],[o1,oaIntent]],
                                   [[o0,obIntent],[o1,obIntent]]]);
      setAttrs(pathIntent, {
        "stroke" : "#ff8080",
        "stroke-width" : "1",
      });

      svg.appendChild(pathIntent);
      const path = makePath([[[o0,oa],[o1,oa]],
                             [[o0,ob],[o1,ob]]]);
      setAttrs(path, {
        "stroke" : "red",
        "stroke-width" : "3",
      });
      svg.appendChild(path);

      let ozeroy = relerp(0., iy0,iy1,oy0,oy1);
      const pathZero = makePath([[[o0,ozeroy],[o1,ozeroy]]]);
      setAttrs(pathZero, {
        "stroke" : "#999999",
      });
      svg.appendChild(pathZero);
    }


    // Funny relevant diagonal, under the real diagonal.
    // This is starting at a,0,
    // and going up at slope round(b-a).
    // That is, from a,0 to a+round(b-a).
    {
      const B = a + Round(b-a);
      const o0x = relerp(0., ix0,ix1,ox0,ox1);
      const o1x = relerp(1., ix0,ix1,ox0,ox1);
      const oa = relerp(a, iy0,iy1,oy0,oy1);
      const oB = relerp(B, iy0,iy1,oy0,oy1);
      const funnyUpwardDiagonalPath = makePath([[[o0x,oa],[o1x,oB]]]);
      svg.appendChild(funnyUpwardDiagonalPath);
      const BB = Round(b-a);
      const oBB = relerp(BB, iy0,iy1,oy0,oy1);
      const o0y = relerp(0., iy0,iy1,oy0,oy1);
      const anotherFunnyUpwardDiagonalPath = makePath([[[o0x,o0y],[o1x,oBB]]]);
      svg.appendChild(anotherFunnyUpwardDiagonalPath);
    }

    // The diagonals
    {
      const o0 = relerp(0., ix0,ix1,ox0,ox1);
      const o1 = relerp(1., ix0,ix1,ox0,ox1);
      const oa = relerp(a, iy0,iy1,oy0,oy1);
      const ob = relerp(b, iy0,iy1,oy0,oy1);
      const upwardDiagonalPath = makePath([[[o0,oa],[o1,ob]]]);
      setAttrs(upwardDiagonalPath, {
        "stroke" : "black",
      });
      svg.appendChild(upwardDiagonalPath);
      const downwardDiagonalPath = makePath([[[o1,oa],[o0,ob]]]);
      setAttrs(downwardDiagonalPath, {
        "stroke" : "black",
      });
      svg.appendChild(downwardDiagonalPath);
    }


    // The dots along the diagonals.
    // Upward red, downard green.
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      const y = Lerp(a,b,t);

      const ox = relerp(t, ix0,ix1, ox0,ox1);
      const oy = relerp(y, iy0,iy1, oy0,oy1);

      const circle = document.createElementNS(svgns, "circle");
      circle.setAttributeNS(null, "cx", ""+ox);
      circle.setAttributeNS(null, "cy", ""+oy);
      circle.setAttributeNS(null, "r", "1.5");
      circle.setAttributeNS(null, "fill", "green");
      svg.appendChild(circle);
    }
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      const y = Lerp(b,a,t);

      const ox = relerp(t, ix0,ix1, ox0,ox1);
      const oy = relerp(y, iy0,iy1, oy0,oy1);

      const circle = document.createElementNS(svgns, "circle");
      circle.setAttributeNS(null, "cx", ""+ox);
      circle.setAttributeNS(null, "cy", ""+oy);
      circle.setAttributeNS(null, "r", "1.5");
      circle.setAttributeNS(null, "fill", "red");
      svg.appendChild(circle);
    }


    return svg;
  };  // populateTheSVG

  const svg = document.getElementById("theSVG");

  const theTitle = document.getElementById("theTitle");

  const setLerpMethodToMagic = () => {
    Lerp = (a,b,t) => round_to_nearest_representable(numFractionBits, minExponent, (1.-t)*a + t*b);
    populateTheSVG(svg, Lerp, a, b);
    let title = "magic actual lerp";
    theTitle.innerHTML = title;
  };
  const setLerpMethodToNaive = () => {
    //Lerp = (a,b,t) => Plus(Times(Minus(1.,t),a), Times(t,b));
    Lerp = (a,b,t) => {
      const verboseLevel = 0;
      if (verboseLevel >= 1) console.log("    in naive Lerp(a="+STRINGIFY(a)+" b="+STRINGIFY(b)+" t="+STRINGIFY(t)+")");
      if (verboseLevel >= 1) PRINT(Minus(1.,t));
      if (verboseLevel >= 1) PRINT(Times(Minus(1.,t),a));
      if (verboseLevel >= 1) PRINT(Times(t,b));
      if (verboseLevel >= 1) PRINT(Plus(Times(Minus(1.,t),a), Times(t,b)));
      if (verboseLevel >= 1) PRINT(Plus(.5,.3125));  // .875
      if (verboseLevel >= 1) PRINT(Plus(-.5,-.3125));  // -.75
      const answer = Plus(Times(Minus(1.,t),a), Times(t,b));
      if (verboseLevel >= 1) console.log("    out naive Lerp(a="+STRINGIFY(a)+" b="+STRINGIFY(b)+" t="+STRINGIFY(t)+"), returning "+STRINGIFY(answer));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    let title = "(1-t)*a + t*b";
    theTitle.innerHTML = title;
  };
  const setLerpMethodToTypeMeaningful = () => {
    Lerp = (a,b,t) => Plus(a, Times(Minus(b,a),t));
    populateTheSVG(svg, Lerp, a, b);
    let title = "a + (b-a)*t";
    theTitle.innerHTML = title;
  };
  const setLerpMethodToBidirectional = () => {
    Lerp = (a,b,t) => t<.5 ? Plus(a, Times(Minus(b,a),t))
                           : Minus(b, Times(Minus(b,a),Minus(1.,t)));
    populateTheSVG(svg, Lerp, a, b);
    let title = "t<.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
    theTitle.innerHTML = title;
  };
  const setLerpMethodToBidirectionalAlt = () => {
    Lerp = (a,b,t) => t<=.5 ? Plus(a, Times(Minus(b,a),t))
                            : Minus(b, Times(Minus(b,a),Minus(1.,t)));
    populateTheSVG(svg, Lerp, a, b);
    let title = "t<=.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
    theTitle.innerHTML = title;
  };
  const setLerpMethodToMaybe = () => {
    Lerp = (a,b,t) => {
      const answer0 = Plus(Times(Minus(1.,t),a), Times(t,b));
      const answer = Plus(answer0,
                          Plus(Times(Minus(1.,t),Minus(a,answer0)),
                               Times(t,Minus(b,answer0))));
      return answer;
    };
    populateTheSVG(svg, Lerp, a, b);
    let title = "t<=.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
    theTitle.innerHTML = title;
  };

  document.getElementById("lerpmethodMagic").setAttribute("checked", "");
  setLerpMethodToMagic();


  const lerpmethodChanged = (a) => {};

  document.getElementById("lerpmethodMagic").onclick = () => setLerpMethodToMagic();
  document.getElementById("lerpmethodNaive").onclick = () => setLerpMethodToNaive();
  document.getElementById("lerpmethodTypeMeaningful").onclick = () => setLerpMethodToTypeMeaningful();
  document.getElementById("lerpmethodBidirectional").onclick = () => setLerpMethodToBidirectional();
  document.getElementById("lerpmethodBidirectionalAlt").onclick = () => setLerpMethodToBidirectionalAlt();
  document.getElementById("lerpmethodMaybe").onclick = () => setLerpMethodToMaybe();

  let xOfMouseDown = undefined;
  let yOfMouseDown = undefined;
  let aOfMouseDown = undefined;
  let bOfMouseDown = undefined;
  let xOfPreviousMouseEvent = undefined;
  let yOfPreviousMouseEvent = undefined;

  let draggingA = false;
  let draggingB = false;
  const eventVerboseLevel = 0;
  // https://www.mutuallyhuman.com/blog/keydown-is-the-only-keyboard-event-we-need/

  const bIsCloser = eventOffsetY => {
    const iy = relerp(eventOffsetY, oy0,oy1, iy0,iy1);
    return Math.abs(iy-b) < Math.abs(iy-a);
  };

  window.addEventListener("keydown", (event) => {
    if (eventVerboseLevel >= 1) console.log("keydown");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    if (false) {
    } else if (event.key === "=" || event.key === "+") {
      numFractionBits += 1;
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "-") {
      numFractionBits -= 1;
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "ArrowUp") {
      event.preventDefault();  // prevent scrolling
      if (bIsCloser(yOfPreviousMouseEvent)) {
        b = Succ(b);
      } else {
        a = Succ(a);
      }
      populateTheSVG(svg, Lerp, a, b);
    } else if (event.key == "ArrowDown") {
      event.preventDefault();  // prevent scrolling
      if (bIsCloser(yOfPreviousMouseEvent)) {
        b = Pred(b);
      } else {
        a = Pred(a);
      }
      populateTheSVG(svg, Lerp, a, b);
    }
    // event.stopPropagation(); // TODO: do I want this?
  });
  svg.addEventListener("mousedown", (event) => {
    if (eventVerboseLevel >= 1) console.log("mousedown");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfMouseDown = event.offsetX;
    yOfMouseDown = event.offsetY;
    aOfMouseDown = a;
    bOfMouseDown = b;
    const ix = relerp(event.offsetX, ox0,ox1, ix0,ix1);
    const iy = relerp(event.offsetY, oy0,oy1, iy0,iy1);
    const aDist = Math.abs(iy - a);
    const bDist = Math.abs(iy - b);
    const midDist = Math.abs(iy - (a+b)/2.);
    if (midDist < aDist && midDist < bDist) {
      draggingA = true;
      draggingB = true;
    } else if (aDist <= bDist) {
      draggingA = true;
    } else {
      draggingB = true;
    }
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseup", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseup");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    draggingA = draggingB = false;
    // Snap intents to nearest on mouse up (a and b are intents here)
    a = round_to_nearest_representable(numFractionBits, minExponent, a);
    b = round_to_nearest_representable(numFractionBits, minExponent, b);
    populateTheSVG(svg, Lerp, a, b);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseenter", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseenter");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mouseleave", (event) => {
    if (eventVerboseLevel >= 1) console.log("mouseleave");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
  });
  svg.addEventListener("mousemove", (event) => {
    // CBB: clunky order of tests.  We set {x,y}OfPreviousMouseEvent first
    // in case of early return, but then we aren't prepared in case
    // we want to see the actual previous in this function.
    xOfPreviousMouseEvent = event.offsetX;
    yOfPreviousMouseEvent = event.offsetY;
    if (!draggingA && !draggingB) return;
    if (eventVerboseLevel >= 1) console.log("mousemove with mouse down");
    if (eventVerboseLevel >= 1) console.log("  event = ",event);
    const ixOfMouseDown = relerp(xOfMouseDown, ox0,ox1, ix0,ix1);
    const iyOfMouseDown = relerp(yOfMouseDown, oy0,oy1, iy0,iy1);
    const ix = relerp(event.offsetX, ox0,ox1, ix0,ix1);
    const iy = relerp(event.offsetY, oy0,oy1, iy0,iy1);
    if (draggingA) a = aOfMouseDown + (iy-iyOfMouseDown);
    if (draggingB) b = bOfMouseDown + (iy-iyOfMouseDown);
    populateTheSVG(svg, Lerp, a, b);
  });

  console.log("    out lerp.js require callback");
});
console.log("out lerp.js")
