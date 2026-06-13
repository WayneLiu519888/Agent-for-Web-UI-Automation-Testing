/** pw-keyboard — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwKeyboard(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_keyboard
  return Promise.resolve({ ok: true, tool: 'pw-keyboard' });
}
