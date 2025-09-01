const Message = require("../models/messages");

exports.sendMessage = async (req, res) => {
  const { receiverId, propertyId, content } = req.body;
  const senderId = req.user.userId;

  if (!receiverId || !propertyId || !content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const newMessage = new Message({ senderId, receiverId, propertyId, content });
    await newMessage.save();
    res.status(201).json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMessagesForUser = async (req, res) => {
  const userId = req.user.userId;
  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({timeStamp: 1})
      .populate("senderId receiverId propertyId");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
