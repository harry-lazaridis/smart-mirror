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

        const batch = db.batch();

        events.forEach(event => {
            const ref = db
            .collection("users")
            .doc(uid)
            .collection("events")
            .doc(event.id || db.collection("_").doc().id);

            batch.set(ref, {
                ...event,
                source: "upload",
                createdAt: new Date()
            });
        });

        await batch.commit();
        
        res.json(events);
    } catch(err){
        console.error("UPLOAD ERROR: ", err);
        res.status(500).json({ error: "Failed to process file"});
    }
});

router.get("/events", authMiddleware, async (req, res) => {
    try {
        const uid = req.user.uid;

        const eventsRef = await db
            .collection("users")
            .doc(uid)
            .collection("events");

        const snapshot = await eventsRef.get();

        const now = new Date();

        const batch = db.batch();
        const validEvents = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            let eventDate = null;

            if(data.start?.dateTime){
                eventDate = new Date(data.start.dateTime);
            }else if(data.start?.date){
                eventDate = new Date(data.start.date);
            }else if(data.start?._seconds){
                eventDate = new Date(data.start._seconds * 1000);
            }else if(typeof data.start ==="string"){
                eventDate = new Date(data.start);
            }

            if(!eventDate || isNaN(eventDate.getTime())) {
                batch.delete(doc.ref);
                return;
            }

            if(eventDate < now){
                batch.delete(doc.ref);
                return;
            }

            validEvents.push({
                id: doc.id,
                ...data,
            });
        });

        await batch.commit();

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

        const eventRef = db
        .collection("users")
        .doc(uid)
        .collection("events")
        .doc(eventId);

        const doc = await eventRef.get();

        if(!doc.exists) {
            return res.status(400).json({ error: "Event not found" });
        }

        await eventRef.delete();

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