import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

// If PUBLIC_API_BASE_URL is not set, we default to using local mock JSON files.
const USE_MOCK = !import.meta.env.PUBLIC_API_BASE_URL;
const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || '';

async function fetchJson(endpoint: string, mockFile: string) {
  if (USE_MOCK) {
    const MOCK_API_DIR = path.resolve('..', 'docs', 'mock-api');
    const filePath = path.join(MOCK_API_DIR, mockFile);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Mock data not found or invalid: ${filePath}`, e);
      return { ok: false, error: 'Not found' };
    }
  } else {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      console.error(`API error for ${endpoint}: ${res.statusText}`);
      return { ok: false, error: res.statusText };
    }
    return res.json();
  }
}

export async function fetchHome() {
  return fetchJson('/api/home', 'home.json');
}

export async function fetchBoard(slug: string, page: number = 1) {
  return fetchJson(`/api/boards/${slug}?page=${page}`, `board-${slug}-page-${page}.json`);
}

export async function fetchThread(id: string) {
  return fetchJson(`/api/threads/${id}`, `thread-${id}.json`);
}

export async function fetchThreadPosts(id: string, page: number = 1) {
  return fetchJson(`/api/threads/${id}/posts?page=${page}`, `thread-${id}-posts-page-${page}.json`);
}

// Helpers for SSG (getStaticPaths)
export async function fetchBoardSlugs() {
  if (USE_MOCK) {
    const MOCK_API_DIR = path.resolve('..', 'docs', 'mock-api');
    const files = fsSync.readdirSync(MOCK_API_DIR);
    return files
      .filter((file: string) => file.startsWith('board-') && file.endsWith('-page-1.json'))
      .map((file: string) => file.replace('board-', '').replace('-page-1.json', ''));
  } else {
    // Fallback for real API mode during static generation
    // In a real scenario, you'd fetch /api/boards and map the slugs, or switch Astro to SSR mode.
    return ['retro-chat', 'retro-games', 'retro-hardware']; 
  }
}

export async function fetchThreadIds() {
  if (USE_MOCK) {
    const MOCK_API_DIR = path.resolve('..', 'docs', 'mock-api');
    const files = fsSync.readdirSync(MOCK_API_DIR);
    return files
      .filter((file: string) => file.startsWith('thread-') && !file.includes('-posts-'))
      .map((file: string) => file.replace('thread-', '').replace('.json', ''));
  } else {
    // Fallback for real API mode during static generation
    return ['12', '88', '91', '102', '135'];
  }
}
