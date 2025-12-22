const cron = require("node-cron");



const sendUnpaidInvoiceReminders = require("../services/unpaidInvoicesReminder");
function startInvoiceReminderCron() {
  // Runs every 4 days at 9am
  cron.schedule("0 9 */4 * *", async () => {
    try {
      await sendUnpaidInvoiceReminders();
    } catch (err) {
      console.error("Invoice reminder cron failed:", err);
    }
  });
}
module.exports = startInvoiceReminderCron;


// const cron = require("node-cron");



// const sendUnpaidInvoiceReminders = require("../services/unpaidInvoicesReminder");
// function startInvoiceReminderCron() {
//   // Runs every 4 days at 9am
//   cron.schedule("*/2 * * * *", async () => {
//     try {
//       await sendUnpaidInvoiceReminders();
//     } catch (err) {
//       console.error("Invoice reminder cron failed:", err);
//     }
//   });
// }
// module.exports = startInvoiceReminderCron;
