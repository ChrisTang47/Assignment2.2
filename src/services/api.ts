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

// API 基礎設定
const BASE_URL = 'https://dae-mobile-assignment.hkit.cc/api';
const RESOURCE_ENDPOINT = '/yoga-poses';

/**
 * API 服務類別 - 處理所有與後端的通訊
 */
export class ApiService {
  private token: string | null = null;

  constructor() {
    // 從 localStorage 載入已儲存的 token
    this.token = localStorage.getItem('auth_token');
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
  }

  /**
   * 使用者註冊
   */
  async signup(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });

    return this.handleResponse<AuthResponse>(response);
  }

  /**
   * 使用者登入
   */
  async login(credentials: AuthRequest): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });

    return this.handleResponse<AuthResponse>(response);
  }

  /**
   * 檢查登入狀態
   */
  async checkAuth(): Promise<{ user_id: number | null }> {
    if (!this.token) {
      return { user_id: null };
    }

    const response = await fetch(`${BASE_URL}/auth/check`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<{ user_id: number | null }>(response);
  }

  /**
   * 收藏項目
   */
  async addBookmark(itemId: number): Promise<BookmarkResponse> {
    const response = await fetch(`${BASE_URL}/bookmarks/${itemId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<BookmarkResponse>(response);
  }

  /**
   * 取消收藏項目
   */
  async removeBookmark(itemId: number): Promise<BookmarkResponse> {
    const response = await fetch(`${BASE_URL}/bookmarks/${itemId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<BookmarkResponse>(response);
  }

  /**
   * 取得收藏列表
   */
  async getBookmarks(): Promise<BookmarkListResponse> {
    const response = await fetch(`${BASE_URL}/bookmarks`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<BookmarkListResponse>(response);
  }
}