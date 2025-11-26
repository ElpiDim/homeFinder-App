import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState([]);
  const [unreadChats, setUnreadChats] = useState(0);
  const [loading, setLoading] = useState(false);

  const recomputeUnreadChats = useCallback((list) => {
    const count = list.filter((c) => (c?.unreadCount || 0) > 0).length;
    setUnreadChats(count);
  }, []);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/conversations');
      const list = Array.isArray(res.data) ? res.data : [];
      setConversations(list);
      recomputeUnreadChats(list);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
      setConversations([]);
      setUnreadChats(0);
    } finally {
      setLoading(false);
    }
  }, [recomputeUnreadChats]);

  const markConversationAsRead = useCallback(
    async (propertyId, otherUserId) => {
      if (!propertyId || !otherUserId) return;
      try {
        await api.patch(`/messages/conversation/${propertyId}/${otherUserId}/read`);
        setConversations((prev) => {
          const updated = prev.map((c) => {
            const propertyMatch = String(c?.property?._id) === String(propertyId);
            const userMatch = String(c?.otherUser?._id) === String(otherUserId);
            if (propertyMatch && userMatch) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          });
          recomputeUnreadChats(updated);
          return updated;
        });
      } catch (err) {
        console.error('Failed to mark conversation as read', err);
      }
    },
    [recomputeUnreadChats]
  );

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setUnreadChats(0);
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg) => {
      if (!msg || !msg.propertyId) return;
      const propertyId = String(msg.propertyId?._id || msg.propertyId);
      const senderId = String(msg.senderId?._id || msg.senderId || '');
      const receiverId = String(msg.receiverId?._id || msg.receiverId || '');
      const currentUserId = String(user.id || user._id || '');

      if (senderId !== currentUserId && receiverId !== currentUserId) return;

      const otherUserId = senderId === currentUserId ? receiverId : senderId;
      const property = msg.propertyId?._id ? msg.propertyId : { _id: propertyId };
      const otherUser = msg.senderId?._id || msg.receiverId?._id ?
        (senderId === currentUserId ? msg.receiverId : msg.senderId) : { _id: otherUserId };

      setConversations((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex(
          (c) => String(c?.property?._id) === propertyId && String(c?.otherUser?._id) === otherUserId
        );

        const unreadIncrement = receiverId === currentUserId ? 1 : 0;
        const lastMessage = {
          _id: msg._id,
          content: msg.content,
          timeStamp: msg.timeStamp,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
        };

        if (idx === -1) {
          updated.push({
            conversationId: `${propertyId}_${otherUserId}`,
            property,
            otherUser,
            lastMessage,
            unreadCount: unreadIncrement,
          });
        } else {
          const existing = updated[idx];
          const existingUnread = existing.unreadCount || 0;
          const mergedUnread = existingUnread + unreadIncrement;
          updated[idx] = {
            ...existing,
            property: existing.property || property,
            otherUser: existing.otherUser || otherUser,
            lastMessage,
            unreadCount: mergedUnread,
          };
        }

        updated.sort(
          (a, b) => new Date(b?.lastMessage?.timeStamp || 0) - new Date(a?.lastMessage?.timeStamp || 0)
        );
        recomputeUnreadChats(updated);
        return updated;
      });
    };

    socket.on('newMessage', handleNewMessage);
    return () => socket.off('newMessage', handleNewMessage);
  }, [socket, user, recomputeUnreadChats]);

  const value = {
    conversations,
    unreadChats,
    loading,
    fetchConversations,
    markConversationAsRead,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export const useMessages = () => useContext(MessageContext);
