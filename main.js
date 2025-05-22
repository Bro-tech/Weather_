const apiKey = 'your api key';

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const weatherCard = document.getElementById('weather-card');
const cityName = document.getElementById('city-name');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const windSpeed = document.getElementById('wind-speed');
const humidity = document.getElementById('humidity');
const rainProb = document.getElementById('rain-prob');
const errorMessage = document.getElementById('error-message');
const feelsLike = document.getElementById('feels-like');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const uvIndex = document.getElementById('uv-index');
const aqi = document.getElementById('aqi');
const forecastDiv = document.getElementById('forecast');
const hourlyDiv = document.getElementById('hourly-forecast');
const locateBtn = document.getElementById('locate-btn');
const themeToggle = document.getElementById('theme-toggle');
const favBtn = document.getElementById('fav-btn');
const unfavBtn = document.getElementById('unfav-btn');
const favoritesDiv = document.getElementById('favorites');
const weatherAnimBg = document.getElementById('weather-anim-bg');


let currentCity = '';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let vantaEffect = null;

function kelvinToC(temp) {
    return `${Math.round(temp - 273.15)}°C`;
}

function formatTime(ts, tz) {
    return new Date((ts + tz) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    themeToggle.textContent = dark ? '☀️' : '🌙';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}

themeToggle.onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(localStorage.getItem('theme') === 'dark');

function renderFavorites() {
    favoritesDiv.innerHTML = '';
    favorites.forEach(city => {
        const btn = document.createElement('button');
        btn.textContent = city;
        btn.onclick = () => fetchWeather(city);
        favoritesDiv.appendChild(btn);
    });
}

function setFavBtn() {
    if (favorites.includes(currentCity)) {
        favBtn.classList.add('favorited');
        favBtn.textContent = '⭐ Favorited';
        unfavBtn.classList.remove('hidden');
        favBtn.classList.add('hidden');
    } else {
        favBtn.classList.remove('favorited');
        favBtn.textContent = '⭐ Add to Favorites';
        unfavBtn.classList.add('hidden');
        favBtn.classList.remove('hidden');
    }
}

favBtn.onclick = () => {
    if (!currentCity) return;
    if (!favorites.includes(currentCity)) {
        favorites.push(currentCity);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
        setFavBtn();
    }
};

unfavBtn.onclick = () => {
    if (!currentCity) return;
    const idx = favorites.indexOf(currentCity);
    if (idx !== -1) {
        favorites.splice(idx, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
        setFavBtn();
    }
};

async function fetchWeather(city) {
    weatherCard.classList.add('hidden');
    forecastDiv.classList.add('hidden');
    hourlyDiv.classList.add('hidden');
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    try {

        // Current weather
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}`);
        if (!res.ok) throw new Error('City not found');
        const data = await res.json();
        currentCity = data.name;
        cityName.textContent = `${data.name}, ${data.sys.country}`;
        temperature.textContent = kelvinToC(data.main.temp);
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
        windSpeed.textContent = `${data.wind.speed} m/s`;
        humidity.textContent = `${data.main.humidity}%`;
        feelsLike.textContent = kelvinToC(data.main.feels_like);
        sunrise.textContent = formatTime(data.sys.sunrise, data.timezone - (new Date().getTimezoneOffset() * 60));
        sunset.textContent = formatTime(data.sys.sunset, data.timezone - (new Date().getTimezoneOffset() * 60));
        rainProb.textContent = data.rain && data.rain['1h'] ? `${data.rain['1h']} mm (1h)` : 'No rain';

        // Theme and tip
        setTempTheme(data.main.temp);
        showWeatherTip(data.weather[0].main, data.main.temp);

        // Weather animation & sound
        setWeatherAnimation(data.weather[0].main);
        playWeatherSound(data.weather[0].main);

        // UV Index & AQI
        const {lat, lon} = data.coord;
        const [uviRes, aqiRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
        ]);
        const uviData = await uviRes.json();
        uvIndex.textContent = uviData.value;
        uvIndex.style.color = uviData.value < 3 ? 'green' : uviData.value < 6 ? 'orange' : 'red';

        const aqiData = await aqiRes.json();
        const aqiVal = aqiData.list[0].main.aqi;
        const aqiText = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqiVal-1];
        aqi.textContent = aqiText;
        aqi.style.color = ['green','lime','orange','red','purple'][aqiVal-1];

        // 5-day forecast
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}`);
        const forecastData = await forecastRes.json();
        renderForecast(forecastData);
        renderHourly(forecastData);

        setFavBtn();
        weatherCard.classList.remove('hidden');
        forecastDiv.classList.remove('hidden');
        hourlyDiv.classList.remove('hidden');
    } catch (err) {
        errorMessage.textContent = err.message;
        errorMessage.classList.remove('hidden');
    }
}

function renderForecast(data) {
    const days = {};
    data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!days[date] && item.dt_txt.includes('12:00:00')) {
            days[date] = item;
        }
    });
    forecastDiv.innerHTML = '';
    Object.values(days).slice(0,5).forEach(item => {
        const div = document.createElement('div');
        div.className = 'forecast-day';
        div.innerHTML = `
            <div>${new Date(item.dt * 1000).toLocaleDateString(undefined, {weekday:'short'})}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="">
            <div>${kelvinToC(item.main.temp_min)} / ${kelvinToC(item.main.temp_max)}</div>
            <div>${item.weather[0].main}</div>
        `;
        forecastDiv.appendChild(div);
    });
}

function renderHourly(data) {
    hourlyDiv.innerHTML = '';
    data.list.slice(0,8).forEach(item => {
        const div = document.createElement('div');
        div.className = 'hourly-block';
        div.innerHTML = `
            <div>${new Date(item.dt * 1000).getHours()}:00</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt=" ">
            <div>${kelvinToC(item.main.temp)}</div>
        `;
        hourlyDiv.appendChild(div);
    });
}

form.onsubmit = e => {
    e.preventDefault();
    fetchWeather(cityInput.value.trim());
};

locateBtn.onclick = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
        const {latitude, longitude} = pos.coords;
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`);
        const data = await res.json();
        if (data[0] && data[0].name) {
            fetchWeather(data[0].name);
        }
    });
};

renderFavorites();

// --- Theme by temperature ---
function setTempTheme(tempK) {
    const tempC = tempK - 273.15;
    document.body.classList.remove('theme-cold', 'theme-mild', 'theme-warm', 'theme-hot');
    if (tempC < 10) {
        document.body.classList.add('theme-cold');
    } else if (tempC < 20) {
        document.body.classList.add('theme-mild');
    } else if (tempC < 30) {
        document.body.classList.add('theme-warm');
    } else {
        document.body.classList.add('theme-hot');
    }
}

// --- Weather-based tips ---
function showWeatherTip(main, tempK) {
    const tipDiv = document.getElementById('weather-tip');
    const tipIcon = document.getElementById('tip-icon');
    const tipText = document.getElementById('tip-text');
    const tempC = tempK - 273.15;

    let tip = { icon: "💡", text: "Have a great day!" };

    if (main === "Rain" || main === "Drizzle" || main === "Thunderstorm") {
        tip = { icon: "☔", text: "Don't forget your umbrella!" };
    } else if (main === "Snow") {
        tip = { icon: "❄️", text: "Dress warmly and watch your step!" };
    } else if (main === "Clear" && tempC > 28) {
        tip = { icon: "🧴", text: "It's hot! Stay hydrated and use sunscreen." };
    } else if (main === "Clear" && tempC < 10) {
        tip = { icon: "🧥", text: "It's chilly! Wear a jacket." };
    } else if (main === "Clear") {
        tip = { icon: "😎", text: "Enjoy the sunshine!" };
    } else if (main === "Clouds") {
        tip = { icon: "☁️", text: "A good day for a walk!" };
    } else if (main === "Fog" || main === "Mist" || main === "Haze") {
        tip = { icon: "🌫️", text: "Drive carefully in low visibility." };
    } else if (main === "Extreme") {
        tip = { icon: "⚠️", text: "Extreme weather! Stay safe and check alerts." };
    }

    tipIcon.textContent = tip.icon;
    tipText.textContent = tip.text;
    tipDiv.classList.remove('hidden');
}

// --- Weather Animation (Vanta.js + SVG fallback) ---
function setWeatherAnimation(main) {
    if (window.vantaEffect) {
        window.vantaEffect.destroy();
        window.vantaEffect = null;
    }
    weatherAnimBg.innerHTML = '';
    switch (main.toLowerCase()) {
        case 'clouds':
            window.vantaEffect = VANTA.CLOUDS({
                el: "#weather-anim-bg",
                mouseControls: false,
                touchControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                skyColor: 0xbfd6e7,
                cloudColor: 0xffffff,
                cloudShadowColor: 0xaaaaaa,
                sunColor: 0xffee88,
                sunlightColor: 0xffee88
            });
            break;
        case 'fog':
            window.vantaEffect = VANTA.FOG({
                el: "#weather-anim-bg",
                mouseControls: false,
                touchControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                highlightColor: 0xffffff,
                midtoneColor: 0xcccccc,
                lowlightColor: 0x888888,
                baseColor: 0x222222,
                blurFactor: 0.7,
                speed: 1.2,
                zoom: 1.5
            });
            break;
        case 'rain':
        case 'drizzle':
            weatherAnimBg.innerHTML = rainSVG();
            break;
        case 'snow':
            weatherAnimBg.innerHTML = snowSVG();
            break;
        case 'thunderstorm':
            weatherAnimBg.innerHTML = rainSVG() + lightningSVG();
            break;
        default:
            weatherAnimBg.innerHTML = '';
    }
}

    if (window.tsParticles && window.tsParticles.domItem(0)) {
        window.tsParticles.domItem(0).destroy();
    }
    if (main.toLowerCase() === "rain" || main.toLowerCase() === "drizzle") {
        tsParticles.load("weather-anim-bg", {
            particles: {
                number: { value: 500 },
                color: { value: "#4e54c8" },
                shape: { type: "line" },
                opacity: { value: 0.5 },
                size: { value: { min: 50, max: 100 } },
                move: { enable: true, speed: 50, direction: "bottom", straight: true }
            },
            background: { color: "transparent" }
        });
    } else {
        document.getElementById("weather-anim-bg").innerHTML = "";
    }


function rainSVG() {
    return `
    <svg width="100vw" height="100vh" style="position:absolute;top:0;left:0;" viewBox="0 0 1920 1080">
        <g>
            <line x1="200" y1="0" x2="210" y2="40" stroke="#4e54c8" stroke-width="4" opacity="0.5">
                <animate attributeName="y1" values="0;1080" dur="1s" repeatCount="indefinite"/>
                <animate attributeName="y2" values="40;1120" dur="1s" repeatCount="indefinite"/>
            </line>
            <line x1="600" y1="0" x2="610" y2="40" stroke="#4e54c8" stroke-width="4" opacity="0.5">
                <animate attributeName="y1" values="0;1080" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="y2" values="40;1120" dur="1.2s" repeatCount="indefinite"/>
            </line>
            <line x1="1000" y1="0" x2="1010" y2="40" stroke="#4e54c8" stroke-width="4" opacity="0.5">
                <animate attributeName="y1" values="0;1080" dur="0.9s" repeatCount="indefinite"/>
                <animate attributeName="y2" values="40;1120" dur="0.9s" repeatCount="indefinite"/>
            </line>
            <line x1="1400" y1="0" x2="1410" y2="40" stroke="#4e54c8" stroke-width="4" opacity="0.5">
                <animate attributeName="y1" values="0;1080" dur="1.1s" repeatCount="indefinite"/>
                <animate attributeName="y2" values="40;1120" dur="1.1s" repeatCount="indefinite"/>
            </line>
        </g>
    </svg>
    `;
}

function snowSVG() {
    return `
    <svg width="100vw" height="100vh" style="position:absolute;top:0;left:0;" viewBox="0 0 1920 1080">
        <g>
            <circle cx="300" cy="0" r="8" fill="#fff" opacity="0.7">
                <animate attributeName="cy" values="0;1080" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="900" cy="0" r="6" fill="#fff" opacity="0.7">
                <animate attributeName="cy" values="0;1080" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="1500" cy="0" r="7" fill="#fff" opacity="0.7">
                <animate attributeName="cy" values="0;1080" dur="2.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="600" cy="0" r="5" fill="#fff" opacity="0.7">
                <animate attributeName="cy" values="0;1080" dur="2.2s" repeatCount="indefinite"/>
            </circle>
        </g>
    </svg>
    `;
}

function lightningSVG() {
    return `
    <svg width="100vw" height="100vh" style="position:absolute;top:0;left:0;" viewBox="0 0 1920 1080">
        <g>
            <polyline points="900,300 940,500 920,500 960,700" fill="none" stroke="#fff700" stroke-width="8">
                <animate attributeName="opacity" values="0;1;0" keyTimes="0;0.1;1" dur="2s" repeatCount="indefinite"/>
            </polyline>
        </g>
    </svg>
    `;
}

// --- Weather Sound Effects ---
function playWeatherSound(main) {
    // Stop all sounds first
    ["sound-rain", "sound-thunder", "sound-snow", "sound-wind", "sound-clear"].forEach(id => {
        const audio = document.getElementById(id);
        if (audio) { audio.pause(); audio.currentTime = 0; }
    });

    let soundId = null;
    switch (main.toLowerCase()) {
        case "rain":
        case "drizzle":
            soundId = "sound-rain";
            break;
        case "thunderstorm":
            soundId = "sound-thunder";
            break;
        case "snow":
            soundId = "sound-snow";
            break;
        case "clouds":
        case "fog":
        case "mist":
            soundId = "sound-wind";
            break;
        case "clear":
            soundId = "sound-clear";
            break;
    }
    if (soundId) {
        const audio = document.getElementById(soundId);
        if (audio) { audio.volume = 0.5; audio.play(); }
    }
}

