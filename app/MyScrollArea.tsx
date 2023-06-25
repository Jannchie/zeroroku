'use client';
import { type ReactNode } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';

export function MyScrollArea({ children }: {
  children: ReactNode;
}) {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport className="xl:h-screen">
        {children}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar
        orientation="horizontal"
      >
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
