/**
 * Open-Meteo client for the /weather view: current conditions + a 7-day
 * forecast for a lat/lon pair, no API key required
 * (https://open-meteo.com/en/docs). Temperature comes back in Celsius and
 * wind speed in km/h by default — no extra unit params needed since the
 * site's primary locales (pt-BR first) expect metric.
 *
 * Results are cached in memory (module-level Map) for a short TTL so
 * re-rendering or switching filters doesn't refetch the same city
 * repeatedly, and concurrent callers for the same coordinates share a
 * single in-flight request instead of firing duplicate fetches.
 */

export type WeatherCategory =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

export interface WeatherInfo {
  category: WeatherCategory;
  /** Translation key under the `Weather.conditions` namespace. */
  labelKey: WeatherCategory;
}

export interface WeatherDay {
  /** ISO date (yyyy-LL-dd), already in the location's own timezone. */
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number | null;
}

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface WeatherData {
  current: WeatherCurrent;
  daily: WeatherDay[];
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

interface CacheEntry {
  expiresAt: number;
  promise: Promise<WeatherData>;
}

const cache = new Map<string, CacheEntry>();

/** Rounded to ~1km precision so nearby calls for the same city share an entry. */
function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: (number | null)[];
  };
}

async function fetchFromApi(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL(WEATHER_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed: ${res.status}`);
  }

  const json = (await res.json()) as OpenMeteoResponse;

  const current: WeatherCurrent = {
    temperature: json.current.temperature_2m,
    apparentTemperature: json.current.apparent_temperature,
    humidity: json.current.relative_humidity_2m,
    windSpeed: json.current.wind_speed_10m,
    weatherCode: json.current.weather_code,
  };

  const daily: WeatherDay[] = json.daily.time.map((date, i) => ({
    date,
    weatherCode: json.daily.weather_code[i],
    tempMax: json.daily.temperature_2m_max[i],
    tempMin: json.daily.temperature_2m_min[i],
    precipitationProbability: json.daily.precipitation_probability_max?.[i] ?? null,
  }));

  return { current, daily };
}

/**
 * Fetches current conditions + 7-day forecast for a coordinate, with a
 * short in-memory cache. Concurrent calls for the same coordinates before
 * the first resolves share the same promise; failures are evicted from the
 * cache immediately (not cached) so a retry always hits the network again.
 */
export function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetchFromApi(lat, lon).catch((err) => {
    cache.delete(key);
    throw err;
  });

  cache.set(key, { expiresAt: now + CACHE_TTL_MS, promise });
  return promise;
}

/** WMO weather-code -> category, per https://open-meteo.com/en/docs (WMO Weather interpretation codes). */
const WEATHER_CODE_CATEGORIES: Record<number, WeatherCategory> = {
  0: "clear",
  1: "partlyCloudy",
  2: "partlyCloudy",
  3: "cloudy",
  45: "fog",
  48: "fog",
  51: "rain",
  53: "rain",
  55: "rain",
  56: "rain",
  57: "rain",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "rain",
  67: "rain",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain",
  81: "rain",
  82: "storm",
  85: "snow",
  86: "snow",
  95: "storm",
  96: "storm",
  99: "storm",
};

/** Maps a WMO weather code to an icon category + i18n label key. Unknown codes fall back to "cloudy". */
export function weatherCodeToInfo(code: number): WeatherInfo {
  const category = WEATHER_CODE_CATEGORIES[code] ?? "cloudy";
  return { category, labelKey: category };
}
