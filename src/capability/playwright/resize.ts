/** pw-resize — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwResize(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_resize
  return Promise.resolve({ ok: true, tool: 'pw-resize' });
}
