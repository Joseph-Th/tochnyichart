'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { validateSpec } = require('../renderer/validate');

const examplesDir = path.join(__dirname, '..', 'specs', 'examples');
const kitSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-svg-charts.js'), 'utf8');

// Minimal SVG DOM: enough structure to run the kit and read back the geometry it drew.
function createNode(tag) {
  return {
    tag,
    attributes: {},
    children: [],
    textContent: '',
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    appendChild(child) { this.children.push(child); return child; },
    removeAttribute(name) { delete this.attributes[name]; },
    classList: { add() {} }
  };
}

function loadKit() {
  const sandbox = {
    window: {},
    document: {
      createElementNS: (namespace, tag) => createNode(tag),
      // Deterministic stand-in for canvas text metrics.
      createElement: () => ({
        getContext: () => ({
          font: '',
          measureText(text) {
            const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]);
            return { width: String(text).length * size * 0.55 };
          }
        })
      })
    },
    Intl
  };
  vm.runInNewContext(kitSource, sandbox);
  return sandbox.window.TochnyiSvgCharts;
}

function formatNumber(value, decimals) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function draw(spec, size = { width: 1440, height: 560 }) {
  const result = validateSpec(spec);
  assert.equal(result.valid, true, result.errors.join('; '));
  const normalized = result.normalized;
  const stage = Object.assign(createNode('div'), { clientWidth: size.width, clientHeight: size.height });
  const outcome = loadKit().render(normalized, stage, {
    layoutFinal: true,
    plan: {},
    preparedData: (chart) => chart.data.map((item) => Object.assign({}, item, {
      display: item.displayValue || (typeof item.value === 'number' ? formatNumber(item.value, chart.measure.decimals || 0) : '')
    })),
    formatNumber,
    formatMeasureValue: (value, measure) => formatNumber(value, measure.decimals || 0),
    referenceValueText: (value) => formatNumber(value, 0)
  });
  const nodes = [];
  (function walk(node) { nodes.push(node); node.children.forEach(walk); }(stage.children[0]));
  return { svg: stage.children[0], nodes, outcome, size, spec: normalized, facts: stage.attributes };
}

function example(name) {
  return JSON.parse(fs.readFileSync(path.join(examplesDir, name), 'utf8'));
}

function marks(drawing, role) {
  return drawing.nodes.filter((node) => node.attributes['data-tochnyi-mark'] === role);
}

function texts(drawing, role) {
  return drawing.nodes.filter((node) => node.tag === 'text' && (!role || node.attributes['data-label-role'] === role));
}

function number(node, name) {
  return Number(node.attributes[name]);
}

test('the kit owns every standard quantitative recipe it replaced', () => {
  const kit = loadKit();
  [
    'comparison.change', 'comparison.scenarios', 'composition.components', 'flow.waterfall',
    'ranking.horizontal', 'comparison.diverging', 'trend.line', 'trend.stacked',
    'composition.donut', 'relationship.scatter', 'comparison.area-squares'
  ].forEach((recipe) => assert.equal(kit.supports(recipe), true, recipe));
  assert.equal(kit.supports('map.regional'), false);
  assert.equal(kit.supports('comparison.grouped'), false);
});

test('drawings are laid out from the measured stage and stay inside it', () => {
  fs.readdirSync(examplesDir).filter((name) => name.endsWith('.json')).forEach((name) => {
    const spec = example(name);
    if (!loadKit().supports(spec.recipe)) return;
    [{ width: 1440, height: 560 }, { width: 1000, height: 880 }, { width: 340, height: 520 }].forEach((size) => {
      const drawing = draw(spec, size);
      assert.equal(drawing.svg.attributes.viewBox, `0 0 ${size.width} ${size.height}`, name);
      assert.equal(drawing.svg.attributes['data-label-layout'], 'complete');
      texts(drawing).forEach((node) => {
        assert.ok(Number.isFinite(number(node, 'x')) && Number.isFinite(number(node, 'y')), `${name}: ${node.textContent}`);
        assert.ok(number(node, 'y') > 0 && number(node, 'y') <= size.height, `${name}: "${node.textContent}" baseline leaves the stage`);
      });
    });
  });
});

test('ranking bars start at one zero line with lengths proportional to value', () => {
  const drawing = draw(example('regional-ranking.json'));
  const bars = marks(drawing, 'bar');
  const values = drawing.spec.data.map((item) => item.value).sort((a, b) => b - a);
  assert.equal(bars.length, values.length);
  const origin = number(bars[0], 'x');
  bars.forEach((bar, index) => {
    assert.equal(number(bar, 'x'), origin);
    assert.ok(Math.abs(number(bar, 'width') / number(bars[0], 'width') - values[index] / values[0]) < 0.002);
  });
  // Sorted descending: the largest value is drawn first, at the top.
  assert.ok(number(bars[0], 'y') < number(bars[bars.length - 1], 'y'));
  assert.equal(texts(drawing, 'bar-value').length, values.length);
});

test('dense rankings report the stage height they need instead of crushing rows', () => {
  const spec = example('regional-ranking.json');
  const template = spec.data[0];
  spec.data = Array.from({ length: 60 }, (unused, index) => Object.assign({}, template, {
    label: `Region ${index + 1}`, value: 100 - index, displayValue: String(100 - index)
  }));
  const drawing = draw(spec, { width: 1440, height: 520 });
  assert.ok(drawing.outcome.requiredHeight >= 60 * 22, 'sixty rows need at least 22px each');
  assert.equal(draw(example('regional-ranking.json')).outcome.requiredHeight, 0);
});

test('diverging bars extend from a shared zero line in the direction of their sign', () => {
  const drawing = draw(example('profit-change-contributions.json'));
  const bars = marks(drawing, 'bar');
  const zero = bars.map((bar, index) => drawing.spec.data[index].value >= 0
    ? number(bar, 'x')
    : number(bar, 'x') + number(bar, 'width'));
  zero.forEach((position) => assert.ok(Math.abs(position - zero[0]) < 0.02));
  const magnitudes = drawing.spec.data.map((item) => Math.abs(item.value));
  bars.forEach((bar, index) => {
    assert.ok(Math.abs(number(bar, 'width') / number(bars[0], 'width') - magnitudes[index] / magnitudes[0]) < 0.002);
  });
});

test('area squares keep drawn area proportional to value without capping the largest', () => {
  const drawing = draw(example('facility-area-squares.json'));
  const squares = marks(drawing, 'area');
  const values = drawing.spec.data.map((item) => item.value).sort((a, b) => b - a);
  squares.forEach((square, index) => {
    assert.equal(number(square, 'width'), number(square, 'height'));
    const areaRatio = (number(square, 'width') ** 2) / (number(squares[0], 'width') ** 2);
    assert.ok(Math.abs(areaRatio - values[index] / values[0]) < 0.005, `square ${index} area ratio ${areaRatio}`);
  });
  const baseline = number(squares[0], 'y') + number(squares[0], 'height');
  squares.forEach((square) => assert.ok(Math.abs(number(square, 'y') + number(square, 'height') - baseline) < 0.02));
});

test('stacked trend segments are contiguous and sum to the labelled period total', () => {
  const drawing = draw(example('monthly-category-stack.json'));
  const segments = marks(drawing, 'column');
  const periods = drawing.spec.data;
  assert.equal(segments.length, periods.reduce((count, period) => count + period.segments.length, 0));
  // Heights follow one shared scale; each segment gives up 1px to the seam above it.
  const unit = (number(segments[0], 'height') + 1) / periods[0].segments[0].value;
  let cursor = 0;
  periods.forEach((period) => {
    const stack = segments.slice(cursor, cursor + period.segments.length);
    cursor += period.segments.length;
    stack.forEach((segment, index) => {
      assert.ok(Math.abs((number(segment, 'height') + 1) / unit - period.segments[index].value) < 0.05);
      if (index) {
        const below = stack[index - 1];
        assert.ok(Math.abs(number(segment, 'y') + number(segment, 'height') + 1 - number(below, 'y')) < 0.05,
          'segments stack upward without gaps in authored order');
      }
    });
  });
  const categories = periods[0].segments.map((segment) => segment.label);
  categories.forEach((name) => assert.ok(texts(drawing, 'legend-label').some((node) => node.textContent === name), name));
});

test('single-series trends label points directly and mark toned points', () => {
  const drawing = draw(example('trend-point-label-collision.json'));
  const points = marks(drawing, 'point');
  assert.equal(points.length, drawing.spec.data.length);
  const labels = texts(drawing, 'point-value');
  assert.equal(labels.length, drawing.spec.data.length, 'eight points fit without suppression at publication width');
  // No two value labels share space.
  const boxes = labels.map((node) => {
    const size = number(node, 'font-size');
    const width = node.textContent.length * size * 0.55;
    return { left: number(node, 'x') - width / 2, right: number(node, 'x') + width / 2, top: number(node, 'y') - size, bottom: number(node, 'y') };
  });
  boxes.forEach((box, index) => boxes.slice(index + 1).forEach((other) => {
    const overlaps = box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
    assert.equal(overlaps, false);
  }));
  // Higher values sit higher on the stage.
  const byValue = drawing.spec.data.map((item, index) => ({ value: item.value, y: number(points[index], 'cy') }));
  const top = byValue.reduce((best, entry) => entry.value > best.value ? entry : best);
  byValue.forEach((entry) => assert.ok(entry.y >= top.y));
});

test('grouped trends label each series at its line end and honor point suppression', () => {
  const spec = example('bankruptcies-trend.json');
  const labels = ['Jan', 'Feb', 'Mar', 'Apr'];
  spec.data = labels.flatMap((label, index) => ['Series A', 'Series B'].map((group, seriesIndex) => ({
    label, group, value: (index + 1) * (seriesIndex + 1),
    quantity: 'cumulative documented record count', scope: 'shared comparison universe', period: `${label} 2026`
  })));
  spec.measure.quantity = 'cumulative documented record count';
  spec.measure.unit = 'records';
  spec.options.showLabels = false;
  spec.options.showPoints = false;
  delete spec.emphasis;
  const drawing = draw(spec);
  const legend = texts(drawing, 'legend-label').map((node) => node.textContent);
  assert.deepEqual(legend.sort(), ['Series A', 'Series B']);
  // With points suppressed only each series endpoint is marked.
  assert.equal(marks(drawing, 'point').length, 2);

  spec.options.independentYAxes = true;
  const independent = draw(spec);
  const tickColors = new Set(texts(independent, 'axis-label').map((node) => node.attributes.fill));
  assert.ok(tickColors.size >= 3, 'each independent axis is colored to its series alongside the category ticks');
});

test('donut slices cover the full circle and every slice is directly labelled', () => {
  const drawing = draw(example('budget-composition.json'));
  const slices = drawing.nodes.filter((node) => node.attributes['data-slice'] !== undefined);
  assert.equal(slices.length, drawing.spec.data.length);
  assert.equal(texts(drawing, 'slice-value').length, drawing.spec.data.length);
  drawing.spec.data.forEach((item) => {
    assert.ok(texts(drawing, 'slice-label').some((node) => node.textContent === item.label), item.label);
  });
  assert.equal(texts(drawing, 'center-value')[0].textContent, drawing.spec.primaryMetric.value);
  // Labels sit outside the ring, left or right of it.
  const center = drawing.size.width / 2;
  texts(drawing, 'slice-value').forEach((node) => assert.ok(Math.abs(number(node, 'x') - center) > 150));
});

test('waterfall bars float from the running total and reconcile to the end bar', () => {
  const drawing = draw(example('ozon-collateral-waterfall.json'));
  const bars = marks(drawing, 'column');
  assert.equal(bars.length, 3);
  // Collect every vertical coordinate a column path visits.
  const extents = bars.map((bar) => {
    const yValues = [];
    bar.attributes.d.replace(/M(-?[\d.]+),(-?[\d.]+)|V(-?[\d.]+)|Q(-?[\d.]+),(-?[\d.]+) (-?[\d.]+),(-?[\d.]+)/g,
      (match, mx, my, v, qx, qy, ex, ey) => {
        [my, v, qy, ey].filter((value) => value !== undefined).forEach((value) => yValues.push(Number(value)));
        return match;
      });
    return { top: Math.min(...yValues), bottom: Math.max(...yValues) };
  });
  // Start and end bars stand on the same baseline; the change floats between their tops.
  assert.ok(Math.abs(extents[0].bottom - extents[2].bottom) < 0.02);
  assert.ok(Math.abs(extents[1].top - extents[0].top) < 0.02);
  assert.ok(Math.abs(extents[1].bottom - extents[2].top) < 0.02);
});

test('scatter positions follow both measures and every observation is named', () => {
  const drawing = draw(example('store-traffic-sales-scatter.json'));
  const points = marks(drawing, 'point');
  const data = drawing.spec.data;
  assert.equal(points.length, data.length);
  for (let first = 0; first < data.length; first += 1) {
    for (let second = first + 1; second < data.length; second += 1) {
      if (data[first].xValue < data[second].xValue) assert.ok(number(points[first], 'cx') < number(points[second], 'cx'));
      if (data[first].value < data[second].value) assert.ok(number(points[first], 'cy') > number(points[second], 'cy'));
    }
  }
  data.forEach((item) => assert.ok(texts(drawing, 'point-label').some((node) => node.textContent === item.label), item.label));
});

test('column charts keep a zero baseline and draw reference lines with captions', () => {
  const drawing = draw(example('additive-components.json'));
  const columns = marks(drawing, 'column');
  assert.equal(columns.length, 2);
  const references = marks(drawing, 'reference-line');
  assert.equal(references.length, drawing.spec.references.length);
  drawing.spec.references.forEach((reference) => {
    assert.ok(texts(drawing, 'reference-label').some((node) => node.textContent === reference.label), reference.label);
  });
  // The larger total sits higher on the stage.
  const [july, june] = drawing.spec.references;
  assert.ok(july.value > june.value);
  assert.ok(number(references[0], 'y1') < number(references[1], 'y1'));
});

test('the stage publishes machine-readable facts about what was drawn', () => {
  const trend = draw(example('trend-point-label-collision.json')).facts;
  assert.equal(trend['data-trend-label-layout'], 'measured');
  assert.equal(Number(trend['data-trend-label-line-overlaps']), 0);
  assert.ok(Number(trend['data-trend-label-center-error']) <= 1);
  assert.deepEqual(trend['data-trend-label-visible-indices'].split(',').map(Number), [0, 1, 2, 3, 4, 5, 6, 7]);

  const ranking = draw(example('regional-ranking.json')).facts;
  assert.ok(Number(ranking['data-ranking-value-label-gutter']) > Number(ranking['data-ranking-value-label-width']));

  const scatter = draw(example('store-traffic-sales-scatter.json')).facts;
  assert.equal(scatter['data-scatter-point-count'], '8');
  assert.equal(scatter['data-scatter-x-quantity'], 'weekly store foot traffic');
  assert.ok(Number(scatter['data-scatter-pearson-r']) > 0.99);

  assert.equal(draw(example('central-bank-scenarios.json')).facts['data-column-label-mode'], 'outside');
});

test('a scenario set with one neutral baseline states each alternative as a distance from it', () => {
  const spec = example('central-bank-scenarios.json');
  spec.title = 'Export plan scenarios';
  delete spec.subtitle;
  spec.measure = { quantity: 'coal exports', unit: 'million tonnes', valueMode: 'level', levelAvailability: 'reported', decimals: 1, baseline: 'zero' };
  const shared = { quantity: 'coal exports', scope: 'national coal exports', period: '2050' };
  spec.data = [
    Object.assign({ label: 'Current base', value: 200, displayValue: '200m t', tone: 'neutral' }, shared),
    Object.assign({ label: 'Growth scenario', value: 350, displayValue: '350m t', tone: 'positive' }, shared),
    Object.assign({ label: 'Pessimistic scenario', value: 100, displayValue: '100m t', tone: 'critical' }, shared)
  ];
  const drawing = draw(spec);
  assert.deepEqual(texts(drawing, 'bar-delta').map((node) => node.textContent), ['+75%', '−50%']);
  assert.equal(drawing.facts['data-column-baseline'], 'Current base');

  // Rates differ in points, never as a percentage of a percentage.
  const rates = draw(example('central-bank-scenarios.json'));
  assert.deepEqual(texts(rates, 'bar-delta').map((node) => node.textContent), ['−0.5 pts', '−0.3 pts']);

  // Without a single neutral baseline no comparison is invented.
  spec.data[0].tone = 'primary';
  assert.equal(texts(draw(spec), 'bar-delta').length, 0);
});

test('sparse multi-series trends label every reading and the change over the span', () => {
  const spec = example('bankruptcies-trend.json');
  delete spec.emphasis;
  spec.measure = { quantity: 'coal price', unit: 'USD/t', valueMode: 'level', levelAvailability: 'reported', decimals: 0, baseline: 'zero' };
  const rows = { A: [200, 180, 150], B: [100, 110, 120] };
  spec.data = ['Jan', 'Feb', 'Mar'].flatMap((label, index) => Object.keys(rows).map((group) => ({
    label, group, value: rows[group][index], displayValue: `$${rows[group][index]}`,
    quantity: 'coal price', scope: 'export benchmark', period: `${label} 2026`
  })));
  spec.options.showLabels = false;
  const drawing = draw(spec);
  assert.deepEqual(texts(drawing, 'series-change').map((node) => node.textContent).sort(), ['+20%', '−25%']);
  const readings = texts(drawing, 'point-value').map((node) => node.textContent).sort();
  assert.deepEqual(readings, ['$100', '$110', '$120', '$150', '$180', '$200']);
});

test('a short single series keeps its endpoint readings when intermediate labels are off', () => {
  const spec = example('bankruptcies-trend.json');
  delete spec.emphasis;
  spec.options.showLabels = false;
  const drawing = draw(spec);
  const shown = texts(drawing, 'point-value').map((node) => node.textContent);
  assert.ok(shown.includes('280K') && shown.includes('568K'));
  assert.equal(shown.includes('350K'), false);
  assert.equal(shown.some((text) => /since/.test(text)), false, 'no automatic span-change label');
});

test('a single-series trend draws solid points and a range bar behind ranged readings', () => {
  const spec = example('bankruptcies-trend.json');
  delete spec.emphasis;
  spec.data[1].low = 300;
  spec.data[1].high = 340;
  const drawing = draw(spec);
  const points = marks(drawing, 'point');
  assert.ok(points.every((point) => point.attributes.fill !== '#ffffff'));
  const bars = drawing.nodes.filter((node) => node.tag === 'line' && Number(node.attributes['stroke-opacity']) === 0.28);
  assert.equal(bars.length, 1);
  assert.ok(number(bars[0], 'y2') > number(bars[0], 'y1'));
});
