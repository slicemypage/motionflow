/*!
 * MotionFlow v1.0.0
 * Lightweight motion library for scroll animations, parallax, text effects, counters, and tickers
 * https://motionflow.dev
 *
 * Copyright (c) 2026 Deepak Verma
 * 
 * Released under the MIT License
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MotionFlow = factory());
})(this, (function () { 'use strict';

  // src/presets/easings.js

  const MF_EASINGS = {
      linear: "linear",
      ease: "ease",
      "ease-in": "ease-in",
      "ease-out": "ease-out",
      "ease-in-out": "ease-in-out",
    
      "ease-in-back": "cubic-bezier(0.6, -0.28, 0.735, 0.045)",
      "ease-out-back": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      "ease-in-out-back": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    
      "ease-in-sine": "cubic-bezier(0.47, 0, 0.745, 0.715)",
      "ease-out-sine": "cubic-bezier(0.39, 0.575, 0.565, 1)",
      "ease-in-out-sine": "cubic-bezier(0.445, 0.05, 0.55, 0.95)",
    
      "ease-in-quad": "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
      "ease-out-quad": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      "ease-in-out-quad": "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
    
      "ease-in-cubic": "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
      "ease-out-cubic": "cubic-bezier(0.215, 0.61, 0.355, 1)",
      "ease-in-out-cubic": "cubic-bezier(0.645, 0.045, 0.355, 1)",
    
      "ease-in-quart": "cubic-bezier(0.895, 0.03, 0.685, 0.22)",
      "ease-out-quart": "cubic-bezier(0.165, 0.84, 0.44, 1)",
      "ease-in-out-quart": "cubic-bezier(0.77, 0, 0.175, 1)",
    
      "ease-in-quint": "cubic-bezier(0.755, 0.05, 0.855, 0.06)",
      "ease-out-quint": "cubic-bezier(0.23, 1, 0.32, 1)",
      "ease-in-out-quint": "cubic-bezier(0.86, 0, 0.07, 1)",
    
      "ease-in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
      "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      "ease-in-out-expo": "cubic-bezier(1, 0, 0, 1)",
    
      "ease-in-circ": "cubic-bezier(0.6, 0.04, 0.98, 0.335)",
      "ease-out-circ": "cubic-bezier(0.075, 0.82, 0.165, 1)",
      "ease-in-out-circ": "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
    
      "ease-in-elastic": "cubic-bezier(0.7, -0.6, 0.32, 1.6)",
      "ease-out-elastic": "cubic-bezier(0.33, 0.7, 0.67, -0.7)",
      "ease-in-out-elastic": "cubic-bezier(0.7, -0.5, 0.25, 1.6)",
    
      "ease-in-bounce": "cubic-bezier(0.6, -0.28, 0.735, 0.045)",
      "ease-out-bounce": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      "ease-in-out-bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
    };

  // src/core/engine.js
  function MotionFlowEngine(options = {}) {

    /* ==========================================================
       VIEWPORT PRE-CALC SETTINGS
    ========================================================== */
    const PRELOAD_MULTIPLIER = 1.2;

    /* ==========================================================
       PLUGIN DEFAULTS (ANIMATION)
    ========================================================== */
    const defaults = {
      once: false,
      distance: 100,
      duration: 600,
      delay: 0,
      easing: "ease",
      trigger: "top 90%",
      repeat: "both"
    };

    /* ==========================================================
       STAGGER DEFAULTS
    ========================================================== */
    const staggerDefaults = {
      delay: 0,
      gap: 100
    };

    /* ==========================================================
       INTERNAL STATE
    ========================================================== */
    let items = [];
    let ticking = false;
    let scrollHandler = null;
    let resizeHandler = null;
    let observer = null;
    let refreshTimer = null;

    /* ==========================================================
       HELPERS
    ========================================================== */
    const num = v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    function parseTrigger(str) {
      if (!str) return { elementAnchor: "top", viewportAnchor: 70 };
      const parts = str.trim().toLowerCase().split(/\s+/);
      const map = { top: 0, center: 50, bottom: 100 };
      return {
        elementAnchor: parts[0] || "top",
        viewportAnchor: parts[1]?.endsWith("%")
          ? parseInt(parts[1])
          : map[parts[1]] ?? 70
      };
    }

    function getAnchor(rect, anchor) {
      if (anchor === "center") return rect.top + rect.height / 2;
      if (anchor === "bottom") return rect.bottom;
      return rect.top;
    }

    function scheduleRefresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(update, 60);
    }

    function startObserver() {
      if (observer) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-mf-animation"]
      });
    }

    function stopObserver() {
      observer?.disconnect();
      observer = null;
      clearTimeout(refreshTimer);
    }

    /* ==========================================================
       WILL-CHANGE (JS CONTROLLED)
    ========================================================== */
    function applyWillChange(el) {
      el.style.willChange = "transform, opacity";

      const cleanup = () => {
        el.style.willChange = "";
        el.removeEventListener("animationend", cleanup);
      };

      el.addEventListener("animationend", cleanup);
    }

    /* ==========================================================
       UPDATE (SCROLL CHECK)
    ========================================================== */
    function update() {
      if (!items.length) return;

      const vh = window.innerHeight;
      const buffer = vh * PRELOAD_MULTIPLIER;

      items.forEach(item => {
        const el = item.el;
        if (!document.documentElement.contains(el)) return;

        const rect = (el.__mfStaggerParent || el).getBoundingClientRect();
        if (rect.top > vh + buffer || rect.bottom < -buffer) return;

        const pos = getAnchor(rect, item.trigger.elementAnchor);
        const vp = (vh * item.trigger.viewportAnchor) / 100;

        const visible = pos < vp && rect.bottom > 0;
        const above = rect.bottom <= 0;
        const below = rect.top >= vh;

        if (visible && !item.triggered) {
          item.triggered = true;
          applyWillChange(el);
          el.classList.add("mf-animate");
        }

        if (!item.once) {
          if (
            (item.repeat === "top" && above) ||
            (item.repeat === "bottom" && below) ||
            (item.repeat === "both" && (above || below))
          ) {
            item.triggered = false;
            el.classList.remove("mf-animate");
          }
        }
      });
    }

    /* ==========================================================
       INIT
    ========================================================== */
    function init() {
      items = [];
      ticking = false;

      const body = document.body;

      const animationOptions =
        options.animation === true ? {} : (options.animation || {});
      const staggerOptions = animationOptions.stagger || {};

      const settings = {
        once: animationOptions.once ?? defaults.once,
        distance: num(animationOptions.distance ?? defaults.distance),
        duration: num(animationOptions.duration ?? defaults.duration),
        delay: num(animationOptions.delay ?? defaults.delay),
        easing: animationOptions.easing ?? defaults.easing,
        trigger: animationOptions.trigger ?? defaults.trigger,
        repeat: animationOptions.repeat ?? defaults.repeat
      };

      body.style.setProperty("--mf-distance", settings.distance + "px");
      body.style.setProperty("--mf-duration", settings.duration + "ms");
      body.style.setProperty("--mf-delay", settings.delay + "ms");
      body.style.setProperty(
        "--mf-easing",
        MF_EASINGS[settings.easing] || settings.easing
      );

      /* ==========================================================
         🔴 STAGGER CLEANUP (IDEMPOTENT FIX)
         This is what makes stagger work inside document.ready
      ========================================================== */
      document.querySelectorAll("[data-mf-animation]").forEach(el => {
        if (!el.__mfStaggerParent) return;

        delete el.__mfStaggerParent;
        delete el.dataset.mfAnimation;
        delete el.dataset.mfAnimationDelay;
        delete el.dataset.mfAnimationDistance;
        delete el.dataset.mfAnimationDuration;
        delete el.dataset.mfAnimationEasing;
        delete el.dataset.mfAnimationOnce;
        delete el.dataset.mfAnimationRepeat;
      });

      /* ==========================================================
         STAGGER INJECTION
      ========================================================== */
      const staggerParents = new Map();

      document.querySelectorAll("[data-mf-stagger-animation]").forEach(parent => {
        const animation = parent.dataset.mfStaggerAnimation;

        const baseDelay =
          num(parent.dataset.mfStaggerDelay) ??
          num(staggerOptions.delay) ??
          settings.delay ??
          staggerDefaults.delay;

        const gap =
          num(parent.dataset.mfStaggerGap) ??
          num(staggerOptions.gap) ??
          staggerDefaults.gap;

        const distance =
          num(parent.dataset.mfStaggerDistance) ??
          num(staggerOptions.distance) ??
          settings.distance;

        const duration =
          num(parent.dataset.mfStaggerDuration) ??
          num(staggerOptions.duration) ??
          settings.duration;

        const easing =
          parent.dataset.mfStaggerEasing ??
          staggerOptions.easing ??
          settings.easing;

        const once =
          parent.dataset.mfStaggerOnce ??
          staggerOptions.once ??
          settings.once;

        const repeat =
          parent.dataset.mfStaggerRepeat ??
          staggerOptions.repeat ??
          settings.repeat;

        const trigger = parseTrigger(
          parent.dataset.mfStaggerTrigger ??
          staggerOptions.trigger ??
          settings.trigger
        );

        staggerParents.set(parent, trigger);

        Array.from(parent.children).forEach((child, index) => {
          if (child.hasAttribute("data-mf-stagger-ignore")) return;
          if (child.hasAttribute("data-mf-animation")) return;

          child.__mfStaggerParent = parent;
          child.dataset.mfAnimation = animation;
          child.dataset.mfAnimationDelay = baseDelay + index * gap;

          if (distance !== undefined)
            child.dataset.mfAnimationDistance = distance;

          if (duration !== undefined)
            child.dataset.mfAnimationDuration = duration;

          if (easing)
            child.dataset.mfAnimationEasing = easing;

          if (once !== undefined)
            child.dataset.mfAnimationOnce = once;

          if (repeat)
            child.dataset.mfAnimationRepeat = repeat;
        });
      });

      /* ==========================================================
         COLLECT ELEMENTS
      ========================================================== */
      document.querySelectorAll("[data-mf-animation]").forEach(el => {
        if (!el.dataset.mfAnimation) return;

        el.classList.add("mf-init");

        if (el.dataset.mfAnimationDistance)
          el.style.setProperty("--mf-distance", el.dataset.mfAnimationDistance + "px");

        if (el.dataset.mfAnimationDuration)
          el.style.setProperty("--mf-duration", el.dataset.mfAnimationDuration + "ms");

        if (el.dataset.mfAnimationDelay)
          el.style.setProperty("--mf-delay", el.dataset.mfAnimationDelay + "ms");

        if (el.dataset.mfAnimationEasing)
          el.style.setProperty(
            "--mf-easing",
            MF_EASINGS[el.dataset.mfAnimationEasing] || el.dataset.mfAnimationEasing
          );

        items.push({
          el,
          once:
            el.dataset.mfAnimationOnce !== undefined
              ? el.dataset.mfAnimationOnce === "true" || el.dataset.mfAnimationOnce === ""
              : settings.once,
          repeat:
            (el.dataset.mfAnimationRepeat ?? settings.repeat).toLowerCase(),
          trigger: el.__mfStaggerParent
            ? staggerParents.get(el.__mfStaggerParent)
            : parseTrigger(el.dataset.mfAnimationTrigger ?? settings.trigger),
          triggered: el.classList.contains("mf-animate")
        });
      });

      scrollHandler = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            update();
            ticking = false;
          });
          ticking = true;
        }
      };

      resizeHandler = update;

      update();
      window.addEventListener("scroll", scrollHandler, { passive: true });
      window.addEventListener("resize", resizeHandler);
      startObserver();
    }

    function refresh() {
      update();
    }

    function reinit() {
      destroy(false);
      init();
    }

    function destroy(removeStyles = true) {
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", resizeHandler);
      stopObserver();

      if (removeStyles) {
        items.forEach(({ el }) => {
          el.classList.remove("mf-init", "mf-animate");
          el.style.removeProperty("--mf-distance");
          el.style.removeProperty("--mf-duration");
          el.style.removeProperty("--mf-delay");
          el.style.removeProperty("--mf-easing");
          el.style.willChange = "";
        });
      }

      items = [];
      ticking = false;
    }

    init();
    return { refresh, destroy, reinit };
  }

  // src/core/parallax.js

  function MotionFlowParallax(userOptions = {}) {
    let items = [];
    let latestScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;
    let initialized = false;
    let rafId = null;

    let scrollHandler = null;
    let resizeHandler = null;

    /* ==========================================================
       ACCESSIBILITY
    ========================================================== */
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ==========================================================
       INTERNAL TUNING
    ========================================================== */
    const INTENSITY = 0.1;
    const BUFFER_RATIO = 0.3;
    const SMOOTH = window.innerWidth < 768 ? 0.14 : 0.1;

    /* ==========================================================
       DEFAULTS
    ========================================================== */
    const defaults = {
      speed: 1,
      tabletSpeed: 0,
      mobileSpeed: 0,

      breakpoints: {
        mobile: 768,
        tablet: 1024,
      },

      stagger: {
        speed: 0,
        tabletSpeed: 0,
        mobileSpeed: 0,

        step: 0.3,
        tabletStep: 0.2,
        mobileStep: 0.1,

        direction: "left",
      },
    };

    const cfg = {
      ...defaults,
      ...(userOptions.parallax || {}),

      breakpoints: {
        ...defaults.breakpoints,
        ...((userOptions.parallax && userOptions.parallax.breakpoints) || {}),
      },

      stagger: {
        ...defaults.stagger,
        ...((userOptions.parallax && userOptions.parallax.stagger) || {}),
      },
    };

    /* ==========================================================
       HELPERS
    ========================================================== */
    function lerp(a, b, n) {
      return a + (b - a) * n;
    }

    function getSpeedForDevice(el) {
      if (el.dataset.mfParallaxLocked === "true") {
        const s = parseFloat(el.dataset.mfParallaxSpeed);
        return Number.isFinite(s) ? s : 0;
      }

      const w = window.innerWidth;

      let s =
        w <= cfg.breakpoints.mobile && el.dataset.mfParallaxSpeedMobile != null
          ? parseFloat(el.dataset.mfParallaxSpeedMobile)
          : w <= cfg.breakpoints.tablet &&
            el.dataset.mfParallaxSpeedTablet != null
          ? parseFloat(el.dataset.mfParallaxSpeedTablet)
          : el.dataset.mfParallaxSpeed != null
          ? parseFloat(el.dataset.mfParallaxSpeed)
          : w <= cfg.breakpoints.mobile
          ? cfg.mobileSpeed
          : w <= cfg.breakpoints.tablet
          ? cfg.tabletSpeed
          : cfg.speed;

      return Number.isFinite(s) ? s : 0;
    }

    function getStaggerBaseSpeed(parent) {
      const w = window.innerWidth;

      let s =
        w <= cfg.breakpoints.mobile &&
        parent.dataset.mfParallaxStaggerSpeedMobile != null
          ? parseFloat(parent.dataset.mfParallaxStaggerSpeedMobile)
          : w <= cfg.breakpoints.tablet &&
            parent.dataset.mfParallaxStaggerSpeedTablet != null
          ? parseFloat(parent.dataset.mfParallaxStaggerSpeedTablet)
          : parent.dataset.mfParallaxStaggerSpeed != null
          ? parseFloat(parent.dataset.mfParallaxStaggerSpeed)
          : w <= cfg.breakpoints.mobile
          ? cfg.stagger.mobileSpeed
          : w <= cfg.breakpoints.tablet
          ? cfg.stagger.tabletSpeed
          : cfg.stagger.speed;

      return Number.isFinite(s) ? s : 0;
    }

    function getStaggerStep(parent) {
      const w = window.innerWidth;

      let s =
        w <= cfg.breakpoints.mobile &&
        parent.dataset.mfParallaxStaggerStepMobile != null
          ? parseFloat(parent.dataset.mfParallaxStaggerStepMobile)
          : w <= cfg.breakpoints.tablet &&
            parent.dataset.mfParallaxStaggerStepTablet != null
          ? parseFloat(parent.dataset.mfParallaxStaggerStepTablet)
          : parent.dataset.mfParallaxStaggerStep != null
          ? parseFloat(parent.dataset.mfParallaxStaggerStep)
          : w <= cfg.breakpoints.mobile
          ? cfg.stagger.mobileStep
          : w <= cfg.breakpoints.tablet
          ? cfg.stagger.tabletStep
          : cfg.stagger.step;

      return Number.isFinite(s) ? s : 0;
    }

    function getDocumentTop(el) {
      const rect = el.getBoundingClientRect();
      return rect.top + window.scrollY;
    }

    /* ==========================================================
       INIT
    ========================================================== */
    function init() {
      if (initialized || reduceMotion) return;
      initialized = true;

      items = [];
      ticking = false;

      /* ----------------------------------------------------------
         STAGGER PARALLAX
      ---------------------------------------------------------- */
      document.querySelectorAll("[data-mf-parallax-stagger]").forEach(parent => {
        const base = getStaggerBaseSpeed(parent);
        const step = getStaggerStep(parent);

        const dir = (
          parent.dataset.mfParallaxStaggerDirection ??
          cfg.stagger.direction
        ).toLowerCase();

        const children = Array.from(parent.children).filter(
          c => !c.hasAttribute("data-mf-parallax-stagger-ignore")
        );

        const n = children.length;
        if (!n) return;

        const centerIndex = Math.floor((n - 1) / 2);

        children.forEach((child, i) => {
          let mul = i;
          if (dir === "right") mul = n - 1 - i;
          if (dir === "center") mul = Math.abs(i - centerIndex);

          const speed = base + step * mul;
          const rounded = Math.round(speed * 1000) / 1000;

          child.dataset.mfParallax = "";
          child.dataset.mfParallaxSpeed = String(rounded);
          child.dataset.mfParallaxLocked = "true";
        });
      });

      /* ----------------------------------------------------------
         COLLECT ELEMENTS
      ---------------------------------------------------------- */
      document.querySelectorAll("[data-mf-parallax]").forEach(el => {
        if (el.hasAttribute("data-mf-parallax-ignore")) return;

        const speed = getSpeedForDevice(el);
        if (speed === 0) return;

        el.style.willChange = "transform";

        items.push({
          el,
          speed,
          docTop: getDocumentTop(el),
          currentY: 0,
          targetY: 0,
        });
      });

      if (!items.length) return;

      /* ----------------------------------------------------------
         UPDATE TARGETS
      ---------------------------------------------------------- */
      function updateTargets() {
        const scrollY = latestScrollY;
        const vh = window.innerHeight;
        const buffer = vh * BUFFER_RATIO;

        items.forEach(item => {
          const rect = item.el.getBoundingClientRect();
          if (rect.top > vh + buffer || rect.bottom < -buffer) return;

          const startScrollY = item.docTop - vh;
          const raw = scrollY - startScrollY;
          const active = Math.max(0, raw);

          item.targetY =
            -Math.round(active * item.speed * INTENSITY * 100) / 100;
        });

        if (!rafId) rafId = requestAnimationFrame(render);
        ticking = false;
      }

      /* ----------------------------------------------------------
         RENDER
      ---------------------------------------------------------- */
      function render() {
        let moving = false;

        items.forEach(item => {
          item.currentY = lerp(item.currentY, item.targetY, SMOOTH);
          if (Math.abs(item.currentY - item.targetY) > 0.1) moving = true;

          item.el.style.transform =
            `translate3d(0, ${item.currentY}px, 0)`;
        });

        rafId = moving ? requestAnimationFrame(render) : null;
      }

      /* ----------------------------------------------------------
         EVENTS
      ---------------------------------------------------------- */
      scrollHandler = () => {
        latestScrollY = window.scrollY;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateTargets);
        }
      };

      resizeHandler = () => {
        latestScrollY = window.scrollY;

        items.forEach(item => {
          item.speed = getSpeedForDevice(item.el);
          item.docTop = getDocumentTop(item.el);
        });

        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateTargets);
        }
      };

      latestScrollY = window.scrollY;
      updateTargets();

      window.addEventListener("scroll", scrollHandler, { passive: true });
      window.addEventListener("resize", resizeHandler);
    }

    /* ==========================================================
       PUBLIC API
    ========================================================== */
    function refresh() {
      destroy(false);
      init();
    }

    function destroy(removeStyles = true) {
      initialized = false;

      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", resizeHandler);

      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;

      if (removeStyles) {
        items.forEach(item => {
          item.el.style.transform = "";
          item.el.style.willChange = "";
        });
      }

      items = [];
      ticking = false;
    }

    /* ==========================================================
       START
    ========================================================== */
    init();

    return { refresh, destroy };
  }

  // src/core/count.js
  function MotionFlowCount(userOptions = {}) {
    let items = [];
    let ticking = false;
    let initialized = false;

    let scrollHandler = null;
    let resizeHandler = null;

    /* ==========================================================
       ACCESSIBILITY
    ========================================================== */
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ==========================================================
       DEFAULTS
    ========================================================== */
    const defaults = {
      from: 0,
      once: false,
      repeat: "both",
      duration: 1200,
      trigger: "top 90%",
    };

    const cfg = { ...defaults, ...(userOptions.count || {}) };

    /* ==========================================================
       HELPERS
    ========================================================== */
    function parseTrigger(str) {
      if (!str) return { elementAnchor: "top", viewportAnchor: 90 };

      const parts = String(str).trim().toLowerCase().split(/\s+/);
      const map = { top: 0, center: 50, bottom: 100 };

      return {
        elementAnchor: parts[0] || "top",
        viewportAnchor: parts[1]?.endsWith("%")
          ? parseInt(parts[1], 10)
          : map[parts[1]] ?? 90,
      };
    }

    function getAnchor(rect, anchor) {
      if (anchor === "center") return rect.top + rect.height / 2;
      if (anchor === "bottom") return rect.bottom;
      return rect.top;
    }

    function toNumber(raw) {
      const n = parseFloat(String(raw).replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }

    function getDecimals(raw) {
      const s = String(raw);
      const p = s.split(".");
      return p[1] ? p[1].length : 0;
    }

    function detectNumberFormat(raw) {
      const str = String(raw).trim();
      const usPattern = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
      const indianPattern = /^\d{1,3}(,\d{2})+(,\d{3})(\.\d+)?$/;

      if (usPattern.test(str)) return "us";
      if (indianPattern.test(str)) return "in";
      return "plain";
    }

    function format(n, locale, decimals, useGrouping = true) {
      return Number(n).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });
    }

    function stopAnim(item) {
      item.animating = false;
      if (item.rafId) cancelAnimationFrame(item.rafId);
      item.rafId = null;
      item.startTime = null;
    }

    /* ==========================================================
       COLLECT
    ========================================================== */
    function collect() {
      const existing = new Map(items.map(it => [it.el, it]));
      const nodes = document.querySelectorAll("[data-mf-count-to]");
      const next = [];

      nodes.forEach(el => {
        const rawTarget = el.getAttribute("data-mf-count-to");
        if (!rawTarget) return;

        const target = toNumber(rawTarget);
        if (target === null) return;

        const fromRaw = el.dataset.mfCountFrom;
        const from =
          fromRaw !== undefined
            ? toNumber(fromRaw) ?? 0
            : cfg.from ?? 0;

        const toDecimals = getDecimals(rawTarget);
        const fromDecimals = getDecimals(fromRaw || "");
        const animDecimals = Math.max(toDecimals, fromDecimals);

        const formatType = detectNumberFormat(rawTarget);

        let locale;
        let useGrouping = true;

        if (formatType === "us") locale = "en-US";
        else if (formatType === "in") locale = "en-IN";
        else useGrouping = false;

        const duration = Number(el.dataset.mfCountDuration ?? cfg.duration);

        const once =
          el.dataset.mfCountOnce !== undefined
            ? el.dataset.mfCountOnce === "true" || el.dataset.mfCountOnce === ""
            : cfg.once;

        const repeat = String(
          el.dataset.mfCountRepeat ?? cfg.repeat
        ).toLowerCase();

        const trigger = parseTrigger(
          el.dataset.mfCountTrigger ?? cfg.trigger
        );

        const prev = existing.get(el);

        if (prev) {
          Object.assign(prev, {
            from,
            target,
            locale,
            useGrouping,
            duration,
            once,
            repeat,
            trigger,
            fromDecimals,
            toDecimals,
            animDecimals,
          });
          next.push(prev);
          existing.delete(el);
        } else {
          el.textContent = format(from, locale, fromDecimals, useGrouping);

          next.push({
            el,
            from,
            target,
            locale,
            useGrouping,
            duration,
            once,
            repeat,
            trigger,
            fromDecimals,
            toDecimals,
            animDecimals,
            started: false,
            animating: false,
            startTime: null,
            rafId: null,
          });
        }
      });

      existing.forEach(stopAnim);
      items = next;
    }

    /* ==========================================================
       ANIMATION
    ========================================================== */
    function animate(ts, item) {
      if (!item.animating) return;

      if (!item.startTime) item.startTime = ts;

      const p = Math.min((ts - item.startTime) / item.duration, 1);
      const rawValue = item.from + (item.target - item.from) * p;

      const value =
        item.animDecimals > 0
          ? Number(rawValue.toFixed(item.animDecimals))
          : rawValue;

      item.el.textContent = format(
        value,
        item.locale,
        item.animDecimals,
        item.useGrouping
      );

      if (p < 1) {
        item.rafId = requestAnimationFrame(n => animate(n, item));
      } else {
        item.animating = false;
        item.el.textContent = format(
          item.target,
          item.locale,
          item.toDecimals,
          item.useGrouping
        );
      }
    }

    /* ==========================================================
       UPDATE
    ========================================================== */
    function update() {
      const vh = window.innerHeight;

      items.forEach(item => {
        const rect = item.el.getBoundingClientRect();
        const elementPos = getAnchor(rect, item.trigger.elementAnchor);
        const viewportPos = (vh * item.trigger.viewportAnchor) / 100;

        const visible = elementPos < viewportPos && rect.bottom > 0;
        const above = rect.bottom <= 0;
        const below = rect.top >= vh;

        if (visible && !item.started) {
          item.started = true;

          if (reduceMotion) {
            item.el.textContent = format(
              item.target,
              item.locale,
              item.toDecimals,
              item.useGrouping
            );
          } else {
            stopAnim(item);
            item.animating = true;
            item.startTime = null;
            item.rafId = requestAnimationFrame(ts => animate(ts, item));
          }
        }

        if (!item.once && item.started) {
          const reset =
            (item.repeat === "top" && above) ||
            (item.repeat === "bottom" && below) ||
            (item.repeat === "both" && (above || below));

          if (reset) {
            stopAnim(item);
            item.started = false;
            item.el.textContent = format(
              item.from,
              item.locale,
              item.fromDecimals,
              item.useGrouping
            );
          }
        }
      });

      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    /* ==========================================================
       LIFECYCLE (IDEMPOTENT)
    ========================================================== */
    function init() {
      if (initialized) {
        destroy(false);
      }

      initialized = true;
      collect();
      update();

      scrollHandler = onScroll;
      resizeHandler = onScroll;

      window.addEventListener("scroll", scrollHandler, { passive: true });
      window.addEventListener("resize", resizeHandler);
    }

    function refresh() {
      collect();
      onScroll();
    }

    function destroy(reset = true) {
      initialized = false;

      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", resizeHandler);

      items.forEach(item => {
        stopAnim(item);
        if (reset) {
          item.el.textContent = format(
            item.from,
            item.locale,
            item.fromDecimals,
            item.useGrouping
          );
        }
      });

      items = [];
      ticking = false;
    }

    init();
    return { refresh, destroy };
  }

  // src/core/roller.js
  function MotionFlowRoller(userOptions = {}) {
    let items = [];
    let ticking = false;
    let initialized = false;

    let scrollHandler = null;
    let resizeHandler = null;

    const DIGIT_STEP_DELAY = 200;

    /* ==========================================================
       ACCESSIBILITY
    ========================================================== */
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ==========================================================
       DEFAULTS (ROLLER ONLY)
    ========================================================== */
    const defaults = {
      from: 0,
      once: false,
      repeat: "both",
      duration: 1200,
      trigger: "top 90%",
    };

    const cfg = {
      ...defaults,
      ...(userOptions.roller || {}),
    };

    /* ==========================================================
       HELPERS
    ========================================================== */
    function parseTrigger(str) {
      if (!str) return { elementAnchor: "top", viewportAnchor: 90 };

      const parts = String(str).trim().toLowerCase().split(/\s+/);
      const map = { top: 0, center: 50, bottom: 100 };

      return {
        elementAnchor: parts[0] || "top",
        viewportAnchor: parts[1]?.endsWith("%")
          ? parseInt(parts[1], 10)
          : map[parts[1]] ?? 90,
      };
    }

    function getAnchor(rect, anchor) {
      if (anchor === "center") return rect.top + rect.height / 2;
      if (anchor === "bottom") return rect.bottom;
      return rect.top;
    }

    function extractDigits(str) {
      return String(str || "").replace(/[^\d]/g, "");
    }

    function toNumberSafe(str) {
      const d = extractDigits(str);
      return d ? parseInt(d, 10) : 0;
    }

    function digitLen(n) {
      const s = String(Math.abs(n));
      return s.length || 1;
    }

    /* ==========================================================
       DOM BUILD
    ========================================================== */
    function buildRoller(el, totalDigits) {
      const wrapper = document.createElement("span");
      wrapper.className = "mf-roller";

      for (let i = 0; i < totalDigits; i++) {
        const digit = document.createElement("span");
        digit.className = "mf-roller-digit";
        digit.style.display = "inline-block";
        digit.style.overflow = "hidden";

        const inner = document.createElement("span");
        inner.className = "mf-roller-digit-inner";
        inner.style.display = "block";
        inner.style.willChange = "transform";

        for (let d = 0; d <= 9; d++) {
          const line = document.createElement("span");
          line.textContent = d;
          line.style.display = "block";
          inner.appendChild(line);
        }

        digit.appendChild(inner);
        wrapper.appendChild(digit);
      }

      el.innerHTML = "";
      el.appendChild(wrapper);
    }

    function setVisibleDigits(el, totalDigits, visibleDigits) {
      const digits = el.querySelectorAll(".mf-roller-digit");
      const hideCount = Math.max(0, totalDigits - visibleDigits);

      digits.forEach((digitEl, idx) => {
        if (idx < hideCount) {
          digitEl.style.width = "0";
          digitEl.style.opacity = "0";
        } else {
          digitEl.style.width = "";
          digitEl.style.opacity = "";
        }
      });
    }

    function setValue(el, value, totalDigits, visibleDigits, immediate = false) {
      const inners = el.querySelectorAll(".mf-roller-digit-inner");
      const startIndex = Math.max(0, totalDigits - visibleDigits);

      let s = String(Math.abs(value));
      if (s.length > visibleDigits) s = s.slice(-visibleDigits);
      else s = s.padStart(visibleDigits, "0");

      for (let i = 0; i < visibleDigits; i++) {
        const inner = inners[startIndex + i];
        if (!inner) continue;

        const n = parseInt(s[i], 10);

        if (immediate) {
          inner.style.transition = "none";
          inner.style.transform = `translateY(-${n * 10}%)`;
          inner.offsetHeight;
          inner.style.transition = "";
        } else {
          inner.style.transform = `translateY(-${n * 10}%)`;
        }
      }
    }

    /* ==========================================================
       ANIMATION
    ========================================================== */
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function stopItem(item) {
      item.animating = false;
      if (item.rafId) cancelAnimationFrame(item.rafId);
      if (item.digitTimer) clearInterval(item.digitTimer);
      item.rafId = null;
      item.digitTimer = null;
      item.startTime = null;
    }

    function animate(item) {
      if (item.animating) return;

      stopItem(item);
      item.animating = true;

      let currentVisible = item.initialDigits;
      const targetVisible = item.targetDigits;
      let lastValue = item.from;

      if (reduceMotion) {
        setVisibleDigits(item.el, item.totalDigits, targetVisible);
        setValue(item.el, item.to, item.totalDigits, targetVisible, true);
        item.animating = false;
        return;
      }

      if (currentVisible !== targetVisible) {
        item.digitTimer = setInterval(() => {
          currentVisible += currentVisible < targetVisible ? 1 : -1;
          setVisibleDigits(item.el, item.totalDigits, currentVisible);
          setValue(item.el, lastValue, item.totalDigits, currentVisible, true);

          if (currentVisible === targetVisible) {
            clearInterval(item.digitTimer);
            item.digitTimer = null;
          }
        }, DIGIT_STEP_DELAY);
      }

      function step(ts) {
        if (!item.startTime) item.startTime = ts;

        const p = Math.min((ts - item.startTime) / item.duration, 1);
        const value = Math.round(
          item.from + (item.to - item.from) * easeOutCubic(p)
        );

        lastValue = value;
        setValue(item.el, value, item.totalDigits, currentVisible);

        if (p < 1) {
          item.rafId = requestAnimationFrame(step);
        } else {
          stopItem(item);
          setVisibleDigits(item.el, item.totalDigits, targetVisible);
          setValue(item.el, item.to, item.totalDigits, targetVisible, true);
        }
      }

      item.rafId = requestAnimationFrame(step);
    }

    /* ==========================================================
       UPDATE
    ========================================================== */
    function update() {
      const vh = window.innerHeight;

      items.forEach(item => {
        const rect = item.el.getBoundingClientRect();
        const elementPos = getAnchor(rect, item.trigger.elementAnchor);
        const viewportPos = (vh * item.trigger.viewportAnchor) / 100;

        const visible = elementPos < viewportPos && rect.bottom > 0;
        const above = rect.bottom <= 0;
        const below = rect.top >= vh;

        if (visible && !item.started) {
          item.started = true;
          animate(item);
        }

        if (!item.once && item.started) {
          const reset =
            (item.repeat === "top" && above) ||
            (item.repeat === "bottom" && below) ||
            (item.repeat === "both" && (above || below));

          if (reset) {
            item.started = false;
            stopItem(item);
            setVisibleDigits(item.el, item.totalDigits, item.initialDigits);
            setValue(item.el, item.from, item.totalDigits, item.initialDigits, true);
          }
        }
      });

      ticking = false;
    }

    /* ==========================================================
       LIFECYCLE (IDEMPOTENT)
    ========================================================== */
    function init() {
      if (initialized) {
        destroy(false);
      }

      initialized = true;
      items = [];

      document.querySelectorAll("[data-mf-roller-to]").forEach(el => {
        const raw = el.getAttribute("data-mf-roller-to");
        if (!raw) return;

        const target = toNumberSafe(raw);
        const fromRaw = el.dataset.mfRollerFrom;
        const from =
          fromRaw !== undefined
            ? toNumberSafe(fromRaw)
            : cfg.from ?? 0;


        const targetDigits = digitLen(target);
        const fromDigits = digitLen(from);
        const totalDigits = Math.max(fromDigits, targetDigits);

        buildRoller(el, totalDigits);
        setVisibleDigits(el, totalDigits, fromDigits);
        setValue(el, from, totalDigits, fromDigits, true);

        items.push({
          el,
          from,
          to: target,
          duration: Number(el.dataset.mfRollerDuration ?? cfg.duration),
          trigger: parseTrigger(el.dataset.mfRollerTrigger ?? cfg.trigger),
          once:
            el.dataset.mfRollerOnce !== undefined
              ? el.dataset.mfRollerOnce === "true" ||
                el.dataset.mfRollerOnce === ""
              : cfg.once,
          repeat: String(el.dataset.mfRollerRepeat ?? cfg.repeat).toLowerCase(),
          initialDigits: fromDigits,
          targetDigits,
          totalDigits,
          started: false,
          animating: false,
          startTime: null,
          rafId: null,
          digitTimer: null,
        });
      });

      if (!items.length) return;

      update();

      scrollHandler = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      };

      resizeHandler = scrollHandler;

      window.addEventListener("scroll", scrollHandler, { passive: true });
      window.addEventListener("resize", resizeHandler);
    }

    function refresh() {
      update();
    }

    function destroy(reset = true) {
      initialized = false;

      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", resizeHandler);

      items.forEach(item => {
        stopItem(item);
        if (reset) {
          item.el.innerHTML = "";
          item.el.textContent = String(item.from);
        }
      });

      items = [];
      ticking = false;
    }

    init();
    return { init, refresh, destroy };
  }

  // src/core/ticker.js

  function MotionFlowTicker(userOptions = {}) {
    // -----------------------------------------------------
    // Reduced motion: no-op API
    // -----------------------------------------------------
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return { refresh() {}, destroy() {}, pause() {}, play() {}, toggle() {} };
    }

    /* =====================================================
       DEFAULTS
    ====================================================== */
    const defaults = {
      speed: 80,
      direction: "left",
      pause: false,
      pauseOnHover: false,
      pauseOnVisibilityChange: true
    };

    // -----------------------------------------------------
    // ✅ Idempotent singleton (so calling MotionFlow.init()
    // multiple times won’t break ticker)
    // -----------------------------------------------------
    const SINGLETON_KEY = "__MF_TICKER_SINGLETON__";
    const existing = window[SINGLETON_KEY];

    // If a ticker singleton already exists, just update options + rebuild safely
    if (existing && existing.__isTickerSingleton) {
      existing.updateOptions(userOptions);
      // Important: re-scan DOM in case init happened in document.ready
      existing.refresh();
      return existing.api;
    }

    /* =====================================================
       INTERNAL STATE
    ====================================================== */
    let instances = [];

    // global config (can be updated)
    let globalCfg = {
      ...defaults,
      ...(userOptions.ticker || {})
    };

    /* =====================================================
       ONE-TIME REFRESH GUARDS
    ====================================================== */
    let fontRefreshDone = false;
    const imageRefreshDone = new WeakSet();

    const dpr = window.devicePixelRatio || 1;
    const MAX_FILL_CYCLES = 60;

    const isHorizontal = d => d === "left" || d === "right";
    const isPositive = d => d === "right" || d === "down";
    const clampDt = dt => Math.min(dt, 0.05);

    function normalizeDirection(dir, fallback) {
      const d = String(dir || "").toLowerCase();
      return ["left", "right", "up", "down"].includes(d) ? d : fallback;
    }

    /* =====================================================
       INTERNAL REBUILD (SAFE + IDEMPOTENT)
    ====================================================== */
    function rebuildTickers() {
      const pausedMap = new Map();

      instances.forEach(inst => {
        pausedMap.set(inst.container, inst.isPaused());
        inst.cancel();
        // Allow re-setup
        inst.container.__mfTickerInited = false;
      });

      instances = [];

      document.querySelectorAll("[data-mf-ticker]").forEach(setupTicker);

      // Restore paused state
      instances.forEach(inst => {
        if (pausedMap.get(inst.container)) {
          inst.setPaused(true);
        }
      });
    }

    /* =====================================================
       FONT READY REFRESH (ONCE)
    ====================================================== */
    function scheduleFontRefresh() {
      if (fontRefreshDone || !document.fonts || !document.fonts.ready) return;

      document.fonts.ready.then(() => {
        if (fontRefreshDone) return;
        fontRefreshDone = true;
        rebuildTickers();
      });
    }

    /* =====================================================
       IMAGE READY REFRESH (PER TICKER)
    ====================================================== */
    function scheduleImageRefresh(container) {
      if (imageRefreshDone.has(container)) return;

      const images = Array.from(container.querySelectorAll("img"));
      if (!images.length) return;

      Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
              })
        )
      ).then(() => {
        imageRefreshDone.add(container);
        rebuildTickers();
      });
    }

    /* =====================================================
       ✅ Mutation Observer (optional, but fixes dynamic show/hide)
       - Debounced so it won’t spam rebuild
    ====================================================== */
    let mo = null;
    let moTimer = null;

    function startObserver() {
      if (mo) return;

      const schedule = () => {
        clearTimeout(moTimer);
        moTimer = setTimeout(() => {
          // Re-scan tickers after DOM changes
          rebuildTickers();
        }, 80);
      };

      mo = new MutationObserver(mutations => {
        // Only react when ticker-related nodes/attrs are involved
        for (const m of mutations) {
          if (m.type === "attributes") {
            if (m.attributeName && m.attributeName.startsWith("data-mf-ticker")) {
              schedule();
              return;
            }
          }
          if (m.type === "childList") {
            // If any added/removed nodes contain tickers
            const nodes = [...m.addedNodes, ...m.removedNodes];
            for (const n of nodes) {
              if (n && n.nodeType === 1) {
                if (
                  n.matches?.("[data-mf-ticker]") ||
                  n.querySelector?.("[data-mf-ticker]")
                ) {
                  schedule();
                  return;
                }
              }
            }
          }
        }
      });

      mo.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true
        // Note: attributeFilter not used so direction/speed changes also trigger
      });
    }

    function stopObserver() {
      clearTimeout(moTimer);
      moTimer = null;
      mo?.disconnect();
      mo = null;
    }

    /* =====================================================
       INIT (IDEMPOTENT)
    ====================================================== */
    function init() {
      // Safe to call multiple times
      rebuildTickers();
      scheduleFontRefresh();
      startObserver();
    }

    /* =====================================================
       SETUP SINGLE TICKER
    ====================================================== */
    function setupTicker(container) {
      if (container.__mfTickerInited) return;

      // Mark as "in progress" (prevents double-run)
      container.__mfTickerInited = true;

      // Helper: if we can't build (hidden / 0 width), allow retry later
      const fail = () => {
        container.__mfTickerInited = false;
      };

      if (!container.__mfTickerOriginalNodes) {
        container.__mfTickerOriginalNodes = Array.from(container.children);
      }

      const originalNodes = container.__mfTickerOriginalNodes;
      if (!originalNodes.length) {
        fail();
        return;
      }

      scheduleImageRefresh(container);

      const direction = normalizeDirection(
        container.dataset.mfTickerDirection || globalCfg.direction,
        defaults.direction
      );

      let pauseOnVisibilityChange = globalCfg.pauseOnVisibilityChange;
      if (container.dataset.mfTickerPauseOnVisibility === "false") pauseOnVisibilityChange = false;
      if (container.dataset.mfTickerPauseOnVisibility === "true") pauseOnVisibilityChange = true;

      const cfg = {
        speed: Number(container.dataset.mfTickerSpeed) || globalCfg.speed,
        direction,
        pause: globalCfg.pause === true,
        pauseOnHover:
          globalCfg.pause !== true &&
          (
            container.dataset.mfTickerPauseOnHover === "true" ||
            globalCfg.pauseOnHover === true
          ),
        pauseOnVisibilityChange
      };

      const horizontal = isHorizontal(cfg.direction);
      const positiveDir = isPositive(cfg.direction);

      /* -----------------------------
         STRUCTURE
      ----------------------------- */
      const viewport = document.createElement("div");
      const track = document.createElement("div");

      viewport.className = "mf-ticker-viewport";
      track.className = "mf-ticker-track";

      container.innerHTML = "";
      container.appendChild(viewport);
      viewport.appendChild(track);

   
      if (!horizontal) track.style.flexDirection = "column";

      const content = document.createElement("div");
      content.className = "mf-ticker-content"; 
      if (!horizontal) content.style.flexDirection = "column";

      originalNodes.forEach(n => content.appendChild(n));
      track.appendChild(content);

      const measureContent = () => {
        const r = content.getBoundingClientRect();
        return horizontal ? r.width : r.height;
      };

      // ✅ IMPORTANT: if hidden (accordion closed), width/height can be 0
      let baseUnit = measureContent();
      if (!baseUnit) {
        // Allow a retry on next refresh (or after it becomes visible)
        fail();
        return;
      }

      const viewportSize =
        viewport.getBoundingClientRect()[horizontal ? "width" : "height"];

      // If viewport itself is 0 (still hidden), also allow retry
      if (!viewportSize) {
        fail();
        return;
      }

      let filledSize = baseUnit;
      let cycles = 0;

      while (filledSize < viewportSize + baseUnit && cycles < MAX_FILL_CYCLES) {
        originalNodes.forEach(n => content.appendChild(n.cloneNode(true)));
        filledSize = measureContent();
        cycles++;
      }

      const loopSize = measureContent();
      track.appendChild(content.cloneNode(true));

      let pos = positiveDir ? -loopSize : 0;

      /* -----------------------------
         PAUSE STATES
      ----------------------------- */
      let pausedByUser = cfg.pause;
      let pausedByHover = false;
      let pausedByVisibility = false;

      const isPaused = () =>
        pausedByUser || pausedByHover || pausedByVisibility;

      function updatePausedClass() {
        container.classList.toggle("mf-ticker-paused", isPaused());
      }

      let lastT = performance.now();
      let rafId = null;

      function applyTransform(x) {
        const snapped = Math.round(x * dpr) / dpr;
        track.style.transform = horizontal
          ? `translate3d(${snapped}px,0,0)`
          : `translate3d(0,${snapped}px,0)`;
      }

      applyTransform(pos);
      updatePausedClass();

      /* -----------------------------
         HOVER PAUSE
      ----------------------------- */
      const CAN_HOVER = window.matchMedia("(hover: hover)").matches;

      const onEnter = () => {
        if (!pausedByUser && !pausedByVisibility) {
          pausedByHover = true;
          updatePausedClass();
        }
      };

      const onLeave = () => {
        pausedByHover = false;
        updatePausedClass();
      };

      if (cfg.pauseOnHover && CAN_HOVER) {
        viewport.addEventListener("mouseenter", onEnter);
        viewport.addEventListener("mouseleave", onLeave);
      }

      /* -----------------------------
         VISIBILITY PAUSE
      ----------------------------- */
      function onVisibilityChange() {
        pausedByVisibility = document.hidden === true;
        lastT = performance.now();
        updatePausedClass();
      }

      if (cfg.pauseOnVisibilityChange) {
        document.addEventListener("visibilitychange", onVisibilityChange);
      }

      /* -----------------------------
         RAF LOOP
      ----------------------------- */
      function animate(now) {
        const dt = clampDt((now - lastT) / 1000);
        lastT = now;

        if (!isPaused()) {
          const delta = cfg.speed * dt;
          pos += positiveDir ? delta : -delta;

          if (!positiveDir && pos <= -loopSize) pos += loopSize;
          if (positiveDir && pos >= 0) pos -= loopSize;

          applyTransform(pos);
        }

        rafId = requestAnimationFrame(animate);
      }

      rafId = requestAnimationFrame(animate);

      instances.push({
        container,
        setPaused(v) {
          pausedByUser = v;
          updatePausedClass();
        },
        isPaused,
        cancel() {
          cancelAnimationFrame(rafId);
          if (cfg.pauseOnVisibilityChange) {
            document.removeEventListener("visibilitychange", onVisibilityChange);
          }
        }
      });
    }


    /* =====================================================
       INSTANCE SELECTOR
    ====================================================== */
    function getInstances(target) {
      if (!target) return instances;
      const nodes = Array.from(document.querySelectorAll(target));
      return instances.filter(inst => nodes.includes(inst.container));
    }

    /* =====================================================
       PUBLIC API
    ====================================================== */
    function pause(target = null) {
      getInstances(target).forEach(inst => inst.setPaused(true));
    }

    function play(target = null) {
      getInstances(target).forEach(inst => inst.setPaused(false));
    }

    function toggle(target = null) {
      getInstances(target).forEach(inst => inst.setPaused(!inst.isPaused()));
    }

    function refresh() {
      rebuildTickers();
    }

    function destroy() {
      stopObserver();
      instances.forEach(inst => inst.cancel());
      instances = [];

      // allow future init without stale flags
      document.querySelectorAll("[data-mf-ticker]").forEach(el => {
        el.__mfTickerInited = false;
      });

      // reset guards so a fresh init behaves correctly
      fontRefreshDone = false;

      // remove singleton so a future call can recreate fully
      try {
        delete window[SINGLETON_KEY];
      } catch (_) {
        window[SINGLETON_KEY] = null;
      }
    }

    // ✅ allow updating options when MotionFlowTicker is called again
    function updateOptions(nextUserOptions = {}) {
      globalCfg = {
        ...defaults,
        ...(nextUserOptions.ticker || {})
      };
    }

    const api = { refresh, destroy, pause, play, toggle };

    // store singleton
    window[SINGLETON_KEY] = {
      __isTickerSingleton: true,
      api,
      refresh,
      updateOptions
    };

    // run once (safe)
    init();

    return api;
  }

  // src/core/text.js

  /* =====================================================
     MotionFlow Text
  ===================================================== */

  /* -----------------------------
     Utils
  ----------------------------- */
  function toBool(val, fallback = false) {
    if (val === undefined || val === null || val === "") return fallback;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  }

  function num(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  /* =====================================================
     ACCESSIBILITY
  ===================================================== */
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* =====================================================
     INTERNAL STATE
  ===================================================== */
  const textInstances = new Set();
  let lastOptions = {};
  let isInitialized$1 = false;

  /* =====================================================
     LOOP TEXT
  ===================================================== */
  function initLoop(el, cfg = {}) {
    const children = Array.from(el.children).filter(
      c => c.textContent.trim().length
    );
    if (!children.length) return null;

    // Reduced motion → show first item only
    if (reduceMotion) {
      children.forEach((c, i) => {
        c.style.display = i === 0 ? "" : "none";
      });
      return { destroy() {} };
    }

    const interval = num(
      el.dataset.mfTextLoopInterval,
      cfg.interval ?? 2000
    );

    const animation =
      el.dataset.mfTextLoopAnimation ??
      cfg.animation ??
      "fade-up";

    const duration = num(
      el.dataset.mfTextLoopDuration,
      cfg.duration ?? 500
    );

    const easingName =
      el.dataset.mfTextLoopEasing ??
      cfg.easing ??
      "ease";

    const easing = MF_EASINGS[easingName] || easingName;

    const loopDistance =
      el.dataset.mfTextLoopDistance ??
      cfg.distance ??
      40;
    

    let index = 0;
    let timer = null;

    children.forEach((child, i) => {
      child.style.whiteSpace = "nowrap";
      child.style.display = i === 0 ? "inline-block" : "none";

      child.setAttribute("data-mf-animation", animation);
      child.style.setProperty("--mf-duration", duration + "ms");
      child.style.setProperty("--mf-easing", easing);

      if (loopDistance != null) {
        child.style.setProperty("--mf-distance", loopDistance + "px");
      }

      child.classList.remove("mf-animate");
    });

    requestAnimationFrame(() => {
      children[0].classList.add("mf-animate");
    });

    function showNext() {
      const current = children[index];
      current.classList.remove("mf-animate");
      current.style.display = "none";

      index = (index + 1) % children.length;
      const next = children[index];

      next.style.display = "inline-block";
      next.style.transition = "none";
      next.classList.remove("mf-animate");
      void next.offsetHeight;
      next.style.transition = "";
      next.classList.add("mf-animate");
    }

    timer = setInterval(showNext, interval);

    return {
      destroy() {
        clearInterval(timer);
        children.forEach(child => {
          child.style.display = "";
          child.style.whiteSpace = "";
          child.classList.remove("mf-animate");
          child.style.removeProperty("--mf-duration");
          child.style.removeProperty("--mf-easing");
          child.style.removeProperty("--mf-distance");
          child.removeAttribute("data-mf-animation");
        });
      }
    };
  }

  /* =====================================================
     TYPING TEXT
  ===================================================== */
  function initTyping(el, cfg = {}) {
    const originalHTML = el.innerHTML;

    const items = Array.from(el.children)
      .map(c => c.textContent.trim())
      .filter(Boolean);

    if (!items.length) return null;

    if (reduceMotion) {
      el.textContent = items[0];
      return { destroy() { el.innerHTML = originalHTML; } };
    }

    const typeSpeed = num(
      el.dataset.mfTextTypingSpeed,
      cfg.speed ?? 80
    );

    const deleteSpeed = num(
      el.dataset.mfTextTypingDeleteSpeed,
      cfg.deleteSpeed ?? 40
    );

    const interval = num(
      el.dataset.mfTextTypingInterval,
      cfg.interval ?? 1200
    );

    const loop = toBool(
      el.dataset.mfTextTypingLoop,
      cfg.loop ?? true
    );

    const showCursor = toBool(
      el.dataset.mfTextTypingCursor,
      cfg.cursor ?? true
    );

    const cursorChar =
      el.dataset.mfTextTypingCursorChar ??
      cfg.cursorChar ??
      "|";

    const blinkCursor = toBool(
      el.dataset.mfTextTypingCursorBlink,
      cfg.cursorBlink ?? true
    );

    let textIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId = null;

    el.innerHTML = "";

    const sr = document.createElement("span");
    sr.className = "mf-sr-only";
    sr.setAttribute("aria-live", "polite");
    sr.setAttribute("aria-atomic", "true");
    sr.textContent = items[0];

    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");

    const textNode = document.createTextNode("");
    visual.appendChild(textNode);

    let cursorEl = null;

    if (showCursor) {
      cursorEl = document.createElement("span");
      cursorEl.className = "mf-typing-cursor";
      cursorEl.textContent = cursorChar;
      cursorEl.setAttribute("aria-hidden", "true");

      if (!blinkCursor) {
        cursorEl.classList.add("mf-typing-cursor-static");
      }

      visual.appendChild(cursorEl);
    }

    el.appendChild(sr);
    el.appendChild(visual);

    function tick() {
      const current = items[textIndex];

      if (!deleting) {
        charIndex++;
        textNode.textContent = current.slice(0, charIndex);

        if (charIndex === current.length) {
          sr.textContent = current;

          if (!loop && textIndex === items.length - 1) {
            if (cursorEl) cursorEl.style.display = "none";
            return;
          }

          timeoutId = setTimeout(() => {
            deleting = true;
            tick();
          }, interval);
          return;
        }
      } else {
        charIndex--;
        textNode.textContent = current.slice(0, charIndex);

        if (charIndex === 0) {
          deleting = false;
          textIndex++;
          if (!loop && textIndex >= items.length) return;
          textIndex %= items.length;
        }
      }

      timeoutId = setTimeout(
        tick,
        deleting ? deleteSpeed : typeSpeed
      );
    }

    tick();

    return {
      destroy() {
        clearTimeout(timeoutId);
        el.innerHTML = originalHTML;
      }
    };
  }

  /* =====================================================
     MAIN INIT
  ===================================================== */
  function MotionFlowText(options = {}) {
    lastOptions = options;

    if (isInitialized$1) {
      destroy();
    }

    isInitialized$1 = true;

    const loopCfg   = options.loop   || {};
    const typingCfg = options.typing || {};

    document.querySelectorAll("[data-mf-text-type]").forEach(el => {
      if (el.__mfTextInited) return;
      el.__mfTextInited = true;

      let instance = null;

      if (el.dataset.mfTextType === "loop") {
        instance = initLoop(el, loopCfg);
      }

      if (el.dataset.mfTextType === "typing") {
        instance = initTyping(el, typingCfg);
      }

      if (instance) {
        textInstances.add({ el, instance });
      }
    });

    return { refresh, destroy };
  }

  /* =====================================================
     LIFECYCLE
  ===================================================== */
  function refresh() {
    MotionFlowText(lastOptions);
  }

  function destroy() {
    textInstances.forEach(({ el, instance }) => {
      instance.destroy?.();
      delete el.__mfTextInited;
    });
    textInstances.clear();
    isInitialized$1 = false;
  }

  /* =====================================================
     INTERNAL INSTANCES
  ===================================================== */
  let engineInstance   = null;
  let parallaxInstance = null;
  let countInstance    = null;
  let rollerInstance   = null;
  let tickerInstance   = null;
  let textInstance     = null;

  /* =====================================================
     INIT STATE
  ===================================================== */
  let isInitialized = false;
  let autoInitDone = false;
  let manualInitCalled = false;
  let lastInitOptions = {};

  /* =====================================================
     INTERNAL DESTROY
  ===================================================== */
  function destroyInstances({ destroyTicker = false } = {}) {
    engineInstance?.destroy?.();
    parallaxInstance?.destroy?.();
    countInstance?.destroy?.();
    rollerInstance?.destroy?.();
    textInstance?.destroy?.();

    if (destroyTicker) {
      tickerInstance?.destroy?.();
      tickerInstance = null;
    }

    engineInstance   = null;
    parallaxInstance = null;
    countInstance    = null;
    rollerInstance   = null;
    textInstance     = null;
  }

  /* =====================================================
     INIT (IDEMPOTENT, SILENT)
  ===================================================== */
  function init(options = {}) {
    manualInitCalled = true;
    lastInitOptions = options;

    if (isInitialized) {
      destroyInstances({ destroyTicker: false });
    }

    /* -----------------------------
       TEXT
    ----------------------------- */
    textInstance = MotionFlowText(
      options.text === true ? {} : options.text || {}
    );

    /* -----------------------------
       SCROLL ENGINE
    ----------------------------- */
    engineInstance = MotionFlowEngine(options);

    /* -----------------------------
       SCROLL-BASED FEATURES
    ----------------------------- */
    parallaxInstance = MotionFlowParallax(options);
    countInstance    = MotionFlowCount(options);
    rollerInstance   = MotionFlowRoller(options);

    /* -----------------------------
       CONTINUOUS FEATURES
    ----------------------------- */
    tickerInstance = MotionFlowTicker(options);

    isInitialized = true;
    return MotionFlow;
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */
  const MotionFlow = {
    init,

    destroy() {
      destroyInstances({ destroyTicker: true });
      isInitialized = false;
    },

    /* ===============================================
       SCROLL
    =============================================== */
    scroll: {
      init() {
        if (!engineInstance) {
          engineInstance = MotionFlowEngine(lastInitOptions);
        }
      },
      refresh() {
        engineInstance?.refresh?.();
      },
      destroy() {
        engineInstance?.destroy?.();
        engineInstance = null;
      }
    },

    /* ===============================================
       PARALLAX
    =============================================== */
    parallax: {
      init() {
        if (!parallaxInstance) {
          parallaxInstance = MotionFlowParallax(lastInitOptions);
        }
      },
      refresh() {
        parallaxInstance?.refresh?.();
      },
      destroy() {
        parallaxInstance?.destroy?.();
        parallaxInstance = null;
      }
    },

    /* ===============================================
       COUNT
    =============================================== */
    count: {
      init() {
        if (!countInstance) {
          countInstance = MotionFlowCount(lastInitOptions);
        }
      },
      refresh() {
        countInstance?.refresh?.();
      },
      destroy() {
        countInstance?.destroy?.();
        countInstance = null;
      }
    },

    /* ===============================================
       ROLLER
    =============================================== */
    roller: {
      init() {
        if (!rollerInstance) {
          rollerInstance = MotionFlowRoller(lastInitOptions);
        }
      },
      refresh() {
        rollerInstance?.refresh?.();
      },
      destroy() {
        rollerInstance?.destroy?.();
        rollerInstance = null;
      }
    },

    /* ===============================================
       TICKER
    =============================================== */
    ticker: {
      init() {
        if (!tickerInstance) {
          tickerInstance = MotionFlowTicker(lastInitOptions);
        }
      },
      refresh() {
        tickerInstance?.refresh?.();
      },
      pause(target = null) {
        tickerInstance?.pause?.(target);
      },
      play(target = null) {
        tickerInstance?.play?.(target);
      },
      toggle(target = null) {
        tickerInstance?.toggle?.(target);
      },
      destroy() {
        tickerInstance?.destroy?.();
        tickerInstance = null;
      }
    },

    /* ===============================================
       TEXT
    =============================================== */
    text: {
      init() {
        if (!textInstance) {
          textInstance = MotionFlowText(
            lastInitOptions.text === true
              ? {}
              : lastInitOptions.text || {}
          );
        }
      },
      refresh() {
        textInstance?.refresh?.();
      },
      destroy() {
        textInstance?.destroy?.();
        textInstance = null;
      }
    }
  };

  /* =====================================================
     AUTO INIT (SAFE + CONFIG-FRIENDLY)
  ===================================================== */
  if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      if (manualInitCalled || autoInitDone) return;

      autoInitDone = true;
      MotionFlow.init();
    });
  }

  return MotionFlow;

}));
//# sourceMappingURL=motionflow.js.map
