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
  try {
    const filePath = path.join(MOCK_API_DIR, `board-${slug}-page-${page}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // Fallback for mock data
    const fallbackPath = path.join(MOCK_API_DIR, `board-retro-chat-page-1.json`);
    const data = await fs.readFile(fallbackPath, 'utf-8');
    return JSON.parse(data);
  }
}

export async function fetchThread(id: string) {
  try {
    const filePath = path.join(MOCK_API_DIR, `thread-${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    const fallbackPath = path.join(MOCK_API_DIR, `thread-88.json`);
    const data = await fs.readFile(fallbackPath, 'utf-8');
    return JSON.parse(data);
  }
}

export async function fetchThreadPosts(id: string, page: number = 1) {
  try {
    const filePath = path.join(MOCK_API_DIR, `thread-${id}-posts-page-${page}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    const fallbackPath = path.join(MOCK_API_DIR, `thread-88-posts-page-1.json`);
    const data = await fs.readFile(fallbackPath, 'utf-8');
    return JSON.parse(data);
  }
}
