'use client';

import React from 'react';
import ChatInterface from '@/features/chat/components/ChatInterface';

export default function FloorChatPage() {
  return (
    <main className="flex flex-col h-full">
      <div className="flex-grow min-h-0">
        <ChatInterface />
      </div>
    </main>
  );
}
