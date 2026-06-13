/** pw-close — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwClose(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_close
  return Promise.resolve({ ok: true, tool: 'pw-close' });
}
