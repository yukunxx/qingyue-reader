import { describe, expect, it } from 'vitest';
import { searchText } from './search';

describe('searchText', () => {
  it('空查询返回空数组', () => {
    expect(searchText('你好世界', '')).toEqual([]);
    expect(searchText('你好世界', '   ')).toEqual([]);
  });

  it('无匹配返回空数组', () => {
    expect(searchText('你好世界', 'abc')).toEqual([]);
  });

  it('返回所有匹配的字符偏移', () => {
    const r = searchText('苹果香蕉苹果', '苹果');
    expect(r.map((x) => x.index)).toEqual([0, 4]);
  });

  it('英文大小写不敏感', () => {
    const r = searchText('Hello World hello', 'hello');
    expect(r.map((x) => x.index)).toEqual([0, 12]);
  });

  it('片段包含上下文与匹配词', () => {
    const r = searchText('一二三四五六七八九十', '五', { context: 2 });
    expect(r[0].snippet).toContain('五');
  });

  it('尊重 limit 上限', () => {
    const r = searchText('aaaaa', 'a', { limit: 3 });
    expect(r.length).toBe(3);
  });
});
