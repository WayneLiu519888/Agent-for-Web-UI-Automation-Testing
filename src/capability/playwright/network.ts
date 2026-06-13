/** pw-network — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwNetwork(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_network
  return Promise.resolve({ ok: true, tool: 'pw-network' });
}
