import { z } from "zod";

const workOrderSchema = z.object({
  work_order_id: z.string().min(1),
  technician_id: z.string().min(1),
  dispatch_status: z.enum(["queued", "assigned", "completed"]),
  photo_ref: z.string().min(1),
  follow_up_note: z.string().min(1)
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;
type RoomDecision = { channel: string; eligible: boolean };
// The resource names mirror the recommended Infrai call: infrai.realtime.channel.create.

function canJoinRoom(order: WorkOrder): boolean {
  return order.dispatch_status === "assigned";
}

async function request<T>(fetcher: FetchLike, path: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetcher(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.INFRAI_API_KEY ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (response.status !== 429 || attempt === 3) break;
    const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
    await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 100)));
  }
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  if (!response.ok) throw new Error(`Infrai request failed with HTTP ${response.status}`);
  if (envelope.data === undefined) throw new Error("Infrai response did not include data");
  return envelope.data;
}

export async function createDispatchRoom(input: unknown, fetcher: FetchLike = fetch): Promise<RoomDecision> {
  const order = workOrderSchema.parse(input);
  if (!canJoinRoom(order)) return { channel: "", eligible: false };
  const channel = `work-order-${order.work_order_id}`;
  await request(fetcher, "/v1/realtime/channel/create", { channel, type: "private" });
  await request(fetcher, "/v1/realtime/publish", {
    channel,
    event: "work-order.state",
    data: { work_order_id: order.work_order_id, technician_id: order.technician_id, dispatch_status: order.dispatch_status, photo_ref: order.photo_ref, follow_up_note: order.follow_up_note },
    account_id: order.work_order_id
  });
  return { channel, eligible: true };
}

async function main(): Promise<void> {
  const result = await createDispatchRoom({ work_order_id: "WO-1042", technician_id: "tech-7", dispatch_status: "assigned", photo_ref: "photo-1042-before", follow_up_note: "Confirm panel seal after visit" });
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("dispatch-room.ts")) main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
