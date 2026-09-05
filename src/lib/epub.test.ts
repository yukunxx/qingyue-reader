import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { normalizeZipPath, parseEpub, resolvePath, xhtmlToText } from './epub';

function buildEpub(): Uint8Array {
  const container = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>测试书</dc:title>
    <dc:creator>测试作者</dc:creator>
  </metadata>
  <manifest>
    <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`;
  const ch1 =
    '<html><head><title>第一章 开始</title></head><body><h1>第一章 开始</h1><p>这是第一段。</p><p>这是第二段。</p></body></html>';
  const ch2 =
    '<html><head><title>第二章 继续</title></head><body><p>第二章内容。&amp; 特殊字符 &lt;test&gt;。</p></body></html>';
  return zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(container),
    'OEBPS/content.opf': strToU8(opf),
    'OEBPS/ch1.xhtml': strToU8(ch1),
    'OEBPS/ch2.xhtml': strToU8(ch2),
  });
}

describe('xhtmlToText', () => {
  it('块级标签换行', () => {
    expect(xhtmlToText('<p>a</p><p>b</p>')).toBe('a\nb');
  });

  it('解码常见实体', () => {
    expect(xhtmlToText('<p>A &amp; B &lt; C</p>')).toBe('A & B < C');
  });

  it('去掉脚本与样式', () => {
    expect(xhtmlToText('<style>x{}</style><p>ok</p>')).toBe('ok');
  });
});

describe('resolvePath', () => {
  it('相对 OPF 目录解析', () => {
    expect(resolvePath('OEBPS', 'ch1.xhtml')).toBe('OEBPS/ch1.xhtml');
    expect(resolvePath('OEBPS', '../images/a.png')).toBe('images/a.png');
  });

  it('根目录 OPF', () => {
    expect(resolvePath('', 'OEBPS/ch1.xhtml')).toBe('OEBPS/ch1.xhtml');
  });
});

describe('normalizeZipPath', () => {
  it('去掉前导 ./', () => {
    expect(normalizeZipPath('./OEBPS/a.xhtml')).toBe('OEBPS/a.xhtml');
  });
});

describe('parseEpub', () => {
  it('解析元数据、章节与正文', () => {
    const epub = parseEpub(buildEpub());
    expect(epub.title).toBe('测试书');
    expect(epub.author).toBe('测试作者');
    expect(epub.chapters.map((c) => c.title)).toEqual(['第一章 开始', '第二章 继续']);
    expect(epub.content).toContain('这是第一段');
    expect(epub.content).toContain('第二章内容');
    expect(epub.content).toContain('& 特殊字符 <test>');
  });

  it('章节 start 指向正确偏移', () => {
    const epub = parseEpub(buildEpub());
    expect(epub.chapters[0].start).toBe(0);
    expect(epub.content.slice(epub.chapters[1].start)).toContain('第二章内容');
  });

  it('非法字节抛错', () => {
    expect(() => parseEpub(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
