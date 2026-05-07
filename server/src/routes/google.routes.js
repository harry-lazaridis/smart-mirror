import express from "express";
import oauth2Client from "../google.js";
import { google } from "googleapis"
import { authMiddleware } from "../middleware/auth.js";
import admin, {db} from "../config/firebase.js";

const router = express.Router();

const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : queryToken;

  if (!token) throw new Error("No token provided");

  return await admin.auth().verifyIdToken(token);
};

router.get("/google/test", authMiddleware, (req, res) => {
    const uid = req.user.uid;
    const name = req.user.displayName;

    res.json({data: req.user.name});
})

router.get("/google", async (req, res) => {
  try {
    const decoded = await verifyToken(req);

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/tasks.readonly"],
      state: decoded.uid,
    });

    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(401).send("Unauthorized");
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const uid = state;

    await db.collection("users").doc(uid).set(
      { googleTokens: tokens, connectedToCalendar: true },
      { merge: true }
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/admin?calendar=connected`);
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});


router.get("/google/calendar", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.googleTokens;

    if (!tokens) {
      return res.status(400).json({ error: "Google not connected" });
    }

    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    var date = new Date();

    // add a day
    date.setDate(date.getDate() + 1);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      timeMax: date,
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    const freshCredentials = oauth2Client.credentials || {};
    const hasTokenUpdates =
      Object.keys(freshCredentials).length > 0 &&
      JSON.stringify(freshCredentials) !== JSON.stringify(tokens);

    if (hasTokenUpdates) {
      await db.collection("users").doc(uid).set(
        { googleTokens: { ...tokens, ...freshCredentials } },
        { merge: true }
      );
    }

    res.json(response.data.items || []);
  } catch (err) {
    const errorData = err?.response?.data;
    const isInvalidGrant =
      err?.message === "invalid_grant" ||
      errorData?.error === "invalid_grant";

    if (isInvalidGrant) {
      try {
        const decoded = await verifyToken(req);
        await db.collection("users").doc(decoded.uid).set(
          {
            googleTokens: null,
            connectedToCalendar: false,
            googleReconnectRequired: true,
          },
          { merge: true }
        );
      } catch (cleanupError) {
        console.error("CALENDAR TOKEN CLEANUP ERROR:", cleanupError?.message || cleanupError);
      }

      return res.status(401).json({
        error: "Google token expired or revoked. Please reconnect your Google Calendar.",
        code: "GOOGLE_RECONNECT_REQUIRED",
      });
    }

    console.error("CALENDAR ERROR:", err?.message || err);
    res.status(500).json({ error: "Failed to load calendar events" });
  }
});

router.get("/google/tasks", async (req, res) => {
  try {
    const decoded = await verifyToken(req);
    const uid = decoded.uid;

    const userDoc = await db.collection("users").doc(uid).get();
    const tokens = userDoc.data()?.googleTokens;

    if (!tokens) {
      return res.status(400).json({ error: "Google not connected" });
    }

    oauth2Client.setCredentials(tokens);

    const tasksApi = google.tasks({ version: "v1", auth: oauth2Client });

    // Get all Google Task lists
    const taskListsResponse = await tasksApi.tasklists.list({
      maxResults: 20,
    });

    const taskLists = taskListsResponse.data.items || [];

    const allTasks = [];

    for (const taskList of taskLists) {
      const tasksResponse = await tasksApi.tasks.list({
        tasklist: taskList.id,
        showCompleted: true,
        showHidden: false,
        maxResults: 100,
      });

      const tasks = tasksResponse.data.items || [];

      tasks.forEach((task) => {
        allTasks.push({
          id: task.id,
          googleTaskId: task.id,
          taskListId: taskList.id,
          taskListTitle: taskList.title,
          text: task.title || "Untitled task",
          notes: task.notes || "",
          done: task.status === "completed",
          due: task.due || null,
          createdAt: task.updated ? new Date(task.updated).getTime() : Date.now(),
          source: "googleTasks",
        });
      });
    }

    await db.collection("users").doc(uid).set(
      {
        todos: allTasks,
        connectedToTasks: true,
      },
      { merge: true }
    );

    const freshCredentials = oauth2Client.credentials || {};
    const hasTokenUpdates =
      Object.keys(freshCredentials).length > 0 &&
      JSON.stringify(freshCredentials) !== JSON.stringify(tokens);

    if (hasTokenUpdates) {
      await db.collection("users").doc(uid).set(
        { googleTokens: { ...tokens, ...freshCredentials } },
        { merge: true }
      );
    }

    res.json(allTasks);
  } catch (err) {
  console.error("TASKS ERROR FULL:", {
    message: err?.message,
    code: err?.code,
    status: err?.response?.status,
    data: err?.response?.data,
  });

  res.status(500).json({
    error: "Failed to load Google Tasks",
    details: err?.response?.data || err?.message,
  });
  }
});
export default router;
