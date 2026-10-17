"use client";

// src/theme.tsx
import { createContext, useContext } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { jsx } from "react/jsx-runtime";
var ThemeContext = createContext({
  theme: "dark",
  reducedMotion: false,
  glass: true
});
function useCaelosTheme() {
  return useContext(ThemeContext);
}
function themeAttributes({
  theme,
  reducedMotion,
  glass
}) {
  return {
    "data-caelos-theme": theme,
    "data-caelos-reduced": reducedMotion,
    "data-caelos-glass": glass
  };
}
function CaelosProvider({
  theme = "dark",
  reducedMotion = false,
  glass = true,
  tooltipDelay = 400,
  children,
  ...props
}) {
  const settings = { theme, reducedMotion, glass };
  return /* @__PURE__ */ jsx(ThemeContext.Provider, { value: settings, children: /* @__PURE__ */ jsx(RadixTooltip.Provider, { delayDuration: tooltipDelay, children: /* @__PURE__ */ jsx("div", { ...props, ...themeAttributes(settings), children }) }) });
}

// src/components.tsx
import React2, {
  forwardRef,
  useId,
  useState,
  useRef,
  useLayoutEffect,
  useCallback
} from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as RadixTooltip2 from "@radix-ui/react-tooltip";
import * as RadixScroll from "@radix-ui/react-scroll-area";
import * as RadixTabs from "@radix-ui/react-tabs";
import * as RadixSelect from "@radix-ui/react-select";
import { Search, X, ChevronDown, ChevronRight, Check, KeyRound } from "lucide-react";

// styled-system/helpers.mjs
function isObject(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
var isObjectOrArray = (obj) => typeof obj === "object" && obj !== null;
function compact(value) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([_, value2]) => value2 !== void 0));
}
var isBaseCondition = (v) => v === "base";
function filterBaseConditions(c) {
  return c.slice().filter((v) => !isBaseCondition(v));
}
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
function normalizeStyleObject(styles, context2, shorthand = true) {
  const { utility, conditions: conditions2 } = context2;
  const { hasShorthand, resolveShorthand: resolveShorthand2 } = utility;
  return walkObject(
    styles,
    (value) => {
      return Array.isArray(value) ? toResponsiveObject(value, conditions2.breakpoints.keys) : value;
    },
    {
      stop: (value) => Array.isArray(value),
      getKey: shorthand ? (prop) => hasShorthand ? resolveShorthand2(prop) : prop : void 0
    }
  );
}
var fallbackCondition = {
  shift: (v) => v,
  finalize: (v) => v,
  breakpoints: { keys: [] }
};
var sanitize = (value) => typeof value === "string" ? value.replaceAll(/[\n\s]+/g, " ") : value;
function createCss(context2) {
  const { utility, hash, conditions: conds = fallbackCondition } = context2;
  const formatClassName = (str) => [utility.prefix, str].filter(Boolean).join("-");
  const hashFn = (conditions2, className) => {
    let result;
    if (hash) {
      const baseArray = [...conds.finalize(conditions2), className];
      result = formatClassName(utility.toHash(baseArray, toHash));
    } else {
      const baseArray = [...conds.finalize(conditions2), formatClassName(className)];
      result = baseArray.join(":");
    }
    return result;
  };
  return memo(({ base, ...styles } = {}) => {
    const styleObject = Object.assign(styles, base);
    const normalizedObject = normalizeStyleObject(styleObject, context2);
    const classNames = /* @__PURE__ */ new Set();
    walkObject(normalizedObject, (value, paths) => {
      if (value == null) return;
      const important = isImportant(value);
      const [prop, ...allConditions] = conds.shift(paths);
      const conditions2 = filterBaseConditions(allConditions);
      const transformed = utility.transform(prop, withoutImportant(sanitize(value)));
      let className = hashFn(conditions2, transformed.className);
      if (important) className = `${className}!`;
      classNames.add(className);
    });
    return Array.from(classNames).join(" ");
  });
}
function compactStyles(...styles) {
  return styles.flat().filter((style) => isObject(style) && Object.keys(compact(style)).length > 0);
}
function createMergeCss(context2) {
  function resolve(styles) {
    const allStyles = compactStyles(...styles);
    if (allStyles.length === 1) return allStyles;
    return allStyles.map((style) => normalizeStyleObject(style, context2));
  }
  function mergeCss2(...styles) {
    return mergeProps(...resolve(styles));
  }
  function assignCss2(...styles) {
    return Object.assign({}, ...resolve(styles));
  }
  return { mergeCss: memo(mergeCss2), assignCss: assignCss2 };
}
var wordRegex = /([A-Z])/g;
var msRegex = /^ms-/;
var hypenateProperty = memo((property) => {
  if (property.startsWith("--")) return property;
  return property.replace(wordRegex, "-$1").replace(msRegex, "-ms-").toLowerCase();
});
var fns = ["min", "max", "clamp", "calc"];
var fnRegExp = new RegExp(`^(${fns.join("|")})\\(.*\\)`);
var lengthUnits = "cm,mm,Q,in,pc,pt,px,em,ex,ch,rem,lh,rlh,vw,vh,vmin,vmax,vb,vi,svw,svh,lvw,lvh,dvw,dvh,cqw,cqh,cqi,cqb,cqmin,cqmax,%";
var lengthUnitsPattern = `(?:${lengthUnits.split(",").join("|")})`;
var lengthRegExp = new RegExp(`^[+-]?[0-9]*.?[0-9]+(?:[eE][+-]?[0-9]+)?${lengthUnitsPattern}$`);
var getSlotCompoundVariant = (compoundVariants, slotName) => compoundVariants.filter((compoundVariant) => compoundVariant.css[slotName]).map((compoundVariant) => ({ ...compoundVariant, css: compoundVariant.css[slotName] }));
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
var uniq = (...items) => {
  const set = items.reduce((acc, currItems) => {
    if (currItems) {
      currItems.forEach((item) => acc.add(item));
    }
    return acc;
  }, /* @__PURE__ */ new Set([]));
  return Array.from(set);
};

// styled-system/css/conditions.mjs
var conditionsStr = "_hover,_focus,_focusWithin,_focusVisible,_disabled,_active,_visited,_target,_readOnly,_readWrite,_empty,_checked,_enabled,_expanded,_highlighted,_complete,_incomplete,_dragging,_before,_after,_firstLetter,_firstLine,_marker,_selection,_file,_backdrop,_first,_last,_only,_even,_odd,_firstOfType,_lastOfType,_onlyOfType,_peerFocus,_peerHover,_peerActive,_peerFocusWithin,_peerFocusVisible,_peerDisabled,_peerChecked,_peerInvalid,_peerExpanded,_peerPlaceholderShown,_groupFocus,_groupHover,_groupActive,_groupFocusWithin,_groupFocusVisible,_groupDisabled,_groupChecked,_groupExpanded,_groupInvalid,_indeterminate,_required,_valid,_invalid,_autofill,_inRange,_outOfRange,_placeholder,_placeholderShown,_pressed,_selected,_grabbed,_underValue,_overValue,_atValue,_default,_optional,_open,_closed,_fullscreen,_loading,_hidden,_current,_currentPage,_currentStep,_today,_unavailable,_rangeStart,_rangeEnd,_now,_topmost,_motionReduce,_motionSafe,_print,_landscape,_portrait,_dark,_light,_osDark,_osLight,_highContrast,_lessContrast,_moreContrast,_ltr,_rtl,_scrollbar,_scrollbarThumb,_scrollbarTrack,_horizontal,_vertical,_icon,_starting,_noscript,_invertedColors,base";
var conditions = new Set(conditionsStr.split(","));
var conditionRegex = /^@|&|&$/;
function isCondition(value) {
  return conditions.has(value) || conditionRegex.test(value);
}
var underscoreRegex = /^_/;
var conditionsSelectorRegex = /&|@/;
function finalizeConditions(paths) {
  return paths.map((path) => {
    if (conditions.has(path)) {
      return path.replace(underscoreRegex, "");
    }
    if (conditionsSelectorRegex.test(path)) {
      return `[${withoutSpace(path.trim())}]`;
    }
    return path;
  });
}
function sortConditions(paths) {
  return paths.sort((a, b) => {
    const aa = isCondition(a);
    const bb = isCondition(b);
    if (aa && !bb) return 1;
    if (!aa && bb) return -1;
    return 0;
  });
}

// styled-system/css/css.mjs
var utilities = "aspectRatio:asp,boxDecorationBreak:bx-db,zIndex:z,boxSizing:bx-s,objectPosition:obj-p,objectFit:obj-f,overscrollBehavior:ovs-b,overscrollBehaviorX:ovs-bx,overscrollBehaviorY:ovs-by,position:pos/1,top:top,left:left,inset:inset,insetInline:inset-x/insetX,insetBlock:inset-y/insetY,insetBlockEnd:inset-be,insetBlockStart:inset-bs,insetInlineEnd:inset-e/insetEnd/end,insetInlineStart:inset-s/insetStart/start,right:right,bottom:bottom,float:float,visibility:vis,display:d,hideFrom:hide,hideBelow:show,flexBasis:flex-b,flex:flex,flexDirection:flex-d/flexDir,flexGrow:flex-g,flexShrink:flex-sh,gridTemplateColumns:grid-tc,gridTemplateRows:grid-tr,gridColumn:grid-c,gridRow:grid-r,gridColumnStart:grid-cs,gridColumnEnd:grid-ce,gridAutoFlow:grid-af,gridAutoColumns:grid-ac,gridAutoRows:grid-ar,gap:gap,gridGap:grid-g,gridRowGap:grid-rg,gridColumnGap:grid-cg,rowGap:rg,columnGap:cg,justifyContent:jc,alignContent:ac,alignItems:ai,alignSelf:as,padding:p/1,paddingLeft:pl/1,paddingRight:pr/1,paddingTop:pt/1,paddingBottom:pb/1,paddingBlock:py/1/paddingY,paddingBlockEnd:pbe,paddingBlockStart:pbs,paddingInline:px/paddingX/1,paddingInlineEnd:pe/1/paddingEnd,paddingInlineStart:ps/1/paddingStart,marginLeft:ml/1,marginRight:mr/1,marginTop:mt/1,marginBottom:mb/1,margin:m/1,marginBlock:my/1/marginY,marginBlockEnd:mbe,marginBlockStart:mbs,marginInline:mx/1/marginX,marginInlineEnd:me/1/marginEnd,marginInlineStart:ms/1/marginStart,spaceX:sx,spaceY:sy,outlineWidth:ring-w/ringWidth,outlineColor:ring-c/ringColor,outline:ring/1,outlineOffset:ring-o/ringOffset,focusRing:focus-ring,focusVisibleRing:focus-v-ring,focusRingColor:focus-ring-c,focusRingOffset:focus-ring-o,focusRingWidth:focus-ring-w,focusRingStyle:focus-ring-s,divideX:dvd-x,divideY:dvd-y,divideColor:dvd-c,divideStyle:dvd-s,width:w/1,inlineSize:w-is,minWidth:min-w/minW,minInlineSize:min-w-is,maxWidth:max-w/maxW,maxInlineSize:max-w-is,height:h/1,blockSize:h-bs,minHeight:min-h/minH,minBlockSize:min-h-bs,maxHeight:max-h/maxH,maxBlockSize:max-b,boxSize:size,color:c,fontFamily:ff,fontSize:fs,fontSizeAdjust:fs-a,fontPalette:fp,fontKerning:fk,fontFeatureSettings:ff-s,fontWeight:fw,fontSmoothing:fsmt,fontVariant:fv,fontVariantAlternates:fv-alt,fontVariantCaps:fv-caps,fontVariationSettings:fv-s,fontVariantNumeric:fv-num,letterSpacing:ls,lineHeight:lh,textAlign:ta,textDecoration:td,textDecorationColor:td-c,textEmphasisColor:te-c,textDecorationStyle:td-s,textDecorationThickness:td-t,textUnderlineOffset:tu-o,textTransform:tt,textIndent:ti,textShadow:tsh,textShadowColor:tsh-c/textShadowColor,WebkitTextFillColor:wktf-c,textOverflow:tov,verticalAlign:va,wordBreak:wb,textWrap:tw,truncate:trunc,lineClamp:lc,listStyleType:li-t,listStylePosition:li-pos,listStyleImage:li-img,listStyle:li-s,backgroundPosition:bg-p/bgPosition,backgroundPositionX:bg-p-x/bgPositionX,backgroundPositionY:bg-p-y/bgPositionY,backgroundAttachment:bg-a/bgAttachment,backgroundClip:bg-cp/bgClip,background:bg/1,backgroundColor:bg-c/bgColor,backgroundOrigin:bg-o/bgOrigin,backgroundImage:bg-i/bgImage,backgroundRepeat:bg-r/bgRepeat,backgroundBlendMode:bg-bm/bgBlendMode,backgroundSize:bg-s/bgSize,backgroundGradient:bg-grad/bgGradient,backgroundLinear:bg-linear/bgLinear,backgroundRadial:bg-radial/bgRadial,backgroundConic:bg-conic/bgConic,textGradient:txt-grad,gradientFromPosition:grad-from-pos,gradientToPosition:grad-to-pos,gradientFrom:grad-from,gradientTo:grad-to,gradientVia:grad-via,gradientViaPosition:grad-via-pos,borderRadius:bdr/rounded,borderTopLeftRadius:bdr-tl/roundedTopLeft,borderTopRightRadius:bdr-tr/roundedTopRight,borderBottomRightRadius:bdr-br/roundedBottomRight,borderBottomLeftRadius:bdr-bl/roundedBottomLeft,borderTopRadius:bdr-t/roundedTop,borderRightRadius:bdr-r/roundedRight,borderBottomRadius:bdr-b/roundedBottom,borderLeftRadius:bdr-l/roundedLeft,borderStartStartRadius:bdr-ss/roundedStartStart,borderStartEndRadius:bdr-se/roundedStartEnd,borderStartRadius:bdr-s/roundedStart,borderEndStartRadius:bdr-es/roundedEndStart,borderEndEndRadius:bdr-ee/roundedEndEnd,borderEndRadius:bdr-e/roundedEnd,border:bd,borderWidth:bd-w,borderTopWidth:bd-t-w,borderLeftWidth:bd-l-w,borderRightWidth:bd-r-w,borderBottomWidth:bd-b-w,borderBlockStartWidth:bd-bs-w,borderBlockEndWidth:bd-be-w,borderColor:bd-c,borderInline:bd-x/borderX,borderInlineWidth:bd-x-w/borderXWidth,borderInlineColor:bd-x-c/borderXColor,borderBlock:bd-y/borderY,borderBlockWidth:bd-y-w/borderYWidth,borderBlockColor:bd-y-c/borderYColor,borderLeft:bd-l,borderLeftColor:bd-l-c,borderInlineStart:bd-s/borderStart,borderInlineStartWidth:bd-s-w/borderStartWidth,borderInlineStartColor:bd-s-c/borderStartColor,borderRight:bd-r,borderRightColor:bd-r-c,borderInlineEnd:bd-e/borderEnd,borderInlineEndWidth:bd-e-w/borderEndWidth,borderInlineEndColor:bd-e-c/borderEndColor,borderTop:bd-t,borderTopColor:bd-t-c,borderBottom:bd-b,borderBottomColor:bd-b-c,borderBlockEnd:bd-be,borderBlockEndColor:bd-be-c,borderBlockStart:bd-bs,borderBlockStartColor:bd-bs-c,opacity:op,boxShadow:bx-sh/shadow,boxShadowColor:bx-sh-c/shadowColor,mixBlendMode:mix-bm,filter:filter,brightness:brightness,contrast:contrast,grayscale:grayscale,hueRotate:hue-rotate,invert:invert,saturate:saturate,sepia:sepia,dropShadow:drop-shadow,blur:blur,backdropFilter:bkdp,backdropBlur:bkdp-blur,backdropBrightness:bkdp-brightness,backdropContrast:bkdp-contrast,backdropGrayscale:bkdp-grayscale,backdropHueRotate:bkdp-hue-rotate,backdropInvert:bkdp-invert,backdropOpacity:bkdp-opacity,backdropSaturate:bkdp-saturate,backdropSepia:bkdp-sepia,borderCollapse:bd-cl,borderSpacing:bd-sp,borderSpacingX:bd-sx,borderSpacingY:bd-sy,tableLayout:tbl,transitionTimingFunction:trs-tmf,transitionDelay:trs-dly,transitionDuration:trs-dur,transitionProperty:trs-prop,transition:trs,animation:anim,animationName:anim-n,animationTimingFunction:anim-tmf,animationDuration:anim-dur,animationDelay:anim-dly,animationPlayState:anim-ps,animationComposition:anim-comp,animationFillMode:anim-fm,animationDirection:anim-dir,animationIterationCount:anim-ic,animationRange:anim-r,animationState:anim-s,animationRangeStart:anim-rs,animationRangeEnd:anim-re,animationTimeline:anim-tl,transformOrigin:trf-o,transformBox:trf-b,transformStyle:trf-s,transform:trf,rotate:rotate,rotateX:rotate-x,rotateY:rotate-y,rotateZ:rotate-z,scale:scale,scaleX:scale-x,scaleY:scale-y,translate:translate,translateX:translate-x/x,translateY:translate-y/y,translateZ:translate-z/z,accentColor:ac-c,caretColor:ca-c,scrollBehavior:scr-bhv,scrollbar:scr-bar,scrollbarColor:scr-bar-c,scrollbarGutter:scr-bar-g,scrollbarWidth:scr-bar-w,scrollMargin:scr-m,scrollMarginLeft:scr-ml,scrollMarginRight:scr-mr,scrollMarginTop:scr-mt,scrollMarginBottom:scr-mb,scrollMarginBlock:scr-my/scrollMarginY,scrollMarginBlockEnd:scr-mbe,scrollMarginBlockStart:scr-mbt,scrollMarginInline:scr-mx/scrollMarginX,scrollMarginInlineEnd:scr-me,scrollMarginInlineStart:scr-ms,scrollPadding:scr-p,scrollPaddingBlock:scr-py/scrollPaddingY,scrollPaddingBlockStart:scr-pbs,scrollPaddingBlockEnd:scr-pbe,scrollPaddingInline:scr-px/scrollPaddingX,scrollPaddingInlineEnd:scr-pe,scrollPaddingInlineStart:scr-ps,scrollPaddingLeft:scr-pl,scrollPaddingRight:scr-pr,scrollPaddingTop:scr-pt,scrollPaddingBottom:scr-pb,scrollSnapAlign:scr-sa,scrollSnapStop:scrs-s,scrollSnapType:scrs-t,scrollSnapStrictness:scrs-strt,scrollSnapMargin:scrs-m,scrollSnapMarginTop:scrs-mt,scrollSnapMarginBottom:scrs-mb,scrollSnapMarginLeft:scrs-ml,scrollSnapMarginRight:scrs-mr,scrollSnapCoordinate:scrs-c,scrollSnapDestination:scrs-d,scrollSnapPointsX:scrs-px,scrollSnapPointsY:scrs-py,scrollSnapTypeX:scrs-tx,scrollSnapTypeY:scrs-ty,scrollTimeline:scrtl,scrollTimelineAxis:scrtl-a,scrollTimelineName:scrtl-n,touchAction:tch-a,userSelect:us,overflow:ov,overflowWrap:ov-wrap,overflowX:ov-x,overflowY:ov-y,overflowAnchor:ov-a,overflowBlock:ov-b,overflowInline:ov-i,overflowClipBox:ovcp-bx,overflowClipMargin:ovcp-m,overscrollBehaviorBlock:ovs-bb,overscrollBehaviorInline:ovs-bi,fill:fill,stroke:stk,strokeWidth:stk-w,strokeDasharray:stk-dsh,strokeDashoffset:stk-do,strokeLinecap:stk-lc,strokeLinejoin:stk-lj,strokeMiterlimit:stk-ml,strokeOpacity:stk-op,srOnly:sr,debug:debug,appearance:ap,backfaceVisibility:bfv,clipPath:cp-path,hyphens:hy,mask:msk,maskImage:msk-i,maskSize:msk-s,textSizeAdjust:txt-adj,container:cq,containerName:cq-n,containerType:cq-t,cursor:cursor";
var classNameByProp = /* @__PURE__ */ new Map();
var shorthands = /* @__PURE__ */ new Map();
utilities.split(",").forEach((utility) => {
  const [prop, meta] = utility.split(":");
  const [className, ...shorthandList] = meta.split("/");
  classNameByProp.set(prop, className);
  if (shorthandList.length) {
    shorthandList.forEach((shorthand) => {
      shorthands.set(shorthand === "1" ? className : shorthand, prop);
    });
  }
});
var resolveShorthand = (prop) => shorthands.get(prop) || prop;
var context = {
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
      return { className: `${propKey}_${withoutSpace(value)}` };
    },
    hasShorthand: true,
    toHash: (path, hashFn) => hashFn(path.join(":")),
    resolveShorthand
  }
};
var cssFn = createCss(context);
var css = (...styles) => cssFn(mergeCss(...styles));
css.raw = (...styles) => mergeCss(...styles);
var { mergeCss, assignCss } = createMergeCss(context);

// styled-system/css/cva.mjs
function getCompoundVariantCss(compoundVariants, variantMap) {
  let result = {};
  compoundVariants.forEach((compoundVariant) => {
    const isMatching = Object.entries(compoundVariant).every(([key, value]) => {
      if (key === "css") return true;
      const values = Array.isArray(value) ? value : [value];
      return values.some((value2) => variantMap[key] === value2);
    });
    if (isMatching) {
      result = mergeCss(result, compoundVariant.css);
    }
  });
  return result;
}
function assertCompoundVariant(name, compoundVariants, variants, prop) {
  if (compoundVariants.length > 0 && typeof variants?.[prop] === "object") {
    throw new Error(`[recipe:${name}:${prop}] Conditions are not supported when using compound variants.`);
  }
}

// styled-system/css/cx.mjs
function cx() {
  let str = "", i = 0, arg;
  for (; i < arguments.length; ) {
    if ((arg = arguments[i++]) && typeof arg === "string") {
      str && (str += " ");
      str += arg;
    }
  }
  return str;
}

// styled-system/recipes/create-recipe.mjs
var createRecipe = (name, defaultVariants, compoundVariants) => {
  const getVariantProps32 = (variants) => {
    return {
      [name]: "__ignore__",
      ...defaultVariants,
      ...compact(variants)
    };
  };
  const recipeFn = (variants, withCompoundVariants = true) => {
    const transform = (prop, value) => {
      assertCompoundVariant(name, compoundVariants, variants, prop);
      if (value === "__ignore__") {
        return { className: name };
      }
      value = withoutSpace(value);
      return { className: `${name}--${prop}_${value}` };
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
        transform
      }
    });
    const recipeStyles = getVariantProps32(variants);
    if (withCompoundVariants) {
      const compoundVariantStyles = getCompoundVariantCss(compoundVariants, recipeStyles);
      return cx(recipeCss(recipeStyles), css(compoundVariantStyles));
    }
    return recipeCss(recipeStyles);
  };
  return {
    recipeFn,
    getVariantProps: getVariantProps32,
    __getCompoundVariantCss__: (variants) => {
      return getCompoundVariantCss(compoundVariants, getVariantProps32(variants));
    }
  };
};
var mergeRecipes = (recipeA, recipeB) => {
  if (recipeA && !recipeB) return recipeA;
  if (!recipeA && recipeB) return recipeB;
  const recipeFn = (...args) => cx(recipeA(...args), recipeB(...args));
  const variantKeys = uniq(recipeA.variantKeys, recipeB.variantKeys);
  const variantMap = variantKeys.reduce((acc, key) => {
    acc[key] = uniq(recipeA.variantMap[key], recipeB.variantMap[key]);
    return acc;
  }, {});
  return Object.assign(recipeFn, {
    __recipe__: true,
    __name__: `${recipeA.__name__} ${recipeB.__name__}`,
    raw: (props) => props,
    variantKeys,
    variantMap,
    splitVariantProps(props) {
      return splitProps(props, variantKeys);
    }
  });
};

// styled-system/recipes/title.mjs
var titleFn = /* @__PURE__ */ createRecipe("title", {
  "variant": "task"
}, []);
var titleVariantMap = {
  "variant": [
    "project",
    "module",
    "task",
    "conversation",
    "navigation"
  ]
};
var titleVariantKeys = Object.keys(titleVariantMap);
var title = /* @__PURE__ */ Object.assign(memo(titleFn.recipeFn), {
  __recipe__: true,
  __name__: "title",
  __getCompoundVariantCss__: titleFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: titleVariantKeys,
  variantMap: titleVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, titleVariantKeys);
  },
  getVariantProps: titleFn.getVariantProps
});

// styled-system/recipes/chat-navigation-control.mjs
var chatNavigationControlFn = /* @__PURE__ */ createRecipe("chat-navigation-control", {}, []);
var chatNavigationControlVariantMap = {};
var chatNavigationControlVariantKeys = Object.keys(chatNavigationControlVariantMap);
var chatNavigationControl = /* @__PURE__ */ Object.assign(memo(chatNavigationControlFn.recipeFn), {
  __recipe__: true,
  __name__: "chatNavigationControl",
  __getCompoundVariantCss__: chatNavigationControlFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: chatNavigationControlVariantKeys,
  variantMap: chatNavigationControlVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, chatNavigationControlVariantKeys);
  },
  getVariantProps: chatNavigationControlFn.getVariantProps
});

// styled-system/recipes/spacing.mjs
var spacingFn = /* @__PURE__ */ createRecipe("spacing", {
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
var spacingVariantMap = {
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
var spacingVariantKeys = Object.keys(spacingVariantMap);
var spacing = /* @__PURE__ */ Object.assign(memo(spacingFn.recipeFn), {
  __recipe__: true,
  __name__: "spacing",
  __getCompoundVariantCss__: spacingFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: spacingVariantKeys,
  variantMap: spacingVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, spacingVariantKeys);
  },
  getVariantProps: spacingFn.getVariantProps
});

// styled-system/recipes/ripple-loader.mjs
var rippleLoaderFn = /* @__PURE__ */ createRecipe("ripple-loader", {}, []);
var rippleLoaderVariantMap = {};
var rippleLoaderVariantKeys = Object.keys(rippleLoaderVariantMap);
var rippleLoader = /* @__PURE__ */ Object.assign(memo(rippleLoaderFn.recipeFn), {
  __recipe__: true,
  __name__: "rippleLoader",
  __getCompoundVariantCss__: rippleLoaderFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: rippleLoaderVariantKeys,
  variantMap: rippleLoaderVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, rippleLoaderVariantKeys);
  },
  getVariantProps: rippleLoaderFn.getVariantProps
});

// styled-system/recipes/surface.mjs
var surfaceFn = /* @__PURE__ */ createRecipe("surface", {
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
var surfaceVariantMap = {
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
var surfaceVariantKeys = Object.keys(surfaceVariantMap);
var surface = /* @__PURE__ */ Object.assign(memo(surfaceFn.recipeFn), {
  __recipe__: true,
  __name__: "surface",
  __getCompoundVariantCss__: surfaceFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: surfaceVariantKeys,
  variantMap: surfaceVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, surfaceVariantKeys);
  },
  getVariantProps: surfaceFn.getVariantProps
});

// styled-system/recipes/foundation.mjs
var foundationFn = /* @__PURE__ */ createRecipe("foundation", {}, []);
var foundationVariantMap = {
  "kind": [
    "popover",
    "range",
    "checkbox",
    "separator",
    "progress",
    "resize",
    "dot"
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
var foundationVariantKeys = Object.keys(foundationVariantMap);
var foundation = /* @__PURE__ */ Object.assign(memo(foundationFn.recipeFn), {
  __recipe__: true,
  __name__: "foundation",
  __getCompoundVariantCss__: foundationFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: foundationVariantKeys,
  variantMap: foundationVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, foundationVariantKeys);
  },
  getVariantProps: foundationFn.getVariantProps
});

// styled-system/recipes/typography.mjs
var typographyFn = /* @__PURE__ */ createRecipe("typography", {
  "role": "body",
  "tone": "default"
}, []);
var typographyVariantMap = {
  "role": [
    "body",
    "small",
    "label",
    "mono",
    "display",
    "page",
    "section",
    "title"
  ],
  "tone": [
    "default",
    "muted",
    "dim",
    "accent"
  ]
};
var typographyVariantKeys = Object.keys(typographyVariantMap);
var typography = /* @__PURE__ */ Object.assign(memo(typographyFn.recipeFn), {
  __recipe__: true,
  __name__: "typography",
  __getCompoundVariantCss__: typographyFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: typographyVariantKeys,
  variantMap: typographyVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, typographyVariantKeys);
  },
  getVariantProps: typographyFn.getVariantProps
});

// styled-system/recipes/avatar.mjs
var avatarDefaultVariants = {
  "shape": "circle",
  "size": "md"
};
var avatarCompoundVariants = [];
var avatarSlotNames = [
  [
    "root",
    "avatar__root"
  ],
  [
    "frame",
    "avatar__frame"
  ],
  [
    "image",
    "avatar__image"
  ],
  [
    "fallback",
    "avatar__fallback"
  ],
  [
    "badge",
    "avatar__badge"
  ]
];
var avatarSlotFns = /* @__PURE__ */ avatarSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, avatarDefaultVariants, getSlotCompoundVariant(avatarCompoundVariants, slotName))]);
var avatarFn = memo((props = {}) => {
  return Object.fromEntries(avatarSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var avatarVariantKeys = [
  "shape",
  "size",
  "status"
];
var getVariantProps = (variants) => ({ ...avatarDefaultVariants, ...compact(variants) });
var avatar = /* @__PURE__ */ Object.assign(avatarFn, {
  __recipe__: false,
  __name__: "avatar",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: avatarVariantKeys,
  variantMap: {
    "shape": [
      "circle",
      "square"
    ],
    "size": [
      "sm",
      "md",
      "lg",
      "xl",
      "xxl"
    ],
    "status": [
      "attention",
      "running"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, avatarVariantKeys);
  },
  getVariantProps
});

// styled-system/recipes/button.mjs
var buttonFn = /* @__PURE__ */ createRecipe("button", {
  "variant": "tonal",
  "size": "md"
}, []);
var buttonVariantMap = {
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
var buttonVariantKeys = Object.keys(buttonVariantMap);
var button = /* @__PURE__ */ Object.assign(memo(buttonFn.recipeFn), {
  __recipe__: true,
  __name__: "button",
  __getCompoundVariantCss__: buttonFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: buttonVariantKeys,
  variantMap: buttonVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, buttonVariantKeys);
  },
  getVariantProps: buttonFn.getVariantProps
});

// styled-system/recipes/card.mjs
var cardFn = /* @__PURE__ */ createRecipe("card", {
  "variant": "flat"
}, []);
var cardVariantMap = {
  "variant": [
    "flat",
    "lifted",
    "glass"
  ],
  "interactive": [
    "true"
  ]
};
var cardVariantKeys = Object.keys(cardVariantMap);
var card = /* @__PURE__ */ Object.assign(memo(cardFn.recipeFn), {
  __recipe__: true,
  __name__: "card",
  __getCompoundVariantCss__: cardFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: cardVariantKeys,
  variantMap: cardVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, cardVariantKeys);
  },
  getVariantProps: cardFn.getVariantProps
});

// styled-system/recipes/chip.mjs
var chipFn = /* @__PURE__ */ createRecipe("chip", {
  "variant": "filter",
  "tone": "neutral"
}, []);
var chipVariantMap = {
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
var chipVariantKeys = Object.keys(chipVariantMap);
var chip = /* @__PURE__ */ Object.assign(memo(chipFn.recipeFn), {
  __recipe__: true,
  __name__: "chip",
  __getCompoundVariantCss__: chipFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: chipVariantKeys,
  variantMap: chipVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, chipVariantKeys);
  },
  getVariantProps: chipFn.getVariantProps
});

// styled-system/recipes/row.mjs
var rowFn = /* @__PURE__ */ createRecipe("row", {
  "variant": "sidebar",
  "size": "md"
}, []);
var rowVariantMap = {
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
var rowVariantKeys = Object.keys(rowVariantMap);
var row = /* @__PURE__ */ Object.assign(memo(rowFn.recipeFn), {
  __recipe__: true,
  __name__: "row",
  __getCompoundVariantCss__: rowFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: rowVariantKeys,
  variantMap: rowVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, rowVariantKeys);
  },
  getVariantProps: rowFn.getVariantProps
});

// styled-system/recipes/tooltip.mjs
var tooltipFn = /* @__PURE__ */ createRecipe("tooltip", {
  "variant": "default"
}, []);
var tooltipVariantMap = {
  "variant": [
    "default",
    "path"
  ]
};
var tooltipVariantKeys = Object.keys(tooltipVariantMap);
var tooltip = /* @__PURE__ */ Object.assign(memo(tooltipFn.recipeFn), {
  __recipe__: true,
  __name__: "tooltip",
  __getCompoundVariantCss__: tooltipFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: tooltipVariantKeys,
  variantMap: tooltipVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, tooltipVariantKeys);
  },
  getVariantProps: tooltipFn.getVariantProps
});

// styled-system/recipes/inline-source.mjs
var inlineSourceFn = /* @__PURE__ */ createRecipe("inline-source", {}, []);
var inlineSourceVariantMap = {};
var inlineSourceVariantKeys = Object.keys(inlineSourceVariantMap);
var inlineSource = /* @__PURE__ */ Object.assign(memo(inlineSourceFn.recipeFn), {
  __recipe__: true,
  __name__: "inlineSource",
  __getCompoundVariantCss__: inlineSourceFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: inlineSourceVariantKeys,
  variantMap: inlineSourceVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, inlineSourceVariantKeys);
  },
  getVariantProps: inlineSourceFn.getVariantProps
});

// styled-system/recipes/control-skin.mjs
var controlSkinFn = /* @__PURE__ */ createRecipe("control-skin", {
  "kind": "danger"
}, []);
var controlSkinVariantMap = {
  "kind": [
    "danger",
    "glass"
  ]
};
var controlSkinVariantKeys = Object.keys(controlSkinVariantMap);
var controlSkin = /* @__PURE__ */ Object.assign(memo(controlSkinFn.recipeFn), {
  __recipe__: true,
  __name__: "controlSkin",
  __getCompoundVariantCss__: controlSkinFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: controlSkinVariantKeys,
  variantMap: controlSkinVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, controlSkinVariantKeys);
  },
  getVariantProps: controlSkinFn.getVariantProps
});

// styled-system/recipes/header-control.mjs
var headerControlFn = /* @__PURE__ */ createRecipe("header-control", {}, []);
var headerControlVariantMap = {
  "kind": [
    "link",
    "detailPopover",
    "linkPopover",
    "linkedWorkPopover",
    "linkedWorkTrigger",
    "smallPopover",
    "fileMenu",
    "fileDrawer",
    "agentCard",
    "fileDiffButton",
    "linkedWorkResize"
  ]
};
var headerControlVariantKeys = Object.keys(headerControlVariantMap);
var headerControl = /* @__PURE__ */ Object.assign(memo(headerControlFn.recipeFn), {
  __recipe__: true,
  __name__: "headerControl",
  __getCompoundVariantCss__: headerControlFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: headerControlVariantKeys,
  variantMap: headerControlVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, headerControlVariantKeys);
  },
  getVariantProps: headerControlFn.getVariantProps
});

// styled-system/recipes/approved-header.mjs
var approvedHeaderDefaultVariants = {};
var approvedHeaderCompoundVariants = [];
var approvedHeaderSlotNames = [
  [
    "root",
    "approved-header__root"
  ],
  [
    "probe",
    "approved-header__probe"
  ]
];
var approvedHeaderSlotFns = /* @__PURE__ */ approvedHeaderSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, approvedHeaderDefaultVariants, getSlotCompoundVariant(approvedHeaderCompoundVariants, slotName))]);
var approvedHeaderFn = memo((props = {}) => {
  return Object.fromEntries(approvedHeaderSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var approvedHeaderVariantKeys = [];
var getVariantProps2 = (variants) => ({ ...approvedHeaderDefaultVariants, ...compact(variants) });
var approvedHeader = /* @__PURE__ */ Object.assign(approvedHeaderFn, {
  __recipe__: false,
  __name__: "approvedHeader",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: approvedHeaderVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, approvedHeaderVariantKeys);
  },
  getVariantProps: getVariantProps2
});

// styled-system/recipes/chat-status.mjs
var chatStatusDefaultVariants = {
  "status": "rest",
  "display": "labeled"
};
var chatStatusCompoundVariants = [];
var chatStatusSlotNames = [
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
var chatStatusSlotFns = /* @__PURE__ */ chatStatusSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, chatStatusDefaultVariants, getSlotCompoundVariant(chatStatusCompoundVariants, slotName))]);
var chatStatusFn = memo((props = {}) => {
  return Object.fromEntries(chatStatusSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var chatStatusVariantKeys = [
  "status",
  "display"
];
var getVariantProps3 = (variants) => ({ ...chatStatusDefaultVariants, ...compact(variants) });
var chatStatus = /* @__PURE__ */ Object.assign(chatStatusFn, {
  __recipe__: false,
  __name__: "chatStatus",
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
    return splitProps(props, chatStatusVariantKeys);
  },
  getVariantProps: getVariantProps3
});

// styled-system/recipes/context-menu.mjs
var contextMenuDefaultVariants = {};
var contextMenuCompoundVariants = [];
var contextMenuSlotNames = [
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
var contextMenuSlotFns = /* @__PURE__ */ contextMenuSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, contextMenuDefaultVariants, getSlotCompoundVariant(contextMenuCompoundVariants, slotName))]);
var contextMenuFn = memo((props = {}) => {
  return Object.fromEntries(contextMenuSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var contextMenuVariantKeys = [
  "target"
];
var getVariantProps4 = (variants) => ({ ...contextMenuDefaultVariants, ...compact(variants) });
var contextMenu = /* @__PURE__ */ Object.assign(contextMenuFn, {
  __recipe__: false,
  __name__: "contextMenu",
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
    return splitProps(props, contextMenuVariantKeys);
  },
  getVariantProps: getVariantProps4
});

// styled-system/recipes/side-panel.mjs
var sidePanelDefaultVariants = {
  "side": "left"
};
var sidePanelCompoundVariants = [];
var sidePanelSlotNames = [
  [
    "root",
    "side-panel__root"
  ],
  [
    "handle",
    "side-panel__handle"
  ]
];
var sidePanelSlotFns = /* @__PURE__ */ sidePanelSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, sidePanelDefaultVariants, getSlotCompoundVariant(sidePanelCompoundVariants, slotName))]);
var sidePanelFn = memo((props = {}) => {
  return Object.fromEntries(sidePanelSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var sidePanelVariantKeys = [
  "side"
];
var getVariantProps5 = (variants) => ({ ...sidePanelDefaultVariants, ...compact(variants) });
var sidePanel = /* @__PURE__ */ Object.assign(sidePanelFn, {
  __recipe__: false,
  __name__: "sidePanel",
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
    return splitProps(props, sidePanelVariantKeys);
  },
  getVariantProps: getVariantProps5
});

// styled-system/recipes/sidebar-search.mjs
var sidebarSearchDefaultVariants = {
  "variant": "chat"
};
var sidebarSearchCompoundVariants = [];
var sidebarSearchSlotNames = [
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
var sidebarSearchSlotFns = /* @__PURE__ */ sidebarSearchSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, sidebarSearchDefaultVariants, getSlotCompoundVariant(sidebarSearchCompoundVariants, slotName))]);
var sidebarSearchFn = memo((props = {}) => {
  return Object.fromEntries(sidebarSearchSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var sidebarSearchVariantKeys = [
  "variant"
];
var getVariantProps6 = (variants) => ({ ...sidebarSearchDefaultVariants, ...compact(variants) });
var sidebarSearch = /* @__PURE__ */ Object.assign(sidebarSearchFn, {
  __recipe__: false,
  __name__: "sidebarSearch",
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
    return splitProps(props, sidebarSearchVariantKeys);
  },
  getVariantProps: getVariantProps6
});

// styled-system/recipes/user-account.mjs
var userAccountDefaultVariants = {
  "compact": false
};
var userAccountCompoundVariants = [];
var userAccountSlotNames = [
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
var userAccountSlotFns = /* @__PURE__ */ userAccountSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, userAccountDefaultVariants, getSlotCompoundVariant(userAccountCompoundVariants, slotName))]);
var userAccountFn = memo((props = {}) => {
  return Object.fromEntries(userAccountSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var userAccountVariantKeys = [
  "compact"
];
var getVariantProps7 = (variants) => ({ ...userAccountDefaultVariants, ...compact(variants) });
var userAccount = /* @__PURE__ */ Object.assign(userAccountFn, {
  __recipe__: false,
  __name__: "userAccount",
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
    return splitProps(props, userAccountVariantKeys);
  },
  getVariantProps: getVariantProps7
});

// styled-system/recipes/work-item-drawer.mjs
var workItemDrawerDefaultVariants = {
  "variant": "task"
};
var workItemDrawerCompoundVariants = [];
var workItemDrawerSlotNames = [
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
var workItemDrawerSlotFns = /* @__PURE__ */ workItemDrawerSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, workItemDrawerDefaultVariants, getSlotCompoundVariant(workItemDrawerCompoundVariants, slotName))]);
var workItemDrawerFn = memo((props = {}) => {
  return Object.fromEntries(workItemDrawerSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var workItemDrawerVariantKeys = [
  "variant"
];
var getVariantProps8 = (variants) => ({ ...workItemDrawerDefaultVariants, ...compact(variants) });
var workItemDrawer = /* @__PURE__ */ Object.assign(workItemDrawerFn, {
  __recipe__: false,
  __name__: "workItemDrawer",
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
    return splitProps(props, workItemDrawerVariantKeys);
  },
  getVariantProps: getVariantProps8
});

// styled-system/recipes/notification.mjs
var notificationDefaultVariants = {};
var notificationCompoundVariants = [];
var notificationSlotNames = [
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
var notificationSlotFns = /* @__PURE__ */ notificationSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, notificationDefaultVariants, getSlotCompoundVariant(notificationCompoundVariants, slotName))]);
var notificationFn = memo((props = {}) => {
  return Object.fromEntries(notificationSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var notificationVariantKeys = [
  "kind"
];
var getVariantProps9 = (variants) => ({ ...notificationDefaultVariants, ...compact(variants) });
var notification = /* @__PURE__ */ Object.assign(notificationFn, {
  __recipe__: false,
  __name__: "notification",
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
    return splitProps(props, notificationVariantKeys);
  },
  getVariantProps: getVariantProps9
});

// styled-system/recipes/conversation-welcome.mjs
var conversationWelcomeDefaultVariants = {};
var conversationWelcomeCompoundVariants = [];
var conversationWelcomeSlotNames = [
  [
    "root",
    "conversation-welcome__root"
  ],
  [
    "wordmark",
    "conversation-welcome__wordmark"
  ],
  [
    "title",
    "conversation-welcome__title"
  ],
  [
    "description",
    "conversation-welcome__description"
  ]
];
var conversationWelcomeSlotFns = /* @__PURE__ */ conversationWelcomeSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, conversationWelcomeDefaultVariants, getSlotCompoundVariant(conversationWelcomeCompoundVariants, slotName))]);
var conversationWelcomeFn = memo((props = {}) => {
  return Object.fromEntries(conversationWelcomeSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var conversationWelcomeVariantKeys = [];
var getVariantProps10 = (variants) => ({ ...conversationWelcomeDefaultVariants, ...compact(variants) });
var conversationWelcome = /* @__PURE__ */ Object.assign(conversationWelcomeFn, {
  __recipe__: false,
  __name__: "conversationWelcome",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: conversationWelcomeVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, conversationWelcomeVariantKeys);
  },
  getVariantProps: getVariantProps10
});

// styled-system/recipes/agent-message.mjs
var agentMessageDefaultVariants = {};
var agentMessageCompoundVariants = [];
var agentMessageSlotNames = [
  [
    "root",
    "agent-message__root"
  ],
  [
    "avatar",
    "agent-message__avatar"
  ],
  [
    "byline",
    "agent-message__byline"
  ],
  [
    "name",
    "agent-message__name"
  ],
  [
    "content",
    "agent-message__content"
  ]
];
var agentMessageSlotFns = /* @__PURE__ */ agentMessageSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, agentMessageDefaultVariants, getSlotCompoundVariant(agentMessageCompoundVariants, slotName))]);
var agentMessageFn = memo((props = {}) => {
  return Object.fromEntries(agentMessageSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var agentMessageVariantKeys = [];
var getVariantProps11 = (variants) => ({ ...agentMessageDefaultVariants, ...compact(variants) });
var agentMessage = /* @__PURE__ */ Object.assign(agentMessageFn, {
  __recipe__: false,
  __name__: "agentMessage",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: agentMessageVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, agentMessageVariantKeys);
  },
  getVariantProps: getVariantProps11
});

// styled-system/recipes/overlay.mjs
var overlayDefaultVariants = {
  "placement": "dialog"
};
var overlayCompoundVariants = [];
var overlaySlotNames = [
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
var overlaySlotFns = /* @__PURE__ */ overlaySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, overlayDefaultVariants, getSlotCompoundVariant(overlayCompoundVariants, slotName))]);
var overlayFn = memo((props = {}) => {
  return Object.fromEntries(overlaySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var overlayVariantKeys = [
  "placement"
];
var getVariantProps12 = (variants) => ({ ...overlayDefaultVariants, ...compact(variants) });
var overlay = /* @__PURE__ */ Object.assign(overlayFn, {
  __recipe__: false,
  __name__: "overlay",
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
    return splitProps(props, overlayVariantKeys);
  },
  getVariantProps: getVariantProps12
});

// styled-system/recipes/disclosure.mjs
var disclosureDefaultVariants = {};
var disclosureCompoundVariants = [];
var disclosureSlotNames = [
  [
    "root",
    "disclosure__root"
  ],
  [
    "heading",
    "disclosure__heading"
  ],
  [
    "trigger",
    "disclosure__trigger"
  ],
  [
    "chevron",
    "disclosure__chevron"
  ],
  [
    "panel",
    "disclosure__panel"
  ],
  [
    "content",
    "disclosure__content"
  ]
];
var disclosureSlotFns = /* @__PURE__ */ disclosureSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, disclosureDefaultVariants, getSlotCompoundVariant(disclosureCompoundVariants, slotName))]);
var disclosureFn = memo((props = {}) => {
  return Object.fromEntries(disclosureSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var disclosureVariantKeys = [];
var getVariantProps13 = (variants) => ({ ...disclosureDefaultVariants, ...compact(variants) });
var disclosure = /* @__PURE__ */ Object.assign(disclosureFn, {
  __recipe__: false,
  __name__: "disclosure",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: disclosureVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, disclosureVariantKeys);
  },
  getVariantProps: getVariantProps13
});

// styled-system/recipes/identity.mjs
var identityDefaultVariants = {
  "variant": "card"
};
var identityCompoundVariants = [];
var identitySlotNames = [
  [
    "root",
    "identity__root"
  ],
  [
    "text",
    "identity__text"
  ],
  [
    "name",
    "identity__name"
  ],
  [
    "description",
    "identity__description"
  ],
  [
    "actions",
    "identity__actions"
  ]
];
var identitySlotFns = /* @__PURE__ */ identitySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, identityDefaultVariants, getSlotCompoundVariant(identityCompoundVariants, slotName))]);
var identityFn = memo((props = {}) => {
  return Object.fromEntries(identitySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var identityVariantKeys = [
  "variant"
];
var getVariantProps14 = (variants) => ({ ...identityDefaultVariants, ...compact(variants) });
var identity = /* @__PURE__ */ Object.assign(identityFn, {
  __recipe__: false,
  __name__: "identity",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: identityVariantKeys,
  variantMap: {
    "variant": [
      "chip",
      "card"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, identityVariantKeys);
  },
  getVariantProps: getVariantProps14
});

// styled-system/recipes/field.mjs
var fieldDefaultVariants = {
  "variant": "text"
};
var fieldCompoundVariants = [];
var fieldSlotNames = [
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
var fieldSlotFns = /* @__PURE__ */ fieldSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, fieldDefaultVariants, getSlotCompoundVariant(fieldCompoundVariants, slotName))]);
var fieldFn = memo((props = {}) => {
  return Object.fromEntries(fieldSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var fieldVariantKeys = [
  "variant"
];
var getVariantProps15 = (variants) => ({ ...fieldDefaultVariants, ...compact(variants) });
var field = /* @__PURE__ */ Object.assign(fieldFn, {
  __recipe__: false,
  __name__: "field",
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
    return splitProps(props, fieldVariantKeys);
  },
  getVariantProps: getVariantProps15
});

// styled-system/recipes/menu.mjs
var menuDefaultVariants = {};
var menuCompoundVariants = [];
var menuSlotNames = [
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
var menuSlotFns = /* @__PURE__ */ menuSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, menuDefaultVariants, getSlotCompoundVariant(menuCompoundVariants, slotName))]);
var menuFn = memo((props = {}) => {
  return Object.fromEntries(menuSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var menuVariantKeys = [
  "layout"
];
var getVariantProps16 = (variants) => ({ ...menuDefaultVariants, ...compact(variants) });
var menu = /* @__PURE__ */ Object.assign(menuFn, {
  __recipe__: false,
  __name__: "menu",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: menuVariantKeys,
  variantMap: {
    "layout": [
      "action"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, menuVariantKeys);
  },
  getVariantProps: getVariantProps16
});

// styled-system/recipes/scroll.mjs
var scrollDefaultVariants = {};
var scrollCompoundVariants = [];
var scrollSlotNames = [
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
var scrollSlotFns = /* @__PURE__ */ scrollSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, scrollDefaultVariants, getSlotCompoundVariant(scrollCompoundVariants, slotName))]);
var scrollFn = memo((props = {}) => {
  return Object.fromEntries(scrollSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var scrollVariantKeys = [];
var getVariantProps17 = (variants) => ({ ...scrollDefaultVariants, ...compact(variants) });
var scroll = /* @__PURE__ */ Object.assign(scrollFn, {
  __recipe__: false,
  __name__: "scroll",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: scrollVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, scrollVariantKeys);
  },
  getVariantProps: getVariantProps17
});

// styled-system/recipes/activity.mjs
var activityDefaultVariants = {
  "summary": false,
  "anchored": false
};
var activityCompoundVariants = [];
var activitySlotNames = [
  [
    "root",
    "activity__root"
  ],
  [
    "agentName",
    "activity__agentName"
  ],
  [
    "summary",
    "activity__summary"
  ],
  [
    "summaryChevron",
    "activity__summaryChevron"
  ],
  [
    "chain",
    "activity__chain"
  ],
  [
    "step",
    "activity__step"
  ],
  [
    "stepBody",
    "activity__stepBody"
  ],
  [
    "stepTrigger",
    "activity__stepTrigger"
  ],
  [
    "stepAnchor",
    "activity__stepAnchor"
  ],
  [
    "stepLabel",
    "activity__stepLabel"
  ],
  [
    "stepStatus",
    "activity__stepStatus"
  ],
  [
    "stepChevron",
    "activity__stepChevron"
  ],
  [
    "detailText",
    "activity__detailText"
  ],
  [
    "detailCode",
    "activity__detailCode"
  ],
  [
    "detailEmbed",
    "activity__detailEmbed"
  ]
];
var activitySlotFns = /* @__PURE__ */ activitySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, activityDefaultVariants, getSlotCompoundVariant(activityCompoundVariants, slotName))]);
var activityFn = memo((props = {}) => {
  return Object.fromEntries(activitySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var activityVariantKeys = [
  "speaker",
  "summary",
  "anchored"
];
var getVariantProps18 = (variants) => ({ ...activityDefaultVariants, ...compact(variants) });
var activity = /* @__PURE__ */ Object.assign(activityFn, {
  __recipe__: false,
  __name__: "activity",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: activityVariantKeys,
  variantMap: {
    "speaker": [
      "neutral",
      "sage",
      "ready"
    ],
    "summary": [
      "true",
      "false"
    ],
    "anchored": [
      "true",
      "false"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, activityVariantKeys);
  },
  getVariantProps: getVariantProps18
});

// styled-system/recipes/conversation-message.mjs
var conversationMessageDefaultVariants = {
  "speaker": "sage",
  "arrival": "phrase"
};
var conversationMessageCompoundVariants = [];
var conversationMessageSlotNames = [
  [
    "root",
    "conversation-message__root"
  ],
  [
    "turn",
    "conversation-message__turn"
  ],
  [
    "name",
    "conversation-message__name"
  ],
  [
    "avatarTurn",
    "conversation-message__avatarTurn"
  ],
  [
    "avatar",
    "conversation-message__avatar"
  ],
  [
    "body",
    "conversation-message__body"
  ],
  [
    "prose",
    "conversation-message__prose"
  ],
  [
    "phrase",
    "conversation-message__phrase"
  ],
  [
    "actions",
    "conversation-message__actions"
  ]
];
var conversationMessageSlotFns = /* @__PURE__ */ conversationMessageSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, conversationMessageDefaultVariants, getSlotCompoundVariant(conversationMessageCompoundVariants, slotName))]);
var conversationMessageFn = memo((props = {}) => {
  return Object.fromEntries(conversationMessageSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var conversationMessageVariantKeys = [
  "speaker",
  "arrival"
];
var getVariantProps19 = (variants) => ({ ...conversationMessageDefaultVariants, ...compact(variants) });
var conversationMessage = /* @__PURE__ */ Object.assign(conversationMessageFn, {
  __recipe__: false,
  __name__: "conversationMessage",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: conversationMessageVariantKeys,
  variantMap: {
    "speaker": [
      "sage",
      "ready"
    ],
    "arrival": [
      "phrase",
      "paragraph",
      "none"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, conversationMessageVariantKeys);
  },
  getVariantProps: getVariantProps19
});

// styled-system/recipes/user-message.mjs
var userMessageDefaultVariants = {};
var userMessageCompoundVariants = [];
var userMessageSlotNames = [
  [
    "root",
    "user-message__root"
  ],
  [
    "bubble",
    "user-message__bubble"
  ],
  [
    "text",
    "user-message__text"
  ],
  [
    "editor",
    "user-message__editor"
  ],
  [
    "editRow",
    "user-message__editRow"
  ],
  [
    "submit",
    "user-message__submit"
  ],
  [
    "actions",
    "user-message__actions"
  ]
];
var userMessageSlotFns = /* @__PURE__ */ userMessageSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, userMessageDefaultVariants, getSlotCompoundVariant(userMessageCompoundVariants, slotName))]);
var userMessageFn = memo((props = {}) => {
  return Object.fromEntries(userMessageSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var userMessageVariantKeys = [];
var getVariantProps20 = (variants) => ({ ...userMessageDefaultVariants, ...compact(variants) });
var userMessage = /* @__PURE__ */ Object.assign(userMessageFn, {
  __recipe__: false,
  __name__: "userMessage",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: userMessageVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, userMessageVariantKeys);
  },
  getVariantProps: getVariantProps20
});

// styled-system/recipes/artifact-preview.mjs
var artifactPreviewDefaultVariants = {};
var artifactPreviewCompoundVariants = [];
var artifactPreviewSlotNames = [
  [
    "root",
    "artifact-preview__root"
  ],
  [
    "trigger",
    "artifact-preview__trigger"
  ],
  [
    "triggerChevron",
    "artifact-preview__triggerChevron"
  ],
  [
    "card",
    "artifact-preview__card"
  ],
  [
    "strip",
    "artifact-preview__strip"
  ],
  [
    "name",
    "artifact-preview__name"
  ],
  [
    "nameText",
    "artifact-preview__nameText"
  ],
  [
    "title",
    "artifact-preview__title"
  ],
  [
    "meta",
    "artifact-preview__meta"
  ],
  [
    "actions",
    "artifact-preview__actions"
  ],
  [
    "body",
    "artifact-preview__body"
  ],
  [
    "excerpt",
    "artifact-preview__excerpt"
  ],
  [
    "generating",
    "artifact-preview__generating"
  ],
  [
    "notice",
    "artifact-preview__notice"
  ]
];
var artifactPreviewSlotFns = /* @__PURE__ */ artifactPreviewSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, artifactPreviewDefaultVariants, getSlotCompoundVariant(artifactPreviewCompoundVariants, slotName))]);
var artifactPreviewFn = memo((props = {}) => {
  return Object.fromEntries(artifactPreviewSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var artifactPreviewVariantKeys = [];
var getVariantProps21 = (variants) => ({ ...artifactPreviewDefaultVariants, ...compact(variants) });
var artifactPreview = /* @__PURE__ */ Object.assign(artifactPreviewFn, {
  __recipe__: false,
  __name__: "artifactPreview",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: artifactPreviewVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, artifactPreviewVariantKeys);
  },
  getVariantProps: getVariantProps21
});

// styled-system/recipes/artifact-workspace.mjs
var artifactWorkspaceDefaultVariants = {
  "placement": "inline",
  "frame": "overlay"
};
var artifactWorkspaceCompoundVariants = [];
var artifactWorkspaceSlotNames = [
  [
    "root",
    "artifact-workspace__root"
  ],
  [
    "layout",
    "artifact-workspace__layout"
  ],
  [
    "tools",
    "artifact-workspace__tools"
  ],
  [
    "toolbar",
    "artifact-workspace__toolbar"
  ],
  [
    "toolButton",
    "artifact-workspace__toolButton"
  ],
  [
    "card",
    "artifact-workspace__card"
  ],
  [
    "strip",
    "artifact-workspace__strip"
  ],
  [
    "coordinate",
    "artifact-workspace__coordinate"
  ],
  [
    "coordinateName",
    "artifact-workspace__coordinateName"
  ],
  [
    "meta",
    "artifact-workspace__meta"
  ],
  [
    "actions",
    "artifact-workspace__actions"
  ],
  [
    "body",
    "artifact-workspace__body"
  ],
  [
    "document",
    "artifact-workspace__document"
  ],
  [
    "editor",
    "artifact-workspace__editor"
  ],
  [
    "suggestion",
    "artifact-workspace__suggestion"
  ],
  [
    "panel",
    "artifact-workspace__panel"
  ]
];
var artifactWorkspaceSlotFns = /* @__PURE__ */ artifactWorkspaceSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, artifactWorkspaceDefaultVariants, getSlotCompoundVariant(artifactWorkspaceCompoundVariants, slotName))]);
var artifactWorkspaceFn = memo((props = {}) => {
  return Object.fromEntries(artifactWorkspaceSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var artifactWorkspaceVariantKeys = [
  "placement",
  "frame"
];
var getVariantProps22 = (variants) => ({ ...artifactWorkspaceDefaultVariants, ...compact(variants) });
var artifactWorkspace = /* @__PURE__ */ Object.assign(artifactWorkspaceFn, {
  __recipe__: false,
  __name__: "artifactWorkspace",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: artifactWorkspaceVariantKeys,
  variantMap: {
    "placement": [
      "inline",
      "panel"
    ],
    "frame": [
      "overlay",
      "slot"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, artifactWorkspaceVariantKeys);
  },
  getVariantProps: getVariantProps22
});

// styled-system/recipes/alert.mjs
var alertDefaultVariants = {
  "tone": "none",
  "material": "tonal",
  "edge": "system",
  "glow": true
};
var alertCompoundVariants = [
  {
    "material": "glass",
    "tone": [
      "progress",
      "accent",
      "ready",
      "danger",
      "sage"
    ],
    "css": {
      "root": {
        "background": "linear-gradient(125deg, var(--nc-alert-tint), transparent 72%), var(--nc-glass-bg)",
        "borderColor": "var(--nc-alert-line)",
        "boxShadow": "0 18px 44px var(--nc-glass-shadow), 0 0 18px var(--nc-alert-glow)"
      }
    }
  },
  {
    "material": "glass",
    "edge": "system",
    "css": {
      "root": {
        "borderColor": "var(--il-edge)"
      }
    }
  }
];
var alertSlotNames = [
  [
    "stage",
    "alert__stage"
  ],
  [
    "root",
    "alert__root"
  ],
  [
    "head",
    "alert__head"
  ],
  [
    "icon",
    "alert__icon"
  ],
  [
    "title",
    "alert__title"
  ],
  [
    "kicker",
    "alert__kicker"
  ],
  [
    "pager",
    "alert__pager"
  ],
  [
    "body",
    "alert__body"
  ],
  [
    "lede",
    "alert__lede"
  ],
  [
    "command",
    "alert__command"
  ],
  [
    "actions",
    "alert__actions"
  ],
  [
    "choices",
    "alert__choices"
  ]
];
var alertSlotFns = /* @__PURE__ */ alertSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, alertDefaultVariants, getSlotCompoundVariant(alertCompoundVariants, slotName))]);
var alertFn = memo((props = {}) => {
  return Object.fromEntries(alertSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var alertVariantKeys = [
  "tone",
  "material",
  "edge",
  "glow"
];
var getVariantProps23 = (variants) => ({ ...alertDefaultVariants, ...compact(variants) });
var alert = /* @__PURE__ */ Object.assign(alertFn, {
  __recipe__: false,
  __name__: "alert",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: alertVariantKeys,
  variantMap: {
    "tone": [
      "progress",
      "accent",
      "ready",
      "danger",
      "sage",
      "none"
    ],
    "material": [
      "tonal",
      "glass"
    ],
    "edge": [
      "system",
      "tone"
    ],
    "glow": [
      "true",
      "false"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, alertVariantKeys);
  },
  getVariantProps: getVariantProps23
});

// styled-system/recipes/file-card.mjs
var fileCardDefaultVariants = {};
var fileCardCompoundVariants = [];
var fileCardSlotNames = [
  [
    "root",
    "file-card__root"
  ],
  [
    "open",
    "file-card__open"
  ],
  [
    "symbol",
    "file-card__symbol"
  ],
  [
    "label",
    "file-card__label"
  ],
  [
    "name",
    "file-card__name"
  ],
  [
    "detail",
    "file-card__detail"
  ]
];
var fileCardSlotFns = /* @__PURE__ */ fileCardSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, fileCardDefaultVariants, getSlotCompoundVariant(fileCardCompoundVariants, slotName))]);
var fileCardFn = memo((props = {}) => {
  return Object.fromEntries(fileCardSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var fileCardVariantKeys = [];
var getVariantProps24 = (variants) => ({ ...fileCardDefaultVariants, ...compact(variants) });
var fileCard = /* @__PURE__ */ Object.assign(fileCardFn, {
  __recipe__: false,
  __name__: "fileCard",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: fileCardVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, fileCardVariantKeys);
  },
  getVariantProps: getVariantProps24
});

// styled-system/recipes/error-message.mjs
var errorMessageDefaultVariants = {};
var errorMessageCompoundVariants = [];
var errorMessageSlotNames = [
  [
    "root",
    "error-message__root"
  ],
  [
    "open",
    "error-message__open"
  ],
  [
    "symbol",
    "error-message__symbol"
  ],
  [
    "label",
    "error-message__label"
  ],
  [
    "name",
    "error-message__name"
  ],
  [
    "detail",
    "error-message__detail"
  ]
];
var errorMessageSlotFns = /* @__PURE__ */ errorMessageSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, errorMessageDefaultVariants, getSlotCompoundVariant(errorMessageCompoundVariants, slotName))]);
var errorMessageFn = memo((props = {}) => {
  return Object.fromEntries(errorMessageSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var errorMessageVariantKeys = [];
var getVariantProps25 = (variants) => ({ ...errorMessageDefaultVariants, ...compact(variants) });
var errorMessage = /* @__PURE__ */ Object.assign(errorMessageFn, {
  __recipe__: false,
  __name__: "errorMessage",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: errorMessageVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, errorMessageVariantKeys);
  },
  getVariantProps: getVariantProps25
});

// styled-system/recipes/recovery.mjs
var recoveryDefaultVariants = {};
var recoveryCompoundVariants = [];
var recoverySlotNames = [
  [
    "unread",
    "recovery__unread"
  ],
  [
    "error",
    "recovery__error"
  ],
  [
    "errorText",
    "recovery__errorText"
  ],
  [
    "navigation",
    "recovery__navigation"
  ],
  [
    "jump",
    "recovery__jump"
  ]
];
var recoverySlotFns = /* @__PURE__ */ recoverySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, recoveryDefaultVariants, getSlotCompoundVariant(recoveryCompoundVariants, slotName))]);
var recoveryFn = memo((props = {}) => {
  return Object.fromEntries(recoverySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var recoveryVariantKeys = [];
var getVariantProps26 = (variants) => ({ ...recoveryDefaultVariants, ...compact(variants) });
var recovery = /* @__PURE__ */ Object.assign(recoveryFn, {
  __recipe__: false,
  __name__: "recovery",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: recoveryVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, recoveryVariantKeys);
  },
  getVariantProps: getVariantProps26
});

// styled-system/recipes/overview-card.mjs
var overviewCardDefaultVariants = {
  "variant": "chat"
};
var overviewCardCompoundVariants = [];
var overviewCardSlotNames = [
  [
    "root",
    "overview-card__root"
  ],
  [
    "surface",
    "overview-card__surface"
  ]
];
var overviewCardSlotFns = /* @__PURE__ */ overviewCardSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, overviewCardDefaultVariants, getSlotCompoundVariant(overviewCardCompoundVariants, slotName))]);
var overviewCardFn = memo((props = {}) => {
  return Object.fromEntries(overviewCardSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var overviewCardVariantKeys = [
  "variant"
];
var getVariantProps27 = (variants) => ({ ...overviewCardDefaultVariants, ...compact(variants) });
var overviewCard = /* @__PURE__ */ Object.assign(overviewCardFn, {
  __recipe__: false,
  __name__: "overviewCard",
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
    return splitProps(props, overviewCardVariantKeys);
  },
  getVariantProps: getVariantProps27
});

// styled-system/recipes/conversation-header.mjs
var conversationHeaderDefaultVariants = {
  "width": "full"
};
var conversationHeaderCompoundVariants = [];
var conversationHeaderSlotNames = [
  [
    "canvas",
    "conversation-header__canvas"
  ],
  [
    "card",
    "conversation-header__card"
  ],
  [
    "surface",
    "conversation-header__surface"
  ],
  [
    "glass",
    "conversation-header__glass"
  ],
  [
    "trigger",
    "conversation-header__trigger"
  ],
  [
    "copy",
    "conversation-header__copy"
  ],
  [
    "titleMeasure",
    "conversation-header__titleMeasure"
  ],
  [
    "ellipsisMeasure",
    "conversation-header__ellipsisMeasure"
  ],
  [
    "titleFrame",
    "conversation-header__titleFrame"
  ],
  [
    "titleText",
    "conversation-header__titleText"
  ],
  [
    "titleWord",
    "conversation-header__titleWord"
  ],
  [
    "titleChar",
    "conversation-header__titleChar"
  ],
  [
    "titleEllipsis",
    "conversation-header__titleEllipsis"
  ],
  [
    "subtitleRow",
    "conversation-header__subtitleRow"
  ],
  [
    "chatId",
    "conversation-header__chatId"
  ],
  [
    "participantField",
    "conversation-header__participantField"
  ],
  [
    "agent",
    "conversation-header__agent"
  ],
  [
    "avatarButton",
    "conversation-header__avatarButton"
  ],
  [
    "contextRing",
    "conversation-header__contextRing"
  ],
  [
    "contextTrack",
    "conversation-header__contextTrack"
  ],
  [
    "contextDecoration",
    "conversation-header__contextDecoration"
  ],
  [
    "expandedDecoration",
    "conversation-header__expandedDecoration"
  ],
  [
    "statusBadge",
    "conversation-header__statusBadge"
  ],
  [
    "agentName",
    "conversation-header__agentName"
  ]
];
var conversationHeaderSlotFns = /* @__PURE__ */ conversationHeaderSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, conversationHeaderDefaultVariants, getSlotCompoundVariant(conversationHeaderCompoundVariants, slotName))]);
var conversationHeaderFn = memo((props = {}) => {
  return Object.fromEntries(conversationHeaderSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var conversationHeaderVariantKeys = [
  "width",
  "material"
];
var getVariantProps28 = (variants) => ({ ...conversationHeaderDefaultVariants, ...compact(variants) });
var conversationHeader = /* @__PURE__ */ Object.assign(conversationHeaderFn, {
  __recipe__: false,
  __name__: "conversationHeader",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: conversationHeaderVariantKeys,
  variantMap: {
    "width": [
      "full",
      "constrained"
    ],
    "material": [
      "chathead"
    ]
  },
  splitVariantProps(props) {
    return splitProps(props, conversationHeaderVariantKeys);
  },
  getVariantProps: getVariantProps28
});

// styled-system/recipes/agent-detail.mjs
var agentDetailDefaultVariants = {};
var agentDetailCompoundVariants = [];
var agentDetailSlotNames = [
  [
    "root",
    "agent-detail__root"
  ],
  [
    "agentPlane",
    "agent-detail__agentPlane"
  ],
  [
    "identity",
    "agent-detail__identity"
  ],
  [
    "avatar",
    "agent-detail__avatar"
  ],
  [
    "identityText",
    "agent-detail__identityText"
  ],
  [
    "name",
    "agent-detail__name"
  ],
  [
    "subtitle",
    "agent-detail__subtitle"
  ],
  [
    "harness",
    "agent-detail__harness"
  ],
  [
    "surface",
    "agent-detail__surface"
  ],
  [
    "statusControls",
    "agent-detail__statusControls"
  ],
  [
    "status",
    "agent-detail__status"
  ],
  [
    "sessionPlane",
    "agent-detail__sessionPlane"
  ],
  [
    "sessionRow",
    "agent-detail__sessionRow"
  ],
  [
    "sessionId",
    "agent-detail__sessionId"
  ],
  [
    "context",
    "agent-detail__context"
  ],
  [
    "contextLabel",
    "agent-detail__contextLabel"
  ],
  [
    "contextUnknown",
    "agent-detail__contextUnknown"
  ],
  [
    "selectors",
    "agent-detail__selectors"
  ],
  [
    "work",
    "agent-detail__work"
  ],
  [
    "workGroup",
    "agent-detail__workGroup"
  ],
  [
    "workTrigger",
    "agent-detail__workTrigger"
  ],
  [
    "workSummary",
    "agent-detail__workSummary"
  ],
  [
    "workChevron",
    "agent-detail__workChevron"
  ],
  [
    "workContent",
    "agent-detail__workContent"
  ],
  [
    "liveItem",
    "agent-detail__liveItem"
  ],
  [
    "itemName",
    "agent-detail__itemName"
  ],
  [
    "trailing",
    "agent-detail__trailing"
  ],
  [
    "dim",
    "agent-detail__dim"
  ],
  [
    "detailBody",
    "agent-detail__detailBody"
  ],
  [
    "permissionOptions",
    "agent-detail__permissionOptions"
  ],
  [
    "files",
    "agent-detail__files"
  ]
];
var agentDetailSlotFns = /* @__PURE__ */ agentDetailSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, agentDetailDefaultVariants, getSlotCompoundVariant(agentDetailCompoundVariants, slotName))]);
var agentDetailFn = memo((props = {}) => {
  return Object.fromEntries(agentDetailSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var agentDetailVariantKeys = [];
var getVariantProps29 = (variants) => ({ ...agentDetailDefaultVariants, ...compact(variants) });
var agentDetail = /* @__PURE__ */ Object.assign(agentDetailFn, {
  __recipe__: false,
  __name__: "agentDetail",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: agentDetailVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, agentDetailVariantKeys);
  },
  getVariantProps: getVariantProps29
});

// styled-system/recipes/linked-work.mjs
var linkedWorkDefaultVariants = {};
var linkedWorkCompoundVariants = [];
var linkedWorkSlotNames = [
  [
    "links",
    "linked-work__links"
  ],
  [
    "triggerLabel",
    "linked-work__triggerLabel"
  ],
  [
    "divider",
    "linked-work__divider"
  ]
];
var linkedWorkSlotFns = /* @__PURE__ */ linkedWorkSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, linkedWorkDefaultVariants, getSlotCompoundVariant(linkedWorkCompoundVariants, slotName))]);
var linkedWorkFn = memo((props = {}) => {
  return Object.fromEntries(linkedWorkSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var linkedWorkVariantKeys = [];
var getVariantProps30 = (variants) => ({ ...linkedWorkDefaultVariants, ...compact(variants) });
var linkedWork = /* @__PURE__ */ Object.assign(linkedWorkFn, {
  __recipe__: false,
  __name__: "linkedWork",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: linkedWorkVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, linkedWorkVariantKeys);
  },
  getVariantProps: getVariantProps30
});

// styled-system/recipes/working-files.mjs
var workingFilesDefaultVariants = {};
var workingFilesCompoundVariants = [];
var workingFilesSlotNames = [
  [
    "root",
    "working-files__root"
  ],
  [
    "heading",
    "working-files__heading"
  ],
  [
    "list",
    "working-files__list"
  ],
  [
    "file",
    "working-files__file"
  ],
  [
    "row",
    "working-files__row"
  ],
  [
    "open",
    "working-files__open"
  ],
  [
    "disclosure",
    "working-files__disclosure"
  ],
  [
    "space",
    "working-files__space"
  ],
  [
    "diff",
    "working-files__diff"
  ],
  [
    "detail",
    "working-files__detail"
  ],
  [
    "menuLabel",
    "working-files__menuLabel"
  ],
  [
    "drawerBody",
    "working-files__drawerBody"
  ],
  [
    "fileTitle",
    "working-files__fileTitle"
  ],
  [
    "filePath",
    "working-files__filePath"
  ],
  [
    "fileCode",
    "working-files__fileCode"
  ],
  [
    "diffLine",
    "working-files__diffLine"
  ],
  [
    "moveForm",
    "working-files__moveForm"
  ]
];
var workingFilesSlotFns = /* @__PURE__ */ workingFilesSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, workingFilesDefaultVariants, getSlotCompoundVariant(workingFilesCompoundVariants, slotName))]);
var workingFilesFn = memo((props = {}) => {
  return Object.fromEntries(workingFilesSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]));
});
var workingFilesVariantKeys = [];
var getVariantProps31 = (variants) => ({ ...workingFilesDefaultVariants, ...compact(variants) });
var workingFiles = /* @__PURE__ */ Object.assign(workingFilesFn, {
  __recipe__: false,
  __name__: "workingFiles",
  raw: (props) => props,
  classNameMap: {},
  variantKeys: workingFilesVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, workingFilesVariantKeys);
  },
  getVariantProps: getVariantProps31
});

// src/components.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var cx2 = (...xs) => xs.filter(Boolean).join(" ");
var Button = forwardRef(
  function Button2({
    variant = "tonal",
    size = "md",
    danger,
    loading,
    leadingIcon,
    children,
    className,
    disabled,
    forcedState,
    ...props
  }, ref) {
    return /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        ...props,
        ref,
        className: cx2(button({ variant, size, danger }), className),
        disabled: disabled || loading,
        "aria-busy": loading || void 0,
        "data-force-state": forcedState,
        children: [
          leadingIcon,
          children
        ]
      }
    );
  }
);
var IconButton = forwardRef(
  function IconButton2({ label, icon, style, tooltip: tooltip2 = true, ...props }, ref) {
    const button2 = /* @__PURE__ */ jsx2(
      Button,
      {
        ...props,
        ref,
        "aria-label": label,
        style: { width: 34, padding: 0, ...style },
        children: icon
      }
    );
    return tooltip2 ? /* @__PURE__ */ jsx2(Tooltip, { label, children: button2 }) : button2;
  }
);
var Card = forwardRef(function Card2({ variant = "flat", interactive = false, className, onKeyDown, ...props }, ref) {
  return /* @__PURE__ */ jsx2(
    "div",
    {
      ...props,
      ref,
      className: cx2(card({ variant, interactive }), className),
      role: interactive ? "button" : props.role,
      tabIndex: interactive ? 0 : props.tabIndex,
      onKeyDown: (e) => {
        onKeyDown?.(e);
        if (interactive && !e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }
    }
  );
});
var Input = forwardRef(function Input2({
  variant = "text",
  leadingIcon,
  label,
  description,
  invalid,
  onClear,
  forcedState,
  wrapperClassName,
  className,
  id,
  ...props
}, ref) {
  const uid = useId(), inputId = id || uid, styles = field({ variant });
  const described = [props["aria-describedby"], description ? `${inputId}-description` : null].filter(Boolean).join(" ") || void 0;
  return /* @__PURE__ */ jsxs("div", { className: wrapperClassName, children: [
    label && /* @__PURE__ */ jsx2("label", { className: styles.label, htmlFor: inputId, children: label }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: styles.root,
        "data-invalid": invalid,
        "data-disabled": props.disabled,
        "data-force-state": forcedState,
        children: [
          (leadingIcon || variant === "search") && /* @__PURE__ */ jsx2("span", { className: styles.icon, children: leadingIcon || /* @__PURE__ */ jsx2(Search, { size: 16, "aria-hidden": true }) }),
          /* @__PURE__ */ jsx2(
            "input",
            {
              ...props,
              ref,
              id: inputId,
              type: props.type || (variant === "search" ? "search" : "text"),
              "data-custom-clear": onClear ? "" : void 0,
              className: cx2(styles.control, className),
              "aria-invalid": invalid || props["aria-invalid"],
              "aria-describedby": described
            }
          ),
          onClear && !!props.value && /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              className: styles.clear,
              "aria-label": "Clear search",
              onClick: onClear,
              disabled: props.disabled,
              children: /* @__PURE__ */ jsx2(X, { size: 14 })
            }
          )
        ]
      }
    ),
    description && /* @__PURE__ */ jsx2("div", { id: `${inputId}-description`, className: styles.description, children: description })
  ] });
});
var TextArea = forwardRef(
  function TextArea2({
    label,
    description,
    invalid,
    className,
    wrapperClassName,
    id,
    forcedState,
    ...props
  }, ref) {
    const uid = useId(), inputId = id || uid, styles = field({ variant: "large" });
    return /* @__PURE__ */ jsxs("div", { className: wrapperClassName, children: [
      label && /* @__PURE__ */ jsx2("label", { htmlFor: inputId, className: styles.label, children: label }),
      /* @__PURE__ */ jsx2(
        "div",
        {
          className: styles.root,
          "data-invalid": invalid,
          "data-disabled": props.disabled,
          "data-force-state": forcedState,
          children: /* @__PURE__ */ jsx2(
            "textarea",
            {
              rows: 3,
              ...props,
              ref,
              id: inputId,
              className: cx2(styles.control, className),
              "aria-invalid": invalid || props["aria-invalid"],
              "aria-describedby": [
                props["aria-describedby"],
                description ? `${inputId}-description` : null
              ].filter(Boolean).join(" ") || void 0
            }
          )
        }
      ),
      description && /* @__PURE__ */ jsx2("div", { id: `${inputId}-description`, className: styles.description, children: description })
    ] });
  }
);
var Chip = forwardRef(function Chip2({
  variant = "filter",
  tone = "neutral",
  selected,
  leadingIcon,
  className,
  children,
  ...props
}, ref) {
  const classes = cx2(chip({ variant, tone }), className);
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      ...props,
      ref,
      className: classes,
      "aria-pressed": selected,
      children: [
        leadingIcon,
        children
      ]
    }
  );
});
function Badge({
  variant = "status",
  children,
  tone = "neutral",
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx2(
    "span",
    {
      ...props,
      className: cx2(variant === "dot" ? foundation({ kind: "dot", tone }) : chip({ variant: "status", tone }), className),
      children
    }
  );
}
var Row = forwardRef(function Row2({
  variant = "sidebar",
  size = "md",
  selected,
  leadingIcon,
  trailing,
  children,
  className,
  forcedState,
  ...props
}, ref) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      ...props,
      ref,
      className: cx2(row({ variant, size }), className),
      "data-selected": selected,
      "data-force-state": forcedState,
      "aria-current": selected ? "page" : void 0,
      children: [
        leadingIcon,
        /* @__PURE__ */ jsx2("span", { "data-row-label": true, children }),
        trailing
      ]
    }
  );
});
function RowGroup({
  children,
  style,
  ...props
}) {
  return /* @__PURE__ */ jsx2("div", { ...props, style: { display: "flex", gap: 6, ...style }, children });
}
function Tooltip({
  variant = "default",
  label,
  detail,
  children,
  side = "top",
  sideOffset = 8,
  disabled = false,
  open
}) {
  const settings = useCaelosTheme();
  return disabled ? children : /* @__PURE__ */ jsxs(RadixTooltip2.Root, { open, children: [
    /* @__PURE__ */ jsx2(RadixTooltip2.Trigger, { asChild: true, children }),
    /* @__PURE__ */ jsx2(RadixTooltip2.Portal, { children: /* @__PURE__ */ jsxs(
      RadixTooltip2.Content,
      {
        ...themeAttributes(settings),
        className: tooltip({ variant }),
        side,
        sideOffset,
        collisionPadding: 12,
        children: [
          label,
          detail && /* @__PURE__ */ jsx2("span", { "data-tooltip-detail": true, children: detail })
        ]
      }
    ) })
  ] });
}
var PermissionsIcon = KeyRound;
function SelectMenu({
  trigger,
  label,
  options,
  value,
  onValueChange,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  disabled
}) {
  const settings = useCaelosTheme(), styles = menu();
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxs(Dropdown.Root, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx2(Dropdown.Trigger, { asChild: true, disabled, children: React2.cloneElement(trigger, {
      onPointerDown: (e) => {
        trigger.props.onPointerDown?.(e);
        if (!e.defaultPrevented && e.button === 0 && !e.ctrlKey)
          e.preventDefault();
      },
      onClick: (e) => {
        trigger.props.onClick?.(e);
        if (!e.defaultPrevented) setOpen(!open);
      }
    }) }),
    /* @__PURE__ */ jsx2(Dropdown.Portal, { children: /* @__PURE__ */ jsxs(
      Dropdown.Content,
      {
        ...themeAttributes(settings),
        className: styles.content,
        side,
        align,
        sideOffset,
        collisionPadding: 12,
        children: [
          label && /* @__PURE__ */ jsx2(Dropdown.Label, { className: styles.label, children: label }),
          /* @__PURE__ */ jsx2(Dropdown.RadioGroup, { value, onValueChange, children: options.map((option) => /* @__PURE__ */ jsxs(
            Dropdown.RadioItem,
            {
              value: option.value,
              disabled: option.disabled,
              className: styles.item,
              children: [
                option.label,
                /* @__PURE__ */ jsx2(Dropdown.ItemIndicator, { children: /* @__PURE__ */ jsx2(Check, { size: 14 }) })
              ]
            },
            option.value
          )) })
        ]
      }
    ) })
  ] });
}
function ActionMenu({
  trigger,
  label,
  items,
  side = "bottom",
  align = "center"
}) {
  const settings = useCaelosTheme(), styles = menu({ layout: "action" });
  return /* @__PURE__ */ jsxs(Dropdown.Root, { children: [
    /* @__PURE__ */ jsx2(Dropdown.Trigger, { asChild: true, children: trigger }),
    /* @__PURE__ */ jsx2(Dropdown.Portal, { children: /* @__PURE__ */ jsxs(
      Dropdown.Content,
      {
        ...themeAttributes(settings),
        className: styles.content,
        side,
        align,
        sideOffset: 8,
        collisionPadding: 12,
        children: [
          label && /* @__PURE__ */ jsx2(Dropdown.Label, { className: styles.label, children: label }),
          items.map((item) => /* @__PURE__ */ jsx2(
            Dropdown.Item,
            {
              disabled: item.disabled,
              onSelect: item.onSelect,
              className: styles.item,
              children: item.label
            },
            item.id
          ))
        ]
      }
    ) })
  ] });
}
var STATUS_OPTIONS = [
  { value: "ready", label: "Ready", tone: "ready" },
  { value: "progress", label: "In progress", tone: "progress" },
  { value: "done", label: "Completed", tone: "done" },
  { value: "danger", label: "Blocked", tone: "danger" }
];
function StatusSelect({
  value,
  onValueChange,
  options = STATUS_OPTIONS,
  disabled
}) {
  const selected = options.find((o) => o.value === value);
  return /* @__PURE__ */ jsx2(
    SelectMenu,
    {
      value,
      onValueChange,
      options,
      disabled,
      label: "Set status",
      trigger: /* @__PURE__ */ jsxs(
        Chip,
        {
          variant: "status",
          tone: selected?.tone,
          disabled,
          "aria-label": `Change status: ${selected?.label || value}`,
          children: [
            selected?.label || value,
            /* @__PURE__ */ jsx2(ChevronDown, { size: 12 })
          ]
        }
      )
    }
  );
}
var Select = forwardRef(function Select2({
  options,
  label,
  showLabel = false,
  variant = "compact",
  wrapperClassName,
  placeholder = "Choose\u2026",
  className,
  style,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
  ...triggerProps
}, ref) {
  const uid = useId();
  const triggerId = triggerProps.id || uid;
  const settings = useCaelosTheme(), styles = menu();
  return /* @__PURE__ */ jsxs("div", { className: wrapperClassName, style: { display: showLabel ? void 0 : "contents" }, children: [
    showLabel && label && /* @__PURE__ */ jsx2("label", { className: field().label, htmlFor: triggerId, children: label }),
    /* @__PURE__ */ jsxs(RadixSelect.Root, { value, defaultValue, onValueChange, disabled, name, required, children: [
      /* @__PURE__ */ jsxs(
        RadixSelect.Trigger,
        {
          ...triggerProps,
          ref,
          id: triggerId,
          "aria-label": label || triggerProps["aria-label"],
          className: cx2(variant === "field" ? field().root : button({ variant: "tonal" }), className),
          "data-disabled": disabled || void 0,
          style: { display: "flex", gap: 12, color: "var(--il-ink)", ...variant === "field" ? { width: "100%", padding: "11px 14px", cursor: disabled ? "not-allowed" : "pointer" } : {}, justifyContent: "space-between", ...style },
          children: [
            /* @__PURE__ */ jsx2(RadixSelect.Value, { placeholder }),
            /* @__PURE__ */ jsx2(RadixSelect.Icon, { children: /* @__PURE__ */ jsx2(ChevronDown, { size: 14 }) })
          ]
        }
      ),
      /* @__PURE__ */ jsx2(RadixSelect.Portal, { children: /* @__PURE__ */ jsx2(
        RadixSelect.Content,
        {
          ...themeAttributes(settings),
          className: styles.content,
          position: "popper",
          style: { minWidth: "var(--radix-select-trigger-width)", maxHeight: "var(--radix-select-content-available-height)" },
          sideOffset: 8,
          collisionPadding: 12,
          children: /* @__PURE__ */ jsx2(RadixSelect.Viewport, { children: options.map((o) => /* @__PURE__ */ jsxs(
            RadixSelect.Item,
            {
              value: o.value,
              disabled: o.disabled,
              className: styles.item,
              children: [
                /* @__PURE__ */ jsx2(RadixSelect.ItemText, { children: o.label }),
                /* @__PURE__ */ jsx2(RadixSelect.ItemIndicator, { children: /* @__PURE__ */ jsx2(Check, { size: 14 }) })
              ]
            },
            o.value
          )) })
        }
      ) })
    ] })
  ] });
});
var ScrollArea = forwardRef(
  function ScrollArea2({ children, className, viewportLabel, viewportRef, ...props }, ref) {
    const styles = scroll(), [dragging, setDragging] = useState(false);
    return /* @__PURE__ */ jsxs(
      RadixScroll.Root,
      {
        ...props,
        ref,
        type: "auto",
        className: cx2(styles.root, className),
        children: [
          /* @__PURE__ */ jsx2(
            RadixScroll.Viewport,
            {
              ref: viewportRef,
              className: styles.viewport,
              tabIndex: 0,
              "aria-label": viewportLabel,
              role: "region",
              children
            }
          ),
          /* @__PURE__ */ jsx2(RadixScroll.Scrollbar, { orientation: "vertical", className: styles.track, children: /* @__PURE__ */ jsx2(
            RadixScroll.Thumb,
            {
              className: styles.thumb,
              "data-dragging": dragging,
              onPointerDown: (e) => {
                setDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              },
              onPointerUp: () => setDragging(false),
              onPointerCancel: () => setDragging(false),
              onLostPointerCapture: () => setDragging(false)
            }
          ) })
        ]
      }
    );
  }
);
var TabsRoot = RadixTabs.Root;
var TabsList = forwardRef(function TabsList2({ enclosed = false, appearance = "pill", style, children, ...props }, ref) {
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const attachRef = useCallback((node) => {
    listRef.current = node;
    if (typeof ref === "function") return ref(node);
    if (ref) ref.current = node;
  }, [ref]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector('[role="tab"][data-state="active"]');
      const next = active ? { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight } : null;
      setIndicator((previous) => previous?.x === next?.x && previous?.y === next?.y && previous?.width === next?.width && previous?.height === next?.height ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    const observe = () => {
      resize.disconnect();
      resize.observe(list);
      list.querySelectorAll('[role="tab"]').forEach((tab) => resize.observe(tab));
      measure();
    };
    const changes = new MutationObserver(observe);
    changes.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-state"] });
    observe();
    return () => {
      resize.disconnect();
      changes.disconnect();
    };
  }, []);
  return /* @__PURE__ */ jsxs(RadixTabs.List, { ref: attachRef, ...props, "data-nc-tabs": "", "data-appearance": appearance, "data-indicator": indicator && appearance === "pill" ? "ready" : void 0, style: {
    position: "relative",
    isolation: "isolate",
    display: "flex",
    gap: 5,
    padding: enclosed ? 5 : 0,
    borderRadius: 999,
    background: enclosed ? "var(--il-surface)" : void 0,
    width: "fit-content",
    maxWidth: "100%",
    flexWrap: "wrap",
    ...style
  }, children: [
    indicator && appearance === "pill" && /* @__PURE__ */ jsx2("span", { "aria-hidden": "true", "data-nc-tab-indicator": "", style: {
      width: indicator.width,
      height: indicator.height,
      transform: `translate(${indicator.x}px, ${indicator.y}px)`
    } }),
    children
  ] });
});
var TabsTrigger = forwardRef(function TabsTrigger2({ className, appearance = "tab", ...props }, ref) {
  return /* @__PURE__ */ jsx2(RadixTabs.Trigger, { ref, ...props, className: cx2(appearance === "tonal" ? button({ variant: "tonal" }) : row({ variant: appearance === "underline" ? "tabUnderline" : "tab" }), className) });
});
var TabsContent = forwardRef(function TabsContent2({ style, ...props }, ref) {
  return /* @__PURE__ */ jsx2(RadixTabs.Content, { ref, ...props, "data-nc-tab-panel": "", style: { paddingTop: 16, ...style } });
});
function Tabs({ value, onValueChange, label, items, enclosed = false }) {
  return /* @__PURE__ */ jsxs(TabsRoot, { value, onValueChange, children: [
    /* @__PURE__ */ jsx2(TabsList, { "aria-label": label, enclosed, children: items.map((i) => /* @__PURE__ */ jsx2(TabsTrigger, { value: i.value, disabled: i.disabled, children: i.label }, i.value)) }),
    items.map((i) => /* @__PURE__ */ jsx2(TabsContent, { value: i.value, children: i.content }, i.value))
  ] });
}
var TaskRow = forwardRef(function TaskRow2({
  title: title2,
  status,
  onStatusChange,
  statusDisabled,
  owner,
  ownerDisplay = "avatar",
  onOpen,
  options = STATUS_OPTIONS,
  leading,
  afterTitle,
  metadata,
  actions: actions2,
  trailing,
  className,
  style,
  onClick,
  ...props
}, ref) {
  const selected = options.find((o) => o.value === status);
  const tone = selected?.tone || "ready";
  const color = tone === "neutral" ? "var(--il-muted)" : tone === "atmospheric" || tone === "structural" ? `var(--sys-sem-${tone})` : `var(--nc-${tone === "done" ? "sage" : tone})`;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ...props,
      ref,
      "data-task-row": "true",
      className: cx2(row({ variant: "list" }), className),
      style: { cursor: "default", ...style },
      onClick: (e) => {
        onClick?.(e);
        if (!e.defaultPrevented && e.currentTarget.contains(e.target) && !e.target.closest("button,a,input,select,textarea,[data-task-control]")) onOpen?.();
      },
      children: [
        /* @__PURE__ */ jsxs("div", { "data-task-content": true, children: [
          leading,
          /* @__PURE__ */ jsx2("span", { "aria-hidden": true, style: { width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 } }),
          /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              onClick: onOpen,
              className: button({ variant: "text" }),
              style: {
                flex: 1,
                minWidth: 0,
                height: "auto",
                minHeight: 32,
                paddingBlock: 4,
                justifyContent: "flex-start",
                textAlign: "left",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                textDecoration: status === "done" ? "line-through" : void 0,
                color: `var(--task-row-title-color, ${status === "done" || status === "deferred" ? "var(--il-dim)" : "var(--il-muted)"})`
              },
              children: title2
            }
          ),
          afterTitle
        ] }),
        /* @__PURE__ */ jsxs("div", { "data-task-controls": true, children: [
          onStatusChange || statusDisabled ? /* @__PURE__ */ jsx2(StatusSelect, { value: status, onValueChange: onStatusChange ?? (() => void 0), options, disabled: statusDisabled }) : /* @__PURE__ */ jsx2(Badge, { tone, children: selected?.label || status }),
          owner && (ownerDisplay === "name" ? /* @__PURE__ */ jsx2("span", { "data-task-owner": "", className: foundation({ variant: "small" }), title: owner.name, style: { color: owner.color ?? "var(--il-muted)", maxWidth: "16ch", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: owner.name }) : /* @__PURE__ */ jsx2(Tooltip, { label: owner.name, children: /* @__PURE__ */ jsx2(Avatar, { name: owner.name, size: "sm", tabIndex: 0, children: owner.avatar }) })),
          metadata,
          actions2 && /* @__PURE__ */ jsx2("span", { "data-row-actions": true, style: { display: "flex", flexShrink: 0 }, children: actions2 }),
          trailing
        ] })
      ]
    }
  );
});
function Breadcrumb({
  children,
  fullPath,
  ...props
}) {
  const content = /* @__PURE__ */ jsx2(
    "nav",
    {
      ...props,
      "aria-label": props["aria-label"] || "Breadcrumb",
      tabIndex: props.tabIndex ?? (fullPath ? 0 : void 0),
      style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0, whiteSpace: "nowrap", ...props.style },
      children
    }
  );
  return fullPath ? /* @__PURE__ */ jsx2(Tooltip, { label: fullPath, variant: "path", children: content }) : content;
}
function BreadcrumbItem({
  current,
  children,
  onClick,
  ...props
}) {
  return current ? /* @__PURE__ */ jsx2("span", { "aria-current": "page", style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children }) : /* @__PURE__ */ jsx2(
    "button",
    {
      type: "button",
      ...props,
      onClick,
      className: row({ variant: "crumb" }),
      style: { minWidth: 0, ...props.style },
      children: /* @__PURE__ */ jsx2("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children })
    }
  );
}
function BreadcrumbSeparator() {
  return /* @__PURE__ */ jsx2("span", { "aria-hidden": true, style: { color: "var(--il-dim)", flexShrink: 0 }, children: "\xB7" });
}
var avatarColors = ["red", "orange", "amber", "gold", "yellow", "green", "cyan", "blue", "purple", "pink", "silver"];
var Avatar = forwardRef(function Avatar2({ name, src, size = "md", kind = "person", shape, color, status, children, className, style, ...props }, ref) {
  const [failedSrc, setFailedSrc] = useState();
  const initials = name.trim().split(/[\s-]+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "?";
  const styles = avatar({ size, shape: shape ?? (kind === "agent" ? "square" : "circle"), status });
  const label = status === "attention" ? `${name}, needs attention` : status === "running" ? `${name}, working in the background` : name;
  return /* @__PURE__ */ jsxs(
    "span",
    {
      role: "img",
      "aria-label": label,
      ...props,
      ref,
      className: cx2(styles.root, className),
      style: color ? { "--av-color": `var(--avatar-${color})`, ...style } : style,
      children: [
        /* @__PURE__ */ jsx2("span", { className: styles.frame, children: src && failedSrc !== src ? /* @__PURE__ */ jsx2("img", { className: styles.image, src, alt: "", onError: () => setFailedSrc(src) }) : /* @__PURE__ */ jsx2("span", { className: styles.fallback, children: children || initials }) }),
        status && /* @__PURE__ */ jsx2("span", { className: styles.badge, "aria-hidden": "true" })
      ]
    }
  );
});
function PersonChip({ name, src, kind, onRemove, className, ...props }) {
  const styles = identity({ variant: "chip" });
  return /* @__PURE__ */ jsxs("span", { ...props, className: cx2(styles.root, className), children: [
    /* @__PURE__ */ jsx2(Avatar, { name, src, kind, size: "sm", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx2("span", { className: styles.name, children: name }),
    onRemove && /* @__PURE__ */ jsx2(IconButton, { label: `Remove ${name}`, size: "sm", variant: "text", icon: /* @__PURE__ */ jsx2(X, { size: 12 }), onClick: onRemove })
  ] });
}
function UserCard({ name, src, kind, description, actions: actions2, className, ...props }) {
  const styles = identity({ variant: "card" });
  return /* @__PURE__ */ jsxs("div", { ...props, className: cx2(styles.root, className), children: [
    /* @__PURE__ */ jsx2(Avatar, { name, src, kind, size: "lg", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxs("div", { className: styles.text, children: [
      /* @__PURE__ */ jsx2("span", { className: styles.name, children: name }),
      description && /* @__PURE__ */ jsx2("span", { className: styles.description, children: description })
    ] }),
    actions2 && /* @__PURE__ */ jsx2("div", { className: styles.actions, children: actions2 })
  ] });
}
function Disclosure({
  title: title2,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  headingLevel = 3,
  className,
  ...props
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const expanded = open ?? internalOpen;
  const id = useId();
  const styles = disclosure();
  const Heading3 = `h${headingLevel}`;
  return /* @__PURE__ */ jsxs("div", { ...props, className: cx2(styles.root, className), children: [
    /* @__PURE__ */ jsx2(Heading3, { className: styles.heading, "data-heading": true, children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        id: `${id}-trigger`,
        className: styles.trigger,
        "aria-expanded": expanded,
        "aria-controls": `${id}-panel`,
        onClick: () => {
          if (open === void 0) setInternalOpen(!expanded);
          onOpenChange?.(!expanded);
        },
        children: [
          /* @__PURE__ */ jsx2(ChevronRight, { size: 16, "aria-hidden": "true", className: styles.chevron, "data-open": expanded }),
          title2
        ]
      }
    ) }),
    /* @__PURE__ */ jsx2(
      "div",
      {
        id: `${id}-panel`,
        className: styles.panel,
        "data-open": expanded,
        "aria-hidden": !expanded,
        ref: (node) => {
          if (node) node.inert = !expanded;
        },
        children: /* @__PURE__ */ jsx2("div", { className: styles.content, children })
      }
    )
  ] });
}

// src/composer-internal.jsx
import React4, {
  createContext as createContext2,
  useContext as useContext2,
  useEffect as useEffect4,
  useLayoutEffect as useLayoutEffect4,
  useRef as useRef5,
  useState as useState4,
  useId as useId4
} from "react";
import {
  MessageSquare,
  Volume2,
  Captions,
  Folder,
  Bot,
  Goal,
  X as X2,
  FileText,
  AudioLines,
  ArrowUp,
  Plus,
  Mic,
  KeyRound as KeyRound2,
  Brain,
  Square,
  Check as Check2,
  Hand,
  Rocket
} from "lucide-react";
import * as Tooltip2 from "@radix-ui/react-tooltip";
import * as Popover from "@radix-ui/react-popover";
import * as Dropdown2 from "@radix-ui/react-dropdown-menu";

// src/NovaLoader.tsx
import { useEffect, useRef as useRef2 } from "react";

// src/loader-v6/renderer.js
var global = globalThis;
var TAU = Math.PI * 2;
var DURATION = 12;
var NS = "http://www.w3.org/2000/svg";
var orbits = [
  [65, 0.23, 0.72, -0.36, 0.35, 0.1, 2.26, 15.5, 3],
  [55, 0.31, 0.55, -0.8, 2.4, 2.04, 1.42, 7.8, 4],
  [69, 0.19, 0.75, 0.25, 4.1, 3.42, 1.86, 11.2, 3],
  [52, 0.26, -0.35, 0.12, 1.1, 4.89, 1.38, 6, 2],
  [90, 0.17, 0.4, -0.48, 3.2, 5.7, 1.02, 4.5, 2]
];
function point(o, u) {
  const [a, e, tilt, roll, peri] = o;
  const r = a * (1 - e * e) / (1 + e * Math.cos(u));
  const v = u + peri;
  const x = r * Math.cos(v);
  const y = r * Math.sin(v);
  const warp = a * 0.055 * Math.sin(2 * u + peri);
  const yy = y * Math.cos(tilt) - warp * Math.sin(tilt);
  const z = y * Math.sin(tilt) + warp * Math.cos(tilt);
  const xx = x * Math.cos(roll) - yy * Math.sin(roll);
  const ry = x * Math.sin(roll) + yy * Math.cos(roll);
  const perspective = 200 / (200 - z);
  return { x: 120 + xx * perspective, y: 120 + ry * perspective, z, scale: perspective };
}
function ray(o, seconds, samples = 64, weight = 1) {
  const m = o[5] + TAU * o[8] * seconds / DURATION;
  const head = m + 0.2 * Math.sin(m - o[4]);
  const pts = [], left = [], right = [];
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    const u = head - o[6] + o[6] * s;
    const p = point(o, u), a = point(o, u - 1e-3), b = point(o, u + 1e-3);
    const dx = b.x - a.x, dy = b.y - a.y, norm = Math.hypot(dx, dy);
    const taper = Math.pow(Math.sin(Math.PI * s), 0.72) * (0.24 + 0.76 * s);
    const width = weight * o[7] * taper * p.scale * (0.84 + 0.16 * Math.cos(u - o[4]));
    const nx = -dy / norm * width / 2, ny = dx / norm * width / 2;
    left.push([p.x + nx, p.y + ny]);
    right.push([p.x - nx, p.y - ny]);
    pts.push(p);
  }
  const outline = left.concat(right.reverse());
  const d = outline.map((p, i) => (i ? "L" : "M") + p[0].toFixed(3) + "," + p[1].toFixed(3)).join("") + "Z";
  return { d, points: pts, outline, depth: pts.reduce((s, p) => s + p.z, 0) / pts.length };
}
function frame(seconds, samples = 64, weight = 1) {
  const t = (seconds % DURATION + DURATION) % DURATION;
  return orbits.map((o, id) => ({ id, ...ray(o, t, samples, weight) }));
}
function svgMarkup(seconds = 0) {
  const rays = frame(seconds);
  return '<svg xmlns="' + NS + '" viewBox="0 0 240 240" fill="currentColor" role="img" aria-label="Loading" style="display:block;width:100%;height:100%;overflow:visible">' + rays.map((r) => '<path data-ray="' + r.id + '" d="' + r.d + '"/>').join("") + '<circle cx="120" cy="120" r="18.7"/></svg>';
}
function mount(host, { autoplay = true } = {}) {
  host.innerHTML = svgMarkup();
  const svg = host.querySelector("svg");
  const paths = [...svg.querySelectorAll("path")];
  const orb = svg.querySelector("circle");
  let weight = 1;
  const reduced = global.matchMedia("(prefers-reduced-motion: reduce)");
  let running = autoplay, elapsed = 0, last = null, raf = 0, disposed = false;
  function render(seconds) {
    elapsed = seconds;
    frame(seconds, 64, weight).forEach((r) => paths[r.id].setAttribute("d", r.d));
  }
  function tick(now) {
    raf = 0;
    if (disposed || !running || reduced.matches || document.hidden) {
      last = null;
      return;
    }
    if (last !== null) elapsed += (now - last) / 1e3;
    last = now;
    render(elapsed);
    raf = requestAnimationFrame(tick);
  }
  function schedule() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = null;
    if (running && !reduced.matches && !document.hidden && !disposed) raf = requestAnimationFrame(tick);
  }
  function resize() {
    const size = host.getBoundingClientRect().width || 240;
    weight = Math.min(1.7, Math.max(1, Math.pow(100 / size, 0.45)));
    orb.setAttribute("r", String(Math.max(18.7, 734.4 / size)));
    render(elapsed);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  reduced.addEventListener("change", schedule);
  document.addEventListener("visibilitychange", schedule);
  schedule();
  return {
    render,
    play() {
      running = true;
      schedule();
    },
    pause() {
      running = false;
      schedule();
    },
    destroy() {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      reduced.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
      host.innerHTML = "";
    },
    get time() {
      return elapsed;
    }
  };
}

// src/NovaLoader.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function NovaLoader({ size = 32, label = "Loading", paused = false, className, style }) {
  const host = useRef2(null);
  const { reducedMotion } = useCaelosTheme();
  useEffect(() => {
    if (!host.current) return;
    const controller = mount(host.current, { autoplay: !paused && !reducedMotion });
    return () => controller.destroy();
  }, [paused, reducedMotion]);
  return /* @__PURE__ */ jsx3(
    "span",
    {
      role: "status",
      "aria-label": label,
      className,
      style: { display: "inline-flex", width: size, height: size, flexShrink: 0, ...style },
      children: /* @__PURE__ */ jsx3("span", { ref: host, "aria-hidden": "true", style: { display: "block", width: "100%", height: "100%" } })
    }
  );
}

// src/AgentMessage.tsx
import { Fragment, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function AgentAvatar({ agent, size = "sm", ...props }) {
  return /* @__PURE__ */ jsx4(Avatar, { ...props, name: agent.name, src: agent.avatarSrc, color: agent.color, shape: "circle", size, "data-agent-avatar": agent.id });
}
function AgentMessage({ agent, continued = false, responding = false, children, className, ...props }) {
  const styles = agentMessage();
  const showSignature = !continued || responding;
  return /* @__PURE__ */ jsxs2(
    "article",
    {
      ...props,
      "aria-label": `${agent.name} message`,
      "data-agent-id": agent.id,
      "data-continued": continued,
      className: [styles.root, className].filter(Boolean).join(" "),
      children: [
        showSignature && /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsx4("div", { className: styles.avatar, "aria-hidden": "true", children: /* @__PURE__ */ jsx4(AgentAvatar, { agent }) }),
          /* @__PURE__ */ jsxs2("div", { className: styles.byline, "data-slot": "agent-byline", children: [
            /* @__PURE__ */ jsx4("span", { className: styles.name, children: agent.name }),
            responding && /* @__PURE__ */ jsx4(NovaLoader, { size: 16, label: `${agent.name} is responding` })
          ] })
        ] }),
        /* @__PURE__ */ jsx4("div", { className: styles.content, "data-slot": "agent-content", children })
      ]
    }
  );
}

// src/ProgressiveSelector.tsx
import { useEffect as useEffect2, useId as useId2, useLayoutEffect as useLayoutEffect2, useRef as useRef3, useState as useState2 } from "react";
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function ProgressiveSelector({
  value,
  onValueChange,
  options,
  label,
  tooltip: tooltip2,
  className = "",
  dockBoundary,
  rightOffset = 0,
  composer = false,
  renderLeading
}) {
  const [open, setOpen] = useState2("closed");
  const [childIsOpen, setChildIsOpen] = useState2(false);
  const [layout2, setLayout] = useState2({ side: "bottom", style: {} });
  const [expandedWidth, setExpandedWidth] = useState2(0);
  const root = useRef3(null), trigger = useRef3(null), bridge = useRef3(null);
  const optionRefs = useRef3([]);
  const timer = useRef3(void 0);
  const childOpen = useRef3(false), pendingFocus = useRef3(null), lastExpanded = useRef3(false);
  const menuId = useId2(), owner = useId2();
  const selected = options.find((option) => option.value === value) || options[0];
  if (open !== "closed") lastExpanded.current = open === "pinned";
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setOpen("closed");
  };
  const focusOption = (index) => optionRefs.current[index]?.focus({ preventScroll: true });
  const pin = (index) => {
    cancel();
    if (index !== void 0) {
      if (open === "pinned") focusOption(index);
      else pendingFocus.current = index;
    }
    setOpen("pinned");
  };
  useLayoutEffect2(() => {
    if (open === "pinned" && pendingFocus.current !== null) {
      focusOption(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [open]);
  useLayoutEffect2(() => {
    const measure = () => {
      const menu2 = bridge.current?.firstElementChild;
      if (!menu2) return;
      const menuStyle2 = getComputedStyle(menu2);
      const pixels = (value2) => parseFloat(value2) || 0;
      const frame2 = pixels(menuStyle2.paddingLeft) + pixels(menuStyle2.paddingRight) + pixels(menuStyle2.borderLeftWidth) + pixels(menuStyle2.borderRightWidth);
      const width = optionRefs.current.slice(0, options.length).reduce((total, option) => {
        if (!option) return total;
        const text = option.querySelector("span");
        const labelWidth = text?.scrollWidth || 0;
        text?.style.setProperty("--nc-selector-label-width", `${labelWidth}px`);
        const style = getComputedStyle(option);
        return total + labelWidth + 17 + 6 + pixels(style.paddingLeft) + pixels(style.paddingRight);
      }, frame2 + Math.max(0, options.length - 1) * pixels(menuStyle2.columnGap));
      setExpandedWidth(Math.ceil(width));
    };
    measure();
    document.fonts?.ready.then(measure);
  }, [options]);
  useLayoutEffect2(() => {
    if (open === "closed" || !root.current || !bridge.current) return;
    const measure = () => {
      if (!root.current || !bridge.current) return;
      const control = root.current.getBoundingClientRect();
      const surface2 = (dockBoundary || root.current).getBoundingClientRect();
      const width = bridge.current.offsetWidth;
      const height = bridge.current.firstElementChild?.getBoundingClientRect().height || 42;
      const viewport = window.visualViewport;
      const floor = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const edgeGap = dockBoundary ? parseFloat(getComputedStyle(dockBoundary).getPropertyValue("--nc-composer-dock-edge-gap")) || 3 : 3;
      const below = floor - surface2.bottom - edgeGap - 2, above = surface2.top - 12;
      const side = below + 0.5 < height && above > below ? "top" : "bottom";
      let right = rightOffset;
      const left = control.right - right - width;
      if (left < 12) right -= 12 - left;
      if (control.right - right > window.innerWidth - 12) right += control.right - right - window.innerWidth + 12;
      const style = {
        right,
        top: side === "bottom" ? "100%" : "auto",
        bottom: side === "top" ? "100%" : "auto",
        paddingTop: side === "bottom" ? Math.max(0, surface2.bottom - control.bottom) : 0,
        paddingBottom: side === "top" ? Math.max(0, control.top - surface2.top) : 0
      };
      setLayout((previous) => JSON.stringify(previous) === JSON.stringify({ side, style }) ? previous : { side, style });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root.current);
    observer.observe(bridge.current);
    if (dockBoundary) observer.observe(dockBoundary);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, dockBoundary, rightOffset]);
  useEffect2(() => {
    const outside = (event) => {
      const target = event.target;
      if (target instanceof Element && !root.current?.contains(target) && target.closest("[data-model-owner]")?.getAttribute("data-model-owner") !== owner) {
        cancel();
        setOpen("closed");
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      clearTimeout(timer.current);
    };
  }, [owner]);
  if (!selected) return null;
  const compactWidth = options.length * 36 + 14;
  const menuStyle = composer ? void 0 : { width: lastExpanded.current ? expandedWidth || "max-content" : compactWidth };
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      ref: root,
      className: `nc-composer-reply nc-progressive-selector ${className}`,
      "data-composer-selector": composer || void 0,
      onPointerEnter: (event) => {
        if (event.pointerType !== "touch") {
          cancel();
          setOpen((state) => state === "closed" ? "hover" : state);
        }
      },
      onPointerLeave: () => {
        cancel();
        timer.current = setTimeout(() => {
          if (!childOpen.current && !root.current?.contains(document.activeElement)) setOpen((state) => state === "hover" ? "closed" : state);
        }, 260);
      },
      onBlur: (event) => {
        if (!childOpen.current && !event.currentTarget.contains(event.relatedTarget)) close();
      },
      onKeyDown: (event) => {
        if (event.key === "Escape" && !childOpen.current) {
          event.preventDefault();
          event.stopPropagation();
          close();
          trigger.current?.focus({ preventScroll: true });
        }
      },
      children: [
        /* @__PURE__ */ jsx5(Tooltip, { label: tooltip2 || label, side: "top", disabled: childIsOpen, children: /* @__PURE__ */ jsx5(
          "button",
          {
            type: "button",
            ref: trigger,
            className: `${composer ? "" : button({ variant: "tonal" })} nc-composer-icon nc-composer-format-trigger nc-progressive-selector-trigger`,
            "aria-label": `${label}: ${selected.label}`,
            "aria-haspopup": "menu",
            "aria-expanded": open !== "closed",
            "aria-controls": open !== "closed" ? menuId : void 0,
            onClick: () => {
              cancel();
              if (open === "pinned") close();
              else pin();
            },
            onKeyDown: (event) => {
              if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                pin(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, options.findIndex((option) => option.value === value)));
              }
            },
            children: selected.icon
          }
        ) }),
        /* @__PURE__ */ jsx5(
          "div",
          {
            ref: bridge,
            className: "nc-composer-format-bridge nc-composer-docked-bridge",
            "data-dock": layout2.side,
            style: layout2.style,
            "data-open": open !== "closed",
            inert: open === "closed",
            "aria-hidden": open === "closed",
            "data-expanded": lastExpanded.current,
            children: /* @__PURE__ */ jsxs3(
              "div",
              {
                id: menuId,
                className: "nc-composer-format-menu",
                role: "menu",
                "aria-label": label,
                "data-expanded": lastExpanded.current,
                "data-composer-menu-surface": renderLeading ? "" : void 0,
                "data-agent-review": renderLeading ? "true" : void 0,
                style: menuStyle,
                onKeyDown: (event) => {
                  const index = optionRefs.current.indexOf(document.activeElement);
                  if (index < 0) return;
                  if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    focusOption(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : options.length - 1)) % options.length);
                  }
                },
                children: [
                  renderLeading?.({ expanded: open === "pinned", owner, onPresenceChange: (present) => {
                    childOpen.current = present;
                    setChildIsOpen(present);
                    cancel();
                  }, onPin: () => pin() }),
                  options.map((option, index) => /* @__PURE__ */ jsxs3(
                    "button",
                    {
                      type: "button",
                      ref: (element) => {
                        optionRefs.current[index] = element;
                      },
                      className: "nc-composer-format-option",
                      role: "menuitemradio",
                      "aria-checked": value === option.value,
                      "aria-label": option.label,
                      onClick: () => {
                        onValueChange(option.value);
                        close();
                        trigger.current?.focus({ preventScroll: true });
                      },
                      children: [
                        option.icon,
                        /* @__PURE__ */ jsx5("span", { className: "nc-composer-format-label", children: option.label })
                      ]
                    },
                    option.value
                  ))
                ]
              }
            )
          }
        )
      ]
    }
  );
}

// src/composer-commands.tsx
import {
  useEffect as useEffect3,
  useId as useId3,
  useLayoutEffect as useLayoutEffect3,
  useRef as useRef4,
  useState as useState3
} from "react";
import { createPortal } from "react-dom";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var commandName = (command) => `/${command.name.replace(/^\//, "")}`;
function tokenAt(value, start, end) {
  if (start !== end) return null;
  const match = /(?:^|\s)([/@])([\p{L}\p{N}_:-]*)$/u.exec(
    value.slice(0, start)
  );
  if (!match) return null;
  const suffix = /^\S*/.exec(value.slice(start))[0];
  if (!/^[\p{L}\p{N}_:-]*$/u.test(suffix)) return null;
  return {
    start: start - match[2].length - 1,
    end: start + suffix.length,
    trigger: match[1],
    query: match[2]
  };
}
function useComposerSuggestions({
  value,
  onValueChange,
  commands,
  agents,
  disabled,
  field: field2,
  shell
}) {
  const id = useId3();
  const [selection, setSelection] = useState3({ start: 0, end: 0 });
  const [focused, setFocused] = useState3(false);
  const [composing, setComposing] = useState3(false);
  const [dismissed, setDismissed] = useState3(null);
  const [navigation, setNavigation] = useState3({
    key: "",
    index: 0,
    summary: false
  });
  const pendingCaret = useRef4(null);
  const token = tokenAt(value, selection.start, selection.end);
  const key = `${value}\0${selection.start}:${selection.end}`;
  const mentioning = token?.trigger === "@";
  const enabled = mentioning ? agents !== void 0 : commands !== void 0;
  const open = enabled && focused && !disabled && !composing && !!token && dismissed !== key;
  const entries = mentioning ? (agents ?? []).map((agent) => {
    const label = `@${agent.name.replace(/^@/, "")}`;
    return {
      id: agent.id,
      agent,
      label,
      description: agent.description,
      insertion: agent.mention ?? label,
      search: `${agent.name} ${agent.mention ?? ""}`
    };
  }) : (commands ?? []).map((command) => ({
    id: command.id,
    label: commandName(command),
    description: command.description,
    insertion: command.invocation ?? commandName(command),
    search: command.name
  }));
  const matches = entries.filter(
    (entry) => entry.search.toLocaleLowerCase().includes(token?.query.toLocaleLowerCase() ?? "")
  );
  const index = navigation.key === key ? Math.min(navigation.index, Math.max(0, matches.length - 1)) : 0;
  const summary = navigation.key === key && navigation.summary;
  const listId = `${id}-${mentioning ? "agents" : "commands"}`;
  const optionId = (i) => `${listId}-${i}`;
  useEffect3(() => {
    setNavigation({ key, index: 0, summary: false });
  }, [key, open]);
  const dismiss = () => setDismissed(key);
  const syncSelection = (el) => setSelection({ start: el.selectionStart, end: el.selectionEnd });
  useLayoutEffect3(() => {
    if (pendingCaret.current === null || !field2.current) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    field2.current.setSelectionRange(caret, caret);
    syncSelection(field2.current);
  }, [value, field2]);
  const choose = (entry) => {
    if (!token || disabled) return;
    const insertion = entry.insertion;
    const suffix = value.slice(token.end);
    const spacer = suffix.startsWith(" ") ? "" : " ";
    const next = value.slice(0, token.start) + insertion + spacer + suffix;
    pendingCaret.current = token.start + insertion.length + 1;
    dismiss();
    onValueChange(next);
    field2.current?.focus();
    if (next === value && field2.current) {
      field2.current.setSelectionRange(
        pendingCaret.current,
        pendingCaret.current
      );
      pendingCaret.current = null;
      syncSelection(field2.current);
    }
  };
  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing || composing || e.keyCode === 229)
      return true;
    if (!open) return false;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
      return true;
    }
    if (e.key === "Tab") {
      dismiss();
      return false;
    }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = summary ? (index + delta + matches.length) % matches.length : delta > 0 ? 0 : matches.length - 1;
      setNavigation({ key, index: Math.max(0, next || 0), summary: true });
      return true;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (matches[index]) choose(matches[index]);
      return true;
    }
    return false;
  };
  return {
    onKeyDown,
    fieldProps: {
      "aria-autocomplete": commands !== void 0 || agents !== void 0 ? "list" : void 0,
      "aria-haspopup": commands !== void 0 || agents !== void 0 ? "listbox" : void 0,
      "aria-controls": open ? listId : void 0,
      "aria-activedescendant": open && matches[index] ? optionId(index) : void 0,
      onFocus: (e) => {
        setFocused(true);
        syncSelection(e.currentTarget);
      },
      onBlur: () => {
        setFocused(false);
        dismiss();
      },
      onSelect: (e) => syncSelection(e.currentTarget),
      onChange: (e) => {
        syncSelection(e.currentTarget);
        onValueChange(e.currentTarget.value);
      },
      onCompositionStart: () => setComposing(true),
      onCompositionEnd: (e) => {
        setComposing(false);
        syncSelection(e.currentTarget);
      }
    },
    popup: open && shell ? /* @__PURE__ */ jsx6(
      ComposerSuggestions,
      {
        shell,
        listId,
        optionId,
        entries: matches,
        label: mentioning ? "Agents in this chat" : "Commands and skills",
        empty: mentioning ? agents?.length ? "No matching agents" : "No agents in this chat" : commands?.length ? "No matching commands" : "No installed commands or skills",
        active: index,
        summary,
        onChoose: choose,
        onDismiss: dismiss,
        onHighlight: (i) => setNavigation({ key, index: i, summary: true })
      },
      listId
    ) : null
  };
}
function ComposerSuggestions({
  shell,
  listId,
  optionId,
  entries,
  label,
  empty,
  active,
  summary,
  onChoose,
  onHighlight,
  onDismiss
}) {
  const settings = useCaelosTheme();
  const styles = menu({ layout: "action" });
  const panel = useRef4(null);
  const [position, setPosition] = useState3({
    left: 12,
    top: 12,
    maxHeight: 320,
    side: "top",
    ready: false
  });
  useLayoutEffect3(() => {
    const measure = () => {
      if (!panel.current) return;
      const rect = shell.getBoundingClientRect();
      const viewport = window.visualViewport;
      const minX = (viewport?.offsetLeft ?? 0) + 12;
      const minY = (viewport?.offsetTop ?? 0) + 12;
      const maxX = minX + (viewport?.width ?? window.innerWidth) - 24;
      const maxY = minY + (viewport?.height ?? window.innerHeight) - 24;
      const above = Math.max(0, rect.top - minY - 8);
      const below = Math.max(0, maxY - rect.bottom - 8);
      const naturalHeight = Math.min(320, panel.current.scrollHeight + 2);
      const side = above >= naturalHeight || above >= below ? "top" : "bottom";
      const maxHeight = Math.min(320, side === "top" ? above : below);
      const height = Math.min(naturalHeight, maxHeight);
      const left = Math.max(
        minX,
        Math.min(rect.left, maxX - panel.current.offsetWidth)
      );
      const top = Math.max(
        minY,
        Math.min(
          side === "top" ? rect.top - height - 8 : rect.bottom + 8,
          maxY - height
        )
      );
      setPosition((prev) => {
        const next = { left, top, maxHeight, side, ready: true };
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [shell, entries.length]);
  useEffect3(() => {
    const outside = (event) => {
      const target = event.target;
      if (!shell.querySelector("textarea")?.contains(target) && !panel.current?.contains(target) && !target.closest('[role="tooltip"]'))
        onDismiss();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [shell, onDismiss]);
  useLayoutEffect3(() => {
    const option = document.getElementById(optionId(active));
    if (!option || !panel.current) return;
    const top = option.offsetTop, bottom = top + option.offsetHeight;
    if (top < panel.current.scrollTop) panel.current.scrollTop = top;
    else if (bottom > panel.current.scrollTop + panel.current.clientHeight)
      panel.current.scrollTop = bottom - panel.current.clientHeight;
  }, [active, entries.length, optionId]);
  return createPortal(
    /* @__PURE__ */ jsxs4(
      "div",
      {
        ...themeAttributes(settings),
        ref: panel,
        className: `${styles.content} nc-composer-command-menu`,
        "data-state": "open",
        "data-side": position.side,
        style: {
          position: "fixed",
          left: position.left,
          top: position.top,
          maxHeight: position.maxHeight,
          visibility: position.ready ? "visible" : "hidden",
          transformOrigin: position.side === "top" ? "left bottom" : "left top"
        },
        onMouseDown: (e) => {
          if (e.button === 0) e.preventDefault();
        },
        children: [
          /* @__PURE__ */ jsx6("div", { id: listId, role: "listbox", "aria-label": label, children: entries.map((entry, i) => /* @__PURE__ */ jsx6(
            Tooltip,
            {
              side: "right",
              sideOffset: 24,
              label: entry.description,
              open: summary && active === i && !!entry.description,
              children: /* @__PURE__ */ jsxs4(
                "div",
                {
                  id: optionId(i),
                  role: "option",
                  "aria-selected": active === i,
                  "aria-description": entry.description,
                  className: styles.item,
                  "data-highlighted": active === i ? "" : void 0,
                  onPointerMove: (e) => {
                    if (e.pointerType !== "touch") onHighlight(i);
                  },
                  onClick: () => onChoose(entry),
                  children: [
                    entry.agent && /* @__PURE__ */ jsx6(AgentAvatar, { agent: entry.agent, "aria-hidden": "true" }),
                    entry.label
                  ]
                }
              )
            },
            entry.id
          )) }),
          !entries.length && /* @__PURE__ */ jsx6("div", { className: styles.label, role: "status", children: empty })
        ]
      }
    ),
    document.body
  );
}

// src/composer-internal.jsx
import { Fragment as Fragment2, jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
var ComposerAnchor = createContext2(null);
var ComposerReducedMotion = createContext2(false);
var PermissionsIcon2 = KeyRound2;
function useComposerDock(side = "top") {
  const shell = useContext2(ComposerAnchor), trigger = useRef5(null);
  const [gap, setGap] = useState4(0);
  useLayoutEffect4(() => {
    if (!shell || !trigger.current) return;
    const measure = () => {
      const el = trigger.current;
      if (shell.contains(el)) {
        let top = 0, node = el;
        while (node && node !== shell) {
          top += node.offsetTop;
          node = node.offsetParent;
        }
        if (node === shell) {
          top += shell.clientTop;
          setGap(
            side === "bottom" ? shell.offsetHeight - top - el.offsetHeight : top
          );
          return;
        }
      }
      const control = el.getBoundingClientRect(), surface2 = shell.getBoundingClientRect();
      setGap(
        side === "bottom" ? surface2.bottom - control.bottom : control.top - surface2.top
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(trigger.current);
    const bridge = trigger.current.closest(".nc-composer-docked-bridge");
    if (bridge) observer.observe(bridge);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [shell, side]);
  return { trigger, gap };
}
function useCompactDock(open, root, bridge, rightOffset) {
  const shell = useContext2(ComposerAnchor);
  const [layout2, setLayout] = useState4({ style: {}, side: "bottom" });
  useLayoutEffect4(() => {
    if (open === "closed" || !root.current || !bridge.current || !shell) return;
    const measure = () => {
      const control = root.current.getBoundingClientRect(), surface2 = shell.getBoundingClientRect();
      const width = bridge.current.offsetWidth, height = bridge.current.firstElementChild.offsetHeight;
      const edgeGap = parseFloat(getComputedStyle(shell).getPropertyValue("--nc-composer-dock-edge-gap")) || 3;
      const viewport = window.visualViewport;
      const floor = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const below = floor - surface2.bottom - edgeGap - 2, above = surface2.top - 12;
      const side = below + 0.5 < height && above > below ? "top" : "bottom";
      let right = rightOffset;
      const left = control.right - right - width;
      if (left < 12) right -= 12 - left;
      if (control.right - right > window.innerWidth - 12)
        right += control.right - right - window.innerWidth + 12;
      const style = {
        right,
        top: side === "bottom" ? "100%" : "auto",
        bottom: side === "top" ? "100%" : "auto",
        paddingTop: side === "bottom" ? Math.max(0, surface2.bottom - control.bottom) : 0,
        paddingBottom: side === "top" ? Math.max(0, control.top - surface2.top) : 0
      };
      setLayout(
        (previous) => JSON.stringify(previous) == JSON.stringify({ style, side }) ? previous : { style, side }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(bridge.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, shell, rightOffset]);
  return layout2;
}
var formats = [
  { id: "text", label: "Text", Icon: MessageSquare },
  { id: "voice", label: "Voice", Icon: Volume2 },
  { id: "both", label: "Text + voice", Icon: Captions }
];
function Hint({ label, children, disabled = false, side = "top" }) {
  return /* @__PURE__ */ jsx7(Tooltip, { label, side, disabled: disabled || !label, children });
}
function ReplyFormat({ value, onChange, mode, review, agents, activeAgentId, onActiveAgentChange, models, reasoningLevels }) {
  const shell = useContext2(ComposerAnchor);
  return /* @__PURE__ */ jsx7(
    ProgressiveSelector,
    {
      value,
      onValueChange: onChange,
      label: "Reply format",
      tooltip: "Change Output mode",
      options: formats.map(({ id, label, Icon: Icon2 }) => ({ value: id, label, icon: /* @__PURE__ */ jsx7(Icon2, { size: 18 }) })),
      composer: true,
      dockBoundary: shell,
      rightOffset: -39,
      renderLeading: review && agents?.length > 1 ? ({ expanded, owner, onPresenceChange, onPin }) => /* @__PURE__ */ jsx7(
        ReviewAgentSelector,
        {
          review,
          agents,
          activeAgentId,
          onActiveAgentChange,
          models,
          reasoningLevels,
          mode,
          owner,
          context: "reply",
          expanded,
          onPresenceChange,
          onPin
        }
      ) : void 0
    }
  );
}
function useSurfaceMenuDock(open, enabled, trigger, content, anchor = null, preferredSide = "top") {
  const [layout2, setLayout] = useState4(null);
  useLayoutEffect4(() => {
    if (!open || !enabled) return;
    let frame2;
    const measure = () => {
      const button2 = trigger.current;
      const card2 = anchor ?? button2?.closest(".nc-composer-model-settings, [data-composer-menu-surface]");
      const menu2 = content.current;
      if (card2 && menu2) {
        const field2 = button2.getBoundingClientRect();
        const surface2 = card2.getBoundingClientRect();
        const topCushion = anchor ? 2 : 0;
        const bottomCushion = anchor ? 0.5 : 0;
        const above = Math.max(0, surface2.top - 12 - topCushion);
        const below = Math.max(0, window.innerHeight - surface2.bottom - 12 - bottomCushion);
        const height = menu2.scrollHeight + menu2.offsetHeight - menu2.clientHeight;
        const side = above >= height || above >= below ? "top" : "bottom";
        const next = preferredSide === "right" ? {
          side: "right",
          gap: Math.max(0, surface2.right - field2.right) + 9,
          maxHeight: Math.max(0, window.innerHeight - 24)
        } : {
          side,
          gap: Math.max(
            0,
            side === "top" ? field2.top - surface2.top + topCushion : surface2.bottom - field2.bottom + bottomCushion
          ),
          maxHeight: side === "top" ? above : below
        };
        setLayout(
          (previous) => previous && previous.side === next.side && Math.abs(previous.gap - next.gap) < 0.1 && Math.abs(previous.maxHeight - next.maxHeight) < 0.1 ? previous : next
        );
      }
      frame2 = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame2);
  }, [open, enabled, trigger, content, anchor, preferredSide]);
  return layout2;
}
function captureMenuExit(content) {
  const menu2 = content.current;
  if (!menu2) return;
  const style = getComputedStyle(menu2);
  menu2.style.setProperty("--rc-exit-opacity", style.opacity);
  menu2.style.setProperty("--rc-exit-transform", style.transform);
  if (menu2.hasAttribute("data-model-owner")) {
    const wrapper = menu2.parentElement;
    wrapper?.style.setProperty(
      "--rc-exit-position",
      getComputedStyle(wrapper).transform
    );
  }
}
function Choice({
  label,
  icon: Icon2,
  items,
  value,
  onChange,
  mode,
  showLabel = false,
  kind = "",
  align = "end",
  onOpenChange,
  menuOwner,
  side = "top",
  hint = label,
  hintSide = "top",
  animated = false,
  settingMenu = false,
  renderValue,
  renderItem,
  itemText,
  disabled = false
}) {
  const { trigger, gap } = useComposerDock(side);
  const settings = useCaelosTheme();
  const reduced = useContext2(ComposerReducedMotion), [open, setOpen] = useState4(false);
  const content = useRef5(null);
  const interactedOutside = useRef5(false);
  const nestedDock = useSurfaceMenuDock(open, !!menuOwner, trigger, content, null, side);
  const changeOpen = (value2) => {
    if (value2) {
      interactedOutside.current = false;
      if (content.current) requestAnimationFrame(() => {
        if (content.current?.dataset.state === "open") content.current.focus();
      });
    } else captureMenuExit(content);
    setOpen(value2);
    onOpenChange?.(value2);
  };
  return /* @__PURE__ */ jsxs5(Dropdown2.Root, { open, onOpenChange: changeOpen, modal: !menuOwner, children: [
    /* @__PURE__ */ jsx7(Hint, { label: hint, mode, side: hintSide, disabled: open, children: /* @__PURE__ */ jsx7(Dropdown2.Trigger, { asChild: true, children: /* @__PURE__ */ jsxs5(
      "button",
      {
        type: "button",
        ref: trigger,
        onPointerDown: (e) => {
          if (e.button === 0 && !e.ctrlKey) e.preventDefault();
        },
        onClick: () => changeOpen(!open),
        className: showLabel ? `nc-composer-model ${kind}` : "nc-composer-icon",
        "aria-label": label,
        disabled,
        children: [
          Icon2 && /* @__PURE__ */ jsx7(Icon2, { size: 17 }),
          " ",
          renderValue ? renderValue(value) : showLabel && value
        ]
      }
    ) }) }),
    /* @__PURE__ */ jsx7(Dropdown2.Portal, { children: /* @__PURE__ */ jsxs5(
      Dropdown2.Content,
      {
        ...themeAttributes(settings),
        className: `${settingMenu ? `${card({ variant: "glass" })} ${headerControl({ kind: "smallPopover" })}` : "nc-composer-small-menu"}${animated ? " nc-composer-emerging-menu" : ""}`,
        "data-nc-header-control": settingMenu ? "" : void 0,
        "data-detail": settingMenu ? "settings" : void 0,
        "data-reduced": reduced,
        "data-model-owner": menuOwner,
        "data-mode": mode,
        "aria-label": label,
        onEscapeKeyDown: menuOwner && open ? (event) => event.stopPropagation() : void 0,
        onInteractOutside: () => {
          interactedOutside.current = true;
        },
        onCloseAutoFocus: menuOwner ? (event) => {
          event.preventDefault();
          if (!interactedOutside.current && (document.activeElement === document.body || content.current?.contains(document.activeElement))) {
            trigger.current?.focus({ preventScroll: true });
          }
        } : void 0,
        ref: content,
        side: nestedDock?.side ?? side,
        align,
        sideOffset: nestedDock?.gap ?? gap,
        style: menuOwner ? {
          maxHeight: nestedDock?.maxHeight,
          overflowY: "auto",
          boxSizing: "border-box",
          opacity: nestedDock ? void 0 : 0
        } : void 0,
        updatePositionStrategy: menuOwner && open ? "always" : "optimized",
        collisionPadding: 12,
        children: [
          settingMenu && /* @__PURE__ */ jsx7("strong", { style: { display: "block", marginBottom: "var(--sys-space-4)" }, children: label }),
          /* @__PURE__ */ jsx7(Dropdown2.RadioGroup, { value, onValueChange: onChange, children: items.map((item) => /* @__PURE__ */ jsxs5(
            Dropdown2.RadioItem,
            {
              className: settingMenu ? button({ variant: "text", size: "sm" }) : "nc-composer-small-item",
              style: settingMenu ? { width: "100%", justifyContent: "space-between", gap: "var(--sys-space-3)" } : void 0,
              value: item,
              textValue: itemText?.(item) ?? item,
              children: [
                renderItem ? renderItem(item) : item,
                /* @__PURE__ */ jsx7(Dropdown2.ItemIndicator, { children: /* @__PURE__ */ jsx7(Check2, { size: 13 }) })
              ]
            },
            item
          )) })
        ]
      }
    ) })
  ] });
}
function reviewPermissionIcon(permission) {
  return permission === "Full access" ? Rocket : permission === "Ask before acting" ? Hand : KeyRound2;
}
function ReviewAgentSelector({ review, agents, activeAgentId, onActiveAgentChange, models, reasoningLevels, mode, owner, context: context2, expanded, onPresenceChange, onPin }) {
  const settings = useCaelosTheme();
  const [state, setState] = useState4("closed");
  const trigger = useRef5(null), content = useRef5(null), timer = useRef5(null), child = useRef5(false);
  const active = agents.find((agent) => agent.id === activeAgentId) || agents[0];
  const dock = useSurfaceMenuDock(state !== "closed", true, trigger, content);
  const cancel = () => clearTimeout(timer.current);
  const change = (next) => {
    cancel();
    setState(next);
    onPresenceChange(next !== "closed");
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => {
      if (!child.current && state === "hover") change("closed");
    }, 260);
  };
  const pin = () => {
    change("pinned");
    onPin();
  };
  useEffect4(() => () => {
    clearTimeout(timer.current);
    onPresenceChange(false);
  }, []);
  return /* @__PURE__ */ jsxs5(Popover.Root, { open: state !== "closed", onOpenChange: (open) => change(open ? "pinned" : "closed"), children: [
    /* @__PURE__ */ jsx7(Popover.Trigger, { asChild: true, children: /* @__PURE__ */ jsxs5(
      "button",
      {
        type: "button",
        ref: trigger,
        className: "nc-composer-model nc-composer-agent nc-composer-review-agent",
        "aria-label": `Agent settings (${context2}): ${active.name}`,
        "aria-haspopup": "dialog",
        onPointerEnter: (event) => {
          if (event.pointerType !== "touch") {
            cancel();
            if (state === "closed") change("hover");
          }
        },
        onPointerLeave: leave,
        onClick: (event) => {
          event.preventDefault();
          state === "pinned" ? change("closed") : pin();
        },
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            pin();
            requestAnimationFrame(() => content.current?.querySelector("button")?.focus());
          }
        },
        children: [
          /* @__PURE__ */ jsx7(AgentAvatar, { agent: active, size: "sm", "aria-hidden": "true" }),
          expanded && /* @__PURE__ */ jsx7("span", { children: active.name })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx7(Popover.Portal, { children: /* @__PURE__ */ jsx7(
      Popover.Content,
      {
        ...themeAttributes(settings),
        ref: content,
        className: "nc-composer-small-menu nc-composer-emerging-menu nc-composer-review-table",
        "data-model-owner": owner,
        "data-composer-menu-surface": "",
        "data-expanded": state === "pinned",
        "data-reduced": settings.reducedMotion,
        "aria-label": `Agent settings table (${context2})`,
        side: dock?.side || "top",
        sideOffset: (dock?.gap || 0) + 3,
        align: "start",
        collisionPadding: 12,
        updatePositionStrategy: "always",
        style: { maxHeight: dock?.maxHeight, opacity: dock ? void 0 : 0 },
        onPointerEnter: cancel,
        onPointerLeave: leave,
        onOpenAutoFocus: (event) => event.preventDefault(),
        onCloseAutoFocus: (event) => event.preventDefault(),
        onInteractOutside: (event) => {
          if (event.target.closest?.("[data-model-owner]")?.getAttribute("data-model-owner") === owner || trigger.current?.contains(event.target)) event.preventDefault();
        },
        onEscapeKeyDown: (event) => {
          event.stopPropagation();
          if (child.current) event.preventDefault();
          else {
            change("closed");
            trigger.current?.focus();
          }
        },
        children: /* @__PURE__ */ jsx7("div", { role: "table", "data-context": context2, "aria-label": context2 === "reply" ? "Per-agent reply format" : "Per-agent model, reasoning and permissions", children: agents.map((agent) => {
          const value = review.values[agent.id];
          const PermissionIcon = reviewPermissionIcon(value.permission);
          const nestedChange = (open) => {
            child.current = open;
            cancel();
            if (open) pin();
          };
          return /* @__PURE__ */ jsxs5("div", { role: "row", className: "nc-composer-review-row", "data-agent-id": agent.id, "data-context": context2, children: [
            /* @__PURE__ */ jsx7("div", { role: "cell", children: /* @__PURE__ */ jsxs5(
              "button",
              {
                type: "button",
                className: "nc-composer-model nc-composer-review-identity",
                "aria-label": `Select agent: ${agent.name}`,
                "aria-pressed": active.id === agent.id,
                onClick: () => {
                  onActiveAgentChange(agent.id);
                  pin();
                },
                children: [
                  /* @__PURE__ */ jsx7(AgentAvatar, { agent, size: "sm", "aria-hidden": "true" }),
                  /* @__PURE__ */ jsx7("span", { className: "nc-composer-review-name", children: agent.name })
                ]
              }
            ) }),
            context2 === "reply" ? formats.map(({ id, label, Icon: Icon2 }) => /* @__PURE__ */ jsx7("div", { role: "cell", children: /* @__PURE__ */ jsxs5(
              "button",
              {
                type: "button",
                className: "nc-composer-format-option",
                "aria-label": `${agent.name}: ${label}`,
                "aria-pressed": value.replyFormat === id,
                onClick: () => {
                  review.onChange(agent.id, "replyFormat", id);
                  pin();
                },
                children: [
                  /* @__PURE__ */ jsx7(Icon2, { size: 18 }),
                  /* @__PURE__ */ jsx7("span", { className: "nc-composer-format-label", children: label })
                ]
              }
            ) }, id)) : /* @__PURE__ */ jsxs5(Fragment2, { children: [
              /* @__PURE__ */ jsx7("div", { role: "cell", children: /* @__PURE__ */ jsx7(
                Choice,
                {
                  label: `${agent.name} model: ${value.model}`,
                  hint: null,
                  items: models,
                  value: value.model,
                  onChange: (next) => review.onChange(agent.id, "model", next),
                  mode,
                  showLabel: true,
                  animated: true,
                  menuOwner: owner,
                  onOpenChange: nestedChange,
                  align: "start"
                }
              ) }),
              /* @__PURE__ */ jsx7("div", { role: "cell", children: /* @__PURE__ */ jsx7(
                Choice,
                {
                  label: `${agent.name} reasoning: ${value.reasoning}`,
                  hint: null,
                  items: reasoningLevels,
                  value: value.reasoning,
                  onChange: (next) => review.onChange(agent.id, "reasoning", next),
                  mode,
                  showLabel: true,
                  animated: true,
                  menuOwner: owner,
                  onOpenChange: nestedChange,
                  align: "start"
                }
              ) }),
              /* @__PURE__ */ jsx7("div", { role: "cell", children: /* @__PURE__ */ jsx7(
                Choice,
                {
                  label: `${agent.name} permissions: ${value.permission}`,
                  hint: value.permission,
                  hintSide: "right",
                  icon: PermissionIcon,
                  items: review.permissions,
                  value: value.permission,
                  onChange: (next) => review.onChange(agent.id, "permission", next),
                  mode,
                  animated: true,
                  menuOwner: owner,
                  onOpenChange: nestedChange,
                  align: "start"
                }
              ) })
            ] })
          ] }, agent.id);
        }) })
      }
    ) })
  ] });
}
function ModelSettings({
  model,
  reasoning,
  setModel,
  setReasoning,
  mode,
  models,
  reasoningLevels,
  agents,
  activeAgentId,
  onActiveAgentChange,
  review
}) {
  const [reviewTableOpen, setReviewTableOpen] = useState4(false);
  const activeAgent = agents?.find((agent) => agent.id === activeAgentId);
  const owner = useId4(), settingsId = useId4();
  const { trigger: dockRoot, gap } = useComposerDock("bottom");
  const [open, setOpen] = useState4("closed");
  const root = useRef5(null), trigger = useRef5(null), timer = useRef5(null), childOpen = useRef5(false);
  const bridge = useRef5(null), dock = useCompactDock(open, root, bridge, -78);
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setOpen("closed");
  };
  const enter = (e) => {
    if (e.pointerType === "touch") return;
    cancel();
    setOpen((s) => s === "closed" ? "hover" : s);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => {
      if (!childOpen.current) setOpen((s) => s === "hover" ? "closed" : s);
    }, 260);
  };
  const childChanged = (value) => {
    childOpen.current = value;
    cancel();
    if (value) setOpen("pinned");
  };
  const focusFirst = () => requestAnimationFrame(
    () => root.current?.querySelector(".nc-composer-model")?.focus()
  );
  useEffect4(() => {
    const outside = (e) => {
      if (!root.current?.contains(e.target) && e.target.closest?.("[data-model-owner]")?.getAttribute("data-model-owner") !== owner)
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      clearTimeout(timer.current);
    };
  }, []);
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      className: "nc-composer-brain",
      "data-state": open,
      ref: (el) => {
        root.current = el;
        dockRoot.current = el;
      },
      onPointerEnter: enter,
      onPointerLeave: leave,
      onBlur: () => {
        cancel();
        timer.current = setTimeout(() => {
          if (!childOpen.current && !root.current?.contains(document.activeElement) && document.activeElement?.closest?.("[data-model-owner]")?.getAttribute("data-model-owner") !== owner)
            close();
        }, 50);
      },
      onKeyDown: (e) => {
        if (e.key === "Escape" && !childOpen.current) {
          e.preventDefault();
          e.stopPropagation();
          close();
          trigger.current?.focus({ preventScroll: true });
        }
      },
      children: [
        /* @__PURE__ */ jsx7(
          Hint,
          {
            disabled: !!review && reviewTableOpen,
            label: review ? "change model/reasoning/permissions" : activeAgent ? `${activeAgent.name} \xB7 Change model/reasoning` : "Change model/reasoning",
            children: /* @__PURE__ */ jsx7(
              "button",
              {
                type: "button",
                ref: trigger,
                className: "nc-composer-icon nc-composer-settings-trigger",
                "aria-label": review ? `Model, reasoning and permissions: ${model}, ${reasoning}` : `Model and reasoning: ${model}, ${reasoning}`,
                "aria-expanded": open !== "closed",
                "aria-controls": open !== "closed" ? settingsId : void 0,
                onClick: () => {
                  cancel();
                  setOpen((s) => s === "pinned" ? "closed" : "pinned");
                },
                onKeyDown: (e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen("pinned");
                    focusFirst();
                  }
                },
                children: /* @__PURE__ */ jsx7(Brain, { size: 18 })
              }
            )
          }
        ),
        /* @__PURE__ */ jsx7(
          "div",
          {
            ref: bridge,
            className: "nc-composer-brain-bridge nc-composer-docked-bridge",
            "data-dock": dock.side,
            style: { paddingTop: gap, ...dock.style },
            "data-open": open !== "closed",
            inert: open === "closed",
            "aria-hidden": open === "closed",
            children: /* @__PURE__ */ jsxs5(
              "div",
              {
                id: settingsId,
                className: "nc-composer-model-settings",
                role: "group",
                "aria-label": activeAgent ? `Model and reasoning for ${activeAgent.name}` : "Model and reasoning",
                children: [
                  review && agents?.length > 1 && /* @__PURE__ */ jsx7(
                    ReviewAgentSelector,
                    {
                      review,
                      agents,
                      activeAgentId,
                      onActiveAgentChange,
                      models,
                      reasoningLevels,
                      mode,
                      owner,
                      context: "brain",
                      expanded: open === "pinned",
                      onPresenceChange: (present) => {
                        childOpen.current = present;
                        setReviewTableOpen(present);
                        cancel();
                      },
                      onPin: () => setOpen("pinned")
                    }
                  ),
                  !review && activeAgent && onActiveAgentChange && /* @__PURE__ */ jsx7(
                    Choice,
                    {
                      label: `Agent: ${activeAgent.name}`,
                      hint: null,
                      items: agents.map((agent) => agent.id),
                      value: activeAgent.id,
                      onChange: onActiveAgentChange,
                      mode,
                      showLabel: true,
                      kind: "nc-composer-agent",
                      onOpenChange: childChanged,
                      menuOwner: owner,
                      side: "top",
                      align: "start",
                      animated: true,
                      renderValue: () => /* @__PURE__ */ jsxs5(Fragment2, { children: [
                        /* @__PURE__ */ jsx7(
                          AgentAvatar,
                          {
                            agent: activeAgent,
                            size: "sm",
                            "aria-hidden": "true"
                          }
                        ),
                        /* @__PURE__ */ jsx7("span", { className: "nc-composer-agent-name", children: activeAgent.name })
                      ] }),
                      itemText: (id) => agents.find((agent) => agent.id === id)?.name ?? id,
                      renderItem: (id) => {
                        const agent = agents.find((item) => item.id === id);
                        return /* @__PURE__ */ jsxs5("span", { className: "nc-composer-agent-option", children: [
                          /* @__PURE__ */ jsx7(
                            AgentAvatar,
                            {
                              agent,
                              size: "sm",
                              "aria-hidden": "true"
                            }
                          ),
                          /* @__PURE__ */ jsx7("span", { children: agent.name })
                        ] });
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx7(
                    Choice,
                    {
                      label: `Model: ${model}`,
                      hint: null,
                      items: models,
                      value: model,
                      onChange: setModel,
                      mode,
                      showLabel: true,
                      onOpenChange: childChanged,
                      menuOwner: owner,
                      side: "top",
                      align: "start",
                      animated: true
                    }
                  ),
                  /* @__PURE__ */ jsx7(
                    Choice,
                    {
                      label: `Reasoning: ${reasoning}`,
                      hint: null,
                      items: reasoningLevels,
                      value: reasoning,
                      onChange: setReasoning,
                      mode,
                      showLabel: true,
                      kind: "nc-composer-reasoning",
                      onOpenChange: childChanged,
                      menuOwner: owner,
                      side: "top",
                      animated: true
                    }
                  ),
                  review && /* @__PURE__ */ jsx7(
                    Choice,
                    {
                      label: `Permissions: ${review.values[activeAgentId]?.permission}`,
                      hint: review.values[activeAgentId]?.permission,
                      hintSide: "right",
                      icon: reviewPermissionIcon(review.values[activeAgentId]?.permission),
                      items: review.permissions,
                      value: review.values[activeAgentId]?.permission,
                      onChange: (permission) => review.onChange(activeAgentId, "permission", permission),
                      mode,
                      onOpenChange: childChanged,
                      menuOwner: owner,
                      side: "top",
                      animated: true
                    }
                  )
                ]
              }
            )
          }
        )
      ]
    }
  );
}
function AddToConversation({ mode, onAdd, goalIcon, disabled, additions, additionLabels }) {
  const { trigger, gap } = useComposerDock();
  const shell = useContext2(ComposerAnchor);
  const settings = useCaelosTheme();
  const reduced = useContext2(ComposerReducedMotion), [open, setOpen] = useState4(false);
  const content = useRef5(null);
  const dock = useSurfaceMenuDock(open, !!shell, trigger, content, shell);
  const pendingAddition = useRef5(null);
  const changeOpen = (value) => {
    if (!value) captureMenuExit(content);
    setOpen(value);
  };
  return /* @__PURE__ */ jsxs5(Dropdown2.Root, { modal: false, open, onOpenChange: changeOpen, children: [
    /* @__PURE__ */ jsx7(Hint, { label: "Add to this conversation", mode, disabled: open, children: /* @__PURE__ */ jsx7(Dropdown2.Trigger, { asChild: true, children: /* @__PURE__ */ jsx7(
      "button",
      {
        type: "button",
        ref: trigger,
        onPointerDown: (e) => {
          if (e.button === 0 && !e.ctrlKey) e.preventDefault();
        },
        onClick: () => changeOpen(!open),
        className: "nc-composer-icon",
        "aria-label": "Add to this conversation",
        disabled,
        children: /* @__PURE__ */ jsx7(Plus, { size: 19 })
      }
    ) }) }),
    /* @__PURE__ */ jsx7(Dropdown2.Portal, { children: /* @__PURE__ */ jsx7(
      Dropdown2.Content,
      {
        ref: content,
        ...themeAttributes(settings),
        className: "nc-composer-small-menu nc-composer-emerging-menu",
        "data-reduced": reduced,
        "data-mode": mode,
        side: dock?.side ?? "top",
        align: "start",
        sideOffset: dock?.gap ?? gap + 2,
        style: {
          maxHeight: dock?.maxHeight,
          overflowY: "auto",
          boxSizing: "border-box",
          opacity: dock ? void 0 : 0
        },
        updatePositionStrategy: open ? "always" : "optimized",
        collisionPadding: 12,
        onCloseAutoFocus: (event) => {
          const item = pendingAddition.current;
          pendingAddition.current = null;
          if (item) {
            event.preventDefault();
            window.setTimeout(() => onAdd(item), 0);
          }
        },
        children: [
          ["File or folder", Folder],
          ["Agent", Bot],
          ["Goal", Goal],
          ["Session instruction", FileText]
        ].filter(([item]) => !additions || additions.includes(item)).map(([item, Icon2]) => /* @__PURE__ */ jsxs5(
          Dropdown2.Item,
          {
            className: "nc-composer-small-item",
            style: { justifyContent: "flex-start", gap: 10 },
            onSelect: () => {
              pendingAddition.current = item;
            },
            children: [
              item === "Goal" && goalIcon ? /* @__PURE__ */ jsx7("span", { "aria-hidden": "true", children: goalIcon }) : /* @__PURE__ */ jsx7(
                Icon2,
                {
                  size: 16,
                  strokeWidth: 1.6,
                  "aria-hidden": "true",
                  style: { flexShrink: 0 }
                }
              ),
              /* @__PURE__ */ jsx7("span", { children: additionLabels?.[item] ?? item })
            ]
          },
          item
        ))
      }
    ) })
  ] });
}
function ComposerChoiceInternal({ label, value, options, onValueChange, menuOwner }) {
  const { theme, reducedMotion } = useCaelosTheme();
  return /* @__PURE__ */ jsx7(ComposerReducedMotion.Provider, { value: reducedMotion, children: /* @__PURE__ */ jsx7(
    Choice,
    {
      label,
      value,
      items: options,
      onChange: onValueChange,
      mode: theme,
      showLabel: true,
      animated: true,
      settingMenu: true,
      menuOwner,
      align: "start"
    }
  ) });
}
function PermissionControlInternal({ value, onValueChange, options, showLabel = false, menuOwner, menuSide = "top" }) {
  const { theme } = useCaelosTheme();
  return /* @__PURE__ */ jsx7(
    Choice,
    {
      label: `Permissions: ${value}`,
      side: menuSide,
      showLabel,
      menuOwner,
      icon: PermissionsIcon2,
      animated: true,
      items: options,
      value,
      onChange: onValueChange,
      mode: theme,
      align: "start"
    }
  );
}
function ComposerInternal({
  experimentalAgentSettings,
  sending = false,
  onStop,
  allowEmptySubmit = false,
  sendDisabled = false,
  showReplyFormat = true,
  additions,
  additionLabels,
  textareaRef,
  textareaTestId,
  value,
  onValueChange,
  onSend,
  model,
  models,
  onModelChange,
  reasoning,
  reasoningLevels,
  onReasoningChange,
  replyFormat,
  onReplyFormatChange,
  live,
  onLiveChange,
  onDictate,
  onAdd,
  disabled = false,
  commands,
  agents,
  activeAgentId,
  onActiveAgentChange,
  placeholder = "What\u2019s on your mind?",
  label = "Message",
  context: context2,
  goal = "",
  onGoalChange,
  instruction = "",
  onInstructionChange,
  goalIcon = /* @__PURE__ */ jsx7(Goal, { size: 16, strokeWidth: 1.6, "aria-hidden": "true" }),
  header,
  footer
}) {
  const { theme: mode, reducedMotion: reduced } = useCaelosTheme();
  const settings = useCaelosTheme();
  const [editing, setEditing] = useState4(null), [contextDraft, setContextDraft] = useState4("");
  const contextId = useId4();
  const contextReturnFocus = useRef5(null), contextOutside = useRef5(false);
  const editContext = (kind) => {
    contextReturnFocus.current = document.activeElement?.closest(".nc-composer-pill") ? document.activeElement : null;
    contextOutside.current = false;
    setContextDraft(kind === "Goal" ? goal : instruction);
    setEditing(kind);
  };
  const add = (kind) => {
    if (kind === "Goal" && onGoalChange || kind === "Session instruction" && onInstructionChange) {
      editContext(kind);
      return true;
    }
    onAdd?.(kind);
    return false;
  };
  const contextPills = [["Goal", goal, onGoalChange, goalIcon], ["Instruction", instruction, onInstructionChange, /* @__PURE__ */ jsx7(FileText, { size: 16, strokeWidth: 1.6, "aria-hidden": "true" }, "instruction")]];
  const [shell, setShell] = useState4(null), field2 = useRef5(null), [height, setHeight] = useState4(24);
  useLayoutEffect4(() => {
    const el = field2.current;
    if (!el) return;
    const measure = () => {
      el.style.height = "0px";
      const natural = el.scrollHeight, h = Math.min(192, Math.max(24, natural));
      el.style.height = `${h}px`;
      el.style.overflowY = natural > 192 ? "auto" : "hidden";
      setHeight(h);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el.parentElement);
    return () => observer.disconnect();
  }, [value]);
  const suggestionPicker = useComposerSuggestions({
    value,
    onValueChange,
    commands,
    agents,
    disabled,
    field: field2,
    shell
  });
  const send = () => {
    if (!disabled && !sending && !sendDisabled && (value.trim() || allowEmptySubmit)) {
      onSend({ text: value, replyFormat, model, reasoning, ...goal ? { goal } : {}, ...instruction ? { instruction } : {} });
      field2.current?.focus({ preventScroll: true });
    }
  };
  return /* @__PURE__ */ jsx7(ComposerAnchor.Provider, { value: shell, children: /* @__PURE__ */ jsx7(ComposerReducedMotion.Provider, { value: reduced, children: /* @__PURE__ */ jsxs5("div", { className: "nc-composer-workspace", children: [
    header && /* @__PURE__ */ jsx7("div", { className: "nc-composer-recipient", children: header }),
    /* @__PURE__ */ jsxs5(Popover.Root, { open: !!editing, onOpenChange: (open) => {
      if (!open) setEditing(null);
    }, children: [
      /* @__PURE__ */ jsx7(Popover.Anchor, { asChild: true, children: /* @__PURE__ */ jsxs5(
        "div",
        {
          ref: setShell,
          className: "nc-composer-shell",
          style: { borderRadius: height > 48 ? 22 : 27 },
          children: [
            /* @__PURE__ */ jsx7(
              "textarea",
              {
                ref: (element) => {
                  field2.current = element;
                  if (typeof textareaRef === "function") textareaRef(element);
                  else if (textareaRef) textareaRef.current = element;
                },
                "data-testid": textareaTestId,
                value,
                ...suggestionPicker.fieldProps,
                rows: 1,
                "aria-label": label,
                placeholder,
                disabled,
                onKeyDown: (e) => {
                  if (suggestionPicker.onKeyDown(e)) return;
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }
              }
            ),
            context2 && /* @__PURE__ */ jsx7("div", { className: "nc-composer-context", children: context2 }),
            /* @__PURE__ */ jsxs5("div", { className: "nc-composer-controls", children: [
              /* @__PURE__ */ jsxs5("div", { className: "nc-composer-left", children: [
                (onAdd || onGoalChange || onInstructionChange) && /* @__PURE__ */ jsx7(AddToConversation, { additions, additionLabels, mode, onAdd: add, goalIcon, disabled }),
                onDictate && /* @__PURE__ */ jsx7(Hint, { label: "Dictate a message", children: /* @__PURE__ */ jsx7(
                  "button",
                  {
                    type: "button",
                    className: "nc-composer-icon",
                    "aria-label": "Dictate a message",
                    disabled,
                    onClick: onDictate,
                    children: /* @__PURE__ */ jsx7(Mic, { size: 17 })
                  }
                ) })
              ] }),
              (goal || instruction) && /* @__PURE__ */ jsx7("div", { className: "nc-composer-pills", "aria-label": "Conversation context", children: contextPills.filter(([, text]) => text).map(([name, text, change, icon]) => /* @__PURE__ */ jsxs5("div", { className: "nc-composer-pill", children: [
                /* @__PURE__ */ jsx7(Hint, { label: /* @__PURE__ */ jsx7("span", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, children: text }), disabled: !!editing, children: /* @__PURE__ */ jsxs5(
                  "button",
                  {
                    type: "button",
                    className: "nc-composer-pill-label",
                    "aria-label": `${change ? "Edit" : "View"} ${name.toLowerCase()}`,
                    "aria-haspopup": change ? "dialog" : void 0,
                    disabled,
                    onClick: () => {
                      if (change) editContext(name === "Goal" ? "Goal" : "Session instruction");
                    },
                    children: [
                      icon,
                      /* @__PURE__ */ jsx7("span", { children: name })
                    ]
                  }
                ) }),
                change && /* @__PURE__ */ jsx7(
                  "button",
                  {
                    type: "button",
                    className: "nc-composer-pill-remove",
                    "aria-label": `Remove ${name.toLowerCase()}`,
                    disabled,
                    onClick: () => {
                      change("");
                      field2.current?.focus({ preventScroll: true });
                    },
                    children: /* @__PURE__ */ jsx7(X2, { size: 12, "aria-hidden": "true" })
                  }
                )
              ] }, name)) }),
              /* @__PURE__ */ jsxs5("div", { className: "nc-composer-right", children: [
                /* @__PURE__ */ jsx7(
                  ModelSettings,
                  {
                    review: experimentalAgentSettings,
                    agents,
                    activeAgentId,
                    onActiveAgentChange,
                    model,
                    reasoning,
                    setModel: onModelChange,
                    setReasoning: onReasoningChange,
                    mode,
                    models,
                    reasoningLevels
                  }
                ),
                showReplyFormat && /* @__PURE__ */ jsx7(
                  ReplyFormat,
                  {
                    review: experimentalAgentSettings,
                    agents,
                    activeAgentId,
                    onActiveAgentChange,
                    models,
                    reasoningLevels,
                    value: replyFormat,
                    onChange: onReplyFormatChange,
                    mode
                  }
                ),
                /* @__PURE__ */ jsx7(Hint, { label: sending ? "Stop response" : value.trim() || allowEmptySubmit || !onLiveChange ? "Send message" : "Live Conversation Mode", children: /* @__PURE__ */ jsx7(
                  "button",
                  {
                    type: "button",
                    className: "nc-composer-main-action",
                    "data-testid": sending ? "stop-button" : "send-button",
                    "data-ready": !!value.trim() || allowEmptySubmit || sending,
                    disabled: sending ? !onStop : disabled || sendDisabled || !value.trim() && !allowEmptySubmit && !onLiveChange,
                    "aria-label": sending ? "Stop response" : value.trim() || allowEmptySubmit || !onLiveChange ? "Send message" : "Live Conversation Mode",
                    "aria-pressed": !sending && onLiveChange && !value.trim() && !allowEmptySubmit ? live : void 0,
                    onClick: () => sending ? onStop?.() : value.trim() || allowEmptySubmit || !onLiveChange ? send() : onLiveChange?.(!live),
                    children: sending || live ? /* @__PURE__ */ jsx7(Square, { size: 15 }) : value.trim() || allowEmptySubmit || !onLiveChange ? /* @__PURE__ */ jsx7(ArrowUp, { size: 19 }) : /* @__PURE__ */ jsx7(AudioLines, { size: 20 })
                  }
                ) })
              ] })
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx7(Popover.Portal, { children: /* @__PURE__ */ jsx7(
        Popover.Content,
        {
          ...themeAttributes(settings),
          className: "nc-composer-context-editor",
          side: "top",
          align: "start",
          sideOffset: 3,
          collisionPadding: 12,
          "aria-label": editing === "Goal" ? "Goal details" : "Instruction details",
          onInteractOutside: () => {
            contextOutside.current = true;
          },
          onCloseAutoFocus: (event) => {
            event.preventDefault();
            if (!contextOutside.current) (contextReturnFocus.current || field2.current)?.focus({ preventScroll: true });
          },
          children: /* @__PURE__ */ jsxs5("form", { onSubmit: (event) => {
            event.preventDefault();
            if (disabled || !contextDraft.trim()) return;
            (editing === "Goal" ? onGoalChange : onInstructionChange)?.(contextDraft.trim());
            setEditing(null);
          }, children: [
            /* @__PURE__ */ jsx7(
              TextArea,
              {
                label: editing === "Goal" ? "Goal" : "Session instruction",
                style: { minHeight: 90, maxHeight: "40vh" },
                maxLength: 4e3,
                id: contextId,
                value: contextDraft,
                onChange: (event) => setContextDraft(event.target.value),
                rows: 3,
                placeholder: editing === "Goal" ? "What would you like to accomplish?" : "How should I approach this conversation?",
                disabled
              }
            ),
            /* @__PURE__ */ jsxs5("div", { className: "nc-composer-context-actions", children: [
              /* @__PURE__ */ jsx7("button", { type: "button", className: button({ variant: "text", size: "sm" }), onClick: () => setEditing(null), children: "Cancel" }),
              /* @__PURE__ */ jsx7("button", { type: "submit", className: button({ variant: "primary", size: "sm" }), disabled: disabled || !contextDraft.trim(), children: "Save" })
            ] })
          ] })
        }
      ) })
    ] }),
    suggestionPicker.popup,
    footer
  ] }) }) });
}

// src/Composer.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
function Composer(props) {
  return /* @__PURE__ */ jsx8(
    ComposerInternal,
    {
      experimentalAgentSettings: void 0,
      onStop: void 0,
      additions: void 0,
      additionLabels: void 0,
      textareaRef: void 0,
      textareaTestId: void 0,
      commands: void 0,
      agents: void 0,
      activeAgentId: void 0,
      onActiveAgentChange: void 0,
      context: void 0,
      header: void 0,
      footer: void 0,
      live: false,
      onGoalChange: void 0,
      onInstructionChange: void 0,
      onAdd: void 0,
      onDictate: void 0,
      onLiveChange: void 0,
      ...props
    }
  );
}
function PermissionControl(props) {
  return /* @__PURE__ */ jsx8(PermissionControlInternal, { menuOwner: void 0, ...props });
}
function ComposerChoice(props) {
  return /* @__PURE__ */ jsx8(ComposerChoiceInternal, { menuOwner: void 0, ...props });
}

// src/tokens.ts
var approvedTokens = {
  "--sys-accent": "#678BEC",
  "--sys-accent-glow": "rgba(103, 139, 236, 0.28)",
  "--sys-accent-hot": "#C75F66",
  "--sys-accent-hover": "#779CFF",
  "--sys-accent-line": "rgba(103, 139, 236, 0.22)",
  "--sys-accent-on-tint": "rgba(169, 192, 249, 0.9)",
  "--sys-accent-tint": "rgba(103, 139, 236, 0.1)",
  "--sys-border-1": "var(--sys-hair-1)",
  "--sys-border-2": "var(--sys-hair-2)",
  "--sys-border-3": "var(--sys-hair-3)",
  "--sys-chrome": "#080817",
  "--sys-control-circle-size": "34px",
  "--sys-conversation-readonly-max": "780px",
  "--sys-ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "--sys-ease-snap": "cubic-bezier(0.2, 0.85, 0.25, 1)",
  "--sys-editor-min-height": "300px",
  "--sys-elev-0": "0 0 0 rgba(0, 0, 0, 0)",
  "--sys-elev-1": "0 2.5px 12px rgba(0, 0, 0, 0.144), 0 1.05px 4.5px rgba(0, 0, 0, 0.163)",
  "--sys-elev-2": "0 6.37px 30.59px rgba(0, 0, 0, 0.166), 0 2.68px 11.47px rgba(0, 0, 0, 0.187)",
  "--sys-elev-3": "0 11.02px 52.88px rgba(0, 0, 0, 0.187), 0 4.63px 19.83px rgba(0, 0, 0, 0.211)",
  "--sys-elevated": "#161627",
  "--sys-elevated-2": "#1E1E30",
  "--sys-ground": "#100F1C",
  "--sys-hair-1": "rgba(255, 255, 255, 0.045)",
  "--sys-hair-2": "rgba(255, 255, 255, 0.090)",
  "--sys-hair-3": "rgba(255, 255, 255, 0.140)",
  "--sys-message-part-max": "450px",
  "--sys-motion-base": "240ms",
  "--sys-motion-fast": "132ms",
  "--sys-motion-slow": "360ms",
  "--sys-radius-full": "999px",
  "--sys-radius-lg": "13.5px",
  "--sys-radius-md": "10px",
  "--sys-radius-sm": "7.41px",
  "--sys-radius-xl": "18.23px",
  "--sys-sem-atmospheric": "#8879A0",
  "--sys-sem-danger": "#C25B62",
  "--sys-sem-danger-glow": "rgba(194, 91, 98, 0.28)",
  "--sys-sem-danger-hover": "#D56C72",
  "--sys-sem-danger-line": "rgba(194, 91, 98, 0.26)",
  "--sys-sem-danger-on-tint": "rgba(230, 166, 167, 0.9)",
  "--sys-sem-danger-tint": "rgba(194, 91, 98, 0.14)",
  "--sys-sem-done": "#5B7D73",
  "--sys-sem-done-on-tint": "rgba(158, 188, 178, 0.9)",
  "--sys-sem-neutral": "#8F8A80",
  "--sys-sem-progress": "#E8B87A",
  "--sys-sem-progress-glow": "rgba(232, 184, 122, 0.28)",
  "--sys-sem-progress-hover": "#FACA8B",
  "--sys-sem-progress-line": "rgba(232, 184, 122, 0.26)",
  "--sys-sem-progress-on-tint": "rgba(241, 211, 173, 0.9)",
  "--sys-sem-progress-tint": "rgba(232, 184, 122, 0.14)",
  "--sys-sem-ready": "#8E96CC",
  "--sys-sem-ready-glow": "rgba(142, 150, 204, 0.28)",
  "--sys-sem-ready-line": "rgba(142, 150, 204, 0.26)",
  "--sys-sem-ready-on-tint": "rgba(189, 195, 233, 0.9)",
  "--sys-sem-ready-tint": "rgba(142, 150, 204, 0.14)",
  "--sys-sem-sage": "#7A9E93",
  "--sys-sem-sage-glow": "rgba(122, 158, 147, 0.28)",
  "--sys-sem-sage-line": "rgba(122, 158, 147, 0.26)",
  "--sys-sem-sage-on-tint": "rgba(173, 203, 194, 0.9)",
  "--sys-sem-sage-tint": "rgba(122, 158, 147, 0.14)",
  "--sys-sem-structural": "#4E4C82",
  "--sys-sidebar-control-size": "44px",
  "--sys-sidebar-icon-size": "20px",
  "--sys-sidebar-label-size": "13px",
  "--sys-sidebar-rail-width": "calc(var(--sys-sidebar-control-size) + var(--sys-space-4) * 2)",
  "--sys-space-1": "3px",
  "--sys-space-2": "6px",
  "--sys-space-3": "9px",
  "--sys-space-4": "12px",
  "--sys-space-5": "15px",
  "--sys-space-6": "18px",
  "--sys-space-7": "24px",
  "--sys-space-8": "30px",
  "--sys-text-faint": "#53546E",
  "--sys-text-primary": "#EDE3CF",
  "--sys-text-secondary": "#9B958B",
  "--sys-text-tertiary": "#717184",
  "--sys-top": "#262639",
  "--sys-type-body": "14px",
  "--sys-type-caption": "12px",
  // Approved navigation circle, shared by sidebar create actions (2026-09-23).
  "--sys-workspace-content-max": "1024px"
};

// src/overlays.tsx
import { forwardRef as forwardRef3, useEffect as useEffect6, useId as useId5, useRef as useRef8, useState as useState6 } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixContextMenu from "@radix-ui/react-context-menu";
import * as Dropdown3 from "@radix-ui/react-dropdown-menu";
import { Check as Check3, Minus, X as X3 } from "lucide-react";

// src/SidePanel.tsx
import { useEffect as useEffect5, useRef as useRef7, useState as useState5 } from "react";

// src/foundation.tsx
import { forwardRef as forwardRef2, useRef as useRef6 } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { Toaster as Sonner } from "sonner";
import { toast } from "sonner";
import { jsx as jsx9 } from "react/jsx-runtime";
var cx3 = (...values) => values.filter(Boolean).join(" ");
var Popover2 = RadixPopover.Root;
var PopoverTrigger = RadixPopover.Trigger;
var PopoverClose = RadixPopover.Close;
var PopoverContent = forwardRef2(function PopoverContent2({ className, ...props }, ref) {
  const settings = useCaelosTheme();
  return /* @__PURE__ */ jsx9(RadixPopover.Portal, { children: /* @__PURE__ */ jsx9(RadixPopover.Content, { sideOffset: 8, collisionPadding: 12, ...props, ref, ...themeAttributes(settings), className: cx3(cx3(card({ variant: "glass" }), foundation({ kind: "popover" })), className) }) });
});
var Range = forwardRef2(function Range2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx9("input", { ...props, type: "range", ref, className: cx3(foundation({ kind: "range" }), className) });
});
var Checkbox = forwardRef2(function Checkbox2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx9("input", { ...props, type: "checkbox", ref, className: cx3(foundation({ kind: "checkbox" }), className) });
});
var Heading = forwardRef2(function Heading2({ as: Tag = "h2", size = "section", tone, className, ...props }, ref) {
  return /* @__PURE__ */ jsx9(Tag, { ...props, ref, className: cx3(typography({ role: size, tone }), className) });
});
var Text = forwardRef2(function Text2({ as: Tag = "span", variant = "body", tone, className, ...props }, ref) {
  return /* @__PURE__ */ jsx9(Tag, { ...props, ref, className: cx3(typography({ role: variant, tone }), className) });
});
function Separator({ orientation = "horizontal", decorative = true, className, ...props }) {
  return /* @__PURE__ */ jsx9("div", { ...props, role: decorative ? "none" : "separator", "aria-orientation": orientation, className: cx3(foundation({ kind: "separator" }), className) });
}
function Progress({ value, max = 100, label, className, ...props }) {
  const ceiling = Number.isFinite(max) && max > 0 ? max : 1;
  const amount = Number.isFinite(value) ? Math.min(ceiling, Math.max(0, value)) : 0;
  return /* @__PURE__ */ jsx9("progress", { ...props, value: amount, max: ceiling, "aria-label": label, className: cx3(foundation({ kind: "progress" }), className) });
}
function Loading({ children = "Loading\u2026", ...props }) {
  return /* @__PURE__ */ jsx9(Text, { ...props, variant: "small", tone: "muted", role: "status", "aria-live": "polite", children });
}
var LinkButton = forwardRef2(function LinkButton2({ variant = "tonal", size = "md", danger, className, ...props }, ref) {
  return /* @__PURE__ */ jsx9("a", { ...props, ref, className: cx3(button({ variant, size, danger }), className) });
});
function Toaster({ toastOptions, icons: icons3, ...props }) {
  const settings = useCaelosTheme();
  return /* @__PURE__ */ jsx9("div", { ...themeAttributes(settings), children: /* @__PURE__ */ jsx9(Sonner, { theme: settings.theme, ...props, icons: { loading: /* @__PURE__ */ jsx9("span", { "aria-label": "Loading", children: "\u2026" }), ...icons3 }, toastOptions: { ...toastOptions, style: { fontFamily: "inherit", fontSize: 13, lineHeight: "19.5px", background: "var(--nc-opaque)", color: "var(--il-ink)", border: "1px solid var(--il-edge)", ...toastOptions?.style } } }) });
}
var Surface = forwardRef2(function Surface2({ as: Tag = "div", layer = "ground", texture = "auto", className, ...props }, ref) {
  return /* @__PURE__ */ jsx9(Tag, { ...props, ref, "data-surface": layer, "data-texture": texture, className: cx3(surface({ layer, texture }), className) });
});
function ResizeHandle({ value, min, max, step = 8, side = "left", label, onValueChange, className, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onKeyDown, ...props }) {
  const drag = useRef6(null);
  const direction = side === "right" ? -1 : 1;
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const stop = (element) => {
    drag.current = null;
    delete element.dataset.dragging;
  };
  return /* @__PURE__ */ jsx9(
    "div",
    {
      ...props,
      role: "separator",
      tabIndex: 0,
      "aria-label": label,
      "aria-orientation": "vertical",
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": clamp(value),
      className: cx3(foundation({ kind: "resize" }), className),
      onPointerDown: (event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        drag.current = { x: event.clientX, value, id: event.pointerId };
        event.currentTarget.dataset.dragging = "true";
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event) => {
        onPointerMove?.(event);
        if (!event.defaultPrevented && drag.current?.id === event.pointerId) onValueChange(clamp(drag.current.value + direction * (event.clientX - drag.current.x)));
      },
      onPointerUp: (event) => {
        onPointerUp?.(event);
        stop(event.currentTarget);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel: (event) => {
        onPointerCancel?.(event);
        stop(event.currentTarget);
      },
      onLostPointerCapture: (event) => {
        onLostPointerCapture?.(event);
        stop(event.currentTarget);
      },
      onKeyDown: (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const next = event.key === "Home" ? min : event.key === "End" ? max : event.key === "ArrowLeft" ? value - direction * step : event.key === "ArrowRight" ? value + direction * step : null;
        if (next !== null) {
          event.preventDefault();
          onValueChange(clamp(next));
        }
      }
    }
  );
}

// src/SidePanel.tsx
import { jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
function SidePanelResizeHandle({ side = "left", className, ...props }) {
  return /* @__PURE__ */ jsx10(ResizeHandle, { ...props, side, "data-panel-side": side, className: [sidePanel({ side }).handle, className].filter(Boolean).join(" ") });
}
function SidePanel({
  side,
  label,
  storageKey,
  defaultWidth = 480,
  defaultRatio,
  minWidth = 280,
  maxWidth = 1200,
  reserveWidth = 320,
  full = false,
  style,
  className,
  children,
  ...props
}) {
  const ref = useRef7(null);
  const [available, setAvailable] = useState5();
  const [preferred, setPreferred] = useState5();
  useEffect5(() => {
    setPreferred(void 0);
    if (!storageKey) return;
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved > 0) setPreferred(saved);
    } catch {
    }
  }, [storageKey]);
  useEffect5(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => setAvailable(parent.clientWidth));
    setAvailable(parent.clientWidth);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  const maximum = Math.min(maxWidth, Math.max(0, (available ?? maxWidth + reserveWidth) - reserveWidth));
  const minimum = Math.min(minWidth, maximum);
  const width = Math.min(maximum, Math.max(minimum, preferred ?? (defaultRatio && available ? available * defaultRatio : defaultWidth)));
  return /* @__PURE__ */ jsxs6(
    "div",
    {
      ...props,
      ref,
      "data-side-panel": side,
      className: [sidePanel({ side }).root, className].filter(Boolean).join(" "),
      style: { ...style, position: "relative", width: full ? "100%" : available === void 0 && defaultRatio ? `${defaultRatio * 100}%` : width },
      children: [
        !full && /* @__PURE__ */ jsx10(SidePanelResizeHandle, { side, label, value: width, min: minimum, max: maximum, onValueChange: (next) => {
          setPreferred(next);
          if (storageKey) try {
            localStorage.setItem(storageKey, String(next));
          } catch {
          }
        } }),
        children
      ]
    }
  );
}

// src/overlays.tsx
import { jsx as jsx11, jsxs as jsxs7 } from "react/jsx-runtime";
var cx4 = (...values) => values.filter(Boolean).join(" ");
function OverlaySurface({
  open,
  onOpenChange,
  onEscapeKeyDown,
  title: title2,
  description,
  children,
  actions: actions2,
  className,
  style,
  initialFocusRef,
  returnFocusRef,
  bodyLabel = "Dialog content",
  closeLabel = "Close dialog",
  drawer = false
}) {
  const settings = useCaelosTheme();
  const styles = overlay({ placement: drawer ? "drawer" : "dialog" });
  const returnFocus = useRef8(null);
  const descriptionId = useId5();
  const contentRef = useRef8(null);
  const [drawerWidth, setDrawerWidth] = useState6();
  const [viewportWidth, setViewportWidth] = useState6(0);
  useEffect6(() => {
    if (!drawer) return;
    const measure = () => setViewportWidth(window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [drawer]);
  const drawerMax = Math.min(960, Math.max(280, viewportWidth - 24));
  const requestedWidth = drawerWidth ?? (typeof style?.width === "number" ? style.width : typeof style?.width === "string" && style.width.endsWith("px") ? parseFloat(style.width) : 480);
  const renderedWidth = Math.min(drawerMax, Math.max(280, requestedWidth));
  return /* @__PURE__ */ jsx11(RadixDialog.Root, { open, onOpenChange, children: /* @__PURE__ */ jsxs7(RadixDialog.Portal, { children: [
    /* @__PURE__ */ jsx11(RadixDialog.Overlay, { ...themeAttributes(settings), className: styles.backdrop }),
    /* @__PURE__ */ jsxs7(
      RadixDialog.Content,
      {
        ref: contentRef,
        ...themeAttributes(settings),
        className: cx4(cx4(cx4(card({ variant: "glass" }), styles.content), drawer ? sidePanel({ side: "right" }).root : void 0), className),
        style: drawer && viewportWidth >= 768 ? { ...style, width: renderedWidth } : style,
        "aria-describedby": description ? descriptionId : void 0,
        onEscapeKeyDown,
        onOpenAutoFocus: (event) => {
          if (document.activeElement instanceof HTMLElement && !contentRef.current?.contains(document.activeElement)) returnFocus.current = document.activeElement;
          const target = initialFocusRef?.current ?? contentRef.current?.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [role="combobox"]:not([disabled])') ?? contentRef.current;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        },
        onCloseAutoFocus: (event) => {
          const target = returnFocusRef?.current ?? returnFocus.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        },
        children: [
          drawer && viewportWidth >= 768 && /* @__PURE__ */ jsx11(SidePanelResizeHandle, { side: "right", label: "Drawer width", value: renderedWidth, min: 280, max: drawerMax, onValueChange: setDrawerWidth }),
          /* @__PURE__ */ jsxs7("div", { className: styles.header, children: [
            /* @__PURE__ */ jsx11(RadixDialog.Title, { asChild: true, children: /* @__PURE__ */ jsx11("div", { className: styles.title, "data-heading": typeof title2 === "string" ? "" : void 0, children: title2 }) }),
            actions2,
            /* @__PURE__ */ jsx11(RadixDialog.Close, { asChild: true, children: /* @__PURE__ */ jsx11(IconButton, { variant: "text", label: closeLabel, tooltip: false, icon: /* @__PURE__ */ jsx11(X3, { size: 15 }) }) })
          ] }),
          /* @__PURE__ */ jsxs7(ScrollArea, { viewportLabel: bodyLabel, className: styles.body, children: [
            description && /* @__PURE__ */ jsx11(RadixDialog.Description, { id: descriptionId, children: description }),
            children
          ] })
        ]
      }
    )
  ] }) });
}
function Dialog(props) {
  return /* @__PURE__ */ jsx11(OverlaySurface, { ...props });
}
function Drawer(props) {
  return /* @__PURE__ */ jsx11(OverlaySurface, { ...props, drawer: true });
}
var ContextMenu = RadixContextMenu.Root;
var ContextMenuTrigger = forwardRef3(function ContextMenuTrigger2({ onKeyDown, disabled, ...props }, ref) {
  return /* @__PURE__ */ jsx11(RadixContextMenu.Trigger, { ...props, ref, disabled, onKeyDown: (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || !(event.key === "ContextMenu" || event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const target = event.target instanceof HTMLElement ? event.target : event.currentTarget;
    const bounds = target.getBoundingClientRect();
    target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: bounds.left + bounds.width / 2, clientY: bounds.bottom }));
  } });
});
var ContextMenuContent = forwardRef3(function ContextMenuContent2({ className, style, target, ...props }, ref) {
  const settings = useCaelosTheme();
  return /* @__PURE__ */ jsx11(RadixContextMenu.Portal, { children: /* @__PURE__ */ jsx11(
    RadixContextMenu.Content,
    {
      ...props,
      ref,
      ...themeAttributes(settings),
      collisionPadding: 12,
      "data-context-menu-target": target,
      className: cx4(contextMenu({ target }).content, className),
      style
    }
  ) });
});
var ContextMenuItem = forwardRef3(function ContextMenuItem2({ className, destructive, ...props }, ref) {
  return /* @__PURE__ */ jsx11(RadixContextMenu.Item, { ...props, ref, "data-destructive": destructive || void 0, className: cx4(contextMenu().item, className) });
});
function ContextMenuSeparator(props) {
  return /* @__PURE__ */ jsx11(RadixContextMenu.Separator, { ...props, className: cx4(contextMenu().separator, props.className) });
}
var ActionMenuRoot = Dropdown3.Root;
var ActionMenuTrigger = Dropdown3.Trigger;
var ActionMenuContent = forwardRef3(function ActionMenuContent2({ className, ...props }, ref) {
  const settings = useCaelosTheme();
  return /* @__PURE__ */ jsx11(Dropdown3.Portal, { children: /* @__PURE__ */ jsx11(Dropdown3.Content, { sideOffset: 8, collisionPadding: 12, ...props, ref, ...themeAttributes(settings), className: cx4(menu({ layout: "action" }).content, className) }) });
});
var ActionMenuItem = forwardRef3(function ActionMenuItem2({ className, ...props }, ref) {
  return /* @__PURE__ */ jsx11(Dropdown3.Item, { ...props, ref, className: cx4(menu({ layout: "action" }).item, className) });
});
var ActionMenuCheckboxItem = forwardRef3(function ActionMenuCheckboxItem2({ className, children, checked, ...props }, ref) {
  return /* @__PURE__ */ jsxs7(Dropdown3.CheckboxItem, { ...props, ref, checked, className: cx4(menu({ layout: "action" }).item, className), children: [
    /* @__PURE__ */ jsx11("span", { "aria-hidden": "true", style: { width: 14, height: 14, flexShrink: 0 }, children: /* @__PURE__ */ jsx11(Dropdown3.ItemIndicator, { children: checked === "indeterminate" ? /* @__PURE__ */ jsx11(Minus, { size: 14 }) : /* @__PURE__ */ jsx11(Check3, { size: 14 }) }) }),
    children
  ] });
});
function ActionMenuSeparator(props) {
  return /* @__PURE__ */ jsx11(Dropdown3.Separator, { ...props, className: cx4(menu({ layout: "action" }).separator, props.className) });
}

// src/RippleLoader.tsx
import { jsx as jsx12, jsxs as jsxs8 } from "react/jsx-runtime";
var cx5 = (...values) => values.filter(Boolean).join(" ");
function RippleLoader({ size = 12, gap, label = "Working", paused = false, className, style }) {
  const { reducedMotion } = useCaelosTheme();
  const resolvedGap = gap ?? (size <= 16 ? 1 : Math.max(1, Math.round(size / 16)));
  return /* @__PURE__ */ jsxs8(
    "span",
    {
      role: "status",
      "aria-label": label,
      "data-still": paused || reducedMotion ? "true" : void 0,
      className: cx5(rippleLoader(), className),
      style: { "--ripple-size": `${size}px`, "--ripple-gap": `${resolvedGap}px`, ...style },
      children: [
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" }),
        /* @__PURE__ */ jsx12("i", { "aria-hidden": "true" })
      ]
    }
  );
}

// src/spacing.tsx
import { createContext as createContext3, forwardRef as forwardRef4, useContext as useContext3, useId as useId6 } from "react";
import { jsx as jsx13, jsxs as jsxs9 } from "react/jsx-runtime";
var DensityContext = createContext3("default");
var SpacingDensity = DensityContext.Provider;
var cx6 = (...values) => values.filter(Boolean).join(" ");
function layout(kind, name) {
  const Component = forwardRef4(function Layout({ className, ...props }, ref) {
    const density = useContext3(DensityContext);
    return /* @__PURE__ */ jsx13("div", { ...props, ref, "data-relation": kind, "data-spacing-density": density, className: cx6(spacing({ kind, density }), className) });
  });
  Component.displayName = name;
  return Component;
}
var Stack = layout("stack", "Stack");
var FieldGroup = layout("fields", "FieldGroup");
var SectionStack = layout("sections", "SectionStack");
var InlineCluster = layout("cluster", "InlineCluster");
var ActionRow = layout("actions", "ActionRow");
var ResponsiveGrid = layout("grid", "ResponsiveGrid");
var Inset = layout("inset", "Inset");
var Section = forwardRef4(function Section2({ title: title2, description, children, level = 2, className, ...props }, ref) {
  const id = useId6();
  const density = useContext3(DensityContext);
  const Tag = `h${level}`;
  return /* @__PURE__ */ jsxs9("section", { "aria-labelledby": id, ...props, ref, "data-relation": "section", "data-spacing-density": density, className: cx6(spacing({ kind: "section", density }), className), children: [
    /* @__PURE__ */ jsxs9("header", { className: spacing({ kind: "intro", density }), "data-relation": "intro", children: [
      /* @__PURE__ */ jsx13(Tag, { id, style: { margin: 0, font: "inherit", fontWeight: 600 }, children: title2 }),
      description != null && /* @__PURE__ */ jsx13("p", { style: { margin: 0, color: "var(--il-muted)" }, children: description })
    ] }),
    children
  ] });
});

// src/ActivityChain.tsx
import { useId as useId7, useState as useState7 } from "react";
import { Bot as Bot2, Check as Check4, ChevronDown as ChevronDown2, ChevronRight as ChevronRight2, Flame, Wrench, Zap } from "lucide-react";
import { jsx as jsx14, jsxs as jsxs10 } from "react/jsx-runtime";
var cx7 = (...values) => values.filter(Boolean).join(" ");
var STEP_ICON = { thinking: Zap, action: Flame, tool: Wrench, agent: Bot2 };
function ActivityChain({
  steps,
  activeIndex = -1,
  agentName,
  speaker = "neutral",
  summaryThreshold = 3,
  open,
  onOpenChange,
  openStepId,
  onOpenStepChange,
  statusLabel = "Working",
  codeSurface = "elevated",
  className
}) {
  const id = useId7();
  const { reducedMotion } = useCaelosTheme();
  const [ownOpen, setOwnOpen] = useState7(false);
  const [ownStep, setOwnStep] = useState7(null);
  const isOpen = open ?? ownOpen;
  const activeStep = openStepId !== void 0 ? openStepId : ownStep;
  const setOpen = (next) => onOpenChange ? onOpenChange(next) : setOwnOpen(next);
  const setStep = (next) => onOpenStepChange ? onOpenStepChange(next) : setOwnStep(next);
  const hasSummary = steps.length >= summaryThreshold;
  const complete = activeIndex < 0;
  const visible = isOpen || !hasSummary ? steps : steps.slice(-1);
  const anchored = true;
  const styles = activity({ summary: hasSummary, anchored, speaker });
  return /* @__PURE__ */ jsxs10("div", { className: cx7(styles.root, className), "data-activity": "", children: [
    agentName != null && /* @__PURE__ */ jsx14("div", { className: styles.agentName, "data-activity-agent": "", "data-speaker": speaker, children: agentName }),
    hasSummary && /* @__PURE__ */ jsxs10(
      "button",
      {
        type: "button",
        className: styles.summary,
        "aria-expanded": isOpen,
        "aria-controls": id,
        onClick: () => setOpen(!isOpen),
        children: [
          /* @__PURE__ */ jsx14(ChevronDown2, { size: 18, className: styles.summaryChevron, "data-open": isOpen, "aria-hidden": "true" }),
          /* @__PURE__ */ jsxs10("span", { children: [
            steps.length,
            " ",
            steps.length === 1 ? "step" : "steps",
            complete ? " completed" : ""
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx14("div", { id, className: styles.chain, "data-summary": hasSummary, children: visible.map((step) => {
      const index = steps.indexOf(step);
      const live = index === activeIndex;
      const detailOpen = activeStep === step.id;
      const Icon2 = STEP_ICON[step.kind];
      return /* @__PURE__ */ jsx14("div", { className: styles.step, "data-activity-step": "", "data-active": live, children: /* @__PURE__ */ jsxs10("div", { className: styles.stepBody, children: [
        /* @__PURE__ */ jsxs10(
          "button",
          {
            type: "button",
            className: styles.stepTrigger,
            "aria-expanded": detailOpen,
            onClick: () => setStep(detailOpen ? null : step.id),
            children: [
              /* @__PURE__ */ jsx14("span", { className: styles.stepAnchor, "aria-hidden": "true", children: /* @__PURE__ */ jsx14(ChevronRight2, { size: 14, className: styles.stepChevron, "data-open": detailOpen }) }),
              /* @__PURE__ */ jsxs10("span", { className: styles.stepLabel, children: [
                /* @__PURE__ */ jsx14(Icon2, { size: 18, "aria-hidden": "true" }),
                /* @__PURE__ */ jsx14("span", { children: step.title })
              ] }),
              /* @__PURE__ */ jsx14("span", { className: styles.stepStatus, children: live ? /* @__PURE__ */ jsx14(RippleLoader, { paused: reducedMotion, label: statusLabel }) : /* @__PURE__ */ jsx14(Check4, { size: 12, "aria-label": "Completed" }) })
            ]
          }
        ),
        detailOpen && step.detail != null && (step.detailKind === "code" ? /* @__PURE__ */ jsx14(Surface, { layer: codeSurface, texture: "plain", className: styles.detailCode, children: /* @__PURE__ */ jsx14("code", { children: step.detail }) }) : step.detailKind === "embed" ? /* @__PURE__ */ jsx14("div", { className: styles.detailEmbed, children: step.detail }) : /* @__PURE__ */ jsx14("p", { className: styles.detailText, children: step.detail }))
      ] }) }, step.id);
    }) })
  ] });
}

// src/ConversationMessage.tsx
import { Fragment as Fragment3, jsx as jsx15, jsxs as jsxs11 } from "react/jsx-runtime";
var cx8 = (...values) => values.filter(Boolean).join(" ");
function ConversationColumn({ className, ...props }) {
  return /* @__PURE__ */ jsx15("div", { ...props, className: cx8(conversationMessage().root, className) });
}
function ConversationMessage({ agentName, agent, continued = false, avatarVisible = !continued, speaker = "sage", className, children, ...props }) {
  const styles = conversationMessage({ speaker });
  return /* @__PURE__ */ jsx15("article", { ...props, className: cx8(styles.turn, agent && styles.avatarTurn, className), "data-speaker": speaker, children: agent ? /* @__PURE__ */ jsxs11(Fragment3, { children: [
    /* @__PURE__ */ jsx15("span", { className: styles.avatar, "data-message-identity": avatarVisible ? "avatar" : "continuation", children: avatarVisible && /* @__PURE__ */ jsx15(AgentAvatar, { agent, size: "md", style: { "--nc-avatar-ink": `var(--nc-${speaker})` } }) }),
    /* @__PURE__ */ jsx15("div", { className: styles.body, children })
  ] }) : /* @__PURE__ */ jsxs11(Fragment3, { children: [
    agentName != null && /* @__PURE__ */ jsx15("span", { className: styles.name, children: agentName }),
    children
  ] }) });
}
function MessageProse({ className, ...props }) {
  return /* @__PURE__ */ jsx15("div", { ...props, className: cx8(conversationMessage().prose, className) });
}
function MessageActions({ className, ...props }) {
  return /* @__PURE__ */ jsx15("div", { ...props, className: cx8(conversationMessage().actions, className) });
}
function ArrivingText({ text, arrival = "phrase", stagger = 85 }) {
  const styles = conversationMessage({ arrival });
  if (arrival !== "phrase") return /* @__PURE__ */ jsx15("span", { className: styles.phrase, children: text });
  const phrases = text.match(/[^,;.]+[,;.]?\s*/g) ?? [text];
  return /* @__PURE__ */ jsx15(Fragment3, { children: phrases.map((phrase, index) => /* @__PURE__ */ jsx15("span", { className: styles.phrase, style: { animationDelay: `${index * stagger}ms` }, children: phrase }, index)) });
}

// src/UserMessage.tsx
import { useLayoutEffect as useLayoutEffect5, useRef as useRef9, useState as useState8 } from "react";
import { ArrowUp as ArrowUp2 } from "lucide-react";
import { jsx as jsx16, jsxs as jsxs12 } from "react/jsx-runtime";
var cx9 = (...values) => values.filter(Boolean).join(" ");
function UserMessage({ value, editing = false, onValueChange, editorLabel = "Edit message", actions: actions2, textareaRef, onSubmitEdit, onCancelEdit, submitting = false, className, style, ...props }) {
  const styles = userMessage();
  const bubbleRef = useRef9(null);
  const inputRef = useRef9(null);
  const [restSize, setRestSize] = useState8();
  useLayoutEffect5(() => {
    if (editing || !bubbleRef.current) return;
    const bubble = bubbleRef.current;
    const measure = () => {
      const { width, height } = bubble.getBoundingClientRect();
      setRestSize({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bubble);
    return () => observer.disconnect();
  }, [editing]);
  useLayoutEffect5(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus({ preventScroll: true });
    inputRef.current.setSelectionRange(value.length, value.length);
  }, [editing]);
  useLayoutEffect5(() => {
    const input = inputRef.current;
    if (!editing || !input) return;
    const resize = () => {
      input.style.height = "0px";
      input.style.height = `${input.scrollHeight}px`;
    };
    resize();
    const observer = new ResizeObserver(() => {
      if (input.clientWidth !== width) {
        width = input.clientWidth;
        resize();
      }
    });
    let width = input.clientWidth;
    observer.observe(input);
    return () => observer.disconnect();
  }, [editing, value]);
  return /* @__PURE__ */ jsxs12("div", { ...props, style: { ...style, ...editing && restSize ? { width: restSize.width, maxWidth: "100%" } : {} }, className: cx9(styles.root, className), children: [
    /* @__PURE__ */ jsx16("div", { ref: bubbleRef, className: styles.bubble, "data-surface": "elevated", "data-editing": editing || void 0, style: editing && restSize ? { minHeight: restSize.height } : void 0, children: editing ? /* @__PURE__ */ jsxs12("div", { className: styles.editRow, children: [
      /* @__PURE__ */ jsx16(
        "textarea",
        {
          ref: (node) => {
            inputRef.current = node;
            if (typeof textareaRef === "function") textareaRef(node);
            else if (textareaRef) textareaRef.current = node;
          },
          className: styles.editor,
          "aria-label": editorLabel,
          rows: 1,
          disabled: submitting,
          value,
          onKeyDown: (event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape" && !submitting) {
              event.preventDefault();
              onCancelEdit?.();
            }
            if (event.key === "Enter" && !event.shiftKey && onSubmitEdit) {
              event.preventDefault();
              if (value.trim() && !submitting) onSubmitEdit();
            }
          },
          onChange: (event) => onValueChange?.(event.target.value)
        }
      ),
      onSubmitEdit && /* @__PURE__ */ jsx16(
        IconButton,
        {
          className: styles.submit,
          variant: "primary",
          size: "sm",
          label: "Resubmit message",
          icon: /* @__PURE__ */ jsx16(ArrowUp2, { size: 16 }),
          loading: submitting,
          disabled: !value.trim(),
          onClick: onSubmitEdit
        }
      )
    ] }) : /* @__PURE__ */ jsx16("p", { className: styles.text, children: value }) }),
    actions2 != null && /* @__PURE__ */ jsx16("div", { className: styles.actions, children: actions2 })
  ] });
}

// src/ArtifactPreview.tsx
import { useEffect as useEffect7, useId as useId8, useRef as useRef10, useState as useState9 } from "react";
import { Bot as Bot3, ChevronDown as ChevronDown3, FileText as FileText2, Globe } from "lucide-react";
import { jsx as jsx17, jsxs as jsxs13 } from "react/jsx-runtime";
var cx10 = (...values) => values.filter(Boolean).join(" ");
var KIND = {
  document: { icon: FileText2, label: "Document" },
  web: { icon: Globe, label: "Web preview" },
  "agent-session": { icon: Bot3, label: "Agent session" }
};
function ArtifactPreview({
  kind,
  title: title2,
  coordinate,
  triggerLabel,
  open,
  onOpenChange,
  phase = "complete",
  actions: actions2,
  notice,
  fit = "window",
  generatingLabel = "Generating document",
  children,
  className
}) {
  const id = useId8();
  const { reducedMotion } = useCaelosTheme();
  const [ownOpen, setOwnOpen] = useState9(true);
  const isOpen = open ?? ownOpen;
  const setOpen = (next) => onOpenChange ? onOpenChange(next) : setOwnOpen(next);
  const styles = artifactPreview();
  const Icon2 = KIND[kind].icon;
  const excerpt = useRef10(null);
  const [overrun, setOverrun] = useState9(false);
  useEffect7(() => {
    const element = excerpt.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setOverrun(
        element.scrollHeight - parseFloat(style.paddingBottom) > parseFloat(style.maxHeight) + 1
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isOpen, phase, kind, fit, children]);
  return /* @__PURE__ */ jsxs13("div", { className: cx10(styles.root, className), children: [
    /* @__PURE__ */ jsxs13(
      "button",
      {
        type: "button",
        className: styles.trigger,
        "aria-expanded": isOpen,
        "aria-controls": id,
        onClick: () => setOpen(!isOpen),
        children: [
          /* @__PURE__ */ jsx17(Icon2, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ jsx17("span", { children: triggerLabel ?? KIND[kind].label }),
          /* @__PURE__ */ jsx17(ChevronDown3, { size: 14, className: styles.triggerChevron, "data-open": isOpen })
        ]
      }
    ),
    isOpen && /* @__PURE__ */ jsxs13("div", { className: styles.card, id, "data-phase": phase, "data-inner": "paper", children: [
      /* @__PURE__ */ jsxs13("div", { className: styles.strip, children: [
        /* @__PURE__ */ jsxs13("div", { className: styles.name, children: [
          /* @__PURE__ */ jsx17(Icon2, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ jsxs13("div", { className: styles.nameText, children: [
            /* @__PURE__ */ jsx17("h4", { className: styles.title, children: title2 }),
            coordinate != null && /* @__PURE__ */ jsx17("span", { className: styles.meta, children: coordinate })
          ] })
        ] }),
        actions2 != null && /* @__PURE__ */ jsx17("div", { className: styles.actions, children: actions2 })
      ] }),
      /* @__PURE__ */ jsx17("div", { className: styles.body, children: phase !== "complete" ? /* @__PURE__ */ jsx17("div", { className: styles.generating, "aria-label": "Generating preview", children: /* @__PURE__ */ jsx17(NovaLoader, { size: 132, paused: reducedMotion, label: generatingLabel }) }) : /* @__PURE__ */ jsx17(
        "div",
        {
          className: styles.excerpt,
          ref: excerpt,
          "data-overrun": fit === "window" && overrun,
          "data-fit": fit === "content" ? "content" : void 0,
          children
        }
      ) }),
      notice != null && /* @__PURE__ */ jsx17("span", { role: "status", className: styles.notice, children: notice })
    ] })
  ] });
}

// src/ArtifactWorkspace.tsx
import { useRef as useRef11 } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { jsx as jsx18, jsxs as jsxs14 } from "react/jsx-runtime";
var cx11 = (...values) => values.filter(Boolean).join(" ");
function WorkspaceToolButton({ label, icon, side = "left", className, style, ...props }) {
  const styles = artifactWorkspace();
  return /* @__PURE__ */ jsx18(Tooltip, { label, side, children: /* @__PURE__ */ jsx18(
    Button,
    {
      ...props,
      variant: "text",
      "aria-label": label,
      className: cx11(styles.toolButton, className),
      style: { width: 34, padding: 0, ...style },
      children: icon
    }
  ) });
}
function WorkspaceToolPill({ tier = "top", children, className }) {
  const styles = artifactWorkspace();
  return /* @__PURE__ */ jsx18("div", { className: styles.tools, children: /* @__PURE__ */ jsx18(Surface, { layer: tier, className: cx11(styles.toolbar, className), children }) });
}
function ArtifactWorkspace({ name, meta, actions: actions2, tools, placement = "inline", suggestion, children, className }) {
  const styles = artifactWorkspace({ placement });
  return /* @__PURE__ */ jsx18("div", { className: cx11(styles.root, className), "data-placement": placement, children: /* @__PURE__ */ jsxs14("div", { className: styles.layout, "data-tools": tools != null, children: [
    tools,
    /* @__PURE__ */ jsxs14("div", { className: styles.card, children: [
      /* @__PURE__ */ jsxs14("div", { className: styles.strip, children: [
        /* @__PURE__ */ jsxs14("div", { className: styles.coordinate, children: [
          /* @__PURE__ */ jsx18("code", { className: styles.coordinateName, "data-workspace-coordinate": "", children: name }),
          meta != null && /* @__PURE__ */ jsx18("span", { className: styles.meta, children: meta })
        ] }),
        actions2 != null && /* @__PURE__ */ jsx18("div", { className: styles.actions, children: actions2 })
      ] }),
      /* @__PURE__ */ jsx18("div", { className: styles.body, children: /* @__PURE__ */ jsxs14("div", { className: styles.document, children: [
        children,
        suggestion != null && /* @__PURE__ */ jsx18("p", { className: styles.suggestion, role: "status", children: suggestion })
      ] }) })
    ] })
  ] }) });
}
function WorkspaceEditor({ value, onValueChange, label = "Document text", textareaRef, className }) {
  const styles = artifactWorkspace();
  return /* @__PURE__ */ jsx18(
    "textarea",
    {
      ref: textareaRef,
      "data-workspace-editor": "",
      "aria-label": label,
      className: cx11(styles.editor, className),
      value,
      onChange: (event) => onValueChange(event.target.value)
    }
  );
}
function WorkspacePanel({ open, onOpenChange, title: title2, frame: frame2 = "overlay", full = false, children, className }) {
  const settings = useCaelosTheme();
  const styles = artifactWorkspace({ frame: frame2 });
  const returnFocus = useRef11(null);
  const content = /* @__PURE__ */ jsxs14(
    DialogPrimitive.Content,
    {
      ...themeAttributes(settings),
      className: cx11(styles.panel, className),
      "data-frame": frame2,
      "data-full": full,
      "aria-describedby": void 0,
      onInteractOutside: (event) => event.preventDefault(),
      onOpenAutoFocus: (event) => {
        returnFocus.current = document.activeElement;
        event.preventDefault();
        event.target.focus();
      },
      onCloseAutoFocus: (event) => {
        if (returnFocus.current?.isConnected) {
          event.preventDefault();
          returnFocus.current.focus();
        }
      },
      children: [
        /* @__PURE__ */ jsx18(DialogPrimitive.Title, { style: {
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0
        }, children: title2 }),
        children
      ]
    }
  );
  return /* @__PURE__ */ jsx18(DialogPrimitive.Root, { open, onOpenChange, modal: false, children: frame2 === "overlay" ? /* @__PURE__ */ jsx18(DialogPrimitive.Portal, { children: content }) : content });
}

// src/Alert.tsx
import { jsx as jsx19, jsxs as jsxs15 } from "react/jsx-runtime";
var cx12 = (...values) => values.filter(Boolean).join(" ");
function AlertStage({ className, ...props }) {
  return /* @__PURE__ */ jsx19("div", { ...props, className: cx12(alert().stage, className) });
}
function Alert({
  title: title2,
  icon,
  kicker,
  pager,
  material = "tonal",
  tone = "none",
  edge = "system",
  glow = true,
  lede,
  command,
  actions: actions2,
  choices,
  children,
  className,
  ...props
}) {
  const styles = alert({ material, tone, edge, glow });
  const hasBody = lede != null || command != null || actions2 != null || choices != null || children != null;
  return /* @__PURE__ */ jsxs15(
    "section",
    {
      ...props,
      "data-alert-material": material,
      "data-alert-tone": tone,
      className: cx12(material === "glass" && card({ variant: "glass" }), styles.root, className),
      children: [
        /* @__PURE__ */ jsxs15("header", { className: styles.head, children: [
          icon != null && /* @__PURE__ */ jsx19("span", { className: styles.icon, "aria-hidden": "true", children: icon }),
          /* @__PURE__ */ jsx19("h4", { className: styles.title, children: title2 }),
          pager != null ? /* @__PURE__ */ jsxs15("div", { className: styles.pager, children: [
            kicker != null && /* @__PURE__ */ jsx19("span", { className: styles.kicker, children: kicker }),
            pager
          ] }) : kicker != null && /* @__PURE__ */ jsx19("span", { className: styles.kicker, children: kicker })
        ] }),
        hasBody && /* @__PURE__ */ jsxs15("div", { className: styles.body, children: [
          lede != null && /* @__PURE__ */ jsx19("p", { className: styles.lede, children: lede }),
          command != null && /* @__PURE__ */ jsx19("code", { className: styles.command, children: command }),
          children,
          choices != null && /* @__PURE__ */ jsx19("div", { className: styles.choices, role: "group", children: choices }),
          actions2 != null && /* @__PURE__ */ jsx19("div", { className: styles.actions, children: actions2 })
        ] })
      ]
    }
  );
}

// src/RetryButton.tsx
import { RotateCcw } from "lucide-react";
import { jsx as jsx20 } from "react/jsx-runtime";
var cx13 = (...values) => values.filter(Boolean).join(" ");
function RetryButton({ label = "Retry", icon, className, ...props }) {
  return /* @__PURE__ */ jsx20(
    IconButton,
    {
      ...props,
      danger: true,
      variant: "tonal",
      "data-nc-control-skin": "",
      className: cx13(controlSkin({ kind: "danger" }), className),
      label,
      icon: icon ?? /* @__PURE__ */ jsx20(RotateCcw, { size: 15 })
    }
  );
}

// src/FileCard.tsx
import { FileText as FileText3, X as X5 } from "lucide-react";

// src/ErrorMessage.tsx
import { X as X4 } from "lucide-react";
import { Fragment as Fragment4, jsx as jsx21, jsxs as jsxs16 } from "react/jsx-runtime";
function ErrorMessage({ title: title2, description, onRetry, retryLabel = "Retry", onOpen, onDismiss, dismissLabel = "Dismiss error", className, ...props }) {
  const styles = errorMessage();
  const theme = useCaelosTheme();
  const body = /* @__PURE__ */ jsxs16(Fragment4, { children: [
    /* @__PURE__ */ jsx21("span", { className: styles.symbol, children: /* @__PURE__ */ jsx21(X4, { size: 18, "aria-hidden": "true" }) }),
    /* @__PURE__ */ jsxs16("span", { className: styles.label, children: [
      /* @__PURE__ */ jsx21("span", { className: styles.name, children: title2 }),
      description && /* @__PURE__ */ jsx21("small", { className: styles.detail, children: description })
    ] })
  ] });
  return /* @__PURE__ */ jsxs16(
    "div",
    {
      role: "alert",
      ...props,
      ...themeAttributes(theme),
      "data-failed": "true",
      "data-surface": "elevated",
      className: [styles.root, className].filter(Boolean).join(" "),
      children: [
        onOpen ? /* @__PURE__ */ jsx21("button", { type: "button", className: styles.open, onClick: onOpen, children: body }) : /* @__PURE__ */ jsx21("div", { className: styles.open, style: { cursor: "default" }, children: body }),
        onRetry && /* @__PURE__ */ jsx21(RetryButton, { label: retryLabel, onClick: onRetry }),
        onDismiss && /* @__PURE__ */ jsx21(IconButton, { label: dismissLabel, icon: /* @__PURE__ */ jsx21(X4, { size: 15 }), variant: "text", onClick: onDismiss, style: { flexShrink: 0 } })
      ]
    }
  );
}

// src/FileCard.tsx
import { Fragment as Fragment5, jsx as jsx22, jsxs as jsxs17 } from "react/jsx-runtime";
var cx14 = (...values) => values.filter(Boolean).join(" ");
function FileCard({
  name,
  detail,
  status = "ready",
  onOpen,
  onRetry,
  onRemove,
  removeLabel = "Remove attachment",
  retryLabel = "Retry upload",
  uploadingLabel = "Uploading file",
  icon,
  className,
  ...props
}) {
  const styles = fileCard();
  const { reducedMotion } = useCaelosTheme();
  const failed = status === "failed";
  if (failed) return /* @__PURE__ */ jsx22(
    ErrorMessage,
    {
      ...props,
      className,
      title: name,
      description: detail,
      onOpen,
      onRetry,
      retryLabel,
      onDismiss: onRemove,
      dismissLabel: removeLabel
    }
  );
  const symbol = status === "uploading" ? /* @__PURE__ */ jsx22(RippleLoader, { size: 16, paused: reducedMotion, label: uploadingLabel }) : icon ?? /* @__PURE__ */ jsx22(FileText3, { size: 21 });
  const body = /* @__PURE__ */ jsxs17(Fragment5, { children: [
    /* @__PURE__ */ jsxs17("button", { type: "button", className: styles.open, onClick: onOpen, children: [
      /* @__PURE__ */ jsx22("span", { className: styles.symbol, children: symbol }),
      /* @__PURE__ */ jsxs17("span", { className: styles.label, children: [
        /* @__PURE__ */ jsx22("span", { className: styles.name, children: name }),
        /* @__PURE__ */ jsx22("small", { className: styles.detail, children: detail })
      ] })
    ] }),
    onRemove && /* @__PURE__ */ jsx22(IconButton, { label: removeLabel, icon: /* @__PURE__ */ jsx22(X5, { size: 15 }), variant: "text", onClick: onRemove, style: { flexShrink: 0 } })
  ] });
  return /* @__PURE__ */ jsx22(Surface, { ...props, layer: "elevated", className: cx14(styles.root, className), "data-failed": "false", children: body });
}

// src/InlineSource.tsx
import { ArrowUpRight } from "lucide-react";
import { jsx as jsx23, jsxs as jsxs18 } from "react/jsx-runtime";
var cx15 = (...values) => values.filter(Boolean).join(" ");
function InlineSource({ children, href, detail, hint = true, className, target = "_blank", rel = "noreferrer", ...props }) {
  const link = /* @__PURE__ */ jsxs18("a", { ...props, href, target, rel, className: cx15(inlineSource(), className), children: [
    children,
    /* @__PURE__ */ jsx23(ArrowUpRight, { size: 11, "aria-hidden": "true" })
  ] });
  return hint ? /* @__PURE__ */ jsx23(Tooltip, { label: children, detail: detail ?? href, children: link }) : link;
}

// src/Recovery.tsx
import { ArrowDown } from "lucide-react";
import { jsx as jsx24, jsxs as jsxs19 } from "react/jsx-runtime";
var cx16 = (...values) => values.filter(Boolean).join(" ");
function UnreadDivider({ children, label = "New messages", className, ...props }) {
  return /* @__PURE__ */ jsx24("div", { ...props, role: "separator", "aria-label": label, className: cx16(recovery().unread, className), children: /* @__PURE__ */ jsx24("span", { children }) });
}
function CompactError({ children, action, className, ...props }) {
  const styles = recovery();
  return /* @__PURE__ */ jsxs19("div", { ...props, role: "alert", className: cx16(styles.error, className), children: [
    /* @__PURE__ */ jsx24("p", { className: styles.errorText, children }),
    action
  ] });
}
function JumpToLatest({ onClick, state = "latest", children, label = "Jump to latest", caption, className }) {
  const styles = recovery();
  const { reducedMotion } = useCaelosTheme();
  return /* @__PURE__ */ jsxs19("div", { className: cx16(styles.navigation, className), children: [
    caption != null && /* @__PURE__ */ jsx24("p", { style: { margin: 0, color: "var(--il-muted)" }, children: caption }),
    /* @__PURE__ */ jsx24(Tooltip, { label, children: /* @__PURE__ */ jsxs19(
      Button,
      {
        variant: "tonal",
        "data-nc-control-skin": "",
        onClick,
        "aria-label": label,
        className: cx16(controlSkin({ kind: "glass" }), styles.jump),
        children: [
          state === "working" ? /* @__PURE__ */ jsx24(NovaLoader, { size: 36, paused: reducedMotion }) : /* @__PURE__ */ jsx24(ArrowDown, { size: 28 }),
          children
        ]
      }
    ) })
  ] });
}

// src/ConversationHeader.tsx
import {
  useEffect as useEffect9,
  useLayoutEffect as useLayoutEffect6,
  useRef as useRef13,
  useState as useState11
} from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

// src/header-layout.ts
var agentAvatarSizes = { xl: 48, xxl: 54 };
var approvedHeaderLayout = {
  restPercent: 45,
  expandedPercent: 56,
  density: "compact",
  matchComposerHeight: false,
  split: { gap: 30, cushion: 60, minText: 280, maxText: 460 },
  // Indices into the existing --sys-space-N scale, not a replacement scale.
  spacing: { block: 5, leading: 7, trailing: 4, gap: 7 },
  curveCompensation: 10,
  avatarTiers: [
    { rest: "xxl", expanded: "xl" },
    { rest: "xxl", expanded: 40 },
    { rest: "xxl", expanded: 32 }
  ]
};
var approvedHeaderMotion = {
  split: { type: "spring", stiffness: 280, damping: 34, mass: 1, restDelta: 1e-3, restSpeed: 0.01 },
  disclosure: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  titleReveal: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
  titleCollapse: { duration: 0.13, delay: 0 }
};

// src/ConversationHeader.tsx
import { Link2 } from "lucide-react";

// src/Title.tsx
import { useEffect as useEffect8, useId as useId9, useRef as useRef12, useState as useState10 } from "react";
import { Fragment as Fragment6, jsx as jsx25, jsxs as jsxs20 } from "react/jsx-runtime";
function Title3({ value, variant = "task", as: Tag = "h3", onSave, editing: controlled, onEditingChange, className, children, editLabel = "Edit title", maxLength = 200 }) {
  const [local, setLocal] = useState10(false);
  const editing = controlled ?? local;
  const [draft, setDraft] = useState10(value);
  const [saving, setSaving] = useState10(false);
  const [error, setError] = useState10("");
  const busy = useRef12(false);
  const cancelled = useRef12(false);
  const input = useRef12(null);
  const heading = useRef12(null);
  const errorId = useId9();
  function change(next) {
    setLocal(next);
    onEditingChange?.(next);
  }
  useEffect8(() => {
    if (editing) {
      cancelled.current = false;
      setDraft(value);
      setError("");
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  async function save() {
    if (busy.current || cancelled.current || !onSave) return;
    const next = draft.trim();
    if (!next || next === value) {
      cancelled.current = true;
      change(false);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await onSave(next);
      cancelled.current = true;
      change(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save title. Try again.");
      input.current?.focus();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsx25(
    Tag,
    {
      ref: heading,
      className: [title({ variant }), className].filter(Boolean).join(" "),
      "data-editable": !!onSave,
      "data-editing": editing,
      tabIndex: onSave ? 0 : void 0,
      title: onSave && !editing ? "Double-click or press Enter to edit" : void 0,
      "aria-label": !editing ? value : void 0,
      onClick: onSave ? (event) => event.stopPropagation() : void 0,
      onDoubleClick: onSave ? (event) => {
        event.stopPropagation();
        change(true);
      } : void 0,
      onKeyDown: (event) => {
        if (!editing && onSave && (event.key === "Enter" || event.key === "F2")) {
          event.preventDefault();
          event.stopPropagation();
          change(true);
        }
      },
      children: editing && onSave ? /* @__PURE__ */ jsxs20(Fragment6, { children: [
        /* @__PURE__ */ jsx25(
          "input",
          {
            ref: input,
            "data-inline-title-editor": "",
            "aria-label": editLabel,
            "aria-busy": saving,
            "aria-invalid": !!error,
            "aria-describedby": error ? errorId : void 0,
            value: draft,
            maxLength,
            readOnly: saving,
            onChange: (event) => setDraft(event.target.value),
            onBlur: () => {
              void save();
            },
            onKeyDown: (event) => {
              event.stopPropagation();
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
              if (event.key === "Escape" && !busy.current) {
                event.preventDefault();
                cancelled.current = true;
                change(false);
                requestAnimationFrame(() => heading.current?.focus());
              }
            }
          }
        ),
        error && /* @__PURE__ */ jsx25("span", { id: errorId, role: "alert", children: error })
      ] }) : children ?? value
    }
  );
}

// src/ConversationHeader.tsx
import { Fragment as Fragment7, jsx as jsx26, jsxs as jsxs21 } from "react/jsx-runtime";
var cx17 = (...values) => values.filter(Boolean).join(" ");
var composites = {
  1: [[0, 0, "lg"]],
  2: [[0, 0, "lg"], [48, 22, "md"]],
  3: [[0, 8, "lg"], [48, 0, "sm"], [48, 32, "md"]],
  4: [[0, 12, "lg"], [48, 0, "sm"], [48, 32, "md"], [16, 60, "sm"]],
  5: [[0, 20, "lg"], [48, 0, "md"], [48, 40, "sm"], [8, 68, "sm"], [80, 52, "sm"]],
  6: [[0, 20, "lg"], [48, 0, "md"], [48, 40, "sm"], [8, 68, "sm"], [80, 52, "sm"], [88, 8, "sm"]]
};
var avatarPixels = { sm: 24, md: 32, lg: 40 };
var soloRestAvatarPixels = 64;
var expandedAvatarPixels = {
  large: soloRestAvatarPixels * 0.75,
  medium: avatarPixels.lg,
  small: avatarPixels.md
};
function ContextRing({ shape, percent = null, className }) {
  const styles = conversationHeader();
  const color = percent === null ? "var(--il-dim)" : percent >= 90 ? "var(--sys-sem-danger)" : percent >= 80 ? "var(--sys-sem-progress-hover)" : "var(--il-muted)";
  const radius = shape === "capsule" ? 22 : 14;
  return /* @__PURE__ */ jsxs21("svg", { className: cx17(styles.contextRing, className), viewBox: "0 0 48 48", "aria-hidden": "true", style: { color }, children: [
    /* @__PURE__ */ jsx26("rect", { x: "2", y: "2", width: "44", height: "44", rx: radius, className: styles.contextTrack }),
    /* @__PURE__ */ jsx26(
      "rect",
      {
        x: "2",
        y: "2",
        width: "44",
        height: "44",
        rx: radius,
        pathLength: "100",
        strokeDasharray: percent === null ? "2 6" : `${percent} 100`,
        transform: "rotate(-90 24 24)"
      }
    )
  ] });
}
function ConversationHeader({
  title: title2,
  onTitleSave,
  titleEditing,
  onTitleEditingChange,
  shape,
  participants,
  constrained = false,
  linkedWork: linkedWork2,
  linkedWorkOpen = false,
  chatId,
  linkPopover,
  linkLabel = "Link project or work item",
  linkIcon,
  linkOpen,
  onLinkOpenChange,
  renderParticipantDetail,
  owner,
  pinned,
  onPinnedChange,
  activeParticipant,
  onActiveParticipantChange,
  onExpandedChange,
  className,
  restAvatarHeight,
  expandedAvatarSize,
  layoutKey,
  splitGap = 24,
  splitCushion = 24,
  splitMin = 180,
  splitMax = 560,
  material
}) {
  const styles = conversationHeader({ width: constrained ? "constrained" : "full", material });
  const count = Math.min(6, Math.max(1, participants.length));
  const [narrowViewport, setNarrowViewport] = useState11(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches
  );
  useEffect9(() => {
    const query = window.matchMedia("(max-width: 600px)");
    const update = () => setNarrowViewport(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const [hovered, setExpanded] = useState11(false);
  const [ownPinned, setOwnPinned] = useState11(false);
  const isPinned = pinned ?? ownPinned;
  const setPinnedState = (next) => {
    if (pinned === void 0) setOwnPinned(next);
    onPinnedChange?.(next);
  };
  const [ownActive, setOwnActive] = useState11(null);
  const active = activeParticipant !== void 0 ? activeParticipant : ownActive;
  const setActive = (next) => {
    if (activeParticipant === void 0) setOwnActive(next);
    onActiveParticipantChange?.(next);
  };
  const [ownLinkOpen, setOwnLinkOpen] = useState11(false);
  const isLinkOpen = linkOpen ?? ownLinkOpen;
  const setLinkOpen = (next) => {
    if (linkOpen === void 0) setOwnLinkOpen(next);
    onLinkOpenChange?.(next);
  };
  const detailPinned = useRef13(false);
  const detailHoverOpened = useRef13(false);
  const detailLeaveTimer = useRef13(void 0);
  const holdDetail = () => clearTimeout(detailLeaveTimer.current);
  const closeDetail = () => {
    holdDetail();
    detailPinned.current = false;
    setActive(null);
  };
  const previewDetail = (index) => {
    holdDetail();
    if (!isPinned || detailPinned.current) return;
    detailHoverOpened.current = true;
    setActive(index);
  };
  const leaveDetail = () => {
    holdDetail();
    if (!detailPinned.current) detailLeaveTimer.current = setTimeout(closeDetail, 260);
  };
  const pinDetail = () => {
    holdDetail();
    detailPinned.current = true;
  };
  useEffect9(() => {
    if (!isPinned || active !== null && active >= count) closeDetail();
  }, [isPinned, count, active]);
  useEffect9(() => () => clearTimeout(detailLeaveTimer.current), []);
  const trigger = useRef13(null);
  const expanded = hovered || isPinned || linkedWorkOpen;
  const theme = useCaelosTheme();
  const [lineGrowth, setLineGrowth] = useState11(0);
  const measure = useRef13(null);
  const ellipsisMeasure = useRef13(null);
  const [prefix, setPrefix] = useState11({ end: 0, width: 0, truncated: false });
  const canvas = useRef13(null);
  const card2 = useRef13(null);
  const [titleWidths, setTitleWidths] = useState11({ rest: 258, open: 306, split: 306 });
  const naturalCopy = useRef13(null);
  const [splitWidth, setSplitWidth] = useState11(348);
  const [rosterRight, setRosterRight] = useState11(21);
  const clickedMeasure = useRef13(null);
  const [clickedGrowth, setClickedGrowth] = useState11(0);
  const activeTitleWidth = isPinned ? titleWidths.split : titleWidths.open;
  useEffect9(() => {
    onExpandedChange?.(expanded);
  }, [expanded]);
  useLayoutEffect6(() => {
    if (!canvas.current || !card2.current) return;
    const update = () => {
      const style = getComputedStyle(card2.current);
      const available = canvas.current.getBoundingClientRect().width;
      const reserved = parseFloat(getComputedStyle(card2.current.querySelector('[role="group"]')).width) + parseFloat(style.columnGap) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      const width = (name) => Math.max(0, Math.min(available, parseFloat(style.getPropertyValue(name))) - reserved);
      const rest = width("--card-rest-width"), open = width("--card-open-width");
      const openWidth = Math.min(available, parseFloat(style.getPropertyValue("--card-open-width")));
      const avatar2 = expandedAvatarSize ?? 48;
      const field2 = parseFloat(getComputedStyle(card2.current.querySelector('[role="group"]')).width);
      const padding = parseFloat(style.paddingLeft) + splitCushion + 2;
      const gap = Math.min(splitGap, Math.max(0, openWidth - avatar2 - padding - 60));
      const maximum = Math.max(1, Math.min(splitMax, openWidth - avatar2 - gap - padding));
      const minimum = Math.min(splitMin, maximum);
      const natural = Math.max(0, ...Array.from(naturalCopy.current?.children ?? [], (child) => child.getBoundingClientRect().width));
      const split = Math.min(maximum, Math.max(minimum, Math.ceil(natural)));
      const bubble = split + padding;
      setRosterRight(openWidth - bubble - gap - avatar2 / 2 - field2 / 2 - 1);
      setSplitWidth(bubble);
      setTitleWidths(
        (previous) => previous.rest === rest && previous.open === open && previous.split === split ? previous : { rest, open, split }
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas.current);
    update();
    document.fonts.addEventListener("loadingdone", update);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", update);
    };
  }, [constrained, layoutKey, restAvatarHeight, expandedAvatarSize, splitGap, splitCushion, splitMin, splitMax, title2, linkedWork2, chatId]);
  const leaveTimer = useRef13(void 0);
  const pointerInside = useRef13(false);
  const focused = useRef13(false);
  const reveal = () => {
    clearTimeout(leaveTimer.current);
    setExpanded(true);
  };
  const dismiss = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!pointerInside.current && !focused.current) setExpanded(false);
    }, 260);
  };
  const conversationTitle = title2.trim() || "Untitled conversation";
  const previewTitle = conversationTitle.length > 512 ? conversationTitle.slice(0, 512) + "\u2026" : conversationTitle;
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion || theme.reducedMotion;
  const separation = useMotionValue(0);
  const disclosure2 = useMotionValue(0);
  useEffect9(() => {
    const animation = animate(separation, isPinned ? 1 : 0, {
      ...reducedMotion ? { duration: 0 } : {
        ...approvedHeaderMotion.split
      }
    });
    return () => animation.stop();
  }, [isPinned, reducedMotion, separation]);
  useEffect9(() => {
    const animation = animate(disclosure2, expanded ? 1 : 0, {
      ...approvedHeaderMotion.disclosure,
      duration: reducedMotion ? 0 : approvedHeaderMotion.disclosure.duration
    });
    return () => animation.stop();
  }, [expanded, reducedMotion, disclosure2]);
  useEffect9(() => {
    if (!isPinned) return;
    const outside = (event) => {
      const target = event.target;
      if (!document.querySelector("[data-agent-file-layer], [data-linked-work-layer]") && !(linkedWorkOpen && target.closest('[role="menu"]')) && !target.closest(`[data-model-owner="${owner}"]`) && !target.closest("[data-atlas-layout-control]") && !canvas.current?.contains(target) && !target.closest(`[data-header-owner="${owner}"]`) && !(active !== null && target.closest('[role="menu"][aria-label^="Permissions:"]'))) {
        setPinnedState(false);
        setExpanded(false);
        setActive(null);
        setLinkOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [isPinned, owner, active, linkedWorkOpen]);
  const close = () => {
    setPinnedState(false);
    setExpanded(false);
    setActive(null);
    setLinkOpen(false);
    clearTimeout(leaveTimer.current);
  };
  const toggle = () => {
    setPinnedState(!isPinned);
    setActive(null);
    setLinkOpen(false);
  };
  const words = Array.from(
    previewTitle.matchAll(/\S+\s*|\s+/gu),
    (word) => Array.from(
      new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(word[0]),
      (part) => ({ text: part.segment, index: word.index + part.index })
    )
  );
  useLayoutEffect6(() => {
    const el = measure.current;
    if (!el) return;
    const update = () => {
      const characters = Array.from(el.querySelectorAll("[data-title-char]"));
      if (!characters.length || !ellipsisMeasure.current) return;
      const first = characters[0].getBoundingClientRect();
      const rects = characters.map((char) => char.getBoundingClientRect());
      setLineGrowth(Math.min(3 * parseFloat(getComputedStyle(el).lineHeight), Math.max(0, ...rects.map((rect) => rect.top - first.top))));
      const truncated = rects.some(
        (rect) => rect.top > first.top + 2 || rect.right - first.left > titleWidths.rest
      );
      const limit = titleWidths.rest - ellipsisMeasure.current.getBoundingClientRect().width - 1;
      let end = conversationTitle.length, width = rects[rects.length - 1].right - first.left;
      if (truncated) {
        end = 0;
        width = 0;
        for (let i = 0; i < characters.length; i++) {
          const rect = rects[i], char = characters[i];
          if (rect.top > first.top + 2 || rect.right - first.left > limit) break;
          if (char.textContent?.trim()) {
            end = Number(char.dataset.titleChar) + char.textContent.length;
            width = rect.right - first.left;
          }
        }
      }
      setPrefix(
        (previous) => previous.end === end && previous.width === width && previous.truncated === truncated ? previous : { end, width, truncated }
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    document.fonts.addEventListener("loadingdone", update);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", update);
    };
  }, [conversationTitle, titleWidths.rest, activeTitleWidth, layoutKey]);
  useLayoutEffect6(() => {
    const el = clickedMeasure.current;
    if (!el) return;
    const update = () => {
      const line = parseFloat(getComputedStyle(el).lineHeight);
      setClickedGrowth(Math.min(line * 3, Math.max(0, el.getBoundingClientRect().height - line)));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    document.fonts.addEventListener("loadingdone", update);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", update);
    };
  }, [conversationTitle, titleWidths.split, layoutKey]);
  useEffect9(() => () => clearTimeout(leaveTimer.current), []);
  const placements = composites[count];
  const fieldWidth = Math.max(...placements.map(([x, , size]) => x + avatarPixels[size]));
  const fieldHeight = Math.max(...placements.map(([, y, size]) => y + avatarPixels[size]));
  const scale = restAvatarHeight !== void 0 ? restAvatarHeight / fieldHeight : count === 1 ? soloRestAvatarPixels / avatarPixels.lg : Math.min(1, 88 / fieldWidth, 76 / fieldHeight);
  const fieldSlotWidth = fieldWidth * scale;
  const expandedPixels = expandedAvatarSize ?? (count === 1 ? expandedAvatarPixels.large : count <= 3 ? expandedAvatarPixels.medium : expandedAvatarPixels.small);
  const rosterPitch = 88 * expandedPixels / expandedAvatarPixels.medium;
  return /* @__PURE__ */ jsxs21(
    motion.div,
    {
      className: cx17(styles.canvas, className),
      "data-pinned": isPinned,
      ref: canvas,
      onKeyDown: (event) => {
        if (event.key === "Escape" && active === null && !isLinkOpen && !linkedWorkOpen) {
          event.stopPropagation();
          close();
          trigger.current?.focus();
        }
      },
      style: {
        "--split": separation,
        "--reveal": disclosure2,
        "--line-growth": `${isPinned ? clickedGrowth : lineGrowth}px`,
        "--hp-split-cushion": `${splitCushion}px`,
        "--hp-roster-right": `${rosterRight}px`,
        "--hp-field-width": `${fieldSlotWidth}px`,
        "--roster-height": `${count * rosterPitch + 96}px`,
        "--title-rest-width": `${titleWidths.rest}px`,
        "--title-open-width": `${activeTitleWidth}px`,
        "--hp-split-width": `${splitWidth}px`
      },
      children: [
        /* @__PURE__ */ jsxs21("div", { ref: naturalCopy, className: "hp-split-measure", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsx26("h3", { className: styles.titleMeasure, children: conversationTitle }),
          /* @__PURE__ */ jsx26("div", { className: styles.subtitleRow, children: linkedWork2 }),
          chatId != null && /* @__PURE__ */ jsx26("span", { className: styles.chatId, children: chatId })
        ] }),
        /* @__PURE__ */ jsx26("div", { className: "hp-clicked-probe", "aria-hidden": "true", children: /* @__PURE__ */ jsx26("h3", { ref: clickedMeasure, className: styles.titleMeasure, style: { width: titleWidths.split }, children: conversationTitle }) }),
        /* @__PURE__ */ jsxs21("h3", { ref: measure, className: styles.titleMeasure, "aria-hidden": "true", children: [
          words.map((word, i) => /* @__PURE__ */ jsx26("span", { className: styles.titleWord, children: word.map((char) => /* @__PURE__ */ jsx26("span", { className: styles.titleChar, "data-title-char": char.index, children: char.text.replace(/ /g, "\xA0") }, char.index)) }, i)),
          /* @__PURE__ */ jsx26("span", { ref: ellipsisMeasure, className: styles.ellipsisMeasure, children: "\u2026" })
        ] }),
        /* @__PURE__ */ jsxs21(
          "div",
          {
            ref: card2,
            className: styles.card,
            "data-nc-conversation-card": "",
            "data-shape": shape,
            "data-count": count,
            "data-expanded": expanded,
            "data-pinned": isPinned,
            "data-two-lines": expanded && lineGrowth > 0,
            onPointerEnter: () => {
              pointerInside.current = true;
              reveal();
            },
            onPointerLeave: () => {
              pointerInside.current = false;
              dismiss();
            },
            onFocus: () => {
              focused.current = true;
              reveal();
            },
            onBlur: (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                focused.current = false;
                dismiss();
              }
            },
            children: [
              /* @__PURE__ */ jsx26("div", { className: styles.surface, "aria-hidden": "true", children: material ? /* @__PURE__ */ jsx26("div", { className: styles.glass }) : /* @__PURE__ */ jsx26(Card, { variant: "glass", className: styles.glass }) }),
              /* @__PURE__ */ jsx26(
                "button",
                {
                  ref: trigger,
                  type: "button",
                  className: styles.trigger,
                  "aria-expanded": isPinned,
                  "aria-label": `${isPinned ? "Collapse" : "Expand"} ${conversationTitle}`,
                  onClick: toggle
                }
              ),
              /* @__PURE__ */ jsxs21("div", { className: styles.copy, children: [
                /* @__PURE__ */ jsx26(Title3, { value: conversationTitle, variant: "conversation", onSave: onTitleSave, editing: titleEditing, onEditingChange: onTitleEditingChange, className: cx17(styles.titleFrame, isPinned && "hp-clicked-title"), editLabel: "Edit conversation title", children: isPinned ? conversationTitle : /* @__PURE__ */ jsxs21(Fragment7, { children: [
                  /* @__PURE__ */ jsx26("span", { className: styles.titleText, "aria-hidden": "true", children: words.map((word, i) => /* @__PURE__ */ jsx26("span", { className: styles.titleWord, children: word.map((char) => {
                    const existing = char.index < prefix.end;
                    const visible = existing || expanded;
                    return /* @__PURE__ */ jsx26(
                      motion.span,
                      {
                        className: styles.titleChar,
                        "data-existing": existing,
                        initial: false,
                        animate: { opacity: visible ? 1 : 0 },
                        transition: existing || reducedMotion ? { duration: 0 } : expanded ? approvedHeaderMotion.titleReveal : approvedHeaderMotion.titleCollapse,
                        children: char.text.replace(/ /g, "\xA0")
                      },
                      char.index
                    );
                  }) }, i)) }),
                  prefix.truncated && /* @__PURE__ */ jsx26("span", { className: styles.titleEllipsis, style: { left: prefix.width + 1 }, "aria-hidden": "true", children: "\u2026" })
                ] }) }),
                /* @__PURE__ */ jsxs21("div", { className: styles.subtitleRow, children: [
                  linkedWork2,
                  linkPopover !== void 0 && /* @__PURE__ */ jsxs21(Popover2, { open: isPinned && isLinkOpen, onOpenChange: setLinkOpen, children: [
                    /* @__PURE__ */ jsx26(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx26(
                      IconButton,
                      {
                        size: "sm",
                        variant: "tonal",
                        "data-nc-header-control": "",
                        className: headerControl({ kind: "link" }),
                        style: {
                          width: 28,
                          height: 28,
                          minHeight: 28,
                          borderRadius: shape === "rounded" ? "var(--sys-radius-sm)" : "var(--sys-radius-full)"
                        },
                        icon: linkIcon ?? /* @__PURE__ */ jsx26(Link2, { size: 14 }),
                        disabled: !isPinned,
                        tabIndex: isPinned ? 0 : -1,
                        "aria-hidden": !isPinned,
                        label: linkLabel,
                        onContextMenu: (event) => {
                          event.preventDefault();
                          setLinkOpen(true);
                        }
                      }
                    ) }),
                    /* @__PURE__ */ jsx26(
                      PopoverContent,
                      {
                        "data-header-owner": owner,
                        "data-nc-header-control": "",
                        className: headerControl({ kind: "linkPopover" }),
                        "aria-label": linkLabel,
                        align: "start",
                        children: linkPopover
                      }
                    )
                  ] })
                ] }),
                chatId != null && /* @__PURE__ */ jsx26("span", { className: styles.chatId, "aria-hidden": !isPinned, children: chatId })
              ] }),
              /* @__PURE__ */ jsx26("div", { className: styles.participantField, role: "group", "aria-label": `${count} participants`, children: placements.map(([x, y, size], index) => {
                const participant = participants[index];
                const pixels = avatarPixels[size];
                const startX = (fieldSlotWidth - fieldWidth * scale) / 2 + (x + pixels / 2) * scale;
                const startY = (76 - fieldHeight * scale) / 2 + (y + pixels / 2) * scale;
                const percent = participant.contextPercent === null || participant.contextPercent === void 0 ? "unknown" : `${participant.contextPercent}%`;
                const mark = participant.mark ?? "";
                const attention = participant.attention ?? !/^\d+$/.test(mark);
                const detail = renderParticipantDetail?.(participant, index);
                return /* @__PURE__ */ jsxs21(
                  "div",
                  {
                    className: styles.agent,
                    style: {
                      "--start-x": `${startX}px`,
                      "--start-y": `${startY}px`,
                      "--end-y": count === 1 ? "calc(48px + var(--line-growth) * .5 * var(--reveal))" : `${expandedPixels / 2 + 4 + index * rosterPitch}px`,
                      "--start-scale": pixels * scale / avatarPixels.lg,
                      "--end-scale": expandedPixels / avatarPixels.lg
                    },
                    children: [
                      /* @__PURE__ */ jsxs21(
                        Popover2,
                        {
                          open: isPinned && active === index && detail != null,
                          onOpenChange: (open) => {
                            if (!open) closeDetail();
                            else {
                              detailHoverOpened.current = false;
                              pinDetail();
                              setActive(index);
                            }
                          },
                          children: [
                            /* @__PURE__ */ jsx26(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs21(
                              "button",
                              {
                                type: "button",
                                className: styles.avatarButton,
                                disabled: !isPinned,
                                tabIndex: isPinned ? 0 : -1,
                                onPointerEnter: (event) => {
                                  if (event.pointerType !== "touch") previewDetail(index);
                                },
                                onPointerLeave: leaveDetail,
                                onClick: (event) => {
                                  event.preventDefault();
                                  if (active === index && detailPinned.current) closeDetail();
                                  else {
                                    if (active !== index) detailHoverOpened.current = false;
                                    pinDetail();
                                    setActive(index);
                                  }
                                },
                                "aria-label": `${participant.name}, context ${percent}, ${participant.status ?? ""}`,
                                title: `${participant.name} \xB7 Context ${percent} \xB7 ${participant.status ?? ""}`,
                                children: [
                                  /* @__PURE__ */ jsx26(
                                    Avatar,
                                    {
                                      name: participant.name,
                                      src: participant.src,
                                      color: participant.color,
                                      kind: shape === "rounded" ? "agent" : "person",
                                      size: "lg"
                                    }
                                  ),
                                  /* @__PURE__ */ jsx26("span", { className: styles.contextDecoration, "aria-hidden": "true", children: /* @__PURE__ */ jsx26(ContextRing, { shape, percent: participant.contextPercent ?? null }) }),
                                  /* @__PURE__ */ jsx26("span", { className: styles.expandedDecoration, "aria-hidden": "true", children: mark && /* @__PURE__ */ jsx26("span", { className: styles.statusBadge, "data-attention": attention, children: mark }) })
                                ]
                              }
                            ) }),
                            /* @__PURE__ */ jsx26(
                              PopoverContent,
                              {
                                "data-header-owner": owner,
                                "data-nc-header-control": "",
                                "data-nc-detail-host": "",
                                "data-layout": "profile",
                                className: headerControl({ kind: "detailPopover" }),
                                "aria-label": `${participant.name} details`,
                                side: narrowViewport ? "bottom" : "right",
                                align: narrowViewport ? "end" : "start",
                                sideOffset: 16,
                                collisionPadding: 12,
                                onPointerEnter: holdDetail,
                                onPointerLeave: leaveDetail,
                                onPointerDownCapture: pinDetail,
                                onFocusCapture: pinDetail,
                                onOpenAutoFocus: (event) => {
                                  if (detailHoverOpened.current) event.preventDefault();
                                },
                                onInteractOutside: (event) => {
                                  if (document.querySelector("[data-agent-file-layer]") || event.target?.closest(
                                    `[data-atlas-layout-control], [data-header-owner], [data-model-owner="${owner}"]`
                                  ))
                                    event.preventDefault();
                                },
                                onCloseAutoFocus: (event) => {
                                  if (!isPinned || detailHoverOpened.current) event.preventDefault();
                                },
                                children: detail
                              }
                            )
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx26("span", { className: styles.agentName, "aria-hidden": !isPinned, children: participant.name })
                    ]
                  },
                  participant.id ?? participant.name
                );
              }) })
            ]
          }
        )
      ]
    }
  );
}

// src/AgentDetailCard.tsx
import {
  useCallback as useCallback2,
  useLayoutEffect as useLayoutEffect7,
  useRef as useRef14,
  useState as useState12
} from "react";
import { Bot as Bot4, Check as Check5, ChevronRight as ChevronRight3, FileText as FileText4, Terminal } from "lucide-react";
import { Fragment as Fragment8, jsx as jsx27, jsxs as jsxs22 } from "react/jsx-runtime";
var cx18 = (...values) => values.filter(Boolean).join(" ");
function LiveItem({ name, value }) {
  const styles = agentDetail();
  return /* @__PURE__ */ jsxs22(InlineCluster, { className: styles.liveItem, "data-nc-nowrap": "", children: [
    /* @__PURE__ */ jsx27(RippleLoader, { size: 12, label: `${typeof name === "string" ? name : "Item"} in progress` }),
    /* @__PURE__ */ jsx27("span", { className: styles.itemName, children: name }),
    value != null && /* @__PURE__ */ jsx27("span", { className: styles.trailing, children: value })
  ] });
}
function WorkGroup({
  label,
  icon,
  summary,
  live,
  children
}) {
  const styles = agentDetail();
  const [open, setOpen] = useState12(false);
  return /* @__PURE__ */ jsxs22("section", { className: styles.workGroup, "aria-label": label, children: [
    /* @__PURE__ */ jsxs22(
      "button",
      {
        type: "button",
        className: styles.workTrigger,
        "aria-expanded": open,
        onClick: () => setOpen(!open),
        children: [
          icon,
          /* @__PURE__ */ jsx27("span", { children: label }),
          /* @__PURE__ */ jsx27("span", { className: styles.workSummary, children: summary }),
          /* @__PURE__ */ jsx27(ChevronRight3, { size: 13, className: styles.workChevron, "aria-hidden": "true" })
        ]
      }
    ),
    !open && live,
    open && /* @__PURE__ */ jsx27("div", { className: styles.workContent, children })
  ] });
}
function AgentDetailCard({
  name,
  shape,
  contextRing,
  avatarSrc,
  profilePopover,
  profileLabel = "Open agent profile",
  harness,
  harnessLabel,
  surface: surface2 = "",
  onSurfaceChange,
  status,
  statusIcon,
  statusDetail,
  since,
  blocked = false,
  blockedNote = "Respond from fleet management (not built yet)",
  sessionId,
  used,
  capacity,
  permission,
  permissionOptions,
  onPermissionChange,
  model,
  modelOptions,
  onModelChange,
  reasoning,
  reasoningOptions,
  onReasoningChange,
  subagents = [],
  background = [],
  files = [],
  workingFiles: workingFiles2,
  owner,
  className
}) {
  const styles = agentDetail();
  const [permissionOpen, setPermissionOpen] = useState12(false);
  const [editing, setEditing] = useState12(false);
  const [draft, setDraft] = useState12(surface2);
  const surfaceButton = useRef14(null);
  const statusControls = useRef14(null);
  const [detailOffset, setDetailOffset] = useState12(1);
  const measureDetailOffset = useCallback2(() => {
    const controls = statusControls.current;
    const card2 = controls?.closest("[data-nc-detail-host]");
    if (!controls || !card2) return;
    setDetailOffset(
      card2.getBoundingClientRect().right - controls.getBoundingClientRect().right + 1
    );
  }, []);
  useLayoutEffect7(() => {
    const controls = statusControls.current;
    const card2 = controls?.closest("[data-nc-detail-host]");
    if (!controls || !card2) return;
    measureDetailOffset();
    const observer = new ResizeObserver(measureDetailOffset);
    observer.observe(card2);
    observer.observe(controls);
    window.addEventListener("resize", measureDetailOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureDetailOffset);
    };
  }, [measureDetailOffset]);
  const percent = used === null ? null : Math.round(used / capacity * 100);
  const color = percent === null ? "var(--il-dim)" : percent >= 90 ? "var(--sys-sem-danger)" : percent >= 80 ? "var(--sys-sem-progress-hover)" : "var(--nc-sage)";
  const option = permissionOptions.find((item) => item.value === permission) ?? permissionOptions[0];
  const workingSubs = subagents.filter((item) => item.working);
  const doneSubs = subagents.filter((item) => !item.working);
  const liveProcesses = background.filter((item) => item.running);
  const activeFiles = files.filter((item) => item.active);
  const finishSurface = () => {
    setEditing(false);
    requestAnimationFrame(() => surfaceButton.current?.focus());
  };
  return /* @__PURE__ */ jsx27(SpacingDensity, { value: "default", children: /* @__PURE__ */ jsxs22(
    "div",
    {
      className: cx18(styles.root, headerControl({ kind: "agentCard" }), className),
      "data-nc-header-control": "",
      "data-shape": shape,
      "data-composer-menu-surface": true,
      children: [
        /* @__PURE__ */ jsx27("div", { className: styles.agentPlane, "data-nc-plane": "agent", children: /* @__PURE__ */ jsxs22(Stack, { children: [
          /* @__PURE__ */ jsxs22("div", { className: styles.identity, children: [
            /* @__PURE__ */ jsxs22(Popover2, { children: [
              /* @__PURE__ */ jsx27(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs22(
                "button",
                {
                  type: "button",
                  className: styles.avatar,
                  title: profileLabel,
                  "aria-label": profileLabel,
                  children: [
                    /* @__PURE__ */ jsx27(
                      Avatar,
                      {
                        name,
                        src: avatarSrc,
                        kind: shape === "capsule" ? "person" : "agent",
                        size: "lg"
                      }
                    ),
                    contextRing
                  ]
                }
              ) }),
              /* @__PURE__ */ jsx27(
                PopoverContent,
                {
                  "data-header-owner": owner,
                  "data-nc-header-control": "",
                  className: headerControl({ kind: "smallPopover" }),
                  side: "bottom",
                  align: "start",
                  sideOffset: 9,
                  children: profilePopover
                }
              )
            ] }),
            /* @__PURE__ */ jsxs22("div", { className: styles.identityText, children: [
              /* @__PURE__ */ jsx27("span", { className: styles.name, children: name }),
              /* @__PURE__ */ jsxs22("div", { className: styles.subtitle, children: [
                harness != null && /* @__PURE__ */ jsx27(Tooltip, { label: harnessLabel ?? "", side: "bottom", disabled: !harnessLabel, children: /* @__PURE__ */ jsx27(
                  "span",
                  {
                    className: styles.harness,
                    role: "img",
                    "aria-label": harnessLabel,
                    tabIndex: 0,
                    children: harness
                  }
                ) }),
                /* @__PURE__ */ jsx27(
                  "button",
                  {
                    ref: surfaceButton,
                    className: styles.surface,
                    type: "button",
                    "aria-label": `Edit running surface: ${surface2 || "not set"}`,
                    "aria-expanded": editing,
                    onClick: () => {
                      setDraft(surface2);
                      setEditing(!editing);
                    },
                    children: surface2 || "Add surface"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs22(Stack, { ref: statusControls, className: styles.statusControls, children: [
              /* @__PURE__ */ jsxs22(Popover2, { onOpenChange: (open) => {
                if (open) measureDetailOffset();
              }, children: [
                /* @__PURE__ */ jsx27(Tooltip, { label: status, side: "right", children: /* @__PURE__ */ jsx27(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx27(
                  "button",
                  {
                    type: "button",
                    className: styles.status,
                    "aria-label": status,
                    "data-attention": blocked,
                    children: statusIcon
                  }
                ) }) }),
                /* @__PURE__ */ jsx27(
                  PopoverContent,
                  {
                    "data-header-owner": owner,
                    "data-nc-header-control": "",
                    "data-detail": "status",
                    "aria-label": "Agent status",
                    className: headerControl({ kind: "smallPopover" }),
                    side: "right",
                    align: "start",
                    sideOffset: detailOffset,
                    avoidCollisions: true,
                    collisionPadding: 12,
                    children: /* @__PURE__ */ jsxs22(Stack, { className: styles.detailBody, children: [
                      /* @__PURE__ */ jsx27("strong", { children: status }),
                      statusDetail != null && /* @__PURE__ */ jsx27("p", { children: statusDetail }),
                      since != null && /* @__PURE__ */ jsx27("p", { className: styles.dim, children: since }),
                      blocked && /* @__PURE__ */ jsx27("p", { children: blockedNote })
                    ] })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs22(
                Popover2,
                {
                  open: permissionOpen,
                  onOpenChange: (open) => {
                    if (open) measureDetailOffset();
                    setPermissionOpen(open);
                  },
                  children: [
                    /* @__PURE__ */ jsx27(Tooltip, { label: option?.label ?? permission, side: "right", children: /* @__PURE__ */ jsx27(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx27(
                      "button",
                      {
                        type: "button",
                        className: styles.status,
                        "aria-label": `Permissions: ${option?.label ?? permission}`,
                        children: option?.icon
                      }
                    ) }) }),
                    /* @__PURE__ */ jsx27(
                      PopoverContent,
                      {
                        "data-header-owner": owner,
                        "data-nc-header-control": "",
                        "data-detail": "permissions",
                        className: headerControl({ kind: "smallPopover" }),
                        side: "right",
                        align: "start",
                        sideOffset: detailOffset,
                        avoidCollisions: true,
                        collisionPadding: 12,
                        "aria-label": "Permissions",
                        children: /* @__PURE__ */ jsxs22(Stack, { className: styles.detailBody, children: [
                          /* @__PURE__ */ jsx27("strong", { children: "Permissions" }),
                          /* @__PURE__ */ jsx27("div", { className: styles.permissionOptions, role: "group", "aria-label": "Permission level", children: permissionOptions.map((item) => /* @__PURE__ */ jsxs22(
                            Button,
                            {
                              type: "button",
                              variant: "text",
                              size: "sm",
                              style: { width: "100%", justifyContent: "flex-start", gap: "var(--sys-space-3, 9px)" },
                              "aria-pressed": option?.value === item.value,
                              onClick: () => {
                                onPermissionChange(item.value);
                                setPermissionOpen(false);
                              },
                              children: [
                                item.icon,
                                /* @__PURE__ */ jsx27("span", { style: { flex: 1, textAlign: "left" }, children: item.label }),
                                option?.value === item.value && /* @__PURE__ */ jsx27(Check5, { size: 14, "aria-hidden": "true" })
                              ]
                            },
                            item.value
                          )) })
                        ] })
                      }
                    )
                  ]
                }
              ),
              subagents.length > 0 && /* @__PURE__ */ jsxs22(Popover2, { onOpenChange: (open) => {
                if (open) measureDetailOffset();
              }, children: [
                /* @__PURE__ */ jsx27(Tooltip, { label: "Subagents & forks", side: "right", children: /* @__PURE__ */ jsx27(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx27(
                  "button",
                  {
                    type: "button",
                    className: styles.status,
                    "aria-label": `Subagents & forks: ${subagents.length}`,
                    children: /* @__PURE__ */ jsx27(Bot4, { size: 18, "aria-hidden": "true" })
                  }
                ) }) }),
                /* @__PURE__ */ jsx27(
                  PopoverContent,
                  {
                    "data-header-owner": owner,
                    "data-nc-header-control": "",
                    "data-detail": "subagents",
                    className: headerControl({ kind: "smallPopover" }),
                    side: "right",
                    align: "start",
                    sideOffset: detailOffset,
                    avoidCollisions: true,
                    collisionPadding: 12,
                    "aria-label": "Subagents & forks",
                    children: /* @__PURE__ */ jsxs22(Stack, { className: styles.detailBody, children: [
                      /* @__PURE__ */ jsxs22(InlineCluster, { children: [
                        /* @__PURE__ */ jsx27("strong", { children: "Subagents & forks" }),
                        /* @__PURE__ */ jsxs22("span", { className: styles.trailing, children: [
                          workingSubs.length,
                          " working \xB7 ",
                          doneSubs.length,
                          " done"
                        ] })
                      ] }),
                      subagents.map((item) => /* @__PURE__ */ jsxs22("div", { children: [
                        /* @__PURE__ */ jsxs22(InlineCluster, { children: [
                          item.working && /* @__PURE__ */ jsx27(RippleLoader, { size: 12, label: `${item.name} in progress` }),
                          /* @__PURE__ */ jsx27("span", { children: item.name }),
                          /* @__PURE__ */ jsx27("span", { className: styles.trailing, children: item.working ? "Working" : "Done" })
                        ] }),
                        item.activity != null && /* @__PURE__ */ jsx27("p", { className: styles.dim, children: item.activity })
                      ] }, item.name))
                    ] })
                  }
                )
              ] })
            ] })
          ] }),
          editing && /* @__PURE__ */ jsx27(
            "form",
            {
              onSubmit: (event) => {
                event.preventDefault();
                onSurfaceChange?.(draft.trim());
                finishSurface();
              },
              children: /* @__PURE__ */ jsxs22(Stack, { children: [
                /* @__PURE__ */ jsx27(
                  Input,
                  {
                    autoFocus: true,
                    label: "Running surface",
                    value: draft,
                    onChange: (event) => setDraft(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        finishSurface();
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsxs22(InlineCluster, { children: [
                  /* @__PURE__ */ jsx27(Button, { type: "submit", size: "sm", children: "Save" }),
                  /* @__PURE__ */ jsx27(Button, { type: "button", size: "sm", variant: "text", onClick: finishSurface, children: "Cancel" })
                ] })
              ] })
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx27("div", { className: styles.sessionPlane, "data-nc-plane": "session", children: /* @__PURE__ */ jsxs22(Stack, { children: [
          /* @__PURE__ */ jsx27("div", { className: styles.sessionRow, children: /* @__PURE__ */ jsx27("span", { className: styles.sessionId, children: sessionId }) }),
          /* @__PURE__ */ jsxs22(Stack, { className: styles.context, children: [
            /* @__PURE__ */ jsxs22("div", { className: styles.contextLabel, children: [
              /* @__PURE__ */ jsx27("span", { children: percent === null ? "Context unavailable" : /* @__PURE__ */ jsxs22(Fragment8, { children: [
                /* @__PURE__ */ jsxs22("strong", { children: [
                  percent,
                  "%"
                ] }),
                " ",
                /* @__PURE__ */ jsx27("span", { className: styles.dim, children: "context" })
              ] }) }),
              used !== null && /* @__PURE__ */ jsxs22("span", { className: styles.dim, children: [
                Math.round(used / 1e3),
                "k / ",
                capacity / 1e3,
                "k"
              ] })
            ] }),
            used === null ? /* @__PURE__ */ jsx27("div", { className: styles.contextUnknown, role: "img", "aria-label": "Context unavailable" }) : /* @__PURE__ */ jsx27(
              Progress,
              {
                value: used,
                max: capacity,
                label: `${name} context`,
                style: { "--sys-accent": color }
              }
            ),
            /* @__PURE__ */ jsxs22(InlineCluster, { className: styles.selectors, "data-nc-nowrap": "", children: [
              /* @__PURE__ */ jsx27(
                ComposerChoice,
                {
                  label: "Model",
                  value: model,
                  options: modelOptions,
                  onValueChange: onModelChange,
                  menuOwner: owner
                }
              ),
              /* @__PURE__ */ jsx27(
                ComposerChoice,
                {
                  label: "Reasoning",
                  value: reasoning,
                  options: reasoningOptions,
                  onValueChange: onReasoningChange,
                  menuOwner: owner
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs22(Stack, { className: styles.work, children: [
            background.length > 0 && /* @__PURE__ */ jsx27(
              WorkGroup,
              {
                label: "Background",
                icon: /* @__PURE__ */ jsx27(Terminal, { size: 13, "aria-hidden": "true" }),
                summary: `${liveProcesses.length} running`,
                live: liveProcesses.map((item) => /* @__PURE__ */ jsx27(
                  LiveItem,
                  {
                    name: item.name,
                    value: item.progress === void 0 ? void 0 : `${item.progress}%`
                  },
                  item.name
                )),
                children: /* @__PURE__ */ jsx27(Stack, { children: background.map((item) => /* @__PURE__ */ jsxs22(InlineCluster, { children: [
                  item.running && /* @__PURE__ */ jsx27(RippleLoader, { size: 12, label: `${item.name} in progress` }),
                  /* @__PURE__ */ jsx27("span", { children: item.name }),
                  /* @__PURE__ */ jsxs22("span", { className: styles.trailing, children: [
                    item.running ? "Running" : "Done",
                    item.progress === void 0 ? "" : ` \xB7 ${item.progress}%`
                  ] })
                ] }, item.name)) })
              }
            ),
            /* @__PURE__ */ jsx27(
              WorkGroup,
              {
                label: "Working files",
                icon: /* @__PURE__ */ jsx27(FileText4, { size: 13, "aria-hidden": "true" }),
                summary: String(files.length),
                live: activeFiles.map((item) => /* @__PURE__ */ jsx27(LiveItem, { name: item.name }, item.name)),
                children: /* @__PURE__ */ jsx27("div", { "data-nc-files": "", children: workingFiles2 })
              }
            )
          ] })
        ] }) })
      ]
    }
  ) });
}

// src/LinkedWork.tsx
import { useLayoutEffect as useLayoutEffect8, useRef as useRef15, useState as useState13 } from "react";
import { Anchor as Anchor2 } from "@radix-ui/react-popover";
import { Fragment as Fragment9, jsx as jsx28, jsxs as jsxs23 } from "react/jsx-runtime";
var cx19 = (...values) => values.filter(Boolean).join(" ");
function LinkedWorkLinks({ className, ...props }) {
  const styles = linkedWork();
  return /* @__PURE__ */ jsx28("span", { ...props, className: cx19(styles.links, className) });
}
function LinkedWorkDivider() {
  const styles = linkedWork();
  return /* @__PURE__ */ jsx28("span", { className: styles.divider, "aria-hidden": "true", children: "\xB7" });
}
function LinkedWorkTrigger({
  label,
  ariaLabel,
  children,
  owner,
  open,
  onOpenChange,
  presentation = "popover",
  drawerTitle = ariaLabel,
  width,
  onWidthChange,
  resizable = true,
  onInteractOutside,
  onEscapeKeyDown,
  className
}) {
  const styles = linkedWork();
  const [ownOpen, setOwnOpen] = useState13(false);
  const isOpen = open ?? ownOpen;
  const setOpen = (next) => {
    if (open === void 0) setOwnOpen(next);
    onOpenChange?.(next);
  };
  const [ownWidth, setOwnWidth] = useState13(500);
  const previewWidth = width ?? ownWidth;
  const setWidth = (next) => {
    if (width === void 0) setOwnWidth(next);
    onWidthChange?.(next);
  };
  const cardAnchor = useRef15(null);
  const [placement, setPlacement] = useState13({ offset: 0, height: 720 });
  useLayoutEffect8(() => {
    if (!isOpen || presentation === "drawer") return;
    let frame2 = 0;
    const track = () => {
      const rect = cardAnchor.current?.getBoundingClientRect();
      if (rect) {
        const visibleWidth = Math.min(previewWidth, window.innerWidth - 24);
        const offset = Math.max(12, Math.min(rect.left, window.innerWidth - visibleWidth - 12)) - rect.left;
        const height = Math.max(0, Math.min(720, window.innerHeight - rect.bottom - 12));
        setPlacement(
          (previous) => previous.offset === offset && previous.height === height ? previous : { offset, height }
        );
      }
      frame2 = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame2);
  }, [isOpen, previewWidth, presentation]);
  if (presentation === "drawer") {
    return /* @__PURE__ */ jsxs23(Fragment9, { children: [
      /* @__PURE__ */ jsx28(
        Button,
        {
          variant: "text",
          size: "sm",
          "data-nc-header-control": "",
          className: cx19(headerControl({ kind: "linkedWorkTrigger" }), className),
          "aria-label": ariaLabel,
          "aria-haspopup": "dialog",
          "aria-expanded": isOpen,
          onClick: () => setOpen(true),
          children: /* @__PURE__ */ jsx28("span", { className: styles.triggerLabel, children: label })
        }
      ),
      /* @__PURE__ */ jsx28(
        Drawer,
        {
          open: isOpen,
          onOpenChange: setOpen,
          onEscapeKeyDown: (event) => {
            event.stopPropagation();
            onEscapeKeyDown?.(event);
          },
          title: drawerTitle,
          closeLabel: `Close ${drawerTitle.toLowerCase()} drawer`,
          bodyLabel: `${drawerTitle} details`,
          children: /* @__PURE__ */ jsx28("div", { "data-header-owner": owner, "data-linked-work-layer": "", children })
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxs23(Popover2, { open: isOpen, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx28(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx28(
      Button,
      {
        variant: "text",
        size: "sm",
        "data-nc-header-control": "",
        className: cx19(headerControl({ kind: "linkedWorkTrigger" }), className),
        "aria-label": ariaLabel,
        onClick: (event) => {
          cardAnchor.current = event.currentTarget.closest(
            "[data-nc-conversation-card]"
          );
        },
        children: /* @__PURE__ */ jsx28("span", { className: styles.triggerLabel, children: label })
      }
    ) }),
    /* @__PURE__ */ jsx28(Anchor2, { virtualRef: cardAnchor }),
    /* @__PURE__ */ jsxs23(
      PopoverContent,
      {
        "data-header-owner": owner,
        "data-linked-work-preview": true,
        "data-nc-header-control": "",
        className: headerControl({ kind: "linkedWorkPopover" }),
        "aria-label": ariaLabel,
        side: "bottom",
        align: "start",
        sideOffset: 0,
        updatePositionStrategy: "always",
        avoidCollisions: false,
        alignOffset: placement.offset,
        style: { width: previewWidth, maxWidth: "calc(100vw - 24px)", maxHeight: placement.height },
        onInteractOutside,
        onEscapeKeyDown,
        children: [
          children,
          resizable && /* @__PURE__ */ jsx28(
            ResizeHandle,
            {
              "data-nc-header-control": "",
              className: headerControl({ kind: "linkedWorkResize" }),
              label: "Resize linked work preview",
              value: previewWidth,
              min: 340,
              max: Math.max(340, Math.min(760, window.innerWidth - 32)),
              onValueChange: setWidth
            }
          )
        ]
      }
    )
  ] });
}

// src/WorkingFilesList.tsx
import { useRef as useRef16, useState as useState14 } from "react";
import { ChevronRight as ChevronRight4, Copy, ExternalLink, FileCode2, FileDiff, FolderInput } from "lucide-react";
import { jsx as jsx29, jsxs as jsxs24 } from "react/jsx-runtime";
var cx20 = (...values) => values.filter(Boolean).join(" ");
function WorkingFilesList({
  files,
  label = "Working Files",
  owner,
  onOpenFile,
  onCopyPath,
  expanded,
  onExpandedChange,
  diffIcon,
  notice,
  className
}) {
  const styles = workingFiles();
  const [ownExpanded, setOwnExpanded] = useState14(null);
  const open = expanded !== void 0 ? expanded : ownExpanded;
  const setOpen = (next) => {
    if (expanded === void 0) setOwnExpanded(next);
    onExpandedChange?.(next);
  };
  const menuTrigger = useRef16(null);
  const pendingView = useRef16(null);
  return /* @__PURE__ */ jsx29(
    Section,
    {
      className: cx20(styles.root, className),
      level: 3,
      "aria-label": "Working Files",
      title: /* @__PURE__ */ jsxs24(InlineCluster, { className: styles.heading, children: [
        /* @__PURE__ */ jsx29(Text, { variant: "small", tone: "muted", children: label }),
        /* @__PURE__ */ jsx29(Text, { variant: "small", tone: "dim", children: files.length })
      ] }),
      children: /* @__PURE__ */ jsxs24(Stack, { className: styles.list, children: [
        files.map((file) => /* @__PURE__ */ jsxs24(Stack, { className: styles.file, children: [
          /* @__PURE__ */ jsxs24("div", { className: styles.row, children: [
            /* @__PURE__ */ jsxs24(ContextMenu, { children: [
              /* @__PURE__ */ jsx29(ContextMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs24(
                "button",
                {
                  className: styles.open,
                  onContextMenu: (event) => {
                    menuTrigger.current = event.currentTarget;
                  },
                  onKeyDown: (event) => {
                    if (event.key === "ContextMenu" || event.shiftKey && event.key === "F10")
                      menuTrigger.current = event.currentTarget;
                  },
                  onClick: (event) => onOpenFile?.(file, "file", event.currentTarget),
                  "aria-label": `Open ${file.name}`,
                  children: [
                    /* @__PURE__ */ jsx29(FileCode2, { size: 16, "aria-hidden": "true" }),
                    file.active && /* @__PURE__ */ jsx29(RippleLoader, { size: 12, label: `${file.name} in progress` }),
                    /* @__PURE__ */ jsx29("span", { children: file.name })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsxs24(
                ContextMenuContent,
                {
                  target: "file",
                  "data-header-owner": owner,
                  "data-nc-header-control": "",
                  className: headerControl({ kind: "fileMenu" }),
                  onCloseAutoFocus: (event) => {
                    if (pendingView.current) {
                      event.preventDefault();
                      const next = pendingView.current;
                      pendingView.current = null;
                      requestAnimationFrame(
                        () => onOpenFile?.(next.file, next.view, menuTrigger.current ?? void 0)
                      );
                    }
                  },
                  children: [
                    /* @__PURE__ */ jsx29("div", { className: styles.menuLabel, children: "Open in" }),
                    /* @__PURE__ */ jsxs24(ContextMenuItem, { onSelect: () => {
                      pendingView.current = { file, view: "file" };
                    }, children: [
                      /* @__PURE__ */ jsx29(FileCode2, { size: 15 }),
                      "File viewer"
                    ] }),
                    /* @__PURE__ */ jsxs24(ContextMenuItem, { onSelect: () => {
                      pendingView.current = { file, view: "external" };
                    }, children: [
                      /* @__PURE__ */ jsx29(ExternalLink, { size: 15 }),
                      "External app"
                    ] }),
                    /* @__PURE__ */ jsx29(ContextMenuSeparator, {}),
                    /* @__PURE__ */ jsxs24(ContextMenuItem, { onSelect: () => onCopyPath?.(file), children: [
                      /* @__PURE__ */ jsx29(Copy, { size: 15 }),
                      "Copy pathname"
                    ] }),
                    /* @__PURE__ */ jsxs24(ContextMenuItem, { onSelect: () => {
                      pendingView.current = { file, view: "move" };
                    }, children: [
                      /* @__PURE__ */ jsx29(FolderInput, { size: 15 }),
                      "Move file"
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx29(
              "button",
              {
                className: styles.disclosure,
                "aria-label": `Details for ${file.name}`,
                "aria-expanded": open === file.name,
                "aria-controls": `file-detail-${owner}-${file.name}`,
                onClick: () => setOpen(open === file.name ? null : file.name),
                children: /* @__PURE__ */ jsx29(ChevronRight4, { size: 13, "aria-hidden": "true" })
              }
            ),
            /* @__PURE__ */ jsx29(
              "button",
              {
                className: styles.space,
                "aria-label": `Toggle details for ${file.name}`,
                tabIndex: -1,
                onClick: () => setOpen(open === file.name ? null : file.name)
              }
            ),
            /* @__PURE__ */ jsx29("span", { className: styles.diff, children: file.hasDiff && /* @__PURE__ */ jsx29(
              IconButton,
              {
                size: "sm",
                variant: "text",
                "data-nc-header-control": "",
                className: headerControl({ kind: "fileDiffButton" }),
                label: `View changes to ${file.name}`,
                icon: diffIcon ?? /* @__PURE__ */ jsx29(FileDiff, { size: 16 }),
                onClick: (event) => onOpenFile?.(file, "diff", event.currentTarget)
              }
            ) })
          ] }),
          open === file.name && /* @__PURE__ */ jsxs24(Stack, { className: styles.detail, id: `file-detail-${owner}-${file.name}`, children: [
            file.summary != null && /* @__PURE__ */ jsx29(Text, { as: "p", variant: "small", tone: "muted", children: file.summary }),
            /* @__PURE__ */ jsx29(Text, { as: "p", variant: "mono", tone: "dim", children: file.path })
          ] })
        ] }, file.name)),
        notice != null && /* @__PURE__ */ jsx29(Text, { as: "p", variant: "small", tone: "muted", role: "status", children: notice })
      ] })
    }
  );
}
function WorkingFileDrawerBody({
  name,
  path,
  owner,
  children,
  className
}) {
  const styles = workingFiles();
  return /* @__PURE__ */ jsxs24("div", { "data-agent-file-layer": true, "data-header-owner": owner, className: cx20(styles.drawerBody, className), children: [
    /* @__PURE__ */ jsx29(Text, { className: styles.fileTitle, children: name }),
    /* @__PURE__ */ jsx29(Text, { as: "p", variant: "mono", tone: "muted", className: styles.filePath, children: path }),
    children
  ] });
}
function FileCode({ children, diff, className }) {
  const styles = workingFiles();
  if (diff) {
    return /* @__PURE__ */ jsx29("pre", { className: cx20(styles.fileCode, className), children: diff.map((line, i) => /* @__PURE__ */ jsxs24(
      "span",
      {
        className: styles.diffLine,
        "data-change": line[0] === "+" ? "added" : line[0] === "-" ? "removed" : "same",
        children: [
          line,
          "\n"
        ]
      },
      i
    )) });
  }
  return /* @__PURE__ */ jsx29("pre", { className: cx20(styles.fileCode, className), children: /* @__PURE__ */ jsx29("code", { children }) });
}
function FileMoveForm({
  className,
  ...props
}) {
  const styles = workingFiles();
  return /* @__PURE__ */ jsx29("form", { ...props, className: cx20(styles.moveForm, className) });
}

// src/ChatNavigation.tsx
import { ArrowLeft, ArrowRight, PanelRight } from "lucide-react";
import { jsx as jsx30, jsxs as jsxs25 } from "react/jsx-runtime";
function ChatHistoryNavigation({ onBack, onForward, canGoBack = true, canGoForward = true }) {
  return /* @__PURE__ */ jsxs25(InlineCluster, { role: "group", "aria-label": "Conversation navigation", "data-chat-navigation": "", children: [
    /* @__PURE__ */ jsx30(IconButton, { variant: "tonal", className: chatNavigationControl(), label: "Go back", icon: /* @__PURE__ */ jsx30(ArrowLeft, {}), onClick: onBack, disabled: !canGoBack }),
    /* @__PURE__ */ jsx30(IconButton, { variant: "tonal", className: chatNavigationControl(), label: "Go forward", icon: /* @__PURE__ */ jsx30(ArrowRight, {}), onClick: onForward, disabled: !canGoForward })
  ] });
}
function RightPanelToggle({ open, onToggle, className, ...props }) {
  return /* @__PURE__ */ jsx30(
    IconButton,
    {
      ...props,
      variant: "tonal",
      className: [chatNavigationControl(), className].filter(Boolean).join(" "),
      label: open ? "Close right side panel" : "Open right side panel",
      icon: /* @__PURE__ */ jsx30(PanelRight, {}),
      "aria-expanded": open,
      onClick: onToggle
    }
  );
}

// src/ConversationWelcome.tsx
import { jsx as jsx31, jsxs as jsxs26 } from "react/jsx-runtime";
function ConversationWelcome({
  wordmarkSrc,
  title: title2 = "What are we working on?",
  description = "Bring an idea, a question, or a piece of work. We\u2019ll take it from there."
}) {
  const styles = conversationWelcome();
  return /* @__PURE__ */ jsxs26("section", { className: styles.root, "aria-label": "Start a conversation", "data-conversation-welcome": "", children: [
    wordmarkSrc && /* @__PURE__ */ jsx31("img", { className: styles.wordmark, src: wordmarkSrc, alt: "Nova Caelum", width: 1152, height: 648, draggable: false }),
    /* @__PURE__ */ jsx31("h2", { className: styles.title, children: title2 }),
    /* @__PURE__ */ jsx31("p", { className: styles.description, children: description })
  ] });
}

// src/conversation-welcome-tokens.ts
var conversationWelcomeTokens = {
  // Keep the transparent asset's layout box stable so copy does not move.
  "--nc-welcome-wordmark-width": "288px",
  "--nc-welcome-wordmark-scale": "0.6375",
  "--nc-welcome-wordmark-offset": "calc(var(--nc-graph-size) + var(--sys-space-3) + var(--sys-space-1))",
  "--nc-welcome-wordmark-gap": "var(--sys-space-4)",
  "--nc-welcome-title-size": "clamp(32px, 4vw, 44px)",
  "--nc-welcome-title-leading": "1.1",
  "--nc-welcome-description-size": "12px",
  "--nc-welcome-description-leading": "18px",
  "--nc-welcome-description-gap": "var(--sys-space-4)"
};

// src/Notification.tsx
import { createContext as createContext4, useCallback as useCallback3, useContext as useContext4, useEffect as useEffect10, useId as useId10, useMemo, useRef as useRef17, useState as useState15 } from "react";
import { Bell, Check as Check6, CheckCircle2, ChevronDown as ChevronDown4, CircleHelp, KeyRound as KeyRound3, TriangleAlert, X as X6 } from "lucide-react";
import { Fragment as Fragment10, jsx as jsx32, jsxs as jsxs27 } from "react/jsx-runtime";
var tones = { error: "danger", permission: "progress", question: "accent", ready: "sage", attention: "progress" };
var labels = { error: "Error", permission: "Permission", question: "Question", ready: "Ready", attention: "Attention" };
var icons = { error: TriangleAlert, permission: KeyRound3, question: CircleHelp, ready: CheckCircle2, attention: TriangleAlert };
function NotificationCard({ item, onDismiss, onResolve, draft: controlledDraft, onDraftChange, onInteractionChange }) {
  const s = notification({ kind: item.kind });
  const Icon2 = icons[item.kind];
  const id = useId10();
  const [localDraft, setLocalDraft] = useState15("");
  const draft = controlledDraft ?? localDraft;
  const changeDraft = (value) => {
    setLocalDraft(value);
    onDraftChange?.(value);
  };
  const [expanded, setExpanded] = useState15(false);
  const [editor, setEditor] = useState15(null);
  const [choice, setChoice] = useState15("");
  const [busy, setBusy] = useState15(false);
  const [error, setError] = useState15("");
  const [hover, setHover] = useState15(false);
  const [focus, setFocus] = useState15(false);
  const input = useRef17(null);
  const disclosure2 = useRef17(null);
  useEffect10(() => {
    onInteractionChange?.(expanded || hover || focus || busy);
  }, [expanded, hover, focus, busy, onInteractionChange]);
  useEffect10(() => {
    if (editor) input.current?.focus();
  }, [editor]);
  const run = async (fn, resolves = true) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      if (resolves && result !== false) onResolve();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That action could not be completed. Please try again.");
      setExpanded(true);
    } finally {
      setBusy(false);
    }
  };
  const openEditor = (mode) => {
    setExpanded(true);
    setEditor(mode);
  };
  const reply = () => {
    const value = editor ? draft.trim() : choice;
    if (value && item.onReply) void run(() => item.onReply(value, editor ?? "answer"), editor !== "clarify");
  };
  const hasDetails = !!(item.detail || item.command || item.choices || item.onReply || error);
  return /* @__PURE__ */ jsxs27(
    Alert,
    {
      className: s.root,
      "data-notification-kind": item.kind,
      "data-expanded": expanded,
      material: item.kind === "question" ? "glass" : "tonal",
      tone: tones[item.kind],
      glow: true,
      tabIndex: 0,
      "aria-label": `${labels[item.kind]}: ${item.title}`,
      "aria-busy": busy,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onFocusCapture: () => setFocus(true),
      onBlurCapture: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
      },
      icon: /* @__PURE__ */ jsx32(Icon2, { size: 16 }),
      title: /* @__PURE__ */ jsxs27(Fragment10, { children: [
        /* @__PURE__ */ jsxs27("span", { className: s.source, children: [
          item.source ? `${item.source} \xB7 ` : "",
          labels[item.kind]
        ] }),
        item.title
      ] }),
      pager: /* @__PURE__ */ jsxs27("div", { className: s.controls, children: [
        hasDetails && /* @__PURE__ */ jsx32(IconButton, { ref: disclosure2, tooltip: false, label: "Notification details", icon: /* @__PURE__ */ jsx32(ChevronDown4, {}), variant: "text", "aria-expanded": expanded, "aria-controls": id, onClick: () => setExpanded((v) => !v) }),
        /* @__PURE__ */ jsx32(IconButton, { tooltip: false, label: "Dismiss popup", icon: /* @__PURE__ */ jsx32(X6, {}), variant: "text", onClick: onDismiss })
      ] }),
      children: [
        /* @__PURE__ */ jsx32("div", { className: s.detail, "data-notification-detail": "", id, inert: !expanded, "aria-hidden": !expanded, children: /* @__PURE__ */ jsxs27("div", { children: [
          item.detail && /* @__PURE__ */ jsx32("p", { children: item.detail }),
          item.command && /* @__PURE__ */ jsx32("code", { children: item.command }),
          item.choices && !editor && /* @__PURE__ */ jsx32("div", { className: s.choices, role: "group", "aria-label": "Answer choices", children: item.choices.map((value) => /* @__PURE__ */ jsxs27(Button, { variant: "tonal", "aria-pressed": choice === value, disabled: busy || !item.onReply, onClick: () => setChoice(value), children: [
            value,
            choice === value && /* @__PURE__ */ jsx32(Check6, { size: 14 })
          ] }, value)) }),
          editor && /* @__PURE__ */ jsxs27("div", { className: s.editor, children: [
            /* @__PURE__ */ jsx32(Input, { ref: input, "aria-label": editor === "clarify" ? "Clarification" : "Your answer", placeholder: editor === "clarify" ? "What should be clarified?" : "Write your answer\u2026", value: draft, onChange: (e) => changeDraft(e.target.value), onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                reply();
              }
            } }),
            /* @__PURE__ */ jsxs27("div", { className: s.actions, children: [
              /* @__PURE__ */ jsx32(Button, { variant: "text", onClick: () => {
                setEditor(null);
                disclosure2.current?.focus();
              }, children: "Cancel" }),
              /* @__PURE__ */ jsx32(Button, { disabled: busy || !draft.trim(), onClick: reply, children: "Send" })
            ] })
          ] }),
          error && /* @__PURE__ */ jsx32("p", { role: "alert", children: error })
        ] }) }),
        !editor && /* @__PURE__ */ jsx32("div", { className: s.reveal, "data-notification-actions": "", children: /* @__PURE__ */ jsx32("div", { children: /* @__PURE__ */ jsxs27("div", { className: s.actions, children: [
          item.onReply && /* @__PURE__ */ jsx32(Button, { variant: "text", disabled: busy, onClick: () => openEditor("clarify"), children: "Clarify" }),
          item.kind === "question" && item.onReply && /* @__PURE__ */ jsxs27(Fragment10, { children: [
            /* @__PURE__ */ jsx32(Button, { variant: "text", disabled: busy, onClick: () => openEditor("answer"), children: "Other" }),
            /* @__PURE__ */ jsx32(Button, { disabled: busy || !choice, onClick: reply, children: "Answer" })
          ] }),
          item.actions?.map((action) => /* @__PURE__ */ jsx32(Button, { variant: action.primary ? "primary" : "text", disabled: busy, onClick: () => void run(() => action.run(), action.resolves !== false), children: action.label }, action.id)),
          !item.actions?.length && !item.onReply && /* @__PURE__ */ jsx32(Button, { variant: "text", onClick: onResolve, children: "Mark read" })
        ] }) }) })
      ]
    }
  );
}
var NotificationContext = createContext4(null);
function useNotifications() {
  const context2 = useContext4(NotificationContext);
  if (!context2) throw new Error("useNotifications requires NotificationProvider");
  return context2;
}
function NotificationButton() {
  const { items, inboxOpen, toggleInbox } = useNotifications();
  const s = notification();
  return /* @__PURE__ */ jsxs27("span", { className: s.bell, "data-notification-center": "", children: [
    /* @__PURE__ */ jsx32(IconButton, { tooltip: false, variant: "tonal", className: chatNavigationControl(), label: `Notifications${items.length ? ` (${items.length} unaddressed)` : ""}`, icon: /* @__PURE__ */ jsx32(Bell, {}), "aria-expanded": inboxOpen, onClick: toggleInbox }),
    items.length > 0 && /* @__PURE__ */ jsx32("span", { "aria-hidden": "true", className: s.count, children: items.length > 99 ? "99+" : items.length })
  ] });
}
function NotificationProvider({ children, popupDuration = 6e3 }) {
  const [items, setItems] = useState15([]);
  const [selected, setSelected] = useState15(null);
  const [inboxOpen, setInboxOpen] = useState15(false);
  const [interacting, setInteracting] = useState15(false);
  const [drafts, setDrafts] = useState15({});
  const s = notification();
  const occupied = useRef17(false);
  occupied.current = selected !== null && interacting || inboxOpen;
  const publish = useCallback3((item2) => {
    setItems((all) => [item2, ...all.filter((old) => old.id !== item2.id)]);
    if (!occupied.current) {
      setSelected(item2.id);
      setInteracting(false);
    }
  }, []);
  const resolve = useCallback3((id) => {
    setItems((all) => all.filter((item2) => item2.id !== id));
    setSelected((value) => value === id ? null : value);
    setDrafts((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });
  }, []);
  const show = useCallback3((id) => {
    setSelected(id);
    setInteracting(false);
    setInboxOpen(false);
  }, []);
  const toggleInbox = useCallback3(() => {
    setInboxOpen((open) => !open);
    setSelected(null);
  }, []);
  useEffect10(() => {
    if (!selected || interacting || popupDuration <= 0) return;
    const timer = setTimeout(() => setSelected(null), popupDuration);
    return () => clearTimeout(timer);
  }, [selected, interacting, popupDuration]);
  useEffect10(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setSelected(null);
        setInboxOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const context2 = useMemo(() => ({ items, publish, resolve, show, inboxOpen, toggleInbox }), [items, publish, resolve, show, inboxOpen, toggleInbox]);
  const item = items.find((value) => value.id === selected);
  return /* @__PURE__ */ jsxs27(NotificationContext.Provider, { value: context2, children: [
    children,
    /* @__PURE__ */ jsx32("div", { role: "status", "aria-live": "polite", className: s.source, style: { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }, children: item ? `${labels[item.kind]}: ${item.title}` : "" }),
    (item || inboxOpen) && /* @__PURE__ */ jsx32("aside", { className: s.rail, "data-notification-center": "", "aria-label": "Notifications", children: inboxOpen ? /* @__PURE__ */ jsxs27("section", { className: s.inbox, children: [
      /* @__PURE__ */ jsxs27("header", { children: [
        /* @__PURE__ */ jsxs27("strong", { children: [
          "Unaddressed \xB7 ",
          items.length
        ] }),
        /* @__PURE__ */ jsx32(IconButton, { tooltip: false, label: "Close notifications", icon: /* @__PURE__ */ jsx32(X6, {}), variant: "text", onClick: () => setInboxOpen(false) })
      ] }),
      items.length === 0 ? /* @__PURE__ */ jsx32("p", { children: "You\u2019re all caught up." }) : items.map((value) => {
        const Icon2 = icons[value.kind];
        return /* @__PURE__ */ jsxs27("button", { className: notification({ kind: value.kind }).item, onClick: () => show(value.id), children: [
          /* @__PURE__ */ jsx32(Icon2, { size: 16 }),
          /* @__PURE__ */ jsxs27("span", { children: [
            /* @__PURE__ */ jsxs27("small", { children: [
              value.source ? `${value.source} \xB7 ` : "",
              labels[value.kind]
            ] }),
            /* @__PURE__ */ jsx32("strong", { children: value.title })
          ] })
        ] }, value.id);
      })
    ] }) : item && /* @__PURE__ */ jsx32(NotificationCard, { item, draft: drafts[item.id] ?? "", onDraftChange: (value) => setDrafts((all) => ({ ...all, [item.id]: value })), onDismiss: () => setSelected(null), onResolve: () => resolve(item.id), onInteractionChange: setInteracting }, item.id) })
  ] });
}

// src/WorkItemDrawer.tsx
import { jsx as jsx33, jsxs as jsxs28 } from "react/jsx-runtime";
function WorkItemDrawer({ variant, title: title2, onTitleSave, breadcrumbs, status, activity: activity2, children, onEscapeKeyDown, ...props }) {
  const styles = workItemDrawer({ variant });
  return /* @__PURE__ */ jsx33(Drawer, { ...props, onEscapeKeyDown: (event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute("data-inline-title-editor")) event.preventDefault();
    onEscapeKeyDown?.(event);
  }, title: /* @__PURE__ */ jsxs28("div", { className: styles.header, children: [
    breadcrumbs && /* @__PURE__ */ jsx33("div", { className: styles.breadcrumbs, children: breadcrumbs }),
    /* @__PURE__ */ jsx33(Text, { variant: "label", children: variant === "task" ? "Task" : variant[0].toUpperCase() + variant.slice(1) }),
    /* @__PURE__ */ jsxs28("div", { className: styles.titleRow, children: [
      /* @__PURE__ */ jsx33(Title3, { className: styles.title, variant: variant === "initiative" ? "project" : variant, value: title2, onSave: onTitleSave }),
      status,
      activity2
    ] })
  ] }), children: /* @__PURE__ */ jsx33("div", { className: styles.body, "data-work-item-drawer-variant": variant, children }) });
}
function WorkItemDrawerSection({ title: title2, actions: actions2, children }) {
  const styles = workItemDrawer();
  return /* @__PURE__ */ jsxs28("section", { className: styles.section, children: [
    /* @__PURE__ */ jsxs28("div", { className: styles.sectionHeader, children: [
      /* @__PURE__ */ jsx33(Text, { variant: "label", tone: "muted", children: title2 }),
      actions2
    ] }),
    /* @__PURE__ */ jsx33("div", { className: styles.rows, children })
  ] });
}
function WorkItemDrawerActions({ children }) {
  return /* @__PURE__ */ jsx33("div", { className: workItemDrawer().actions, children });
}

// src/TargetContextMenu.tsx
import { Fragment as Fragment11 } from "react";
import { Archive, Copy as Copy2, ExternalLink as ExternalLink2, FileCode2 as FileCode22, FolderInput as FolderInput2, FolderOpen, Layers, Pencil, Plus as Plus2, RotateCw, Trash2 } from "lucide-react";
import { jsx as jsx34, jsxs as jsxs29 } from "react/jsx-runtime";
var actions = {
  edit: { label: "Edit", icon: Pencil },
  rename: { label: "Rename", icon: Pencil },
  open: { label: "Open", icon: FolderOpen },
  viewEdit: { label: "View / Edit", icon: Pencil },
  addTask: { label: "Add Task", icon: Plus2 },
  addSubtask: { label: "Add Subtask", icon: Plus2 },
  cycle: { label: "Add to Cycle\u2026", icon: RotateCw },
  promote: { label: "Promote to Module", icon: Layers },
  duplicate: { label: "Duplicate", icon: Copy2 },
  move: { label: "Move\u2026", icon: FolderInput2 },
  archive: { label: "Archive", icon: Archive, destructive: true },
  delete: { label: "Delete", icon: Trash2, destructive: true },
  file: { label: "File viewer", icon: FileCode22 },
  external: { label: "External app", icon: ExternalLink2 },
  copyPath: { label: "Copy pathname", icon: Copy2 },
  moveFile: { label: "Move file", icon: FolderInput2 }
};
var contextMenuVariants = {
  chat: [["rename"], ["delete"]],
  project: [["edit", "duplicate"], ["archive"]],
  initiative: [["edit"], ["archive"]],
  module: [["open", "addTask", "cycle"], ["archive"]],
  task: [["viewEdit", "addSubtask", "cycle"], ["promote", "duplicate"], ["move", "archive"]],
  cycle: [["edit", "duplicate"], ["archive"]],
  file: [["file", "external"], ["copyPath", "moveFile"]]
};
function TargetContextMenu({ target, label, children, actions: states = {}, allowMove = true, onCloseAutoFocus }) {
  const actionStates = states;
  const groups = contextMenuVariants[target].map(
    (group) => group.filter((id) => id !== "move" || allowMove)
  ).filter((group) => group.length);
  return /* @__PURE__ */ jsxs29(ContextMenu, { modal: false, children: [
    /* @__PURE__ */ jsx34(ContextMenuTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsx34(ContextMenuContent, { target, "aria-label": label, onCloseAutoFocus, children: groups.map((group, index) => /* @__PURE__ */ jsxs29(Fragment11, { children: [
      index > 0 && /* @__PURE__ */ jsx34(ContextMenuSeparator, {}),
      group.map((id) => {
        const spec = actions[id];
        const state = actionStates[id];
        const disabled = !state?.onSelect || state.disabled === true;
        const reason = disabled ? state?.unavailableReason ?? "Not connected yet" : void 0;
        const Icon2 = spec.icon;
        return /* @__PURE__ */ jsxs29(
          ContextMenuItem,
          {
            "data-action": id,
            disabled,
            destructive: "destructive" in spec && spec.destructive,
            "aria-description": reason,
            title: reason,
            onSelect: state?.onSelect,
            children: [
              /* @__PURE__ */ jsx34(Icon2, { "aria-hidden": "true" }),
              /* @__PURE__ */ jsx34("span", { children: spec.label })
            ]
          },
          id
        );
      })
    ] }, index)) })
  ] });
}

// src/SidebarSearch.tsx
import { PenSquare, Plus as Plus3 } from "lucide-react";
import { jsx as jsx35, jsxs as jsxs30 } from "react/jsx-runtime";
function SidebarSearch({ variant, value, onValueChange, onAction, renderAction }) {
  const styles = sidebarSearch({ variant });
  const chat = variant === "chat";
  const label = chat ? "Search conversations" : "Search projects & initiatives";
  const trigger = /* @__PURE__ */ jsx35(
    IconButton,
    {
      className: styles.action,
      label: chat ? "New conversation" : "Create new item",
      icon: chat ? /* @__PURE__ */ jsx35(PenSquare, { size: 18 }) : /* @__PURE__ */ jsx35(Plus3, { size: 18 }),
      variant: "tonal",
      tooltip: !renderAction,
      onClick: onAction,
      style: { width: "var(--sidebar-search-action-size)", height: "var(--sidebar-search-action-size)" }
    }
  );
  return /* @__PURE__ */ jsxs30("div", { className: styles.root, "data-sidebar-search": variant, children: [
    /* @__PURE__ */ jsx35(
      Input,
      {
        variant: "search",
        value,
        "aria-label": label,
        placeholder: `${label}\u2026`,
        onChange: (event) => onValueChange(event.target.value),
        onClear: () => onValueChange(""),
        wrapperClassName: styles.field
      }
    ),
    renderAction ? renderAction(trigger) : trigger
  ] });
}

// src/UserAccount.tsx
import * as Dropdown4 from "@radix-ui/react-dropdown-menu";
import { Archive as Archive2, ChevronRight as ChevronRight5, KeyRound as KeyRound4, Moon, Settings, Sun, UserRound } from "lucide-react";
import { jsx as jsx36, jsxs as jsxs31 } from "react/jsx-runtime";
function UserAccount({ name, image, compact: compact2 = false, loading, theme, onAccount, onCredentials, onViewArchive, onToggleTheme }) {
  const settings = useCaelosTheme();
  const styles = userAccount({ compact: compact2 });
  const menuStyles = menu({ layout: "action" });
  const itemClass = `${menuStyles.item} ${styles.item}`;
  return /* @__PURE__ */ jsxs31(Dropdown4.Root, { children: [
    /* @__PURE__ */ jsx36(Dropdown4.Trigger, { asChild: true, children: /* @__PURE__ */ jsxs31(Button, { variant: "text", className: styles.trigger, disabled: loading, "aria-label": `User account: ${name}`, "data-testid": "user-nav-button", children: [
      /* @__PURE__ */ jsx36(Avatar, { name, src: image, size: "md", kind: "person", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx36("span", { className: styles.name, "data-testid": "user-name", children: name })
    ] }) }),
    /* @__PURE__ */ jsx36(Dropdown4.Portal, { children: /* @__PURE__ */ jsxs31(
      Dropdown4.Content,
      {
        ...themeAttributes(settings),
        side: "top",
        align: "start",
        sideOffset: 6,
        collisionPadding: 12,
        className: `${menuStyles.content} ${styles.menu}`,
        "data-testid": "user-nav-menu",
        children: [
          /* @__PURE__ */ jsxs31(Dropdown4.Item, { className: itemClass, onSelect: onAccount, children: [
            /* @__PURE__ */ jsx36(UserRound, { size: 16 }),
            "Account"
          ] }),
          /* @__PURE__ */ jsxs31(Dropdown4.Item, { className: itemClass, onSelect: onCredentials, children: [
            /* @__PURE__ */ jsx36(KeyRound4, { size: 16 }),
            "Credentials"
          ] }),
          /* @__PURE__ */ jsxs31(Dropdown4.Item, { className: itemClass, onSelect: onViewArchive, children: [
            /* @__PURE__ */ jsx36(Archive2, { size: 16 }),
            "View Archive"
          ] }),
          /* @__PURE__ */ jsxs31(Dropdown4.Sub, { children: [
            /* @__PURE__ */ jsxs31(Dropdown4.SubTrigger, { className: itemClass, children: [
              /* @__PURE__ */ jsx36(Settings, { size: 16 }),
              "Settings",
              /* @__PURE__ */ jsx36(ChevronRight5, { size: 14, className: styles.submenuArrow })
            ] }),
            /* @__PURE__ */ jsx36(Dropdown4.Portal, { children: /* @__PURE__ */ jsx36(Dropdown4.SubContent, { ...themeAttributes(settings), sideOffset: 6, collisionPadding: 12, className: `${menuStyles.content} ${styles.submenu}`, children: /* @__PURE__ */ jsxs31(Dropdown4.Item, { className: itemClass, onSelect: onToggleTheme, "data-testid": "user-nav-item-theme", children: [
              theme === "dark" ? /* @__PURE__ */ jsx36(Sun, { size: 16 }) : /* @__PURE__ */ jsx36(Moon, { size: 16 }),
              "Toggle ",
              theme === "dark" ? "light" : "dark",
              " mode"
            ] }) }) })
          ] })
        ]
      }
    ) })
  ] });
}

// src/HarnessIcons.tsx
import { forwardRef as forwardRef5 } from "react";
import { jsx as jsx37 } from "react/jsx-runtime";
var ClaudeCodeIcon = forwardRef5(function ClaudeCodeIcon2({ size = 24, ...props }, ref) {
  return /* @__PURE__ */ jsx37("svg", { ref, width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", ...props, children: /* @__PURE__ */ jsx37("path", { fillRule: "evenodd", d: "M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z" }) });
});
var CodexIcon = forwardRef5(function CodexIcon2({ size = 24, ...props }, ref) {
  return /* @__PURE__ */ jsx37("svg", { ref, width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", ...props, children: /* @__PURE__ */ jsx37("path", { fillRule: "evenodd", d: "M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z", transform: "translate(2 2) scale(.833333)" }) });
});
var HermesIcon = forwardRef5(function HermesIcon2({ size = 24, ...props }, ref) {
  return /* @__PURE__ */ jsx37("svg", { ref, width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", ...props, children: /* @__PURE__ */ jsx37("path", { fillRule: "evenodd", d: "M10.188 2.652L11.058 2.652L11.058 2.725L11.493 2.725L11.493 2.797L11.71 2.797L11.71 2.87L11.928 2.87L11.928 2.942L12.072 2.942L12.072 3.014L12.217 3.014L12.217 3.087L12.362 3.087L12.362 3.159L12.507 3.159L12.58 3.304L12.725 3.304L12.725 3.377L12.797 3.377L12.797 3.449L12.87 3.449L12.87 3.522L12.942 3.522L12.942 3.594L13.014 3.594L13.014 3.667L13.087 3.667L13.087 3.739L13.159 3.739L13.159 3.812L13.232 3.812L13.232 3.884L13.304 3.884L13.377 4.029L13.449 4.029L13.449 4.101L13.522 4.101L13.522 4.174L13.594 4.174L13.594 4.246L13.667 4.246L13.667 4.391L13.739 4.391L13.812 4.536L13.884 4.536L13.884 4.681L14.029 4.754L14.029 4.899L14.101 4.899L14.101 5.043L14.174 5.043L14.174 5.188L14.246 5.188L14.246 5.261L14.319 5.261L14.319 5.406L14.391 5.406L14.391 5.623L14.464 5.623L14.464 5.768L14.536 5.768L14.536 5.913L14.609 5.913L14.609 6.13L14.681 6.13L14.681 6.348L14.754 6.348L14.754 6.565L14.826 6.565L14.826 6.783L14.899 6.783L14.899 7.072L14.971 7.072L14.971 7.362L15.043 7.362L15.043 7.652L14.971 7.652L14.971 7.725L14.826 7.725L14.826 8.014L14.971 8.014L14.971 8.087L15.116 8.087L15.116 8.159L15.261 8.159L15.261 8.232L15.406 8.232L15.478 8.377L15.406 8.377L15.406 8.304L15.261 8.304L15.261 8.232L15.043 8.232L15.043 8.159L14.899 8.159L14.899 8.087L14.754 8.014L14.754 7.87L14.681 7.87L14.681 7.725L14.754 7.725L14.754 7.652L14.899 7.652L14.899 7.507L14.971 7.507L14.971 7.435L14.899 7.435L14.899 7.217L14.681 7.217L14.464 7.217L14.464 7.29L14.101 7.29L14.101 7.362L13.957 7.362L13.957 7.725L14.174 7.725L14.174 7.797L14.246 7.797L14.246 8.014L14.174 8.014L14.101 7.87L13.957 7.87L13.957 7.797L13.884 7.797L13.884 7.652L13.812 7.652L13.812 7.29L13.739 7.29L13.739 7L13.667 7L13.667 6.71L13.594 6.71L13.594 6.493L13.522 6.493L13.522 6.275L13.449 6.275L13.449 6.058L13.377 6.058L13.377 5.913L13.304 5.913L13.304 5.696L13.232 5.696L13.232 5.551L13.159 5.551L13.159 5.406L13.087 5.406L13.087 5.261L13.014 5.261L13.014 5.116L12.942 5.116L12.942 5.043L12.87 5.043L12.87 4.899L12.725 4.826L12.725 4.681L12.652 4.681L12.652 4.609L12.58 4.609L12.58 4.536L12.507 4.536L12.507 4.464L12.435 4.464L12.435 4.391L12.362 4.391L12.362 4.319L12.29 4.319L12.29 4.246L12.217 4.246L12.217 4.174L12.145 4.174L12.072 4.029L12 4.029L12 3.957L11.928 3.957L11.928 3.884L11.855 3.884L11.855 3.812L11.71 3.812L11.71 3.739L11.565 3.667L11.565 3.594L11.42 3.594L11.348 3.449L11.203 3.449L11.203 3.377L11.058 3.377L11.058 3.304L10.913 3.304L10.913 3.232L10.696 3.232L10.696 3.159L10.478 3.159L10.478 3.087L10.043 3.087L10.043 3.014L9.174 3.014L9.174 3.087L8.884 3.087L8.884 3.014L9.101 3.014L9.101 2.942L9.319 2.942L9.319 2.87L9.536 2.87L9.536 2.797L9.826 2.797L9.826 2.725L10.188 2.725L10.188 2.652ZM17 4.536L17.072 4.536L17.072 4.609L17.145 4.609L17.217 4.754L17.29 4.754L17.29 4.899L17.435 4.971L17.435 5.043L17.362 5.043L17.362 5.696L17.217 5.696L17.217 5.841L17.29 5.841L17.29 5.986L17.362 5.986L17.362 6.058L17.217 5.986L17.217 5.841L17.145 5.841L17.145 5.913L17 5.913L17 6.203L17.072 6.203L17.072 6.42L17.145 6.42L17.145 6.565L17.072 6.565L17.072 6.42L17 6.42L17 6.275L16.855 6.203L16.855 6.058L16.783 6.058L16.783 5.986L16.638 5.986L16.638 6.058L16.71 6.058L16.71 6.203L16.783 6.203L16.783 6.348L16.71 6.348L16.71 6.203L16.638 6.203L16.638 6.058L16.565 6.058L16.565 5.986L16.42 5.986L16.348 6.13L16.058 6.13L16.058 6.058L15.913 6.058L15.913 5.986L15.696 5.986L15.696 5.913L15.478 5.913L15.478 5.986L15.551 5.986L15.551 6.13L15.623 6.13L15.623 6.275L15.696 6.275L15.696 6.42L15.768 6.42L15.768 6.565L15.696 6.565L15.696 6.42L15.623 6.42L15.551 6.275L15.478 6.275L15.478 6.42L15.406 6.42L15.406 6.275L15.333 6.275L15.261 6.13L15.116 6.13L15.116 6.058L14.754 6.058L14.754 5.986L14.681 5.986L14.681 5.841L15.188 5.841L15.188 5.478L15.261 5.478L15.261 5.623L15.333 5.623L15.406 5.768L15.696 5.768L15.696 5.841L16.13 5.841L16.13 5.768L16.275 5.696L16.275 5.406L16.348 5.406L16.348 5.333L16.638 5.333L16.638 5.116L16.71 5.116L16.783 5.261L17 5.261L17 5.333L17.072 5.333L17.072 4.681L17 4.681L17 4.536ZM11.638 4.826L11.71 4.826L11.71 4.899L11.855 4.971L11.855 5.043L12 5.043L12 4.971L12.145 4.971L12.145 4.899L12.29 4.826L12.29 4.899L12.362 4.899L12.362 4.971L12.435 4.971L12.507 5.116L12.58 5.116L12.58 5.261L12.725 5.333L12.725 5.478L12.797 5.478L12.797 5.623L12.87 5.623L12.87 5.768L13.014 5.768L13.014 5.696L13.087 5.696L13.087 5.768L13.232 5.841L13.232 5.986L13.304 5.986L13.304 6.13L13.159 6.13L13.159 6.058L12.942 6.058L12.942 5.913L12.87 5.913L12.87 5.841L12.797 5.841L12.797 5.696L12.725 5.696L12.725 5.551L12.58 5.478L12.58 5.333L12.507 5.333L12.435 5.188L12.362 5.188L12.362 5.333L12.29 5.333L12.29 5.696L12.362 5.696L12.362 5.768L12.217 5.768L12.217 5.913L12.29 5.913L12.29 5.986L12.217 5.986L12.217 5.913L12 5.913L12 5.986L11.928 5.986L11.928 6.13L11.855 6.13L11.783 5.986L11.348 5.986L11.348 5.913L11.275 5.913L11.275 5.768L11.203 5.768L11.203 5.623L11.275 5.623L11.275 5.478L11.42 5.406L11.42 5.188L11.565 5.188L11.565 5.116L11.71 5.116L11.71 4.971L11.638 4.971L11.638 4.826ZM10.623 5.116L10.696 5.116L10.696 5.188L10.768 5.188L10.768 5.333L10.841 5.333L10.913 5.478L10.986 5.478L10.986 5.623L11.058 5.623L11.058 5.768L11.203 5.841L11.203 5.986L11.275 5.986L11.275 6.13L11.348 6.13L11.348 6.348L11.42 6.348L11.42 6.493L11.493 6.493L11.493 6.71L11.42 6.71L11.42 6.638L11.275 6.638L11.275 6.855L11.203 6.855L11.203 6.638L11.058 6.565L11.058 7L10.986 7L10.986 6.855L10.913 6.855L10.913 6.71L10.841 6.71L10.841 6.638L10.768 6.638L10.768 6.71L10.768 6.855L10.696 6.855L10.696 6.71L10.478 6.71L10.406 6.855L10.261 6.855L10.261 6.783L10.116 6.783L10.116 6.71L9.899 6.71L9.899 6.638L9.754 6.638L9.754 6.565L9.681 6.565L9.681 6.275L9.754 6.275L9.754 6.203L9.971 6.203L9.971 6.13L10.116 6.13L10.116 6.058L10.188 6.058L10.188 6.13L10.333 6.13L10.333 6.058L10.478 5.986L10.478 5.841L10.623 5.841L10.623 5.913L10.696 5.913L10.696 5.406L10.623 5.406L10.623 5.116ZM5.478 5.478L5.551 5.478L5.551 5.551L5.478 5.551L5.478 5.623L5.406 5.623L5.406 5.768L5.261 5.841L5.261 5.986L5.188 5.986L5.188 6.13L5.478 6.13L5.478 6.058L5.551 6.058L5.623 6.203L5.768 6.203L5.768 6.348L5.696 6.348L5.696 6.42L6.058 6.42L6.058 6.565L5.986 6.565L5.986 6.71L5.913 6.71L5.913 6.855L5.841 6.855L5.841 7.072L5.768 7.072L5.768 7.217L5.696 7.217L5.696 7.072L5.623 7.072L5.551 7.217L5.478 7.217L5.478 7L5.406 7L5.406 6.783L5.333 6.783L5.333 6.928L5.261 6.928L5.261 7.072L5.188 7.072L5.188 7.217L5.116 7.217L5.116 7.072L5.188 7.072L5.188 7L4.826 7L4.826 6.855L5.188 6.13L5.043 6.203L5.043 6.348L4.971 6.348L4.971 6.493L4.899 6.493L4.899 6.638L4.826 6.638L4.826 6.783L4.754 6.783L4.754 6.928L4.681 6.928L4.681 7.145L4.609 7.145L4.609 7.29L4.536 7.29L4.536 7.435L4.464 7.435L4.464 7.29L4.536 7.29L4.536 7.072L4.609 7.072L4.609 6.855L4.536 6.855L4.536 6.565L4.609 6.565L4.609 6.42L4.681 6.42L4.681 6.275L4.754 6.275L4.754 6.203L4.826 6.203L4.826 6.13L4.899 6.13L4.899 6.058L4.971 6.058L4.971 5.986L5.043 5.986L5.043 5.913L5.116 5.913L5.116 5.841L5.188 5.841L5.188 5.768L5.333 5.696L5.333 5.623L5.406 5.623L5.406 5.551L5.478 5.551L5.478 5.478ZM7.217 5.478L7.29 5.478L7.29 5.623L7.217 5.623L7.217 5.768L7.145 5.768L7.145 5.913L7.072 5.913L7.072 6.13L7 6.13L7 6.275L6.928 6.275L6.928 6.493L6.855 6.493L6.855 6.71L6.783 6.71L6.783 6.928L6.71 6.928L6.71 7.072L6.638 7.072L6.638 6.783L6.565 6.783L6.565 6.71L6.42 6.71L6.42 6.783L6.275 6.783L6.203 6.928L6.203 7L5.986 7L5.986 6.783L6.058 6.783L6.058 6.638L6.13 6.638L6.13 6.493L6.203 6.493L6.203 6.638L6.348 6.638L6.348 6.565L6.493 6.565L6.493 6.493L6.565 6.493L6.638 6.348L6.71 6.348L6.71 6.203L6.855 6.13L6.855 5.986L6.928 5.986L6.928 5.841L7.072 5.768L7.072 5.623L7.145 5.623L7.217 5.478ZM8.377 5.696L8.449 5.696L8.449 6.783L8.377 6.783L8.377 6.638L8.304 6.638L8.304 6.71L8.232 6.71L8.232 6.638L8.014 6.638L8.014 6.71L7.797 6.71L7.797 6.783L7.217 6.783L7.217 6.855L7.145 6.855L7.145 6.783L7 6.71L7 6.42L7.072 6.42L7.072 6.203L7.145 6.203L7.145 6.13L7.362 6.13L7.362 6.203L7.507 6.203L7.507 6.275L7.725 6.275L7.725 6.348L8.014 6.348L8.014 6.275L8.159 6.275L8.159 6.203L8.232 6.203L8.232 6.058L8.304 6.058L8.304 5.841L8.377 5.841L8.377 5.696ZM8.594 5.913L8.884 5.913L8.884 5.986L9.464 5.986L9.464 6.13L9.536 6.13L9.536 6.42L9.609 6.42L9.609 6.71L9.536 6.71L9.536 6.638L8.884 6.638L8.884 6.565L8.667 6.565L8.667 6.42L8.594 6.42L8.594 6.13L8.522 6.13L8.522 5.986L8.594 5.986L8.594 5.913ZM8.812 7.797L8.884 7.797L8.884 7.942L8.957 7.942L8.957 8.159L9.029 8.159L9.029 8.304L9.101 8.304L9.101 8.449L9.174 8.449L9.174 8.667L9.319 8.739L9.319 8.884L9.391 8.884L9.391 9.029L9.464 9.029L9.464 9.174L9.536 9.174L9.536 9.391L9.391 9.391L9.391 9.319L9.246 9.246L9.246 9.101L9.174 9.101L9.174 8.957L9.101 8.957L9.101 8.812L9.029 8.812L9.029 8.594L8.957 8.594L8.957 8.377L8.884 8.377L8.884 8.087L8.812 8.087L8.812 7.797ZM16.638 8.884L16.71 8.884L16.71 9.101L16.783 9.101L16.783 9.319L16.855 9.319L16.855 9.536L16.783 9.536L16.783 9.319L16.71 9.319L16.71 9.101L16.638 9.101L16.638 8.884ZM6.928 9.029L7 9.029L7 9.101L7.072 9.101L7.145 9.246L7.217 9.246L7.217 9.391L7.29 9.391L7.29 9.464L7.362 9.464L7.362 9.536L7.507 9.609L7.507 9.681L7.652 9.681L7.725 9.826L7.942 9.826L7.942 9.754L8.159 9.754L8.159 9.681L8.449 9.681L8.449 9.754L8.377 9.754L8.377 9.899L8.232 9.971L8.232 10.116L8.377 10.116L8.377 10.043L8.522 10.043L8.522 9.971L8.667 9.971L8.739 9.826L8.884 9.826L8.957 9.681L9.174 9.681L9.174 9.609L9.391 9.609L9.391 9.536L9.536 9.536L9.536 9.464L9.681 9.464L9.681 9.536L9.754 9.536L9.754 9.609L9.899 9.681L9.899 9.754L11.42 9.754L11.42 9.536L11.493 9.536L11.493 9.681L11.565 9.681L11.565 9.754L11.71 9.754L11.71 9.826L12.145 9.826L12.145 9.899L12.29 9.899L12.29 9.971L12.362 9.971L12.362 11.275L12.29 11.275L12.29 11.928L12.217 11.928L12.217 12.362L12.145 12.362L12.145 12.797L12.072 12.797L12.072 13.232L12 13.232L12 13.594L11.928 13.594L11.928 14.029L11.855 14.029L11.855 14.464L11.783 14.464L11.783 14.899L11.71 14.899L11.71 15.406L11.638 15.406L11.638 16.058L11.565 16.058L11.565 16.855L11.638 16.855L11.638 17.362L11.565 17.362L11.565 17.435L11.493 17.435L11.493 17.507L11.348 17.58L11.348 17.652L11.13 17.652L11.13 17.507L11.058 17.507L11.058 17.362L10.986 17.362L10.986 17.29L10.913 17.29L10.913 17.145L10.841 17.145L10.768 17L10.696 17L10.696 16.855L10.623 16.855L10.623 16.783L10.551 16.783L10.551 16.71L10.478 16.71L10.478 16.638L10.333 16.565L10.333 16.493L10.261 16.493L10.261 16.42L10.116 16.42L10.116 16.348L9.681 16.348L9.681 16.42L9.174 16.42L9.174 16.493L8.304 16.493L8.304 16.565L8.232 16.565L8.232 16.493L7.87 16.493L7.87 16.42L7.725 16.42L7.725 16.348L7.58 16.275L7.58 16.203L7.58 16.13L7.435 16.058L7.435 15.913L7.362 15.913L7.362 15.768L7.29 15.768L7.29 15.623L7.217 15.623L7.217 15.478L7.145 15.478L7.145 15.333L7 15.261L7 15.116L6.928 15.116L6.928 14.971L6.855 14.971L6.855 14.826L6.783 14.826L6.783 14.681L6.71 14.681L6.71 14.536L6.638 14.536L6.638 14.391L6.565 14.391L6.565 14.174L6.493 14.174L6.493 13.957L6.42 13.957L6.42 13.667L6.348 13.667L6.348 12.58L6.42 12.58L6.42 12.652L6.493 12.652L6.493 12.725L6.565 12.725L6.565 12.797L6.638 12.797L6.71 12.942L6.783 12.942L6.783 13.014L6.855 13.014L6.855 13.159L6.928 13.159L6.928 13.449L6.855 13.449L6.855 13.594L6.783 13.594L6.783 13.884L6.855 13.884L6.855 14.029L6.928 14.029L6.928 14.174L7 14.174L7 14.246L6.928 14.246L6.928 14.319L7 14.319L7 14.609L7.072 14.609L7.072 14.681L7.145 14.681L7.145 14.754L7.217 14.754L7.29 14.899L7.362 14.899L7.362 14.971L7.435 14.971L7.435 14.826L7.507 14.826L7.507 14.754L7.652 14.754L7.652 14.681L7.217 14.681L7.217 14.609L7.145 14.609L7.145 14.391L7.29 14.391L7.29 14.609L7.362 14.609L7.362 14.536L7.435 14.536L7.435 14.319L8.014 14.319L8.014 14.464L8.232 14.464L8.232 14.391L8.377 14.391L8.449 14.246L8.377 14.246L8.377 14.174L8.087 14.174L8.087 14.101L7.942 14.101L7.942 14.029L7.797 14.029L7.797 13.957L7.652 13.957L7.652 13.884L7.507 13.884L7.507 13.812L7.072 13.812L7.072 13.739L6.928 13.667L6.928 13.522L7 13.522L7 13.377L7.072 13.377L7.072 13.159L7 13.159L7 13.087L6.928 13.087L6.928 13.014L6.855 13.014L6.783 12.87L6.71 12.87L6.71 12.797L6.638 12.797L6.638 12.652L6.565 12.652L6.565 12.507L6.493 12.507L6.493 12.145L6.638 12.145L6.638 12.072L6.71 12.072L6.71 12L6.783 12L6.783 11.928L6.855 11.928L6.928 11.783L7 11.783L7 11.71L7.072 11.71L7.072 11.565L7.145 11.565L7.145 11.42L7.217 11.42L7.217 10.768L7.145 10.768L7.145 10.913L7 10.913L6.928 10.768L6.783 10.768L6.783 10.696L7 10.696L7 10.768L7.145 10.768L7.145 10.623L7.072 10.623L7.072 10.551L6.928 10.478L6.928 10.406L6.783 10.406L6.783 10.333L6.71 10.333L6.783 10.188L6.638 10.116L6.71 9.971L6.928 9.971L6.928 9.899L7.217 9.899L7.217 9.826L7.29 9.826L7.29 9.681L7.217 9.681L7.217 9.536L7.145 9.536L7.145 9.391L7.072 9.391L7.072 9.246L7 9.246L7 9.101L6.928 9.101L6.928 9.029ZM16.855 9.609L16.928 9.609L16.928 9.826L17 9.826L17 10.043L17.072 10.043L17.072 10.333L17.145 10.333L17.145 10.551L17.217 10.551L17.217 10.768L17.29 10.768L17.29 11.058L17.362 11.058L17.362 11.275L17.435 11.275L17.435 11.493L17.507 11.493L17.507 11.783L17.58 11.783L17.58 12L17.652 12L17.652 12.217L17.58 12.217L17.58 12L17.507 12L17.507 11.783L17.435 11.783L17.435 11.565L17.362 11.565L17.362 11.275L17.29 11.275L17.29 11.058L17.217 11.058L17.217 10.768L17.145 10.768L17.145 10.551L17.072 10.551L17.072 10.333L17 10.333L17 10.043L16.928 10.043L16.928 9.826L16.855 9.826L16.855 9.609ZM9.536 9.826L9.464 9.826L9.464 9.899L8.957 9.899L8.957 9.971L8.812 9.971L8.812 10.043L8.667 10.116L8.667 10.261L8.594 10.261L8.594 10.333L8.739 10.333L8.739 10.478L8.667 10.478L8.667 10.696L8.739 10.696L8.739 10.768L8.884 10.768L8.884 10.623L8.957 10.623L9.029 10.478L9.174 10.478L9.174 10.841L9.246 10.841L9.246 11.058L9.319 11.058L9.319 11.13L9.464 11.203L9.464 11.275L9.826 11.275L9.826 11.203L9.971 11.203L9.971 11.13L10.116 11.058L10.116 10.768L10.188 10.768L10.188 10.623L10.478 10.768L10.478 10.986L10.406 10.986L10.406 11.058L10.333 11.058L10.333 11.13L10.188 11.203L10.188 11.275L9.971 11.275L9.971 11.348L9.319 11.348L9.101 11.348L9.101 11.275L8.884 11.275L8.957 11.42L9.101 11.42L9.101 11.493L9.391 11.493L9.391 11.565L9.464 11.565L9.464 11.493L9.536 11.493L9.536 11.565L9.681 11.565L9.681 11.493L9.754 11.493L9.754 11.565L9.826 11.565L9.826 11.493L10.116 11.493L10.116 11.42L10.261 11.42L10.261 11.348L10.478 11.348L10.478 11.203L10.551 11.203L10.551 11.13L10.696 11.13L10.696 11.058L10.768 11.058L10.841 10.913L10.913 10.913L10.913 10.768L11.058 10.768L11.058 10.696L11.13 10.696L11.13 10.623L10.986 10.623L10.986 10.551L10.768 10.551L10.696 10.406L10.551 10.406L10.551 10.333L10.406 10.333L10.406 10.261L10.261 10.261L10.261 10.188L10.116 10.188L10.188 10.043L10.043 10.043L10.043 10.116L9.971 10.116L10.043 9.971L9.899 9.971L9.899 10.043L9.681 10.043L9.681 9.971L9.826 9.971L9.826 9.899L9.609 9.899L9.609 9.826L9.536 9.826ZM6.203 10.261L6.565 10.261L6.565 10.333L6.638 10.333L6.71 10.478L6.855 10.478L6.928 10.623L6.783 10.623L6.783 10.551L6.565 10.551L6.565 10.623L6.71 10.623L6.71 10.696L6.42 10.696L6.42 10.768L6.275 10.768L6.275 10.696L6.203 10.696L6.203 10.551L6.13 10.551L6.13 10.333L6.203 10.333L6.203 10.261ZM14.681 10.478L15.188 10.478L15.188 10.551L15.333 10.551L15.333 10.623L15.478 10.623L15.478 10.696L15.551 10.696L15.551 10.841L15.261 10.841L15.261 10.768L15.116 10.768L15.043 10.768L15.043 10.696L14.754 10.696L14.754 10.768L14.536 10.768L14.536 10.841L14.391 10.841L14.319 10.696L14.391 10.696L14.464 10.551L14.681 10.551L14.681 10.478ZM6.493 11.058L6.565 11.058L6.565 11.203L6.638 11.203L6.638 11.493L6.71 11.493L6.71 11.638L6.783 11.638L6.783 11.783L6.565 11.783L6.565 11.71L6.493 11.71L6.493 11.058ZM7.145 12.652L7.072 12.652L7.072 12.725L7.145 12.725L7.217 12.87L7.362 12.87L7.362 12.942L7.435 12.942L7.435 12.87L7.362 12.87L7.362 12.725L7.217 12.725L7.217 12.652L7.145 12.652ZM13.667 14.391L13.739 14.391L13.739 14.536L13.812 14.536L13.812 15.478L13.884 15.478L13.884 15.696L13.812 15.696L13.812 15.768L13.667 15.768L13.667 15.841L13.522 15.841L13.449 15.986L13.304 15.986L13.304 16.058L13.159 16.058L13.159 15.841L13.232 15.841L13.232 15.623L13.304 15.623L13.304 15.406L13.377 15.406L13.377 15.188L13.449 15.188L13.449 14.971L13.522 14.971L13.522 14.754L13.594 14.754L13.594 14.536L13.667 14.536L13.667 14.391ZM19.246 14.391L19.319 14.391L19.319 14.536L19.391 14.536L19.391 14.681L19.464 14.681L19.464 14.899L19.536 14.899L19.536 15.116L19.609 15.116L19.609 15.333L19.681 15.333L19.681 15.696L19.754 15.696L19.754 16.783L19.681 16.783L19.681 17.072L19.609 17.072L19.609 17.217L19.536 17.217L19.536 17.362L19.464 17.362L19.464 17.507L19.391 17.507L19.391 17.652L19.246 17.725L19.246 17.87L19.174 17.87L19.101 18.014L19.029 18.014L18.957 18.159L18.884 18.159L18.884 18.014L18.957 18.014L18.957 17.797L19.029 17.797L19.029 17.652L19.101 17.652L19.101 17.362L19.174 17.362L19.174 17.072L19.246 17.072L19.246 16.638L19.319 16.638L19.319 15.986L19.391 15.986L19.391 15.333L19.319 15.333L19.319 14.681L19.246 14.681L19.246 14.391ZM13.884 16.275L13.957 16.275L13.957 16.42L14.029 16.42L14.029 16.783L14.101 16.783L14.101 17L14.029 17L14.029 17.072L13.957 17.072L13.957 17.145L13.884 17.145L13.812 17.29L13.739 17.29L13.739 17.362L13.522 17.362L13.522 17.435L13.304 17.435L13.304 17.362L13.159 17.362L13.159 17.29L13.087 17.29L13.087 17.145L13.014 17.145L13.014 16.855L13.087 16.855L13.159 16.71L13.304 16.71L13.377 16.565L13.522 16.565L13.594 16.42L13.739 16.42L13.739 16.348L13.884 16.348L13.884 16.275ZM11.783 17.797L11.855 17.797L11.855 17.942L11.928 17.942L11.928 18.087L12 18.087L12 18.232L12.072 18.232L12.072 18.304L12.145 18.304L12.145 18.377L12.217 18.377L12.217 18.449L12.29 18.449L12.29 18.522L12.362 18.522L12.362 18.594L12.507 18.667L12.507 18.739L12.58 18.739L12.58 18.812L12.725 18.812L12.797 18.957L12.942 18.957L13.014 19.101L13.159 19.101L13.159 19.174L13.304 19.174L13.304 19.246L13.232 19.246L13.159 19.391L13.014 19.391L12.942 19.536L12.797 19.536L12.725 19.681L12.58 19.681L12.507 19.826L12.362 19.826L12.362 19.899L12.217 19.899L12.217 19.971L12.072 19.971L12.072 20.043L11.928 20.043L11.928 20.116L11.783 20.116L11.783 20.188L11.565 20.188L11.565 20.261L11.493 20.261L11.058 20.478L11.058 20.333L10.986 20.333L10.986 20.188L10.913 20.188L10.913 20.043L10.841 20.043L10.841 19.899L10.768 19.899L10.768 19.754L10.696 19.754L10.696 19.681L10.623 19.681L10.623 19.536L10.478 19.464L10.478 19.319L10.406 19.319L10.406 19.174L10.261 19.101L10.261 18.957L10.188 18.957L10.188 18.884L10.478 18.884L10.478 18.812L10.696 18.812L10.696 18.739L10.841 18.739L10.841 18.667L10.913 18.667L10.913 18.594L10.986 18.594L10.986 18.522L11.058 18.522L11.058 18.449L11.13 18.449L11.13 18.377L11.203 18.377L11.203 18.304L11.275 18.304L11.275 18.232L11.348 18.232L11.42 18.087L11.493 18.087L11.493 18.014L11.565 18.014L11.565 17.942L11.71 17.942L11.783 17.797ZM7 18.087L7.072 18.087L7.072 18.304L7 18.304L7 18.594L6.928 18.594L6.928 18.812L6.855 18.812L6.855 19.029L6.783 19.029L6.783 19.174L6.71 19.174L6.71 19.319L6.638 19.319L6.638 19.391L6.565 19.391L6.565 19.464L6.493 19.464L6.493 19.536L6.42 19.536L6.42 19.609L6.275 19.681L6.275 19.754L6.203 19.754L6.203 19.826L5.913 19.826L5.913 19.899L5.696 19.899L5.696 19.826L5.406 19.826L5.406 19.754L5.333 19.754L5.333 19.681L5.188 19.609L5.188 19.536L5.696 19.536L5.696 19.464L5.986 19.464L5.986 19.391L6.203 19.391L6.203 19.319L6.275 19.319L6.275 19.246L6.348 19.246L6.348 19.174L6.42 19.174L6.493 19.029L6.565 19.029L6.565 18.957L6.638 18.957L6.638 18.812L6.783 18.739L6.783 18.594L6.855 18.594L6.855 18.449L6.928 18.449L6.928 18.232L7 18.232L7 18.087ZM16.855 19.246L17.145 19.246L17.145 19.319L17.507 19.319L17.507 19.391L17.725 19.391L17.725 19.464L17.87 19.464L17.942 19.609L18.087 19.609L18.087 19.681L18.159 19.681L18.159 19.754L18.232 19.754L18.232 19.826L18.304 19.826L18.304 19.899L18.377 19.899L18.449 20.043L18.522 20.043L18.522 20.116L18.594 20.116L18.594 20.261L18.667 20.261L18.739 20.406L18.812 20.406L18.812 20.551L18.884 20.551L18.884 20.696L18.957 20.696L18.957 20.841L19.029 20.841L19.029 21.13L18.957 21.13L18.957 20.913L18.884 20.913L18.884 20.768L18.739 20.696L18.739 20.551L18.667 20.551L18.667 20.478L18.594 20.478L18.594 20.406L18.522 20.406L18.522 20.333L18.449 20.333L18.449 20.261L18.377 20.261L18.377 20.188L18.304 20.188L18.304 20.116L18.232 20.116L18.159 19.971L18.087 19.971L18.087 19.899L18.014 19.899L18.014 19.826L17.87 19.826L17.797 19.681L17.652 19.681L17.652 19.609L17.507 19.609L17.507 19.536L17.362 19.536L17.362 19.464L17.217 19.464L17.217 19.391L17 19.391L17 19.319L16.855 19.319L16.855 19.246ZM10.406 20.841L10.478 20.841L10.478 20.986L10.406 20.986L10.406 21.058L10.333 21.058L10.261 21.203L10.188 21.203L10.188 21.348L10.116 21.348L10.116 21.42L10.043 21.42L10.043 21.493L9.899 21.565L9.899 21.638L9.826 21.638L9.826 21.493L9.899 21.493L9.971 21.348L10.043 21.348L10.043 21.203L10.116 21.203L10.116 21.13L10.188 21.13L10.188 21.058L10.261 21.058L10.333 20.913L10.406 20.913L10.406 20.841Z" }) });
});

// src/OverviewCard.tsx
import { jsx as jsx38, jsxs as jsxs32 } from "react/jsx-runtime";
function OverviewCard({ variant = "chat", expanded, occluded = false, className, children, ...props }) {
  const styles = overviewCard({ variant });
  return /* @__PURE__ */ jsxs32(
    "div",
    {
      "data-overview-card": variant,
      "data-expanded": expanded,
      "data-occluded": occluded,
      className: [styles.root, className].filter(Boolean).join(" "),
      ...props,
      children: [
        variant === "chat" && /* @__PURE__ */ jsx38("div", { className: styles.surface, "data-overview-surface": "", "aria-hidden": "true" }),
        children
      ]
    }
  );
}

// src/ChatStatus.tsx
import { Circle, CircleAlert, Moon as Moon2 } from "lucide-react";
import { jsx as jsx39, jsxs as jsxs33 } from "react/jsx-runtime";
var chatStatusLabels = {
  attention: "Awaiting action",
  responding: "Response in progress",
  rest: "Rest",
  idle: "Idle"
};
var chatStatusDescriptions = {
  attention: "A question, permission, or action needs your response.",
  responding: "An agent is thinking, using tools, or writing a response.",
  rest: "No action pending; activity within the last hour.",
  idle: "No activity for at least one hour; nothing is pending or running."
};
var icons2 = { attention: CircleAlert, rest: Circle, idle: Moon2 };
function ChatStatus({ status, display = "labeled", className, ...props }) {
  const styles = chatStatus({ status, display });
  const Icon2 = status === "responding" ? null : icons2[status];
  return /* @__PURE__ */ jsxs33(
    "span",
    {
      role: "img",
      "aria-label": `Chat status: ${chatStatusLabels[status]}`,
      title: `${chatStatusLabels[status]} \u2014 ${chatStatusDescriptions[status]}`,
      "data-chat-status": status,
      className: [styles.root, className].filter(Boolean).join(" "),
      ...props,
      children: [
        /* @__PURE__ */ jsx39("span", { className: styles.icon, "aria-hidden": "true", children: Icon2 ? /* @__PURE__ */ jsx39(Icon2, { strokeWidth: 1.8 }) : /* @__PURE__ */ jsx39(RippleLoader, {}) }),
        /* @__PURE__ */ jsx39("span", { className: styles.label, "aria-hidden": "true", children: chatStatusLabels[status] })
      ]
    }
  );
}

// src/ChatOverviewCard.tsx
import { useId as useId11, useState as useState16 } from "react";
import { ArrowUpRight as ArrowUpRight2, ChevronDown as ChevronDown5, Folder as Folder2, Layers as Layers2 } from "lucide-react";
import { jsx as jsx40, jsxs as jsxs34 } from "react/jsx-runtime";
function ChatOverviewCard({ id, title: title2, agents, status, createdLabel, project, workItem, onOpen }) {
  const [expanded, setExpanded] = useState16(false);
  const detailsId = useId11();
  const roster = [...new Map(agents.map((agent) => [agent.id, agent])).values()];
  const context2 = [project?.label ?? "No linked project", workItem?.label].filter(Boolean).join(" \xB7 ");
  return /* @__PURE__ */ jsxs34(OverviewCard, { variant: "chat", role: "article", expanded, "aria-label": title2, "data-conversation-id": id, children: [
    /* @__PURE__ */ jsxs34("button", { type: "button", className: "nc-chat-card__trigger", "aria-expanded": expanded, "aria-controls": expanded ? detailsId : void 0, onClick: () => setExpanded((value) => !value), children: [
      /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__identity", children: [
        /* @__PURE__ */ jsx40("span", { className: "nc-chat-card__title", children: title2 }),
        /* @__PURE__ */ jsx40("span", { className: "nc-chat-card__context", title: context2, children: context2 }),
        /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__reference", children: [
          "NC \xB7 ",
          id.slice(0, 8)
        ] })
      ] }),
      /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__accessory", children: [
        /* @__PURE__ */ jsx40(ChatStatus, { status, display: expanded ? "labeled" : "compact" }),
        /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__stack", "aria-label": `${roster.length} agents: ${roster.map((agent) => agent.name).join(", ")}`, children: [
          roster.slice(0, 3).map((agent, index) => /* @__PURE__ */ jsx40(Avatar, { name: agent.name, src: agent.avatarSrc, color: agent.color, kind: "agent", size: "lg", "data-overlapping": index > 0, style: { zIndex: index + 1 } }, agent.id)),
          roster.length > 3 && /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__more", children: [
            "+",
            roster.length - 3
          ] })
        ] }),
        /* @__PURE__ */ jsx40(ChevronDown5, { className: "nc-chat-card__chevron", size: 13, "aria-hidden": "true" })
      ] })
    ] }),
    expanded && /* @__PURE__ */ jsxs34("div", { id: detailsId, className: "nc-chat-card__details", children: [
      /* @__PURE__ */ jsx40("div", { className: "nc-chat-card__roster", "aria-label": "Conversation agents", children: roster.map((agent) => /* @__PURE__ */ jsx40(Tooltip, { label: agent.name, children: /* @__PURE__ */ jsxs34("span", { className: "nc-chat-card__agent", style: { color: `var(--avatar-${agent.color})` }, children: [
        /* @__PURE__ */ jsx40(Avatar, { name: agent.name, src: agent.avatarSrc, color: agent.color, kind: "agent", size: "lg" }),
        /* @__PURE__ */ jsx40("span", { children: agent.name })
      ] }) }, agent.id)) }),
      /* @__PURE__ */ jsx40(Text, { as: "p", variant: "small", tone: "muted", children: chatStatusDescriptions[status] }),
      /* @__PURE__ */ jsxs34("dl", { className: "nc-chat-card__metadata", children: [
        /* @__PURE__ */ jsxs34("div", { children: [
          /* @__PURE__ */ jsx40("dt", { children: "Chat ID" }),
          /* @__PURE__ */ jsx40("dd", { className: "nc-chat-card__id", children: id })
        ] }),
        /* @__PURE__ */ jsxs34("div", { children: [
          /* @__PURE__ */ jsx40("dt", { children: "Project" }),
          /* @__PURE__ */ jsx40("dd", { children: project?.onOpen ? /* @__PURE__ */ jsxs34("button", { type: "button", onClick: project.onOpen, children: [
            /* @__PURE__ */ jsx40(Folder2, { size: 14, "aria-hidden": "true" }),
            project.label,
            /* @__PURE__ */ jsx40(ArrowUpRight2, { size: 13, "aria-hidden": "true" })
          ] }) : project?.label ?? "No linked project" })
        ] }),
        workItem && /* @__PURE__ */ jsxs34("div", { children: [
          /* @__PURE__ */ jsx40("dt", { children: workItem.kind ?? "Work item" }),
          /* @__PURE__ */ jsx40("dd", { children: workItem.onOpen ? /* @__PURE__ */ jsxs34("button", { type: "button", onClick: workItem.onOpen, children: [
            /* @__PURE__ */ jsx40(Layers2, { size: 14, "aria-hidden": "true" }),
            workItem.label,
            /* @__PURE__ */ jsx40(ArrowUpRight2, { size: 13, "aria-hidden": "true" })
          ] }) : workItem.label })
        ] }),
        /* @__PURE__ */ jsxs34("div", { children: [
          /* @__PURE__ */ jsx40("dt", { children: "Created" }),
          /* @__PURE__ */ jsx40("dd", { children: createdLabel })
        ] })
      ] }),
      /* @__PURE__ */ jsxs34(Button, { variant: "tonal", size: "sm", className: "nc-chat-card__open", onClick: onOpen, children: [
        "Open conversation ",
        /* @__PURE__ */ jsx40(ArrowUpRight2, { size: 14, "aria-hidden": "true" })
      ] })
    ] })
  ] });
}

// src/ApprovedChatHeader.tsx
import { useLayoutEffect as useLayoutEffect9, useRef as useRef18, useState as useState17 } from "react";
import { jsx as jsx41, jsxs as jsxs35 } from "react/jsx-runtime";
function ApprovedChatHeader({ material = "chathead", ...props }) {
  const slot = useRef18(null);
  const recipeMaterial = conversationHeader.variantMap.material.includes(material) ? material : void 0;
  useLayoutEffect9(() => {
    const el = slot.current;
    const pane = el?.closest("[data-conversation-pane]");
    const scroller = pane?.querySelector("[data-conversation-scroll]");
    const sentinel = pane?.querySelector("[data-occlusion-sentinel]");
    if (!el || !scroller || !sentinel) return;
    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20);
    let io;
    let edge = -1;
    const connect = () => {
      const card2 = el.querySelector(".caelos-conversation-header__card");
      const rest = parseFloat(getComputedStyle(el).getPropertyValue("--hp-height"));
      if (!card2 || !rest) return;
      const next = Math.max(0, Math.round(card2.getBoundingClientRect().top + rest - scroller.getBoundingClientRect().top));
      if (next === edge) return;
      edge = next;
      io?.disconnect();
      io = new IntersectionObserver(
        // One batch can carry several readings for the sentinel (e.g. a scroll-to-bottom during mount); the last is current.
        (entries) => el.style.setProperty("--nc-occluded", (1 - entries[entries.length - 1].intersectionRatio).toFixed(3)),
        { root: scroller, rootMargin: `-${edge}px 0px 0px 0px`, threshold: thresholds }
      );
      io.observe(sentinel);
    };
    const resize = new ResizeObserver(connect);
    resize.observe(scroller);
    resize.observe(el);
    connect();
    return () => {
      io?.disconnect();
      resize.disconnect();
      el.style.removeProperty("--nc-occluded");
    };
  }, []);
  const titleProbe = useRef18(null);
  const subtitleProbe = useRef18(null);
  const spaceProbe = useRef18(null);
  const [width, setWidth] = useState17(780);
  const [metrics, setMetrics] = useState17({
    titleLine: 24,
    subtitleLine: 18,
    space: [0, 3, 6, 9, 12, 15, 18, 24, 30],
    font: {}
  });
  useLayoutEffect9(() => {
    const pane = slot.current?.closest("[data-conversation-pane]");
    if (!pane) return;
    let composer = null;
    const measure = () => {
      const next = pane.querySelector(".nova-chat-composer .nc-composer-shell");
      if (next !== composer) {
        if (composer) observer.unobserve(composer);
        composer = next;
        if (composer) observer.observe(composer);
      }
      const available = slot.current?.parentElement?.clientWidth ?? pane.clientWidth;
      setWidth(composer?.getBoundingClientRect().width ?? Math.min(780, Math.max(0, available - 30)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    const mutations = new MutationObserver(measure);
    mutations.observe(pane, { childList: true, subtree: true });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
  useLayoutEffect9(() => {
    const measure = () => {
      if (!titleProbe.current || !subtitleProbe.current || !spaceProbe.current) return;
      const title2 = getComputedStyle(titleProbe.current);
      const font = {};
      for (const property of ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "word-spacing", "text-transform"]) {
        font[`--hp-${property}`] = title2.getPropertyValue(property);
      }
      setMetrics({
        titleLine: parseFloat(title2.lineHeight),
        subtitleLine: parseFloat(getComputedStyle(subtitleProbe.current).lineHeight),
        space: [0, ...Array.from(spaceProbe.current.children, (child) => parseFloat(getComputedStyle(child).width))],
        font
      });
    };
    measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => document.fonts.removeEventListener("loadingdone", measure);
  }, []);
  const tier = approvedHeaderLayout.avatarTiers[props.participants.length <= 1 ? 0 : props.participants.length <= 3 ? 1 : 2];
  const restAvatar = agentAvatarSizes[tier.rest];
  const expandedAvatar = typeof tier.expanded === "number" ? tier.expanded : agentAvatarSizes[tier.expanded];
  const copyHeight = metrics.titleLine + metrics.space[2] + metrics.subtitleLine;
  const block = metrics.space[approvedHeaderLayout.spacing.block];
  const height = Math.max(copyHeight, restAvatar) + 2 * block + 2;
  const radius = height / 2;
  const clearance = (contentHeight) => (radius - Math.sqrt(Math.max(0, radius ** 2 - (contentHeight / 2) ** 2))) * approvedHeaderLayout.curveCompensation / 100;
  const style = {
    width,
    ...metrics.font,
    "--hp-rest": `${width * approvedHeaderLayout.restPercent / 100}px`,
    "--hp-open": `${width * approvedHeaderLayout.expandedPercent / 100}px`,
    "--hp-height": `${height}px`,
    "--object-inset-block": `${block}px`,
    "--object-inset-leading": `${metrics.space[approvedHeaderLayout.spacing.leading] + clearance(copyHeight)}px`,
    "--object-inset-trailing": `${metrics.space[approvedHeaderLayout.spacing.trailing] + clearance(restAvatar)}px`,
    "--object-content-gap": `${metrics.space[approvedHeaderLayout.spacing.gap]}px`,
    "--hp-copy-height": `${copyHeight}px`,
    "--hp-title-line": `${metrics.titleLine}px`
  };
  return /* @__PURE__ */ jsxs35("div", { ref: slot, className: approvedHeader().root, "data-material": material, "data-staging-header": "approved", style, children: [
    /* @__PURE__ */ jsxs35("div", { "aria-hidden": "true", className: approvedHeader().probe, children: [
      /* @__PURE__ */ jsx41("span", { ref: titleProbe, className: conversationHeader().titleFrame, children: "Typography" }),
      /* @__PURE__ */ jsx41("span", { ref: subtitleProbe, className: typography({ role: "small" }), children: "Linked work" }),
      /* @__PURE__ */ jsx41("span", { ref: spaceProbe, children: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => /* @__PURE__ */ jsx41("span", { style: { display: "inline-block", width: `var(--sys-space-${n})` } }, n)) })
    ] }),
    /* @__PURE__ */ jsx41(
      ConversationHeader,
      {
        ...props,
        material: recipeMaterial,
        className: `hp-header ${props.className ?? ""}`,
        restAvatarHeight: restAvatar,
        expandedAvatarSize: expandedAvatar,
        splitGap: approvedHeaderLayout.split.gap,
        splitCushion: approvedHeaderLayout.split.cushion,
        splitMin: approvedHeaderLayout.split.minText,
        splitMax: approvedHeaderLayout.split.maxText,
        layoutKey: `${width}/${height}/${props.participants.length}/${metrics.titleLine}`
      }
    )
  ] });
}

// src/conversation-widths.ts
var conversationWidthLayout = {
  lowerThreshold: 640,
  upperThreshold: 1320,
  lowerOuterMargin: 10,
  upperOuterMargin: 64,
  overhangLowerThreshold: 1024,
  overhangUpperThreshold: 1748,
  maximumOverhang: 200,
  maximumComposerWidth: 1220
};
function getConversationWidths(availableWidth) {
  const p = conversationWidthLayout;
  const paneWidth = Math.max(0, availableWidth);
  const progress = Math.min(1, Math.max(0, (paneWidth - p.lowerThreshold) / (p.upperThreshold - p.lowerThreshold)));
  const minimumOuterMargin = p.lowerOuterMargin + (p.upperOuterMargin - p.lowerOuterMargin) * progress;
  const overhangProgress = Math.min(1, Math.max(0, (paneWidth - p.overhangLowerThreshold) / (p.overhangUpperThreshold - p.overhangLowerThreshold)));
  const overhang = p.maximumOverhang * overhangProgress;
  const chatWidth = Math.max(0, Math.min(paneWidth - minimumOuterMargin * 2, p.maximumComposerWidth + p.maximumOverhang * 2));
  const composerWidth = Math.max(0, chatWidth - overhang * 2);
  return { paneWidth, chatWidth, composerWidth, overhang, outerMargin: (paneWidth - chatWidth) / 2, progress };
}

// src/CaelosLogo.tsx
import { forwardRef as forwardRef6, useId as useId12 } from "react";
import { Fragment as Fragment12, jsx as jsx42, jsxs as jsxs36 } from "react/jsx-runtime";
function IconArtwork() {
  const id = useId12();
  const clipId = `caelos-${id}-above`;
  const maskId = `caelos-${id}-separate`;
  return /* @__PURE__ */ jsxs36(Fragment12, { children: [
    /* @__PURE__ */ jsxs36("defs", { children: [
      /* @__PURE__ */ jsx42("clipPath", { id: clipId, children: /* @__PURE__ */ jsx42("rect", { x: "0", y: "0", width: "1024", height: "570" }) }),
      /* @__PURE__ */ jsxs36("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "1024", height: "1024", children: [
        /* @__PURE__ */ jsx42("rect", { width: "1024", height: "1024", fill: "white" }),
        /* @__PURE__ */ jsx42("path", { d: "M 612.0000 227.0000 C 607.9649 263.3158 605.3074 294.2842 606.3686 317.6468 C 606.8992 329.3282 608.3585 339.1156 610.9433 346.8874 C 613.5282 354.6591 617.2416 360.4123 622.1375 364.2241 C 627.0335 368.0360 633.1118 369.9082 640.2604 370.1277 C 647.4091 370.3473 655.6245 368.9199 664.6564 366.2853 C 682.7204 361.0162 704.0326 350.9837 726.0000 340.0000 C 715.0163 345.4919 704.1952 351.0690 693.7950 356.8959 C 683.3948 362.7229 673.4190 368.7994 664.0811 375.3739 C 654.7432 381.9483 646.0458 389.0206 638.1112 396.9254 C 630.1766 404.8302 623.0058 413.5668 616.6031 423.5609 C 610.2005 433.5550 604.5655 444.8041 599.5826 457.8473 C 594.5998 470.8904 590.2680 485.7217 586.3659 503.0548 C 582.4638 520.3879 578.9911 540.2106 575.6330 563.5445 C 572.2749 586.8783 569.0335 613.6982 565.4884 645.6047 C 569.0335 613.6982 571.6915 587.4458 573.3717 565.3699 C 575.0519 543.2939 575.7568 525.4079 575.3142 510.7631 C 574.8716 496.1182 573.2861 484.7212 570.2551 476.0026 C 567.2242 467.2840 562.7570 461.2450 556.3234 457.6378 C 549.8897 454.0307 541.5100 452.8490 530.2164 454.2043 C 524.5696 454.8820 518.1862 456.1999 510.8687 458.2196 C 503.5512 460.2393 495.3024 462.9596 485.8379 466.4904 C 476.3734 470.0211 465.6979 474.3601 453.3880 479.6905 C 441.0782 485.0210 427.1425 491.3388 410.9235 498.9471 C 394.7045 506.5554 376.2193 515.4458 354.3910 526.1330 C 343.4768 531.4767 331.7190 537.2734 318.9154 543.6214 C 306.1119 549.9694 292.2644 556.8678 277.1000 564.4500 C 292.2644 556.8678 306.1293 549.9100 318.9653 543.4382 C 331.8012 536.9665 343.6064 530.9818 354.5810 525.3811 C 376.5302 514.1798 395.1881 504.4991 411.6222 495.7829 C 428.0562 487.0668 442.2495 479.3237 454.8550 472.2044 C 467.4606 465.0852 478.4701 458.5940 488.3062 452.4964 C 498.1423 446.3988 506.8005 440.6970 514.5674 435.2238 C 522.3343 429.7507 529.2074 424.5074 535.3889 419.3687 C 547.7518 409.0911 557.3791 399.2154 565.3059 389.0316 C 573.2327 378.8477 579.4388 368.3639 584.5579 357.0947 C 589.6769 345.8256 593.7000 333.7729 597.0674 320.6071 C 600.4348 307.4414 603.1427 293.1616 605.5299 277.5912 C 607.9171 262.0207 609.9825 245.1579 612.0000 227.0000 Z", fill: "black", stroke: "black", strokeWidth: "56" }),
        /* @__PURE__ */ jsx42("ellipse", { cx: "484", cy: "446", rx: "118", ry: "87.475", transform: "rotate(153.434949 484 446)", fill: "black" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs36("g", { transform: "translate(512 532) scale(2.05) translate(-501.5 -437)", fill: "#F5EBDD", children: [
      /* @__PURE__ */ jsxs36("g", { clipPath: `url(#${clipId})`, children: [
        /* @__PURE__ */ jsx42("circle", { cx: "480", cy: "446", r: "140", mask: `url(#${maskId})` }),
        /* @__PURE__ */ jsx42("path", { d: "M 612.0000 227.0000 C 607.9649 263.3158 605.3074 294.2842 606.3686 317.6468 C 606.8992 329.3282 608.3585 339.1156 610.9433 346.8874 C 613.5282 354.6591 617.2416 360.4123 622.1375 364.2241 C 627.0335 368.0360 633.1118 369.9082 640.2604 370.1277 C 647.4091 370.3473 655.6245 368.9199 664.6564 366.2853 C 682.7204 361.0162 704.0326 350.9837 726.0000 340.0000 C 715.0163 345.4919 704.1952 351.0690 693.7950 356.8959 C 683.3948 362.7229 673.4190 368.7994 664.0811 375.3739 C 654.7432 381.9483 646.0458 389.0206 638.1112 396.9254 C 630.1766 404.8302 623.0058 413.5668 616.6031 423.5609 C 610.2005 433.5550 604.5655 444.8041 599.5826 457.8473 C 594.5998 470.8904 590.2680 485.7217 586.3659 503.0548 C 582.4638 520.3879 578.9911 540.2106 575.6330 563.5445 C 572.2749 586.8783 569.0335 613.6982 565.4884 645.6047 C 569.0335 613.6982 571.6915 587.4458 573.3717 565.3699 C 575.0519 543.2939 575.7568 525.4079 575.3142 510.7631 C 574.8716 496.1182 573.2861 484.7212 570.2551 476.0026 C 567.2242 467.2840 562.7570 461.2450 556.3234 457.6378 C 549.8897 454.0307 541.5100 452.8490 530.2164 454.2043 C 524.5696 454.8820 518.1862 456.1999 510.8687 458.2196 C 503.5512 460.2393 495.3024 462.9596 485.8379 466.4904 C 476.3734 470.0211 465.6979 474.3601 453.3880 479.6905 C 441.0782 485.0210 427.1425 491.3388 410.9235 498.9471 C 394.7045 506.5554 376.2193 515.4458 354.3910 526.1330 C 343.4768 531.4767 331.7190 537.2734 318.9154 543.6214 C 306.1119 549.9694 292.2644 556.8678 277.1000 564.4500 C 292.2644 556.8678 306.1293 549.9100 318.9653 543.4382 C 331.8012 536.9665 343.6064 530.9818 354.5810 525.3811 C 376.5302 514.1798 395.1881 504.4991 411.6222 495.7829 C 428.0562 487.0668 442.2495 479.3237 454.8550 472.2044 C 467.4606 465.0852 478.4701 458.5940 488.3062 452.4964 C 498.1423 446.3988 506.8005 440.6970 514.5674 435.2238 C 522.3343 429.7507 529.2074 424.5074 535.3889 419.3687 C 547.7518 409.0911 557.3791 399.2154 565.3059 389.0316 C 573.2327 378.8477 579.4388 368.3639 584.5579 357.0947 C 589.6769 345.8256 593.7000 333.7729 597.0674 320.6071 C 600.4348 307.4414 603.1427 293.1616 605.5299 277.5912 C 607.9171 262.0207 609.9825 245.1579 612.0000 227.0000 Z" })
      ] }),
      /* @__PURE__ */ jsx42("path", { d: "M 358 580 C 371 577 388 568 414 568 L 546 568 C 572 568 589 577 602 580 C 604.7 580.65 604.2 583.1 601.5 582.7 C 584 580.3 565 578.5 546 578.5 L 414 578.5 C 395 578.5 376 580.3 358.5 582.7 C 355.8 583.1 355.3 580.65 358 580 Z", fill: "#C4AD7C" })
    ] })
  ] });
}
function WordmarkArtwork() {
  return /* @__PURE__ */ jsx42(Fragment12, { children: /* @__PURE__ */ jsxs36("g", { fill: "#F5EBDD", transform: "translate(40 720) scale(1 -1)", children: [
    /* @__PURE__ */ jsx42("path", { transform: "translate(0.0000 0)", d: "M 301.0000 -9.0000 Q 170.0000 -9.0000 105.5000 65.5000 Q 41.0000 140.0000 41.0000 275.0000 Q 41.0000 377.0000 75.5000 444.5000 Q 110.0000 512.0000 172.0000 546.0000 Q 234.0000 580.0000 318.0000 580.0000 Q 356.0000 580.0000 400.5000 573.0000 Q 445.0000 566.0000 483.0000 551.0000 Q 485.0000 518.0000 483.0000 480.5000 Q 481.0000 443.0000 475.0000 403.0000 L 417.0000 403.0000 L 398.0000 490.0000 Q 396.0000 497.0000 392.0000 504.0000 Q 388.0000 511.0000 379.0000 516.0000 Q 368.0000 523.0000 346.5000 528.5000 Q 325.0000 534.0000 302.0000 534.0000 Q 233.0000 534.0000 193.5000 476.5000 Q 154.0000 419.0000 154.0000 288.0000 Q 154.0000 211.0000 169.5000 154.5000 Q 185.0000 98.0000 218.0000 67.5000 Q 251.0000 37.0000 304.0000 37.0000 Q 326.0000 37.0000 347.5000 42.5000 Q 369.0000 48.0000 383.0000 59.0000 Q 389.0000 64.0000 393.0000 70.0000 Q 397.0000 76.0000 401.0000 85.0000 L 426.0000 163.0000 L 484.0000 159.0000 Q 485.0000 127.0000 483.0000 91.5000 Q 481.0000 56.0000 476.0000 21.0000 Q 441.0000 8.0000 394.0000 -0.5000 Q 347.0000 -9.0000 301.0000 -9.0000 Z " }),
    /* @__PURE__ */ jsx42("path", { transform: "translate(526.0000 0)", d: "M 150.0000 -8.0000 Q 98.0000 -8.0000 64.5000 19.0000 Q 31.0000 46.0000 31.0000 95.0000 Q 31.0000 136.0000 55.0000 161.5000 Q 79.0000 187.0000 116.0000 199.0000 Q 153.0000 211.0000 192.0000 214.0000 L 289.0000 221.0000 L 289.0000 179.0000 L 212.0000 173.0000 Q 171.0000 170.0000 151.0000 153.0000 Q 131.0000 136.0000 131.0000 104.0000 Q 131.0000 78.0000 145.0000 64.0000 Q 159.0000 50.0000 187.0000 50.0000 Q 217.0000 50.0000 245.0000 63.0000 Q 273.0000 76.0000 289.0000 96.0000 L 298.0000 74.0000 Q 278.0000 37.0000 238.5000 14.5000 Q 199.0000 -8.0000 150.0000 -8.0000 Z M 43.0000 336.0000 Q 59.0000 379.0000 104.5000 403.0000 Q 150.0000 427.0000 213.0000 427.0000 Q 291.0000 427.0000 328.0000 389.0000 Q 365.0000 351.0000 365.0000 275.0000 L 365.0000 74.0000 Q 365.0000 52.0000 386.0000 50.0000 L 426.0000 46.0000 L 426.0000 7.0000 Q 414.0000 4.0000 392.0000 -1.0000 Q 370.0000 -6.0000 350.0000 -6.0000 Q 318.0000 -6.0000 298.0000 10.5000 Q 278.0000 27.0000 272.0000 64.0000 L 272.0000 267.0000 Q 272.0000 319.0000 250.5000 339.5000 Q 229.0000 360.0000 185.0000 360.0000 Q 152.0000 360.0000 121.5000 349.0000 Q 91.0000 338.0000 66.0000 314.0000 Z " }),
    /* @__PURE__ */ jsx42("path", { transform: "translate(970.0000 0)", d: "M 37.0000 204.0000 Q 37.0000 311.0000 90.0000 369.5000 Q 143.0000 428.0000 235.0000 428.0000 Q 310.0000 428.0000 351.0000 390.0000 Q 392.0000 352.0000 392.0000 283.0000 Q 392.0000 272.0000 390.5000 257.0000 Q 389.0000 242.0000 387.0000 229.0000 L 105.0000 229.0000 L 105.0000 270.0000 L 299.0000 270.0000 Q 300.0000 275.0000 300.5000 279.0000 Q 301.0000 283.0000 301.0000 289.0000 Q 301.0000 331.0000 281.5000 357.0000 Q 262.0000 383.0000 225.0000 383.0000 Q 184.0000 383.0000 160.5000 346.5000 Q 137.0000 310.0000 137.0000 224.0000 Q 137.0000 161.0000 150.5000 123.5000 Q 164.0000 86.0000 190.0000 69.5000 Q 216.0000 53.0000 252.0000 53.0000 Q 286.0000 53.0000 315.5000 67.0000 Q 345.0000 81.0000 363.0000 106.0000 L 389.0000 89.0000 Q 376.0000 43.0000 332.0000 16.5000 Q 288.0000 -10.0000 224.0000 -10.0000 Q 161.0000 -10.0000 119.5000 17.0000 Q 78.0000 44.0000 57.5000 92.0000 Q 37.0000 140.0000 37.0000 204.0000 Z " }),
    /* @__PURE__ */ jsx42("path", { transform: "translate(1400.0000 0)", d: "M 183.0000 71.0000 Q 183.0000 52.0000 201.0000 49.0000 L 251.0000 41.0000 L 251.0000 0.0000 L 18.0000 0.0000 L 18.0000 42.0000 L 68.0000 49.0000 Q 87.0000 52.0000 87.0000 70.0000 L 87.0000 564.0000 Q 87.0000 583.0000 68.0000 586.0000 L 16.0000 593.0000 L 16.0000 632.0000 Q 49.0000 642.0000 92.0000 647.5000 Q 135.0000 653.0000 169.0000 654.0000 L 183.0000 641.0000 Z " }),
    /* @__PURE__ */ jsx42("path", { transform: "translate(1669.0000 0)", d: "M 330.0000 203.0000 Q 330.0000 262.0000 321.0000 301.5000 Q 312.0000 341.0000 291.0000 361.5000 Q 270.0000 382.0000 233.0000 382.0000 Q 187.0000 382.0000 164.5000 343.5000 Q 142.0000 305.0000 142.0000 214.0000 Q 142.0000 156.0000 150.5000 116.5000 Q 159.0000 77.0000 180.0000 56.0000 Q 201.0000 35.0000 238.0000 35.0000 Q 285.0000 35.0000 307.5000 74.0000 Q 330.0000 113.0000 330.0000 203.0000 Z M 37.0000 206.0000 Q 37.0000 285.0000 64.5000 334.0000 Q 92.0000 383.0000 138.5000 405.5000 Q 185.0000 428.0000 242.0000 428.0000 Q 307.0000 428.0000 349.5000 402.5000 Q 392.0000 377.0000 413.0000 328.0000 Q 434.0000 279.0000 434.0000 211.0000 Q 434.0000 132.0000 406.5000 83.5000 Q 379.0000 35.0000 333.0000 12.5000 Q 287.0000 -10.0000 229.0000 -10.0000 Q 165.0000 -10.0000 122.0000 16.0000 Q 79.0000 42.0000 58.0000 90.0000 Q 37.0000 138.0000 37.0000 206.0000 Z " }),
    /* @__PURE__ */ jsx42("path", { transform: "translate(2140.0000 0)", d: "M 44.0000 21.0000 Q 40.0000 51.0000 41.0000 80.5000 Q 42.0000 110.0000 45.0000 136.0000 L 95.0000 136.0000 L 110.0000 81.0000 Q 115.0000 60.0000 127.0000 51.0000 Q 137.0000 46.0000 154.5000 39.0000 Q 172.0000 32.0000 196.0000 32.0000 Q 231.0000 32.0000 248.5000 49.0000 Q 266.0000 66.0000 266.0000 92.0000 Q 266.0000 114.0000 252.5000 128.0000 Q 239.0000 142.0000 214.0000 154.0000 Q 189.0000 166.0000 155.0000 181.0000 Q 107.0000 202.0000 77.5000 228.5000 Q 48.0000 255.0000 48.0000 304.0000 Q 48.0000 363.0000 90.0000 395.5000 Q 132.0000 428.0000 207.0000 428.0000 Q 240.0000 428.0000 276.0000 421.0000 Q 312.0000 414.0000 337.0000 404.0000 Q 338.0000 377.0000 336.0000 349.0000 Q 334.0000 321.0000 329.0000 295.0000 L 283.0000 295.0000 L 270.0000 345.0000 Q 267.0000 356.0000 263.0000 362.5000 Q 259.0000 369.0000 250.0000 373.0000 Q 241.0000 379.0000 229.0000 382.5000 Q 217.0000 386.0000 202.0000 387.0000 Q 174.0000 387.0000 155.0000 373.0000 Q 136.0000 359.0000 136.0000 330.0000 Q 136.0000 308.0000 149.5000 293.5000 Q 163.0000 279.0000 184.0000 269.5000 Q 205.0000 260.0000 228.0000 251.0000 Q 263.0000 237.0000 293.0000 220.5000 Q 323.0000 204.0000 341.5000 179.0000 Q 360.0000 154.0000 360.0000 115.0000 Q 360.0000 55.0000 312.5000 22.5000 Q 265.0000 -10.0000 191.0000 -10.0000 Q 147.0000 -10.0000 108.5000 0.0000 Q 70.0000 10.0000 44.0000 21.0000 Z " }),
    /* @__PURE__ */ jsx42("circle", { cx: "2630", cy: "40", r: "48", fill: "#C4AD7C" })
  ] }) });
}
var CaelosIcon = forwardRef6(
  function CaelosIcon2({ size = 64, decorative = false, "aria-label": label = "Caelos", ...props }, ref) {
    return /* @__PURE__ */ jsxs36(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        ref,
        width: size * 1024 / 1024,
        height: size,
        viewBox: "0 0 1024 1024",
        role: decorative ? void 0 : "img",
        focusable: "false",
        ...props,
        "aria-label": decorative ? void 0 : label,
        "aria-labelledby": decorative ? void 0 : props["aria-labelledby"],
        "aria-hidden": decorative ? true : props["aria-hidden"],
        children: [
          /* @__PURE__ */ jsx42("rect", { width: "1024", height: "1024", rx: "204", fill: "#1C1B28" }),
          /* @__PURE__ */ jsx42(IconArtwork, {})
        ]
      }
    );
  }
);
var CaelosWordmark = forwardRef6(
  function CaelosWordmark2({ size = 48, decorative = false, "aria-label": label = "Caelos", ...props }, ref) {
    return /* @__PURE__ */ jsx42(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        ref,
        width: size * 2750 / 800,
        height: size,
        viewBox: "0 0 2750 800",
        role: decorative ? void 0 : "img",
        focusable: "false",
        ...props,
        "aria-label": decorative ? void 0 : label,
        "aria-labelledby": decorative ? void 0 : props["aria-labelledby"],
        "aria-hidden": decorative ? true : props["aria-hidden"],
        children: /* @__PURE__ */ jsx42(WordmarkArtwork, {})
      }
    );
  }
);
var CaelosLogo = forwardRef6(
  function CaelosLogo2({ size = 96, decorative = false, "aria-label": label = "Caelos", ...props }, ref) {
    return /* @__PURE__ */ jsxs36(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        ref,
        width: size * 1100 / 330,
        height: size,
        viewBox: "0 0 1100 330",
        role: decorative ? void 0 : "img",
        focusable: "false",
        ...props,
        "aria-label": decorative ? void 0 : label,
        "aria-labelledby": decorative ? void 0 : props["aria-labelledby"],
        "aria-hidden": decorative ? true : props["aria-hidden"],
        children: [
          /* @__PURE__ */ jsx42("svg", { x: "0", y: "10", width: "330", height: "330", viewBox: "0 0 1024 1024", children: /* @__PURE__ */ jsx42(IconArtwork, {}) }),
          /* @__PURE__ */ jsx42("svg", { x: "340", y: "87", width: "720", height: "209.4545", viewBox: "0 0 2750 800", children: /* @__PURE__ */ jsx42(WordmarkArtwork, {}) })
        ]
      }
    );
  }
);
export {
  ActionMenu,
  ActionMenuCheckboxItem,
  ActionMenuContent,
  ActionMenuItem,
  ActionMenuRoot,
  ActionMenuSeparator,
  ActionMenuTrigger,
  ActionRow,
  ActivityChain,
  AgentAvatar,
  AgentDetailCard,
  AgentMessage,
  Alert,
  AlertStage,
  ApprovedChatHeader,
  ArrivingText,
  ArtifactPreview,
  ArtifactWorkspace,
  Avatar,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSeparator,
  Button,
  CaelosIcon,
  CaelosLogo,
  CaelosProvider,
  CaelosWordmark,
  Card,
  ChatHistoryNavigation,
  ChatOverviewCard,
  ChatStatus,
  Checkbox,
  Chip,
  ClaudeCodeIcon,
  CodexIcon,
  CompactError,
  Composer,
  ComposerChoice,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextRing,
  ConversationColumn,
  ConversationHeader,
  ConversationMessage,
  ConversationWelcome,
  Dialog,
  Disclosure,
  Drawer,
  ErrorMessage,
  FieldGroup,
  FileCard,
  FileCode,
  FileMoveForm,
  Heading,
  HermesIcon,
  IconButton,
  InlineCluster,
  InlineSource,
  Input,
  Inset,
  JumpToLatest,
  LinkButton,
  LinkedWorkDivider,
  LinkedWorkLinks,
  LinkedWorkTrigger,
  Loading,
  MessageActions,
  MessageProse,
  NotificationButton,
  NotificationCard,
  NotificationProvider,
  NovaLoader,
  OverviewCard,
  PermissionControl,
  PermissionsIcon,
  PersonChip,
  Popover2 as Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressiveSelector,
  Range,
  ResizeHandle,
  ResponsiveGrid,
  RetryButton,
  RightPanelToggle,
  RippleLoader,
  Row,
  RowGroup,
  STATUS_OPTIONS,
  ScrollArea,
  Section,
  SectionStack,
  Select,
  SelectMenu,
  Separator,
  SidePanel,
  SidePanelResizeHandle,
  SidebarSearch,
  SpacingDensity,
  Stack,
  StatusSelect,
  Surface,
  Tabs,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
  TargetContextMenu,
  TaskRow,
  Text,
  TextArea,
  Title3 as Title,
  Toaster,
  Tooltip,
  UnreadDivider,
  UserAccount,
  UserCard,
  UserMessage,
  WorkItemDrawer,
  WorkItemDrawerActions,
  WorkItemDrawerSection,
  WorkingFileDrawerBody,
  WorkingFilesList,
  WorkspaceEditor,
  WorkspacePanel,
  WorkspaceToolButton,
  WorkspaceToolPill,
  agentAvatarSizes,
  approvedHeaderLayout,
  approvedHeaderMotion,
  approvedTokens,
  avatarColors,
  chatStatusDescriptions,
  chatStatusLabels,
  contextMenuVariants,
  conversationWelcomeTokens,
  conversationWidthLayout,
  getConversationWidths,
  themeAttributes,
  toast,
  useCaelosTheme,
  useNotifications
};
//# sourceMappingURL=index.js.map