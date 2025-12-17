
// Imports =========================================================================================

import { API_KEY } from "/js/env.js";

// Variables =======================================================================================

const CACHE_LIFE = 5 * 60000; // minutes -> ms
const PROP_NULL = { time: null, data: null };
const CACHE_NULL = { curr: PROP_NULL, fore: PROP_NULL };

let state = {
  pos: { lat: 0, lon: 0, },
  cache: {
    curr: { time: 0, data: {}, },
    fore: { time: 0, data: {}, },
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
  let curr = null;
  let fore = null;
  state.cache = state.cache ?? CACHE_NULL;

  console.log("1");
  console.log(state.cache.curr);
  console.log(state.cache.fore);

  // await wrapper("curr");
  // await wrapper("fore");

  // console.log("2");
  // console.log(state.cache.curr);
  // console.log(state.cache.fore);

  // state.cache = null;
  // lsSet("state", state); // * SAVE STATE
  // return;

  if (state.cache.curr.time <= exp) {
    console.log("curr fetch");
    state.cache.curr.time = now;
    curr = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json());
  } else {
    console.log("curr cache");
    curr = state.cache.curr.data;
  }

  if (state.cache.fore.time <= exp) {
    console.log("fore fetch");
    state.cache.fore.time = now;
    fore = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json());
  } else {
    console.log("fore cache");
    fore = state.cache.fore.data;
  }

  state.cache.curr.data = curr;
  state.cache.fore.data = fore;

  console.log("2");
  console.log(state.cache.curr);
  console.log(state.cache.fore);

  // state.cache = null;

  lsSet("state", state); // * SAVE STATE
}

async function wrapper(key) {
  const now = Date.now();
  const exp = now - CACHE_LIFE;
  const { lat, lon } = state.pos ?? { lat: 38.0, lon: -121.0 };

  let cache = state.cache ?? CACHE_NULL;
  let tmp = cache[key];

  let api = "";
  if (key === "curr") { api = "weather"; }
  if (key === "fore") { api = "forecast"; }

  if (tmp.time <= exp) {
    console.log("FETCH");
    tmp.time = now;
    tmp.data = await fetch(`https://api.openweathermap.org/data/2.5/${api}?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json());

    cache[key] = tmp;
    state.cache = cache;

    // state.cache = null;

    lsSet("state", state); // * SAVE STATE
  } else {
    console.log("CACHE");
  }
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
