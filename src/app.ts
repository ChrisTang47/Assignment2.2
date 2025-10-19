import { ApiService } from './services/api.js';
import { AuthManager } from './services/auth.js';
import { FilterManager } from './services/filter.js';
import { LocalDataAdapter } from './services/localData.js';
import { YogaPose, LoadingState, QueryParams } from './types/index.js';

// 將 LocalDataAdapter 暴露到全局作用域，以便 HTML 可以使用
(window as any).LocalDataAdapter = LocalDataAdapter;

/**
 * 瑜伽動作應用程式主類別
 */
export class YogaPosesApp {
  private apiService: ApiService;
  private authManager: AuthManager;
  private filterManager: FilterManager;
  private currentPage: number = 1;
  private isLoading: boolean = false;
  private hasMoreData: boolean = true;
  private allPoses: YogaPose[] = [];
  private filteredPoses: YogaPose[] = [];
  private bookmarkedIds: Set<number> = new Set();
  private currentUser: number | null = null;
  private currentFilters: QueryParams = {};

  constructor() {
    this.apiService = new ApiService();
    this.authManager = new AuthManager(this.apiService);
    this.filterManager = new FilterManager((params) => this.applyFilters(params));
    this.init();
  }

  /**
   * 初始化應用程式
   */
  private async init() {
    // 等待 DOM 完全載入
    await this.waitForDOMReady();
    
    // 檢查登入狀態
    await this.checkAuthStatus();
    
    // 載入初始資料
    await this.loadInitialData();
    
    // 設定事件監聽器
    this.setupEventListeners();
    
    // 設定認證成功事件監聽
    document.addEventListener('authSuccess', ((e: CustomEvent) => {
      this.currentUser = e.detail.userId;
      this.updateAuthUI(true);
      this.loadBookmarks();
      this.applyLocalFilters();
      this.renderPoses(this.filteredPoses);
    }) as EventListener);
  }

  /**
   * 等待 DOM 準備就緒
   */
  private waitForDOMReady(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * 檢查使用者認證狀態
   */
  private async checkAuthStatus() {
    try {
      const authResult = await this.apiService.checkAuth();
      this.currentUser = authResult.user_id;
      
      if (this.currentUser) {
        // 如果已登入，載入收藏列表
        await this.loadBookmarks();
        this.updateAuthUI(true);
      } else {
        this.updateAuthUI(false);
      }
    } catch (error) {
      console.error('檢查認證狀態失敗:', error);
      this.updateAuthUI(false);
    }
  }

  /**
   * 載入收藏列表
   */
  private async loadBookmarks() {
    try {
      const bookmarks = await this.apiService.getBookmarks();
      this.bookmarkedIds = new Set(bookmarks.item_ids);
      this.updateBookmarkButtons();
      
      // 如果目前是只看收藏模式，需要重新應用過濾
      if (this.filterManager.isBookmarksOnly) {
        this.applyLocalFilters();
        this.renderPoses(this.filteredPoses);
      }
    } catch (error) {
      console.error('載入收藏列表失敗:', error);
    }
  }

  /**
   * 載入初始資料
   */
  private async loadInitialData() {
    this.showLoadingState();
    
    try {
      const response = await this.apiService.fetchYogaPoses({
        page: 1,
        limit: 3
      });
      
      this.allPoses = response.items;
      this.filteredPoses = [...this.allPoses];
      this.currentPage = response.pagination.page;
      this.hasMoreData = response.items.length === response.pagination.limit;
      
      // 更新分類選項
      this.updateCategoryOptions();
      
      this.renderPoses(this.filteredPoses);
      this.updateLoadMoreButton();
      this.hideLoadingState();
      
    } catch (error) {
      this.showErrorState(error instanceof Error ? error.message : '載入資料失敗');
    }
  }

  /**
   * 應用過濾條件
   */
  private async applyFilters(params: QueryParams) {
    this.currentFilters = params;
    this.currentPage = 1;
    this.showLoadingState();

    try {
      const response = await this.apiService.fetchYogaPoses(params);
      
      this.allPoses = response.items;
      this.currentPage = response.pagination.page;
      this.hasMoreData = response.items.length === response.pagination.limit;
      
      this.applyLocalFilters();
      this.renderPoses(this.filteredPoses);
      this.updateLoadMoreButton();
      this.hideLoadingState();
      
    } catch (error) {
      this.showErrorState(error instanceof Error ? error.message : '載入資料失敗');
    }
  }

  /**
   * 應用本地過濾和排序
   */
  private applyLocalFilters() {
    // 先應用收藏過濾
    this.filteredPoses = this.filterManager.filterLocalPoses(this.allPoses, this.bookmarkedIds);
    
    // 再應用排序
    this.filteredPoses = this.filterManager.sortLocalPoses(this.filteredPoses);
  }

  /**
   * 更新分類選項
   */
  private updateCategoryOptions() {
    const categories = [...new Set(this.allPoses.map(pose => pose.category))];
    this.filterManager.updateCategoryOptions(categories);
  }

  /**
   * 載入更多資料
   */
  private async loadMore() {
    if (this.isLoading || !this.hasMoreData) return;
    
    this.isLoading = true;
    this.showLoadMoreLoading();
    
    try {
      const params = {
        ...this.currentFilters,
        page: this.currentPage + 1,
        limit: 3
      };
      
      const response = await this.apiService.fetchYogaPoses(params);
      
      this.allPoses.push(...response.items);
      this.currentPage = response.pagination.page;
      this.hasMoreData = response.items.length === response.pagination.limit;
      
      this.applyLocalFilters();
      this.renderPoses(this.filteredPoses);
      this.updateLoadMoreButton();
      
    } catch (error) {
      this.showErrorMessage(`載入更多資料失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      this.isLoading = false;
      this.hideLoadMoreLoading();
    }
  }

  /**
   * 渲染瑜伽動作列表 - 使用 Assignment 2.1 的樣式結構
   */
  private renderPoses(poses: YogaPose[]) {
    const container = document.getElementById('poses-list');
    if (!container) return;

    container.innerHTML = poses.map(pose => `
      <ion-item class="list-item">
        <div class="item-content">
          <!-- Assignment 2.2 新增：收藏按鈕 -->
          ${this.currentUser ? `
            <ion-button 
              fill="clear" 
              class="bookmark-btn ${this.bookmarkedIds.has(pose.id) ? 'bookmarked' : ''}"
              data-pose-id="${pose.id}"
            >
              <ion-icon name="${this.bookmarkedIds.has(pose.id) ? 'bookmark' : 'bookmark-outline'}"></ion-icon>
            </ion-button>
          ` : ''}
          
          <!-- Assignment 2.1 原有結構 -->
          <div class="item-pose">${pose.title}</div>
          <div class="item-level">${pose.level || 'Level : 未知'}</div>
          <div class="item-benefits">${pose.benefits || pose.description}</div>
          <div class="item-keys">${pose.keys || '暫無要點資訊'}</div>
          <div class="item-cautions">${pose.cautions || '暫無注意事項'}</div>
          
          <!-- Assignment 2.1 原有：媒體容器 -->
          <div class="media-container">
            <div class="item-image-container">
              <img class="item-image" src="${pose.imageUrl}" alt="${pose.title}" 
                   style="width: 100%; max-width: 550px; height: 310px; border-radius: 16px;">
            </div>
            ${pose.videoUrl ? `
              <div class="item-video-container">
                <iframe class="item-video" 
                        src="${this.convertToEmbedUrl(pose.videoUrl)}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
              </div>
            ` : ''}
          </div>
          
          <!-- Assignment 2.1 原有：標籤容器 -->
          <div class="tag-container">
            ${this.renderTags(pose)}
          </div>
        </div>
      </ion-item>
    `).join('');

    // 重新設定收藏按鈕事件
    this.setupBookmarkButtons();
    
    // 重新設定標籤點擊事件 (Assignment 2.1 功能)
    this.setupTagClickEvents();
  }

  /**
   * Assignment 2.1 功能：渲染標籤
   */
  private renderTags(pose: YogaPose): string {
    if (!pose.tags || pose.tags.length === 0) {
      return '';
    }

    return pose.tags.slice(0, 3).map((tag, index) => {
      const tagClass = `item-tag-${index + 1}`;
      return `<ion-chip size="small" class="${tagClass}" data-tag="${tag}">${tag}</ion-chip>`;
    }).join('');
  }

  /**
   * Assignment 2.1 功能：設定標籤點擊事件
   */
  private setupTagClickEvents() {
    const tagChips = document.querySelectorAll('.tag-container ion-chip');
    tagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = (chip as HTMLElement).dataset.tag;
        if (tag) {
          const searchBar = document.getElementById('search-bar') as any;
          if (searchBar) {
            searchBar.value = tag;
            // 觸發搜尋
            this.applyFilters({ page: 1, limit: 3, search: tag });
          }
        }
      });
    });
  }

  /**
   * 將 YouTube URL 轉換為嵌入格式
   */
  private convertToEmbedUrl(url: string): string {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  }

  /**
   * 顯示載入狀態
   */
  private showLoadingState() {
    const container = document.getElementById('poses-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-container">
        <ion-spinner name="crescent"></ion-spinner>
        <p>載入瑜伽動作中...</p>
      </div>
    `;
  }

  /**
   * 隱藏載入狀態
   */
  private hideLoadingState() {
    // 載入狀態會被實際內容替換，不需要特別處理
  }

  /**
   * 顯示錯誤狀態
   */
  private showErrorState(message: string) {
    const container = document.getElementById('poses-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-container">
        <ion-icon name="alert-circle-outline" class="error-icon"></ion-icon>
        <h3>載入失敗</h3>
        <p>${message}</p>
        <ion-button fill="outline" onclick="location.reload()">
          <ion-icon slot="start" name="refresh-outline"></ion-icon>
          重新載入
        </ion-button>
      </div>
    `;
  }

  /**
   * 顯示載入更多的載入狀態
   */
  private showLoadMoreLoading() {
    const button = document.getElementById('load-more-btn');
    if (!button) return;
    
    button.innerHTML = `
      <ion-spinner name="crescent"></ion-spinner>
      載入中...
    `;
    (button as any).disabled = true;
  }

  /**
   * 隱藏載入更多的載入狀態
   */
  private hideLoadMoreLoading() {
    const button = document.getElementById('load-more-btn');
    if (!button) return;
    
    button.innerHTML = `
      <ion-icon slot="start" name="add-outline"></ion-icon>
      載入更多
    `;
    (button as any).disabled = false;
  }

  /**
   * 更新載入更多按鈕
   */
  private updateLoadMoreButton() {
    const button = document.getElementById('load-more-btn');
    if (!button) return;
    
    if (this.hasMoreData) {
      button.style.display = 'block';
    } else {
      button.style.display = 'none';
    }
  }

  /**
   * 顯示錯誤訊息
   */
  private showErrorMessage(message: string) {
    // 你可以使用 ion-toast 或其他方式顯示錯誤訊息
    console.error(message);
    alert(message); // 簡單的錯誤顯示，可以後續改進
  }

  /**
   * 設定事件監聽器
   */
  private setupEventListeners() {
    // 載入更多按鈕
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMore());
    }

    // 登入/登出按鈕
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => this.toggleAuthModal());
    }

    // 監聽認證成功事件
    document.addEventListener('authSuccess', (event: any) => {
      this.currentUser = event.detail.userId;
      this.updateAuthUI(true);
      this.loadBookmarks();
      this.applyLocalFilters();
      this.renderPoses(this.filteredPoses); // 重新渲染以顯示收藏按鈕
    });
  }

  /**
   * 設定收藏按鈕事件
   */
  private setupBookmarkButtons() {
    const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
    bookmarkBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const poseId = parseInt((btn as HTMLElement).dataset.poseId || '0');
        await this.toggleBookmark(poseId);
      });
    });
  }

  /**
   * 切換收藏狀態
   */
  private async toggleBookmark(poseId: number) {
    if (!this.currentUser) {
      alert('請先登入才能收藏');
      return;
    }

    try {
      if (this.bookmarkedIds.has(poseId)) {
        await this.apiService.removeBookmark(poseId);
        this.bookmarkedIds.delete(poseId);
      } else {
        await this.apiService.addBookmark(poseId);
        this.bookmarkedIds.add(poseId);
      }
      
      this.updateBookmarkButtons();
      
      // 如果目前是只看收藏模式，需要重新應用過濾
      if (this.filterManager.isBookmarksOnly) {
        this.applyLocalFilters();
        this.renderPoses(this.filteredPoses);
      }
      
    } catch (error) {
      this.showErrorMessage(`收藏操作失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 更新收藏按鈕狀態
   */
  private updateBookmarkButtons() {
    const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
    bookmarkBtns.forEach(btn => {
      const poseId = parseInt((btn as HTMLElement).dataset.poseId || '0');
      const isBookmarked = this.bookmarkedIds.has(poseId);
      
      if (isBookmarked) {
        btn.classList.add('bookmarked');
        const icon = btn.querySelector('ion-icon');
        if (icon) icon.setAttribute('name', 'bookmark');
      } else {
        btn.classList.remove('bookmarked');
        const icon = btn.querySelector('ion-icon');
        if (icon) icon.setAttribute('name', 'bookmark-outline');
      }
    });
  }

  /**
   * 更新認證 UI
   */
  private updateAuthUI(isLoggedIn: boolean) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;
    
    if (isLoggedIn) {
      authBtn.innerHTML = `
        <ion-icon slot="start" name="log-out-outline"></ion-icon>
        登出
      `;
    } else {
      authBtn.innerHTML = `
        <ion-icon slot="start" name="log-in-outline"></ion-icon>
        登入
      `;
    }
  }

  /**
   * 切換認證模態框
   */
  private toggleAuthModal() {
    if (this.currentUser) {
      this.logout();
    } else {
      this.authManager.showAuthModal();
    }
  }

  /**
   * 登出
   */
  private logout() {
    this.apiService.clearToken();
    this.currentUser = null;
    this.bookmarkedIds.clear();
    this.updateAuthUI(false);
    this.applyLocalFilters();
    this.renderPoses(this.filteredPoses); // 重新渲染以移除收藏按鈕
  }
}

// 當 DOM 載入完成後初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  // 等待 Ionic 元件載入完成
  setTimeout(() => {
    new YogaPosesApp();
  }, 100);
});