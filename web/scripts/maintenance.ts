/** Hourly job: expire listings/offers, expiry warnings, hub status.  Usage: npm run maintenance (e.g. from cron) */
import { runMaintenance } from "@/server/services/admin";

runMaintenance().then((r) => {
  console.log(new Date().toISOString(), "maintenance", JSON.stringify(r));
  process.exit(0);
}, (e) => {
  console.error(e);
  process.exit(1);
});
