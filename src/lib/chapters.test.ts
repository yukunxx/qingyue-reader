import { describe, expect, it } from 'vitest';
import { chapterIndexAt, parseChapters } from './chapters';

describe('parseChapters', () => {
  it('空文本无章节', () => {
    expect(parseChapters('')).toEqual([]);
  });

  it('无章节标题的普通文本返回空数组', () => {
    expect(parseChapters('这是没有章节的普通文本。\n又是一行。')).toEqual([]);
  });

  it('识别「第X章」（中文与阿拉伯数字）', () => {
    const text = '第一章 开始\n正文\n第12章 旅途\n更多正文';
    expect(parseChapters(text).map((c) => c.title)).toEqual(['第一章 开始', '第12章 旅途']);
  });

  it('识别序章/楔子/番外等特殊标题', () => {
    const text = '序章\n正文\n楔子\n正文\n番外 后日谈\n正文';
    expect(parseChapters(text).map((c) => c.title)).toEqual(['序章', '楔子', '番外 后日谈']);
  });

  it('章节偏移量指向标题起始位置', () => {
    const text = '前言 abc\n正文内容\n第二章 下一章';
    const chapters = parseChapters(text);
    expect(chapters[0].start).toBe(0);
    expect(chapters[1].start).toBe(text.indexOf('第二章'));
  });

  it('支持 CRLF 行尾', () => {
    const text = '第一章 开篇\r\n正文\r\n第二章 续\r\n正文';
    const chapters = parseChapters(text);
    expect(chapters.map((c) => c.title)).toEqual(['第一章 开篇', '第二章 续']);
    expect(chapters[1].start).toBe(text.indexOf('第二章'));
  });

  it('不误匹配正文中含「第X章」的行', () => {
    const text = '他说到了第三章的内容\n但这不是标题';
    expect(parseChapters(text)).toEqual([]);
  });
});

describe('chapterIndexAt', () => {
  const chapters = [
    { title: '第一章', start: 100 },
    { title: '第二章', start: 200 },
    { title: '第三章', start: 300 },
  ];

  it('空列表返回 -1', () => {
    expect(chapterIndexAt([], 50)).toBe(-1);
  });

  it('在第一个章节之前返回 -1', () => {
    expect(chapterIndexAt(chapters, 0)).toBe(-1);
  });

  it('落在某章节内返回该章节下标', () => {
    expect(chapterIndexAt(chapters, 250)).toBe(1);
  });

  it('恰好在章节起始返回该章节', () => {
    expect(chapterIndexAt(chapters, 200)).toBe(1);
  });

  it('超出最后章节返回最后章节', () => {
    expect(chapterIndexAt(chapters, 9999)).toBe(2);
  });
});
