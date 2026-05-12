import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { parseCSV } from "../utils/csvParser.js"
import { parseICal } from "../utils/icalParser.js";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../config/firebase.js"

const router = express.Router();
const upload = multer({ dest: "uploads/"})

function getEventDate(event) {
    const start = event?.start;
    if (start?.dateTime) return new Date(start.dateTime);
    if (start?.date) return new Date(start.date);
    if (start?._seconds) return new Date(start._seconds * 1000);
    if (typeof start === "string") return new Date(start);
    return null;
}

function normalizeUploadedEvents(rawEvents) {
    const timestamp = Date.now();
    return rawEvents.map((event, index) => ({
        ...event,
        id: event?.id ? String(event.id) : `upload-${timestamp}-${index}`,
        source: "upload",
        createdAt: new Date().toISOString(),
    }));
}

async function saveUploadedEvents(uid, events) {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const existing = userSnap.exists && Array.isArray(userSnap.data()?.events)
        ? userSnap.data().events
        : [];

    const mergedById = new Map();
    existing.forEach((event) => {
        if (event?.id) mergedById.set(String(event.id), event);
    });
    events.forEach((event) => {
        if (event?.id) mergedById.set(String(event.id), event);
    });

    await userRef.set({ events: Array.from(mergedById.values()) }, { merge: true });
}

router.post("/upload_test", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        
        if (!file) { return res.status(400).json({ error: "No file uploaded" })}
        const filePath = file.path;
        const ext = path.extname(file.originalname).toLowerCase();

        let events = [];

        if(ext === ".csv"){
            events = await parseCSV(filePath);
        } else if (ext === ".ics" || ext === ".ical"){
            events = await parseICal(filePath, false);
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Unsupported file type" });
        }

        fs.unlinkSync(filePath);

        const uid = req.user.uid;
        const normalizedEvents = normalizeUploadedEvents(events);
        await saveUploadedEvents(uid, normalizedEvents);
        res.json(normalizedEvents);

    } catch (error) {
        console.error("UPLOAD TEST ERROR:", error);
        res.status(500).json({ error: "Failed to process file" });
    }
})

router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;

        if(!file){
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = file.path;
        const ext = path.extname(file.originalname).toLowerCase();

        let events = [];

        if(ext === ".csv"){
            events = await parseCSV(filePath);
        } else if (ext === ".ics" || ext === ".ical"){
            events = await parseICal(filePath, false);
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: "Unsupported file type" });
        }

        fs.unlinkSync(filePath);

        const uid = req.user.uid;
        const normalizedEvents = normalizeUploadedEvents(events);
        await saveUploadedEvents(uid, normalizedEvents);
        res.json(normalizedEvents);
    } catch(err){
        console.error("UPLOAD ERROR: ", err);
        res.status(500).json({ error: "Failed to process file"});
    }
});

router.get("/events", authMiddleware, async (req, res) => {
    try {
        const uid = req.user.uid;

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const events = userSnap.exists && Array.isArray(userSnap.data()?.events)
            ? userSnap.data().events
            : [];

        const now = new Date();
        const validEvents = [];

        events.forEach((event) => {
            const eventDate = getEventDate(event);
            if (!eventDate || isNaN(eventDate.getTime())) return;
            if (eventDate < now) return;
            validEvents.push({
                ...event,
                id: event?.id ? String(event.id) : `upload-${eventDate.getTime()}`,
            });
        });

        if (validEvents.length !== events.length) {
            await userRef.set({ events: validEvents }, { merge: true });
        }

        res.json(validEvents);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch uploaded events"})
    }
});

router.delete("/events/:id", authMiddleware, async (req, res) => {
    try {
        const uid = req.user.uid;
        const eventId = req.params.id;

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const currentEvents = userSnap.exists && Array.isArray(userSnap.data()?.events)
            ? userSnap.data().events
            : [];
        const filteredEvents = currentEvents.filter(
            (event) => String(event?.id) !== String(eventId)
        );

        if(filteredEvents.length === currentEvents.length) {
            return res.status(400).json({ error: "Event not found" });
        }

        await userRef.set({ events: filteredEvents }, { merge: true });

        res.json({
            success: true,
            message: "Event deleted",
        });
    } catch(err){
        console.error("DELETE EVENT ERROR: ", err);
        res.status(500).json({
            error:"Failed to delete event",
        });
    }
});

export default router;
