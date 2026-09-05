import { useRef } from 'react';
import { useBookStore } from '../../store/bookStore';
import { totalPages } from '../../lib/pagination';
import { toast } from '../Toast/Toast';
import type { Book } from '../../types';
import styles from './Shelf.module.css';

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#4f6ef2,#9b5de5)',
  'linear-gradient(135deg,#f2709c,#ff9472)',
  'linear-gradient(135deg,#11998e,#38ef7d)',
  'linear-gradient(135deg,#fc5c7d,#6a82fb)',
  'linear-gradient(135deg,#f7971e,#ffd200)',
];

function fmtTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时前';
  return Math.floor(h / 24) + ' 天前';
}

export default function Shelf() {
  const books = useBookStore((s) => s.books);
  const importFiles = useBookStore((s) => s.importFiles);
  const deleteBook = useBookStore((s) => s.deleteBook);
  const openBook = useBookStore((s) => s.openBook);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onImport() {
    const input = inputRef.current;
    if (!input || !input.files || input.files.length === 0) return;
    const n = await importFiles(input.files);
    input.value = '';
    if (n === 0) toast('仅支持非空 .txt 文本文件');
    else toast('已导入 ' + n + ' 本书');
  }

  function onDelete(book: Book) {
    if (window.confirm('删除《' + book.title + '》？')) {
      deleteBook(book.id);
      toast('已删除');
    }
  }

  const sorted = [...books].sort((a, b) => b.lastAt - a.lastAt);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>
            <span className={styles.logo}>轻</span>阅
          </h1>
          <span>TXT 阅读器 · MVP</span>
        </div>
        <button className={styles.btn} onClick={() => inputRef.current?.click()}>
          ＋ 导入书籍
        </button>
      </header>

      <main className={styles.shelf}>
        <div className={styles.toolbar}>
          <h2>书架</h2>
          <span className={styles.hint}>按最近阅读排序 · 数据保存在本地</span>
        </div>

        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.ico}>📚</div>
            <h3>书架空空如也</h3>
            <p>点击右上角「导入书籍」，或把 .txt 文件拖进来</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {sorted.map((book) => {
              const total = totalPages(book.content);
              const pct = Math.round(((book.lastPage + 1) / total) * 100);
              const started = book.lastPage > 0;
              const cover = COVER_GRADIENTS[Number(book.cover) % COVER_GRADIENTS.length];
              return (
                <div className={styles.card} key={book.id}>
                  <button
                    className={styles.del}
                    title="删除"
                    onClick={() => onDelete(book)}
                  >
                    ×
                  </button>
                  <div
                    className={styles.cover}
                    style={{ background: cover }}
                    onClick={() => openBook(book.id)}
                  >
                    {book.title.slice(0, 1)}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.title}>{book.title}</div>
                    <div className={styles.author}>{book.author}</div>
                    <div className={styles.progress}>
                      <div className={styles.bar}>
                        <i style={{ width: pct + '%' }} />
                      </div>
                      <div className={styles.pct}>
                        <span>{started ? '读到 ' + pct + '%' : '未开始'}</span>
                        <span>{fmtTime(book.lastAt)}</span>
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.open} onClick={() => openBook(book.id)}>
                        {started ? '继续阅读' : '开始阅读'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        multiple
        style={{ display: 'none' }}
        onChange={onImport}
      />
    </>
  );
}
