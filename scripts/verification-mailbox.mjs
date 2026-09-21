// Loopback-only mailbox for isolated browser verification. Never delivers mail.
import http from "node:http";
import { randomUUID } from "node:crypto";
const messages = [];
const server = http.createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method === "POST" && request.url === "/api/v1/send") {
    let raw = "";
    for await (const part of request) {
      raw += part;
      if (raw.length > 2_000_000) { response.writeHead(413).end(); return; }
    }
    const message = JSON.parse(raw);
    const ID = randomUUID();
    messages.unshift({ ID, Subject: message.Subject, To: message.To.map(to => ({ Address: to.Email })), HTML: message.HTML });
    response.end(JSON.stringify({ ID }));
    return;
  }
  if (request.method === "GET" && request.url?.startsWith("/api/v1/messages")) {
    response.end(JSON.stringify({ messages })); return;
  }
  if (request.method === "GET" && request.url?.startsWith("/api/v1/message/")) {
    const message = messages.find(item => item.ID === request.url.split("/").at(-1));
    response.writeHead(message ? 200 : 404).end(JSON.stringify(message ?? {})); return;
  }
  response.writeHead(404).end("{}");
});
server.listen(8026, "127.0.0.1", () => console.log("Isolated verification mailbox listening on loopback:8026"));
