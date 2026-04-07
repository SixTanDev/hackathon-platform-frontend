'use client';

import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Shared Markdown renderer component.
 * Uses a safe regex-based approach to transform basic Markdown into HTML.
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = useMemo(() => {
    let text = content ?? '';
    
    // Escape HTML to prevent XSS
    text = escapeHtml(text);

    // Code blocks (restoring after escape)
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre class="bg-muted rounded-lg p-3 overflow-x-auto text-xs my-3 font-mono border border-border/50"><code class="language-${lang ?? ''}">${code.trim()}</code></pre>`;
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary-foreground/90">$1</code>');

    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>');

    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-6 mb-2 text-foreground">$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-8 mb-3 text-foreground border-b border-border/50 pb-1">$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1 class="text-xl font-extrabold mt-10 mb-4 text-foreground border-b-2 border-border pb-2">$1</h1>');

    // Lists (Bullet)
    text = text.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc pl-1 mb-1">$1</li>');
    
    // Lists (Numbered)
    text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal pl-1 mb-1">$1</li>');

    // Blockquotes
    text = text.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary/30 pl-4 py-1 italic bg-muted/20 rounded-r-md my-4">$1</blockquote>');

    // Paragraphs (improved)
    text = text.replace(/\n\n/g, '</p><p class="my-3 leading-relaxed">');
    text = `<p class="my-3 leading-relaxed">${text}</p>`;

    return text;
  }, [content]);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
