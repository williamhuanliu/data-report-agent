/**
 * DuckDB 内存库：将 ParsedData 载入表，执行只读 SQL 并返回结果
 * 用于 SQL 分析路径（LLM 生成 SQL，服务端执行取数）
 * 运行时 require，避免未安装 duckdb 时构建失败
 */

import type { ParsedData } from "@/lib/types";

export type DuckDBConnection = {
  run: (sql: string, cb?: (err: Error | null) => void) => void;
  all: (sql: string, cb: (err: Error | null, res: Record<string, unknown>[]) => void) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; finalize: () => void };
  close: () => void;
};

function quoteId(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function duckdbType(
  colType: "number" | "date" | "string"
): "DOUBLE" | "DATE" | "VARCHAR" {
  if (colType === "number") return "DOUBLE";
  if (colType === "date") return "DATE";
  return "VARCHAR";
}

function runAsync(conn: DuckDBConnection, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.run(sql, (err: Error | null) => (err ? reject(err) : resolve()));
  });
}

function allAsync(conn: DuckDBConnection, sql: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err: Error | null, res: Record<string, unknown>[] | undefined) =>
      err ? reject(err) : resolve(res ?? [])
    );
  });
}

/** 仅允许 SELECT，且单条语句（无分号） */
function validateReadOnly(sql: string): void {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith("SELECT")) {
    throw new Error("只允许执行 SELECT 语句");
  }
  if (trimmed.includes(";")) {
    throw new Error("不允许多条语句，请只写一条 SELECT");
  }
}

/**
 * 创建内存库并返回连接（仅供当前请求使用，用毕需 close）
 * 需先安装依赖：npm install duckdb
 */
export function openDb(): DuckDBConnection {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const duckdb = require("duckdb");
  const db = new duckdb.Database(":memory:");
  return db.connect() as DuckDBConnection;
}

/**
 * 关闭连接并释放库
 */
export function closeDb(conn: DuckDBConnection): void {
  try {
    conn.close();
  } catch {
    // ignore
  }
}

/**
 * 将多份 ParsedData 载入 DuckDB，表名为 t1, t2, ...
 * tableNames 可选，默认 ["t1","t2",...]
 */
export async function loadParsedData(
  conn: DuckDBConnection,
  dataList: ParsedData[],
  tableNames?: string[]
): Promise<void> {
  const names =
    tableNames ??
    dataList.map((_, i) => `t${i + 1}`);

  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    const tableName = names[i] ?? `t${i + 1}`;
    const headers = data.headers;
    const columnTypes = data.columnTypes ?? {};
    const cols = headers.map((h) => {
      const t = columnTypes[h] ?? "string";
      return `${quoteId(h)} ${duckdbType(t)}`;
    });
    await runAsync(
      conn,
      `CREATE TABLE ${quoteId(tableName)} (${cols.join(", ")})`
    );

    if (data.rows.length === 0) continue;

    const placeholders = headers.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${quoteId(tableName)} (${headers.map(quoteId).join(", ")}) VALUES (${placeholders})`;
    const stmt = conn.prepare(insertSql);
    for (const row of data.rows) {
      const values = headers.map((h) => row[h] ?? null);
      stmt.run(...values);
    }
    stmt.finalize();
  }
}

/**
 * 执行一条只读 SQL，返回行数组（每行为 Record<string, unknown>）
 * 会校验仅 SELECT、单条语句
 */
export async function executeReadOnlyQuery(
  conn: DuckDBConnection,
  sql: string
): Promise<Record<string, unknown>[]> {
  validateReadOnly(sql);
  return allAsync(conn, sql);
}
