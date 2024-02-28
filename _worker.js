export default {
  async fetch(request, env) {
    try {
      const queue = env.BG_QUEUE;
      await queue.send({ message: "hello" })
      return new Response(`Sent! request_url: ${request.url} env: ${env.BG_QUEUE}`);
    } catch(error) {
      return new Response(error);
    }
  },
}
