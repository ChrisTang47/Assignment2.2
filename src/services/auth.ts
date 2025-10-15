import { ApiService } from './api.js';
import { AuthRequest } from '../types/index.js';

/**
 * 認證管理器 - 處理使用者登入、註冊和登出
 */
export class AuthManager {
  private apiService: ApiService;
  private isLoginMode: boolean = true;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
    this.setupAuthModal();
  }

  /**
   * 設定認證模態框的事件監聽器
   */
  private setupAuthModal() {
    const authForm = document.getElementById('auth-form');
    const authSwitchBtn = document.getElementById('auth-switch-btn');

    if (authForm) {
      authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
    }

    if (authSwitchBtn) {
      authSwitchBtn.addEventListener('click', () => this.toggleAuthMode());
    }
  }

  /**
   * 顯示認證模態框
   */
  showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      (modal as any).present();
    }
  }

  /**
   * 隱藏認證模態框
   */
  hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      (modal as any).dismiss();
    }
  }

  /**
   * 切換登入/註冊模式
   */
  private toggleAuthMode() {
    this.isLoginMode = !this.isLoginMode;
    this.updateAuthModalUI();
  }

  /**
   * 更新認證模態框 UI
   */
  private updateAuthModalUI() {
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (this.isLoginMode) {
      if (title) title.textContent = '登入';
      if (submitBtn) submitBtn.textContent = '登入';
      if (switchText) switchText.textContent = '還沒有帳號？';
      if (switchBtn) switchBtn.textContent = '立即註冊';
    } else {
      if (title) title.textContent = '註冊';
      if (submitBtn) submitBtn.textContent = '註冊';
      if (switchText) switchText.textContent = '已有帳號？';
      if (switchBtn) switchBtn.textContent = '立即登入';
    }
  }

  /**
   * 處理認證表單提交
   */
  private async handleAuthSubmit(event: Event) {
    event.preventDefault();
    
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!usernameInput || !passwordInput || !submitBtn) return;

    const credentials: AuthRequest = {
      username: usernameInput.value.trim(),
      password: passwordInput.value
    };

    // 簡單驗證
    if (!credentials.username || !credentials.password) {
      this.showErrorMessage('請填寫使用者名稱和密碼');
      return;
    }

    if (credentials.username.length < 3) {
      this.showErrorMessage('使用者名稱至少需要3個字元');
      return;
    }

    if (credentials.password.length < 6) {
      this.showErrorMessage('密碼至少需要6個字元');
      return;
    }

    // 顯示載入狀態
    this.setAuthLoading(true);

    try {
      let result;
      if (this.isLoginMode) {
        result = await this.apiService.login(credentials);
      } else {
        result = await this.apiService.signup(credentials);
      }

      // 儲存 token
      this.apiService.setToken(result.token);
      
      // 成功訊息
      this.showSuccessMessage(this.isLoginMode ? '登入成功！' : '註冊成功！');
      
      // 隱藏模態框
      this.hideAuthModal();
      
      // 清空表單
      this.clearAuthForm();
      
      // 通知主應用程式認證狀態改變
      this.onAuthSuccess(result.user_id);

    } catch (error) {
      this.showErrorMessage(
        error instanceof Error ? error.message : 
        this.isLoginMode ? '登入失敗' : '註冊失敗'
      );
    } finally {
      this.setAuthLoading(false);
    }
  }

  /**
   * 設定認證載入狀態
   */
  private setAuthLoading(isLoading: boolean) {
    const submitBtn = document.getElementById('auth-submit-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (submitBtn) {
      if (isLoading) {
        submitBtn.innerHTML = `
          <ion-spinner name="crescent"></ion-spinner>
          ${this.isLoginMode ? '登入中...' : '註冊中...'}
        `;
        (submitBtn as any).disabled = true;
      } else {
        submitBtn.textContent = this.isLoginMode ? '登入' : '註冊';
        (submitBtn as any).disabled = false;
      }
    }

    if (usernameInput) (usernameInput as any).disabled = isLoading;
    if (passwordInput) (passwordInput as any).disabled = isLoading;
  }

  /**
   * 清空認證表單
   */
  private clearAuthForm() {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;

    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }

  /**
   * 顯示錯誤訊息
   */
  private showErrorMessage(message: string) {
    // 簡單的錯誤顯示，可以後續用 ion-toast 改進
    alert(`錯誤: ${message}`);
  }

  /**
   * 顯示成功訊息
   */
  private showSuccessMessage(message: string) {
    // 簡單的成功顯示，可以後續用 ion-toast 改進
    alert(message);
  }

  /**
   * 認證成功回調
   */
  private onAuthSuccess(userId: number) {
    // 觸發自定義事件，讓主應用程式知道認證狀態改變
    const event = new CustomEvent('authSuccess', { 
      detail: { userId } 
    });
    document.dispatchEvent(event);
  }

  /**
   * 重設為登入模式
   */
  resetToLoginMode() {
    this.isLoginMode = true;
    this.updateAuthModalUI();
    this.clearAuthForm();
  }
}