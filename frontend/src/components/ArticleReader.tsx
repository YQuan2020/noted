import { useRef, useState } from 'react';
import MarkdownText from './MarkdownText';

interface HoverTarget {
  text: string;
  x: number;
  y: number;
}

/**
 * Renders Markdown article content with hover-to-add-card: hovering a word
 * (or selecting a phrase) reveals a "+ Card" tooltip.
 */
export default function ArticleReader({
  markdown,
  onAddCard,
}: {
  markdown: string;
  onAddCard: (text: string) => void;
}) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const timerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const lastTextRef = useRef<string | null>(null);
  const lastMoveRef = useRef(0);

  const cancelClear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const scheduleClear = () => {
    cancelClear();
    timerRef.current = window.setTimeout(() => setHover(null), 250);
  };
  const cancelShow = () => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  /** The word under a viewport point, if any. */
  const wordAtPoint = (x: number, y: number): HoverTarget | null => {
    if (typeof document.caretRangeFromPoint !== 'function') return null;
    const range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    let start = offset;
    let end = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    const word = text.slice(start, end);
    if (word.length < 2 || !/[A-Za-zÀ-ɏ]/.test(word)) return null;
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    const rect = r.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    return { text: word, x: rect.left + rect.width / 2, y: rect.top };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest?.('[data-article-tooltip]')) return;
    const now = Date.now();
    if (now - lastMoveRef.current < 100) return;
    lastMoveRef.current = now;

    // A drag-selection is handled on mouseup; don't fight it here.
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;

    const target = wordAtPoint(e.clientX, e.clientY);

    if (!target) {
      // Off any word: cancel a pending reveal and hide what's showing.
      lastTextRef.current = null;
      cancelShow();
      scheduleClear();
      return;
    }

    if (target.text === lastTextRef.current) return; // still on the same word

    lastTextRef.current = target.text;
    cancelClear();
    cancelShow();
    setHover(null);
    // Reveal only after a short dwell, so passing over text doesn't flash the tooltip.
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setHover(target);
    }, 500);
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!text) return;
    const range = sel!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || !rect.width) return;
    lastTextRef.current = text;
    cancelClear();
    setHover({ text, x: rect.left + rect.width / 2, y: rect.top });
  };

  const add = () => {
    if (!hover) return;
    const text = hover.text;
    setHover(null);
    onAddCard(text);
  };

  // Tap/click a word to add it directly — the primary path on touch devices,
  // where there is no hover. Skips links and active text selections.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest?.('[data-article-tooltip]')) return;
    if (target.closest?.('a')) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) return;
    const word = wordAtPoint(e.clientX, e.clientY);
    if (word) {
      setHover(null);
      onAddCard(word.text);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseLeave={scheduleClear}
    >
      <MarkdownText text={markdown} />
      {hover && (
        <div
          data-article-tooltip
          onMouseEnter={cancelClear}
          onMouseLeave={scheduleClear}
          style={{ left: hover.x, top: hover.y }}
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 shadow-lg"
        >
          <span className="max-w-[16rem] truncate text-sm font-medium text-neutral-800">
            {hover.text}
          </span>
          <button
            onClick={add}
            className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700"
          >
            + Card
          </button>
        </div>
      )}
    </div>
  );
}
