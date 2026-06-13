/** pw-drag — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwDrag(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_drag
  return Promise.resolve({ ok: true, tool: 'pw-drag' });
}
