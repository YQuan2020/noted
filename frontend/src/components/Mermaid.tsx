import { useEffect, useState } from 'react';

// Mermaid is large, so it is lazy-loaded on first use — cards without a
// diagram never pay for it in the main bundle.
let initialized = false;
let counter = 0;
let mermaidModule: Promise<typeof import('mermaid')> | null = null;

function loadMermaid() {
  if (!mermaidModule) mermaidModule = import('mermaid');
  return mermaidModule;
}

export default function Mermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${++counter}`;

    loadMermaid()
      .then(async (m) => {
        if (!initialized) {
          m.default.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'strict',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          });
          initialized = true;
        }
        return m.default.render(id, code);
      })
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render diagram');
          setSvg('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p className="font-medium">Mermaid error</p>
        <p className="mt-1 break-words text-red-600">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return <div className="text-sm text-neutral-400">Rendering…</div>;
  }

  return (
    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
