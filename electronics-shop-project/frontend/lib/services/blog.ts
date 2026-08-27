import { apiClient } from "../apiClient";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  category: "news" | "promotion" | "guide" | string;
  is_published: boolean;
  published_at: string | null;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BlogPostInput {
  title: string;
  summary?: string;
  content?: string;
  image_url?: string;
  category: string;
  is_published?: boolean;
  display_order?: number;
}

export async function listPosts(params?: {
  category?: string;
  published_only?: boolean;
  page?: number;
  per_page?: number;
}): Promise<BlogPost[]> {
  const { data } = await apiClient.get<BlogPost[]>("/blog", { params });
  return data;
}

export async function getPost(slug: string): Promise<BlogPost> {
  const { data } = await apiClient.get<BlogPost>(`/blog/${slug}`);
  return data;
}

export async function listAllPosts(params?: { category?: string }): Promise<BlogPost[]> {
  const { data } = await apiClient.get<BlogPost[]>("/blog/admin/all", { params });
  return data;
}

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  const { data } = await apiClient.post<BlogPost>("/blog", input);
  return data;
}

export async function updatePost(id: string, payload: Partial<BlogPostInput>): Promise<BlogPost> {
  const { data } = await apiClient.put<BlogPost>(`/blog/${id}`, payload);
  return data;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`/blog/${id}`);
}
