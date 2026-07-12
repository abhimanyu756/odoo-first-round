// Cron jobs for AssetFlow. Fleshed out in Phase 8 (overdue flagging,
// booking reminders, booking status rollover). Kept as a no-op stub so the
// server boots before those jobs exist.

let started = false;

function startScheduler() {
  if (started) return;
  started = true;
  // Jobs registered here in Phase 8.
}

module.exports = { startScheduler };
