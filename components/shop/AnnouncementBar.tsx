'use client';

import { useEffect, useState } from 'react';

interface AnnouncementBarProps {
  messages: string[];
}

export function AnnouncementBar({ messages }: AnnouncementBarProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="bg-[#1E3A5F] text-white py-2 px-4 text-center text-sm overflow-hidden">
      <div
        className="transition-opacity duration-500"
        key={currentIndex}
      >
        {messages[currentIndex]}
      </div>
    </div>
  );
}
