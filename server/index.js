import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { google } from "googleapis";
import app from "./src/app.js";
import { db } from "./src/config/firebase.js";
import { createOAuth2Client } from "./src/google.js";

export const api = onRequest(
  {
    region: "europe-west1",
    cors: false,
    invoker: "public",
  },
  app
);

export const syncGoogleCalendar = onSchedule(
  {
    schedule: "every 10 minutes",
    region: "europe-west1",
    timeZone: "Europe/Stockholm",
  },
  async () => {
    const usersSnap = await db
      .collection("users")
      .where("connectedToCalendar", "==", true)
      .get();

    const jobs = usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const data = userDoc.data() ?? {};
      const tokens = data.googleTokens;

      if (!tokens) return;

      try {
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin: new Date().toISOString(),
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
        });

        const items = response.data.items || [];
        const freshCredentials = oauth2Client.credentials || {};
        const hasTokenUpdates =
          Object.keys(freshCredentials).length > 0 &&
          JSON.stringify(freshCredentials) !== JSON.stringify(tokens);

        const payload = {
          googleCalendarEvents: items,
          googleCalendarEventsUpdatedAt: new Date().toISOString(),
        };
        if (hasTokenUpdates) payload.googleTokens = { ...tokens, ...freshCredentials };

        await db.collection("users").doc(uid).set(payload, { merge: true });
      } catch (err) {
        const errorData = err?.response?.data;
        const isInvalidGrant =
          err?.message === "invalid_grant" || errorData?.error === "invalid_grant";

        if (isInvalidGrant) {
          await db.collection("users").doc(uid).set(
            {
              googleTokens: null,
              connectedToCalendar: false,
              googleReconnectRequired: true,
            },
            { merge: true }
          );
          return;
        }

        console.error(`Scheduled calendar sync failed for uid=${uid}:`, err?.message || err);
      }
    });

    await Promise.all(jobs);
  }
);
