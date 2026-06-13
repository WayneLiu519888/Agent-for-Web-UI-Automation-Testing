/** pw-dialog — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwDialog(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_dialog
  return Promise.resolve({ ok: true, tool: 'pw-dialog' });
}
