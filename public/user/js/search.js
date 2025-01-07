
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const searchResults = document.getElementById('searchResults');
const resultsContent = searchResults.querySelector('.results-list');
const loadingState = searchResults.querySelector('.search-loading');
const noResultsState = searchResults.querySelector('.no-results');

let searchTimeout;
let isSearching = false;

// Initialize search handlers
function initializeSearch() {
    // Search input handler with debounce
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();

        if (!query) {
            hideResults();
            return;
        }

        showLoadingState();
        searchTimeout = setTimeout(() => performQuickSearch(query), 300);
    });

    // Search form submission (Enter key or button click)
    searchBtn.addEventListener('click', handleSearchSubmit);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            handleSearchSubmit(e);
        } else if (e.key === 'Escape') {
            hideResults();
        }
    });

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            hideResults();
        }
    });
}

// Handle search submit
async function handleSearchSubmit(e) {
    e.preventDefault();
    if (isSearching) return;

    const query = searchInput.value.trim();
    if (!query) return;

    try {
        isSearching = true;
        searchBtn.innerHTML = '<i class="uil uil-spinner-alt fa-spin"></i>';
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    } catch (error) {
        console.error('Search error:', error);
        showErrorMessage('Failed to perform search');
    } finally {
        isSearching = false;
        searchBtn.innerHTML = '<i class="uil uil-search"></i>';
    }
}

// Quick search for dropdown
async function performQuickSearch(query) {
    try {
        const response = await fetch(`/quick-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            displayQuickResults(data.products, query);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Quick search error:', error);
        showNoResults();
    } finally {
        hideLoadingState();
    }
}

// Display quick search results
function displayQuickResults(products, query) {
    if (!products.length) {
        showNoResults(query);
        return;
    }

    resultsContent.innerHTML = `
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

// UI State functions
function showLoadingState() {
    showResults();
    resultsContent.style.display = 'none';
    loadingState.style.display = 'flex';
    noResultsState.style.display = 'none';
}

function hideLoadingState() {
    loadingState.style.display = 'none';
    resultsContent.style.display = 'block';
}

function showNoResults(query = '') {
    resultsContent.style.display = 'none';
    noResultsState.style.display = 'flex';
    noResultsState.innerHTML = `
        <i class="uil uil-search"></i>
        <p>No products found</p>
        <a href="/search?q=${encodeURIComponent(query)}" class="view-all-link">
            Search all products
        </a>
    `;
}

function showResults() {
    searchResults.style.display = 'block';
}

function hideResults() {
    searchResults.style.display = 'none';
}

function showErrorMessage(message) {
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
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeSearch);

let currentParams = new URLSearchParams(window.location.search);

// Update filters
function updateFilters() {
    const showOutOfStock = document.getElementById('showOutOfStock').checked;
    
    // Update URL params
    currentParams.set('outOfStock', showOutOfStock);
    currentParams.set('page', '1'); // Reset to first page when filters change
    
    // Reload with new params
    window.location.href = `${window.location.pathname}?${currentParams.toString()}`;
}

// Update sort
function updateSort(sortValue) {
    // Update URL params
    currentParams.set('sort', sortValue);
    currentParams.set('page', '1'); // Reset to first page when sort changes
    
    // Reload with new params
    window.location.href = `${window.location.pathname}?${currentParams.toString()}`;
}

// Clear all filters
function clearAllFilters() {
    // Keep only the search query
    const query = currentParams.get('q');
    currentParams = new URLSearchParams();
    if (query) {
        currentParams.set('q', query);
    }
    
    // Reload with cleared params
    window.location.href = `${window.location.pathname}?${currentParams.toString()}`;
}

// Handle pagination
function changePage(pageNumber) {
    // Update URL params
    currentParams.set('page', pageNumber);
    
    // Reload with new page
    window.location.href = `${window.location.pathname}?${currentParams.toString()}`;
}

// Initialize tooltips and other UI elements
document.addEventListener('DOMContentLoaded', function() {
    // Preserve selected sort option
    const sortSelect = document.querySelector('.product-sort select');
    if (sortSelect) {
        sortSelect.value = currentParams.get('sort') || 'featured';
    }

    // Preserve checkbox states
    const outOfStockCheckbox = document.getElementById('showOutOfStock');
    if (outOfStockCheckbox) {
        outOfStockCheckbox.checked = currentParams.get('outOfStock') === 'true';
    }

    // Handle browser back/forward
    window.onpopstate = function(event) {
        if (event.state) {
            currentParams = new URLSearchParams(event.state.search);
        }
    };
});

// Update URL without reloading (for browser history)
function updateURL() {
    const newURL = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.pushState({ search: currentParams.toString() }, '', newURL);
}

// Add loading state
function showLoading() {
    document.body.style.cursor = 'wait';
    const productsContainer = document.querySelector('.product-list-view');
    if (productsContainer) {
        productsContainer.style.opacity = '0.5';
    }
}

// Remove loading state
function hideLoading() {
    document.body.style.cursor = 'default';
    const productsContainer = document.querySelector('.product-list-view');
    if (productsContainer) {
        productsContainer.style.opacity = '1';
    }
}

// Handle errors
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonText: 'Okay'
    });
}