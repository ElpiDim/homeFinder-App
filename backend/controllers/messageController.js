const mongoose = require("mongoose");
const Message = require("../models/messages");
const Property = require("../models/property");
const User = require("../models/user");

exports.sendMessage = async (req, res) => {
  const { receiverId, propertyId, content } = req.body;
  const senderId = req.user.userId;

  if (!receiverId || !propertyId || !content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    let newMessage = new Message({ senderId, receiverId, propertyId, content, readBy: [senderId] });
    await newMessage.save();

    // Populate details before sending via socket
    newMessage = await newMessage.populate("senderId receiverId propertyId");

    const io = req.app.get('io');
    if (io) {
      // Emit to receiver's room
      io.to(receiverId).emit('newMessage', newMessage);
      // Emit to sender's room, for UI sync across multiple devices/tabs
      io.to(senderId).emit('newMessage', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error("Error sending message:", err);
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

exports.getConversations = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.userId);

  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"],
          },
          readBySafe: { $ifNull: ["$readBy", []] },
        },
      },
      { $sort: { timeStamp: -1 } },
      {
        $group: {
          _id: { propertyId: "$propertyId", otherUser: "$otherUser" },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", userId] },
                    { $not: [{ $in: [userId, "$readBySafe"] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: Property.collection.name,
          localField: "_id.propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: "$property" },
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id.otherUser",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      { $unwind: "$otherUser" },
      {
        $project: {
          conversationId: {
            $concat: [
              { $toString: "$_id.propertyId" },
              "_",
              { $toString: "$_id.otherUser" },
            ],
          },
          property: {
            _id: "$property._id",
            title: "$property.title",
            images: { $ifNull: ["$property.images", []] },
            location: "$property.location",
          },
          otherUser: {
            _id: "$otherUser._id",
            name: "$otherUser.name",
            email: "$otherUser.email",
            profilePicture: "$otherUser.profilePicture",
          },
          lastMessage: {
            _id: "$lastMessage._id",
            content: "$lastMessage.content",
            timeStamp: "$lastMessage.timeStamp",
            senderId: "$lastMessage.senderId",
            receiverId: "$lastMessage.receiverId",
          },
          unreadCount: 1,
        },
      },
      { $sort: { "lastMessage.timeStamp": -1 } },
    ]);

    res.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markConversationAsRead = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const { propertyId, otherUserId } = req.params;

  try {
    const propertyObjectId = new mongoose.Types.ObjectId(propertyId);
    const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);

    await Message.updateMany(
      {
        propertyId: propertyObjectId,
        $or: [
          { senderId: userId, receiverId: otherUserObjectId },
          { senderId: otherUserObjectId, receiverId: userId },
        ],
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ message: "Conversation marked as read" });
  } catch (err) {
    console.error("Error marking conversation as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};
