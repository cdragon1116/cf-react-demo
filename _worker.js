export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);

      if (pathname === "/api/auth") {
        const sess = generateSessionKey(32)
        const token = generateSessionKey(50)

        // Set the session cookie
        const cookie = `session=${sess}; Path=/`;
        const headers = new Headers({ "Set-Cookie": cookie });

        const [ok, setkvtime] = await measureExecutionTime(async () => {
          return await setTokenBySession(env, sess, token, 60)
        })

        let message;
        if (ok) {
          message = `Session cookie set! Token: ${token}`
        } else {
          message = 'Failed to set cookie token in kv store'
        }

        return Response.json({
          message: message,
          meta: {
            "x-set-kv-duration": setkvtime + "ms"
          },
          response_headers: Object.fromEntries(headers)
        }, {
          status: 200,
          headers,
        });
      }  else if (pathname === "/queue") {
        const [ok, queuetime] = await measureExecutionTime(async () => {
          return await queuePush(env, { message: "Hello!" })
        })
        let message = ok ? "true" : "false"
        return Response.json({ push: message, meta: { "x-queue-duration": queuetime + "ms" } })
      }  else if (pathname === "/demo-api") {
        const originHeaders = Object.fromEntries(request.headers)
        return Response.json({
          message: "Proxy Success",
          headers: originHeaders,
          url: request.url,
          body: request.body
        }, { status: 200 }
        )
      } else {
        const cookie = request.headers.get("Cookie");
        const sess = extractSessionCookie(cookie);

        const [token, getkvtime] = await measureExecutionTime(async () => {
          return await getTokenBySession(env, sess)
        })


        if (token === null) {
          return Response.json({
            error: "Unauthorized.",
            meta: {
              'x-get-kv-duration': getkvtime + "ms"
            }
          }, { status: 401 })
        }

        const url = new URL(request.url);
        const searchParams = new URLSearchParams(url.search);
        const proxyUrl = `${url.origin}/demo-api` + searchParams.toString();

        let headers = new Headers(request.headers);
        headers.set('authorization', `Bearer ${token}`)
        headers.set('x-cdc-web-proxy-hit', "1")

        const options = {
          method: request.method,
          headers: headers,
          body: request.method === 'GET' ? null : request.body,
          redirect: 'manual'
        };

        const response = await fetch(proxyUrl, options);
        return response
      }

      return Response.json({ message: "success" })
    } catch(error) {
      console.log(error)
      // const queue = env.BG_QUEUE;
      // await queue.send({ error: error })
      return Response.json({ error: `${error}` }, { status: 500 })
    }
  },
}


async function queuePush(env, message) {
  try {
    const queue = env.BG_QUEUE;
    await queue.send(message)
    return true
  } catch(error) {
    console.log(error)
    return false
  }
}

async function setTokenBySession(env, session, token, ttl) {
  try {
    const store = env.SESSION_STORE;
    await store.put(`sid:${session}`, token, { expirationTtl: ttl });
    return true
  } catch(error) {
    console.log(error)
    return false
  }
}
async function getTokenBySession(env, session) {
  try {
    const store = env.SESSION_STORE;
    return await store.get(`sid:${session}`);
  } catch(error) {
    console.log(error)
    return null
  }
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

async function measureExecutionTime(fn) {
  const startTime = Date.now(); // Get current timestamp before executing code
  return fn().then(result => {
    const endTime = Date.now(); // Get current timestamp after executing code
    const executionTime = endTime - startTime; // Calculate elapsed time in milliseconds
    return [result, executionTime];
  });
}

