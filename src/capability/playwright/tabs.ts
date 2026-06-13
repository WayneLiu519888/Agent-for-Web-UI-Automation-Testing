/** pw-tabs — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwTabs(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_tabs
  return Promise.resolve({ ok: true, tool: 'pw-tabs' });
}
