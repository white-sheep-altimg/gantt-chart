'use strict';

const EXCLUDED_KEYS = new Set(['start_date', 'end_date']);
let rows = [];
let chart;

const $ = (id) => document.getElementById(id);

function dateFrom(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function nthWeekday(year, month, weekday, nth) {
  const first = new Date(year, month - 1, 1);
  return new Date(year, month - 1, 1 + ((weekday - first.getDay() + 7) % 7) + (nth - 1) * 7);
}

function vernalEquinox(year) {
  return new Date(year, 2, Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
}

function autumnalEquinox(year) {
  return new Date(year, 8, Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
}

function japaneseHolidays(year) {
  const fixed = [
    [1, 1], [2, 11], [2, 23], [4, 29], [5, 3], [5, 4], [5, 5],
    [8, 11], [11, 3], [11, 23]
  ];
  const dates = fixed.map(([month, day]) => dateKey(new Date(year, month - 1, day)));
  dates.push(
    dateKey(nthWeekday(year, 1, 1, 2)), // 成人の日
    dateKey(nthWeekday(year, 6, 1, 3)), // 海の日
    dateKey(nthWeekday(year, 9, 1, 3)) // 敬老の日
  );
  dates.push(dateKey(vernalEquinox(year)), dateKey(autumnalEquinox(year)));
  return new Set(dates);
}

function holidaySet(extraDates) {
  const dates = new Set(extraDates);
  const years = new Set(rows.flatMap((row) => {
    const start = dateFrom(row.start_date);
    const end = dateFrom(row.end_date);
    return start && end ? [start.getFullYear(), end.getFullYear()] : [];
  }));
  years.forEach((year) => japaneseHolidays(year).forEach((date) => dates.add(date)));
  return dates;
}

function isBusinessDay(date, holidays) {
  return date.getDay() !== 0 && date.getDay() !== 6 && !holidays.has(dateKey(date));
}

function mondayOfWeek(date) {
  return addDays(date, date.getDay() === 0 ? -6 : 1 - date.getDay());
}

function bucketFor(date, period) {
  if (period === 'day') return dateKey(date);
  if (period === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monday = mondayOfWeek(date);
  const thursday = addDays(monday, 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round((thursday - firstThursday) / 86400000 / 7);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function displayBucket(bucket, period) {
  if (period === 'day') return bucket;
  if (period === 'month') return bucket.replace('-', '年') + '月';
  return bucket.replace('-W', '年 第') + '週';
}

function valueOf(row, key) {
  const value = row[key];
  if (value === undefined || value === null || value === '') return '未設定';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function collectGroupKeys() {
  return [...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !EXCLUDED_KEYS.has(key))))].sort();
}

function parseExtraHolidays() {
  return $('holidays').value.split(',').map((value) => value.trim()).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function aggregate(period, groupBy) {
  const holidays = holidaySet(parseExtraHolidays());
  const totals = new Map();
  const buckets = new Set();
  rows.forEach((row) => {
    const start = dateFrom(row.start_date);
    const end = dateFrom(row.end_date);
    if (!start || !end || start > end) return;
    const group = valueOf(row, groupBy);
    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (!isBusinessDay(date, holidays)) continue;
      const bucket = bucketFor(date, period);
      buckets.add(bucket);
      if (!totals.has(group)) totals.set(group, new Map());
      const groupTotals = totals.get(group);
      groupTotals.set(bucket, (groupTotals.get(bucket) || 0) + 1);
    }
  });
  const labels = [...buckets].sort();
  return { labels, totals, holidays };
}

function color(index) {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue} 62% 52%)`;
}

function draw() {
  const period = $('period').value;
  const groupBy = $('groupBy').value;
  const result = aggregate(period, groupBy);
  const groups = [...result.totals.keys()].sort();
  const width = Math.max(720, result.labels.length * 100);
  $('chartSize').style.width = `${width}px`;
  if (chart) chart.destroy();
  chart = new Chart($('summaryChart'), {
    type: 'bar',
    data: {
      labels: result.labels.map((label) => displayBucket(label, period)),
      datasets: groups.map((group, index) => ({
        label: group,
        data: result.labels.map((label) => result.totals.get(group).get(label) || 0),
        backgroundColor: color(index),
        borderWidth: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw}日` } } },
      scales: { x: { stacked: true, title: { display: true, text: period === 'day' ? '日' : period === 'week' ? '週' : '月' } }, y: { stacked: true, beginAtZero: true, title: { display: true, text: '集計した日数' }, ticks: { precision: 0 } } }
    }
  });
  $('status').textContent = `対象 ${rows.length}件 / 積み上げ ${groups.length}項目 / 除外した休日 ${result.holidays.size}日`;
}

var json = null;
async function charts_load(data, filename) {
  try {
    if (data != null) {
      json = JSON.parse(data);
    }
    else {
      const response = await fetch(filename);
      if (!response.ok) throw new Error(`データファイルを読み込めません（${response.status}）`);
      json = await response.json();
    }
  } catch (error) {
    $('status').textContent = error.message;
  }
  return json;
}

async function charts_init(json) {
  try {
    rows = Array.isArray(json.data) ? json.data : [];
    const keys = collectGroupKeys();
    if (!keys.length) throw new Error('集計対象となる項目がありません');
    keys.forEach((key) => $('groupBy').add(new Option(key, key)));
    $('groupBy').value = keys.includes('process') ? 'process' : keys[0];
    $('redraw').addEventListener('click', draw);
    $('period').addEventListener('change', draw);
    $('groupBy').addEventListener('change', draw);
    draw();
    return json;
  } catch (error) {
    $('status').textContent = error.message;
  }
}
