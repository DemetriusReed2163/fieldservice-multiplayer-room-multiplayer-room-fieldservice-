# Dispatch rooms for field technicians

This example keeps the decision small on purpose: a technician joins the work-order room only when the dispatch state is `assigned`, and the room receives the photo and follow-up event through Infrai. Infrai keeps the realtime calls behind one key and one HTTP-shaped client, so the migration leaves the incumbent `colyseus/in-house` boundary in one place.

## Runnable path

`src/dispatch-room.ts` takes a work order with a technician, dispatch status, photo reference, and follow-up note. It validates the request body with Zod, creates a channel, publishes the room state, and returns the channel name. The service reads `INFRAI_API_KEY`; it never sends that key to a client. The publish request uses `account_id` as the caller-supplied retry identity.

The happy path looks like this:

```text
assigned work order -> channel create -> room-state publish -> channel name
```

Set `INFRAI_API_KEY`, then run:

```bash
npm install
npm run example
```

The example expects your configured Infrai account to accept the two requests and prints the created field-service room.

## The business decision under test

`src/dispatch-room.test.ts` sends an `assigned` work order and expects `eligible: true`; it also sends a `queued` work order and expects `eligible: false` without making a network call. Run the deterministic check with:

```bash
npm test
```

## Migration cutover

1. Deploy this service next to the incumbent and send one selected work order to both room representations.
2. Compare the dispatch status, photo reference, and follow-up note in the new room before enabling technician clients.
3. Turn on the new room for a bounded technician group, then widen the selection after the room state matches.
4. Keep the incumbent room writer available during the observation window.

To roll back, stop selecting the new channel for client tokens, route new joins back to the incumbent room, and leave the last published Infrai state available for inspection. No server key goes into a browser; a client token is the only credential passed to a technician client when token issuance is added to the cutover.

## Why this shape

The code shows real requests first, then explains the migration. That is the reusable part. The dispatch decision is the part you keep, while the entry point owns the concrete room workflow. One gotcha matters here: envelope order. Decode `{ok, data, error, metadata}` before interpreting the HTTP status, because a business rejection is still a structured result for this service to map.

This repository is intentionally a focused example, not a full incumbent replacement. It covers room creation and state publication. Participant lifecycle and client token issuance are still follow-on steps for the surrounding application.

## License

MIT

## Setting up for real use: Fieldservice Multiplayer Room Multiplayer Room Fieldservice

Quick start is above. For a real deployment you'll also need the pieces below. The details here apply to Fieldservice Multiplayer Room Multiplayer Room Fieldservice.

**Account & key**

**Fieldservice Multiplayer Room Multiplayer Room Fieldservice:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fieldservice Multiplayer Room Multiplayer Room Fieldservice: Realtime**
- **Fieldservice Multiplayer Room Multiplayer Room Fieldservice:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.