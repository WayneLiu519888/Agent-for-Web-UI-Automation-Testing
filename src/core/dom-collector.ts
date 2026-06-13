/**
 * DOM 采集器 — 供 web-component-scout 使用
 * 遍历页面所有元素 → 提取组件签名
 */
import type { ComponentSample } from '../types/interaction-events.js';

export interface DomCollectResult {
  samples: ComponentSample[];
  prefixes: string[];
  pageUrl: string;
}

export function domCollectScript(): string {
  return `(() => {
    const r = []; let i = 0;
    for (const e of document.querySelectorAll('*')) {
      const b = e.getBoundingClientRect();
      const dv = []; for (const a of e.attributes) { if (a.name.startsWith('data-v-')) dv.push(a.name); }
      const dataAttrs = []; for (const a of e.attributes) { if (a.name.startsWith('data-')) dataAttrs.push(a.name); }
      r.push({
        id: 'c' + (++i),
        prefix: null,
        tagName: e.tagName.toLowerCase(),
        role: '',
        fullClasses: typeof e.className === 'string' ? e.className.split(/\s+/) : [],
        dataAttrs,
        page: location.href,
        boundingBox: b.width > 0 ? { w: b.width, h: b.height } : null,
        childrenCount: e.children.length,
        observedBehaviors: [],
      });
    }
    return r;
  })()`;
}

/** 从 className 拆分组件前缀 */
export function splitComponentPrefix(className: string): { prefix: string | null; baseName: string } {
  const parts = className.split(/\s+/).filter(c => c.length > 1);
  for (const part of parts) {
    const dashIdx = part.indexOf('-');
    if (dashIdx > 0 && dashIdx < 10) {
      return { prefix: part.slice(0, dashIdx + 1), baseName: part };
    }
  }
  return { prefix: null, baseName: parts[0] || className };
}

/** 去重合并组件采样 */
export function dedupeSamples(samples: ComponentSample[]): Map<string, ComponentSample[]> {
  const map = new Map<string, ComponentSample[]>();
  for (const s of samples) {
    const key = s.tagName + '|' + (s.fullClasses[0] || '');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}
