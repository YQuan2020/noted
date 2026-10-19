import type { Card } from '../types';
import Mermaid from './Mermaid';

/**
 * Renders one side of a flashcard. The image belongs to the front; the
 * Mermaid diagram (if any) belongs to the back.
 */
export default function CardFace({ card, side }: { card: Card; side: 'front' | 'back' }) {
  // Treat a literal "\n" (backslash-n) as a line break so both pasted newlines
  // and hand-typed "\n" sequences render as multiple lines.
  const text = (side === 'front' ? card.front : card.back).replace(/\\n/g, '\n');
  const showImage = side === 'front' && card.imageUrl;
  const showMermaid = side === 'back' && card.mermaid;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto">
      <p className="whitespace-pre-wrap break-words text-xl leading-relaxed text-neutral-900 sm:text-2xl">
        {text}
      </p>

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
