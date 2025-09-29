const Message = require("../models/messages");

exports.sendMessage = async (req, res) => {
  const { receiverId, propertyId, content } = req.body;
  const senderId = req.user.userId;
  const { io, connectedUsers } = req;

  if (!receiverId || !propertyId || !content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    let newMessage = new Message({ senderId, receiverId, propertyId, content });
    await newMessage.save();

    newMessage = await newMessage
      .populate("senderId receiverId propertyId");

    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
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
