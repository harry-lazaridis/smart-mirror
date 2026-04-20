import express from "express";

const router = express.Router();

const convertKelvinToCelcius = (Kelvin) => { return Math.round((Kelvin - 273.15) * 100) / 100 }

/**
 * TODO
 * [x] Option parameter for weather.
 */
router.get("/weather", async (req, res) => {
  try {
    const { lat, long } = req.query; 

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=${process.env.OPEN_WEATHER_API}`
    );

    const result = await response.json();

    if (result.cod !== 200) return res.status(400).json({ error: result.message });

    res.json({
      temp:        convertKelvinToCelcius(result.main.temp),
      feels_like:  convertKelvinToCelcius(result.main.feels_like),
      description: result.weather[0].description,
      city:        result.name,
      icon:        result.weather[0].icon,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/weather/:city", async (req, res) => {
    try {
        const { city } = req.params;

        const response = await fetch("https://api.openweathermap.org/data/2.5/weather?q=" + city + "&appid=ed97186feae9b39e6b981bf57a22e3c2")
        if (!response) { res.json({error: "Failed getting weather."})}

        const result = await response.json();

        res.json({temp: convertKelvinToCelcius(result['main']['temp'])})
    } catch (error) {
        res.json({error})
    }
})

export default router;