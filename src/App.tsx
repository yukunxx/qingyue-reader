import { useEffect } from 'react';
import { useBookStore } from './store/bookStore';
import Shelf from './components/Shelf/Shelf';
import Reader from './components/Reader/Reader';
import Toast, { toast } from './components/Toast/Toast';

export default function App() {
  const loaded = useBookStore((s) => s.loaded);
  const currentId = useBookStore((s) => s.currentId);
  const loadAll = useBookStore((s) => s.loadAll);
  const importFiles = useBookStore((s) => s.importFiles);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) {
        importFiles(e.dataTransfer.files).then((n) => {
          if (n === 0) toast('仅支持非空 .txt / .epub 文件');
          else toast('已导入 ' + n + ' 本书');
        });
      }
    }
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [importFiles]);

  if (!loaded) {
    return <div className="app-loading">加载中…</div>;
  }

  return (
    <>
      {currentId ? <Reader /> : <Shelf />}
      <Toast />
    </>
  );
}
