import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSiteSnapshot } from "@/lib/content-store";
import { subscribeContentUpdates } from "@/lib/content-updates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("scope") === "admin";
  if (admin && !(await isAdminAuthenticated())) return new Response("Unauthorized", { status: 401 });
  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let checking = false;
      let dirty = false;
      let previous = "";
      const write = (message: string) => { if (!closed) controller.enqueue(encoder.encode(message)); };
      const check = async () => {
        if (closed) return;
        if (checking) { dirty = true; return; }
        checking = true;
        try {
          const snapshot = await readSiteSnapshot();
          const revision = admin ? snapshot.adminRevision : snapshot.publicRevision;
          if (revision !== previous) {
            previous = revision;
            write(`event: content\ndata: ${JSON.stringify({ revision, maintenanceEnabled: snapshot.settings.maintenanceEnabled })}\n\n`);
          }
        } catch {
          write(": retrying content read\n\n");
        } finally {
          checking = false;
          if (dirty) { dirty = false; void check(); }
        }
      };
      const unsubscribe = subscribeContentUpdates(() => { void check(); });
      const polling = setInterval(() => { void check(); }, 1000);
      const heartbeat = setInterval(() => write(": heartbeat\n\n"), 10000);
      // Finite connections fit serverless hosts; EventSource reconnects automatically.
      const lifetime = setTimeout(() => dispose(), 45000);
      dispose = () => {
        if (closed) return;
        closed = true;
        clearInterval(polling);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        unsubscribe();
        request.signal.removeEventListener("abort", dispose);
        try { controller.close(); } catch { /* Cancellation already closed the stream. */ }
      };
      request.signal.addEventListener("abort", dispose, { once: true });
      write("retry: 1000\n\n");
      if (request.signal.aborted) dispose();
      else void check();
    },
    cancel() { dispose(); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
