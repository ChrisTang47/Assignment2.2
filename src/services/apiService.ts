import { YogaPose, ApiResponse, QueryParams } from '../types/index.js';

/**
 * API 服務 - 處理瑜伽動作 API 請求
 */
export class ApiService {
  private baseUrl = 'https://dae-mobile-assignment.hkit.cc/api';
  private retryCount = 3;
  private retryDelay = 1000; // 1 秒

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重試機制的 fetch
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.retryCount; i++) {
      try {
        console.log(`API 請求嘗試 ${i + 1}/${this.retryCount}:`, url);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });

        // 檢查回應內容
        const responseText = await response.text();
        
        try {
          const data = JSON.parse(responseText);
          
          // 檢查是否是測試錯誤
          if (data.error && data.details?.includes('testing purposes')) {
            console.warn(`收到測試錯誤 (嘗試 ${i + 1}/${this.retryCount}):`, data.error);
            throw new Error(`測試錯誤: ${data.error}`);
          }
          
          // 檢查其他錯誤
          if (data.error) {
            throw new Error(data.error);
          }
          
          // 成功回應，重新建立 Response 物件
          return new Response(responseText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
          
        } catch (parseError) {
          // JSON 解析失敗，檢查 HTTP 狀態
          if (response.ok) {
            return response;
          }
          throw new Error(`API 回應格式錯誤: ${response.status}`);
        }
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`API 請求失敗 (嘗試 ${i + 1}/${this.retryCount}):`, error);

        // 如果不是最後一次嘗試，等待後重試
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * (i + 1)); // 指數退避
        }
      }
    }

    throw lastError || new Error('API 請求失敗');
  }

  /**
   * 處理 API 回應
   */
  private async handleApiResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    return data;
  }

  /**
   * 轉換 API 資料，確保向後相容
   */
  private convertApiDataToYogaPose(item: any): YogaPose {
    return {
      ...item,
      // 新增向後相容的欄位
      imageUrl: item.image_url,
      videoUrl: item.video_url,
      level: item.difficulty,
      keys: '暫無要點資訊',
      cautions: '暫無注意事項'
    };
  }

  /**
   * 獲取瑜伽動作列表
   */
  async getYogaPoses(params: QueryParams = {}): Promise<ApiResponse<YogaPose>> {
    try {
      // 構建查詢參數
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.category) searchParams.append('category', params.category);
      if (params.sort) searchParams.append('sort', params.sort);
      if (params.order) searchParams.append('order', params.order);

      const url = `${this.baseUrl}/yoga-poses/?${searchParams.toString()}`;
      console.log('獲取瑜伽動作列表:', url);

      const response = await this.fetchWithRetry(url);
      const data = await this.handleApiResponse<any>(response);

      // 轉換資料格式
      const convertedItems = (data.items || []).map((item: any) => 
        this.convertApiDataToYogaPose(item)
      );

      console.log('API 回應成功，項目數量:', convertedItems.length);

      return {
        items: convertedItems,
        pagination: data.pagination || {
          page: params.page || 1,
          limit: params.limit || 10,
          total: convertedItems.length
        }
      };
    } catch (error) {
      console.error('API 請求失敗:', error);
      
      // 返回空結果而不是拋出錯誤，讓應用繼續運行
      return {
        items: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: 0
        }
      };
    }
  }

  /**
   * 獲取單個瑜伽動作
   */
  async getYogaPose(id: number): Promise<YogaPose | null> {
    try {
      const url = `${this.baseUrl}/yoga-poses/${id}`;
      const response = await this.fetchWithRetry(url);
      const data = await this.handleApiResponse<any>(response);

      return this.convertApiDataToYogaPose(data);
    } catch (error) {
      console.error(`獲取瑜伽動作 ${id} 失敗:`, error);
      return null;
    }
  }

  /**
   * 獲取所有分類
   */
  async getCategories(): Promise<string[]> {
    try {
      // 先嘗試從專門的分類 API 獲取
      const url = `${this.baseUrl}/yoga-poses/categories`;
      const response = await this.fetchWithRetry(url);
      const data = await this.handleApiResponse<any>(response);

      return data.categories || [];
    } catch (error) {
      console.warn('獲取分類 API 失敗，嘗試從瑜伽動作列表提取分類:', error);
      
      try {
        // 如果分類 API 失敗，從瑜伽動作列表中提取分類
        const response = await this.getYogaPoses({ page: 1, limit: 100 });
        const categories = [...new Set(response.items.map(item => item.category))];
        return categories.filter(Boolean);
      } catch (listError) {
        console.error('從瑜伽動作列表提取分類也失敗:', listError);
        
        // 返回預設分類
        return ['休息式', '坐姿式', '開髖式', '站立式', '俯臥式', '仰臥式', '扭轉式', '後彎式', '前彎式', '平衡式'];
      }
    }
  }
}

// 創建單例實例
export const apiService = new ApiService();