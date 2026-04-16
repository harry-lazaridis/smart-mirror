import express from "express";
import oauth2Client from "../google.js";
import google from "googleapis"
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/google/test", authMiddleware, (req, res) => {
    const uid = req.user.uid;
    const name = req.user.displayName;

    res.json({data: req.user.name});
})

router.get("/google", authMiddleware, (req, res) => {

    console.log(req.user.uid)
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/calendar.readonly"
        ],
        client_id: req.user.uid
    });

    res.redirect(url);
})

router.get("/google/callback", authMiddleware, async (req, res) => {
    const { code } = req.query;

    const { token } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    res.send("Google Calendar connected!");
})

router.get("/google/calendar", async (req, res) => {
    try {
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: "startTime", // Vad mer?
        })

        res.json(response.data.items);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching calendar");
    }
})

export default router;