const JSON_DIR = 'picJsons';

function getJsonFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}.json`;
}

async function fetchGalleryData(filename) {
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

async function findLatestGalleryData(currentDate = new Date()) {
  const maxDaysBack = 7;
  
  for (let i = 0; i < maxDaysBack; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    
    const filename = getJsonFilename(checkDate);
    const galleryData = await fetchGalleryData(filename);
    
    if (galleryData) {
      console.log(`Loaded gallery data from ${filename}`);
      return galleryData;
    }
  }
  
  console.log('Using default gallery data');
  return await fetchGalleryData('default.json');
}

class LazyGalleryLoader {
  constructor() {
    this.currentPage = 1;
    this.isLoading = false;
    this.allImages = [];
    this.container = document.getElementById('gallery-container');
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = 'loading-indicator';
    this.loadingIndicator.textContent = 'Loading more images...';
  }

  async initialize() {
    const galleryData = await findLatestGalleryData();
    
    if (galleryData?.images?.length) {
      this.allImages = galleryData.images;
      this.renderInitialImages();
      this.setupInfiniteScroll();
    } else {
      this.showError('No gallery data available');
    }
  }

  renderInitialImages() {
    const imagesToShow = this.allImages.slice(0, 20);
    this.renderImages(imagesToShow);
  }

  renderImages(images) {
    const grid = document.getElementById('gallery-grid') || this.createGrid();
    
    const newImages = images.map(image => `
      <div class="gallery-item" onclick="window.open('${image.url}', '_blank')">
        <img src="${image.thumbnail}" alt="${image.title}" loading="lazy">
        <div class="image-info">
          <h3>${image.title}</h3>
          <p>${image.description}</p>
        </div>
      </div>
    `).join('');
    
    if (this.currentPage === 1) {
      grid.innerHTML = newImages;
    } else {
      grid.insertAdjacentHTML('beforeend', newImages);
    }
  }

  createGrid() {
    this.container.innerHTML = `
      <div id="gallery-grid" class="gallery-grid"></div>
    `;
    this.container.appendChild(this.loadingIndicator);
    return document.getElementById('gallery-grid');
  }

  setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadMoreImages();
        }
      });
    }, { rootMargin: '100px' });

    observer.observe(this.loadingIndicator);
  }

  async loadMoreImages() {
    if (this.isLoading || this.currentPage * 20 >= this.allImages.length) {
      this.loadingIndicator.style.display = 'none';
      return;
    }

    this.isLoading = true;
    const startIndex = this.currentPage * 20;
    const endIndex = startIndex + 20;
    const imagesToLoad = this.allImages.slice(startIndex, endIndex);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.renderImages(imagesToLoad);
    this.currentPage++;
    this.isLoading = false;
  }

  showError(message) {
    this.container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

// Date navigation functionality
let currentDisplayDate = new Date();

function updateDateDisplay() {
  document.getElementById('current-date').textContent = 
    currentDisplayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
}

document.getElementById('prev-day').addEventListener('click', async () => {
  currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
  updateDateDisplay();
  await loadGalleryForDate(currentDisplayDate);
});

document.getElementById('next-day').addEventListener('click', async () => {
  const tomorrow = new Date(currentDisplayDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (tomorrow <= new Date()) {
    currentDisplayDate = tomorrow;
    updateDateDisplay();
    await loadGalleryForDate(currentDisplayDate);
  }
});

async function loadGalleryForDate(date) {
  const filename = getJsonFilename(date);
  const galleryData = await fetchGalleryData(filename);
  
  if (galleryData) {
    galleryLoader.allImages = galleryData.images;
    galleryLoader.currentPage = 1;
    galleryLoader.renderInitialImages();
  } else {
    alert('No gallery data available for this date');
  }
}

// Initialize everything when DOM is loaded
let galleryLoader;
document.addEventListener('DOMContentLoaded', () => {
  updateDateDisplay();
  galleryLoader = new LazyGalleryLoader();
  galleryLoader.initialize();
});