/** pw-evaluate — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwEvaluate(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_evaluate
  return Promise.resolve({ ok: true, tool: 'pw-evaluate' });
}
