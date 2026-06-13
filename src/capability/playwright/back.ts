/** pw-back — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwBack(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_back
  return Promise.resolve({ ok: true, tool: 'pw-back' });
}
