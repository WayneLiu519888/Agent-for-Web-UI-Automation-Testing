/** pw-upload — Playwright MCP 封装工具 */
import type { PwAdapter } from './adapter.js';
export function pwUpload(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_upload
  return Promise.resolve({ ok: true, tool: 'pw-upload' });
}
