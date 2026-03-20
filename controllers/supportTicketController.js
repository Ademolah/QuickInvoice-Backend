const SupportTicket = require('../models/SupportTicket');

// 1. Fetch Chat History
exports.getSupportHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find the most recent open or pending ticket
    const ticket = await SupportTicket.findOne({ 
      userId, 
      status: { $in: ['open', 'pending'] } 
    }).sort({ updatedAt: -1 });

    if (!ticket) {
      return res.status(200).json({ messages: [], status: 'none' });
    }

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve history", error: error.message });
  }
};

// 2. Send Message (Context-Aware)
exports.sendMessage = async (req, res) => {
  try {
    const { text, context } = req.body;
    const userId = req.userId;

    // Check for an existing open or pending ticket
    let ticket = await SupportTicket.findOne({ 
      userId, 
      status: { $in: ['open', 'pending'] } 
    });

    if (!ticket) {
      ticket = new SupportTicket({
        userId,
        businessContext: context?.businessName || "Unknown Business",
        activePath: context?.page || "Unknown Page",
        userPlan: context?.plan || "Free",
        messages: []
      });
    }

    const userMessage = {
      sender: 'user',
      text: text,
      createdAt: new Date(),
      isRead: false
    };

    ticket.messages.push(userMessage);
    ticket.status = 'pending'; 
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // ⚡ REAL-TIME TRIGGER: Notify all Admins of the new message
    if (global.io) {
      global.io.emit('admin_new_message', { 
        ticketId: ticket._id, 
        message: userMessage,
        businessName: ticket.businessContext,
        userName: req.user?.name || "New Client" // Assuming req.user is populated by auth middleware
      });
    }

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error("Support Send Error:", error);
    res.status(500).json({ message: "Message delivery failed" });
  }
};

// 3. Mark as Read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    
    await SupportTicket.findOneAndUpdate(
      { userId, status: 'pending' },
      { $set: { "messages.$[].isRead": true } } // Marks all messages as read
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// 4. Admin: Fetch All Active Conversations
exports.adminGetAllThreads = async (req, res) => {
  try {
    // Fetch tickets that are 'pending' (user waiting) or 'open' (active chat)
    const threads = await SupportTicket.find({ 
      status: { $in: ['pending', 'open'] } 
    })
    .populate('userId', 'name email businessName') // Get user details for the UI
    .sort({ lastMessageAt: -1 });

    res.status(200).json({ success: true, threads });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch threads" });
  }
};

// 5. Admin: Reply to a User
exports.adminReply = async (req, res) => {
  try {
    const { ticketId, text } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Thread not found" });

    const adminMessage = {
      sender: 'admin',
      text: text,
      createdAt: new Date(),
      isRead: false
    };

    ticket.messages.push(adminMessage);
    ticket.status = 'open'; 
    ticket.lastMessageAt = new Date();

    await ticket.save();

    // ⚡ REAL-TIME TRIGGER: Send specifically to the User's unique room
    if (global.io) {
      global.io.to(ticketId.toString()).emit('receive_reply', {
        message: adminMessage,
        ticketId: ticketId
      });
    }

    res.status(200).json({ success: true, message: adminMessage });
  } catch (error) {
    console.error("Admin Reply Error:", error);
    res.status(500).json({ message: "Reply failed to send" });
  }
};

// 6. Admin: Mark all messages in a thread as read
exports.adminMarkRead = async (req, res) => {
  try {
    const { ticketId } = req.body;

    // This updates EVERY message in the messages array to isRead: true
    await SupportTicket.findByIdAndUpdate(ticketId, {
      $set: { "messages.$[].isRead": true },
      // Optional: If you want to move it from 'pending' to 'open' automatically
      status: 'open' 
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ message: "Failed to update read status" });
  }
};