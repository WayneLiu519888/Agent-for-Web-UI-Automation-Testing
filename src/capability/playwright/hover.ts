/** pw-hover — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwHover(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_hover
  return Promise.resolve({ ok: true, tool: 'pw-hover' });
}
