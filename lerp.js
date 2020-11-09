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
  const round_to_nearest_representable = (numFractionBits, minExponent, x) => {
    CHECK.NE(x, undefined);
    const quantum = get_rounding_quantum(numFractionBits, minExponent, x);
    const Lo = Math.floor(x/quantum);
    const Hi = Math.ceil(x/quantum);
    if (Lo == Hi) return Lo*quantum;
    const lo = Lo*quantum;
    const hi = Hi*quantum;
    if (x-lo < hi-x) return lo;
    if (x-lo > hi-x) return hi;
    if (lo%2 == 0) return lo;
    return hi;
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
  let minExponent = -5;  // 4 if using 512*1024

  const Succ = x => succ(numFractionBits, minExponent, x);
  const Plus = (a,b) => plus(numFractionBits, minExponent, a, b);
  const Times = (a,b) => times(numFractionBits, minExponent, a, b);
  const Minus = (a,b) => minus(numFractionBits, minExponent, a, b);

  let Lerp;
  let title;
  if (false) {
    Lerp = (a,b,t) => round_to_nearest_representable(numFractionBits, minExponent, (1.-t)*a + t*b);
    title = "magic actual lerp";
  } else if (false) {
    Lerp = (a,b,t) => Plus(Times(Minus(1.,t),a), Times(t,b));
    title = "(1-t)*a + t*b";
  } else if (false) {
    Lerp = (a,b,t) => Plus(a, Times(Minus(b,a),t));
    title = "a + (b-a)*t";
  } else {
    Lerp = (a,b,t) => t<.5 ? Plus(a, Times(Minus(b,a),t))
                           : Minus(b, Times(Minus(b,a),Minus(1.,t)));
    title = "t<.5 ? a+(b-a)*t : b-(b-a)*(1-t)";
  }

  const createTheSVG = () => {


    // NOTE: the grid lines don't really look good when big, due to corners.  Hmm.
    const gridLineWidth = 1;

    // works well for gridLineWidth=2...
    //const width = 384+gridLineWidth;
    //const height = 768+gridLineWidth;

    const width = 512+gridLineWidth;
    const height = 1024+gridLineWidth;

    // input and output coords.
    const ox0 = gridLineWidth*.5;
    const ox1 = width-gridLineWidth*.5;
    const oy0 = height-gridLineWidth*.5;
    const oy1 = gridLineWidth*.5;
    const ix0 = 0.;
    const ix1 = 1.;
    const iy0 = -1.;
    const iy1 = 1.;


    const svgns = "http://www.w3.org/2000/svg";                                   
    const svg = document.createElementNS(svgns, "svg");                 
    svg.setAttribute("width", ""+width+"px");
    svg.setAttribute("height", ""+height+"px");
    svg.style.position = 'absolute';
    svg.style.top = '30px';
    svg.style.left = '0px';
    // XXX not sure I want this; it's from RocktreeProbePicture.js
    svg.style.pointerEvents = 'none';  // make it "click-through-able", and so tooltips of underlying are functional
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
        "shape-rendering" : "crispEdges",  // prevent antialiasing  XXX not sure if I want this
        "d" : segs2d(segs),
      });
      return path;
    };  // makePath


    const xs = getFloatsInRange(numFractionBits, minExponent, ix0, ix1);
    const ys = getFloatsInRange(numFractionBits, minExponent, iy0, iy1);
    PRINT(xs);
    PRINT(ys);
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


    let a = -1;
    let b = .5;

    {
      let o0 = relerp(0., ix0,ix1,ox0,ox1);
      let o1 = relerp(1., ix0,ix1,ox0,ox1);
      let oa = relerp(a, iy0,iy1,oy0,oy1);
      let ob = relerp(b, iy0,iy1,oy0,oy1);
      const path = makePath([[[o0,oa],[o1,ob]]]);
      svg.appendChild(path);
    }
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      const y = Lerp(a,b,t);

      const ox = relerp(t, ix0,ix1, ox0,ox1);
      const oy = relerp(y, iy0,iy1, oy0,oy1);

      const circle = document.createElementNS(svgns, "circle");
      circle.setAttributeNS(null, "cx", ""+ox);
      circle.setAttributeNS(null, "cy", ""+oy);
      circle.setAttributeNS(null, "r", "2");
      svg.appendChild(circle);
    }

    {
      let o0 = relerp(0., ix0,ix1,ox0,ox1);
      let o1 = relerp(1., ix0,ix1,ox0,ox1);
      let oa = relerp(a, iy0,iy1,oy0,oy1);
      let ob = relerp(b, iy0,iy1,oy0,oy1);
      const path = makePath([[[o0,ob],[o1,oa]]]);
      svg.appendChild(path);
    }
    for (let t = 0.; t <= 1.; t = Succ(t)) {
      const y = Lerp(b,a,t);

      const ox = relerp(t, ix0,ix1, ox0,ox1);
      const oy = relerp(y, iy0,iy1, oy0,oy1);

      const circle = document.createElementNS(svgns, "circle");
      circle.setAttributeNS(null, "cx", ""+ox);
      circle.setAttributeNS(null, "cy", ""+oy);
      circle.setAttributeNS(null, "r", "2");
      svg.appendChild(circle);
    }


    return svg;
  };  // createTheSVG
  const svg = createTheSVG();
  document.body.appendChild(svg);
  document.body.innerHTML += "<pre>"+title+"</pre>";

  console.log("    out lerp.js require callback");
});
console.log("out lerp.js")