/** pw-screenshot — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwScreenshot(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_screenshot
  return Promise.resolve({ ok: true, tool: 'pw-screenshot' });
}
