import { YogaPose, ApiResponse } from '../types/index.js';

/**
 * 本地資料適配器 - 將 post.js 的資料格式轉換為 API 格式
 */
export class LocalDataAdapter {
  private localItems: any[] = [];

  constructor() {
    this.loadLocalData();
  }

  /**
   * 載入本地資料
   */
  private async loadLocalData() {
    try {
      // 使用 fetch 載入 post.js
      const response = await fetch('./post.js');
      const text = await response.text();
      
      // 使用 eval 執行 JavaScript 並提取 items
      const tempScript = document.createElement('script');
      tempScript.textContent = text;
      document.head.appendChild(tempScript);
      
      // 從全域變數取得 items
      this.localItems = (window as any).items || [];
      
      // 清理
      document.head.removeChild(tempScript);
      
      console.log('本地資料載入成功:', this.localItems.length, '個項目');
    } catch (error) {
      console.error('載入本地資料失敗:', error);
      this.localItems = [];
    }
  }

  /**
   * 將本地資料轉換為 API 格式
   */
  private convertToApiFormat(item: any, index: number): YogaPose {
    return {
      id: index + 1,
      title: item.pose?.replace('Pose : ', '') || item.title || '未知動作',
      description: item.benefits || item.description || '暫無描述',
      category: item.category || '未分類',
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      level: item.level?.replace('Level : ', '') || '未知',
      benefits: item.benefits || '暫無好處說明',
      keys: item.keys || '暫無要點',
      cautions: item.cautions || '暫無注意事項',
      tags: item.tags || []
    };
  }

  /**
   * 模擬 API 回應格式
   */
  async getYogaPoses(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<ApiResponse<YogaPose>> {
    // 確保本地資料已載入
    if (this.localItems.length === 0) {
      await this.loadLocalData();
    }

    let filteredItems = [...this.localItems];
    
    // 搜尋過濾
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.pose?.toLowerCase().includes(searchTerm) ||
        item.level?.toLowerCase().includes(searchTerm) ||
        item.benefits?.toLowerCase().includes(searchTerm) ||
        item.keys?.toLowerCase().includes(searchTerm) ||
        item.category?.toLowerCase().includes(searchTerm) ||
        (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // 分類過濾
    if (params.category) {
      filteredItems = filteredItems.filter(item => item.category === params.category);
    }

    // 排序
    if (params.sort) {
      filteredItems.sort((a, b) => {
        let aValue: string;
        let bValue: string;

        switch (params.sort) {
          case 'title':
            aValue = (a.pose || a.title || '').toLowerCase();
            bValue = (b.pose || b.title || '').toLowerCase();
            break;
          case 'category':
            aValue = (a.category || '').toLowerCase();
            bValue = (b.category || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (params.order === 'desc') {
          [aValue, bValue] = [bValue, aValue];
        }

        return aValue.localeCompare(bValue);
      });
    }

    // 分頁
    const page = params.page || 1;
    const limit = params.limit || 3;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    // 轉換為 API 格式
    const convertedItems = paginatedItems.map((item, index) => 
      this.convertToApiFormat(item, startIndex + index)
    );

    return {
      items: convertedItems,
      pagination: {
        page,
        limit,
        total: filteredItems.length
      }
    };
  }

  /**
   * 取得所有分類
   */
  getCategories(): string[] {
    const categories = [...new Set(this.localItems.map(item => item.category).filter(Boolean))];
    return categories;
  }
}