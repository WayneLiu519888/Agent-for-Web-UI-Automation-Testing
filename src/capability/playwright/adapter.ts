/**
 * Playwright MCP 封装层 — 统一接口
 * 所有底层浏览器操作委托给 @playwright/mcp 的 browser_* 工具
 * 通过此接口实现可替换、可 Mock 的执行层
 */
export interface TargetRef {
  ref?: string;
  testId?: string;
  role?: string;
  roleName?: string;
  placeholder?: string;
  text?: string;
  selector?: string;
}
export interface FormField { target: TargetRef; value: string; }
export interface WaitOptions { time?: number; text?: string; textGone?: string; urlContains?: string; }
export interface ScreenshotOptions { fullPage?: boolean; filename?: string; }
export interface A11ySnapshot { elements: Array<{ ref: string; role: string; name: string; children?: A11ySnapshot['elements']; }>; }
export interface PwAdapter {
  navigate(url: string): Promise<void>;
  click(target: TargetRef): Promise<void>;
  dblclick(target: TargetRef): Promise<void>;
  fill(target: TargetRef, value: string): Promise<void>;
  fillForm(fields: FormField[]): Promise<void>;
  select(target: TargetRef, values: string[]): Promise<void>;
  hover(target: TargetRef): Promise<void>;
  pressKey(key: string): Promise<void>;
  drag(start: TargetRef, end: TargetRef): Promise<void>;
  waitFor(opts: WaitOptions): Promise<void>;
  snapshot(): Promise<A11ySnapshot>;
  screenshot(opts?: ScreenshotOptions): Promise<Buffer>;
  evaluate(script: string): Promise<any>;
  uploadFiles(paths: string[]): Promise<void>;
  tabs(action: 'list'|'close'|'select'|'new', index?: number): Promise<void>;
  resize(width: number, height: number): Promise<void>;
  handleDialog(accept: boolean, promptText?: string): Promise<void>;
  consoleMessages(): Promise<string[]>;
  networkRequests(): Promise<any[]>;
  navigateBack(): Promise<void>;
  close(): Promise<void>;
}
