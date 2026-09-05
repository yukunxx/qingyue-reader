import { create } from 'zustand';
import styles from './Toast.module.css';

interface ToastState {
  message: string;
  visible: boolean;
  show: (msg: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

const useToastStore = create<ToastState>((set) => ({
  message: '',
  visible: false,
  show: (msg) => {
    set({ message: msg, visible: true });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ visible: false }), 1800);
  },
  hide: () => set({ visible: false }),
}));

/** 供非组件上下文（事件回调等）触发提示。 */
export function toast(msg: string): void {
  useToastStore.getState().show(msg);
}

export default function Toast() {
  const message = useToastStore((s) => s.message);
  const visible = useToastStore((s) => s.visible);
  return <div className={visible ? `${styles.toast} ${styles.show}` : styles.toast}>{message}</div>;
}
