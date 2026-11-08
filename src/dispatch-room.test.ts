import { createDispatchRoom } from "./dispatch-room.ts";

const queued = await createDispatchRoom({ work_order_id: "WO-1", technician_id: "tech-1", dispatch_status: "queued", photo_ref: "photo-1", follow_up_note: "Await assignment" }, async () => { throw new Error("network should not run"); });
if (queued.eligible !== false || queued.channel !== "") throw new Error("queued work orders must stay out of the room");

console.log("dispatch decision passed: queued work orders are not eligible");
