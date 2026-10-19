import type { Card } from '../types';
import { cambridgeUrl } from '../lib/dictionary';
import MarkdownText from './MarkdownText';
import Mermaid from './Mermaid';

/**
 * Renders one side of a flashcard. The image belongs to the front; the
 * Mermaid diagram (if any) belongs to the back. The back is rendered as
 * Markdown so answers can be structured and highlighted. Word/phrase fronts
 * get a Cambridge Dictionary lookup link.
 */
export default function CardFace({ card, side }: { card: Card; side: 'front' | 'back' }) {
  // Treat a literal "\n" (backslash-n) as a line break so both pasted newlines
  // and hand-typed "\n" sequences render as multiple lines.
  const text = (side === 'front' ? card.front : card.back).replace(/\\n/g, '\n');
  const showImage = side === 'front' && card.imageUrl;
  const showMermaid = side === 'back' && card.mermaid;
  const lookupUrl = side === 'front' ? cambridgeUrl(card.front) : null;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      {side === 'back' ? (
        <MarkdownText text={text} />
      ) : (
        <p className="whitespace-pre-wrap break-words text-xl leading-relaxed text-neutral-900 sm:text-2xl">
          {text}
        </p>
      )}

      {lookupUrl && (
        <a
          href={lookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start text-sm text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
        >
          Cambridge Dictionary ↗
        </a>
      )}

      {showImage && (
        <div className="flex justify-center">
          <img
            src={card.imageUrl!}
            alt=""
            className="max-h-72 w-auto max-w-full rounded-lg object-contain"
            loading="lazy"
          />
        </div>
      )}

      {showMermaid && <Mermaid code={card.mermaid!} />}
    </div>
  );
}
