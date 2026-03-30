import ReactMarkdown from 'react-markdown';
import HighlightText from '../shared/HighlightText';
import { useCardSearch } from '../workspace/CardSearchContext';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  const { query, activeMatchIndex } = useCardSearch();
  return (
    <div className="max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 text-lg font-bold text-text first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-md font-semibold text-text first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-semibold text-text">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2 text-sm font-medium text-text">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-sm leading-relaxed text-text/85">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-text/85">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-text/85">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-text/85">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text/80">{children}</em>
          ),
          code: ({ children, className }) => {
            // Detect code blocks (has language class) vs inline code
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className={`block rounded-card bg-surface-3 p-3 font-mono text-xs text-text/90 overflow-x-auto ${className ?? ''}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-xs text-accent">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 mt-2 overflow-x-auto rounded-card bg-surface-3 text-xs">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-accent/50 pl-3 text-sm italic text-text-muted">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-3 border-border" />
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-accent underline hover:text-accent-hover" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full text-sm text-text/85">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border text-left text-xs font-semibold text-text">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/50">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5">{children}</td>
          ),
          input: ({ checked, type }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1.5 rounded accent-accent"
                />
              );
            }
            return null;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
