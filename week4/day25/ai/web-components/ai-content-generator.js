// ai/web-components/ai-content-generator.js
//
// Spec: Day 25 Task 2 — AI-powered content generation for web.
// Same class name (AIContentGenerator), same public methods and same
// default apiUrl ('/api/ai/generate') as the spec.
//
// Deltas vs the spec (behaviour-preserving robustness fixes):
// - All lookups are scoped to this component's root element instead of
//   global document.getElementById, so two generators on one page (or
//   the Task 5 demo page) don't collide on duplicate ids.
// - fetch has a configurable timeout (AbortController, default 120s —
//   generation is slower than chat).
// - Result rendering uses textContent (XSS-safe); copy uses a
//   textarea fallback when navigator.clipboard is unavailable (file://).
class AIContentGenerator {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`AIContentGenerator: container "${containerId}" not found`);
    }
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/generate',
      timeoutMs: options.timeoutMs || 120000,
      ...options
    };
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="ai-content-generator">
        <div class="generator-header">
          <h3>AI Content Generator</h3>
          <p>Generate high-quality content using AI</p>
        </div>

        <div class="generator-form">
          <div class="form-group">
            <label for="content-type">Content Type</label>
            <select id="content-type" class="form-control">
              <option value="article">Article</option>
              <option value="blog-post">Blog Post</option>
              <option value="social-media">Social Media</option>
              <option value="email">Email</option>
              <option value="product-description">Product Description</option>
            </select>
          </div>

          <div class="form-group">
            <label for="topic">Topic/Subject</label>
            <input type="text" id="topic" class="form-control" placeholder="Enter your topic...">
          </div>

          <div class="form-group">
            <label for="tone">Tone</label>
            <select id="tone" class="form-control">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="creative">Creative</option>
            </select>
          </div>

          <div class="form-group">
            <label for="length">Length</label>
            <select id="length" class="form-control">
              <option value="short">Short (100-200 words)</option>
              <option value="medium">Medium (200-500 words)</option>
              <option value="long">Long (500+ words)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="keywords">Keywords (optional)</label>
            <input type="text" id="keywords" class="form-control" placeholder="Enter keywords separated by commas...">
          </div>

          <button id="generate-btn" class="btn btn-primary">Generate Content</button>
        </div>

        <div class="generator-result" id="generator-result" style="display: none;">
          <div class="result-header">
            <h4>Generated Content</h4>
            <div class="result-actions">
              <button id="copy-btn" class="btn btn-secondary">Copy</button>
              <button id="regenerate-btn" class="btn btn-outline">Regenerate</button>
            </div>
          </div>
          <div class="result-content" id="result-content"></div>
        </div>

        <div class="generator-loading" id="generator-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Generating content...</p>
        </div>
      </div>
    `;
  }

  // Scoped queries: the spec used global getElementById, which breaks
  // when the demo page mounts more than one component of the same kind.
  $(id) {
    return this.container.querySelector(`#${id}`);
  }

  bindEvents() {
    const generateBtn = this.$('generate-btn');
    const copyBtn = this.$('copy-btn');
    const regenerateBtn = this.$('regenerate-btn');

    generateBtn.onclick = () => this.generateContent();
    copyBtn.onclick = () => this.copyContent();
    regenerateBtn.onclick = () => this.generateContent();
  }

  async generateContent() {
    const contentType = this.$('content-type').value;
    const topic = this.$('topic').value;
    const tone = this.$('tone').value;
    const length = this.$('length').value;
    const keywords = this.$('keywords').value;

    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    this.showLoading();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(this.options.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: contentType,
          topic: topic,
          tone: tone,
          length: length,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k)
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.showResult(result.content);
    } catch (error) {
      this.hideLoading();
      alert('Failed to generate content. Please try again.');
      console.error('Content generation error:', error);
    } finally {
      clearTimeout(timer);
    }
  }

  showLoading() {
    this.$('generator-loading').style.display = 'block';
    this.$('generator-result').style.display = 'none';
  }

  hideLoading() {
    this.$('generator-loading').style.display = 'none';
  }

  showResult(content) {
    this.hideLoading();
    // textContent: generated content is untrusted model text.
    this.$('result-content').textContent = content;
    this.$('generator-result').style.display = 'block';
  }

  copyContent() {
    const content = this.$('result-content').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(() => {
        alert('Content copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy content:', err);
      });
    } else {
      // Fallback for file:// and non-secure contexts.
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('Content copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy content:', err);
      }
      ta.remove();
    }
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('content-generator-container');
  if (mount && typeof AIContentGenerator !== 'undefined' && !mount.dataset.mounted) {
    mount.dataset.mounted = 'true';
    new AIContentGenerator('content-generator-container', {
      apiUrl: '/api/ai/generate'
    });
  }
});
