/**
 * Authentication state management using Svelte 5 runes
 * Provides reactive auth state that can be shared across components
 */

interface UserInfo {
  name: string;
  email: string;
}

interface AuthState {
  apiKey: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
}

const STORAGE_KEYS = {
  API_KEY: 'openrouter_api_key',
  USER: 'openrouter_user'
} as const;

/**
 * Auth store using Svelte 5 runes for reactive state management
 * Replaces the need for Svelte 4 stores
 */
class AuthStore {
  // Reactive state using $state rune
  state = $state<AuthState>({
    apiKey: null,
    user: null,
    isAuthenticated: false
  });

  // Derived state using $derived rune
  isLoggedIn = $derived(this.state.isAuthenticated);

  /**
   * Logs in the user with an API key and optional user info
   * Persists to localStorage for session continuity
   */
  login(apiKey: string, user?: UserInfo): void {
    this.state.apiKey = apiKey;
    this.state.user = user || null;
    this.state.isAuthenticated = true;

    // Persist to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
      if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    }
  }

  /**
   * Logs out the user and clears all auth state
   * Removes data from localStorage
   */
  logout(): void {
    this.state.apiKey = null;
    this.state.user = null;
    this.state.isAuthenticated = false;

    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  /**
   * Loads auth state from localStorage
   * Should be called on app initialization
   */
  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);

    if (apiKey) {
      this.state.apiKey = apiKey;
      this.state.isAuthenticated = true;

      if (userJson) {
        try {
          this.state.user = JSON.parse(userJson);
        } catch (error) {
          console.error('Failed to parse user data from localStorage:', error);
        }
      }
    }
  }
}

// Export singleton instance
export const authStore = new AuthStore();

// Export type for use in components
export type { UserInfo };
