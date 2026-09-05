/** 将累计阅读秒数格式化为中文时长文案。 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return '不足 1 分钟';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}
