import { useEffect, useMemo, useRef, useState } from 'react';
import { searchText } from '../../lib/search';
import { CHARS_PER_PAGE } from '../../lib/pagination';
import styles from './Reader.module.css';

interface SearchPanelProps {
  content: string;
  onJump: (offset: number) => void;
  onClose: () => void;
}

export default function SearchPanel({ content, onJump, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => searchText(content, debounced), [content, debounced]);
  const hasQuery = debounced.trim() !== '';

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchHeader}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          type="text"
          placeholder="在本书中搜索…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <button className={styles.iconBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.searchResults}>
        {!hasQuery ? (
          <div className={styles.navEmpty}>输入关键词开始搜索</div>
        ) : results.length === 0 ? (
          <div className={styles.navEmpty}>未找到「{debounced}」</div>
        ) : (
          results.map((r) => (
            <button
              key={r.index}
              className={styles.searchItem}
              onClick={() => {
                onJump(r.index);
                onClose();
              }}
            >
              <span className={styles.annotSnippet}>{r.snippet}</span>
              <span className={styles.annotLabel}>第 {Math.floor(r.index / CHARS_PER_PAGE) + 1} 页</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
