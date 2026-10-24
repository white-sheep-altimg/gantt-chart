/**
 * ペイオフチャートを描画する関数
 * @param {Object} gantt_data - 描画元のデータオブジェクト（gantt_data.dataを使用）
 * @param {string} [canvasId="payoffChart"] - 描画先canvas要素のID
 * @returns {Chart} 生成されたChart.jsのインスタンス
 */
let xKey = "impact";
let yKey = "feasibility";
let tasks;
function renderPayoffChart(gantt_data, canvasId = "payoffChart") {
  // payoffチャートのデータ作成
  let data = gantt_data.data;
  tasks = [];
  data.map(row => {
    if (row.impact != undefined && row.impact != "" && row.impact > 0) {
      tasks.push({
        impact: row.impact,
        feasibility: row.feasibility,
        priority: row.priority,
        label: row.text
      });
    }
  });

  // 中央の線を描画するプラグイン
  const quadrantPlugin = {
    id: "quadrantLines",
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const x = scales.x.getPixelForValue(5);
      const y = scales.y.getPixelForValue(5);

      ctx.save();
      ctx.strokeStyle = "#9CA3AF";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.restore();
    }
  };

  // チャートを生成
  const myChart = new Chart(document.getElementById(canvasId), {
    type: "scatter",
    plugins: [quadrantPlugin],
    data: {
      datasets: [{
        label: "対策案",
        data: tasks.map(t => ({
          x: t[xKey],
          y: t[yKey],
          task: t
        })),
        pointRadius: 8,
        pointHoverRadius: 12,
        backgroundColor: "#3478C9"
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 10,
          title: {
            display: true,
            text: "Impact（重要度・影響度）"
          }
        },
        y: {
          min: 0,
          max: 10,
          title: {
            display: true,
            text: "Feasibility（実現可能性）"
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const t = context.raw.task;
              return `${t.label}: Impact=${t.impact}, ` +
                `Feasibility=${t.feasibility}, ` +
                `Priority=${t.priority}`;
            }
          }
        },
        legend: {
          display: false
        }
      }
    }
  });
  document.getElementById("xAxisSelect")
    .addEventListener("change", event => {
      xKey = event.target.value;

      myChart.data.datasets[0].data = tasks.map(t => ({
        x: t[xKey],
        y: t[yKey],
        task: t
      }));

      myChart.options.scales.x.title.text =
        xKey === "impact"
        ? "Impact（重要度・影響度）"
        : "Priority（優先度）";

      myChart.update();
    }
  );
  document.getElementById("yAxisSelect")
    .addEventListener("change", event => {
      yKey = event.target.value;

      myChart.data.datasets[0].data = tasks.map(t => ({
        x: t[xKey],
        y: t[yKey],
        task: t
      }));

      myChart.options.scales.y.title.text =
        yKey === "feasibility"
        ? "Feasibility（実現可能性）"
        : "Priority（優先度）";

      myChart.update();
    }
  );
  return myChart;
}

/**
 * 既存のペイオフチャートのデータを更新して再描画する関数
 * @param {Chart} chartInstance - 更新するChart.jsのインスタンス
 * @param {Object} new_gantt_data - 新しいデータオブジェクト
 */
function updatePayoffChart(chartInstance, new_gantt_data) {
  // 新しいデータ構造を作成
  let data = new_gantt_data.data;
  tasks = [];
  data.map(row => {
    if (row.impact != undefined && row.impact != "" && row.impact > 0) {
      tasks.push({
        impact: row.impact,
        feasibility: row.feasibility,
        priority: row.priority,
        label: row.text
      });
    }
  });

  // チャートのデータセットを更新
  chartInstance.data.datasets[0].data = tasks.map(t => ({
    x: t[xKey],
    y: t[yKey],
    task: t
  }));

  // グラフを再描画（アニメーション付きで更新）
  chartInstance.update();
}
