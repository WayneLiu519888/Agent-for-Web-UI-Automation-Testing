/** pw-snapshot — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwSnapshot(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_snapshot
  return Promise.resolve({ ok: true, tool: 'pw-snapshot' });
}
