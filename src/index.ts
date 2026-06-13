/**
 * Agent-for-Web-UI-Automation-Testing — 统一公共 API
 *
 * 导出工厂函数、类型和工具注册表，供外部消费者使用。
 */

// 工厂函数 — 供自定义入口使用
export { createMcpServer } from './server/factory.js';

// 工具注册表 — 供外部扩展使用
export { ALL_TOOLS } from './tools/index.js';

// 类型 — 供外部类型推导
export type { ToolDefinition, ToolVisibility, TransportType } from './types/tool.js';
export { VISIBILITY_MAP } from './types/tool.js';
