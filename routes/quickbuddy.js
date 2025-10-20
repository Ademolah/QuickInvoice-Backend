const express = require("express");
const axios = require("axios");
const router = express.Router();
const Invoice = require("../models/Invoice");
const User = require("../models/Users"); // optional if you want name, etc.
const auth = require("../middleware/authMiddleware"); // your auth middleware that sets req.userId
// Helper to create assistant prompt with context (read-only)
function buildPrompt(userSummary, userMessage) {
  return [
    {
      role: "system",
      content:
        "You are Quick Buddy — a friendly, conversational and professional AI assistant inside QuickInvoice NG. " +
        "You speak like a supportive business partner: warm, encouraging and practical. " +
        "You can answer questions about business, finance, productivity, global economy, entrepreneurship, market trends, or general knowledge that could benefit professionals. " +
        "When relevant, reference the user's invoice or payment data from the provided context, but never reveal private data unless directly asked. " +
        "Avoid inappropriate, violent, sexual, hateful, political or religious content. " +
        "If a question is unrelated to business or self-improvement, politely decline or redirect. " +
        "Keep responses short (2-5 sentences), friendly and helpful. " +
        "Under no circumstances should you attempt to modify, write to, access, or provide instructions to access the application's database, backend, or internal systems."+
        "Feel free to add light encouragement or tips when useful."
    },
    {
      role: "user",
      content: `Context summary:\n${userSummary}\n\nUser message:\n${userMessage}`
    }
  ];
}
// POST /api/quickbuddy/message
// Body: { message: string }  (if empty or missing -> backend will return a friendly greeting / summary)
router.post("/message", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const userMessage = (req.body?.message || "").trim();
    // Fetch recent invoices for this user (read-only). Limit to last 100 for performance.
    const invoices = await Invoice.find({ userId }).sort({ createdAt: -1 }).limit(200).lean();
    // Build context summary: unpaid count and unique client names for unpaid invoices + sample totals
    const unpaidInvoices = invoices.filter(i => i.status === "sent");
    const paidInvoices = invoices.filter(i => i.status === "paid");
    const unpaidCount = unpaidInvoices.length;
    const paidCount = paidInvoices.length;
    const totalCount = invoices.length;
    const uniqueUnpaidClients = Array.from(new Set(unpaidInvoices.map(i => i.clientName).filter(Boolean))).slice(0, 6);
    const topClientsText = uniqueUnpaidClients.length ? uniqueUnpaidClients.join(", ") : "None";
    const recentSample = invoices.slice(0, 5).map(i => {
      return `- ${i.clientName || "Unknown"} • ${i.total ?? 0} ${i.currency || "NGN"} • ${new Date(i.createdAt).toLocaleDateString()}`;
    }).join("\n") || "No recent invoices.";
    const userSummary = [
      `Invoice totals: total=${totalCount}, paid=${paidCount}, unpaid=${unpaidCount}.`,
      `Unpaid clients (sample): ${topClientsText}.`,
      `Recent invoices (up to 5):\n${recentSample}`,
      "Note: statuses are 'paid' (settled) or 'sent' (unpaid)."
    ].join("\n");
    // If frontend sends empty message, create a friendly greeting that uses the context
    const defaultMessage = userMessage || "Please provide a short, professional summary for my invoices / tell me next steps.";
    const messages = buildPrompt(userSummary, defaultMessage);
    // Call OpenAI Chat Completions (replace model if desired)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ success: false, message: "OpenAI API key not configured on server." });
    }
    const openaiResp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini", // replace with preferred model; env override supported
        messages,
        max_tokens: 250,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      }
    );
    const assistantText =
      openaiResp?.data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response right now.";
    // Return assistant response AND lightweight context summary to client for display if needed
    return res.json({
      success: true,
      reply: assistantText.trim(),
      context: {
        totalCount,
        paidCount,
        unpaidCount,
        unpaidClients: uniqueUnpaidClients,
      },
    });
  } catch (err) {
    console.error("QuickBuddy error:", err?.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "QuickBuddy failed to respond." });
  }
});
module.exports = router;