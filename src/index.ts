/** Agent-for-Web-UI-Automation-Testing — 统一公共 API */
export { ALL_TOOLS, VISIBILITY_MAP } from './capability/tools/registry.js';
export type { ToolDefinition, ToolVisibility, TransportType } from './capability/tools/registry.js';
export { InteractionInferrer } from './capability/engine/interaction-inferrer.js';
export { loadConfig } from './capability/config/loader.js';
