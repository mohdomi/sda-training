// ai/web-components/ai-recommendations.js
//
// Spec: Day 25 Task 3 — AI-powered recommendations for web.
// Same class name (AIRecommendations), same public methods and same
// default apiUrl ('/api/ai/recommendations') as the spec.
//
// Deltas vs the spec (behaviour-preserving robustness fixes):
// - Rendering is XSS-safe: titles/descriptions go through textContent
//   via a small element builder instead of string-interpolated innerHTML.
// - Bookmark buttons use addEventListener with a data-index instead of
//   the spec's inline `onclick="this.toggleBookmark(i)"` (which throws —
//   `this` there is the button, not the class instance).
// - "View" buttons open URLs via JS with a http(s) allowlist instead of
//   inline `onclick="window.open('...')"` string injection.
// - Feedback buttons are bound on this component's root (not document),
//   so multiple widgets don't double-fire.
// - fetch calls share a timeout helper (AbortController).
class AIRecommendations {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`AIRecommendations: container "${containerId}" not found`);
    }
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/recommendations',
      maxRecommendations: options.maxRecommendations || 5,
      timeoutMs: options.timeoutMs || 30000,
      ...options
    };
    this.userProfile = {};
    this.recommendations = [];
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
    this.loadUserProfile();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="ai-recommendations">
        <div class="recommendations-header">
          <h3>Recommended for You</h3>
          <button id="refresh-recommendations" class="btn btn-outline">Refresh</button>
        </div>

        <div class="recommendations-content" id="recommendations-content">
          <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading recommendations...</p>
          </div>
        </div>

        <div class="recommendations-feedback" id="recommendations-feedback" style="display: none;">
          <h4>How did we do?</h4>
          <div class="feedback-buttons">
            <button class="feedback-btn" data-rating="1">😞</button>
            <button class="feedback-btn" data-rating="2">😐</button>
            <button class="feedback-btn" data-rating="3">😊</button>
            <button class="feedback-btn" data-rating="4">😍</button>
          </div>
        </div>
      </div>
    `;
  }

  $(id) {
    return this.container.querySelector(`#${id}`);
  }

  bindEvents() {
    const refreshBtn = this.$('refresh-recommendations');
    refreshBtn.onclick = () => this.loadRecommendations();

    // Bind feedback events on this component's root (spec used document).
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest ? e.target.closest('.feedback-btn') : null;
      if (btn && this.container.contains(btn)) {
        const rating = parseInt(btn.dataset.rating, 10);
        this.submitFeedback(rating);
      }
      const bookmarkBtn = e.target.closest ? e.target.closest('[data-bookmark-index]') : null;
      if (bookmarkBtn && this.container.contains(bookmarkBtn)) {
        this.toggleBookmark(parseInt(bookmarkBtn.dataset.bookmarkIndex, 10));
      }
      const viewBtn = e.target.closest ? e.target.closest('[data-view-url]') : null;
      if (viewBtn && this.container.contains(viewBtn)) {
        const url = viewBtn.dataset.viewUrl;
        if (/^https?:\/\//i.test(url) || url.startsWith('/')) {
          window.open(url, '_blank', 'noopener');
        }
      }
    });
  }

  async fetchJSON(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async loadUserProfile() {
    try {
      const response = await this.fetchJSON(`${this.options.apiUrl}/profile`);
      if (response.ok) {
        const result = await response.json();
        this.userProfile = result.profile || result;
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      this.loadRecommendations();
    }
  }

  async loadRecommendations() {
    try {
      const response = await this.fetchJSON(this.options.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: this.userProfile,
          max_recommendations: this.options.maxRecommendations
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.recommendations = result.recommendations || [];
      this.displayRecommendations();
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      this.showError('Failed to load recommendations. Please try again.');
    }
  }

  displayRecommendations() {
    const content = this.$('recommendations-content');

    if (this.recommendations.length === 0) {
      content.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'No recommendations available at the moment.';
      content.appendChild(p);
      return;
    }

    content.innerHTML = '';
    this.recommendations.forEach((rec, index) => {
      const item = document.createElement('div');
      item.className = 'recommendation-item';
      item.dataset.index = String(index);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'recommendation-image';
      const img = document.createElement('img');
      img.src = rec.image || '/images/placeholder.jpg';
      img.alt = rec.title || 'Recommendation';
      imgWrap.appendChild(img);

      const body = document.createElement('div');
      body.className = 'recommendation-content';

      const title = document.createElement('h4');
      title.textContent = rec.title || `Item ${index + 1}`;

      const desc = document.createElement('p');
      desc.textContent = rec.description || '';

      const meta = document.createElement('div');
      meta.className = 'recommendation-meta';
      const score = document.createElement('span');
      score.className = 'recommendation-score';
      const numericScore = typeof rec.score === 'number' ? rec.score.toFixed(2) : (rec.score ?? '—');
      score.textContent = `Score: ${numericScore}`;
      const cat = document.createElement('span');
      cat.className = 'recommendation-category';
      cat.textContent = rec.category || '';
      meta.appendChild(score);
      meta.appendChild(cat);

      const actions = document.createElement('div');
      actions.className = 'recommendation-actions';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-primary';
      viewBtn.textContent = 'View';
      viewBtn.dataset.viewUrl = rec.url || '#';
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'btn btn-outline';
      bookmarkBtn.textContent = 'Bookmark';
      bookmarkBtn.dataset.bookmarkIndex = String(index);
      actions.appendChild(viewBtn);
      actions.appendChild(bookmarkBtn);

      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(meta);
      body.appendChild(actions);

      item.appendChild(imgWrap);
      item.appendChild(body);
      content.appendChild(item);
    });
    this.$('recommendations-feedback').style.display = 'block';
  }

  showError(message) {
    const content = this.$('recommendations-content');
    content.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'error-message';
    div.textContent = message;
    content.appendChild(div);
  }

  async submitFeedback(rating) {
    try {
      await this.fetchJSON(`${this.options.apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          recommendations: this.recommendations,
          user_profile: this.userProfile
        }),
      });

      // Show feedback confirmation
      const feedbackDiv = this.$('recommendations-feedback');
      feedbackDiv.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Thank you for your feedback!';
      feedbackDiv.appendChild(p);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  toggleBookmark(index) {
    const recommendation = this.recommendations[index];
    if (!recommendation) return;
    // Implement bookmark functionality
    try {
      const key = 'ai_recommendation_bookmarks';
      const raw = localStorage.getItem(key);
      const bookmarks = raw ? JSON.parse(raw) : [];
      bookmarks.push({ title: recommendation.title, url: recommendation.url, ts: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
    console.log('Bookmark toggled for:', recommendation.title);
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('recommendations-container');
  if (mount && typeof AIRecommendations !== 'undefined' && !mount.dataset.mounted) {
    mount.dataset.mounted = 'true';
    new AIRecommendations('recommendations-container', {
      apiUrl: '/api/ai/recommendations',
      maxRecommendations: 5
    });
  }
});
