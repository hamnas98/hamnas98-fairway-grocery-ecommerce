let searchTimeout;
let isSearching = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeHeaderSearch();
});

function initializeHeaderSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    const searchResults = document.getElementById('searchResults');
    const searchHistory = document.getElementById('searchHistory');

    if (!searchInput) return;

    // Handle search input with debounce
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

    // Show history on input focus when empty
    searchInput.addEventListener('focus', function() {
        if (!this.value.trim()) {
            loadAndShowHistory();
        }
    });

    // Handle search submission
    searchBtn.addEventListener('click', handleSearchSubmit);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit(e);
        }
    });

    // Handle clicks outside dropdowns
    document.addEventListener('click', function(e) {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            hideResults();
        }
        if (!searchHistory.contains(e.target) && !searchInput.contains(e.target)) {
            hideSearchHistory();
        }
    });
}

// Quick Search Functionality
async function performQuickSearch(query) {
    try {
        const response = await fetch(`/quick-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message);

        displayQuickResults(data.products, query);
    } catch (error) {
        console.error('Quick search error:', error);
        showNoResults();
    } finally {
        hideLoadingState();
    }
}

async function loadAndShowHistory() {
    const searchHistory = document.getElementById('searchHistory');
    const historyList = searchHistory.querySelector('.history-list');

    try {
        const response = await fetch('/search-history');
        const data = await response.json();

        if (!data.success || !data.history.length) {
            searchHistory.style.display = 'none';
            return;
        }

        historyList.innerHTML = data.history
            .map(item => `
                <div class="history-item" data-id="${item._id}">
                    <button class="history-query" onclick="useHistoryQuery('${encodeURIComponent(item.query)}')">
                        <i class="uil uil-history"></i>
                        <span>${item.query}</span>
                    </button>
                    <button class="remove-history" onclick="removeHistoryItem('${item._id}', event)">
                        <i class="uil uil-times"></i>
                    </button>
                </div>
            `).join('');

        searchHistory.style.display = 'block';
    } catch (error) {
        console.error('Failed to load search history:', error);
    }
}

// Helper functions for search history
function useHistoryQuery(query) {
    const searchInput = document.getElementById('searchInput');
    const decodedQuery = decodeURIComponent(query);
    searchInput.value = decodedQuery;
    hideSearchHistory();
    window.location.href = `/search?q=${encodeURIComponent(decodedQuery)}`;
}

async function removeHistoryItem(itemId, event) {
    event.stopPropagation();
    try {
        const response = await fetch(`/search-history/${itemId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            const historyItem = document.querySelector(`.history-item[data-id="${itemId}"]`);
            if (historyItem) {
                historyItem.remove();
                const historyList = document.querySelector('.history-list');
                if (!historyList.children.length) {
                    hideSearchHistory();
                }
            }
        }
    } catch (error) {
        console.error('Failed to remove history item:', error);
        showError('Failed to remove from history');
    }
}

// UI Helper Functions
function showLoadingState() {
    const loadingState = document.querySelector('.search-loading');
    if (loadingState) loadingState.style.display = 'flex';
}

function hideLoadingState() {
    const loadingState = document.querySelector('.search-loading');
    if (loadingState) loadingState.style.display = 'none';
}

function showSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) searchHistory.style.display = 'block';
}

function hideSearchHistory() {
    const searchHistory = document.getElementById('searchHistory');
    if (searchHistory) searchHistory.style.display = 'none';
}

function showResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.style.display = 'block';
}

function hideResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.style.display = 'none';
}

function showNoResults() {
    const noResults = document.querySelector('.no-results');
    if (noResults) noResults.style.display = 'flex';
}

function showError(message) {
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
                    <div class="result-price">₹${product.price.toFixed(2)}</div>
                </div>
            </a>
        `).join('')}
        <a href="/search?q=${encodeURIComponent(query)}" class="view-all">
            View all results <i class="uil uil-arrow-right"></i>
        </a>
    `;

    showResults();
}

async function handleSearchSubmit(e) {
    e.preventDefault();
    if (isSearching) return;

    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) return;

    try {
        isSearching = true;
        await saveSearchHistory(query);
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    } catch (error) {
        console.error('Search error:', error);
        showError('Failed to perform search');
    } finally {
        isSearching = false;
    }
}

async function saveSearchHistory(query) {
    try {
        const response = await fetch('/search-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
    } catch (error) {
        console.error('Failed to save search history:', error);
    }
}