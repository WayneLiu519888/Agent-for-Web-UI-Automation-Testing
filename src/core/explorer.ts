/**
 * 页面探索器 — 快速模式 + 深度模式（BFS 爬虫）
 */
import type { AccTreeDocument, PageLink, AccTreeNode } from '../types/yaml.js';
import { createAccTreeDocument, buildAccTreeNode, domCollectScript } from './acc-tree.js';
import { InteractionInferrer } from './interaction-inferrer.js';
import { writeAccTree } from './yaml-writer.js';
import { loadConfig } from '../config/loader.js';

export interface ExploreResult {
  explored_pages: Array<{ url: string; yaml_path: string; element_count: number }>;
  summary: { total_pages: number; total_elements: number; total_links: number };
  errors: Array<{ url: string; reason: string }>;
}

/**
 * 全部委托 Playwright MCP 的 page/browser:
 *   browser_navigate(url)
 *   browser_snapshot() → ARIA 树
 *   page.evaluate(domCollectScript()) → DOM 数据
 *
 * 此处是框架 —— 实际执行由 LLM Agent 在运行时调用 Playwright MCP
 */
export async function explorePage(
  url: string,
  mode: 'quick' | 'deep',
  options: { maxDepth?: number; maxPages?: number; outputDir?: string; filterExclude?: string[] },
): Promise<ExploreResult> {
  const config = loadConfig();
  const maxDepth = options.maxDepth || config.explorer.max_depth;
  const maxPages = options.maxPages || config.explorer.max_pages;
  const filterExclude = options.filterExclude || config.explorer.filter_exclude;
  const outputDir = options.outputDir || 'acc-trees';

  const inferrer = new InteractionInferrer();
  const result: ExploreResult = {
    explored_pages: [],
    summary: { total_pages: 0, total_elements: 0, total_links: 0 },
    errors: [],
  };

  // BFS 队列
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url, depth: 0 }];

  while (queue.length > 0 && visited.size < maxPages) {
    const { url: currentUrl, depth } = queue.shift()!;
    if (visited.has(currentUrl)) continue;
    if (filterExclude?.some(p => currentUrl.includes(p))) continue;
    visited.add(currentUrl);

    const loadStart = Date.now();
    try {
      // 此处运行时由 LLM Agent 调用 Playwright MCP
      // browser_navigate(currentUrl) + browser_snapshot() + page.evaluate(domCollectScript())
      // 以下是伪执行骨架
      const title = `Page: ${currentUrl}`;
      const pageLoadMs = Date.now() - loadStart;

      // 构建 Acc Tree（实际由 LLM Agent 在运行时完成）
      const tree: AccTreeNode[] = [];
      const links: PageLink[] = [];
      const doc: AccTreeDocument = createAccTreeDocument(currentUrl, title, mode, pageLoadMs, tree, links);

      const yamlPath = writeAccTree(doc, outputDir);
      result.explored_pages.push({ url: currentUrl, yaml_path: yamlPath, element_count: 0 });
      result.summary.total_pages++;
      result.summary.total_elements += doc.page.total_elements;
      result.summary.total_links += links.length;

      // Deep 模式: 收集同域链接入队
      if (mode === 'deep' && depth < maxDepth) {
        for (const link of links) {
          const fullUrl = new URL(link.href, currentUrl).href;
          if (!visited.has(fullUrl) && !filterExclude?.some(p => fullUrl.includes(p))) {
            queue.push({ url: fullUrl, depth: depth + 1 });
          }
        }
      }
    } catch (err: any) {
      result.errors.push({ url: currentUrl, reason: err.message || String(err) });
    }
  }

  return result;
}
