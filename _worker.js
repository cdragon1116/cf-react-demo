export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);

      if (pathname === "/api/auth") {
        const sess = generateSessionKey(32)
        const token = generateSessionKey(50)

        // Set the session cookie
        const cookie = `session=${sess}`;
        const headers = new Headers({ "Set-Cookie": cookie });

        const store = env.SESSION_STORE;
        await store.put(`sid:${sess}`, token, { expirationTtl: 60 });

        return new Response(`Session cookie set ${sess}`, {
          status: 200,
          headers,
        });
      }  else if (pathname === "/queue") {
        const queue = env.BG_QUEUE;
        await queue.send({ message: "Hello!" })
      } else {
        const cookie = request.headers.get("Cookie");
        const sess = extractSessionCookie(cookie);

        const store = env.SESSION_STORE;
        const token = await store.get(`sid:${sess}`);

        return Response.json({ current_session: sess, token: token }, { status: 200 })
      }
    } catch(error) {
      console.log(error)
      // const queue = env.BG_QUEUE;
      // await queue.send({ error: error })
      return Response.json({ error: `${error}` }, { status: 500 })
    }
  },
}


function generateSessionKey(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let sessionKey = "";
  for (let i = 0; i < length; i++) {
    sessionKey += characters.charAt(
      Math.floor(Math.random() * charactersLength),
    );
  }
  return sessionKey;
}


function extractSessionCookie(cookieHeader) {
  if (!cookieHeader) return "No session cookie found";
  const sessionCookie = cookieHeader.split("; ").find((cookie) =>
    cookie.startsWith("session=")
  );
  return sessionCookie ? sessionCookie.split("=")[1] : "No session cookie found";
}
