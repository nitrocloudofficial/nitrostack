import { Injectable, ConfigService } from '@nitrostack/core';
import { z } from 'zod';

// OpenWeather schemas
const WeatherAlertSchema = z.object({
  event: z.string(),
  start: z.number(),
  end: z.number(),
  description: z.string(),
});

const WeatherDataSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  current: z.object({
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
    pressure: z.number(),
    wind_speed: z.number(),
    wind_deg: z.number(),
    weather: z.array(
      z.object({
        id: z.number(),
        main: z.string(),
        description: z.string(),
        icon: z.string(),
      })
    ),
  }),
  alerts: z.array(WeatherAlertSchema).optional(),
});

export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export interface ThreatWeather {
  location: string;
  lat: number;
  lon: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threatType: string;
  description: string;
  windSpeed: number;
  temperature: number;
  alerts: WeatherAlert[];
  timestamp: string;
}

@Injectable({ deps: [ConfigService] })
export class OpenWeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('OPENWEATHER_KEY') || 'demo';
  }

  /**
   * Get weather data for a location (lat, lon)
   * Uses current weather endpoint (free tier)
   */
  async getWeatherAlerts(lat: number, lon: number): Promise<ThreatWeather | null> {
    try {
      const url = new URL(`${this.baseUrl}/weather`);
      url.searchParams.append('lat', String(lat));
      url.searchParams.append('lon', String(lon));
      url.searchParams.append('appid', this.apiKey);
      url.searchParams.append('units', 'metric');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`OpenWeather error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as Record<string, any>;

      // Extract threat relevant info
      const windSpeed = data.wind?.speed ?? 0;
      const weatherMain = data.weather?.[0]?.main ?? '';
      const weatherDesc = data.weather?.[0]?.description ?? '';
      const cityName = data.name ?? `${lat},${lon}`;

      // Only flag as threat if severe conditions
      const severity = this.calculateSeverity(weatherMain, windSpeed);
      if (severity === 'low') return null;

      return {
        location: cityName,
        lat: data.coord?.lat ?? lat,
        lon: data.coord?.lon ?? lon,
        severity,
        threatType: weatherMain,
        description: `${weatherDesc} at ${cityName} — wind ${windSpeed} m/s, temp ${data.main?.temp}°C`,
        windSpeed,
        temperature: data.main?.temp ?? 0,
        alerts: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check multiple major port locations for weather threats
   */
  async checkPortWeatherThreats(): Promise<ThreatWeather[]> {
    const ports = [
      { name: 'Shanghai', lat: 31.23, lon: 121.47 },
      { name: 'Rotterdam', lat: 51.92, lon: 4.28 },
      { name: 'Singapore', lat: 1.35, lon: 103.82 },
      { name: 'Los Angeles', lat: 33.74, lon: -118.27 },
      { name: 'Dubai', lat: 25.20, lon: 55.27 },
    ];

    const threats: ThreatWeather[] = [];
    for (const port of ports) {
      try {
        const threat = await this.getWeatherAlerts(port.lat, port.lon);
        if (threat) {
          threat.location = port.name;
          threats.push(threat);
        }
      } catch (_) {
        // skip failing port
      }
    }

    return threats;
  }

  /**
   * Calculate threat severity based on weather event and wind speed
   */
  private calculateSeverity(
    event: string,
    windSpeed: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const eventLower = event.toLowerCase();

    // Wind speed thresholds (m/s)
    if (windSpeed > 32.7) return 'critical'; // >118 km/h (typhoon)
    if (windSpeed > 24.5) return 'high'; // >88 km/h (severe storm)
    if (windSpeed > 17.2) return 'medium'; // >62 km/h (strong wind)

    // Event-based severity
    if (eventLower.includes('typhoon') || eventLower.includes('hurricane')) return 'critical';
    if (eventLower.includes('cyclone') || eventLower.includes('tornado')) return 'critical';
    if (eventLower.includes('storm') || eventLower.includes('gale')) return 'high';
    if (eventLower.includes('wind') || eventLower.includes('rain')) return 'medium';

    return 'low';
  }

  /**
   * Mock weather threat for demo/fallback
   */
  private getMockWeatherThreat(): ThreatWeather {
    return {
      location: 'Asia/Shanghai',
      lat: 30.2741,
      lon: 120.1551,
      severity: 'critical',
      threatType: 'Typhoon',
      description: 'Typhoon Noru approaching Shanghai port with sustained winds of 150 km/h',
      windSpeed: 41.7, // ~150 km/h
      temperature: 28.5,
      alerts: [
        {
          event: 'Typhoon Warning',
          start: Math.floor(Date.now() / 1000),
          end: Math.floor(Date.now() / 1000) + 86400 * 3,
          description: 'Typhoon Noru expected to reach Shanghai within 48 hours',
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
