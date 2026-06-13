#!/usr/bin/env node
/**
 * HTTP Streamable 传输入口
 *
 * 启动 Express + Streamable HTTP 服务器，供远程 MCP 客户端通过 HTTP 调用。
 * 注册 visibility 为 'all' 和 'http' 的工具。
 *
 * 用法：
 *   PORT=3000 node dist/entries/http.js
 *   npx tsx src/entries/http.ts
 */

import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createMcpServer } from '../server/factory.js';

async function main() {
  const mcpServer = createMcpServer('http');
  const app = createMcpExpressApp();

  // MCP Streamable HTTP 端点
  // 使用 stateless 模式：每次请求创建新的 transport 实例
  app.post('/mcp', async (req, res) => {
    const transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless 模式
    });

    await mcpServer.connect(transport);

    // 客户端断开连接时清理 transport
    res.on('close', () => {
      transport.close();
    });

    // Express JSON body-parser 已内置在 createMcpExpressApp 中
    await transport.handleRequest(req, res, req.body);
  });

  // 健康检查端点
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const port = parseInt(process.env.PORT || '3000', 10);

  app.listen(port, () => {
    console.error(`[MCP HTTP] 服务已启动 → http://localhost:${port}/mcp`);
    console.error(`[MCP HTTP] 健康检查 → http://localhost:${port}/health`);
  });
}

main().catch((err) => {
  console.error('[MCP HTTP] 启动失败:', err);
  process.exit(1);
});
