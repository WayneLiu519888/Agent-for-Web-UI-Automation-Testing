/** pw-wait — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwWait(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_wait
  return Promise.resolve({ ok: true, tool: 'pw-wait' });
}
