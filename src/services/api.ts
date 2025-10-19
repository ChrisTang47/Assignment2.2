import {
  YogaPose,
  ApiResponse,
  AuthRequest,
  AuthResponse,
  BookmarkResponse,
  BookmarkListResponse,
  QueryParams,
  ApiError
} from '../types/index.js';
import { LocalDataAdapter } from './localData.js';

// API 基礎設定
const BASE_URL = 'https://dae-mobile-assignment.hkit.cc/api';
const RESOURCE_ENDPOINT = '/yoga-poses';

/**
 * API 服務類別 - 處理所有與後端的通訊，支援本地資料 fallback
 */
export class ApiService {
  private token: string | null = null;
  private localDataAdapter: LocalDataAdapter;
  private useLocalData: boolean = false;

  constructor() {
    // 從 localStorage 載入已儲存的 token
    this.token = localStorage.getItem('auth_token');
    this.localDataAdapter = new LocalDataAdapter();
  }

  /**
   * 設定認證 token
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * 清除認證 token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * 取得認證標頭
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * 處理 API 回應 - 支援新的資料結構
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      
      // 檢查測試錯誤
      if (data.error && data.details?.includes('testing purposes')) {
        throw new Error(`測試錯誤: ${data.error}`);
      }
      
      // 檢查其他錯誤
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 如果是瑜伽動作資料，進行格式轉換以確保向後相容
      if (data.items && Array.isArray(data.items)) {
        const convertedItems = data.items.map((item: any) => ({
          ...item,
          // 確保向後相容的欄位存在
          imageUrl: item.image_url || item.imageUrl,
          videoUrl: item.video_url || item.videoUrl,
          level: item.difficulty || item.level,
          keys: item.keys || '暫無要點資訊',
          cautions: item.cautions || '暫無注意事項'
        }));
        
        return {
          ...data,
          items: convertedItems
        } as T;
      }
      
      return data as T;
      
    } catch (parseError) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      throw parseError;
    }
  }

  /**
   * 載入瑜伽動作資料 - 使用新的 API 結構
   */
  async fetchYogaPoses(params: QueryParams = {}): Promise<ApiResponse<YogaPose>> {
    // 優先使用真實 API，失敗時才使用本地資料
    try {
      console.log('嘗試從 API 獲取瑜伽動作:', params);
      
      const queryString = new URLSearchParams();
      
      if (params.page) queryString.append('page', params.page.toString());
      if (params.limit) queryString.append('limit', params.limit.toString());
      if (params.search) queryString.append('search', params.search);
      if (params.category) queryString.append('category', params.category);
      if (params.sort) queryString.append('sort', params.sort);
      if (params.order) queryString.append('order', params.order);

      const url = `${BASE_URL}${RESOURCE_ENDPOINT}?${queryString}`;
      console.log('API 請求 URL:', url);
      
      // 使用重試機制
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await this.handleResponse<ApiResponse<YogaPose>>(response);
      console.log('API 回應成功，項目數量:', data.items?.length || 0);
      
      return data;
      
    } catch (error) {
      console.warn('API 載入失敗，切換到本地資料:', error);
      this.useLocalData = true;
      return this.localDataAdapter.getYogaPoses(params);
    }
  }

  /**
   * 重試機制的 fetch
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        // 檢查是否是測試錯誤
        if (!response.ok) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (data.error && data.details?.includes('testing purposes')) {
              console.warn(`收到測試錯誤 (嘗試 ${i + 1}/${retries}):`, data.error);
              if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                continue;
              }
            }
          } catch (parseError) {
            // JSON 解析失敗，正常處理 HTTP 錯誤
          }
          
          // 重新建立 Response 物件以供後續處理
          return new Response(text, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        
        return response;
        
      } catch (error) {
        console.warn(`請求失敗 (嘗試 ${i + 1}/${retries}):`, error);
        if (i === retries - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw new Error('所有重試都失敗了');
  }

  /**
   * 使用者註冊
   */
  async signup(credentials: AuthRequest): Promise<AuthResponse> {
    if (this.useLocalData) {
      // 本地模擬註冊
      const mockResponse: AuthResponse = {
        user_id: Date.now(),
        token: 'mock_token_' + Date.now()
      };
      console.log('本地模擬註冊成功');
      return mockResponse;
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(credentials),
      });

      return this.handleResponse<AuthResponse>(response);
    } catch (error) {
      console.warn('API 註冊失敗，使用本地模擬');
      this.useLocalData = true;
      return this.signup(credentials);
    }
  }

  /**
   * 使用者登入
   */
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    if (this.useLocalData) {
      // 本地模擬登入
      const mockResponse: AuthResponse = {
        user_id: Date.now(),
        token: 'mock_token_' + Date.now()
      };
      console.log('本地模擬登入成功');
      return mockResponse;
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(credentials),
      });

      return this.handleResponse<AuthResponse>(response);
    } catch (error) {
      console.warn('API 登入失敗，使用本地模擬');
      this.useLocalData = true;
      return this.login(credentials);
    }
  }

  /**
   * 檢查登入狀態
   */
  async checkAuth(): Promise<{ user_id: number | null }> {
    if (!this.token) {
      return { user_id: null };
    }

    if (this.useLocalData) {
      // 本地模擬檢查
      return { user_id: this.token.startsWith('mock_token_') ? 12345 : null };
    }

    try {
      const response = await fetch(`${BASE_URL}/auth/check`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<{ user_id: number | null }>(response);
    } catch (error) {
      console.warn('API 檢查認證失敗，使用本地模擬');
      this.useLocalData = true;
      return this.checkAuth();
    }
  }

  /**
   * 收藏項目
   */
  async addBookmark(itemId: number): Promise<BookmarkResponse> {
    if (this.useLocalData) {
      // 本地模擬收藏
      const bookmarks = this.getLocalBookmarks();
      if (!bookmarks.includes(itemId)) {
        bookmarks.push(itemId);
        localStorage.setItem('local_bookmarks', JSON.stringify(bookmarks));
        return { message: 'newly bookmarked' };
      }
      return { message: 'already bookmarked' };
    }

    try {
      const response = await fetch(`${BASE_URL}/bookmarks/${itemId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<BookmarkResponse>(response);
    } catch (error) {
      console.warn('API 收藏失敗，使用本地模擬');
      this.useLocalData = true;
      return this.addBookmark(itemId);
    }
  }

  /**
   * 取消收藏項目
   */
  async removeBookmark(itemId: number): Promise<BookmarkResponse> {
    if (this.useLocalData) {
      // 本地模擬取消收藏
      const bookmarks = this.getLocalBookmarks();
      const index = bookmarks.indexOf(itemId);
      if (index > -1) {
        bookmarks.splice(index, 1);
        localStorage.setItem('local_bookmarks', JSON.stringify(bookmarks));
        return { message: 'newly deleted' };
      }
      return { message: 'already deleted' };
    }

    try {
      const response = await fetch(`${BASE_URL}/bookmarks/${itemId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<BookmarkResponse>(response);
    } catch (error) {
      console.warn('API 取消收藏失敗，使用本地模擬');
      this.useLocalData = true;
      return this.removeBookmark(itemId);
    }
  }

  /**
   * 取得收藏列表
   */
  async getBookmarks(): Promise<BookmarkListResponse> {
    if (this.useLocalData) {
      // 本地模擬收藏列表
      return { item_ids: this.getLocalBookmarks() };
    }

    try {
      const response = await fetch(`${BASE_URL}/bookmarks`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<BookmarkListResponse>(response);
    } catch (error) {
      console.warn('API 取得收藏列表失敗，使用本地模擬');
      this.useLocalData = true;
      return this.getBookmarks();
    }
  }

  /**
   * 取得本地收藏列表
   */
  private getLocalBookmarks(): number[] {
    try {
      const stored = localStorage.getItem('local_bookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 獲取所有分類
   */
  async getCategories(): Promise<string[]> {
    if (this.useLocalData) {
      console.log('使用本地資料獲取分類');
      return this.localDataAdapter.getCategories();
    }

    try {
      // 先嘗試從專門的分類 API 獲取
      const response = await this.fetchWithRetry(`${BASE_URL}/yoga-poses/categories`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      
      const data = await this.handleResponse<{ categories: string[] }>(response);
      return data.categories || [];
      
    } catch (error) {
      console.warn('獲取分類 API 失敗，嘗試從瑜伽動作列表提取分類:', error);
      
      try {
        // 如果分類 API 失敗，從瑜伽動作列表中提取分類
        const posesResponse = await this.fetchYogaPoses({ page: 1, limit: 100 });
        const categories = [...new Set(posesResponse.items.map(item => item.category))];
        return categories.filter(Boolean);
      } catch (listError) {
        console.warn('從瑜伽動作列表提取分類也失敗，切換到本地資料:', listError);
        this.useLocalData = true;
        return this.localDataAdapter.getCategories();
      }
    }
  }
}