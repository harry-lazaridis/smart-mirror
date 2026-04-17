import express from "express";

const router = express.Router();

const convertKelvinToCelcius = (Kelvin) => { return Math.round((Kelvin - 273.15) * 100) / 100 }

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