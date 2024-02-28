export async function onRequest(context) {
  try {
    await context.env.BG_QUEUE.send({
      message: "hello",
    });
    return new Response("Sent!");
  } catch (error) {
    return new Response("Fail!" + error);
  }
}
