import { YogaPose, QueryParams } from '../types/index.js';

/**
 * 過濾和搜尋管理器
 */
export class FilterManager {
  private currentSearch: string = '';
  private currentCategory: string = '';
  private currentSort: string = 'default';
  private showBookmarksOnly: boolean = false;
  private onFilterChange: (params: QueryParams) => void;

  constructor(onFilterChange: (params: QueryParams) => void) {
    this.onFilterChange = onFilterChange;
    this.setupEventListeners();
  }

  /**
   * 設定事件監聽器
   */
  private setupEventListeners() {
    // 搜尋欄
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.addEventListener('ionInput', (e: any) => {
        this.currentSearch = e.detail.value.trim();
        this.applyFilters();
      });
    }

    // 分類過濾器
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('ionChange', (e: any) => {
        this.currentCategory = e.detail.value;
        this.applyFilters();
      });
    }

    // 排序選擇器
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('ionChange', (e: any) => {
        this.currentSort = e.detail.value;
        this.applyFilters();
      });
    }

    // 只看收藏按鈕
    const bookmarksOnlyBtn = document.getElementById('bookmarks-only-btn');
    if (bookmarksOnlyBtn) {
      bookmarksOnlyBtn.addEventListener('click', () => {
        this.toggleBookmarksOnly();
      });
    }
  }

  /**
   * 切換只看收藏模式
   */
  private toggleBookmarksOnly() {
    this.showBookmarksOnly = !this.showBookmarksOnly;
    this.updateBookmarksOnlyButton();
    this.applyFilters();
  }

  /**
   * 更新只看收藏按鈕狀態
   */
  private updateBookmarksOnlyButton() {
    const btn = document.getElementById('bookmarks-only-btn');
    if (!btn) return;

    if (this.showBookmarksOnly) {
      btn.innerHTML = `
        <ion-icon slot="start" name="bookmark"></ion-icon>
        顯示全部
      `;
      (btn as any).fill = 'solid';
    } else {
      btn.innerHTML = `
        <ion-icon slot="start" name="bookmark-outline"></ion-icon>
        只看收藏
      `;
      (btn as any).fill = 'outline';
    }
  }

  /**
   * 應用過濾條件
   */
  private applyFilters() {
    const params: QueryParams = {
      page: 1, // 重設頁碼
      limit: 3
    };

    if (this.currentSearch) {
      params.search = this.currentSearch;
    }

    if (this.currentCategory) {
      params.category = this.currentCategory;
    }

    if (this.currentSort !== 'default') {
      const [field, order] = this.currentSort.split('-');
      params.sort = field;
      params.order = order as 'asc' | 'desc';
    }

    // 通知主應用程式應用過濾條件
    this.onFilterChange(params);
  }

  /**
   * 更新分類選項
   */
  updateCategoryOptions(categories: string[]) {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    // 清除現有選項（除了全部分類）
    const existingOptions = categoryFilter.querySelectorAll('ion-select-option:not([value=""])');
    existingOptions.forEach(option => option.remove());

    // 新增分類選項
    categories.forEach(category => {
      const option = document.createElement('ion-select-option');
      option.setAttribute('value', category);
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  /**
   * 本地過濾（用於收藏功能）
   */
  filterLocalPoses(poses: YogaPose[], bookmarkedIds: Set<number>): YogaPose[] {
    let filtered = poses;

    // 只看收藏過濾
    if (this.showBookmarksOnly) {
      filtered = filtered.filter(pose => bookmarkedIds.has(pose.id));
    }

    return filtered;
  }

  /**
   * 本地排序
   */
  sortLocalPoses(poses: YogaPose[]): YogaPose[] {
    if (this.currentSort === 'default') {
      return poses;
    }

    const [field, order] = this.currentSort.split('-');
    
    return [...poses].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        default:
          return 0;
      }

      if (order === 'desc') {
        [aValue, bValue] = [bValue, aValue];
      }

      return aValue.localeCompare(bValue);
    });
  }

  /**
   * 重設所有過濾條件
   */
  reset() {
    this.currentSearch = '';
    this.currentCategory = '';
    this.currentSort = 'default';
    this.showBookmarksOnly = false;

    // 重設 UI
    const searchBar = document.getElementById('search-bar') as any;
    if (searchBar) searchBar.value = '';

    const categoryFilter = document.getElementById('category-filter') as any;
    if (categoryFilter) categoryFilter.value = '';

    const sortSelect = document.getElementById('sort-select') as any;
    if (sortSelect) sortSelect.value = 'default';

    this.updateBookmarksOnlyButton();
  }

  /**
   * 取得目前是否為只看收藏模式
   */
  get isBookmarksOnly(): boolean {
    return this.showBookmarksOnly;
  }

  /**
   * 取得目前的排序設定
   */
  get currentSortValue(): string {
    return this.currentSort;
  }
}