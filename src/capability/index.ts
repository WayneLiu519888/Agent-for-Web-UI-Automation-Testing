/** Agent-for-Web-UI-Automation-Testing — 能力层统一导出 */
export { ALL_TOOLS } from './tools/index.js';
export { InteractionInferrer } from './engine/interaction-inferrer.js';
export { buildAccTreeNode, createAccTreeDocument, domCollectScript } from './engine/acc-tree.js';
export { buildLocators } from './engine/locator-builder.js';
export { explorePage } from './engine/explorer.js';
export type { PwAdapter } from './playwright/adapter.js';
export type { TargetRef, FormField, WaitOptions, ScreenshotOptions } from './playwright/adapter.js';
