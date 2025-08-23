// Swap this implementation to Paystack/Flutterwave later.
module.exports = {
  async chargeCardPresent({ amount, reference, userId, cardToken }) {
    // TODO: integrate provider SDK/API. Use userId to fetch user's accountDetails if splitting payouts.
    // Simulate network + approval
    await new Promise(r => setTimeout(r, 1200));
    const approved = Boolean(cardToken); // mock success if we got a “token”
    return {
      success: approved,
      settledTo: approved ? "BANK-ACCOUNT-ON-FILE" : null,
    };
  },
};
