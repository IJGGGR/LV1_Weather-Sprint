
// i'll have to nest everything since it's so inconsistent getting anything to sync

const state = {
  lat: 0,
  lon: 0,
};

async function updateWeather(params) {
  // fetch, cache, rate limiter
}

function updateGeolocation() {
  if (!navigator.geolocation) {
    console.error("Geolocation is not supported by your browser.");

    // todo: nest here
  } else {
    navigator.geolocation.getCurrentPosition(
      (v) => {
        state.lat = v.coords.latitude;
        state.lon = v.coords.longitude;

        console.log(`LAT: ${state.lat}, LON: ${state.lon}`);

        // todo: nest here
      },
      (e) => {
        console.error(e.message);

        // todo: nest here
      }
    );
  }
}

updateGeolocation();
