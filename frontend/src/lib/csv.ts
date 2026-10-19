export type ImportRow = {
  front: string;
  back: string;
  mermaid: string | null;
};

export type RelationImportRow = {
  source: string;
  target: string;
  label: string | null;
  relation: string | null;
};

/**
 * Minimal but correct CSV parser: handles quoted fields, embedded commas,
 * newlines, and escaped double-quotes (`""`). Returns a grid of cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  return rows;
}

const HEADER_ALIASES: Record<string, 'front' | 'back' | 'mermaid'> = {
  front: 'front',
  question: 'front',
  q: 'front',
  back: 'back',
  answer: 'back',
  a: 'back',
  mermaid: 'mermaid',
};

/** Parse JSON into import rows. Accepts an array or `{ "cards": [...] }`. */
export function rowsFromJson(text: string): ImportRow[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.cards;
  if (!Array.isArray(arr)) {
    throw new Error('JSON must be an array of cards, or an object with a "cards" array');
  }
  return arr.map((item: any, i: number) => {
    const front = item?.front ?? item?.question ?? '';
    const back = item?.back ?? item?.answer ?? '';
    if (typeof front !== 'string' || typeof back !== 'string') {
      throw new Error(`Row ${i}: "front" and "back" must be strings`);
    }
    return {
      front,
      back,
      mermaid: item?.mermaid ? String(item.mermaid) : null,
    };
  });
}

/** Parse CSV into import rows using a `front,back,mermaid` header. */
export function rowsFromCsv(text: string): ImportRow[] {
  const grid = parseCsv(text);
  if (grid.length === 0) throw new Error('CSV is empty');

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const col: { front: number; back: number; mermaid: number } = {
    front: -1,
    back: -1,
    mermaid: -1,
  };
  header.forEach((h, i) => {
    const key = HEADER_ALIASES[h];
    if (key && col[key] === -1) col[key] = i;
  });

  if (col.front === -1 || col.back === -1) {
    throw new Error('CSV must have "front" and "back" columns (first row is the header)');
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i];
    const get = (idx: number) => (idx >= 0 && idx < line.length ? line[idx].trim() : '');
    const front = get(col.front);
    const back = get(col.back);
    const mermaid = col.mermaid >= 0 ? get(col.mermaid) : '';
    if (!front && !back && !mermaid) continue; // skip blank lines
    rows.push({ front, back, mermaid: mermaid || null });
  }
  return rows;
}

const RELATION_HEADER_ALIASES: Record<string, keyof RelationImportRow> = {
  source: 'source',
  from: 'source',
  target: 'target',
  to: 'target',
  label: 'label',
  relation: 'relation',
  relationcard: 'relation',
};

/** Parse JSON into relation rows. Accepts an array or `{ "relations": [...] }`. */
export function relationRowsFromJson(text: string): RelationImportRow[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.relations;
  if (!Array.isArray(arr)) {
    throw new Error('JSON must be an array of relations, or an object with a "relations" array');
  }
  return arr.map((item: any, i: number) => {
    const source = item?.source ?? item?.from ?? '';
    const target = item?.target ?? item?.to ?? '';
    if (typeof source !== 'string' || typeof target !== 'string') {
      throw new Error(`Row ${i}: "source" and "target" must be strings`);
    }
    return {
      source,
      target,
      label: item?.label ? String(item.label) : null,
      relation: item?.relation ? String(item.relation) : null,
    };
  });
}

/** Parse CSV into relation rows using a `source,target,label,relation` header. */
export function relationRowsFromCsv(text: string): RelationImportRow[] {
  const grid = parseCsv(text);
  if (grid.length === 0) throw new Error('CSV is empty');

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const col: { source: number; target: number; label: number; relation: number } = {
    source: -1,
    target: -1,
    label: -1,
    relation: -1,
  };
  header.forEach((h, i) => {
    const key = RELATION_HEADER_ALIASES[h];
    if (key && col[key] === -1) col[key] = i;
  });

  if (col.source === -1 || col.target === -1) {
    throw new Error('CSV must have "source" and "target" columns (first row is the header)');
  }

  const rows: RelationImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i];
    const get = (idx: number) => (idx >= 0 && idx < line.length ? line[idx].trim() : '');
    const source = get(col.source);
    const target = get(col.target);
    const label = col.label >= 0 ? get(col.label) : '';
    const relation = col.relation >= 0 ? get(col.relation) : '';
    if (!source && !target && !label && !relation) continue; // skip blank lines
    rows.push({ source, target, label: label || null, relation: relation || null });
  }
  return rows;
}
