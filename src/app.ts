import { ApiService } from './services/api.js';
import { AuthManager } from './services/auth.js';
import { YogaPose, LoadingState, QueryParams } from './types/index.js';

/**
 * 瑜伽動作應用程式主類別
 */
export class YogaPosesApp {
  private apiService: ApiService;
  private authManager: AuthManager;
  private currentPage: number = 1;
  private isLoading: boolean = false;
  private hasMoreData: boolean = true;
  private allPoses: YogaPose[] = [];
  private bookmarkedIds: Set<number> = new Set();
  private currentUser: number | null = null;

  constructor() {
    this.apiService = new ApiService();
    this.authManager = new AuthManager(this.apiService);
    this.init();
  }

  /**
   * 初始化應用程式
   */
  private async init() {
    // 檢查登入狀態
    await this.checkAuthStatus();
    
    // 載入初始資料
    await this.loadInitialData();
    
    // 設定事件監聽器
    this.setupEventListeners();
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
      this.currentPage = response.pagination.page;
      this.hasMoreData = response.items.length === response.pagination.limit;
      
      this.renderPoses(this.allPoses);
      this.updateLoadMoreButton();
      this.hideLoadingState();
      
    } catch (error) {
      this.showErrorState(error instanceof Error ? error.message : '載入資料失敗');
    }
  }

  /**
   * 載入更多資料
   */
  private async loadMore() {
    if (this.isLoading || !this.hasMoreData) return;
    
    this.isLoading = true;
    this.showLoadMoreLoading();
    
    try {
      const response = await this.apiService.fetchYogaPoses({
        page: this.currentPage + 1,
        limit: 3
      });
      
      this.allPoses.push(...response.items);
      this.currentPage = response.pagination.page;
      this.hasMoreData = response.items.length === response.pagination.limit;
      
      this.renderPoses(this.allPoses);
      this.updateLoadMoreButton();
      
    } catch (error) {
      this.showErrorMessage(`載入更多資料失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      this.isLoading = false;
      this.hideLoadMoreLoading();
    }
  }

  /**
   * 渲染瑜伽動作列表
   */
  private renderPoses(poses: YogaPose[]) {
    const container = document.getElementById('poses-container');
    if (!container) return;

    container.innerHTML = poses.map(pose => `
      <ion-card class="pose-card" data-pose-id="${pose.id}">
        <div class="card-image-container">
          <img src="${pose.imageUrl}" alt="${pose.title}" loading="lazy" />
          ${this.currentUser ? `
            <ion-button 
              fill="clear" 
              class="bookmark-btn ${this.bookmarkedIds.has(pose.id) ? 'bookmarked' : ''}"
              data-pose-id="${pose.id}"
            >
              <ion-icon name="${this.bookmarkedIds.has(pose.id) ? 'bookmark' : 'bookmark-outline'}"></ion-icon>
            </ion-button>
          ` : ''}
        </div>
        
        <ion-card-header>
          <ion-card-title>${pose.title}</ion-card-title>
          <ion-card-subtitle>${pose.category}</ion-card-subtitle>
        </ion-card-header>
        
        <ion-card-content>
          <p class="description">${pose.description}</p>
          
          ${pose.level ? `<p><strong>Level:</strong> ${pose.level}</p>` : ''}
          ${pose.benefits ? `<p><strong>Benefits:</strong> ${pose.benefits}</p>` : ''}
          ${pose.keys ? `<p><strong>Keys:</strong> ${pose.keys}</p>` : ''}
          ${pose.cautions ? `<p><strong>Cautions:</strong> ${pose.cautions}</p>` : ''}
          
          ${pose.videoUrl ? `
            <ion-button fill="outline" size="small" onclick="window.open('${pose.videoUrl}', '_blank')">
              <ion-icon slot="start" name="play-circle-outline"></ion-icon>
              觀看教學影片
            </ion-button>
          ` : ''}
        </ion-card-content>
      </ion-card>
    `).join('');

    // 重新設定收藏按鈕事件
    this.setupBookmarkButtons();
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
      this.renderPoses(this.allPoses); // 重新渲染以顯示收藏按鈕
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
    this.renderPoses(this.allPoses); // 重新渲染以移除收藏按鈕
  }
}

// 當 DOM 載入完成後初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  new YogaPosesApp();
});