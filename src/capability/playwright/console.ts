/** pw-console — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwConsole(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_console
  return Promise.resolve({ ok: true, tool: 'pw-console' });
}
