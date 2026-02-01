# AI 数据报告生成器

一个 AI 驱动的自动化数据报告生成工具，帮助企业快速将枯燥的数据转化为专业的分析报告。

## 功能特点

- **智能数据解析**：支持 Excel (.xlsx, .xls) 和 CSV 文件上传
- **多 AI 服务商支持**：OpenAI、Anthropic Claude、OpenRouter（支持多种模型）
- **自动生成洞察**：AI 不只是画图，而是像数据分析师一样写结论
- **精美报告页面**：自动渲染成可分享的 H5 页面
- **关键指标提取**：自动识别并展示最重要的数据指标
- **行动建议**：提供可操作的改进建议

## 快速开始

### 1. 安装依赖

```bash
npm install
```

若需使用「SQL 分析」模式（导入数据后勾选「使用 SQL 分析（DuckDB）」），需安装可选依赖 DuckDB（含原生二进制，安装可能稍慢）：

```bash
npm install duckdb
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，至少配置一个 AI 服务商的 API Key：

```env
# OpenAI
OPENAI_API_KEY=sk-xxx

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenRouter（可选，支持多种模型）
OPENROUTER_API_KEY=sk-or-xxx
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

## 使用流程

1. **上传数据**：拖拽或点击上传 Excel/CSV 文件
2. **预览确认**：查看数据预览，设置报告标题
3. **选择 AI**：选择 AI 服务商（OpenAI / Claude / OpenRouter）
4. **生成报告**：点击"生成报告"，等待 AI 分析
5. **查看分享**：报告生成后可通过链接分享

## 技术栈

- **框架**：Next.js 16 (App Router) + React 19
- **样式**：Tailwind CSS 4
- **数据解析**：xlsx (SheetJS)
- **AI 集成**：OpenAI SDK + Anthropic SDK
- **图表**：Recharts
- **存储**：本地 JSON 文件（MVP 阶段）

## 项目结构

```
app/
├── page.tsx                 # 首页（上传入口）
├── reports/[id]/page.tsx    # 报告详情页
├── components/              # UI 组件
│   ├── FileUploader.tsx
│   ├── DataPreview.tsx
│   ├── AIProviderSelector.tsx
│   └── report/              # 报告相关组件
├── api/
│   ├── analyze/route.ts     # AI 分析接口
│   └── reports/             # 报告 CRUD
lib/
├── types.ts                 # 类型定义
├── excel-parser.ts          # Excel 解析
├── storage.ts               # 数据存储
└── ai/                      # AI 客户端
    ├── openai.ts
    ├── anthropic.ts
    ├── openrouter.ts
    └── prompt.ts
data/
└── reports/                 # 报告 JSON 文件
```

## License

MIT
