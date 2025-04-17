'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSession } from 'next-auth/react';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';

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
    console.log('[ChatInterface] Attempting to connect to socket server...');

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

      if (!authData?.userId) {
        throw new Error('Invalid auth data received from API.');
      }
      console.log(
        '[ChatInterface] Auth data received, connecting to socket server...'
      );
    } catch (fetchError) {
      console.error(
        '[ChatInterface] Failed to fetch socket auth data:',
        fetchError
      );
      setError(`Authentication error: ${fetchError.message}`);
      return;
    }

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: authData,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    });

    newSocket.on('connect', () => {
      console.log(`[ChatInterface] Connected to socket: ${newSocket.id}`);
      setIsConnected(true);
      setError(null);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[ChatInterface] Disconnected from socket: ${reason}`);
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setError('Disconnected from server. Please try again later.');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error(`[ChatInterface] Connection error: ${error.message}`);
      setError('Connection error. Please try again later.');
      setIsConnected(false);
      newSocket.disconnect();
      setSocket(null);
    });

    newSocket.on('receive_message', (message) => {
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
    });

    newSocket.on('messages_error', (errorData) => {
      console.error(`[ChatInterface] Error: ${errorData.message}`);
      setError(errorData.message);
      setTimeout(() => {
        setError(null);
      }, 5000);
    });
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      console.log('[ChatInterface] useEffect cleanup: Disconnecting socket...');
      setSocket((currentSocket) => {
        if (currentSocket) {
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
          console.warn(
            '[ChatInterface] Cannot fetch history: User has no floorId.'
          );
          setHistoryError('Could not determine your floor to fetch history.');
          setIsLoadingHistory(false);
          return;
        }

        console.log(
          `[ChatInterface] Fetching history for floor ${currentUser.floorId}...`
        );
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

          console.log(
            `[ChatInterface] Received ${historyMessages.length} historical messages.`
          );
          setMessages((prevMessages) => {
            const messageIds = new Set(prevMessages.map((m) => m.id));
            const uniqueHistory = historyMessages.filter(
              (m) => !messageIds.has(m.id)
            );
            return [...uniqueHistory, ...prevMessages];
          });
        } catch (err) {
          console.error('[ChatInterface] Failed to fetch chat history:', err);
          setHistoryError(err.message || 'Could not load message history.');
          initialHistoryFetched.current = false;
        } finally {
          setIsLoadingHistory(false);
        }
      };

      fetchHistory();
    }
  }, [isConnected, currentUser, currentUser?.floorId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (event) => {
    event.preventDefault();
    const messageContent = inputValue.trim();

    if (messageContent && socket && isConnected) {
      console.log('[ChatInterface] Sending message:', messageContent);
      socket.emit('send_message', messageContent);
      setInputValue('');
    } else if (!isConnected) {
      setError('Socket is not connected. Please try again later.');
    } else if (!messageContent) {
      setError('Cannot send an empty message.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(space.24))] bg-medium text-accent rounded-lg shadow-lg overflow-hidden border border-light/30">
      <div className="p-3 border-b border-light/30 bg-dark text-sm">
        Floor Chat Status:{' '}
        {isConnected ? (
          <span className="text-green-400">Connected</span>
        ) : (
          <span className="text-red-400">Disconnected</span>
        )}
        {error && <span className="ml-4 text-red-400">{error}</span>}
        {/* Add history status */}
        {isLoadingHistory && (
          <span className="ml-4 text-yellow-400 animate-pulse">
            Loading history...
          </span>
        )}
        {historyError && (
          <span className="ml-4 text-red-400">
            History Error: {historyError}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Conditionally render a loading indicator for history */}
        {isLoadingHistory && (
          <div className="text-center text-white/50 py-4">
            Loading messages...
          </div>
        )}
        {/* Existing message mapping */}
        {!isLoadingHistory &&
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.userId === currentUser?.id ? 'justify-end' : ''
              }`}
            >
              {msg.userId !== currentUser?.id && (
                <Image
                  src={msg.user?.image || '@/default-avatar.svg'}
                  alt={msg.user?.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full mt-1 flex-shrink-0"
                />
              )}

              <div
                className={`p-3 rounded-lg max-w-xs sm:max-w-md md:max-w-lg ${
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
                <p
                  className={`text-xs mt-1 opacity-70 ${
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
              </div>
            </div>
          ))}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="text-center text-white/50 py-4">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-light/30 bg-dark"
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
