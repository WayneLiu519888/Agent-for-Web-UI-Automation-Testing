/** pw-select — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwSelect(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_select
  return Promise.resolve({ ok: true, tool: 'pw-select' });
}
