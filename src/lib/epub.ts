import { unzipSync } from 'fflate';
import type { Chapter } from '../types';

export interface ParsedEpub {
  title: string;
  author: string;
  content: string;
  chapters: Chapter[];
}

/** 规范化 zip 内路径（去掉前导 ./ 和 /，统一为 / 分隔）。 */
export function normalizeZipPath(path: string): string {
  let p = path.replace(/\\/g, '/');
  while (p.startsWith('./')) p = p.slice(2);
  while (p.startsWith('/')) p = p.slice(1);
  return p;
}

/** 基于 opf 所在目录解析相对路径 href。 */
export function resolvePath(baseDir: string, href: string): string {
  let clean = href.split('#')[0].split('?')[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* 保留原样 */
  }
  const parts = [...baseDir.split('/').filter(Boolean), ...clean.split('/')];
  const out: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

const BLOCK_CLOSE_RE = /<\/(?:p|div|h[1-6]|li|tr|blockquote|section|article|table)>/gi;
const BR_RE = /<br\s*\/?>/gi;
const TAG_RE = /<[^>]+>/g;

/** 将 XHTML 片段转为纯文本：块级元素换行、去掉标签、解码常见实体。 */
export function xhtmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(BLOCK_CLOSE_RE, '\n')
    .replace(BR_RE, '\n')
    .replace(TAG_RE, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/gi, '&');

  text = text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function attrOf(tag: string, name: string): string | null {
  const re = new RegExp(name + "\\s*=\\s*[\"']([^\"']*)[\"']", 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

function findOpfPath(containerXml: string): string | null {
  const m = containerXml.match(/<rootfile[^>]*full-path\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}

function extractMeta(opf: string): { title: string; author: string } {
  const title =
    opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1] ??
    opf.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const creator = opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1];
  return {
    title: title ? xhtmlToText(title).trim() || '未命名' : '未命名',
    author: creator ? xhtmlToText(creator).trim() || '本地导入' : '本地导入',
  };
}

function parseManifestAndSpine(
  opf: string,
): { manifest: Record<string, { href: string; mediaType: string }>; idrefs: string[] } {
  const manifest: Record<string, { href: string; mediaType: string }> = {};
  for (const m of opf.matchAll(/<item\b[^>]*>/gi)) {
    const id = attrOf(m[0], 'id');
    const href = attrOf(m[0], 'href');
    const mediaType = attrOf(m[0], 'media-type') ?? '';
    if (id && href) manifest[id] = { href, mediaType };
  }

  const idrefs: string[] = [];
  for (const m of opf.matchAll(/<itemref\b[^>]*>/gi)) {
    const idref = attrOf(m[0], 'idref');
    if (idref) idrefs.push(idref);
  }
  return { manifest, idrefs };
}

function extractChapterTitle(html: string, fallback: string): string {
  const h = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (h) {
    const t = xhtmlToText(h[1]).trim();
    if (t) return t;
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = xhtmlToText(title[1]).trim();
    if (t) return t;
  }
  return fallback;
}

/**
 * 解析 EPUB（zip 容器 + OPF 清单/书脊），抽取正文纯文本与章节结构。
 * 复用 TXT 阅读管线：content 为拼接后的纯文本，chapters 为显式章节偏移。
 */
export function parseEpub(bytes: Uint8Array): ParsedEpub {
  const zipped = unzipSync(bytes);
  const files: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(zipped)) files[normalizeZipPath(k)] = v;

  const containerRaw = files['META-INF/container.xml'];
  if (!containerRaw) throw new Error('不是有效的 EPUB：缺少 container.xml');

  const opfPath = findOpfPath(new TextDecoder('utf-8').decode(containerRaw));
  if (!opfPath) throw new Error('EPUB 缺少 OPF 路径');

  const opfRaw = files[normalizeZipPath(opfPath)];
  if (!opfRaw) throw new Error('EPUB 找不到 OPF 文件');
  const opf = new TextDecoder('utf-8').decode(opfRaw);

  const { title, author } = extractMeta(opf);
  const { manifest, idrefs } = parseManifestAndSpine(opf);
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  let content = '';
  const chapters: Chapter[] = [];
  idrefs.forEach((idref, i) => {
    const item = manifest[idref];
    if (!item) return;
    if (item.mediaType && !/html|xml|xhtml/i.test(item.mediaType)) return;
    const path = normalizeZipPath(resolvePath(opfDir, item.href));
    const raw = files[path];
    if (!raw) return;
    const html = new TextDecoder('utf-8').decode(raw);
    const text = xhtmlToText(html);
    if (!text.trim()) return;

    const sep = content ? '\n\n' : '';
    chapters.push({ title: extractChapterTitle(html, `第 ${i + 1} 节`), start: content.length });
    content += sep + text;
  });

  if (!content.trim()) throw new Error('EPUB 未解析到正文');
  return { title, author, content, chapters };
}
