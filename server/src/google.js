import { google } from "googleapis"

export function createOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback"
  );
}

const oauth2Client = createOAuth2Client();
export default oauth2Client;
