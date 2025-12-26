let bestSellingChartInstance = null;

window.renderBestSellingChart = function() {
  const canvas = document.getElementById('bestSellingChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const data = DB.getBestSelling();

  // Destroy previous instance
  if (bestSellingChartInstance) {
    bestSellingChartInstance.destroy();
  }

  if (data.length === 0) {
    canvas.parentElement.innerHTML = '<p style="color:#94a3b8;text-align:center;">No sales data yet</p>';
    return;
  }

  bestSellingChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d[0].length > 15 ? d[0].substring(0,12)+'...' : d[0]),
      datasets: [{
        label: 'Units Sold',
        data: data.map(d => d[1]),
        backgroundColor: '#818cf8',
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#e2e8f0' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8', precision: 0 },
          grid: { color: '#334155' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' }
        }
      }
    }
  });
};