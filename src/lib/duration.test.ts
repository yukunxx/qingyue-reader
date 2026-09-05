import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('不足一分钟', () => {
    expect(formatDuration(0)).toBe('不足 1 分钟');
    expect(formatDuration(59)).toBe('不足 1 分钟');
  });

  it('分钟级', () => {
    expect(formatDuration(60)).toBe('1 分钟');
    expect(formatDuration(3599)).toBe('59 分钟');
  });

  it('小时级（整数）', () => {
    expect(formatDuration(3600)).toBe('1 小时');
  });

  it('小时 + 分钟', () => {
    expect(formatDuration(3660)).toBe('1 小时 1 分钟');
    expect(formatDuration(7200 + 1800)).toBe('2 小时 30 分钟');
  });

  it('负数按 0 处理', () => {
    expect(formatDuration(-5)).toBe('不足 1 分钟');
  });
});
