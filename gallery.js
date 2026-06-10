const JSON_DIR = 'picJsons';
const IMAGES_PER_DAY = 9;
const MAX_DAYS_BACK = 30;

class GalleryLoader {
  constructor() {
    this.container = document.getElementById('gallery-container');
    this.sentinel = document.getElementById('loading-sentinel');
    this.currentDate = new Date();
    this.earliestLoadedDate = null;
    this.isLoading = false;
    this.allDaysData = [];
  }

  async initialize() {
    const today = new Date();
    const initialData = await this.findLatestGalleryData(today);
    
    if (initialData) {
      this.renderDay(initialData.date, initialData.images);
      this.earliestLoadedDate = initialData.date;
      this.allDaysData.push(initialData);
    } else {
      this.showError('No gallery data available');
      return;
    }

    this.setupInfiniteScroll();
  }

  async findLatestGalleryData(fromDate) {
    for (let i = 0; i < MAX_DAYS_BACK; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() - i);
      
      const filename = this.getJsonFilename(checkDate);
      const images = await this.fetchImageUrls(filename);
      
      if (images && images.length > 0) {
        return {
          date: checkDate,
          images: images
        };
      }
    }
    
    const defaultImages = await this.fetchImageUrls('default.json');
    if (defaultImages && defaultImages.length > 0) {
      return {
        date: new Date(),
        images: defaultImages
      };
    }
    
    return null;
  }

  async fetchImageUrls(filename) {
    try {
      const response = await fetch(`./${JSON_DIR}/${filename}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) throw new Error(`File not found: ${filename}`);
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load ${filename}:`, error.message);
      return null;
    }
  }

  renderDay(date, images) {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'day-group';
    
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    dayGroup.innerHTML = `
      <div class="day-separator">
        <hr>
        <div class="day-header">
          <div>${displayDate}</div>
        </div>
      </div>
      <div class="gallery-grid" data-date="${dateStr}"></div>
    `;
    
    const grid = dayGroup.querySelector('.gallery-grid');
    const imagesToShow = images.slice(0, IMAGES_PER_DAY);
    
    imagesToShow.forEach(url => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `<img src="${url}" alt="Gallery image" loading="lazy">`;
      item.onclick = () => window.open(url, '_blank');
      grid.appendChild(item);
    });
    
    this.container.appendChild(dayGroup);
  }

  setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadOlderDay();
        }
      });
    }, { rootMargin: '200px' });

    observer.observe(this.sentinel);
  }

  async loadOlderDay() {
    if (this.isLoading || !this.earliestLoadedDate) return;
    
    this.isLoading = true;
    const nextOlderDate = new Date(this.earliestLoadedDate);
    nextOlderDate.setDate(nextOlderDate.getDate() - 1);
    
    const filename = this.getJsonFilename(nextOlderDate);
    const images = await this.fetchImageUrls(filename);
    
    if (images && images.length > 0) {
      this.renderDay(nextOlderDate, images);
      this.earliestLoadedDate = nextOlderDate;
      this.allDaysData.push({
        date: nextOlderDate,
        images: images
      });
    }
    
    this.isLoading = false;
  }

  getJsonFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}.json`;
  }

  showError(message) {
    this.container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

// Initialize the gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const gallery = new GalleryLoader();
  gallery.initialize();
});
