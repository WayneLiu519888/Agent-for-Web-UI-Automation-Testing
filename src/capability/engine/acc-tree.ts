/**
 * Acc Tree 增强采集器（4 扁维精简版）
 * 委托 Playwright MCP browser_snapshot() + page.evaluate() 补采 DOM/几何
 * 内联 domCollectScript（兼容 dom-collector.ts 被删除）
 */
import type {
  AccTreeNode, DomInfo, DomAttributes, A11yInfo, GeometryInfo,
  Locators, AccTreeDocument, PageLink,
} from '../../types/yaml.js';
import type { InteractionInfo } from '../../types/interaction-events.js';
import { InteractionInferrer } from './interaction-inferrer.js';

const emptyDomAttrs = (): DomAttributes => ({
  dataTestid: null, dataQa: null, placeholder: null,
  type: null, value: null, name: null, href: null, title: null,
});

/** 已知组件前缀列表（Ant Design Vue / Element Plus / Naive UI / Arco Design 等） */
const KNOWN_PREFIXES = ['ant-', 'el-', 'n-', 'arco-', 'vxe-', 'a-', 't-', 'mu-', 'van-', 'nut-'];

function detectComponentPrefix(className: string | null): string | null {
  if (!className) return null;
  for (const cls of className.split(/\s+/)) {
    for (const p of KNOWN_PREFIXES) {
      if (cls.startsWith(p)) return p;
    }
  }
  return null;
}

/** 内联 DOM 采集脚本（替代 dom-collector.ts 的 domCollectScript） */
export function domCollectScript(): string {
  return `(() => {
    const r = []; let i = 0;
    for (const e of document.querySelectorAll('*')) {
      const b = e.getBoundingClientRect();
      const dv = []; for (const a of e.attributes) { if (a.name.startsWith('data-v-')) dv.push(a.name); }
      r.push({
        ref: 'd' + (++i),
        tagName: e.tagName.toLowerCase(),
        id: e.id || null,
        className: typeof e.className === 'string' ? e.className : null,
        innerText: (e as HTMLElement).innerText?.slice(0, 200) || null,
        textContent: e.textContent?.slice(0, 200) || null,
        boundingBox: b.width > 0 ? { x: b.x, y: b.y, width: b.width, height: b.height } : null,
        isInViewport: b.top >= 0 && b.left >= 0 && b.bottom <= window.innerHeight && b.right <= window.innerWidth,
        isVisible: e.checkVisibility ? e.checkVisibility() : b.width > 0 && b.height > 0,
        attributes: {
          dataTestid: e.getAttribute('data-testid'),
          dataQa: e.getAttribute('data-qa'),
          placeholder: (e as HTMLInputElement).placeholder || null,
          type: (e as HTMLInputElement).type || null,
          value: (e as HTMLInputElement).value || null,
          name: (e as HTMLInputElement).name || null,
          href: (e as HTMLAnchorElement).href || null,
          title: (e as HTMLElement).title || null,
        },
      });
    }
    return r;
  })()`;
}

export function buildAccTreeNode(
  a11yNode: any, _parentRef: string,
  refCounter: { count: number }, inferrer: InteractionInferrer,
  domDataMap?: Map<string, any>,
): AccTreeNode | null {
  if (!a11yNode) return null;
  const ref = 'e' + (++refCounter.count);
  const d = domDataMap?.get(a11yNode.ref) || {};

  const componentPrefix = detectComponentPrefix(d.className || null);

  const dom: DomInfo = {
    tagName: d.tagName || 'div', id: d.id || null,
    className: d.className || null, componentPrefix,
    attributes: { ...emptyDomAttrs(), ...(d.attributes || {}) },
  };
  const geometry: GeometryInfo = {
    boundingBox: d.boundingBox || null,
    isInViewport: d.isInViewport ?? true,
    isVisible: d.isVisible ?? true,
  };
  const a11y: A11yInfo = {
    role: a11yNode.role || 'generic', name: a11yNode.name || '',
    level: a11yNode.level || null, checked: a11yNode.checked || null,
    disabled: a11yNode.disabled || false, expanded: a11yNode.expanded || null,
    selected: a11yNode.selected || null, pressed: a11yNode.pressed || null,
    required: a11yNode.required || null, haspopup: a11yNode.haspopup || null,
    textContent: d.innerText?.slice(0, 200) || a11yNode.name?.slice(0, 200) || null,
  };
  const locators: Locators = {
    getByRole: a11y.role !== 'generic' ? [a11y.role, { name: a11y.name }] : null,
    getByTestId: dom.attributes.dataTestid ? [dom.attributes.dataTestid] : null,
    getByPlaceholder: dom.attributes.placeholder ? [dom.attributes.placeholder] : null,
    getByText: a11y.name ? [a11y.name] : null,
  };

  const partialNode: any = { ref, dom, a11y, geometry, locators };
  const interaction: InteractionInfo = inferrer.enrichInteraction(partialNode);
  const node: AccTreeNode = { ref, dom, a11y, geometry, locators, interaction };

  // 过滤不可见、不可交互、无 role 的纯容器节点
  if (!interaction.actionable && a11y.role === 'generic' && !a11yNode.children?.length) {
    if (!geometry.isVisible) return null;
  }

  if (a11yNode.children?.length) {
    const children: AccTreeNode[] = [];
    for (const c of a11yNode.children) {
      const cn = buildAccTreeNode(c, ref, refCounter, inferrer, domDataMap);
      if (cn) children.push(cn);
    }
    if (children.length) node.children = children;
  }
  return node;
}

export function createAccTreeDocument(
  url: string, title: string, mode: 'quick' | 'deep',
  loadMs: number, tree: AccTreeNode[], links: PageLink[],
): AccTreeDocument {
  return {
    page: {
      url, title, explored_at: new Date().toISOString(), mode,
      total_elements: countNodes(tree), load_time_ms: loadMs,
    },
    links, tree,
  };
}

function countNodes(nodes: AccTreeNode[]): number {
  let c = 0;
  for (const n of nodes) { c++; if (n.children) c += countNodes(n.children); }
  return c;
}
