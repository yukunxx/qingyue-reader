import { useEffect, useMemo, useRef, useState } from 'react';
import { useBookStore } from '../../store/bookStore';
import { CHARS_PER_PAGE, pageAt, totalPages } from '../../lib/pagination';
import { chapterIndexAt, parseChapters } from '../../lib/chapters';
import SettingsPanel from '../Settings/SettingsPanel';
import type { Theme } from '../../types';
import styles from './Reader.module.css';

const THEME_ORDER: Theme[] = ['day', 'sepia', 'night'];

export default function Reader() {
  const book = useBookStore((s) => s.books.find((b) => b.id === s.currentId));
  const currentPage = useBookStore((s) => s.currentPage);
  const settings = useBookStore((s) => s.settings);
  const gotoPage = useBookStore((s) => s.gotoPage);
  const closeBook = useBookStore((s) => s.closeBook);
  const setTheme = useBookStore((s) => s.setTheme);
  const [panelOpen, setPanelOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 书籍内容导入后不可变，按 book.id 缓存章节解析，避免翻页时重复扫描全文
  const chapters = useMemo(() => (book ? parseChapters(book.content) : []), [book?.id]);

  const total = book ? totalPages(book.content) : 1;
  const pageText = book ? pageAt(book.content, currentPage) : '';

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [currentPage]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        gotoPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        gotoPage(currentPage + 1);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [currentPage, gotoPage]);

  if (!book) return null;

  const currentOffset = currentPage * CHARS_PER_PAGE;
  const currentChapterIndex = chapterIndexAt(chapters, currentOffset);
  const currentChapterTitle = currentChapterIndex >= 0 ? chapters[currentChapterIndex].title : '';

  function goToChapter(idx: number) {
    const ch = chapters[idx];
    if (!ch) return;
    gotoPage(Math.floor(ch.start / CHARS_PER_PAGE));
  }

  function goPrevChapter() {
    if (currentChapterIndex > 0) goToChapter(currentChapterIndex - 1);
  }

  function goNextChapter() {
    if (currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1) {
      goToChapter(currentChapterIndex + 1);
    }
  }

  function cycleTheme() {
    const i = THEME_ORDER.indexOf(settings.theme);
    setTheme(THEME_ORDER[(i + 1) % THEME_ORDER.length]);
  }

  const pct = Math.round(((currentPage + 1) / total) * 100);

  return (
    <div className={`${styles.reader} theme-${settings.theme}`}>
      <div className={styles.top}>
        <button className={styles.iconBtn} onClick={closeBook} title="返回书架">
          ←
        </button>
        <span className={styles.title}>{book.title}</span>
        {chapters.length > 0 && (
          <button
            className={styles.iconBtn}
            onClick={() => setCatalogOpen((v) => !v)}
            title="目录"
          >
            ☰
          </button>
        )}
        <button className={styles.iconBtn} onClick={cycleTheme} title="切换主题">
          ◐
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => setPanelOpen((v) => !v)}
          title="阅读设置"
        >
          Aa
        </button>
      </div>

      {chapters.length > 0 && (
        <div className={styles.chapterBar}>
          <button
            className={styles.chapterNav}
            onClick={goPrevChapter}
            disabled={currentChapterIndex <= 0}
          >
            « 上一章
          </button>
          <span className={styles.chapterTitle}>{currentChapterTitle || '正文'}</span>
          <button
            className={styles.chapterNav}
            onClick={goNextChapter}
            disabled={currentChapterIndex < 0 || currentChapterIndex >= chapters.length - 1}
          >
            下一章 »
          </button>
        </div>
      )}

      {panelOpen && <SettingsPanel />}

      {catalogOpen && chapters.length > 0 && (
        <div className={styles.catalog}>
          <div className={styles.catalogHeader}>
            <span>目录（{chapters.length} 章）</span>
            <button className={styles.iconBtn} onClick={() => setCatalogOpen(false)}>
              ×
            </button>
          </div>
          <div className={styles.catalogList}>
            {chapters.map((ch, i) => (
              <button
                key={`${ch.start}-${i}`}
                className={
                  i === currentChapterIndex
                    ? `${styles.catalogItem} ${styles.catalogItemOn}`
                    : styles.catalogItem
                }
                onClick={() => {
                  goToChapter(i);
                  setCatalogOpen(false);
                }}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.body} ref={bodyRef}>
        <div
          className={styles.page}
          style={{ fontSize: settings.fontSize + 'px', lineHeight: settings.lineHeight }}
        >
          {pageText}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.pager}>
          <button
            className={styles.iconBtn}
            onClick={() => gotoPage(currentPage - 1)}
            disabled={currentPage <= 0}
            title="上一页"
          >
            ‹
          </button>
          <span className={styles.meta}>
            {currentPage + 1} / {total}
          </span>
          <button
            className={styles.iconBtn}
            onClick={() => gotoPage(currentPage + 1)}
            disabled={currentPage >= total - 1}
            title="下一页"
          >
            ›
          </button>
        </div>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={total - 1}
          value={currentPage}
          onChange={(e) => gotoPage(parseInt(e.target.value, 10))}
        />
        <span className={styles.meta}>{pct}%</span>
      </div>
    </div>
  );
}
