import fs from 'node:fs/promises';
import path from 'node:path';

// 从 frontend/ 目录回退到项目根目录，再进入 docs/mock-api
const MOCK_API_DIR = path.resolve('..', 'docs', 'mock-api');

export async function fetchHome() {
  const filePath = path.join(MOCK_API_DIR, 'home.json');
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function fetchBoard(slug: string, page: number = 1) {
  // 目前 mock 数据只有 board-retro-chat-page-1.json
  const filePath = path.join(MOCK_API_DIR, `board-${slug}-page-${page}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function fetchThread(id: string) {
  const filePath = path.join(MOCK_API_DIR, `thread-${id}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function fetchThreadPosts(id: string, page: number = 1) {
  const filePath = path.join(MOCK_API_DIR, `thread-${id}-posts-page-${page}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}
