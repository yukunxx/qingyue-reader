import type { Bookmark, Highlight } from '../../types';
import type { Chapter } from '../../lib/chapters';
import { CHARS_PER_PAGE } from '../../lib/pagination';
import styles from './Reader.module.css';

export type NavTab = 'catalog' | 'bookmarks' | 'highlights';

const TABS: { key: NavTab; label: string }[] = [
  { key: 'catalog', label: '目录' },
  { key: 'bookmarks', label: '书签' },
  { key: 'highlights', label: '高亮' },
];

function pageOf(offset: number): number {
  return Math.floor(offset / CHARS_PER_PAGE) + 1;
}

function snippet(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > 40 ? collapsed.slice(0, 40) + '…' : collapsed;
}

interface ReaderNavProps {
  tab: NavTab;
  onTabChange: (t: NavTab) => void;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  bookContent: string;
  onJumpToOffset: (offset: number) => void;
  onRemoveBookmark: (id: string) => void;
  onRemoveHighlight: (id: string) => void;
}

export default function ReaderNav({
  tab,
  onTabChange,
  onClose,
  chapters,
  currentChapterIndex,
  bookmarks,
  highlights,
  bookContent,
  onJumpToOffset,
  onRemoveBookmark,
  onRemoveHighlight,
}: ReaderNavProps) {
  return (
    <div className={styles.catalog}>
      <div className={styles.catalogHeader}>
        <span>导航</span>
        <button className={styles.iconBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={styles.navTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? `${styles.navTab} ${styles.navTabOn}` : styles.navTab}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.catalogList}>
        {tab === 'catalog' &&
          (chapters.length === 0 ? (
            <div className={styles.navEmpty}>未识别到章节</div>
          ) : (
            chapters.map((ch, i) => (
              <button
                key={`${ch.start}-${i}`}
                className={
                  i === currentChapterIndex
                    ? `${styles.catalogItem} ${styles.catalogItemOn}`
                    : styles.catalogItem
                }
                onClick={() => {
                  onJumpToOffset(ch.start);
                  onClose();
                }}
              >
                {ch.title}
              </button>
            ))
          ))}

        {tab === 'bookmarks' &&
          (bookmarks.length === 0 ? (
            <div className={styles.navEmpty}>暂无书签</div>
          ) : (
            bookmarks.map((b) => (
              <div key={b.id} className={styles.annotItem}>
                <button
                  className={styles.annotMain}
                  onClick={() => {
                    onJumpToOffset(b.offset);
                    onClose();
                  }}
                >
                  <span className={styles.annotLabel}>第 {pageOf(b.offset)} 页</span>
                </button>
                <button className={styles.annotDel} onClick={() => onRemoveBookmark(b.id)}>
                  ×
                </button>
              </div>
            ))
          ))}

        {tab === 'highlights' &&
          (highlights.length === 0 ? (
            <div className={styles.navEmpty}>选中正文后点「划线」即可添加</div>
          ) : (
            highlights.map((h) => (
              <div key={h.id} className={styles.annotItem}>
                <button
                  className={styles.annotMain}
                  onClick={() => {
                    onJumpToOffset(h.start);
                    onClose();
                  }}
                >
                  <span className={styles.annotSnippet}>{snippet(bookContent.slice(h.start, h.end))}</span>
                </button>
                <button className={styles.annotDel} onClick={() => onRemoveHighlight(h.id)}>
                  ×
                </button>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}
