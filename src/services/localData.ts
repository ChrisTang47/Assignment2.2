import { YogaPose, ApiResponse, QueryParams } from '../types/index.js';
import { apiService } from './apiService.js';

/**
 * 資料適配器 - 現在使用 API 服務而不是本地檔案
 * 保持原有介面以維持向後相容性
 */
export class LocalDataAdapter {
  
  /**
   * 獲取瑜伽動作列表（現在從 API 獲取）
   */
  async getYogaPoses(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<YogaPose>> {
    console.log('使用 API 服務獲取瑜伽動作:', params);
    
    // 將參數轉換為 QueryParams 類型
    const queryParams: QueryParams = {
      page: params.page,
      limit: params.limit,
      search: params.search,
      category: params.category,
      sort: params.sort,
      order: params.order
    };
    
    return await apiService.getYogaPoses(queryParams);
  }

  /**
   * 取得所有分類（現在從 API 獲取）
   */
  async getCategories(): Promise<string[]> {
    console.log('使用 API 服務獲取分類');
    return await apiService.getCategories();
  }

  /**
   * 取得單個瑜伽動作（新增功能）
   */
  async getYogaPose(id: number): Promise<YogaPose | null> {
    console.log('使用 API 服務獲取單個瑜伽動作:', id);
    return await apiService.getYogaPose(id);
  }
}