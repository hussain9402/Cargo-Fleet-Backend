type GoogleTokenInfo = {
  aud: string;
  sub: string;
  email: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  exp: string;
};

export async function verifyGoogleIdToken(idToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    throw new Error('INVALID_GOOGLE_TOKEN');
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  const allowedClients = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);

  if (!allowedClients.length) {
    throw new Error('GOOGLE_NOT_CONFIGURED');
  }

  if (!allowedClients.includes(payload.aud)) {
    throw new Error('INVALID_GOOGLE_TOKEN');
  }

  if (payload.email_verified === 'false') {
    throw new Error('GOOGLE_EMAIL_NOT_VERIFIED');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
  };
}
