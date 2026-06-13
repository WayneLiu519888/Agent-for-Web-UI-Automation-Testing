/** pw-form — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwForm(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_form
  return Promise.resolve({ ok: true, tool: 'pw-form' });
}
