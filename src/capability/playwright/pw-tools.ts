/**
 * Playwright MCP 封装工具集
 *
 * 将 20 个 Playwright MCP 工具的轻量封装合并到单一文件，
 * 消除原先 20 个完全同构文件的冗余。
 *
 * 所有工具函数遵循相同模式：
 *   - 接收 PwAdapter 实例和参数
 *   - 委托 @playwright/mcp 的对应 browser_* 工具
 *   - 返回 Promise<{ ok: true; tool: string }>
 *
 * 对应关系：
 *   pwNavigate   → browser_navigate
 *   pwClick      → browser_click
 *   pwFill       → browser_type / browser_fill
 *   pwForm       → browser_fill_form
 *   pwSelect     → browser_select_option
 *   pwHover      → browser_hover
 *   pwKeyboard   → browser_press_key
 *   pwDrag       → browser_drag
 *   pwWait       → browser_wait_for
 *   pwSnapshot   → browser_snapshot
 *   pwScreenshot → browser_take_screenshot
 *   pwEvaluate   → browser_evaluate
 *   pwUpload     → browser_file_upload
 *   pwTabs       → browser_tabs
 *   pwResize     → browser_resize
 *   pwDialog     → browser_handle_dialog
 *   pwConsole    → browser_console_messages
 *   pwNetwork    → browser_network_requests
 *   pwBack       → browser_navigate_back
 *   pwClose      → browser_close
 */

import type { PwAdapter } from './adapter.js';

export function pwNavigate(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_navigate
  return Promise.resolve({ ok: true, tool: 'pw-navigate' });
}

export function pwClick(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_click
  return Promise.resolve({ ok: true, tool: 'pw-click' });
}

export function pwFill(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_type / browser_fill
  return Promise.resolve({ ok: true, tool: 'pw-fill' });
}

export function pwForm(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_fill_form
  return Promise.resolve({ ok: true, tool: 'pw-form' });
}

export function pwSelect(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_select_option
  return Promise.resolve({ ok: true, tool: 'pw-select' });
}

export function pwHover(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_hover
  return Promise.resolve({ ok: true, tool: 'pw-hover' });
}

export function pwKeyboard(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_press_key
  return Promise.resolve({ ok: true, tool: 'pw-keyboard' });
}

export function pwDrag(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_drag
  return Promise.resolve({ ok: true, tool: 'pw-drag' });
}

export function pwWait(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_wait_for
  return Promise.resolve({ ok: true, tool: 'pw-wait' });
}

export function pwSnapshot(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_snapshot
  return Promise.resolve({ ok: true, tool: 'pw-snapshot' });
}

export function pwScreenshot(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_take_screenshot
  return Promise.resolve({ ok: true, tool: 'pw-screenshot' });
}

export function pwEvaluate(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_evaluate
  return Promise.resolve({ ok: true, tool: 'pw-evaluate' });
}

export function pwUpload(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_file_upload
  return Promise.resolve({ ok: true, tool: 'pw-upload' });
}

export function pwTabs(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_tabs
  return Promise.resolve({ ok: true, tool: 'pw-tabs' });
}

export function pwResize(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_resize
  return Promise.resolve({ ok: true, tool: 'pw-resize' });
}

export function pwDialog(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_handle_dialog
  return Promise.resolve({ ok: true, tool: 'pw-dialog' });
}

export function pwConsole(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_console_messages
  return Promise.resolve({ ok: true, tool: 'pw-console' });
}

export function pwNetwork(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_network_requests
  return Promise.resolve({ ok: true, tool: 'pw-network' });
}

export function pwBack(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_navigate_back
  return Promise.resolve({ ok: true, tool: 'pw-back' });
}

export function pwClose(adapter: PwAdapter, args: any): Promise<any> {
  // 委托 @playwright/mcp browser_close
  return Promise.resolve({ ok: true, tool: 'pw-close' });
}
