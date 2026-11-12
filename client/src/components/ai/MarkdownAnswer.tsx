import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Check, Copy } from 'lucide-react';

/**
 * Renders AI answers as markdown with tables, code blocks and KaTeX math.
 * The copy button keeps the raw markdown so students can paste it elsewhere.
 */
export default function MarkdownAnswer({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text stays selectable */
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy answer"
        className="absolute -top-1 right-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 opacity-0 shadow-sm transition hover:text-slate-800 focus:opacity-100 group-hover:opacity-100 sm:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <div className="pr-14 text-sm leading-relaxed text-slate-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-2 mt-4 font-display text-lg font-bold text-slate-900">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-2 mt-4 font-display text-base font-bold text-slate-900">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-primary-700">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="mb-1 mt-3 text-sm font-semibold text-slate-900">{children}</h4>
            ),
            p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="mb-2.5 ml-1 list-disc space-y-1 pl-4 marker:text-primary-400">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2.5 ml-1 list-decimal space-y-1 pl-4 marker:text-primary-400">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
            em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
            blockquote: ({ children }) => (
              <blockquote className="mb-2.5 border-l-4 border-primary-200 bg-primary-50/50 py-1 pl-3 text-slate-600">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-800"
              >
                {children}
              </a>
            ),
            hr: () => <hr className="my-4 border-slate-200" />,
            table: ({ children }) => (
              <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-xs">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-50 text-slate-700">{children}</thead>,
            th: ({ children }) => (
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border-b border-slate-100 px-3 py-2 align-top">{children}</td>
            ),
            pre: ({ children }) => (
              <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100 scrollbar-thin">
                {children}
              </pre>
            ),
            code: ({ className, children }) => {
              const isBlock = typeof className === 'string' && className.includes('language-');
              if (isBlock) return <code className={className}>{children}</code>;
              return (
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-primary-800">
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
