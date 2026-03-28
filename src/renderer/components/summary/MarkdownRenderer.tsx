import ReactMarkdown from 'react-markdown';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-md font-semibold text-text first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-semibold text-text">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed text-text/85">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-inside list-disc space-y-1 text-sm text-text/85">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-inside list-decimal space-y-1 text-sm text-text/85">{children}</ol>
          ),
          li: ({ children }) => <li className="text-sm text-text/85">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs text-accent">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
