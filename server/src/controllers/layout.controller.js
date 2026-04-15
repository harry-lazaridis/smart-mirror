import { db } from "../config/firebase.js";

export const getLayout = async (req, res) => {
  const userId = req.user.uid;

  const doc = await db.collection("layouts").doc(userId).get();

  if (!doc.exists) {
    return res.json({ widgets: [] });
  }

  res.json(doc.data());
};