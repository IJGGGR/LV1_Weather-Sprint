
// Imports =========================================================================================

import { API_KEY } from "/js/env.js";

// Variables =======================================================================================

const CACHE_LIFE = 5 * 60000; // minutes -> ms
const CACHE_NULL = { time: null, curr: null, fore: null };

let state = {
  pos: { lat: 0, lon: 0, },
  cache: {
    time: 0,
    curr: {},
    fore: {},
  },
};

state.pos = null;
state.cache = null;

// Main ============================================================================================

main();

async function main() {
  state = lsGet("state", state); // * LOAD STATE

  await updateGeolocation();
  await updateWeather();
}

// Functions =======================================================================================

async function updateGeolocation() {
  try {
    if (!navigator.geolocation) { throw new Error("Your browser does not support geolocation."); }
  } catch (e) {
    console.error(e.message);
    console.info("(CUR) state.pos:", state.pos);
    return;
  }

  try {
    console.info("(OLD) state.pos:", state.pos);
    // force getCurrentPosition's callbacks to sync with await new promise
    await new Promise((pass, fail) => {
      navigator.geolocation.getCurrentPosition(
        (v) => {
          state.pos = { lat: v.coords.latitude, lon: v.coords.longitude };
          pass(v);
        },
        (e) => {
          state.pos = null;
          fail(e);
        }
      );
    });
  } catch (e) {
    console.warn(e.message);
  } finally {
    lsSet("state", state); // * SAVE STATE
    console.info("(NEW) state.pos:", state.pos);
    return;
  }
}

async function updateWeather() {
  const now = Date.now();
  const exp = now - CACHE_LIFE;
  const { lat, lon } = state.pos ?? { lat: 38.0, lon: -121.0 };
  state.cache = state.cache ?? CACHE_NULL;

  console.log("1");
  console.log(state.cache.time);
  console.log(state.cache.curr);
  console.log(state.cache.fore);

  if (state.cache.time <= exp) {
    console.log("FETCH");
    state.cache = {
      time: now,
      curr: await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json()),
      fore: await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json()),
    };
  } else {
    console.log("CACHE");
  }

  console.log("2");
  console.log(state.cache.time);
  console.log(state.cache.curr);
  console.log(state.cache.fore);

  // state.cache = null;
  lsSet("state", state); // * SAVE STATE
}

// function updateScreen() {
//   // todo
// }

// Local Storage ===================================================================================

/**
 * Setting a value into Local Storage.
 * @param {string} key A key.
 * @param {*} val A value.
 * @returns {void}
 */
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/**
 * Getting a value from Local Storage, or return `def`.
 * @template T
 * @param {string} key A key.
 * @param {T} def A value, for a default return.
 * @returns {T} A value.
 */
function lsGet(key, def) {
  return JSON.parse(localStorage.getItem(key)) ?? def;
};
