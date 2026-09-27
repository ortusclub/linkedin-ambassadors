"use client";
import { useId, type ReactNode } from "react";

// Native title gives a hover preview; a popover exposes the same details on
// touch and keyboard without expanding the table row or clipping in its scroller.
export function CompactDetail({ children, summary, title, className = "" }: { children: ReactNode; summary: ReactNode; title: string; className?: string }) {
  const id = useId();
  return <>
    <button type="button" popoverTarget={id} title={title} aria-label={title} className={`block max-w-full truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 ${className}`}>{summary}</button>
    <div id={id} popover="auto" className="fixed m-auto max-w-[min(360px,calc(100vw-32px))] rounded-xl border border-gray-200 bg-white p-5 text-sm leading-relaxed text-gray-900 shadow-xl whitespace-normal">
      {children}
      <button type="button" popoverTarget={id} popoverTargetAction="hide" className="mt-3 block text-xs font-semibold text-gray-500 hover:text-gray-900">Close</button>
    </div>
  </>;
}
