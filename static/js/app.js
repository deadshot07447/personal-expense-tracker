// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

// Show a temporary status message
function showMessage(msg, isError = false) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = msg;
    statusEl.className = isError ? 'status-error' : 'status-success';
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 4000);
}

// --- API Calls ---

// 1. Fetch and populate Categories
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const select = document.getElementById('category');
        // Clear existing options except the placeholder
        select.innerHTML = '<option value="" disabled selected>Select a category...</option>';
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_id;
            option.textContent = cat.category_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
        showMessage('Failed to load categories. Check backend.', true);
    }
}

// 2. Fetch and render Dashboard Stats
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const stats = await response.json();
        
        if (response.ok) {
            // Update summary cards
            document.getElementById('total-spend').textContent = formatCurrency(stats.total_spend);
            document.getElementById('total-spend').classList.remove('loading');
            
            document.getElementById('monthly-spend').textContent = formatCurrency(stats.monthly_spend);
            document.getElementById('monthly-spend').classList.remove('loading');
            
            document.getElementById('yearly-spend').textContent = formatCurrency(stats.yearly_spend);
            document.getElementById('yearly-spend').classList.remove('loading');
            
            // Update Category-wise list
            const categoryList = document.getElementById('category-list');
            categoryList.innerHTML = ''; // Clear loading state
            
            if (stats.category_spending.length === 0) {
                categoryList.innerHTML = '<div class="loading-state">No spending yet.</div>';
            } else {
                stats.category_spending.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = `
                        <div class="item-left">
                            <span class="item-name">${item.category}</span>
                        </div>
                        <span class="item-amount">${formatCurrency(item.amount)}</span>
                    `;
                    categoryList.appendChild(row);
                });
            }
            
            // Update Monthly Trend Bars
            const trendContainer = document.getElementById('monthly-trend');
            trendContainer.innerHTML = '';
            
            // Find max amount to calculate bar widths relatively
            const maxAmount = stats.monthly_spending_trend.reduce((max, item) => Math.max(max, item.amount), 0);
            
            if (stats.monthly_spending_trend.length === 0) {
                trendContainer.innerHTML = '<div class="loading-state">No data for this year yet.</div>';
            } else {
                stats.monthly_spending_trend.forEach(item => {
                    const widthPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                    
                    const row = document.createElement('div');
                    row.className = 'trend-row';
                    row.innerHTML = `
                        <div class="trend-label">${item.month}</div>
                        <div class="trend-bar-wrapper">
                            <div class="trend-bar" style="width: ${widthPercent}%"></div>
                        </div>
                        <div class="trend-amount">${formatCurrency(item.amount)}</div>
                    `;
                    trendContainer.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// 3. Fetch and render Recent Expenses
async function loadRecentExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const expenses = await response.json();
        
        const listContainer = document.getElementById('recent-expenses');
        listContainer.innerHTML = ''; // Clear loading state
        
        if (expenses.length === 0) {
            listContainer.innerHTML = '<div class="loading-state">No recent expenses.</div>';
            return;
        }
        
        expenses.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'list-item';
            
            // Determine if we show note or date based on presence
            const noteText = exp.note ? exp.note : '';
            const dateText = exp.expense_date;
            
            item.innerHTML = `
                <div class="item-left">
                    <span class="item-name">${exp.category_name}</span>
                    <span class="item-note">${noteText} • ${dateText}</span>
                </div>
                <div>
                    <span class="item-amount">${formatCurrency(exp.amount)}</span>
                    <button class="delete-btn" onclick="deleteExpense(${exp.expense_id})">✖</button>
                </div>
            `;
            listContainer.appendChild(item);
        });
        
    } catch (error) {
        console.error('Failed to load recent expenses:', error);
    }
}

// 4. Handle Add Expense Form Submission
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload
    
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Adding...';
    
    // Collect data
    const payload = {
        category_id: parseInt(document.getElementById('category').value),
        amount: parseFloat(document.getElementById('amount').value),
        note: document.getElementById('note').value
    };
    
    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showMessage('Expense added successfully!');
            // Clear form
            document.getElementById('expense-form').reset();
            
            // Refresh data on page without reloading
            await loadDashboard();
            await loadRecentExpenses();
        } else {
            const errData = await response.json();
            showMessage(errData.error || 'Failed to add expense.', true);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('Network error. Failed to add expense.', true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Expense';
    }
});

// 5. Handle Expense Deletion
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Expense deleted.');
            // Refresh data
            await loadDashboard();
            await loadRecentExpenses();
        } else {
            showMessage('Failed to delete expense.', true);
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showMessage('Network error.', true);
    }
}


// --- Initialization ---

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadDashboard();
    loadRecentExpenses();
});
