import admin from "firebase-admin";

const hasServiceAccountEnv =
  Boolean(process.env.FIREBASE_PROJECT_ID) &&
  Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(process.env.FIREBASE_PRIVATE_KEY);

if (!admin.apps.length) {
  if (hasServiceAccountEnv) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // In Firebase Functions, application default credentials are available.
    admin.initializeApp();
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export { db };
export default admin;
