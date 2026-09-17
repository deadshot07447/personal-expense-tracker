/**
 * Personal Expense Tracker - Single Page Application Engine
 * Handles Authentication, Live Budget Warnings, Weekly Comparison,
 * Category Pie Charts, Expense Calendar, and Category Management.
 */

// ================= GLOBAL STATE =================
const state = {
    user: null,
    categories: [],
    weeklyChart: null,
    pieChart: null,
    calendar: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1 // 1-12
    },
    pie: {
        period: 'monthly'
    },
    selectedCalendarDate: null
};

// Currency Formatter (INR ₹)
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

// Toast Notification (Center Bottom)
let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('status-toast');
    if (!toast) return;

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    let iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-exclamation-circle-fill';
    else if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';
    else if (type === 'info') iconClass = 'bi-info-circle-fill';

    toast.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = `bi ${iconClass} me-2`;
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(icon);
    toast.appendChild(span);

    toast.className = `toast-message toast-${type}`;
    toast.classList.remove('hidden');

    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ================= AUTHENTICATION =================
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        const authScreen = document.getElementById('auth-screen');
        const appView = document.getElementById('app-view');

        if (data.authenticated && data.user) {
            state.user = data.user;
            document.getElementById('nav-username').textContent = data.user.username;
            document.getElementById('nav-avatar').textContent = data.user.username.charAt(0).toUpperCase();

            // Show app view, hide auth landing screen
            if (authScreen) authScreen.classList.add('hidden');
            if (appView) appView.classList.remove('hidden');
            return true;
        } else {
            state.user = null;
            // Show auth landing screen, hide app view
            if (authScreen) authScreen.classList.remove('hidden');
            if (appView) appView.classList.add('hidden');
            return false;
        }
    } catch (err) {
        console.error('Failed to check auth status:', err);
        return false;
    }
}

async function performLogin(username, password) {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            showToast(`Signed in as ${data.user.username}`, 'success');
            await checkAuth();
            await refreshAllViews();
        } else {
            showToast(data.error || 'Invalid credentials.', 'error');
        }
    } catch (err) {
        showToast('Network error while signing in.', 'error');
    }
}

function initAuthHandlers() {
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');
    const loginForm = document.getElementById('screen-login-form');
    const regForm = document.getElementById('screen-register-form');
    const logoutBtn = document.getElementById('logout-btn');

    const signinBtn = document.getElementById('screen-btn-signin');
    const signinUser = document.getElementById('screen-login-user');
    const signinPass = document.getElementById('screen-login-pass');

    const signupBtn = document.getElementById('screen-btn-signup');
    const signupUser = document.getElementById('screen-reg-user');
    const signupEmail = document.getElementById('screen-reg-email');
    const signupPass = document.getElementById('screen-reg-pass');

    // Real-time Sign-In validation
    function validateSignin() {
        if (!signinBtn || !signinUser || !signinPass) return;
        const valid = signinUser.value.trim().length > 0 && signinPass.value.length > 0;
        signinBtn.disabled = !valid;
    }

    if (signinUser && signinPass) {
        signinUser.addEventListener('input', validateSignin);
        signinPass.addEventListener('input', validateSignin);
        validateSignin();
    }

    // Real-time Register validation
    function validateSignup() {
        if (!signupBtn || !signupUser || !signupEmail || !signupPass) return;
        const valid = signupUser.value.trim().length >= 3 && 
                      signupEmail.value.trim().includes('@') && 
                      signupPass.value.length >= 4;
        signupBtn.disabled = !valid;
    }

    if (signupUser && signupEmail && signupPass) {
        signupUser.addEventListener('input', validateSignup);
        signupEmail.addEventListener('input', validateSignup);
        signupPass.addEventListener('input', validateSignup);
        validateSignup();
    }

    if (tabSignin && tabSignup) {
        tabSignin.addEventListener('click', () => {
            tabSignin.classList.add('active');
            tabSignup.classList.remove('active');
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
            validateSignin();
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabSignin.classList.remove('active');
            regForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            validateSignup();
        });
    }

    // Handle standard sign-in form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = signinUser.value.trim();
            const password = signinPass.value;
            await performLogin(username, password);
        });
    }

    // Handle register form
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = signupUser.value.trim();
            const email = signupEmail.value.trim();
            const password = signupPass.value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast(`Account created for ${data.user.username}!`, 'success');
                    await checkAuth();
                    await refreshAllViews();
                } else {
                    showToast(data.error || 'Failed to create account.', 'error');
                }
            } catch (err) {
                showToast('Network error during registration.', 'error');
            }
        });
    }

    // Handle Quick Demo Account Buttons
    document.querySelectorAll('.btn-demo-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const username = btn.getAttribute('data-user');
            const password = btn.getAttribute('data-pass');
            await performLogin(username, password);
        });
    });

    // Handle sign out
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                showToast('Signed out successfully.', 'success');
                await checkAuth();
            } catch (err) {
                showToast('Error during logout.', 'error');
            }
        });
    }
}


// ================= NAVIGATION TABS =================
function initTabNavigation() {
    const tabs = document.querySelectorAll('.nav-item');
    const titles = {
        'dashboard-tab': 'Dashboard',
        'weekly-tab': 'Weekly Comparison',
        'pie-tab': 'Category Distribution',
        'calendar-tab': 'Expense Calendar',
        'budgets-tab': 'Budgets & Limits',
        'categories-tab': 'Categories'
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const content = document.getElementById(targetTabId);
            if (content) content.classList.add('active');

            const titleEl = document.getElementById('page-title');
            if (titleEl && titles[targetTabId]) {
                titleEl.textContent = titles[targetTabId];
            }

            // Trigger specific tab view loaders
            if (targetTabId === 'weekly-tab') {
                loadWeeklyComparison();
            } else if (targetTabId === 'pie-tab') {
                loadCategoryPie();
            } else if (targetTabId === 'calendar-tab') {
                loadCalendarView();
            } else if (targetTabId === 'budgets-tab') {
                loadBudgetsView();
            } else if (targetTabId === 'categories-tab') {
                loadCategoriesManager();
            }
        });
    });

    const shortcutBtn = document.getElementById('view-pie-shortcut');
    if (shortcutBtn) {
        shortcutBtn.addEventListener('click', () => {
            const pieBtn = document.getElementById('tab-btn-pie');
            if (pieBtn) pieBtn.click();
        });
    }
}


// ================= CATEGORIES =================
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        state.categories = await res.json();

        // Populate Add Expense Category Select
        const catSelect = document.getElementById('category');
        catSelect.innerHTML = '<option value="" disabled selected>Choose category...</option>';
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.category_id;
            opt.textContent = cat.category_name;
            catSelect.appendChild(opt);
        });

        // Populate Calendar Modal Category Select
        const modalCatSelect = document.getElementById('modal-day-category');
        if (modalCatSelect) {
            modalCatSelect.innerHTML = '<option value="" disabled selected>Select category...</option>';
            state.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.category_id;
                opt.textContent = cat.category_name;
                modalCatSelect.appendChild(opt);
            });
        }

        // Populate Budget Category Select (strictly categories only)
        const budgetCatSelect = document.getElementById('budget-category-select');
        if (budgetCatSelect) {
            budgetCatSelect.innerHTML = '';
            state.categories.forEach((cat, idx) => {
                const opt = document.createElement('option');
                opt.value = cat.category_id;
                opt.textContent = cat.category_name;
                if (idx === 0) opt.selected = true;
                budgetCatSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}


// ================= DASHBOARD =================
async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard');
        const stats = await res.json();

        if (res.ok) {
            document.getElementById('total-spend').textContent = formatCurrency(stats.total_spend);
            document.getElementById('total-spend').classList.remove('loading');

            document.getElementById('monthly-spend').textContent = formatCurrency(stats.monthly_spend);
            document.getElementById('monthly-spend').classList.remove('loading');

            document.getElementById('yearly-spend').textContent = formatCurrency(stats.yearly_spend);
            document.getElementById('yearly-spend').classList.remove('loading');

            // Category-wise list
            const categoryList = document.getElementById('category-list');
            categoryList.innerHTML = '';
            if (!stats.category_spending || stats.category_spending.length === 0) {
                categoryList.innerHTML = '<div class="loading-state">No category spending recorded yet.</div>';
            } else {
                stats.category_spending.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'list-item';
                    row.innerHTML = `
                        <div class="item-left">
                            <span class="cat-dot" style="background-color: ${item.color || '#6366f1'}"></span>
                            <div class="item-details">
                                <span class="item-name">${item.category}</span>
                            </div>
                        </div>
                        <span class="item-amount">${formatCurrency(item.amount)}</span>
                    `;
                    categoryList.appendChild(row);
                });
            }

            // Monthly Trend Bars
            const trendContainer = document.getElementById('monthly-trend');
            trendContainer.innerHTML = '';
            const maxTrend = stats.monthly_spending_trend.reduce((max, i) => Math.max(max, i.amount), 0);

            if (!stats.monthly_spending_trend || stats.monthly_spending_trend.length === 0) {
                trendContainer.innerHTML = '<div class="loading-state">No trend data for this year.</div>';
            } else {
                stats.monthly_spending_trend.forEach(item => {
                    const widthPct = maxTrend > 0 ? (item.amount / maxTrend) * 100 : 0;
                    const row = document.createElement('div');
                    row.className = 'trend-row';
                    row.innerHTML = `
                        <span class="trend-label">${item.month}</span>
                        <div class="trend-bar-track">
                            <div class="trend-bar-fill" style="width: ${widthPct}%"></div>
                        </div>
                        <span class="trend-amount">${formatCurrency(item.amount)}</span>
                    `;
                    trendContainer.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

async function loadRecentExpenses() {
    try {
        const res = await fetch('/api/expenses');
        const expenses = await res.json();
        const listContainer = document.getElementById('recent-expenses');
        listContainer.innerHTML = '';

        if (!expenses || expenses.length === 0) {
            listContainer.innerHTML = '<div class="loading-state">No recent expenses recorded.</div>';
            return;
        }

        expenses.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const noteText = exp.note ? exp.note : 'No note';
            item.innerHTML = `
                <div class="item-left">
                    <span class="cat-dot" style="background-color: ${exp.color || '#6366f1'}"></span>
                    <div class="item-details">
                        <span class="item-name">${exp.category_name}</span>
                        <span class="item-sub">${noteText} &bull; ${exp.expense_date}</span>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-amount">${formatCurrency(exp.amount)}</span>
                    <button class="delete-btn" onclick="deleteExpenseItem(${exp.expense_id})" title="Delete transaction">✕</button>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (err) {
        console.error('Failed to load recent expenses:', err);
    }
}

// Global delete function
window.deleteExpenseItem = async function(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
        const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Expense removed.', 'success');
            await refreshAllViews();
        } else {
            showToast('Failed to delete expense.', 'error');
        }
    } catch (err) {
        showToast('Network error while deleting.', 'error');
    }
};


// ================= ADD EXPENSE FORM =================
function initExpenseForm() {
    const form = document.getElementById('expense-form');
    const catSelect = document.getElementById('category');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('expense-date');
    const btn = document.getElementById('submit-expense-btn');

    dateInput.value = new Date().toISOString().split('T')[0];

    function validateExpenseForm() {
        if (!btn || !catSelect || !amountInput) return;
        const amtVal = parseFloat(amountInput.value);
        const valid = catSelect.value && !isNaN(amtVal) && amtVal > 0 && !!dateInput.value;
        btn.disabled = !valid;
    }

    catSelect.addEventListener('change', validateExpenseForm);
    amountInput.addEventListener('input', validateExpenseForm);
    dateInput.addEventListener('input', validateExpenseForm);
    dateInput.addEventListener('change', validateExpenseForm);
    validateExpenseForm();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.innerHTML = '<span>Adding...</span>';

        const payload = {
            category_id: parseInt(catSelect.value),
            amount: parseFloat(amountInput.value),
            expense_date: dateInput.value,
            note: document.getElementById('note').value.trim()
        };

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                showToast('Expense recorded successfully!', 'success');
                form.reset();
                dateInput.value = new Date().toISOString().split('T')[0];

                // Check for live budget warnings returned by the backend
                if (data.budget_warnings && data.budget_warnings.length > 0) {
                    data.budget_warnings.forEach(w => {
                        setTimeout(() => {
                            showToast(w.message, w.level === 'danger' ? 'error' : 'warning');
                        }, 800);
                    });
                }

                await refreshAllViews();
            } else {
                showToast(data.error || 'Failed to add expense.', 'error');
            }
        } catch (err) {
            showToast('Network error. Check server.', 'error');
        } finally {
            btn.innerHTML = '<span>Save Expense</span>';
            validateExpenseForm();
        }
    });

    // Quick Add Category button inside expense form
    document.getElementById('btn-quick-add-cat').addEventListener('click', () => {
        document.getElementById('category-modal').classList.remove('hidden');
        const catNameInput = document.getElementById('new-cat-name');
        const saveCatBtn = document.getElementById('btn-save-category');
        if (catNameInput) catNameInput.value = '';
        if (saveCatBtn) saveCatBtn.disabled = true;
    });
}


// ================= BUDGETS & LIMITS =================
async function loadBudgetsView() {
    try {
        const res = await fetch('/api/budgets');
        const data = await res.json();

        // 1. Render Global Warning Banners
        const bannerContainer = document.getElementById('global-alerts-container');
        bannerContainer.innerHTML = '';
        const navBadge = document.getElementById('nav-alert-badge');

        if (data.alerts && data.alerts.length > 0) {
            navBadge.textContent = data.alerts.length;
            navBadge.classList.remove('hidden');

            data.alerts.forEach(alert => {
                const banner = document.createElement('div');
                banner.className = `alert-banner alert-${alert.level}`;
                banner.innerHTML = `
                    <div class="alert-content">
                        <span class="status-tag ${alert.level === 'danger' ? 'badge-red' : 'badge-yellow'}">${alert.level === 'danger' ? 'ALERT' : 'WARNING'}</span>
                        <div>
                            <strong>${alert.title}:</strong> ${alert.message}
                        </div>
                    </div>
                `;
                bannerContainer.appendChild(banner);
            });
        } else {
            navBadge.classList.add('hidden');
        }

        // 2. Overall Monthly Budget Display
        const overall = data.overall_budget;
        const miniProgress = document.getElementById('monthly-budget-progress-mini');
        const miniFill = document.getElementById('monthly-budget-fill-mini');
        const miniHint = document.getElementById('monthly-budget-hint');

        if (overall) {
            document.getElementById('overall-limit-amount').textContent = formatCurrency(overall.limit_amount);
            document.getElementById('overall-spent-amount').textContent = formatCurrency(overall.spent_amount);
            document.getElementById('overall-remaining-amount').textContent = formatCurrency(overall.remaining);
            
            const pctEl = document.getElementById('overall-percentage');
            pctEl.textContent = `${overall.percentage}%`;
            pctEl.className = `stat-val badge-stat ${overall.status === 'danger' ? 'badge-red' : (overall.status === 'warning' ? 'badge-yellow' : '')}`;

            const fillBar = document.getElementById('overall-budget-fill');
            fillBar.style.width = `${Math.min(100, overall.percentage)}%`;
            fillBar.className = `budget-progress-bar ${overall.status === 'danger' ? 'bar-danger' : (overall.status === 'warning' ? 'bar-warning' : '')}`;

            // Mini progress on dashboard
            if (miniFill) {
                miniFill.style.width = `${Math.min(100, overall.percentage)}%`;
                miniFill.style.backgroundColor = overall.status === 'danger' ? '#f43f5e' : (overall.status === 'warning' ? '#f59e0b' : '#6366f1');
            }
            if (miniHint) {
                miniHint.textContent = `${overall.percentage}% of ₹${overall.limit_amount.toLocaleString('en-IN')} limit`;
            }
        } else {
            document.getElementById('overall-limit-amount').textContent = 'Not Set';
            document.getElementById('overall-percentage').textContent = '—';
            if (miniHint) miniHint.textContent = 'Monthly limit: Not set';
        }

        // 3. Category-Wise Budgets Grid
        const catGrid = document.getElementById('category-budgets-grid');
        catGrid.innerHTML = '';

        if (!data.category_budgets || data.category_budgets.length === 0) {
            catGrid.innerHTML = '<div class="loading-state">No category budget limits configured yet. Click "+ Set Category Limit" above!</div>';
        } else {
            data.category_budgets.forEach(b => {
                const card = document.createElement('div');
                card.className = 'cat-budget-card';
                card.innerHTML = `
                    <div class="cat-budget-top">
                        <div class="cat-budget-title">
                            <span class="cat-dot" style="background-color: ${b.color || '#6366f1'}"></span>
                            <span>${b.category_name}</span>
                        </div>
                        <span class="kpi-badge ${b.status === 'danger' ? 'badge-red' : (b.status === 'warning' ? 'badge-yellow' : 'badge-green')}">
                            ${b.percentage}%
                        </span>
                    </div>

                    <div class="cat-budget-amounts">
                        <span>Spent: <strong>${formatCurrency(b.spent_amount)}</strong></span>
                        <span>Limit: <strong>${formatCurrency(b.limit_amount)}</strong></span>
                    </div>

                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${Math.min(100, b.percentage)}%; background-color: ${b.status === 'danger' ? '#f43f5e' : (b.status === 'warning' ? '#f59e0b' : '#10b981')}"></div>
                    </div>

                    <div class="flex-between">
                        <span class="item-sub">Remaining: ${formatCurrency(b.remaining)}</span>
                        <button class="delete-btn" onclick="deleteBudgetLimit(${b.budget_id})" title="Remove budget limit">✕ Remove</button>
                    </div>
                `;
                catGrid.appendChild(card);
            });
        }

    } catch (err) {
        console.error('Failed to load budgets:', err);
    }
}

window.deleteBudgetLimit = async function(id) {
    if (!confirm('Remove this budget limit?')) return;
    try {
        const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Budget removed.', 'success');
            await loadBudgetsView();
        }
    } catch (err) {
        showToast('Error removing budget.', 'error');
    }
};

function initBudgetModalHandlers() {
    const modal = document.getElementById('budget-modal');
    const closeBtn = document.getElementById('close-budget-modal');
    const cancelBtn = document.getElementById('cancel-budget-modal');
    const form = document.getElementById('budget-form');
    const editOverallBtn = document.getElementById('btn-edit-overall-budget');
    const addCatBudgetBtn = document.getElementById('btn-add-category-budget');
    const catSelectorGroup = document.getElementById('budget-category-selector-group');
    const amountInput = document.getElementById('budget-amount-input');
    const saveBtn = document.getElementById('btn-save-budget');

    function validateBudgetForm() {
        if (!saveBtn || !amountInput) return;
        const amt = parseFloat(amountInput.value);
        saveBtn.disabled = !(amt && amt > 0);
    }

    if (amountInput) {
        amountInput.addEventListener('input', validateBudgetForm);
    }

    editOverallBtn.addEventListener('click', () => {
        document.getElementById('budget-modal-title').textContent = 'Set Overall Monthly Budget Limit';
        catSelectorGroup.classList.add('hidden');
        if (amountInput) amountInput.value = '';
        validateBudgetForm();
        modal.classList.remove('hidden');
    });

    addCatBudgetBtn.addEventListener('click', () => {
        document.getElementById('budget-modal-title').textContent = 'Set Category Budget Limit';
        catSelectorGroup.classList.remove('hidden');
        const budgetCatSelect = document.getElementById('budget-category-select');
        if (budgetCatSelect && budgetCatSelect.options.length > 0) {
            budgetCatSelect.selectedIndex = 0;
        }
        if (amountInput) amountInput.value = '';
        validateBudgetForm();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const isOverall = catSelectorGroup.classList.contains('hidden');
        const catSelect = document.getElementById('budget-category-select');
        const catVal = isOverall ? null : catSelect.value;
        const amount = parseFloat(amountInput.value);

        if (!isOverall && !catVal) {
            showToast('Please select a category.', 'error');
            return;
        }

        const payload = {
            category_id: isOverall ? null : parseInt(catVal),
            amount: amount
        };

        try {
            const res = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                modal.classList.add('hidden');
                form.reset();
                validateBudgetForm();
                showToast('Budget limit saved!', 'success');
                await loadBudgetsView();
            } else {
                showToast(data.error || 'Failed to save budget.', 'error');
            }
        } catch (err) {
            showToast('Network error while saving budget.', 'error');
        }
    });
}


// ================= WEEKLY COMPARISON =================
function getISOWeekString(dateObj) {
    const target = new Date(dateObj.valueOf());
    const dayNr = (dateObj.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${dateObj.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function initWeeklyComparison() {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const w1Input = document.getElementById('week1-input');
    const w2Input = document.getElementById('week2-input');

    w1Input.value = getISOWeekString(lastWeek);
    w2Input.value = getISOWeekString(today);

    const compareBtn = document.getElementById('btn-run-comparison');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            loadWeeklyComparison();
        });
    }
}

async function loadWeeklyComparison() {
    const week1 = document.getElementById('week1-input').value;
    const week2 = document.getElementById('week2-input').value;

    try {
        const res = await fetch(`/api/analytics/weekly-comparison?week1=${encodeURIComponent(week1)}&week2=${encodeURIComponent(week2)}`);
        const data = await res.json();

        if (res.ok) {
            // Update KPIs
            document.getElementById('kpi-w1-label').textContent = data.week1.label;
            document.getElementById('kpi-w1-total').textContent = formatCurrency(data.week1.total);

            document.getElementById('kpi-w2-label').textContent = data.week2.label;
            document.getElementById('kpi-w2-total').textContent = formatCurrency(data.week2.total);

            const diffEl = document.getElementById('kpi-net-diff');
            const badgeEl = document.getElementById('kpi-diff-badge');
            diffEl.textContent = `${data.net_difference >= 0 ? '+' : ''}${formatCurrency(data.net_difference)}`;
            
            badgeEl.textContent = `${data.percentage_difference >= 0 ? '+' : ''}${data.percentage_difference}%`;
            badgeEl.className = `kpi-badge ${data.net_difference > 0 ? 'badge-red' : (data.net_difference < 0 ? 'badge-green' : '')}`;

            // Render Grouped Bar Chart
            renderWeeklyChart(data.daily_comparison, data.week1.label, data.week2.label);

            // Render Category Comparison Table
            const tbody = document.getElementById('weekly-category-tbody');
            tbody.innerHTML = '';

            if (!data.category_comparison || data.category_comparison.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No expenditure in either week.</td></tr>';
            } else {
                data.category_comparison.forEach(item => {
                    const row = document.createElement('tr');
                    const isUp = item.delta > 0;
                    const isDown = item.delta < 0;
                    const deltaClass = isUp ? 'delta-up' : (isDown ? 'delta-down' : 'delta-neutral');
                    const sign = isUp ? '+' : '';

                    row.innerHTML = `
                        <td>
                            <div class="item-left">
                                <span class="cat-dot" style="background-color: ${item.color || '#6366f1'}"></span>
                                <strong>${item.category}</strong>
                            </div>
                        </td>
                        <td>${formatCurrency(item.week1_amount)}</td>
                        <td>${formatCurrency(item.week2_amount)}</td>
                        <td>
                            <span class="delta-pill ${deltaClass}">
                                ${sign}${formatCurrency(item.delta)} (${sign}${item.pct_change}%)
                            </span>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load weekly comparison:', err);
    }
}

function renderWeeklyChart(dailyData, week1Label, week2Label) {
    const ctx = document.getElementById('weeklyComparisonChart').getContext('2d');
    if (state.weeklyChart) {
        state.weeklyChart.destroy();
    }

    const labels = dailyData.map(d => d.day);
    const week1Amounts = dailyData.map(d => d.week1_amount);
    const week2Amounts = dailyData.map(d => d.week2_amount);

    state.weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: week1Label,
                    data: week1Amounts,
                    backgroundColor: 'rgba(99, 102, 241, 0.75)',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    borderRadius: 6
                },
                {
                    label: week2Label,
                    data: week2Amounts,
                    backgroundColor: 'rgba(168, 85, 247, 0.75)',
                    borderColor: '#a855f7',
                    borderWidth: 1.5,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#475569', font: { family: 'Inter', size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.06)' },
                    ticks: { color: '#64748b', font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.06)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Inter' },
                        callback: (val) => '₹' + val
                    }
                }
            }
        }
    });
}


// ================= CATEGORY PIE CHART =================
function initCategoryPieControls() {
    const today = new Date();
    const periodButtons = document.querySelectorAll('.pie-period-toggles .btn-period');

    const monthPicker = document.getElementById('pie-month-picker');
    monthPicker.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const weekPicker = document.getElementById('pie-week-picker');
    weekPicker.value = getISOWeekString(today);

    const datePicker = document.getElementById('pie-date-picker');
    datePicker.value = today.toISOString().split('T')[0];

    const startPicker = document.getElementById('pie-start-date');
    const endPicker = document.getElementById('pie-end-date');
    startPicker.value = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endPicker.value = today.toISOString().split('T')[0];

    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.pie.period = btn.getAttribute('data-period');

            document.getElementById('control-monthly').classList.add('hidden');
            document.getElementById('control-weekly').classList.add('hidden');
            document.getElementById('control-daily').classList.add('hidden');
            document.getElementById('control-custom').classList.add('hidden');

            const activeControl = document.getElementById(`control-${state.pie.period}`);
            if (activeControl) activeControl.classList.remove('hidden');

            loadCategoryPie();
        });
    });

    document.getElementById('btn-refresh-pie').addEventListener('click', () => {
        loadCategoryPie();
    });
}

async function loadCategoryPie() {
    const period = state.pie.period;
    let queryParams = `period=${encodeURIComponent(period)}`;

    if (period === 'monthly') {
        const month = document.getElementById('pie-month-picker').value;
        queryParams += `&month=${encodeURIComponent(month)}`;
    } else if (period === 'weekly') {
        const week = document.getElementById('pie-week-picker').value;
        queryParams += `&week=${encodeURIComponent(week)}`;
    } else if (period === 'daily') {
        const date = document.getElementById('pie-date-picker').value;
        queryParams += `&date=${encodeURIComponent(date)}`;
    } else if (period === 'custom') {
        const startDate = document.getElementById('pie-start-date').value;
        const endDate = document.getElementById('pie-end-date').value;
        queryParams += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    }

    try {
        const res = await fetch(`/api/analytics/category-pie?${queryParams}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('pie-chart-period-title').textContent = data.period_label;
            document.getElementById('pie-chart-total-spend').textContent = formatCurrency(data.total_spent);

            renderPieChart(data.categories);

            // Render list details
            const listEl = document.getElementById('pie-breakdown-list');
            listEl.innerHTML = '';

            if (!data.categories || data.categories.length === 0) {
                listEl.innerHTML = '<div class="loading-state">No expenses recorded for this timeframe.</div>';
            } else {
                data.categories.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'pie-list-row';
                    row.innerHTML = `
                        <div class="pie-row-top">
                            <div class="pie-cat-badge">
                                <span class="cat-dot" style="background-color: ${item.color || '#6366f1'}"></span>
                                <span>${item.category}</span>
                            </div>
                            <span class="item-amount">${formatCurrency(item.amount)} (${item.percentage}%)</span>
                        </div>
                        <div class="pie-pct-bar">
                            <div class="pie-pct-fill" style="width: ${item.percentage}%; background-color: ${item.color || '#6366f1'}"></div>
                        </div>
                    `;
                    listEl.appendChild(row);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load category pie data:', err);
    }
}

function renderPieChart(categories) {
    const ctx = document.getElementById('categoryPieCanvas').getContext('2d');
    if (state.pieChart) {
        state.pieChart.destroy();
    }

    if (!categories || categories.length === 0) {
        state.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
        return;
    }

    const labels = categories.map(c => c.category);
    const data = categories.map(c => c.amount);
    const bgColors = categories.map(c => c.color || '#4f46e5');

    state.pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#475569',
                        padding: 16,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}


// ================= EXPENSE CALENDAR =================
function initCalendarControls() {
    document.getElementById('cal-prev-month').addEventListener('click', () => {
        state.calendar.month -= 1;
        if (state.calendar.month < 1) {
            state.calendar.month = 12;
            state.calendar.year -= 1;
        }
        loadCalendarView();
    });

    document.getElementById('cal-next-month').addEventListener('click', () => {
        state.calendar.month += 1;
        if (state.calendar.month > 12) {
            state.calendar.month = 1;
            state.calendar.year += 1;
        }
        loadCalendarView();
    });

    document.getElementById('cal-current-month').addEventListener('click', () => {
        const now = new Date();
        state.calendar.year = now.getFullYear();
        state.calendar.month = now.getMonth() + 1;
        loadCalendarView();
    });

    // Calendar Modal Day Form
    const modalForm = document.getElementById('modal-day-expense-form');
    const modalCatSelect = document.getElementById('modal-day-category');
    const modalAmtInput = document.getElementById('modal-day-amount');
    const modalSubmitBtn = document.getElementById('modal-day-submit-btn');

    function validateModalDayForm() {
        if (!modalSubmitBtn || !modalCatSelect || !modalAmtInput) return;
        const amt = parseFloat(modalAmtInput.value);
        modalSubmitBtn.disabled = !(modalCatSelect.value && !isNaN(amt) && amt > 0);
    }

    if (modalCatSelect) modalCatSelect.addEventListener('change', validateModalDayForm);
    if (modalAmtInput) modalAmtInput.addEventListener('input', validateModalDayForm);
    validateModalDayForm();

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.selectedCalendarDate) return;

        const payload = {
            category_id: parseInt(modalCatSelect.value),
            amount: parseFloat(modalAmtInput.value),
            expense_date: state.selectedCalendarDate,
            note: document.getElementById('modal-day-note').value.trim()
        };

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                showToast('Expense recorded for date!', 'success');
                modalForm.reset();
                validateModalDayForm();
                if (data.budget_warnings && data.budget_warnings.length > 0) {
                    data.budget_warnings.forEach(w => showToast(w.message, w.level === 'danger' ? 'error' : 'warning'));
                }
                await refreshAllViews();
                await openCalendarDayModal(state.selectedCalendarDate);
            } else {
                showToast(data.error || 'Failed to add expense.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        }
    });

    document.getElementById('close-calendar-modal').addEventListener('click', () => {
        document.getElementById('calendar-day-modal').classList.add('hidden');
    });
}

async function loadCalendarView() {
    const year = state.calendar.year;
    const month = state.calendar.month;

    try {
        const res = await fetch(`/api/expenses/calendar?year=${year}&month=${month}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('calendar-month-year').textContent = `${data.month_name} ${year}`;
            renderCalendarGrid(year, month, data.days || {});
        }
    } catch (err) {
        console.error('Failed to load calendar data:', err);
    }
}

function renderCalendarGrid(year, month, daysData) {
    const grid = document.getElementById('calendar-days-grid');
    grid.innerHTML = '';

    // First day of month and total days
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon, ...
    const daysInMonth = new Date(year, month, 0).getDate();

    // Convert Sunday-indexed to Monday-indexed: Mon=0, Tue=1 ... Sun=6
    const startOffset = (firstDayIndex + 6) % 7;

    // Previous month filler cells
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.innerHTML = `<span class="cell-day-number">${daysInPrevMonth - i}</span>`;
        grid.appendChild(cell);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;

    // Current month cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayInfo = daysData[day] || { total_amount: 0, count: 0, heat_level: 0, items: [] };

        const isToday = isCurrentMonth && today.getDate() === day;
        const heatClass = `heat-${dayInfo.heat_level || 0}`;

        const cell = document.createElement('div');
        cell.className = `calendar-cell ${isToday ? 'today' : ''} ${heatClass}`;
        cell.innerHTML = `
            <span class="cell-day-number">${day}</span>
            <div class="cell-spend-info">
                ${dayInfo.total_amount > 0 ? `
                    <span class="cell-amount-tag">${formatCurrency(dayInfo.total_amount)}</span>
                    <span class="cell-count-tag">${dayInfo.count} item${dayInfo.count > 1 ? 's' : ''}</span>
                ` : ''}
            </div>
        `;

        cell.addEventListener('click', () => {
            openCalendarDayModal(dayStr, dayInfo);
        });

        grid.appendChild(cell);
    }

    // Trailing cells for visual alignment to complete row of 7
    const totalRendered = startOffset + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.innerHTML = `<span class="cell-day-number">${i}</span>`;
        grid.appendChild(cell);
    }
}

async function openCalendarDayModal(dateStr, cachedInfo = null) {
    state.selectedCalendarDate = dateStr;
    const modal = document.getElementById('calendar-day-modal');
    modal.classList.remove('hidden');

    const dayForm = document.getElementById('modal-day-expense-form');
    if (dayForm) dayForm.reset();
    const dayBtn = document.getElementById('modal-day-submit-btn');
    if (dayBtn) dayBtn.disabled = true;

    const dt = new Date(dateStr + 'T00:00:00');
    const formattedDate = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('modal-day-title').textContent = `Expenses on ${formattedDate}`;

    const itemsList = document.getElementById('modal-day-items-list');
    itemsList.innerHTML = '<div class="loading-state">Loading transactions...</div>';

    try {
        // Query expenses for this specific date
        const parts = dateStr.split('-');
        const res = await fetch(`/api/expenses/calendar?year=${parts[0]}&month=${parseInt(parts[1])}`);
        const calData = await res.json();
        const dayNum = parseInt(parts[2]);
        const dayData = (calData.days && calData.days[dayNum]) ? calData.days[dayNum] : { total_amount: 0, items: [] };

        document.getElementById('modal-day-total').textContent = `Total: ${formatCurrency(dayData.total_amount)}`;
        itemsList.innerHTML = '';

        if (!dayData.items || dayData.items.length === 0) {
            itemsList.innerHTML = '<div class="loading-state">No transactions on this day.</div>';
        } else {
            dayData.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'list-item';
                row.innerHTML = `
                    <div class="item-left">
                        <span class="cat-dot" style="background-color: ${item.color || '#6366f1'}"></span>
                        <div class="item-details">
                            <span class="item-name">${item.category_name}</span>
                            <span class="item-sub">${item.note || 'No note'}</span>
                        </div>
                    </div>
                    <div class="item-right">
                        <span class="item-amount">${formatCurrency(item.amount)}</span>
                        <button class="delete-btn" onclick="deleteExpenseItem(${item.expense_id})" title="Delete">✕</button>
                    </div>
                `;
                itemsList.appendChild(row);
            });
        }
    } catch (err) {
        itemsList.innerHTML = '<div class="loading-state">Failed to load transactions.</div>';
    }
}


function initCategoryModalHandlers() {
    const modal = document.getElementById('category-modal');
    const openBtn = document.getElementById('btn-open-add-cat-modal');
    const closeBtn = document.getElementById('close-category-modal');
    const cancelBtn = document.getElementById('cancel-category-modal');
    const form = document.getElementById('add-category-form');
    const nameInput = document.getElementById('new-cat-name');
    const saveBtn = document.getElementById('btn-save-category');

    function validateCategoryForm() {
        if (!saveBtn || !nameInput) return;
        saveBtn.disabled = !(nameInput.value.trim().length > 0);
    }

    if (nameInput) {
        nameInput.addEventListener('input', validateCategoryForm);
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (nameInput) nameInput.value = '';
            validateCategoryForm();
            modal.classList.remove('hidden');
        });
    }

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category_name = nameInput.value.trim();
        if (!category_name) return;

        // Auto-assign clean vibrant color based on category index
        const PALETTE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'];
        const autoColor = PALETTE[(state.categories || []).length % PALETTE.length];

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_name, color: autoColor, icon: 'tag' })
            });
            const data = await res.json();

            if (res.ok) {
                modal.classList.add('hidden');
                form.reset();
                validateCategoryForm();
                showToast(`Category '${category_name}' created!`, 'success');
                await loadCategories();
                await loadCategoriesManager();
            } else {
                showToast(data.error || 'Failed to create category.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        }
    });
}

async function loadCategoriesManager() {
    const grid = document.getElementById('categories-manager-grid');
    grid.innerHTML = '<div class="loading-state">Loading categories...</div>';

    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        grid.innerHTML = '';

        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'cat-manager-card';
            card.innerHTML = `
                <div class="cat-info-wrap">
                    <span class="cat-color-badge" style="background-color: ${cat.color || '#6366f1'}"></span>
                    <div>
                        <strong>${cat.category_name}</strong>
                        <div class="item-sub">${cat.is_custom ? 'Custom Category' : 'System Default'}</div>
                    </div>
                </div>
                ${cat.is_custom ? `
                    <button class="delete-btn" onclick="deleteCategoryItem(${cat.category_id})" title="Delete category">✕</button>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = '<div class="loading-state">Failed to load categories.</div>';
    }
}

window.deleteCategoryItem = async function(id) {
    if (!confirm('Are you sure you want to delete this custom category?')) return;
    try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            await loadCategories();
            await loadCategoriesManager();
        } else {
            showToast(data.error || 'Failed to delete category.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
};


// ================= REFRESH ORCHESTRATOR =================
async function refreshAllViews() {
    await loadCategories();
    await loadDashboard();
    await loadRecentExpenses();
    await loadBudgetsView();

    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        if (tabId === 'weekly-tab') loadWeeklyComparison();
        else if (tabId === 'pie-tab') loadCategoryPie();
        else if (tabId === 'calendar-tab') loadCalendarView();
        else if (tabId === 'categories-tab') loadCategoriesManager();
    }
}


// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    initAuthHandlers();
    initTabNavigation();
    initExpenseForm();
    initBudgetModalHandlers();
    initWeeklyComparison();
    initCategoryPieControls();
    initCalendarControls();
    initCategoryModalHandlers();

    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await refreshAllViews();
    }
});
