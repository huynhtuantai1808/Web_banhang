"use client";

import React from "react";

interface RichContentProps {
  html: string | null | undefined;
}

export default function RichContent({ html }: RichContentProps) {
  if (!html) return null;

  return (
    <div
      className="rich-content text-sm text-circuit-text leading-relaxed space-y-4"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        // Word-like typography
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    />
  );
}
