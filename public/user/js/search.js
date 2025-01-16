// Frontend Search Script (search.js)

let searchTimeout;
let isSearching = false;
let currentPage = 1;
let isLoadingMore = false;
let currentParams = new URLSearchParams(window.location.search);

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    const searchResults = document.getElementById('searchResults');
    const searchHistory = document.getElementById('searchHistory');

    if (!searchInput) return;

    // Search input handler with debounce
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();

        if (!query) {
            hideResults();
            showSearchHistory();
            return;
        }

        hideSearchHistory();
        showLoadingState();
        searchTimeout = setTimeout(() => performQuickSearch(query), 300);
    });

    // Search form submission
    searchBtn.addEventListener('click', handleSearchSubmit);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            handleSearchSubmit(e);
        } else if (e.key === 'Escape') {
            hideResults();
        }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && 
            !searchInput.contains(e.target)) {
            hideResults();
        }
        if (!searchHistory.contains(e.target) && 
            !searchInput.contains(e.target)) {
            hideSearchHistory();
        }
    });

    // Load search history on focus
    searchInput.addEventListener('focus', function() {
        const query = this.value.trim();
        if (!query) {
            showSearchHistory();
        }
    });

    // Initialize price range inputs
    initializePriceInputs();
}

// Quick search functionality
async function performQuickSearch(query) {
    try {
        const response = await fetch(`/api/quick-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        displayQuickResults(data.products, query);
    } catch (error) {
        console.error('Quick search error:', error);
        showNoResults();
    } finally {
        hideLoadingState();
    }
}

// Handle search form submission
async function handleSearchSubmit(e) {
    e.preventDefault();
    if (isSearching) return;

    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) return;

    try {
        isSearching = true;
        showButtonLoading();
        
        // Save search to history if user is logged in
        await saveSearchHistory(query);
        
        // Redirect to search results page
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to perform search');
    } finally {
        isSearching = false;
        hideButtonLoading();
    }
}

// Save search to history
async function saveSearchHistory(query) {
    try {
        const response = await fetch('/api/search-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Failed to save search history:', error);
    }
}

// Load and display search history
async function loadSearchHistory() {
    try {
        const response = await fetch('/api/search-history');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const historyList = document.querySelector('.history-list');
        historyList.innerHTML = data.history
            .map(item => `
                <div class="history-item">
                    <i class="uil uil-clock-three"></i>
                    <span onclick="useHistoryItem('${item.query}')">${item.query}</span>
                    <i class="uil uil-times" onclick="removeHistoryItem('${item._id}')"></i>
                </div>
            `)
            .join('');
    } catch (error) {
        console.error('Failed to load search history:', error);
    }
}

// Filter and sort functionality
function updateFilters() {
    const categoryCheckboxes = document.querySelectorAll('.category-filter:checked');
    const showOutOfStock = document.getElementById('showOutOfStock').checked;
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);

    // Update URL params
    currentParams.set('outOfStock', showOutOfStock);
    if (selectedCategories.length) {
        currentParams.set('categories', selectedCategories.join(','));
    } else {
        currentParams.delete('categories');
    }
    currentParams.set('page', '1'); // Reset to first page

    reloadWithParams();
}

function applyPriceFilter() {
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    if (minPrice) currentParams.set('minPrice', minPrice);
    else currentParams.delete('minPrice');

    if (maxPrice) currentParams.set('maxPrice', maxPrice);
    else currentParams.delete('maxPrice');

    currentParams.set('page', '1'); // Reset to first page
    reloadWithParams();
}

function updateSort(sortValue) {
    currentParams.set('sort', sortValue);
    currentParams.set('page', '1');
    reloadWithParams();
}

function clearAllFilters() {
    const query = currentParams.get('q');
    currentParams = new URLSearchParams();
    if (query) currentParams.set('q', query);
    reloadWithParams();
}

// Load more products functionality
async function loadMoreProducts() {
    if (isLoadingMore) return;

    try {
        isLoadingMore = true;
        showLoadMoreLoading();

        currentPage++;
        currentParams.set('page', currentPage);

        const response = await fetch(`/api/products/search?${currentParams.toString()}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        appendProducts(data.products);
        
        if (!data.hasMoreProducts) {
            hideLoadMoreButton();
        }
    } catch (error) {
        console.error('Failed to load more products:', error);
        showError('Failed to load more products');
        currentPage--;
    } finally {
        isLoadingMore = false;
        hideLoadMoreLoading();
        //... continuing from previous code

    }
}

// Helper functions for UI state management
function showLoadingState() {
    const loadingState = document.querySelector('.search-loading');
    const resultsList = document.querySelector('.results-list');
    if (loadingState && resultsList) {
        loadingState.style.display = 'flex';
        resultsList.style.display = 'none';
    }
}

function hideLoadingState() {
    const loadingState = document.querySelector('.search-loading');
    const resultsList = document.querySelector('.results-list');
    if (loadingState && resultsList) {
        loadingState.style.display = 'none';
        resultsList.style.display = 'block';
    }
}

function showButtonLoading() {
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="uil uil-spinner-alt fa-spin"></i>';
        searchBtn.disabled = true;
    }
}

function hideButtonLoading() {
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.innerHTML = '<i class="uil uil-search"></i>';
        searchBtn.disabled = false;
    }
}

function showLoadMoreLoading() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<i class="uil uil-spinner-alt fa-spin"></i> Loading...';
        loadMoreBtn.classList.add('loading');
    }
}

function hideLoadMoreLoading() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = 'Load More Products';
        loadMoreBtn.classList.remove('loading');
    }
}

function hideLoadMoreButton() {
    const loadMoreBtn = document.querySelector('.load-more-wrapper');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

function showSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) {
        loadSearchHistory();
        searchHistory.style.display = 'block';
    }
}

function hideSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) {
        searchHistory.style.display = 'none';
    }
}

function showResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'block';
    }
}

function hideResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

// Display functions
function displayQuickResults(products, query) {
    const resultsList = document.querySelector('.results-list');
    if (!resultsList) return;

    if (!products.length) {
        showNoResults();
        return;
    }

    resultsList.innerHTML = `
        ${products.map(product => `
            <a href="/product/${product.id}" class="result-item">
                <div class="result-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="result-info">
                    <div class="result-name">${product.name}</div>
                    <div class="result-category">${product.category}</div>
                </div>
                <div class="result-price">₹${product.price}</div>
            </a>
        `).join('')}
        <div class="view-all-results">
            <a href="/search?q=${encodeURIComponent(query)}">
                View all results <i class="uil uil-arrow-right"></i>
            </a>
        </div>
    `;

    showResults();
}

function appendProducts(newProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid || !newProducts.length) return;

    const productsHTML = newProducts.map(product => `
        <div class="col-lg-3 col-md-6">
            <!-- Using the same product card template -->
            ${generateProductCard(product)}
        </div>
    `).join('');

    productsGrid.insertAdjacentHTML('beforeend', productsHTML);
}

function generateProductCard(product) {
    return `
        <div class="product-item mb-30">
            <a href="/product/${product._id}" class="product-img">
                <img src="${product.images[0]}" alt="${product.name}">
                ${product.discountPercentage > 0 ? 
                    `<span class="offer-badge-1">${product.discountPercentage}% off</span>` : 
                    ''}
            </a>
            <div class="product-text-dt">
                <p>${product.stock > 0 ? '' : '<span>Out of Stock</span>'}</p>
                <h4>${product.name}</h4>
                <div class="product-price">
                    ${product.discountPrice ? 
                        `₹${product.discountPrice} <span>₹${product.price}</span>` : 
                        `₹${product.price}`}
                </div>
                <!-- Add to cart functionality here -->
            </div>
        </div>
    `;
}

function showNoResults() {
    const resultsList = document.querySelector('.results-list');
    const noResults = document.querySelector('.no-results');
    if (resultsList && noResults) {
        resultsList.style.display = 'none';
        noResults.style.display = 'flex';
    }
}

function showError(message) {
    if (window.Swal) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        alert(message);
    }
}

// Price range input initialization
function initializePriceInputs() {
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');

    if (minPrice && maxPrice) {
        // Ensure min doesn't exceed max
        minPrice.addEventListener('change', function() {
            if (maxPrice.value && parseInt(this.value) > parseInt(maxPrice.value)) {
                this.value = maxPrice.value;
            }
        });

        // Ensure max doesn't go below min
        maxPrice.addEventListener('change', function() {
            if (minPrice.value && parseInt(this.value) < parseInt(minPrice.value)) {
                this.value = minPrice.value;
            }
        });
    }
}

// URL handling
function reloadWithParams() {
    window.location.href = `${window.location.pathname}?${currentParams.toString()}`;
}

// Search history item handlers
function useHistoryItem(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = query;
        handleSearchSubmit(new Event('submit'));
    }
}

async function removeHistoryItem(itemId) {
    try {
        const response = await fetch(`/api/search-history/${itemId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            loadSearchHistory(); // Reload the history list
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Failed to remove history item:', error);
        showError('Failed to remove from history');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeSearch);