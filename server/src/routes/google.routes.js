import express from "express";
import oauth2Client from "../google.js";

const router = express.Router();

router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/calendar.readonly"
        ],
    });

    res.redicrect(url);
})

export default router;