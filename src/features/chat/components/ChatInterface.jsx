'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import { Trash2 } from 'lucide-react';

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';

export default function ChatInterface() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const currentUser = useSelector(selectUserProfile);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const messagesEndRef = useRef(null);
  const initialHistoryFetched = useRef(false);

  const connectSocket = useCallback(async () => {
    setError(null);
    let authData = null;
    try {
      const response = await fetch('/api/auth/socket-token');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to get socket auth data (${response.status})`
        );
      }
      authData = await response.json();
      if (!authData?.userId)
        throw new Error('Invalid auth data received from API.');
    } catch (fetchError) {
      setError(`Authentication error: ${fetchError.message}`);
      return;
    }
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: authData,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    });
    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      setSocket(newSocket);
    });
    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      setSocket(null);
      if (reason !== 'io client disconnect') {
        setError('Disconnected from server. Retrying connection...');
      }
    });
    newSocket.on('connect_error', () => {
      setError('Connection error. Please check server or network.');
      setIsConnected(false);
      setSocket(null);
    });
    newSocket.on('receive_message', (message) => {
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === message.id)) return prevMessages;
        return [...prevMessages, message];
      });
    });
    newSocket.on('message_error', (errorData) => {
      setError(errorData.error || 'An error occurred.');
      setTimeout(() => {
        setError(null);
      }, 5000);
    });
    newSocket.on('message_deleted', ({ messageId }) => {
      setMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== messageId)
      );
    });
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      setSocket((currentSocket) => {
        if (currentSocket && currentSocket.connected) {
          currentSocket.disconnect();
        }
        return null;
      });
      setIsConnected(false);
    };
  }, [connectSocket]);

  useEffect(() => {
    if (isConnected && currentUser?.id && !initialHistoryFetched.current) {
      const fetchHistory = async () => {
        if (!currentUser.floorId) {
          setHistoryError('Could not determine your floor to fetch history.');
          setIsLoadingHistory(false);
          return;
        }
        setIsLoadingHistory(true);
        setHistoryError(null);
        initialHistoryFetched.current = true;
        try {
          const response = await fetch(
            `/api/floors/${currentUser.floorId}/chat/history`
          );
          const historyMessages = await response.json();
          if (!response.ok) {
            throw new Error(
              historyMessages.error ||
                `Failed to fetch history (${response.status})`
            );
          }
          setMessages((prevMessages) => {
            const messageIds = new Set(prevMessages.map((m) => m.id));
            const uniqueHistory = historyMessages.filter(
              (m) => !messageIds.has(m.id)
            );
            const sortedHistory = uniqueHistory.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            return [...sortedHistory, ...prevMessages];
          });
        } catch (err) {
          setHistoryError(err.message || 'Could not load message history.');
          initialHistoryFetched.current = false;
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [isConnected, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (event) => {
    event.preventDefault();
    const messageContent = inputValue.trim();
    if (messageContent && socket && isConnected) {
      socket.emit('send_message', messageContent);
      setInputValue('');
    } else if (!isConnected) {
      setError('Not connected to chat server.');
    } else if (!messageContent) {
      setError('Cannot send an empty message.');
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket || !isConnected) {
      setError('Not connected, cannot delete message.');
      return;
    }
    if (!messageId) return;
    if (window.confirm('Are you sure you want to delete this message?')) {
      socket.emit('delete_message', messageId);
    }
  };

  return (
    <div className="flex flex-col h-[calc(85vh-theme(space.24))] bg-medium text-accent rounded-lg shadow-lg overflow-hidden border border-light/30">
      <div className="p-3 border-b border-light/30 bg-dark text-sm">
        Status: {''}
        {isConnected ? (
          <span className="text-green-400">Connected</span>
        ) : (
          <span className="text-red-400">Disconnected</span>
        )}
        {isLoadingHistory && (
          <span className="ml-4 text-yellow-400 animate-pulse">
            {' '}
            Loading history...
          </span>
        )}
        {error && <span className="ml-4 text-red-400">{error}</span>}
        {historyError && !isLoadingHistory && (
          <span className="ml-4 text-red-400">
            {' '}
            History Error: {historyError}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 ">
        {isLoadingHistory && messages.length === 0 && (
          <div className="text-center text-white/50 py-4">
            Loading messages...
          </div>
        )}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="text-center text-white/50 py-4">
            {' '}
            No messages yet. Start the conversation!{' '}
          </div>
        )}
        {messages.map((msg) => {
          const canDelete =
            (currentUser && msg.userId && currentUser.id === msg.userId) ||
            currentUser?.role === 'admin' ||
            currentUser?.role === 'RA';
          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-3 ${
                msg.userId === currentUser?.id ? 'justify-end' : ''
              }`}
            >
              {msg.userId !== currentUser?.id && (
                <Image
                  src={msg.user?.image || '/default-avatar.svg'}
                  alt={msg.user?.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full mt-1 flex-shrink-0 bg-dark"
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.svg';
                  }}
                />
              )}
              <div
                className={`relative px-3 pt-2 pb-1 rounded-lg max-w-xs sm:max-w-md md:max-w-lg ${
                  msg.userId === currentUser?.id
                    ? 'bg-brand text-white'
                    : 'bg-dark text-accent'
                }`}
              >
                {msg.userId !== currentUser?.id && (
                  <p className="text-xs font-semibold text-brand mb-1">
                    {msg.user?.name || 'Unknown User'}
                  </p>
                )}
                <p className="text-sm break-words">{msg.content}</p>
                <div className="flex items-center justify-start gap-2 mt-1">
                  <p
                    className={`text-xs opacity-70 ${
                      msg.userId === currentUser?.id
                        ? 'text-white/70'
                        : 'text-accent/70'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete message"
                      className={`p-0.5 rounded text-white/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 ${
                        msg.userId === currentUser?.id
                          ? 'hover:text-red-300'
                          : 'hover:text-red-500'
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-light/30 bg-dark flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isConnected ? 'Type your message...' : 'Connecting...'}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputValue.trim()}
            className="px-4 py-2 rounded-md bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
