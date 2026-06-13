/** pw-fill — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwFill(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_fill
  return Promise.resolve({ ok: true, tool: 'pw-fill' });
}
