(function(){
  const balanceEl=document.getElementById('balance');
  const incomeEl=document.getElementById('total-income');
  const expenseEl=document.getElementById('total-expense');
  const form=document.getElementById('transaction-form');
  const list=document.getElementById('transactions-list');
  let ctx=document.getElementById('chart').getContext('2d');
  const searchInput=document.getElementById('search');
  const exportBtn=document.getElementById('export-btn');
  const darkToggle=document.getElementById('dark-mode-toggle');
  const filterType=document.getElementById('filter-type');
  const filterCategory=document.getElementById('filter-category');
  const filterDateFrom=document.getElementById('filter-date-from');
  const filterDateTo=document.getElementById('filter-date-to');
  const reportPeriod=document.getElementById('report-period');
  const recentActivityList=document.getElementById('recent-activity-list');
  const budgetList=document.getElementById('budget-list');
  const avgDailyEl=document.getElementById('avg-daily');
  const largestExpenseEl=document.getElementById('largest-expense');
  const savingsRateEl=document.getElementById('savings-rate');

  let chart;

  // Load data from localStorage
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  let budgets = JSON.parse(localStorage.getItem('budgets')) || [
    { category: 'Food', limit: 500, spent: 0 },
    { category: 'Entertainment', limit: 200, spent: 0 },
    { category: 'Transportation', limit: 300, spent: 0 }
  ];

  // Save data to localStorage
  function saveToLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }

  function formatMoney(amount) {
    if (amount > 100) {
      return `Tsh. ${(amount / 1000).toFixed(2)}K`;
    }
    return `Tsh. ${amount.toFixed(2)}`;
  }

  // Set dark mode as default, allow light mode toggle
  let isLightMode = false;
  if (isLightMode) {
    document.body.classList.add('light-mode');
    darkToggle.textContent = '🌙';
  }

  darkToggle.onclick=()=>{
    document.body.classList.toggle('light-mode');
    isLightMode = document.body.classList.contains('light-mode');
    darkToggle.textContent = isLightMode ? '🌙' : '☀️';
  }

  // Set today's date as default
  document.getElementById('date').valueAsDate = new Date();

  // Toast notification system
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Quick actions functionality
  document.querySelectorAll('.quick-action[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch(action) {
        case 'add-income':
          switchTab('add');
          document.getElementById('type').value = 'income';
          break;
        case 'add-expense':
          switchTab('add');
          document.getElementById('type').value = 'expense';
          break;
        case 'view-reports':
          switchTab('reports');
          break;
        case 'set-budget':
          showToast('Budget feature coming soon!', 'success');
          break;
      }
    });
  });

  // Quick add functionality
  const quickAddPresets = {
    coffee: { description: 'Coffee', amount: 5.00, type: 'expense', category: 'Food' },
    lunch: { description: 'Lunch', amount: 15.00, type: 'expense', category: 'Food' },
    gas: { description: 'Gas', amount: 50.00, type: 'expense', category: 'Transportation' },
    groceries: { description: 'Groceries', amount: 100.00, type: 'expense', category: 'Food' }
  };

  document.querySelectorAll('.quick-action[data-quick-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = quickAddPresets[btn.dataset.quickAdd];
      if (preset) {
        const transaction = {
          ...preset,
          date: new Date().toISOString().split('T')[0]
        };
        transactions.push(transaction);
        saveToLocalStorage();
        render();
        renderHome();
        showToast(`${preset.description} added successfully!`);
      }
    });
  });

  function calculateBudgetProgress() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    budgets.forEach(budget => {
      budget.spent = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.type === 'expense' && 
                 t.category === budget.category &&
                 tDate.getMonth() === currentMonth &&
                 tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
    });
  }

  function renderBudgets() {
    calculateBudgetProgress();
    budgetList.innerHTML = '';

    budgets.forEach(budget => {
      const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
      const isOverBudget = budget.spent > budget.limit;

      const budgetEl = document.createElement('div');
      budgetEl.className = 'budget-goal';
      budgetEl.innerHTML = `
        <h4>${budget.category}</h4>
        <div class="budget-progress">
          <div class="budget-progress-fill ${isOverBudget ? 'over-budget' : ''}" 
               style="width: ${percentage}%"></div>
        </div>
        <div class="budget-info">
          <span>${formatMoney(budget.spent)} spent</span>
          <span>${formatMoney(budget.limit)} budget</span>
        </div>
      `;
      budgetList.appendChild(budgetEl);
    });
  }

  function renderRecentActivity() {
    recentActivityList.innerHTML = '';
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (recentTransactions.length === 0) {
      recentActivityList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <p>No recent activity</p>
          <p style="font-size: 0.75rem;">Add your first transaction to get started</p>
        </div>
      `;
      return;
    }

    recentTransactions.forEach(transaction => {
      const activityEl = document.createElement('div');
      activityEl.className = `activity-item ${transaction.type}`;

      const icon = transaction.type === 'income' ? '💰' : getCategoryIcon(transaction.category);
      const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      activityEl.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-info">
          <h5>${transaction.description}</h5>
          <p>${formattedDate} • ${transaction.category}</p>
        </div>
        <div class="activity-amount">
          ${transaction.type === 'expense' ? '-' : '+'}${formatMoney(transaction.amount)}
        </div>
      `;

      recentActivityList.appendChild(activityEl);
    });
  }

  function getCategoryIcon(category) {
    const icons = {
      'Salary': '💼',
      'Food': '🍔',
      'Rent': '🏠',
      'Shopping': '🛍️',
      'Transportation': '🚗',
      'Healthcare': '🏥',
      'Entertainment': '🎬',
      'Other': '📝'
    };
    return icons[category] || '📝';
  }

  function renderHome() {
    renderRecentActivity();
    renderBudgets();
    calculateAdvancedStats();
  }

  function calculateAdvancedStats() {
    const period = parseInt(reportPeriod.value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);

    const filteredTransactions = transactions.filter(t => new Date(t.date) >= cutoffDate);
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const income = filteredTransactions.filter(t => t.type === 'income');

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgDaily = totalExpenses / period;
    avgDailyEl.textContent = `${formatMoney(avgDaily)}`;

    const largest = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;
    largestExpenseEl.textContent = `${formatMoney(largest)}`;

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    savingsRateEl.textContent = `${Math.max(0, savingsRate).toFixed(1)}%`;

    // **Update stats bars**
    updateStatsBars(totalIncome, totalExpenses);
  }

  // **Stats bars updater**
  function updateStatsBars(income, expense) {
    const total = income + expense;
    const incomePercent = total ? (income / total) * 100 : 0;
    const expensePercent = total ? (expense / total) * 100 : 0;

    document.getElementById('total-income').textContent = formatMoney(income);
    document.getElementById('total-expense').textContent = formatMoney(expense);

    const incomeBar = document.querySelector('.stat-income .bar');
    const expenseBar = document.querySelector('.stat-expense .bar');
    if (incomeBar) incomeBar.style.width = `${incomePercent}%`;
    if (expenseBar) expenseBar.style.width = `${expensePercent}%`;
  }

  function render(filter = '') {
    list.innerHTML = '';
    let balance = 0, income = 0, expense = 0;

    let filteredTransactions = transactions;

    if (filter) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (filterType.value) {
      filteredTransactions = filteredTransactions.filter(t => t.type === filterType.value);
    }

    if (filterCategory.value) {
      filteredTransactions = filteredTransactions.filter(t => t.category === filterCategory.value);
    }

    if (filterDateFrom.value) {
      filteredTransactions = filteredTransactions.filter(t => t.date >= filterDateFrom.value);
    }

    if (filterDateTo.value) {
      filteredTransactions = filteredTransactions.filter(t => t.date <= filterDateTo.value);
    }

    const sortedTransactions = filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedTransactions.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <p>No transactions found</p>
          <p style="font-size: 0.75rem;">Try adjusting your filters</p>
        </div>
      `;
    }

    sortedTransactions.forEach((t) => {
      const div = document.createElement('div');
      div.className = 'transaction-item ' + t.type;
      const formattedDate = new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const icon = getCategoryIcon(t.category);

      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.5rem;">${icon}</div>
          <div>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${t.description}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${formattedDate} • ${t.category}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-weight: 700; font-size: 1rem; color: ${t.type === 'expense' ? 'var(--danger-red)' : 'var(--success-green)'}">
            ${t.type === 'expense' ? '-' : '+'}${formatMoney(t.amount)}
          </span>
          <div>
            <button class="edit-btn" title="Edit">✏️</button>
            <button class="delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
      `;
      list.appendChild(div);

      div.querySelector('.delete-btn').onclick = () => {
        if (confirm('Delete this transaction?')) {
          const originalIndex = transactions.findIndex(orig => 
            orig.description === t.description && 
            orig.amount === t.amount && 
            orig.date === t.date &&
            orig.type === t.type
          );
          transactions.splice(originalIndex, 1);
          saveToLocalStorage();
          render(searchInput.value);
          renderHome();
          showToast('Transaction deleted successfully!');
        }
      };

      div.querySelector('.edit-btn').onclick = () => {
        document.getElementById('description').value = t.description;
        document.getElementById('amount').value = t.amount;
        document.getElementById('type').value = t.type;
        document.getElementById('category').value = t.category;
        document.getElementById('date').value = t.date;

        const originalIndex = transactions.findIndex(orig => 
          orig.description === t.description && 
          orig.amount === t.amount && 
          orig.date === t.date &&
          orig.type === t.type
        );
        transactions.splice(originalIndex, 1);
        saveToLocalStorage();
        switchTab('add');
        showToast('Transaction loaded for editing');
      };
    });

    transactions.forEach(t => {
      if (t.type === 'income') {
        balance += t.amount;
        income += t.amount;
      } else {
        balance -= t.amount;
        expense += t.amount;
      }
    });

    balanceEl.textContent = formatMoney(balance);
    incomeEl.textContent = formatMoney(income);
    expenseEl.textContent = formatMoney(expense);

    updateStatsBars(income, expense);
  }

  function switchTab(tabName) {
    document.querySelectorAll('section').forEach(section => {
      section.classList.remove('active-tab');
    });
    document.querySelectorAll('nav button').forEach(btn => {
      btn.classList.remove('active');
    });

    document.getElementById(tabName).classList.add('active-tab');
    document.querySelector(`nav button[data-tab="${tabName}"]`).classList.add('active');

    if (tabName === 'reports') {
      setTimeout(renderChart, 100);
    }
    if (tabName === 'home') {
      renderHome();
    }
  }

  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!description || !amount || !type || !category || !date) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    transactions.push({ description, amount, type, category, date });
    saveToLocalStorage();
    form.reset();
    document.getElementById('date').valueAsDate = new Date();
    render();
    renderHome();
    showToast('Transaction added successfully!');
  };

  searchInput.oninput = (e) => render(e.target.value);
  filterType.onchange = () => render(searchInput.value);
  filterCategory.onchange = () => render(searchInput.value);
  filterDateFrom.onchange = () => render(searchInput.value);
  filterDateTo.onchange = () => render(searchInput.value);
  reportPeriod.onchange = () => {
    renderChart();
    calculateAdvancedStats();
  };

  exportBtn.onclick = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }

    const csv = [
      ['Date', 'Description', 'Type', 'Category', 'Amount'],
      ...transactions.map(t => [t.date, t.description, t.type, t.category, t.amount])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!');
  };

  function renderChart() {
    const period = parseInt(reportPeriod.value);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);

    const filteredTransactions = transactions.filter(t => new Date(t.date) >= cutoffDate);

    const categoryData = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    const colors = [
      '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', 
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  // Initialize the app
  render();
  renderHome();
  renderChart();
})();
