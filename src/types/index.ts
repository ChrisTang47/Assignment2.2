// 瑜伽動作資料型別 - 匹配 API 資料結構
export interface YogaPose {
  id: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sanskrit_name: string;
  difficulty: string;
  duration_minutes: number;
  instructor: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  image_url: string;
  video_url: string;
  benefits: string[];
  // 保留向後相容的欄位
  imageUrl?: string;
  videoUrl?: string;
  level?: string;
  keys?: string;
  cautions?: string;
}

// API 回應型別
export interface ApiResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// 錯誤型別
export interface ApiError {
  error: string;
}

// 使用者型別
export interface User {
  user_id: number;
  username: string;
}

// 認證回應型別
export interface AuthResponse {
  user_id: number;
  token: string;
}

// 認證請求型別
export interface AuthRequest {
  username: string;
  password: string;
}

// 收藏回應型別
export interface BookmarkResponse {
  message: 'newly bookmarked' | 'already bookmarked' | 'newly deleted' | 'already deleted';
}

// 收藏列表回應型別
export interface BookmarkListResponse {
  item_ids: number[];
}

// 載入狀態型別
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 查詢參數型別
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}