
// Imports =========================================================================================

import { API_KEY } from "/js/env.js";

// Variables =======================================================================================

const iTxtSearch = document.getElementById("i-txt-search");

const CACHE_LIFE = 5 * 60000; // minutes -> ms
const DEF_CACHE = { time: undefined, curr: undefined, fore: undefined };
const DEF_POS = { lat: undefined, lon: undefined };
const DEF_LOC = { name: undefined, state: undefined, country: undefined };

let state = {
  wish: {
    pos: {
      lat: 0,
      lon: 0,
    },
    loc: {
      name: "",
      state: "",
      country: "",
    },
  },
  geo: {
    pos: {
      lat: 0,
      lon: 0,
    },
    loc: {
      name: "",
      state: "",
      country: "",
    },
  },
  cache: {
    time: 0,
    curr: {},
    fore: {},
  },
};

state.wish.pos = DEF_POS;
state.wish.loc = DEF_LOC;
state.geo.pos = DEF_POS;
state.geo.loc = DEF_LOC;

state.cache = DEF_CACHE;

// Main ============================================================================================

main();

async function main() {
  state = lsGet("state", state); // * LOAD STATE

  await updateGeolocation();
  state.wish = state.geo;
  await updateWeather();
}

iTxtSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    let val = iTxtSearch.value.trim();
    iTxtSearch.value = "";

    if (val !== "") {
      searchLocation(val);
    }
  }
});

// Functions =======================================================================================

async function updateGeolocation() {
  try {
    if (!navigator.geolocation) { throw new Error("Your browser does not support geolocation."); }
  } catch (e) {
    console.error(e.message);
    console.info("(CUR) geo.pos:", state.geo.pos);
    console.info("(CUR) geo.loc:", state.geo.loc);
    return;
  }

  console.info("(OLD) geo.pos:", state.geo.pos);
  console.info("(OLD) geo.loc:", state.geo.loc);

  try {
    const geo = await new Promise((pass, fail) => {
      navigator.geolocation.getCurrentPosition(
        (v) => { pass(v); },
        (e) => { fail(e); }
      );
    });
    state.geo.pos = { lat: geo.coords.latitude, lon: geo.coords.longitude };

    const { lat, lon } = state.geo.pos;
    const [data] = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&appid=${API_KEY}&limit=1`).then(v => v.json());
    state.geo.loc = { name: data.name, state: data.state, country: data.country };
  } catch (e) {
    console.warn(e.message);
    state.geo.pos = DEF_POS;
    state.geo.loc = DEF_LOC;
  }

  console.info("(NEW) geo.pos:", state.geo.pos);
  console.info("(NEW) geo.loc:", state.geo.loc);
  lsSet("state", state); // * SAVE STATE
}

async function searchLocation(str) {
  console.log("SEARCH:", str);
  try {
    const [data] = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${str}&appid=${API_KEY}&limit=1`).then(v => v.json());
    state.wish.pos = { lat: data.lat, lon: data.lon };
    state.wish.loc = { name: data.name, state: data.state, country: data.country };
    state.cache.time = 0; // TODO: fix cache

    lsSet("state", state); // * SAVE STATE
    console.info("wish.pos:", state.wish.pos);
    console.info("wish.loc:", state.wish.loc);
    await updateWeather();
  } catch (e) {
    console.error(e.message);
  }
}

async function updateWeather() {
  const now = Date.now();
  const exp = now - CACHE_LIFE;
  const { lat = 38.0, lon = -121.0 } = state.wish.pos;

  console.info("(OLD) cache.time:", state.cache.time);
  console.info("(OLD) cache.curr:", state.cache.curr);
  console.info("(OLD) cache.fore:", state.cache.fore);

  if ((state.cache.time ?? 0) <= exp) {
    console.info("FETCH");
    state.cache = {
      time: now,
      curr: await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json()),
      fore: await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en`).then(v => v.json()),
    };
  } else {
    console.info("CACHE");
  }

  console.info("(NEW) cache.time:", state.cache.time);
  console.info("(NEW) cache.curr:", state.cache.curr);
  console.info("(NEW) cache.fore:", state.cache.fore);

  // state.cache = DEF_CACHE;
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
