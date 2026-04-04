'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-11 items-center justify-center rounded-2xl border border-border/60 bg-[linear-gradient(180deg,hsl(var(--muted))/0.95,rgba(226,232,240,0.72))] p-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:bg-[linear-gradient(180deg,rgba(17,27,37,0.96),rgba(17,27,37,0.78))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-foreground hover:bg-white/55 dark:hover:bg-white/5 data-[state=active]:bg-[linear-gradient(135deg,rgba(26,127,179,0.18),rgba(53,161,157,0.14))] data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_18px_rgba(26,127,179,0.12),inset_0_1px_0_rgba(255,255,255,0.45)] dark:data-[state=active]:bg-[linear-gradient(135deg,rgba(26,127,179,0.28),rgba(53,161,157,0.18))] dark:data-[state=active]:text-white dark:data-[state=active]:shadow-[0_10px_22px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)]',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
