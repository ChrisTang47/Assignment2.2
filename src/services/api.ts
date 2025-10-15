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
   * 處理 API 回應
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * 載入瑜伽動作資料
   */
  async fetchYogaPoses(params: QueryParams = {}): Promise<ApiResponse<YogaPose>> {
    // 如果已經設定使用本地資料，直接使用
    if (this.useLocalData) {
      console.log('使用本地資料');
      return this.localDataAdapter.getYogaPoses(params);
    }

    try {
      const queryString = new URLSearchParams();
      
      if (params.page) queryString.append('page', params.page.toString());
      if (params.limit) queryString.append('limit', params.limit.toString());
      if (params.search) queryString.append('search', params.search);
      if (params.category) queryString.append('category', params.category);
      if (params.sort) queryString.append('sort', params.sort);
      if (params.order) queryString.append('order', params.order);

      const url = `${BASE_URL}${RESOURCE_ENDPOINT}?${queryString}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse<ApiResponse<YogaPose>>(response);
      
    } catch (error) {
      console.warn('API 載入失敗，切換到本地資料:', error);
      this.useLocalData = true;
      return this.localDataAdapter.getYogaPoses(params);
    }
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
}