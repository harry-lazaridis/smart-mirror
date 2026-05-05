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

        events.forEach(even => {
            const ref = db
            .collection("users")
            .doc(uid)
            .collection("uploadedEvents")
            .doc(event.id);

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

export default router;