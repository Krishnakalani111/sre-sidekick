/**
 * Markdown renderer for backend-generated documents (the RCA from
 * POST /investigate with format: "markdown").
 *
 * Element styles are supplied explicitly rather than via a prose/typography
 * plugin, which isn't installed — and this keeps the output on the app's own
 * design tokens instead of a separate type scale.
 *
 * react-markdown builds React elements from an AST and never touches
 * dangerouslySetInnerHTML, so embedded HTML in the source can't inject markup.
 */
import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-display text-lg first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 font-display text-base first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 text-sm font-medium first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground first:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-medium text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="text-xs">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-primary underline underline-offset-4"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border/60" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
