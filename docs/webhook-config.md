# Webhook Configuration

Register these URLs manually in each provider's dashboard.

---

## Twilio — WhatsApp Sender

**Console path:** [console.twilio.com](https://console.twilio.com) → Messaging → Senders → WhatsApp Senders → select sender → Webhook

| Field | Value |
|-------|-------|
| **Incoming messages (inbound)** | `https://mak-os-desktop.vercel.app/api/webhooks/twilio` |
| **Status callback** | `https://mak-os-desktop.vercel.app/api/webhooks/twilio` |
| **HTTP Method** | POST |

Both inbound and status updates route to the same handler, which distinguishes them by field presence (`MessageStatus` vs `Body`).

---

## Brevo — Email Events

**Dashboard path:** [app.brevo.com](https://app.brevo.com) → Settings → Webhooks → Add a webhook

| Field | Value |
|-------|-------|
| **URL** | `https://mak-os-desktop.vercel.app/api/webhooks/brevo` |
| **HTTP Method** | POST |
| **Events to track** | `delivered`, `opened`, `click`, `bounce`, `spam`, `invalid_email`, `unsubscribed` |

Brevo sends a JSON array per batch. The handler processes each event and updates `outreach_logs` by `brevo_id`.

---

## Bland.ai — Call Events

**Dashboard path:** [app.bland.ai](https://app.bland.ai) → Settings → Webhooks

| Field | Value |
|-------|-------|
| **URL** | `https://mak-os-desktop.vercel.app/api/webhooks/bland` |
| **Events** | Call completed, call failed |

> Bland is currently **disabled** (`BLAND_API_KEY` not configured). Configure this webhook only if you add the key later.

---

## Verification

After registering webhooks, send a test message and confirm:

```sql
-- Inbound WhatsApp appears in outreach_logs
SELECT * FROM outreach_logs WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 5;

-- Status updates flow correctly
SELECT twilio_sid, status FROM outreach_logs WHERE channel = 'whatsapp' ORDER BY created_at DESC LIMIT 5;

-- Brevo events logged
SELECT brevo_id, status FROM outreach_logs WHERE channel = 'email' ORDER BY created_at DESC LIMIT 5;
```
