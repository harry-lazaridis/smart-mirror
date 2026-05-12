import express from "express";

const router = express.Router();

const convertKelvinToCelcius = (temp) => {
  return Math.round(temp);
};

const apiKey = process.env.OPEN_WEATHER_API;

const NEWS_SOURCES = {
  svt: { id: "svt", name: "SVT Nyheter", url: "https://www.svt.se/nyheter/rss.xml" },
  sr_ekot: { id: "sr_ekot", name: "Sveriges Radio Ekot", url: "https://api.sr.se/api/rss/program/4540" },
  dn: { id: "dn", name: "Dagens Nyheter", url: "https://www.dn.se/rss/" },
  aftonbladet: { id: "aftonbladet", name: "Aftonbladet", url: "https://rss.aftonbladet.se/rss2/small/pages/sections/senastenytt/" },
};

const decodeXml = (text = "") =>
  text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const getTag = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
};

const parseRssItems = (xml, sourceId) => {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items
    .map((itemXml) => {
      const title = getTag(itemXml, "title");
      const link = getTag(itemXml, "link");
      const pubDateRaw = getTag(itemXml, "pubDate");
      const parsedDate = pubDateRaw ? new Date(pubDateRaw) : null;
      const pubDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null;
      if (!title || !link) return null;

      return { sourceId, title, link, pubDate };
    })
    .filter(Boolean);
};

/**
 * TODO
 * [x] Option parameter for weather.
 */
router.get("/weather", async (req, res) => {
  try {
    const { lat, long } = req.query; 
    if (!apiKey) return res.status(500).json({ error: "Weather API key is not configured" });
    if (!lat || !long) return res.status(400).json({ error: "lat and long are required query params" });

    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=${apiKey}&units=metric`
    );
    const currentResult = await currentResponse.json();

    if (!currentResponse.ok || currentResult.cod !== 200) {
      return res.status(Number(currentResult.cod) || currentResponse.status || 400).json({ error: currentResult.message || "Weather API error" });
    }

    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${long}&appid=${apiKey}&units=metric`
    );
    const forecastResult = await forecastResponse.json();

    if (!forecastResponse.ok || forecastResult.cod !== "200") {
      return res.status(Number(forecastResult.cod) || forecastResponse.status || 400).json({ error: forecastResult.message || "Forecast API error" });
    }

    const timezoneOffsetSeconds = forecastResult.city?.timezone || 0;

    const targetForecasts = [
      { hour: 8, display: "08:00" },
      { hour: 14, display: "14:00" },
      { hour: 20, display: "20:00" },
    ];

    const nowLocal = new Date(Date.now() + timezoneOffsetSeconds * 1000);

    const forecast = targetForecasts
      .map(({ hour, display }) => {
        const targetLocal = new Date(nowLocal);
        targetLocal.setHours(hour, 0, 0, 0);

        if (targetLocal < nowLocal) {
          targetLocal.setDate(targetLocal.getDate() + 1);
        }

        const match = forecastResult.list.find((item) => {
          const itemLocal = new Date(item.dt * 1000 + timezoneOffsetSeconds * 1000);

          return (
            itemLocal.getUTCFullYear() === targetLocal.getUTCFullYear() &&
            itemLocal.getUTCMonth() === targetLocal.getUTCMonth() &&
            itemLocal.getUTCDate() === targetLocal.getUTCDate() &&
            itemLocal.getUTCHours() === hour
          );
        });

        if (!match) return null;

        return {
          time: display,
          temp: convertKelvinToCelcius(match.main.temp),
          description: match.weather?.[0]?.description || "",
          icon: match.weather?.[0]?.icon || "",
          openWeatherTime: match.dt_txt,
        };
      })
      .filter(Boolean);

    res.json({
      temp:        convertKelvinToCelcius(currentResult.main.temp),
      feels_like:  convertKelvinToCelcius(currentResult.main.feels_like),
      description: currentResult.weather[0].description,
      city:        currentResult.name,
      icon:        currentResult.weather[0].icon,
      forecast,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/weather/:city", async (req, res) => {
    try {
        const { city } = req.params;
        if (!apiKey) return res.status(500).json({ error: "Weather API key is not configured" });

        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
        const result = await response.json();

        if (!response.ok || !result.main?.temp) {
          return res.status(Number(result.cod) || response.status || 400).json({ error: result.message || "Failed getting weather." });
        }

        res.json({ temp: convertKelvinToCelcius(result.main.temp) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.get("/news/sources", (req, res) => {
  res.json(Object.values(NEWS_SOURCES).map(({ id, name }) => ({ id, name })));
});

router.get("/news", async (req, res) => {
  try {
    const requestedSources = String(req.query.sources || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const sourceIds = requestedSources.length > 0 ? requestedSources : ["svt", "sr_ekot"];
    const validSources = sourceIds.map((id) => NEWS_SOURCES[id]).filter(Boolean);
    if (validSources.length === 0) return res.status(400).json({ error: "No valid news sources selected." });

    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 30));

    const allNews = await Promise.all(
      validSources.map(async (source) => {
        const response = await fetch(source.url);
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRssItems(xml, source.id).map((item) => ({ ...item, sourceName: source.name }));
      })
    );

    const merged = allNews
      .flat()
      .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
      .slice(0, limit);

    res.json(merged);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load news." });
  }
});

export default router;