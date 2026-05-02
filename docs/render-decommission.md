# Render Decommission Checklist

Steps to shut down the MAK OS v1 Render deployment once mak-os-desktop is confirmed stable.

---

## Pre-decommission verification

- [ ] All Phase A–D features smoke-tested on `mak-os-desktop.vercel.app`
- [ ] Drain-jobs GitHub Actions cron running green for ≥ 24h
- [ ] At least one full Orchestrator → Research → Enrichment → Outreach cycle verified in production
- [ ] Existing contacts/leads migrated or confirmed accessible in Supabase
- [ ] Webhook URLs updated in Twilio / Brevo dashboards to point to Vercel (see `docs/webhook-config.md`)

---

## Decommission steps

1. **Update MakOSv1App** — Change `V1_BASE` in `src/components/apps/mak-os-v1/MakOSv1App.tsx` from `https://mak-os.vercel.app` to a "decommissioned" notice, or remove the app icon from the Desktop entirely.

2. **Render dashboard** — Go to [dashboard.render.com](https://dashboard.render.com), find the `mak-os` service, click **Settings → Delete Service**.

3. **Environment variables** — Any secrets that were only in Render (e.g. old DB URLs, API keys) can be revoked once the service is deleted.

4. **DNS / custom domain** — If `mak-os.vercel.app` or a custom domain was pointed at Render, update or remove the DNS record.

5. **Webhook cleanup** — If Bland.ai was configured to call the old Render URL, remove or update those webhooks in [app.bland.ai](https://app.bland.ai).

---

## Post-decommission

- [ ] Confirm no traffic to Render URL (check Render logs one last time)
- [ ] Archive Render env vars in a secure note before deleting
- [ ] Close this checklist by committing `docs/render-decommission.md` with `[x]` on all items
