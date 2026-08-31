'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BotMascot from '@/components/design-system/BotMascot';

const LazyCustomerSupportChat = dynamic(
  () => import('@/components/CustomerSupportChat'),
  { ssr: false }
);

export default function CustomerSupportChatTrigger() {
  const [chatProps, setChatProps] = useState<{
    initialOpen: boolean;
    initialIntent?: string;
  } | null>(null);

  const loadChat = useCallback((intent?: string) => {
    setChatProps(
      (prev) => prev ?? { initialOpen: true, initialIntent: intent }
    );
  }, []);

  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!chatProps) {
        loadChat(detail?.intent);
      }
    };
    window.addEventListener('ruhvi:open-support-chat', handleOpenChat);
    return () =>
      window.removeEventListener('ruhvi:open-support-chat', handleOpenChat);
  }, [chatProps, loadChat]);

  if (!chatProps) {
    return (
      <div
        onClick={() => loadChat()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') loadChat();
        }}
        role="button"
        tabIndex={0}
        className="fixed bottom-20 right-5 z-[100] cursor-pointer"
        aria-label="Open support chat"
      >
        <BotMascot size={70} showGlow={true} state="idle" />
      </div>
    );
  }

  return (
    <LazyCustomerSupportChat
      initialOpen={chatProps.initialOpen}
      initialIntent={chatProps.initialIntent}
    />
  );
}
