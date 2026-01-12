# MotionFlow

<p align="center">
  <a href="https://motionflow.dev">
    <img src="https://motionflow.dev/og-images/motionflow.png" alt="MotionFlow" width="600" />
  </a>
</p>

<p align="center">
  <strong>Lightweight JavaScript library for modern web motion</strong><br/>
  Scroll animations, parallax, text effects, counters, and tickers — powered by simple HTML attributes.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@slicemypage/motionflow">
    <img src="https://img.shields.io/npm/v/@slicemypage/motionflow.svg" alt="npm version" />
  </a>
  <a href="https://github.com/slicemypage/motionflow/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/slicemypage/motionflow.svg" alt="license" />
  </a>
  <a href="https://motionflow.dev">
    <img src="https://img.shields.io/badge/docs-motionflow.dev-brightgreen" alt="docs" />
  </a>
</p>

---

## ✨ What is MotionFlow?

**MotionFlow** is a free, attribute-first JavaScript animation library designed for modern UI motion.

It brings **scroll animations, parallax effects, text animations, counters, and tickers** to life using simple HTML attributes — with **no heavy JavaScript setup required**.

---

## ✨ Features

- Scroll-based animations  
- Parallax effects  
- Text animations (typing, looping, effects)  
- Counters & rollers  
- Infinite tickers  
- Attribute-first API  
- No dependencies  
- Framework-agnostic  
- Respects `prefers-reduced-motion`

---

## 🔗 Links

- 🌐 Website: https://motionflow.dev  
- 📘 Documentation: https://motionflow.dev/docs  
- 🚀 Demos: https://motionflow.dev/demos  
- 📝 Changelog: https://motionflow.dev/changelog  

---

## 📦 Installation

### Option 1: CDN (fastest way)

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@slicemypage/motionflow@latest/dist/motionflow.min.css"
/>

<script src="https://cdn.jsdelivr.net/npm/@slicemypage/motionflow@latest/dist/motionflow.min.js"></script>
```

MotionFlow auto-initializes on page load.

---

### Option 2: npm / yarn

```bash
npm install @slicemypage/motionflow
```

or

```bash
yarn add @slicemypage/motionflow
```

```js
import "@slicemypage/motionflow/dist/motionflow.min.css";
import MotionFlow from "@slicemypage/motionflow";

MotionFlow.init();
```

---

### Option 3: Manual download

Download the latest build and include it directly:

👉 https://motionflow.dev/downloads

Best for **WordPress**, **static HTML**, and **CMS-based projects**.

---

## 🚀 Basic usage

MotionFlow reads `data-mf-*` attributes and applies motion automatically.

```html
<!-- Scroll animation -->
<div data-mf-animation="fade-up">
  Scroll animation
</div>

<!-- Parallax -->
<div data-mf-parallax>
  Parallax movement
</div>

<!-- Text animation -->
<div data-mf-text-type="loop">
  <span>fast</span>
  <span>smooth</span>
  <span>lightweight</span>
</div>

<!-- Counter -->
<div data-mf-count-to="80"></div>

<!-- Ticker -->
<div data-mf-ticker>
  <span>fast</span>
  <span>smooth</span>
  <span>lightweight</span>
</div>
```

👉 View full examples and options:  
https://motionflow.dev/docs/installation

---

## ⚙️ Global configuration (optional)

MotionFlow works out of the box without configuration.  
Use global config only to define shared defaults:

```js
MotionFlow.init({
  animation: {
    duration: 600,
    distance: 100,
    once: false,
  },
  parallax: {
    speed: 1,
  },
  text: {
    loop: {
      animation: "fade-up",
    },
  },
  count: {
    duration: 1200,
  },
  ticker: {
    speed: 80,
  },
});
```

All options can still be overridden per element using attributes.

---

## 🧩 Works with

- Vanilla JavaScript  
- Next.js / React  
- Vue  
- WordPress  
- Any HTML-based project  

---

## ☕ Support MotionFlow

If you find MotionFlow useful, consider supporting its development:

👉 https://www.buymeacoffee.com/iamdeepak89

---

## 📄 License

MIT License © Deepak Verma
