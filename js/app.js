
// Imports =========================================================================================

import { API_KEY } from "/js/env.js";

// Variables =======================================================================================

const iTxtSearch = document.getElementById("i-txt-search");
const oTxtCurrName = document.getElementById("o-txt-curr-name");
const oTxtCurrTime = document.getElementById("o-txt-curr-time");
const oImgCurrIcon = document.getElementById("o-img-curr-icon");
const oTxtCurrTemp = document.getElementById("o-txt-curr-temp");
const oTxtCurrCond = document.getElementById("o-txt-curr-cond");
const oTxtCurrHi = document.getElementById("o-txt-curr-hi");
const oTxtCurrLo = document.getElementById("o-txt-curr-lo");

const API_BASE = "https://api.openweathermap.org";
const CACHE_LIFE = 5 * 60000; // minutes -> ms

const TYPE_POS = { lat: 0, lon: 0 };
const TYPE_LOC = { name: "", state: "", country: "" };
const TYPE_DATA = { time: 0, curr: {}, fore: {} };
const TYPE_ITEM = { pos: TYPE_POS, loc: TYPE_LOC, data: TYPE_DATA };
const NULL_POS = { lat: undefined, lon: undefined };
const NULL_LOC = { name: undefined, state: undefined, country: undefined };
const NULL_DATA = { time: undefined, curr: undefined, fore: undefined };
const NULL_ITEM = { pos: NULL_POS, loc: NULL_LOC, data: NULL_DATA };

let state = {
  geo: TYPE_ITEM,
  wish: TYPE_ITEM,
  list: [TYPE_ITEM],
};

state.geo = NULL_ITEM;
state.wish = NULL_ITEM;
state.list = [];

// Main ============================================================================================

main();

async function main() {
  state = lsGet("state", state); // * LOAD STATE

  await updateGeolocation();
  state.wish = state.geo;
  await updateWeather();
  state.geo = state.wish;
  updateScreen();

  lsSet("state", state); // * SAVE STATE
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
    const [data = null] = await fetch(`${API_BASE}/geo/1.0/reverse?lat=${lat}&lon=${lon}&appid=${API_KEY}&limit=1`).then(v => v.json());
    if (!data) { throw new Error("Bad geolocation query."); }

    state.geo.loc = { name: data.name, state: data.state, country: data.country };
  } catch (e) {
    console.warn(e.message);
    state.geo.pos = NULL_POS;
    state.geo.loc = NULL_LOC;
    state.geo.data = NULL_DATA;
  }

  console.info("(NEW) geo.pos:", state.geo.pos);
  console.info("(NEW) geo.loc:", state.geo.loc);
  lsSet("state", state); // * SAVE STATE
}

async function searchLocation(str) {
  console.log("SEARCH:", str);
  try {
    const [data = null] = await fetch(`${API_BASE}/geo/1.0/direct?q=${str}&appid=${API_KEY}&limit=1`).then(v => v.json());
    if (!data) { throw new Error("Bad query."); }

    state.wish.pos = { lat: data.lat, lon: data.lon };
    state.wish.loc = { name: data.name, state: data.state, country: data.country };
    state.wish.data = NULL_DATA; // TODO: maybe check geo/list for possible matches

    lsSet("state", state); // * SAVE STATE
    console.info("wish.pos:", state.wish.pos);
    console.info("wish.loc:", state.wish.loc);

    await updateWeather();
    updateScreen();
  } catch (e) {
    console.error(e.message);
  }
}

// TODO: try-catch this to prevent null fetches
async function updateWeather() {
  const now = Date.now();
  const exp = now - CACHE_LIFE;
  const { lat = 38.0, lon = -121.0 } = state.wish.pos;

  console.info("(OLD) data.time:", state.wish.data.time);
  console.info("(OLD) data.curr:", state.wish.data.curr);
  console.info("(OLD) data.fore:", state.wish.data.fore);

  if ((state.wish.data.time ?? 0) <= exp) {
    console.info("FETCH");
    state.wish.data = {
      time: now,
      curr: await fetch(`${API_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en&units=imperial`).then(v => v.json()),
      fore: await fetch(`${API_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=en&units=imperial`).then(v => v.json()),
    };
  } else {
    console.info("CACHE");
  }

  console.info("(NEW) data.time:", state.wish.data.time);
  console.info("(NEW) data.curr:", state.wish.data.curr);
  console.info("(NEW) data.fore:", state.wish.data.fore);

  // state.wish.data = NULL_DATA;
  lsSet("state", state); // * SAVE STATE
}

function updateScreen() {
  const fav = document.getElementsByClassName("cell-header-fav")[0];
  fav.innerHTML = "";
  const img = document.createElement("img");
  img.src = "/assets/icons/01n.png";
  for (let i = 0; i < state.list.length; i++) {
    if (
      state.list[i].loc.name === state.wish.loc.name &&
      state.list[i].loc.state === state.wish.loc.state &&
      state.list[i].loc.country === state.wish.loc.country
    ) {
      img.src = "/assets/icons/01d.png";
      break;
    }
  }
  img.alt = "Favorite";
  img.className = "pointer";
  img.addEventListener("click", () => {
    console.log("FAV");
    for (let i = 0; i < state.list.length; i++) {
      if (
        state.list[i].loc.name === state.wish.loc.name &&
        state.list[i].loc.state === state.wish.loc.state &&
        state.list[i].loc.country === state.wish.loc.country
      ) {
        console.log("REMOVE");
        state.list.splice(i, 1);
        updateScreen();
        lsSet("state", state); // * SAVE STATE
        return;
      }
    }
    if (state.list.length === 5) { return; }
    console.log("ADD");
    state.list.push(state.wish);
    updateScreen();
    lsSet("state", state); // * SAVE STATE
  });
  fav.appendChild(img);

  const areas = document.querySelectorAll(".grid-favorites>.area");
  const icons = document.getElementsByClassName("cell-fav-icon");
  const names = document.getElementsByClassName("cell-fav-name");
  // hide all favorites
  for (let i = 0; i < areas.length; i++) {
    areas[i].classList.add("d-none");
  }
  // update favorites
  for (let i = 0; i < state.list.length ?? 0; i++) {
    areas[i].classList.remove("d-none");
    const icon = icons[i];
    const name = names[i];
    icon.innerHTML = "";
    name.innerHTML = "";
    const img = document.createElement("img");
    const p = document.createElement("p");

    img.src = "/assets/icons/01d.png";
    img.alt = "Unfavorite";
    img.className = "pointer";
    p.className = "m-0 pointer";
    p.innerText =
      state.list[i].loc.state
      ? `${state.list[i].loc.name}, ${state.list[i].loc.state}, ${state.list[i].loc.country}`
      : `${state.list[i].loc.name}, ${state.list[i].loc.country}`;

    img.addEventListener("click", () => {
      console.log("REMOVE:", i);
      state.list.splice(i, 1);
      updateScreen();
      lsSet("state", state); // * SAVE STATE
    });

    p.addEventListener("click", async () => {
      console.log("SWITCH:", i);
      state.wish = state.list[i];
      await updateWeather();
      state.list[i] = state.wish;
      updateScreen();
      lsSet("state", state); // * SAVE STATE
    });

    icon.appendChild(img);
    name.appendChild(p);
  }

  oTxtCurrName.innerText =
    state.wish.loc.state
    ? `${state.wish.loc.name}, ${state.wish.loc.state}, ${state.wish.loc.country}`
    : `${state.wish.loc.name}, ${state.wish.loc.country}`;

  // TODO: time offset
  let dt = new Date;
  oTxtCurrTime.innerText = dt.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  let isCloudy = state.wish.data.curr.clouds.all >= 50; // TODO: refine threshold

  oImgCurrIcon.src = isCloudy ? "/assets/cloudy.png" : "/assets/sunny.png";
  oTxtCurrTemp.innerHTML = Math.round(state.wish.data.curr.main.temp) + "&deg;F";
  oTxtCurrCond.innerHTML = isCloudy ? "Cloudy" : "Sunny";
  oTxtCurrHi.innerHTML = `Highest: ${Math.round(state.wish.data.curr.main.temp_max)}&deg;F`;
  oTxtCurrLo.innerHTML = `Lowest: ${Math.round(state.wish.data.curr.main.temp_min)}&deg;F`;

  const days = document.querySelectorAll(".grid-week>.area");
  // day 0
  const zer = days[0].querySelectorAll(".cell>*");
  zer[0].innerHTML = "DAY 0";
  zer[1].src = isCloudy ? "/assets/cloudy.png" : "/assets/sunny.png";
  zer[2].innerHTML = isCloudy ? "Cloudy" : "Sunny";
  zer[3].innerHTML = `H: ${Math.round(state.wish.data.curr.main.temp_max)}&deg;F`;
  zer[4].innerHTML = `L: ${Math.round(state.wish.data.curr.main.temp_min)}&deg;F`;
  // day 1-4
  for (let i = 1; i < days.length; i++) {
    // TODO: fix initial time offset
    let hi = state.wish.data.fore.list[0 + (i * 8)].main.temp_max;
    let lo = state.wish.data.fore.list[0 + (i * 8)].main.temp_min;
    for (let j = 0 + (i * 8); j < 8 + (i * 8); j++) {
      if (hi < state.wish.data.fore.list[j].main.temp_max) {
        hi = state.wish.data.fore.list[j].main.temp_max;
      }
      if (lo > state.wish.data.fore.list[j].main.temp_min) {
        lo = state.wish.data.fore.list[j].main.temp_min;
      }
    }
    const day = days[i].querySelectorAll(".cell>*");
    day[0].innerHTML = `Day ${i}`;
    day[1].src = `/assets/cloudy.png`;
    day[2].innerHTML = `CLOUDY ${i}`;
    day[3].innerHTML = `H: ${hi}&deg;F`;
    day[4].innerHTML = `L: ${lo}&deg;F`;
  }
}

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
