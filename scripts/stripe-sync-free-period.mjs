// Moves every provider subscription's free period to the real launch-based date
// once MEMBER_LAUNCH_DATE is known (experts: +6 months, founding experts: +12,
// partners: +6; ladder schedules also move their $149 phase start by 12 months).
//
//   node scripts/stripe-sync-free-period.mjs            # dry run
//   node scripts/stripe-sync-free-period.mjs --apply    # update Stripe
//   node scripts/stripe-sync-free-period.mjs --live --apply
//
// The webhook mirrors the new trial_end onto the experts / partners rows.
import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local", override: true });

const live = process.argv.includes("--live");
const apply = process.argv.includes("--apply");
const key = (live ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_SECRET_KEY) ?? "";
if (live && !/^(sk|rk)_live_/.test(key)) { console.error("--live needs STRIPE_LIVE_SECRET_KEY. Aborting."); process.exit(1); }
if (!live && !/^(sk|rk)_test_/.test(key)) { console.error("STRIPE_SECRET_KEY must be a TEST key. Aborting."); process.exit(1); }
const raw = (process.env.MEMBER_LAUNCH_DATE ?? "").trim();
if (!raw) { console.error("MEMBER_LAUNCH_DATE is not set in .env.local (YYYY-MM-DD). Aborting."); process.exit(1); }
const launch = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
if (Number.isNaN(launch.getTime())) { console.error(`MEMBER_LAUNCH_DATE "${raw}" is invalid. Aborting.`); process.exit(1); }

const addMonths = (d, m) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate()));
const sec = (d) => Math.floor(d.getTime() / 1000);
const stripe = new Stripe(key);
console.log(`${apply ? "APPLY" : "DRY RUN"} · launch ${launch.toISOString().slice(0, 10)} · ${live ? "LIVE" : "test"}`);

let n = 0;
for await (const sub of stripe.subscriptions.list({ status: "trialing", limit: 100, expand: ["data.schedule"] })) {
  const audience = sub.metadata?.audience;
  if (audience !== "expert" && audience !== "partner") continue;
  const founding = sub.metadata?.rate === "founding_expert";
  const months = audience === "expert" && founding ? 12 : 6;
  const end = addMonths(launch, months);
  if (end.getTime() <= Date.now()) { console.log(`skip ${sub.id} (${audience}): launch-based end already passed`); continue; }
  const current = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString().slice(0, 10) : "none";
  if (sub.trial_end === sec(end)) { console.log(`ok    ${sub.id} (${audience}) already ${current}`); continue; }
  const schedule = typeof sub.schedule === "string" ? await stripe.subscriptionSchedules.retrieve(sub.schedule) : sub.schedule;
  console.log(`${apply ? "update" : "would"}  ${sub.id} (${audience}${schedule ? ", schedule" : ""}) trial_end ${current} -> ${end.toISOString().slice(0, 10)}`);
  n += 1;
  if (!apply) continue;
  if (schedule) {
    const standard = addMonths(end, 12);
    const phases = schedule.phases.map((ph, i) => ({
      items: ph.items.map((it) => ({ price: typeof it.price === "string" ? it.price : it.price.id, quantity: it.quantity ?? 1 })),
      metadata: { ...(ph.metadata ?? {}), free_period_ends_at: end.toISOString(), standard_starts_at: standard.toISOString(), free_period: "launch_based" },
      ...(i === 0 ? { start_date: ph.start_date, trial_end: sec(end), end_date: sec(standard) } : { start_date: sec(standard) }),
    }));
    await stripe.subscriptionSchedules.update(schedule.id, { phases, metadata: { ...(schedule.metadata ?? {}), free_period_ends_at: end.toISOString(), standard_starts_at: standard.toISOString(), free_period: "launch_based" } });
  } else {
    await stripe.subscriptions.update(sub.id, { trial_end: sec(end), proration_behavior: "none", metadata: { ...sub.metadata, free_period_ends_at: end.toISOString(), free_period: "launch_based" } });
  }
}
console.log(`${n} subscription${n === 1 ? "" : "s"} ${apply ? "updated" : "to update"}.`);
