/** Agent-for-Web-UI-Automation-Testing — 统一公共 API */
export { ALL_TOOLS } from './capability/tools/registry.js';
export type { ToolDefinition, ToolVisibility, TransportType } from './types/tool.js';
export { VISIBILITY_MAP } from './types/tool.js';
export { InteractionInferrer } from './capability/engine/interaction-inferrer.js';
export type { PwAdapter } from './capability/playwright/adapter.js';
