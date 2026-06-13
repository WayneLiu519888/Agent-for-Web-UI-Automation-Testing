/**
 * Acc Tree 增强采集器
 * 委托 Playwright MCP browser_snapshot() + page.evaluate() 补采 DOM/几何/框架
 */
import type {
  AccTreeNode, DomInfo, DomAttributes, A11yInfo, GeometryInfo,
  Locators, FrameworkInfo, TextContent, AccTreeDocument, PageLink,
} from '../types/yaml.js';
import type { InteractionInfo } from '../types/interaction-events.js';
import { InteractionInferrer } from './interaction-inferrer.js';

const emptyDomAttrs = (): DomAttributes => ({
  dataTestid: null, dataQa: null, dataCy: null, dataVAttrs: [],
  href: null, type: null, placeholder: null, name: null, value: null,
  title: null, src: null, alt: null, tabindex: null,
  autocomplete: null, list: null, min: null, max: null, step: null,
  maxlength: null, pattern: null, accept: null, multiple: null,
  ariaLabel: null, ariaExpanded: null,
});

const KNOWN_PREFIXES = ['ant-', 'el-', 'n-', 'arco-', 'vxe-', 'a-', 't-', 'mu-', 'van-', 'nut-'];

function detectComponentType(className: string | null) {
  if (!className) return { componentType: null, componentPrefix: null };
  for (const cls of className.split(/\s+/)) {
    for (const p of KNOWN_PREFIXES) {
      if (cls.startsWith(p)) return {
        componentType: cls.split('--')[0].split('__')[0],
        componentPrefix: p,
      };
    }
  }
  return { componentType: null, componentPrefix: null };
}

export function buildAccTreeNode(
  a11yNode: any, _parentRef: string,
  refCounter: { count: number }, inferrer: InteractionInferrer,
  domDataMap?: Map<string, any>,
): AccTreeNode | null {
  if (!a11yNode) return null;
  const ref = 'e' + (++refCounter.count);
  const d = domDataMap?.get(a11yNode.ref) || {};
  const dom: DomInfo = {
    tagName: d.tagName || 'div', id: d.id || null,
    className: d.className || null,
    attributes: { ...emptyDomAttrs(), ...(d.attributes || {}) },
  };
  const { componentType, componentPrefix } = detectComponentType(dom.className);
  const framework: FrameworkInfo = {
    detected: d.attributes?.dataVAttrs?.length > 0 ? 'vue' : null,
    componentType, componentPrefix,
  };
  const geometry: GeometryInfo = {
    boundingBox: d.boundingBox || null,
    isInViewport: d.isInViewport ?? true,
    isVisible: d.isVisible ?? true,
    zIndex: d.zIndex || null,
  };
  const a11y: A11yInfo = {
    role: a11yNode.role || 'generic', name: a11yNode.name || '',
    level: a11yNode.level || null, checked: a11yNode.checked || null,
    disabled: a11yNode.disabled || false, expanded: a11yNode.expanded || null,
    selected: a11yNode.selected || null, pressed: a11yNode.pressed || null,
    required: a11yNode.required || null, readonly: a11yNode.readonly || null,
    multiline: a11yNode.multiline || null, haspopup: a11yNode.haspopup || null,
    roledescription: null,
  };
  const text: TextContent = {
    innerText: d.innerText?.slice(0, 200) || a11yNode.name?.slice(0, 200) || null,
    textContent: d.textContent?.slice(0, 200) || null,
  };
  const locators: Locators = {
    getByRole: a11y.role !== 'generic' ? [a11y.role, { name: a11y.name }] : null,
    getByTestId: dom.attributes.dataTestid ? [dom.attributes.dataTestid] : null,
    getByPlaceholder: dom.attributes.placeholder ? [dom.attributes.placeholder] : null,
    getByText: a11y.name ? [a11y.name] : null,
  };
  const partialNode: any = { ref, dom, a11y, geometry, framework, text, locators };
  const interaction: InteractionInfo = inferrer.enrichInteraction(partialNode);
  const node: AccTreeNode = { ref, dom, a11y, geometry, locators, interaction, framework, text };

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

export function domCollectScript(): string {
  return "(() => {const r=[];let i=0;for(const e of document.querySelectorAll('*')){const b=e.getBoundingClientRect();const s=getComputedStyle(e);const v=s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity)>0;const dv=[];for(const a of e.attributes){if(a.name.startsWith('data-v-'))dv.push(a.name);}r.push({ref:'e'+(++i),tagName:e.tagName.toLowerCase(),id:e.id||null,className:typeof e.className==='string'?e.className:null,attributes:{dataTestid:e.getAttribute('data-testid')||e.getAttribute('data-test-id'),dataQa:e.getAttribute('data-qa'),dataCy:e.getAttribute('data-cy'),dataVAttrs:dv,href:e.getAttribute('href'),type:e.getAttribute('type'),placeholder:e.getAttribute('placeholder'),name:e.getAttribute('name'),value:e.value||null,title:e.getAttribute('title'),src:e.getAttribute('src'),alt:e.getAttribute('alt'),tabindex:e.getAttribute('tabindex')?parseInt(e.getAttribute('tabindex')):null,autocomplete:e.getAttribute('autocomplete'),min:e.getAttribute('min'),max:e.getAttribute('max'),step:e.getAttribute('step'),maxlength:e.getAttribute('maxlength'),pattern:e.getAttribute('pattern'),accept:e.getAttribute('accept'),multiple:e.hasAttribute('multiple'),ariaLabel:e.getAttribute('aria-label'),ariaExpanded:e.getAttribute('aria-expanded')},boundingBox:b.width>0?{x:b.x,y:b.y,width:b.width,height:b.height}:null,isInViewport:b.top>=0&&b.left>=0&&b.bottom<=innerHeight&&b.right<=innerWidth,isVisible:v,zIndex:s.zIndex!=='auto'?parseInt(s.zIndex):null,innerText:e.innerText?e.innerText.slice(0,200):'',textContent:e.textContent?e.textContent.slice(0,200):'',});}return r;})()";
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
