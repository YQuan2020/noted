import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

/**
 * Renders card text as Markdown: headings, lists, bold/italic, tables (GFM)
 * and syntax-highlighted code blocks. `remark-breaks` keeps single newlines as
 * line breaks so plain multi-line answers still render as written.
 */
export default function MarkdownText({ text }: { text: string }) {
  return (
    <div className="prose prose-neutral max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-1.5 prose-li:my-0.5 prose-pre:rounded-lg prose-pre:border prose-pre:border-neutral-200/70 prose-pre:bg-white prose-pre:shadow-sm">
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeHighlight]}>
        {text}
      </Markdown>
    </div>
  );
}
