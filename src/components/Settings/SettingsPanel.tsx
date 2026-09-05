import { useBookStore } from '../../store/bookStore';
import type { Theme } from '../../types';
import styles from './Settings.module.css';

const THEMES: Theme[] = ['day', 'sepia', 'night'];
const THEME_COLORS: Record<Theme, string> = {
  day: '#faf9f6',
  sepia: '#f7f1e3',
  night: '#17181c',
};
const THEME_TITLES: Record<Theme, string> = {
  day: '日间',
  sepia: '护眼',
  night: '夜间',
};

export default function SettingsPanel() {
  const settings = useBookStore((s) => s.settings);
  const setFontSize = useBookStore((s) => s.setFontSize);
  const setLineHeight = useBookStore((s) => s.setLineHeight);
  const setTheme = useBookStore((s) => s.setTheme);

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <label>字号</label>
        <div className={styles.stepper}>
          <button
            className={styles.btn}
            onClick={() => setFontSize(Math.max(14, settings.fontSize - 1))}
          >
            A-
          </button>
          <span className={styles.val}>{settings.fontSize}</span>
          <button
            className={styles.btn}
            onClick={() => setFontSize(Math.min(28, settings.fontSize + 1))}
          >
            A+
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <label>行距</label>
        <div className={styles.stepper}>
          <button
            className={styles.btn}
            onClick={() => setLineHeight(Math.max(1.4, +(settings.lineHeight - 0.1).toFixed(1)))}
          >
            −
          </button>
          <span className={styles.val}>{settings.lineHeight}</span>
          <button
            className={styles.btn}
            onClick={() => setLineHeight(Math.min(2.6, +(settings.lineHeight + 0.1).toFixed(1)))}
          >
            ＋
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <label>主题</label>
        <div className={styles.dots}>
          {THEMES.map((t) => (
            <button
              key={t}
              className={settings.theme === t ? `${styles.dot} ${styles.on}` : styles.dot}
              style={{ background: THEME_COLORS[t] }}
              onClick={() => setTheme(t)}
              title={THEME_TITLES[t]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
