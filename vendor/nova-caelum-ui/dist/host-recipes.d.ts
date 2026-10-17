// src/assert.ts
function isObject(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
var isObjectOrArray = (obj) => typeof obj === "object" && obj !== null;

// src/compact.ts
function compact(value) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([_, value2]) => value2 !== void 0));
}

// src/condition.ts
var isBaseCondition = (v) => v === "base";
function filterBaseConditions(c) {
  return c.slice().filter((v) => !isBaseCondition(v));
}

// src/hash.ts
function toChar(code) {
  return String.fromCharCode(code + (code > 25 ? 39 : 97));
}
function toName(code) {
  let name = "";
  let x;
  for (x = Math.abs(code); x > 52; x = x / 52 | 0) name = toChar(x % 52) + name;
  return toChar(x % 52) + name;
}
function toPhash(h, x) {
  let i = x.length;
  while (i) h = h * 33 ^ x.charCodeAt(--i);
  return h;
}
function toHash(value) {
  return toName(toPhash(5381, value) >>> 0);
}

// src/important.ts
var importantRegex = /\s*!(important)?/i;
function isImportant(value) {
  return typeof value === "string" ? importantRegex.test(value) : false;
}
function withoutImportant(value) {
  return typeof value === "string" ? value.replace(importantRegex, "").trim() : value;
}
function withoutSpace(str) {
  return typeof str === "string" ? str.replaceAll(" ", "_") : str;
}

// src/memo.ts
var memo = (fn) => {
  const cache = /* @__PURE__ */ new Map();
  const get = (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
  return get;
};

// src/merge-props.ts
var MERGE_OMIT = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function mergeProps(...sources) {
  return sources.reduce((prev, obj) => {
    if (!obj) return prev;
    Object.keys(obj).forEach((key) => {
      if (MERGE_OMIT.has(key)) return;
      const prevValue = prev[key];
      const value = obj[key];
      if (isObject(prevValue) && isObject(value)) {
        prev[key] = mergeProps(prevValue, value);
      } else {
        prev[key] = value;
      }
    });
    return prev;
  }, {});
}

// src/walk-object.ts
var isNotNullish = (element) => element != null;
function walkObject(target, predicate, options = {}) {
  const { stop, getKey } = options;
  function inner(value, path = []) {
    if (isObjectOrArray(value)) {
      const result = {};
      for (const [prop, child] of Object.entries(value)) {
        const key = getKey?.(prop, child) ?? prop;
        const childPath = [...path, key];
        if (stop?.(value, childPath)) {
          return predicate(value, path);
        }
        const next = inner(child, childPath);
        if (isNotNullish(next)) {
          result[key] = next;
        }
      }
      return result;
    }
    return predicate(value, path);
  }
  return inner(target);
}

// src/normalize-style-object.ts
function toResponsiveObject(values, breakpoints) {
  return values.reduce(
    (acc, current, index) => {
      const key = breakpoints[index];
      if (current != null) {
        acc[key] = current;
      }
      return acc;
    },
    {}
  );
}
function normalizeStyleObject(styles, context, shorthand = true) {
  const { utility, conditions } = context;
  const { hasShorthand, resolveShorthand } = utility;
  return walkObject(
    styles,
    (value) => {
      return Array.isArray(value) ? toResponsiveObject(value, conditions.breakpoints.keys) : value;
    },
    {
      stop: (value) => Array.isArray(value),
      getKey: shorthand ? (prop) => hasShorthand ? resolveShorthand(prop) : prop : void 0
    }
  );
}

// src/classname.ts
var fallbackCondition = {
  shift: (v) => v,
  finalize: (v) => v,
  breakpoints: { keys: [] }
};
var sanitize = (value) => typeof value === "string" ? value.replaceAll(/[\n\s]+/g, " ") : value;
function createCss(context) {
  const { utility, hash, conditions: conds = fallbackCondition } = context;
  const formatClassName = (str) => [utility.prefix, str].filter(Boolean).join("-");
  const hashFn = (conditions, className) => {
    let result;
    if (hash) {
      const baseArray = [...conds.finalize(conditions), className];
      result = formatClassName(utility.toHash(baseArray, toHash));
    } else {
      const baseArray = [...conds.finalize(conditions), formatClassName(className)];
      result = baseArray.join(":");
    }
    return result;
  };
  return memo(({ base, ...styles } = {}) => {
    const styleObject = Object.assign(styles, base);
    const normalizedObject = normalizeStyleObject(styleObject, context);
    const classNames = /* @__PURE__ */ new Set();
    walkObject(normalizedObject, (value, paths) => {
      if (value == null) return;
      const important = isImportant(value);
      const [prop, ...allConditions] = conds.shift(paths);
      const conditions = filterBaseConditions(allConditions);
      const transformed = utility.transform(prop, withoutImportant(sanitize(value)));
      let className = hashFn(conditions, transformed.className);
      if (important) className = `${className}!`;
      classNames.add(className);
    });
    return Array.from(classNames).join(" ");
  });
}
function compactStyles(...styles) {
  return styles.flat().filter((style) => isObject(style) && Object.keys(compact(style)).length > 0);
}
function createMergeCss(context) {
  function resolve(styles) {
    const allStyles = compactStyles(...styles);
    if (allStyles.length === 1) return allStyles;
    return allStyles.map((style) => normalizeStyleObject(style, context));
  }
  function mergeCss(...styles) {
    return mergeProps(...resolve(styles));
  }
  function assignCss(...styles) {
    return Object.assign({}, ...resolve(styles));
  }
  return { mergeCss: memo(mergeCss), assignCss };
}

// src/hypenate-property.ts
var wordRegex = /([A-Z])/g;
var msRegex = /^ms-/;
var hypenateProperty = memo((property) => {
  if (property.startsWith("--")) return property;
  return property.replace(wordRegex, "-$1").replace(msRegex, "-ms-").toLowerCase();
});

// src/is-css-unit.ts
var lengthUnits = "cm,mm,Q,in,pc,pt,px,em,ex,ch,rem,lh,rlh,vw,vh,vmin,vmax,vb,vi,svw,svh,lvw,lvh,dvw,dvh,cqw,cqh,cqi,cqb,cqmin,cqmax,%";
`(?:${lengthUnits.split(",").join("|")})`;
var getSlotCompoundVariant = (compoundVariants, slotName) => compoundVariants.filter((compoundVariant) => compoundVariant.css[slotName]).map((compoundVariant) => ({ ...compoundVariant, css: compoundVariant.css[slotName] }));

// src/split-props.ts
function splitProps(props, ...keys) {
  const descriptors = Object.getOwnPropertyDescriptors(props);
  const dKeys = Object.keys(descriptors);
  const split = (k) => {
    const clone = {};
    for (let i = 0; i < k.length; i++) {
      const key = k[i];
      if (descriptors[key]) {
        Object.defineProperty(clone, key, descriptors[key]);
        delete descriptors[key];
      }
    }
    return clone;
  };
  const fn = (key) => split(Array.isArray(key) ? key : dKeys.filter(key));
  return keys.map(fn).concat(split(dKeys));
}

// src/uniq.ts
var uniq = (...items) => {
  const set = items.reduce((acc, currItems) => {
    if (currItems) {
      currItems.forEach((item) => acc.add(item));
    }
    return acc;
  }, /* @__PURE__ */ new Set([]));
  return Array.from(set);
};

const conditionsStr = "_hover,_focus,_focusWithin,_focusVisible,_disabled,_active,_visited,_target,_readOnly,_readWrite,_empty,_checked,_enabled,_expanded,_highlighted,_complete,_incomplete,_dragging,_before,_after,_firstLetter,_firstLine,_marker,_selection,_file,_backdrop,_first,_last,_only,_even,_odd,_firstOfType,_lastOfType,_onlyOfType,_peerFocus,_peerHover,_peerActive,_peerFocusWithin,_peerFocusVisible,_peerDisabled,_peerChecked,_peerInvalid,_peerExpanded,_peerPlaceholderShown,_groupFocus,_groupHover,_groupActive,_groupFocusWithin,_groupFocusVisible,_groupDisabled,_groupChecked,_groupExpanded,_groupInvalid,_indeterminate,_required,_valid,_invalid,_autofill,_inRange,_outOfRange,_placeholder,_placeholderShown,_pressed,_selected,_grabbed,_underValue,_overValue,_atValue,_default,_optional,_open,_closed,_fullscreen,_loading,_hidden,_current,_currentPage,_currentStep,_today,_unavailable,_rangeStart,_rangeEnd,_now,_topmost,_motionReduce,_motionSafe,_print,_landscape,_portrait,_dark,_light,_osDark,_osLight,_highContrast,_lessContrast,_moreContrast,_ltr,_rtl,_scrollbar,_scrollbarThumb,_scrollbarTrack,_horizontal,_vertical,_icon,_starting,_noscript,_invertedColors,base";
const conditions = new Set(conditionsStr.split(','));

const conditionRegex = /^@|&|&$/;

function isCondition(value){
  return conditions.has(value) || conditionRegex.test(value)
}

const underscoreRegex = /^_/;
const conditionsSelectorRegex = /&|@/;

function finalizeConditions(paths){
  return paths.map((path) => {
    if (conditions.has(path)){
      return path.replace(underscoreRegex, '')
    }

    if (conditionsSelectorRegex.test(path)){
      return `[${withoutSpace(path.trim())}]`
    }

    return path
  })}

  function sortConditions(paths){
    return paths.sort((a, b) => {
      const aa = isCondition(a);
      const bb = isCondition(b);
      if (aa && !bb) return 1
      if (!aa && bb) return -1
      return 0
    })
  }

const utilities = "aspectRatio:asp,boxDecorationBreak:bx-db,zIndex:z,boxSizing:bx-s,objectPosition:obj-p,objectFit:obj-f,overscrollBehavior:ovs-b,overscrollBehaviorX:ovs-bx,overscrollBehaviorY:ovs-by,position:pos/1,top:top,left:left,inset:inset,insetInline:inset-x/insetX,insetBlock:inset-y/insetY,insetBlockEnd:inset-be,insetBlockStart:inset-bs,insetInlineEnd:inset-e/insetEnd/end,insetInlineStart:inset-s/insetStart/start,right:right,bottom:bottom,float:float,visibility:vis,display:d,hideFrom:hide,hideBelow:show,flexBasis:flex-b,flex:flex,flexDirection:flex-d/flexDir,flexGrow:flex-g,flexShrink:flex-sh,gridTemplateColumns:grid-tc,gridTemplateRows:grid-tr,gridColumn:grid-c,gridRow:grid-r,gridColumnStart:grid-cs,gridColumnEnd:grid-ce,gridAutoFlow:grid-af,gridAutoColumns:grid-ac,gridAutoRows:grid-ar,gap:gap,gridGap:grid-g,gridRowGap:grid-rg,gridColumnGap:grid-cg,rowGap:rg,columnGap:cg,justifyContent:jc,alignContent:ac,alignItems:ai,alignSelf:as,padding:p/1,paddingLeft:pl/1,paddingRight:pr/1,paddingTop:pt/1,paddingBottom:pb/1,paddingBlock:py/1/paddingY,paddingBlockEnd:pbe,paddingBlockStart:pbs,paddingInline:px/paddingX/1,paddingInlineEnd:pe/1/paddingEnd,paddingInlineStart:ps/1/paddingStart,marginLeft:ml/1,marginRight:mr/1,marginTop:mt/1,marginBottom:mb/1,margin:m/1,marginBlock:my/1/marginY,marginBlockEnd:mbe,marginBlockStart:mbs,marginInline:mx/1/marginX,marginInlineEnd:me/1/marginEnd,marginInlineStart:ms/1/marginStart,spaceX:sx,spaceY:sy,outlineWidth:ring-w/ringWidth,outlineColor:ring-c/ringColor,outline:ring/1,outlineOffset:ring-o/ringOffset,focusRing:focus-ring,focusVisibleRing:focus-v-ring,focusRingColor:focus-ring-c,focusRingOffset:focus-ring-o,focusRingWidth:focus-ring-w,focusRingStyle:focus-ring-s,divideX:dvd-x,divideY:dvd-y,divideColor:dvd-c,divideStyle:dvd-s,width:w/1,inlineSize:w-is,minWidth:min-w/minW,minInlineSize:min-w-is,maxWidth:max-w/maxW,maxInlineSize:max-w-is,height:h/1,blockSize:h-bs,minHeight:min-h/minH,minBlockSize:min-h-bs,maxHeight:max-h/maxH,maxBlockSize:max-b,boxSize:size,color:c,fontFamily:ff,fontSize:fs,fontSizeAdjust:fs-a,fontPalette:fp,fontKerning:fk,fontFeatureSettings:ff-s,fontWeight:fw,fontSmoothing:fsmt,fontVariant:fv,fontVariantAlternates:fv-alt,fontVariantCaps:fv-caps,fontVariationSettings:fv-s,fontVariantNumeric:fv-num,letterSpacing:ls,lineHeight:lh,textAlign:ta,textDecoration:td,textDecorationColor:td-c,textEmphasisColor:te-c,textDecorationStyle:td-s,textDecorationThickness:td-t,textUnderlineOffset:tu-o,textTransform:tt,textIndent:ti,textShadow:tsh,textShadowColor:tsh-c/textShadowColor,WebkitTextFillColor:wktf-c,textOverflow:tov,verticalAlign:va,wordBreak:wb,textWrap:tw,truncate:trunc,lineClamp:lc,listStyleType:li-t,listStylePosition:li-pos,listStyleImage:li-img,listStyle:li-s,backgroundPosition:bg-p/bgPosition,backgroundPositionX:bg-p-x/bgPositionX,backgroundPositionY:bg-p-y/bgPositionY,backgroundAttachment:bg-a/bgAttachment,backgroundClip:bg-cp/bgClip,background:bg/1,backgroundColor:bg-c/bgColor,backgroundOrigin:bg-o/bgOrigin,backgroundImage:bg-i/bgImage,backgroundRepeat:bg-r/bgRepeat,backgroundBlendMode:bg-bm/bgBlendMode,backgroundSize:bg-s/bgSize,backgroundGradient:bg-grad/bgGradient,backgroundLinear:bg-linear/bgLinear,backgroundRadial:bg-radial/bgRadial,backgroundConic:bg-conic/bgConic,textGradient:txt-grad,gradientFromPosition:grad-from-pos,gradientToPosition:grad-to-pos,gradientFrom:grad-from,gradientTo:grad-to,gradientVia:grad-via,gradientViaPosition:grad-via-pos,borderRadius:bdr/rounded,borderTopLeftRadius:bdr-tl/roundedTopLeft,borderTopRightRadius:bdr-tr/roundedTopRight,borderBottomRightRadius:bdr-br/roundedBottomRight,borderBottomLeftRadius:bdr-bl/roundedBottomLeft,borderTopRadius:bdr-t/roundedTop,borderRightRadius:bdr-r/roundedRight,borderBottomRadius:bdr-b/roundedBottom,borderLeftRadius:bdr-l/roundedLeft,borderStartStartRadius:bdr-ss/roundedStartStart,borderStartEndRadius:bdr-se/roundedStartEnd,borderStartRadius:bdr-s/roundedStart,borderEndStartRadius:bdr-es/roundedEndStart,borderEndEndRadius:bdr-ee/roundedEndEnd,borderEndRadius:bdr-e/roundedEnd,border:bd,borderWidth:bd-w,borderTopWidth:bd-t-w,borderLeftWidth:bd-l-w,borderRightWidth:bd-r-w,borderBottomWidth:bd-b-w,borderBlockStartWidth:bd-bs-w,borderBlockEndWidth:bd-be-w,borderColor:bd-c,borderInline:bd-x/borderX,borderInlineWidth:bd-x-w/borderXWidth,borderInlineColor:bd-x-c/borderXColor,borderBlock:bd-y/borderY,borderBlockWidth:bd-y-w/borderYWidth,borderBlockColor:bd-y-c/borderYColor,borderLeft:bd-l,borderLeftColor:bd-l-c,borderInlineStart:bd-s/borderStart,borderInlineStartWidth:bd-s-w/borderStartWidth,borderInlineStartColor:bd-s-c/borderStartColor,borderRight:bd-r,borderRightColor:bd-r-c,borderInlineEnd:bd-e/borderEnd,borderInlineEndWidth:bd-e-w/borderEndWidth,borderInlineEndColor:bd-e-c/borderEndColor,borderTop:bd-t,borderTopColor:bd-t-c,borderBottom:bd-b,borderBottomColor:bd-b-c,borderBlockEnd:bd-be,borderBlockEndColor:bd-be-c,borderBlockStart:bd-bs,borderBlockStartColor:bd-bs-c,opacity:op,boxShadow:bx-sh/shadow,boxShadowColor:bx-sh-c/shadowColor,mixBlendMode:mix-bm,filter:filter,brightness:brightness,contrast:contrast,grayscale:grayscale,hueRotate:hue-rotate,invert:invert,saturate:saturate,sepia:sepia,dropShadow:drop-shadow,blur:blur,backdropFilter:bkdp,backdropBlur:bkdp-blur,backdropBrightness:bkdp-brightness,backdropContrast:bkdp-contrast,backdropGrayscale:bkdp-grayscale,backdropHueRotate:bkdp-hue-rotate,backdropInvert:bkdp-invert,backdropOpacity:bkdp-opacity,backdropSaturate:bkdp-saturate,backdropSepia:bkdp-sepia,borderCollapse:bd-cl,borderSpacing:bd-sp,borderSpacingX:bd-sx,borderSpacingY:bd-sy,tableLayout:tbl,transitionTimingFunction:trs-tmf,transitionDelay:trs-dly,transitionDuration:trs-dur,transitionProperty:trs-prop,transition:trs,animation:anim,animationName:anim-n,animationTimingFunction:anim-tmf,animationDuration:anim-dur,animationDelay:anim-dly,animationPlayState:anim-ps,animationComposition:anim-comp,animationFillMode:anim-fm,animationDirection:anim-dir,animationIterationCount:anim-ic,animationRange:anim-r,animationState:anim-s,animationRangeStart:anim-rs,animationRangeEnd:anim-re,animationTimeline:anim-tl,transformOrigin:trf-o,transformBox:trf-b,transformStyle:trf-s,transform:trf,rotate:rotate,rotateX:rotate-x,rotateY:rotate-y,rotateZ:rotate-z,scale:scale,scaleX:scale-x,scaleY:scale-y,translate:translate,translateX:translate-x/x,translateY:translate-y/y,translateZ:translate-z/z,accentColor:ac-c,caretColor:ca-c,scrollBehavior:scr-bhv,scrollbar:scr-bar,scrollbarColor:scr-bar-c,scrollbarGutter:scr-bar-g,scrollbarWidth:scr-bar-w,scrollMargin:scr-m,scrollMarginLeft:scr-ml,scrollMarginRight:scr-mr,scrollMarginTop:scr-mt,scrollMarginBottom:scr-mb,scrollMarginBlock:scr-my/scrollMarginY,scrollMarginBlockEnd:scr-mbe,scrollMarginBlockStart:scr-mbt,scrollMarginInline:scr-mx/scrollMarginX,scrollMarginInlineEnd:scr-me,scrollMarginInlineStart:scr-ms,scrollPadding:scr-p,scrollPaddingBlock:scr-py/scrollPaddingY,scrollPaddingBlockStart:scr-pbs,scrollPaddingBlockEnd:scr-pbe,scrollPaddingInline:scr-px/scrollPaddingX,scrollPaddingInlineEnd:scr-pe,scrollPaddingInlineStart:scr-ps,scrollPaddingLeft:scr-pl,scrollPaddingRight:scr-pr,scrollPaddingTop:scr-pt,scrollPaddingBottom:scr-pb,scrollSnapAlign:scr-sa,scrollSnapStop:scrs-s,scrollSnapType:scrs-t,scrollSnapStrictness:scrs-strt,scrollSnapMargin:scrs-m,scrollSnapMarginTop:scrs-mt,scrollSnapMarginBottom:scrs-mb,scrollSnapMarginLeft:scrs-ml,scrollSnapMarginRight:scrs-mr,scrollSnapCoordinate:scrs-c,scrollSnapDestination:scrs-d,scrollSnapPointsX:scrs-px,scrollSnapPointsY:scrs-py,scrollSnapTypeX:scrs-tx,scrollSnapTypeY:scrs-ty,scrollTimeline:scrtl,scrollTimelineAxis:scrtl-a,scrollTimelineName:scrtl-n,touchAction:tch-a,userSelect:us,overflow:ov,overflowWrap:ov-wrap,overflowX:ov-x,overflowY:ov-y,overflowAnchor:ov-a,overflowBlock:ov-b,overflowInline:ov-i,overflowClipBox:ovcp-bx,overflowClipMargin:ovcp-m,overscrollBehaviorBlock:ovs-bb,overscrollBehaviorInline:ovs-bi,fill:fill,stroke:stk,strokeWidth:stk-w,strokeDasharray:stk-dsh,strokeDashoffset:stk-do,strokeLinecap:stk-lc,strokeLinejoin:stk-lj,strokeMiterlimit:stk-ml,strokeOpacity:stk-op,srOnly:sr,debug:debug,appearance:ap,backfaceVisibility:bfv,clipPath:cp-path,hyphens:hy,mask:msk,maskImage:msk-i,maskSize:msk-s,textSizeAdjust:txt-adj,container:cq,containerName:cq-n,containerType:cq-t,cursor:cursor";

const classNameByProp = new Map();
const shorthands = new Map();
utilities.split(',').forEach((utility) => {
  const [prop, meta] = utility.split(':');
  const [className, ...shorthandList] = meta.split('/');
  classNameByProp.set(prop, className);
  if (shorthandList.length) {
    shorthandList.forEach((shorthand) => {
      shorthands.set(shorthand === '1' ? className : shorthand, prop);
    });
  }
});

const resolveShorthand = (prop) => shorthands.get(prop) || prop;

const context = {
  
  conditions: {
    shift: sortConditions,
    finalize: finalizeConditions,
    breakpoints: { keys: ["base"] }
  },
  utility: {
    prefix: "caelos",
    transform: (prop, value) => {
              const key = resolveShorthand(prop);
              const propKey = classNameByProp.get(key) || hypenateProperty(key);
              return { className: `${propKey}_${withoutSpace(value)}` }
            },
    hasShorthand: true,
    toHash: (path, hashFn) => hashFn(path.join(":")),
    resolveShorthand: resolveShorthand,
  }
};

const cssFn = createCss(context);
const css = (...styles) => cssFn(mergeCss(...styles));
css.raw = (...styles) => mergeCss(...styles);

const { mergeCss} = createMergeCss(context);

function getCompoundVariantCss(compoundVariants, variantMap) {
  let result = {};
  compoundVariants.forEach((compoundVariant) => {
    const isMatching = Object.entries(compoundVariant).every(([key, value]) => {
      if (key === 'css') return true

      const values = Array.isArray(value) ? value : [value];
      return values.some((value) => variantMap[key] === value)
    });

    if (isMatching) {
      result = mergeCss(result, compoundVariant.css);
    }
  });

  return result
}

function assertCompoundVariant(name, compoundVariants, variants, prop) {
  if (compoundVariants.length > 0 && typeof variants?.[prop] === 'object') {
    throw new Error(`[recipe:${name}:${prop}] Conditions are not supported when using compound variants.`)
  }
}

function cx() {
  let str = '',
    i = 0,
    arg;

  for (; i < arguments.length; ) {
    if ((arg = arguments[i++]) && typeof arg === 'string') {
      str && (str += ' ');
      str += arg;
    }
  }
  return str
}

const createRecipe = (name, defaultVariants, compoundVariants) => {
 const getVariantProps = (variants) => {
   return {
     [name]: '__ignore__',
     ...defaultVariants,
     ...compact(variants),
   };
 };

  const recipeFn = (variants, withCompoundVariants = true) => {
   const transform = (prop, value) => {
     assertCompoundVariant(name, compoundVariants, variants, prop);

      if (value === '__ignore__') {
        return { className: name }
      }

      value = withoutSpace(value);
      return { className: `${name}--${prop}_${value}` }
   };

   const recipeCss = createCss({
     
     conditions: {
       shift: sortConditions,
       finalize: finalizeConditions,
       breakpoints: { keys: ["base"] }
     },
     utility: {
       prefix: "caelos",
       toHash: (path, hashFn) => hashFn(path.join(":")),
       transform,
     }
   });

   const recipeStyles = getVariantProps(variants);

   if (withCompoundVariants) {
     const compoundVariantStyles = getCompoundVariantCss(compoundVariants, recipeStyles);
     return cx(recipeCss(recipeStyles), css(compoundVariantStyles))
   }

   return recipeCss(recipeStyles)
  };

   return {
     recipeFn,
     getVariantProps,
     __getCompoundVariantCss__: (variants) => {
       return getCompoundVariantCss(compoundVariants, getVariantProps(variants));
     },
   }
};

const mergeRecipes = (recipeA, recipeB) => {
 if (recipeA && !recipeB) return recipeA
 if (!recipeA && recipeB) return recipeB

 const recipeFn = (...args) => cx(recipeA(...args), recipeB(...args));
 const variantKeys = uniq(recipeA.variantKeys, recipeB.variantKeys);
 const variantMap = variantKeys.reduce((acc, key) => {
   acc[key] = uniq(recipeA.variantMap[key], recipeB.variantMap[key]);
   return acc
 }, {});

 return Object.assign(recipeFn, {
   __recipe__: true,
   __name__: `${recipeA.__name__} ${recipeB.__name__}`,
   raw: (props) => props,
   variantKeys,
   variantMap,
   splitVariantProps(props) {
     return splitProps(props, variantKeys)
   },
 })
 };

const agentRosterFn = /* @__PURE__ */ createRecipe('agent-roster', {}, []);

const agentRosterVariantMap = {};

const agentRosterVariantKeys = Object.keys(agentRosterVariantMap);

const agentRoster = /* @__PURE__ */ Object.assign(memo(agentRosterFn.recipeFn), {
  __recipe__: true,
  __name__: 'agentRoster',
  __getCompoundVariantCss__: agentRosterFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: agentRosterVariantKeys,
  variantMap: agentRosterVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, agentRosterVariantKeys)
  },
  getVariantProps: agentRosterFn.getVariantProps,
});

const titleFn = /* @__PURE__ */ createRecipe('title', {
  "variant": "task"
}, []);

const titleVariantMap = {
  "variant": [
    "project",
    "module",
    "task",
    "conversation",
    "navigation"
  ]
};

const titleVariantKeys = Object.keys(titleVariantMap);

const title = /* @__PURE__ */ Object.assign(memo(titleFn.recipeFn), {
  __recipe__: true,
  __name__: 'title',
  __getCompoundVariantCss__: titleFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: titleVariantKeys,
  variantMap: titleVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, titleVariantKeys)
  },
  getVariantProps: titleFn.getVariantProps,
});

const spacingFn = /* @__PURE__ */ createRecipe('spacing', {
  "kind": "stack",
  "density": "default"
}, [
  {
    "kind": "fields",
    "density": "default",
    "css": {
      "gap": "calc((var(--sys-space-6) + var(--sys-space-7)) / 2)"
    }
  },
  {
    "kind": "sections",
    "density": "default",
    "css": {
      "gap": "calc((var(--sys-space-7) + var(--sys-space-8)) / 2)"
    }
  },
  {
    "kind": "section",
    "density": "default",
    "css": {
      "gap": "var(--sys-space-5)"
    }
  },
  {
    "kind": "inset",
    "density": "default",
    "css": {
      "padding": "calc((var(--sys-space-6) + var(--sys-space-7)) / 2)"
    }
  },
  {
    "kind": "fields",
    "density": "compact",
    "css": {
      "gap": "var(--sys-space-6)"
    }
  },
  {
    "kind": "sections",
    "density": "compact",
    "css": {
      "gap": "var(--sys-space-7)"
    }
  },
  {
    "kind": "section",
    "density": "compact",
    "css": {
      "gap": "var(--sys-space-4)"
    }
  },
  {
    "kind": "inset",
    "density": "compact",
    "css": {
      "padding": "var(--sys-space-6)"
    }
  }
]);

const spacingVariantMap = {
  "kind": [
    "stack",
    "fields",
    "sections",
    "section",
    "intro",
    "cluster",
    "actions",
    "grid",
    "inset"
  ],
  "density": [
    "comfortable",
    "default",
    "compact"
  ]
};

const spacingVariantKeys = Object.keys(spacingVariantMap);

const spacing = /* @__PURE__ */ Object.assign(memo(spacingFn.recipeFn), {
  __recipe__: true,
  __name__: 'spacing',
  __getCompoundVariantCss__: spacingFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: spacingVariantKeys,
  variantMap: spacingVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, spacingVariantKeys)
  },
  getVariantProps: spacingFn.getVariantProps,
});

const surfaceFn = /* @__PURE__ */ createRecipe('surface', {
  "layer": "ground",
  "texture": "auto"
}, [
  {
    "layer": [
      "chrome",
      "ground"
    ],
    "texture": "auto",
    "css": {
      "backgroundImage": "linear-gradient(var(--nc-graph-line) 1px,transparent 1px),linear-gradient(90deg,var(--nc-graph-line) 1px,transparent 1px)",
      "backgroundSize": "var(--nc-graph-size) var(--nc-graph-size)",
      "backdropFilter": "none"
    }
  },
  {
    "layer": [
      "elevated",
      "elevated-2",
      "top"
    ],
    "texture": "auto",
    "css": {
      "backgroundColor": "color-mix(in srgb,var(--nc-surface-color) var(--nc-surface-opacity),transparent)",
      "backgroundImage": "none",
      "backdropFilter": "blur(var(--nc-surface-blur)) saturate(140%)"
    }
  }
]);

const surfaceVariantMap = {
  "layer": [
    "chrome",
    "ground",
    "elevated",
    "elevated-2",
    "top"
  ],
  "texture": [
    "auto",
    "plain",
    "graph",
    "glass"
  ]
};

const surfaceVariantKeys = Object.keys(surfaceVariantMap);

const surface = /* @__PURE__ */ Object.assign(memo(surfaceFn.recipeFn), {
  __recipe__: true,
  __name__: 'surface',
  __getCompoundVariantCss__: surfaceFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: surfaceVariantKeys,
  variantMap: surfaceVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, surfaceVariantKeys)
  },
  getVariantProps: surfaceFn.getVariantProps,
});

const buttonFn = /* @__PURE__ */ createRecipe('button', {
  "variant": "tonal",
  "size": "md"
}, []);

const buttonVariantMap = {
  "variant": [
    "primary",
    "tonal",
    "text"
  ],
  "size": [
    "sm",
    "md"
  ],
  "danger": [
    "true"
  ]
};

const buttonVariantKeys = Object.keys(buttonVariantMap);

const button = /* @__PURE__ */ Object.assign(memo(buttonFn.recipeFn), {
  __recipe__: true,
  __name__: 'button',
  __getCompoundVariantCss__: buttonFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: buttonVariantKeys,
  variantMap: buttonVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, buttonVariantKeys)
  },
  getVariantProps: buttonFn.getVariantProps,
});

const cardFn = /* @__PURE__ */ createRecipe('card', {
  "variant": "flat"
}, []);

const cardVariantMap = {
  "variant": [
    "flat",
    "lifted",
    "glass"
  ],
  "interactive": [
    "true"
  ]
};

const cardVariantKeys = Object.keys(cardVariantMap);

const card = /* @__PURE__ */ Object.assign(memo(cardFn.recipeFn), {
  __recipe__: true,
  __name__: 'card',
  __getCompoundVariantCss__: cardFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: cardVariantKeys,
  variantMap: cardVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, cardVariantKeys)
  },
  getVariantProps: cardFn.getVariantProps,
});

const chipFn = /* @__PURE__ */ createRecipe('chip', {
  "variant": "filter",
  "tone": "neutral"
}, []);

const chipVariantMap = {
  "variant": [
    "filter",
    "status",
    "count",
    "category"
  ],
  "tone": [
    "neutral",
    "ready",
    "progress",
    "done",
    "sage",
    "danger",
    "atmospheric",
    "structural"
  ]
};

const chipVariantKeys = Object.keys(chipVariantMap);

const chip = /* @__PURE__ */ Object.assign(memo(chipFn.recipeFn), {
  __recipe__: true,
  __name__: 'chip',
  __getCompoundVariantCss__: chipFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: chipVariantKeys,
  variantMap: chipVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, chipVariantKeys)
  },
  getVariantProps: chipFn.getVariantProps,
});

const rowFn = /* @__PURE__ */ createRecipe('row', {
  "variant": "sidebar",
  "size": "md"
}, []);

const rowVariantMap = {
  "variant": [
    "sidebar",
    "list",
    "tab",
    "tabUnderline",
    "crumb"
  ],
  "size": [
    "sm",
    "md"
  ]
};

const rowVariantKeys = Object.keys(rowVariantMap);

const row = /* @__PURE__ */ Object.assign(memo(rowFn.recipeFn), {
  __recipe__: true,
  __name__: 'row',
  __getCompoundVariantCss__: rowFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: rowVariantKeys,
  variantMap: rowVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, rowVariantKeys)
  },
  getVariantProps: rowFn.getVariantProps,
});

const tooltipFn = /* @__PURE__ */ createRecipe('tooltip', {
  "variant": "default"
}, []);

const tooltipVariantMap = {
  "variant": [
    "default",
    "path"
  ]
};

const tooltipVariantKeys = Object.keys(tooltipVariantMap);

const tooltip = /* @__PURE__ */ Object.assign(memo(tooltipFn.recipeFn), {
  __recipe__: true,
  __name__: 'tooltip',
  __getCompoundVariantCss__: tooltipFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: tooltipVariantKeys,
  variantMap: tooltipVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, tooltipVariantKeys)
  },
  getVariantProps: tooltipFn.getVariantProps,
});

const authLayoutDefaultVariants = {};
const authLayoutCompoundVariants = [];

const authLayoutSlotNames = [
  [
    "root",
    "auth-layout__root"
  ],
  [
    "pane",
    "auth-layout__pane"
  ],
  [
    "back",
    "auth-layout__back"
  ],
  [
    "icon",
    "auth-layout__icon"
  ],
  [
    "content",
    "auth-layout__content"
  ],
  [
    "field",
    "auth-layout__field"
  ],
  [
    "badge",
    "auth-layout__badge"
  ],
  [
    "previewPane",
    "auth-layout__previewPane"
  ],
  [
    "previewBrand",
    "auth-layout__previewBrand"
  ],
  [
    "previewBody",
    "auth-layout__previewBody"
  ],
  [
    "title",
    "auth-layout__title"
  ],
  [
    "subtitle",
    "auth-layout__subtitle"
  ],
  [
    "footer",
    "auth-layout__footer"
  ],
  [
    "link",
    "auth-layout__link"
  ],
  [
    "form",
    "auth-layout__form"
  ],
  [
    "label",
    "auth-layout__label"
  ],
  [
    "input",
    "auth-layout__input"
  ],
  [
    "suggestion",
    "auth-layout__suggestion"
  ],
  [
    "preview",
    "auth-layout__preview"
  ],
  [
    "previewHeader",
    "auth-layout__previewHeader"
  ],
  [
    "previewIcon",
    "auth-layout__previewIcon"
  ],
  [
    "caption",
    "auth-layout__caption"
  ],
  [
    "previewWelcome",
    "auth-layout__previewWelcome"
  ],
  [
    "center",
    "auth-layout__center"
  ],
  [
    "previewTitle",
    "auth-layout__previewTitle"
  ],
  [
    "previewSubtitle",
    "auth-layout__previewSubtitle"
  ],
  [
    "suggestions",
    "auth-layout__suggestions"
  ],
  [
    "previewFooter",
    "auth-layout__previewFooter"
  ],
  [
    "previewComposer",
    "auth-layout__previewComposer"
  ]
];
const authLayoutSlotFns = /* @__PURE__ */ authLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, authLayoutDefaultVariants, getSlotCompoundVariant(authLayoutCompoundVariants, slotName))]);

const authLayoutFn = memo((props = {}) => {
  return Object.fromEntries(authLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const authLayoutVariantKeys = [];
const getVariantProps$l = (variants) => ({ ...authLayoutDefaultVariants, ...compact(variants) });

const authLayout = /* @__PURE__ */ Object.assign(authLayoutFn, {
  __recipe__: false,
  __name__: 'authLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: authLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, authLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$l
});

const auxiliaryLayoutDefaultVariants = {};
const auxiliaryLayoutCompoundVariants = [];

const auxiliaryLayoutSlotNames = [
  [
    "suggestionRoot",
    "auxiliary-layout__suggestionRoot"
  ],
  [
    "scrim",
    "auxiliary-layout__scrim"
  ],
  [
    "suggestionPanel",
    "auxiliary-layout__suggestionPanel"
  ],
  [
    "between",
    "auxiliary-layout__between"
  ],
  [
    "row",
    "auxiliary-layout__row"
  ],
  [
    "suggestionIcon",
    "auxiliary-layout__suggestionIcon"
  ],
  [
    "medium",
    "auxiliary-layout__medium"
  ],
  [
    "close",
    "auxiliary-layout__close"
  ],
  [
    "description",
    "auxiliary-layout__description"
  ],
  [
    "actions",
    "auxiliary-layout__actions"
  ],
  [
    "action",
    "auxiliary-layout__action"
  ],
  [
    "visibilityItem",
    "auxiliary-layout__visibilityItem"
  ],
  [
    "visibilityLabel",
    "auxiliary-layout__visibilityLabel"
  ],
  [
    "caption",
    "auxiliary-layout__caption"
  ],
  [
    "visibilityCheck",
    "auxiliary-layout__visibilityCheck"
  ],
  [
    "visibilityTrigger",
    "auxiliary-layout__visibilityTrigger"
  ],
  [
    "visibilityButton",
    "auxiliary-layout__visibilityButton"
  ],
  [
    "visibilityMenu",
    "auxiliary-layout__visibilityMenu"
  ],
  [
    "weatherError",
    "auxiliary-layout__weatherError"
  ],
  [
    "errorDetail",
    "auxiliary-layout__errorDetail"
  ],
  [
    "weather",
    "auxiliary-layout__weather"
  ],
  [
    "weatherDay",
    "auxiliary-layout__weatherDay"
  ],
  [
    "weatherNight",
    "auxiliary-layout__weatherNight"
  ],
  [
    "weatherTexture",
    "auxiliary-layout__weatherTexture"
  ],
  [
    "weatherContent",
    "auxiliary-layout__weatherContent"
  ],
  [
    "weatherHeading",
    "auxiliary-layout__weatherHeading"
  ],
  [
    "weatherLabel",
    "auxiliary-layout__weatherLabel"
  ],
  [
    "weatherMuted",
    "auxiliary-layout__weatherMuted"
  ],
  [
    "weatherSummary",
    "auxiliary-layout__weatherSummary"
  ],
  [
    "weatherIcon",
    "auxiliary-layout__weatherIcon"
  ],
  [
    "weatherMoon",
    "auxiliary-layout__weatherMoon"
  ],
  [
    "weatherSun",
    "auxiliary-layout__weatherSun"
  ],
  [
    "temperature",
    "auxiliary-layout__temperature"
  ],
  [
    "temperatureUnit",
    "auxiliary-layout__temperatureUnit"
  ],
  [
    "right",
    "auxiliary-layout__right"
  ],
  [
    "weatherValue",
    "auxiliary-layout__weatherValue"
  ],
  [
    "forecast",
    "auxiliary-layout__forecast"
  ],
  [
    "forecastHeading",
    "auxiliary-layout__forecastHeading"
  ],
  [
    "forecastHours",
    "auxiliary-layout__forecastHours"
  ],
  [
    "forecastHour",
    "auxiliary-layout__forecastHour"
  ],
  [
    "forecastNow",
    "auxiliary-layout__forecastNow"
  ],
  [
    "forecastTime",
    "auxiliary-layout__forecastTime"
  ],
  [
    "weatherIconMuted",
    "auxiliary-layout__weatherIconMuted"
  ],
  [
    "weatherFooter",
    "auxiliary-layout__weatherFooter"
  ],
  [
    "diffSage",
    "auxiliary-layout__diffSage"
  ],
  [
    "diffDanger",
    "auxiliary-layout__diffDanger"
  ],
  [
    "mobileOnly",
    "auxiliary-layout__mobileOnly"
  ],
  [
    "toast",
    "auxiliary-layout__toast"
  ]
];
const auxiliaryLayoutSlotFns = /* @__PURE__ */ auxiliaryLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, auxiliaryLayoutDefaultVariants, getSlotCompoundVariant(auxiliaryLayoutCompoundVariants, slotName))]);

const auxiliaryLayoutFn = memo((props = {}) => {
  return Object.fromEntries(auxiliaryLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const auxiliaryLayoutVariantKeys = [];
const getVariantProps$k = (variants) => ({ ...auxiliaryLayoutDefaultVariants, ...compact(variants) });

const auxiliaryLayout = /* @__PURE__ */ Object.assign(auxiliaryLayoutFn, {
  __recipe__: false,
  __name__: 'auxiliaryLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: auxiliaryLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, auxiliaryLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$k
});

const supportLayoutDefaultVariants = {};
const supportLayoutCompoundVariants = [];

const supportLayoutSlotNames = [
  [
    "consoleResize",
    "support-layout__consoleResize"
  ],
  [
    "console",
    "support-layout__console"
  ],
  [
    "resizing",
    "support-layout__resizing"
  ],
  [
    "consoleHeader",
    "support-layout__consoleHeader"
  ],
  [
    "consoleTitle",
    "support-layout__consoleTitle"
  ],
  [
    "consoleClear",
    "support-layout__consoleClear"
  ],
  [
    "background",
    "support-layout__background"
  ],
  [
    "consoleEntry",
    "support-layout__consoleEntry"
  ],
  [
    "consoleIndex",
    "support-layout__consoleIndex"
  ],
  [
    "success",
    "support-layout__success"
  ],
  [
    "danger",
    "support-layout__danger"
  ],
  [
    "muted",
    "support-layout__muted"
  ],
  [
    "row",
    "support-layout__row"
  ],
  [
    "icon",
    "support-layout__icon"
  ],
  [
    "consoleContents",
    "support-layout__consoleContents"
  ],
  [
    "outputImage",
    "support-layout__outputImage"
  ],
  [
    "outputText",
    "support-layout__outputText"
  ],
  [
    "documentResult",
    "support-layout__documentResult"
  ],
  [
    "textLeft",
    "support-layout__textLeft"
  ],
  [
    "documentCall",
    "support-layout__documentCall"
  ],
  [
    "documentLabel",
    "support-layout__documentLabel"
  ],
  [
    "documentIcon",
    "support-layout__documentIcon"
  ],
  [
    "documentSpinner",
    "support-layout__documentSpinner"
  ],
  [
    "imageEditor",
    "support-layout__imageEditor"
  ],
  [
    "imageInline",
    "support-layout__imageInline"
  ],
  [
    "imageFull",
    "support-layout__imageFull"
  ],
  [
    "imageLoading",
    "support-layout__imageLoading"
  ],
  [
    "spin",
    "support-layout__spin"
  ],
  [
    "image",
    "support-layout__image"
  ],
  [
    "imagePadding",
    "support-layout__imagePadding"
  ],
  [
    "imageSkeleton",
    "support-layout__imageSkeleton"
  ],
  [
    "documentSkeleton",
    "support-layout__documentSkeleton"
  ],
  [
    "inlineSkeleton",
    "support-layout__inlineSkeleton"
  ],
  [
    "skeleton0",
    "support-layout__skeleton0"
  ],
  [
    "skeleton1",
    "support-layout__skeleton1"
  ],
  [
    "skeleton2",
    "support-layout__skeleton2"
  ],
  [
    "skeleton3",
    "support-layout__skeleton3"
  ],
  [
    "skeleton4",
    "support-layout__skeleton4"
  ],
  [
    "skeleton5",
    "support-layout__skeleton5"
  ],
  [
    "skeleton6",
    "support-layout__skeleton6"
  ],
  [
    "skeleton7",
    "support-layout__skeleton7"
  ],
  [
    "skeleton8",
    "support-layout__skeleton8"
  ],
  [
    "skeleton9",
    "support-layout__skeleton9"
  ],
  [
    "skeleton10",
    "support-layout__skeleton10"
  ],
  [
    "skeleton11",
    "support-layout__skeleton11"
  ],
  [
    "skeleton12",
    "support-layout__skeleton12"
  ],
  [
    "command",
    "support-layout__command"
  ],
  [
    "selected",
    "support-layout__selected"
  ],
  [
    "interactive",
    "support-layout__interactive"
  ],
  [
    "commandIcon",
    "support-layout__commandIcon"
  ],
  [
    "commandName",
    "support-layout__commandName"
  ],
  [
    "caption",
    "support-layout__caption"
  ],
  [
    "shortcut",
    "support-layout__shortcut"
  ],
  [
    "commandMenu",
    "support-layout__commandMenu"
  ],
  [
    "commandHeading",
    "support-layout__commandHeading"
  ],
  [
    "commandList",
    "support-layout__commandList"
  ],
  [
    "versionFooter",
    "support-layout__versionFooter"
  ],
  [
    "versionGroup",
    "support-layout__versionGroup"
  ],
  [
    "versionControls",
    "support-layout__versionControls"
  ],
  [
    "versionControl",
    "support-layout__versionControl"
  ],
  [
    "versionToggle",
    "support-layout__versionToggle"
  ],
  [
    "versionCount",
    "support-layout__versionCount"
  ],
  [
    "versionActions",
    "support-layout__versionActions"
  ],
  [
    "restore",
    "support-layout__restore"
  ],
  [
    "latest",
    "support-layout__latest"
  ],
  [
    "sheetGrid",
    "support-layout__sheetGrid"
  ],
  [
    "sheetCell",
    "support-layout__sheetCell"
  ],
  [
    "sheetHeader",
    "support-layout__sheetHeader"
  ],
  [
    "separator",
    "support-layout__separator"
  ]
];
const supportLayoutSlotFns = /* @__PURE__ */ supportLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, supportLayoutDefaultVariants, getSlotCompoundVariant(supportLayoutCompoundVariants, slotName))]);

const supportLayoutFn = memo((props = {}) => {
  return Object.fromEntries(supportLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const supportLayoutVariantKeys = [];
const getVariantProps$j = (variants) => ({ ...supportLayoutDefaultVariants, ...compact(variants) });

const supportLayout = /* @__PURE__ */ Object.assign(supportLayoutFn, {
  __recipe__: false,
  __name__: 'supportLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: supportLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, supportLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$j
});

const controlLayoutDefaultVariants = {};
const controlLayoutCompoundVariants = [];

const controlLayoutSlotNames = [
  [
    "button",
    "control-layout__button"
  ],
  [
    "input",
    "control-layout__input"
  ],
  [
    "label",
    "control-layout__label"
  ],
  [
    "popover",
    "control-layout__popover"
  ],
  [
    "skeleton",
    "control-layout__skeleton"
  ],
  [
    "spinner",
    "control-layout__spinner"
  ],
  [
    "tooltip",
    "control-layout__tooltip"
  ],
  [
    "group",
    "control-layout__group"
  ],
  [
    "groupText",
    "control-layout__groupText"
  ],
  [
    "groupSeparator",
    "control-layout__groupSeparator"
  ],
  [
    "message",
    "control-layout__message"
  ],
  [
    "userMessage",
    "control-layout__userMessage"
  ],
  [
    "messageContent",
    "control-layout__messageContent"
  ],
  [
    "messageActions",
    "control-layout__messageActions"
  ],
  [
    "srOnly",
    "control-layout__srOnly"
  ],
  [
    "branches",
    "control-layout__branches"
  ],
  [
    "branch",
    "control-layout__branch"
  ],
  [
    "branchSelector",
    "control-layout__branchSelector"
  ],
  [
    "branchPage",
    "control-layout__branchPage"
  ],
  [
    "response",
    "control-layout__response"
  ],
  [
    "messageToolbar",
    "control-layout__messageToolbar"
  ],
  [
    "attachmentStack",
    "control-layout__attachmentStack"
  ],
  [
    "loading",
    "control-layout__loading"
  ],
  [
    "session",
    "control-layout__session"
  ],
  [
    "surface",
    "control-layout__surface"
  ],
  [
    "artifactProse",
    "control-layout__artifactProse"
  ],
  [
    "artifactGutter",
    "control-layout__artifactGutter"
  ],
  [
    "artifactAction",
    "control-layout__artifactAction"
  ],
  [
    "artifactTools",
    "control-layout__artifactTools"
  ],
  [
    "artifactClose",
    "control-layout__artifactClose"
  ]
];
const controlLayoutSlotFns = /* @__PURE__ */ controlLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, controlLayoutDefaultVariants, getSlotCompoundVariant(controlLayoutCompoundVariants, slotName))]);

const controlLayoutFn = memo((props = {}) => {
  return Object.fromEntries(controlLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const controlLayoutVariantKeys = [];
const getVariantProps$i = (variants) => ({ ...controlLayoutDefaultVariants, ...compact(variants) });

const controlLayout = /* @__PURE__ */ Object.assign(controlLayoutFn, {
  __recipe__: false,
  __name__: 'controlLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: controlLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, controlLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$i
});

const transcriptLayoutDefaultVariants = {};
const transcriptLayoutCompoundVariants = [];

const transcriptLayoutSlotNames = [
  [
    "part",
    "transcript-layout__part"
  ],
  [
    "attachment",
    "transcript-layout__attachment"
  ],
  [
    "suggestions",
    "transcript-layout__suggestions"
  ],
  [
    "suggestion",
    "transcript-layout__suggestion"
  ],
  [
    "suggestionButton",
    "transcript-layout__suggestionButton"
  ],
  [
    "legacyHeader",
    "transcript-layout__legacyHeader"
  ],
  [
    "cornerControls",
    "transcript-layout__cornerControls"
  ],
  [
    "muted",
    "transcript-layout__muted"
  ],
  [
    "icon",
    "transcript-layout__icon"
  ],
  [
    "codeEditor",
    "transcript-layout__codeEditor"
  ],
  [
    "textEditor",
    "transcript-layout__textEditor"
  ],
  [
    "toolActions",
    "transcript-layout__toolActions"
  ],
  [
    "root",
    "transcript-layout__root"
  ],
  [
    "scroller",
    "transcript-layout__scroller"
  ],
  [
    "header",
    "transcript-layout__header"
  ],
  [
    "column",
    "transcript-layout__column"
  ],
  [
    "occlusion",
    "transcript-layout__occlusion"
  ],
  [
    "welcome",
    "transcript-layout__welcome"
  ],
  [
    "pending",
    "transcript-layout__pending"
  ],
  [
    "end",
    "transcript-layout__end"
  ],
  [
    "scrollButton",
    "transcript-layout__scrollButton"
  ],
  [
    "scrollIcon",
    "transcript-layout__scrollIcon"
  ],
  [
    "composer",
    "transcript-layout__composer"
  ],
  [
    "editing",
    "transcript-layout__editing"
  ],
  [
    "agentLabel",
    "transcript-layout__agentLabel"
  ],
  [
    "artifactFrame",
    "transcript-layout__artifactFrame"
  ],
  [
    "artifactBody",
    "transcript-layout__artifactBody"
  ],
  [
    "artifactActions",
    "transcript-layout__artifactActions"
  ],
  [
    "artifactMessages",
    "transcript-layout__artifactMessages"
  ],
  [
    "artifactDock",
    "transcript-layout__artifactDock"
  ],
  [
    "artifactLoading",
    "transcript-layout__artifactLoading"
  ],
  [
    "artifactOverlay",
    "transcript-layout__artifactOverlay"
  ],
  [
    "artifactWorkspace",
    "transcript-layout__artifactWorkspace"
  ],
  [
    "actions",
    "transcript-layout__actions"
  ],
  [
    "action",
    "transcript-layout__action"
  ],
  [
    "userStack",
    "transcript-layout__userStack"
  ]
];
const transcriptLayoutSlotFns = /* @__PURE__ */ transcriptLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, transcriptLayoutDefaultVariants, getSlotCompoundVariant(transcriptLayoutCompoundVariants, slotName))]);

const transcriptLayoutFn = memo((props = {}) => {
  return Object.fromEntries(transcriptLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const transcriptLayoutVariantKeys = [];
const getVariantProps$h = (variants) => ({ ...transcriptLayoutDefaultVariants, ...compact(variants) });

const transcriptLayout = /* @__PURE__ */ Object.assign(transcriptLayoutFn, {
  __recipe__: false,
  __name__: 'transcriptLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: transcriptLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, transcriptLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$h
});

const interactionLayoutDefaultVariants = {};
const interactionLayoutCompoundVariants = [];

const interactionLayoutSlotNames = [
  [
    "commandRoot",
    "interaction-layout__commandRoot"
  ],
  [
    "commandDialog",
    "interaction-layout__commandDialog"
  ],
  [
    "commandInputWrapper",
    "interaction-layout__commandInputWrapper"
  ],
  [
    "commandInputGroup",
    "interaction-layout__commandInputGroup"
  ],
  [
    "commandInput",
    "interaction-layout__commandInput"
  ],
  [
    "commandIcon",
    "interaction-layout__commandIcon"
  ],
  [
    "commandList",
    "interaction-layout__commandList"
  ],
  [
    "commandEmpty",
    "interaction-layout__commandEmpty"
  ],
  [
    "commandGroup",
    "interaction-layout__commandGroup"
  ],
  [
    "commandSeparator",
    "interaction-layout__commandSeparator"
  ],
  [
    "commandItem",
    "interaction-layout__commandItem"
  ],
  [
    "dialog",
    "interaction-layout__dialog"
  ],
  [
    "close",
    "interaction-layout__close"
  ],
  [
    "srOnly",
    "interaction-layout__srOnly"
  ],
  [
    "header",
    "interaction-layout__header"
  ],
  [
    "footer",
    "interaction-layout__footer"
  ],
  [
    "description",
    "interaction-layout__description"
  ],
  [
    "menuContent",
    "interaction-layout__menuContent"
  ],
  [
    "item",
    "interaction-layout__item"
  ],
  [
    "choice",
    "interaction-layout__choice"
  ],
  [
    "indicator",
    "interaction-layout__indicator"
  ],
  [
    "inset",
    "interaction-layout__inset"
  ],
  [
    "shortcut",
    "interaction-layout__shortcut"
  ],
  [
    "chevron",
    "interaction-layout__chevron"
  ],
  [
    "selectGroup",
    "interaction-layout__selectGroup"
  ],
  [
    "selectTrigger",
    "interaction-layout__selectTrigger"
  ],
  [
    "selectIcon",
    "interaction-layout__selectIcon"
  ],
  [
    "selectContent",
    "interaction-layout__selectContent"
  ],
  [
    "selectViewport",
    "interaction-layout__selectViewport"
  ],
  [
    "scrollButton",
    "interaction-layout__scrollButton"
  ],
  [
    "scrollRoot",
    "interaction-layout__scrollRoot"
  ],
  [
    "scrollViewport",
    "interaction-layout__scrollViewport"
  ],
  [
    "scrollBar",
    "interaction-layout__scrollBar"
  ],
  [
    "scrollThumb",
    "interaction-layout__scrollThumb"
  ],
  [
    "sheet",
    "interaction-layout__sheet"
  ],
  [
    "sheetHeader",
    "interaction-layout__sheetHeader"
  ],
  [
    "sheetFooter",
    "interaction-layout__sheetFooter"
  ],
  [
    "sheetTitle",
    "interaction-layout__sheetTitle"
  ]
];
const interactionLayoutSlotFns = /* @__PURE__ */ interactionLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, interactionLayoutDefaultVariants, getSlotCompoundVariant(interactionLayoutCompoundVariants, slotName))]);

const interactionLayoutFn = memo((props = {}) => {
  return Object.fromEntries(interactionLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const interactionLayoutVariantKeys = [];
const getVariantProps$g = (variants) => ({ ...interactionLayoutDefaultVariants, ...compact(variants) });

const interactionLayout = /* @__PURE__ */ Object.assign(interactionLayoutFn, {
  __recipe__: false,
  __name__: 'interactionLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: interactionLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, interactionLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$g
});

const overviewLayoutDefaultVariants = {};
const overviewLayoutCompoundVariants = [];

const overviewLayoutSlotNames = [
  [
    "chat",
    "overview-layout__chat"
  ],
  [
    "board",
    "overview-layout__board"
  ],
  [
    "activity",
    "overview-layout__activity"
  ]
];
const overviewLayoutSlotFns = /* @__PURE__ */ overviewLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, overviewLayoutDefaultVariants, getSlotCompoundVariant(overviewLayoutCompoundVariants, slotName))]);

const overviewLayoutFn = memo((props = {}) => {
  return Object.fromEntries(overviewLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const overviewLayoutVariantKeys = [];
const getVariantProps$f = (variants) => ({ ...overviewLayoutDefaultVariants, ...compact(variants) });

const overviewLayout = /* @__PURE__ */ Object.assign(overviewLayoutFn, {
  __recipe__: false,
  __name__: 'overviewLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: overviewLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, overviewLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$f
});

const workspaceLayoutDefaultVariants = {};
const workspaceLayoutCompoundVariants = [];

const workspaceLayoutSlotNames = [
  [
    "root",
    "workspace-layout__root"
  ],
  [
    "wrapper",
    "workspace-layout__wrapper"
  ],
  [
    "pane",
    "workspace-layout__pane"
  ],
  [
    "frame",
    "workspace-layout__frame"
  ],
  [
    "header",
    "workspace-layout__header"
  ],
  [
    "toolbar",
    "workspace-layout__toolbar"
  ],
  [
    "mobileToggle",
    "workspace-layout__mobileToggle"
  ],
  [
    "scroll",
    "workspace-layout__scroll"
  ],
  [
    "content",
    "workspace-layout__content"
  ],
  [
    "error",
    "workspace-layout__error"
  ],
  [
    "errorContent",
    "workspace-layout__errorContent"
  ],
  [
    "composer",
    "workspace-layout__composer"
  ]
];
const workspaceLayoutSlotFns = /* @__PURE__ */ workspaceLayoutSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, workspaceLayoutDefaultVariants, getSlotCompoundVariant(workspaceLayoutCompoundVariants, slotName))]);

const workspaceLayoutFn = memo((props = {}) => {
  return Object.fromEntries(workspaceLayoutSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const workspaceLayoutVariantKeys = [];
const getVariantProps$e = (variants) => ({ ...workspaceLayoutDefaultVariants, ...compact(variants) });

const workspaceLayout = /* @__PURE__ */ Object.assign(workspaceLayoutFn, {
  __recipe__: false,
  __name__: 'workspaceLayout',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: workspaceLayoutVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, workspaceLayoutVariantKeys)
  },
  getVariantProps: getVariantProps$e
});

const approvedHeaderDefaultVariants = {};
const approvedHeaderCompoundVariants = [];

const approvedHeaderSlotNames = [
  [
    "root",
    "approved-header__root"
  ],
  [
    "probe",
    "approved-header__probe"
  ]
];
const approvedHeaderSlotFns = /* @__PURE__ */ approvedHeaderSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, approvedHeaderDefaultVariants, getSlotCompoundVariant(approvedHeaderCompoundVariants, slotName))]);

const approvedHeaderFn = memo((props = {}) => {
  return Object.fromEntries(approvedHeaderSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const approvedHeaderVariantKeys = [];
const getVariantProps$d = (variants) => ({ ...approvedHeaderDefaultVariants, ...compact(variants) });

const approvedHeader = /* @__PURE__ */ Object.assign(approvedHeaderFn, {
  __recipe__: false,
  __name__: 'approvedHeader',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: approvedHeaderVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, approvedHeaderVariantKeys)
  },
  getVariantProps: getVariantProps$d
});

const sidebarDefaultVariants = {};
const sidebarCompoundVariants = [];

const sidebarSlotNames = [
  [
    "treeRow",
    "sidebar__treeRow"
  ],
  [
    "treeLabel",
    "sidebar__treeLabel"
  ],
  [
    "treeCluster",
    "sidebar__treeCluster"
  ],
  [
    "treeModule",
    "sidebar__treeModule"
  ],
  [
    "treeTask",
    "sidebar__treeTask"
  ],
  [
    "treeDot",
    "sidebar__treeDot"
  ],
  [
    "treeChildren",
    "sidebar__treeChildren"
  ],
  [
    "treeSection",
    "sidebar__treeSection"
  ],
  [
    "treeInitiatives",
    "sidebar__treeInitiatives"
  ],
  [
    "provider",
    "sidebar__provider"
  ],
  [
    "root",
    "sidebar__root"
  ],
  [
    "gap",
    "sidebar__gap"
  ],
  [
    "container",
    "sidebar__container"
  ],
  [
    "inner",
    "sidebar__inner"
  ],
  [
    "inset",
    "sidebar__inset"
  ],
  [
    "header",
    "sidebar__header"
  ],
  [
    "footer",
    "sidebar__footer"
  ],
  [
    "content",
    "sidebar__content"
  ],
  [
    "group",
    "sidebar__group"
  ],
  [
    "expandedOnly",
    "sidebar__expandedOnly"
  ],
  [
    "collapsedOnly",
    "sidebar__collapsedOnly"
  ],
  [
    "menu",
    "sidebar__menu"
  ],
  [
    "item",
    "sidebar__item"
  ],
  [
    "control",
    "sidebar__control"
  ],
  [
    "iconControl",
    "sidebar__iconControl"
  ],
  [
    "rail",
    "sidebar__rail"
  ],
  [
    "railToggle",
    "sidebar__railToggle"
  ],
  [
    "resize",
    "sidebar__resize"
  ],
  [
    "separator",
    "sidebar__separator"
  ],
  [
    "groupLabel",
    "sidebar__groupLabel"
  ],
  [
    "groupAction",
    "sidebar__groupAction"
  ],
  [
    "groupContent",
    "sidebar__groupContent"
  ],
  [
    "menuAction",
    "sidebar__menuAction"
  ],
  [
    "badge",
    "sidebar__badge"
  ],
  [
    "skeleton",
    "sidebar__skeleton"
  ],
  [
    "skeletonIcon",
    "sidebar__skeletonIcon"
  ],
  [
    "skeletonText",
    "sidebar__skeletonText"
  ],
  [
    "sub",
    "sidebar__sub"
  ],
  [
    "subButton",
    "sidebar__subButton"
  ],
  [
    "input",
    "sidebar__input"
  ],
  [
    "mobile",
    "sidebar__mobile"
  ],
  [
    "mobileContent",
    "sidebar__mobileContent"
  ],
  [
    "mobileHandle",
    "sidebar__mobileHandle"
  ],
  [
    "srOnly",
    "sidebar__srOnly"
  ],
  [
    "switchRow",
    "sidebar__switchRow"
  ],
  [
    "switchAnchor",
    "sidebar__switchAnchor"
  ],
  [
    "switchRest",
    "sidebar__switchRest"
  ],
  [
    "switchToggle",
    "sidebar__switchToggle"
  ],
  [
    "switchSlot",
    "sidebar__switchSlot"
  ],
  [
    "switchClip",
    "sidebar__switchClip"
  ],
  [
    "switchMenu",
    "sidebar__switchMenu"
  ],
  [
    "wordmark",
    "sidebar__wordmark"
  ],
  [
    "trigger",
    "sidebar__trigger"
  ],
  [
    "empty",
    "sidebar__empty"
  ],
  [
    "historyGroups",
    "sidebar__historyGroups"
  ],
  [
    "historyLabel",
    "sidebar__historyLabel"
  ],
  [
    "loadMore",
    "sidebar__loadMore"
  ],
  [
    "rowWithAction",
    "sidebar__rowWithAction"
  ],
  [
    "truncate",
    "sidebar__truncate"
  ],
  [
    "inlineRow",
    "sidebar__inlineRow"
  ],
  [
    "splitRow",
    "sidebar__splitRow"
  ],
  [
    "confirmation",
    "sidebar__confirmation"
  ],
  [
    "actions",
    "sidebar__actions"
  ]
];
const sidebarSlotFns = /* @__PURE__ */ sidebarSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, sidebarDefaultVariants, getSlotCompoundVariant(sidebarCompoundVariants, slotName))]);

const sidebarFn = memo((props = {}) => {
  return Object.fromEntries(sidebarSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const sidebarVariantKeys = [];
const getVariantProps$c = (variants) => ({ ...sidebarDefaultVariants, ...compact(variants) });

const sidebar = /* @__PURE__ */ Object.assign(sidebarFn, {
  __recipe__: false,
  __name__: 'sidebar',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: sidebarVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, sidebarVariantKeys)
  },
  getVariantProps: getVariantProps$c
});

const chatStatusDefaultVariants = {
  "status": "rest",
  "display": "labeled"
};
const chatStatusCompoundVariants = [];

const chatStatusSlotNames = [
  [
    "root",
    "chat_status__root"
  ],
  [
    "icon",
    "chat_status__icon"
  ],
  [
    "label",
    "chat_status__label"
  ]
];
const chatStatusSlotFns = /* @__PURE__ */ chatStatusSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, chatStatusDefaultVariants, getSlotCompoundVariant(chatStatusCompoundVariants, slotName))]);

const chatStatusFn = memo((props = {}) => {
  return Object.fromEntries(chatStatusSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const chatStatusVariantKeys = [
  "status",
  "display"
];
const getVariantProps$b = (variants) => ({ ...chatStatusDefaultVariants, ...compact(variants) });

const chatStatus = /* @__PURE__ */ Object.assign(chatStatusFn, {
  __recipe__: false,
  __name__: 'chatStatus',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: chatStatusVariantKeys,
  variantMap: {
  "status": [
    "attention",
    "responding",
    "rest",
    "idle"
  ],
  "display": [
    "compact",
    "labeled"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, chatStatusVariantKeys)
  },
  getVariantProps: getVariantProps$b
});

const contextMenuDefaultVariants = {};
const contextMenuCompoundVariants = [];

const contextMenuSlotNames = [
  [
    "content",
    "context-menu__content"
  ],
  [
    "item",
    "context-menu__item"
  ],
  [
    "label",
    "context-menu__label"
  ],
  [
    "separator",
    "context-menu__separator"
  ]
];
const contextMenuSlotFns = /* @__PURE__ */ contextMenuSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, contextMenuDefaultVariants, getSlotCompoundVariant(contextMenuCompoundVariants, slotName))]);

const contextMenuFn = memo((props = {}) => {
  return Object.fromEntries(contextMenuSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const contextMenuVariantKeys = [
  "target"
];
const getVariantProps$a = (variants) => ({ ...contextMenuDefaultVariants, ...compact(variants) });

const contextMenu = /* @__PURE__ */ Object.assign(contextMenuFn, {
  __recipe__: false,
  __name__: 'contextMenu',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: contextMenuVariantKeys,
  variantMap: {
  "target": [
    "chat",
    "project",
    "initiative",
    "module",
    "task",
    "cycle",
    "file"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, contextMenuVariantKeys)
  },
  getVariantProps: getVariantProps$a
});

const sidePanelDefaultVariants = {
  "side": "left"
};
const sidePanelCompoundVariants = [];

const sidePanelSlotNames = [
  [
    "root",
    "side-panel__root"
  ],
  [
    "handle",
    "side-panel__handle"
  ]
];
const sidePanelSlotFns = /* @__PURE__ */ sidePanelSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, sidePanelDefaultVariants, getSlotCompoundVariant(sidePanelCompoundVariants, slotName))]);

const sidePanelFn = memo((props = {}) => {
  return Object.fromEntries(sidePanelSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const sidePanelVariantKeys = [
  "side"
];
const getVariantProps$9 = (variants) => ({ ...sidePanelDefaultVariants, ...compact(variants) });

const sidePanel = /* @__PURE__ */ Object.assign(sidePanelFn, {
  __recipe__: false,
  __name__: 'sidePanel',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: sidePanelVariantKeys,
  variantMap: {
  "side": [
    "left",
    "right"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, sidePanelVariantKeys)
  },
  getVariantProps: getVariantProps$9
});

const sidebarSearchDefaultVariants = {
  "variant": "chat"
};
const sidebarSearchCompoundVariants = [];

const sidebarSearchSlotNames = [
  [
    "root",
    "sidebar-search__root"
  ],
  [
    "field",
    "sidebar-search__field"
  ],
  [
    "action",
    "sidebar-search__action"
  ]
];
const sidebarSearchSlotFns = /* @__PURE__ */ sidebarSearchSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, sidebarSearchDefaultVariants, getSlotCompoundVariant(sidebarSearchCompoundVariants, slotName))]);

const sidebarSearchFn = memo((props = {}) => {
  return Object.fromEntries(sidebarSearchSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const sidebarSearchVariantKeys = [
  "variant"
];
const getVariantProps$8 = (variants) => ({ ...sidebarSearchDefaultVariants, ...compact(variants) });

const sidebarSearch = /* @__PURE__ */ Object.assign(sidebarSearchFn, {
  __recipe__: false,
  __name__: 'sidebarSearch',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: sidebarSearchVariantKeys,
  variantMap: {
  "variant": [
    "chat",
    "taskgraph"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, sidebarSearchVariantKeys)
  },
  getVariantProps: getVariantProps$8
});

const userAccountDefaultVariants = {
  "compact": false
};
const userAccountCompoundVariants = [];

const userAccountSlotNames = [
  [
    "trigger",
    "user-account__trigger"
  ],
  [
    "name",
    "user-account__name"
  ],
  [
    "menu",
    "user-account__menu"
  ],
  [
    "item",
    "user-account__item"
  ],
  [
    "submenu",
    "user-account__submenu"
  ],
  [
    "submenuArrow",
    "user-account__submenuArrow"
  ]
];
const userAccountSlotFns = /* @__PURE__ */ userAccountSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, userAccountDefaultVariants, getSlotCompoundVariant(userAccountCompoundVariants, slotName))]);

const userAccountFn = memo((props = {}) => {
  return Object.fromEntries(userAccountSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const userAccountVariantKeys = [
  "compact"
];
const getVariantProps$7 = (variants) => ({ ...userAccountDefaultVariants, ...compact(variants) });

const userAccount = /* @__PURE__ */ Object.assign(userAccountFn, {
  __recipe__: false,
  __name__: 'userAccount',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: userAccountVariantKeys,
  variantMap: {
  "compact": [
    "false",
    "true"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, userAccountVariantKeys)
  },
  getVariantProps: getVariantProps$7
});

const workItemDrawerDefaultVariants = {
  "variant": "task"
};
const workItemDrawerCompoundVariants = [];

const workItemDrawerSlotNames = [
  [
    "header",
    "work-item-drawer__header"
  ],
  [
    "breadcrumbs",
    "work-item-drawer__breadcrumbs"
  ],
  [
    "titleRow",
    "work-item-drawer__titleRow"
  ],
  [
    "title",
    "work-item-drawer__title"
  ],
  [
    "body",
    "work-item-drawer__body"
  ],
  [
    "section",
    "work-item-drawer__section"
  ],
  [
    "sectionHeader",
    "work-item-drawer__sectionHeader"
  ],
  [
    "actions",
    "work-item-drawer__actions"
  ],
  [
    "rows",
    "work-item-drawer__rows"
  ]
];
const workItemDrawerSlotFns = /* @__PURE__ */ workItemDrawerSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, workItemDrawerDefaultVariants, getSlotCompoundVariant(workItemDrawerCompoundVariants, slotName))]);

const workItemDrawerFn = memo((props = {}) => {
  return Object.fromEntries(workItemDrawerSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const workItemDrawerVariantKeys = [
  "variant"
];
const getVariantProps$6 = (variants) => ({ ...workItemDrawerDefaultVariants, ...compact(variants) });

const workItemDrawer = /* @__PURE__ */ Object.assign(workItemDrawerFn, {
  __recipe__: false,
  __name__: 'workItemDrawer',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: workItemDrawerVariantKeys,
  variantMap: {
  "variant": [
    "task",
    "module",
    "project",
    "initiative"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, workItemDrawerVariantKeys)
  },
  getVariantProps: getVariantProps$6
});

const notificationDefaultVariants = {};
const notificationCompoundVariants = [];

const notificationSlotNames = [
  [
    "root",
    "notification__root"
  ],
  [
    "source",
    "notification__source"
  ],
  [
    "controls",
    "notification__controls"
  ],
  [
    "detail",
    "notification__detail"
  ],
  [
    "actions",
    "notification__actions"
  ],
  [
    "reveal",
    "notification__reveal"
  ],
  [
    "editor",
    "notification__editor"
  ],
  [
    "choices",
    "notification__choices"
  ],
  [
    "bell",
    "notification__bell"
  ],
  [
    "count",
    "notification__count"
  ],
  [
    "inbox",
    "notification__inbox"
  ],
  [
    "item",
    "notification__item"
  ],
  [
    "rail",
    "notification__rail"
  ]
];
const notificationSlotFns = /* @__PURE__ */ notificationSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, notificationDefaultVariants, getSlotCompoundVariant(notificationCompoundVariants, slotName))]);

const notificationFn = memo((props = {}) => {
  return Object.fromEntries(notificationSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const notificationVariantKeys = [
  "kind"
];
const getVariantProps$5 = (variants) => ({ ...notificationDefaultVariants, ...compact(variants) });

const notification = /* @__PURE__ */ Object.assign(notificationFn, {
  __recipe__: false,
  __name__: 'notification',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: notificationVariantKeys,
  variantMap: {
  "kind": [
    "error",
    "permission",
    "question",
    "ready",
    "attention"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, notificationVariantKeys)
  },
  getVariantProps: getVariantProps$5
});

const overlayDefaultVariants = {
  "placement": "dialog"
};
const overlayCompoundVariants = [];

const overlaySlotNames = [
  [
    "backdrop",
    "overlay__backdrop"
  ],
  [
    "content",
    "overlay__content"
  ],
  [
    "header",
    "overlay__header"
  ],
  [
    "title",
    "overlay__title"
  ],
  [
    "body",
    "overlay__body"
  ]
];
const overlaySlotFns = /* @__PURE__ */ overlaySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, overlayDefaultVariants, getSlotCompoundVariant(overlayCompoundVariants, slotName))]);

const overlayFn = memo((props = {}) => {
  return Object.fromEntries(overlaySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const overlayVariantKeys = [
  "placement"
];
const getVariantProps$4 = (variants) => ({ ...overlayDefaultVariants, ...compact(variants) });

const overlay = /* @__PURE__ */ Object.assign(overlayFn, {
  __recipe__: false,
  __name__: 'overlay',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: overlayVariantKeys,
  variantMap: {
  "placement": [
    "dialog",
    "drawer"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, overlayVariantKeys)
  },
  getVariantProps: getVariantProps$4
});

const fieldDefaultVariants = {
  "variant": "text"
};
const fieldCompoundVariants = [];

const fieldSlotNames = [
  [
    "root",
    "field__root"
  ],
  [
    "control",
    "field__control"
  ],
  [
    "icon",
    "field__icon"
  ],
  [
    "clear",
    "field__clear"
  ],
  [
    "label",
    "field__label"
  ],
  [
    "description",
    "field__description"
  ]
];
const fieldSlotFns = /* @__PURE__ */ fieldSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, fieldDefaultVariants, getSlotCompoundVariant(fieldCompoundVariants, slotName))]);

const fieldFn = memo((props = {}) => {
  return Object.fromEntries(fieldSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const fieldVariantKeys = [
  "variant"
];
const getVariantProps$3 = (variants) => ({ ...fieldDefaultVariants, ...compact(variants) });

const field = /* @__PURE__ */ Object.assign(fieldFn, {
  __recipe__: false,
  __name__: 'field',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: fieldVariantKeys,
  variantMap: {
  "variant": [
    "text",
    "search",
    "large"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, fieldVariantKeys)
  },
  getVariantProps: getVariantProps$3
});

const menuDefaultVariants = {};
const menuCompoundVariants = [];

const menuSlotNames = [
  [
    "content",
    "menu__content"
  ],
  [
    "item",
    "menu__item"
  ],
  [
    "label",
    "menu__label"
  ],
  [
    "separator",
    "menu__separator"
  ]
];
const menuSlotFns = /* @__PURE__ */ menuSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, menuDefaultVariants, getSlotCompoundVariant(menuCompoundVariants, slotName))]);

const menuFn = memo((props = {}) => {
  return Object.fromEntries(menuSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const menuVariantKeys = [
  "layout"
];
const getVariantProps$2 = (variants) => ({ ...menuDefaultVariants, ...compact(variants) });

const menu = /* @__PURE__ */ Object.assign(menuFn, {
  __recipe__: false,
  __name__: 'menu',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: menuVariantKeys,
  variantMap: {
  "layout": [
    "action"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, menuVariantKeys)
  },
  getVariantProps: getVariantProps$2
});

const scrollDefaultVariants = {};
const scrollCompoundVariants = [];

const scrollSlotNames = [
  [
    "root",
    "scroll__root"
  ],
  [
    "viewport",
    "scroll__viewport"
  ],
  [
    "track",
    "scroll__track"
  ],
  [
    "thumb",
    "scroll__thumb"
  ]
];
const scrollSlotFns = /* @__PURE__ */ scrollSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, scrollDefaultVariants, getSlotCompoundVariant(scrollCompoundVariants, slotName))]);

const scrollFn = memo((props = {}) => {
  return Object.fromEntries(scrollSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const scrollVariantKeys = [];
const getVariantProps$1 = (variants) => ({ ...scrollDefaultVariants, ...compact(variants) });

const scroll = /* @__PURE__ */ Object.assign(scrollFn, {
  __recipe__: false,
  __name__: 'scroll',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: scrollVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, scrollVariantKeys)
  },
  getVariantProps: getVariantProps$1
});

const overviewCardDefaultVariants = {
  "variant": "chat"
};
const overviewCardCompoundVariants = [];

const overviewCardSlotNames = [
  [
    "root",
    "overview-card__root"
  ],
  [
    "surface",
    "overview-card__surface"
  ]
];
const overviewCardSlotFns = /* @__PURE__ */ overviewCardSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, overviewCardDefaultVariants, getSlotCompoundVariant(overviewCardCompoundVariants, slotName))]);

const overviewCardFn = memo((props = {}) => {
  return Object.fromEntries(overviewCardSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
});

const overviewCardVariantKeys = [
  "variant"
];
const getVariantProps = (variants) => ({ ...overviewCardDefaultVariants, ...compact(variants) });

const overviewCard = /* @__PURE__ */ Object.assign(overviewCardFn, {
  __recipe__: false,
  __name__: 'overviewCard',
  raw: (props) => props,
  classNameMap: {},
  variantKeys: overviewCardVariantKeys,
  variantMap: {
  "variant": [
    "chat",
    "project"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, overviewCardVariantKeys)
  },
  getVariantProps
});

export { agentRoster, approvedHeader, authLayout, auxiliaryLayout, button, card, chatStatus, chatStatus as chat_status, chip, contextMenu, controlLayout, field, interactionLayout, menu, notification, overlay, overviewCard, overviewLayout, row, scroll, sidePanel, sidebar, sidebarSearch, spacing, supportLayout, surface, title, tooltip, transcriptLayout, userAccount, workItemDrawer, workspaceLayout };
