/*
 * Tochnyi SVG chart kit
 * Draws the standard quantitative recipes directly as SVG from the measured
 * stage size: columns, waterfall, ranking, diverging bars, trends, stacked
 * trends, donut, scatter, and area squares. Text is measured with the loaded webfont so
 * labels are placed from real geometry rather than character-count estimates.
 */
(function(global) {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var INK = '#14181c';
    var MUTED = '#66707a';
    var GRID = '#e3e7eb';
    var BASELINE = '#1d2227';
    var CONTEXT = '#aeb9c4';
    var TONES = {
        primary: '#005bbb',
        secondary: '#e8a200',
        warning: '#dd7a0b',
        critical: '#cf3a2f',
        neutral: '#8d97a1',
        positive: '#16885a'
    };
    var SERIES = ['#005bbb', '#e8a200', '#1f9e89', '#8e5cc4', '#cf3a2f', '#5f6b76', '#3aa0d8', '#b5651d'];
    var STYLES = {
        tick: { size: 15, weight: 500, fill: MUTED },
        category: { size: 17, weight: 600, fill: INK },
        value: { size: 18, weight: 700, fill: INK },
        valueLarge: { size: 24, weight: 700, fill: INK },
        small: { size: 14, weight: 500, fill: MUTED },
        caption: { size: 14, weight: 600, fill: MUTED },
        legend: { size: 16, weight: 600, fill: INK },
        reference: { size: 14, weight: 600, fill: INK },
        emphasis: { size: 26, weight: 700, fill: INK },
        center: { size: 44, weight: 700, fill: INK }
    };
    // Filled quantitative marks share one opacity (Tochnyi.marks.column.fillOpacity).
    function markOpacity() {
        var marks = global.Tochnyi && global.Tochnyi.marks;
        var value = marks && marks.column && Number(marks.column.fillOpacity);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    var KIT_RECIPES = {
        'comparison.change': drawColumns,
        'comparison.scenarios': drawColumns,
        'composition.components': drawColumns,
        'flow.waterfall': drawWaterfall,
        'ranking.horizontal': drawRanking,
        'comparison.diverging': drawDiverging,
        'trend.line': drawTrend,
        'trend.stacked': drawStackedTrend,
        'composition.donut': drawDonut,
        'relationship.scatter': drawScatter,
        'comparison.area-squares': drawAreaSquares
    };

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function round(value) {
        return Math.round(value * 100) / 100;
    }

    function luminance(hex) {
        var value = parseInt(String(hex).replace('#', ''), 16);
        return 0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255);
    }

    function shade(hex, factor) {
        var value = parseInt(String(hex).replace('#', ''), 16);
        var channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(function(channel) {
            return clamp(Math.round(channel * factor), 0, 255).toString(16).padStart(2, '0');
        });
        return '#' + channels.join('');
    }

    // Text drawn in a mark's own color must stay legible on white.
    function textColor(hex) {
        return luminance(hex) > 150 ? shade(hex, 0.62) : hex;
    }

    function inkOn(hex) {
        return luminance(hex) > 150 ? INK : '#ffffff';
    }

    function seriesColor(index) {
        if (index < SERIES.length) return SERIES[index];
        var hue = (24 + (index - SERIES.length) * 137.508) % 360;
        return 'hsl(' + Math.round(hue) + ', 52%, 46%)';
    }

    function toneColor(tone, fallback) {
        return tone && TONES[tone] ? TONES[tone] : fallback;
    }

    var measureContext = null;
    function measureWidth(text, size, weight) {
        if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
        measureContext.font = weight + ' ' + size + 'px Mukta, sans-serif';
        return measureContext.measureText(String(text)).width;
    }

    // ---------- scales ----------
    function niceStep(span, target) {
        var rough = span / Math.max(1, target);
        var power = Math.pow(10, Math.floor(Math.log10(rough)));
        var multiple = [1, 2, 2.5, 5, 10].find(function(candidate) { return candidate * power >= rough - 1e-12; });
        return multiple * power;
    }

    function linearAxis(minimum, maximum, target, pinned) {
        if (!(maximum > minimum)) maximum = minimum + (Math.abs(minimum) || 1);
        var step = niceStep(maximum - minimum, target);
        var low = pinned && pinned.minimum !== undefined ? pinned.minimum : Math.floor(minimum / step + 1e-9) * step;
        var high = pinned && pinned.maximum !== undefined ? pinned.maximum : Math.ceil(maximum / step - 1e-9) * step;
        var ticks = [];
        for (var tick = Math.ceil(low / step - 1e-9) * step; tick <= high + step * 1e-6; tick += step) {
            ticks.push(Number(tick.toPrecision(12)));
        }
        return {
            minimum: low,
            maximum: high,
            ticks: ticks,
            step: step,
            position: function(value) { return (value - low) / (high - low); }
        };
    }

    function logAxis(minimum, maximum) {
        var low = Math.pow(10, Math.floor(Math.log10(minimum)));
        var high = Math.pow(10, Math.ceil(Math.log10(maximum)));
        if (high === low) high = low * 10;
        var ticks = [];
        for (var tick = low; tick <= high * 1.0001; tick *= 10) ticks.push(Number(tick.toPrecision(12)));
        var span = Math.log10(high) - Math.log10(low);
        return {
            minimum: low,
            maximum: high,
            ticks: ticks,
            step: null,
            logarithmic: true,
            position: function(value) { return (Math.log10(Math.max(value, low)) - Math.log10(low)) / span; }
        };
    }

    // Bars are lengths, so their axis always contains zero. Lines and points may
    // use a fitted or explicit baseline when the measure asks for one.
    function valueAxis(measure, values, target, options) {
        var settings = options || {};
        var finite = values.filter(Number.isFinite);
        if (!finite.length) finite = [0, 1];
        var minimum = Math.min.apply(null, finite);
        var maximum = Math.max.apply(null, finite);
        if (measure.scale === 'logarithmic' && minimum > 0) return logAxis(minimum, maximum);
        var pinned = {};
        var baseline = measure.baseline || 'zero';
        if (settings.zero || baseline === 'zero') {
            minimum = Math.min(0, minimum);
            maximum = Math.max(0, maximum);
            if (minimum === 0) pinned.minimum = 0;
            if (maximum === 0) pinned.maximum = 0;
        } else if (baseline === 'explicit' && typeof measure.minimum === 'number' && measure.minimum <= minimum) {
            minimum = measure.minimum;
            pinned.minimum = measure.minimum;
        } else {
            var pad = (maximum - minimum || Math.abs(maximum) || 1) * (settings.padding === undefined ? 0.12 : settings.padding);
            minimum = minimum >= 0 ? Math.max(0, minimum - pad) : minimum - pad;
            maximum += pad;
        }
        if (typeof measure.maximum === 'number' && measure.maximum >= maximum) {
            maximum = measure.maximum;
            pinned.maximum = measure.maximum;
        }
        return linearAxis(minimum, maximum, target, pinned);
    }

    function formatPlain(value, decimals) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value).replace(/^-/, '−');
    }

    // Axis ticks stay numeric: the unit is named once in the axis caption.
    function tickText(value, measure, axis) {
        var active = measure || {};
        var percent = active.unit === '%' || active.suffix === '%';
        var absolute = Math.abs(value);
        var step = axis && axis.step ? axis.step : absolute || 1;
        var body;
        function scaled(divisor, unit) {
            var scaledStep = step / divisor;
            var places = scaledStep >= 1 ? 0 : Math.min(2, Math.ceil(-Math.log10(scaledStep) - 1e-9));
            return formatPlain(value / divisor, places) + unit;
        }
        var extent = axis ? Math.max(Math.abs(axis.minimum), Math.abs(axis.maximum)) : absolute;
        if (extent >= 1e9) body = scaled(1e9, 'bn');
        else if (extent >= 1e6) body = scaled(1e6, 'm');
        else if (extent >= 1e4) body = scaled(1e3, 'k');
        else body = formatPlain(value, step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) - 1e-9)));
        if (value === 0) body = '0';
        return (active.prefix || '') + body + (percent ? '%' : '');
    }

    function axisCaption(measure) {
        var active = measure || {};
        var title = active.axisTitle || '';
        var unit = active.unit && active.unit !== '%' ? active.unit : '';
        if (!title) return unit ? unit.charAt(0).toUpperCase() + unit.slice(1) : '';
        if (!unit) return title;
        var lowered = title.toLowerCase();
        var covered = unit.toLowerCase().split(/[^a-z0-9а-я₽$€]+/).filter(Boolean).every(function(word) {
            return lowered.indexOf(word) >= 0;
        });
        return covered ? title : title + ' (' + unit + ')';
    }

    // The distance between two values of one measure, as a reader would say it:
    // a percentage for levels, points for values that are already percentages.
    function deltaText(from, to, measure) {
        var active = measure || {};
        var difference = to - from;
        if (!Number.isFinite(difference) || difference === 0) return '';
        var sign = difference > 0 ? '+' : '−';
        var percentUnit = active.unit === '%' || /^percent/i.test(active.unit || '') || active.suffix === '%';
        if (percentUnit || active.valueMode === 'rate' || active.valueMode === 'share') {
            return sign + formatPlain(Math.abs(difference), Math.abs(difference) < 10 ? 1 : 0) + ' pts';
        }
        if (!(from > 0)) return '';
        var change = Math.abs(difference) / from * 100;
        return sign + formatPlain(change, change < 10 ? 1 : 0) + '%';
    }

    // ---------- drawing kit ----------
    function createKit(spec, chartNode, env) {
        var width = Math.max(300, Math.round(chartNode.clientWidth || 1000));
        var height = Math.max(240, Math.round(chartNode.clientHeight || 520));
        var k = clamp(width / 1040, 0.64, 1);
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', spec.title);
        svg.setAttribute('class', 'tochnyi-kit-svg');
        svg.setAttribute('data-label-layout', env.layoutFinal === false ? 'pending' : 'complete');

        var kit = {
            spec: spec,
            env: env,
            svg: svg,
            width: width,
            height: height,
            k: k,
            compact: width < 640,
            requiredHeight: 0
        };

        kit.node = function(tag, attributes, parent) {
            var node = document.createElementNS(SVG_NS, tag);
            Object.keys(attributes || {}).forEach(function(key) {
                var value = attributes[key];
                if (value === undefined || value === null) return;
                node.setAttribute(key, typeof value === 'number' ? round(value) : value);
            });
            (parent || svg).appendChild(node);
            return node;
        };

        kit.size = function(style) { return Math.round(style.size * k * 10) / 10; };

        kit.measure = function(text, style) {
            return measureWidth(text, kit.size(style), style.weight);
        };

        // y is the text baseline. options: anchor, fill, role, group, title, parent.
        kit.text = function(x, y, content, style, options) {
            var settings = options || {};
            var node = kit.node('text', {
                x: x,
                y: y,
                'font-size': kit.size(style),
                'font-weight': style.weight,
                fill: settings.fill || style.fill,
                'text-anchor': settings.anchor || 'start',
                'data-label-role': settings.role || 'svg-label',
                'data-label-group': settings.group
            }, settings.parent);
            node.textContent = content;
            return node;
        };

        kit.wrap = function(content, style, maximumWidth, maximumLines) {
            var words = String(content).split(/\s+/).filter(Boolean);
            var lines = [];
            var current = '';
            words.forEach(function(word) {
                var candidate = current ? current + ' ' + word : word;
                if (current && kit.measure(candidate, style) > maximumWidth) {
                    lines.push(current);
                    current = word;
                } else {
                    current = candidate;
                }
            });
            if (current) lines.push(current);
            var limit = maximumLines || 3;
            if (lines.length > limit) {
                lines = lines.slice(0, limit - 1).concat([lines.slice(limit - 1).join(' ')]);
            }
            return lines;
        };

        // Draws wrapped lines; y is the first baseline. Returns the block height.
        kit.lines = function(x, y, lines, style, options) {
            var leading = kit.size(style) * 1.2;
            lines.forEach(function(line, index) {
                kit.text(x, y + index * leading, line, style, options);
            });
            return lines.length * leading;
        };

        // Largest style at or below the given one whose text fits the width.
        kit.fitStyle = function(content, style, maximumWidth, minimumSize) {
            var fitted = Object.assign({}, style);
            var floor = minimumSize || 12;
            while (fitted.size > floor && kit.measure(content, fitted) > maximumWidth) fitted.size -= 1;
            return fitted;
        };

        // Machine-readable facts about the drawing, published as data attributes on the stage.
        kit.facts = {};
        kit.report = function(name, value) { kit.facts[name] = String(value); };

        kit.title = function(node, content) {
            var title = document.createElementNS(SVG_NS, 'title');
            title.textContent = content;
            node.appendChild(title);
        };

        return kit;
    }

    function emphasisColor(spec) {
        var frame = spec.narrative && spec.narrative.frame;
        if (frame === 'warning' || frame === 'collapse') return TONES.critical;
        if (frame === 'recovery') return TONES.positive;
        return TONES.primary;
    }

    function emphasisText(spec, env) {
        var emphasis = spec.emphasis;
        if (!emphasis) return null;
        var arrow = emphasis.direction === 'up' ? '▲' : emphasis.direction === 'down' ? '▼' : '';
        var shown = emphasis.displayValue !== undefined
            ? emphasis.displayValue
            : emphasis.value !== undefined ? env.formatNumber(emphasis.value, spec.measure.decimals || 0) : '';
        return { arrow: arrow, value: String(shown), label: emphasis.label || '' };
    }

    // The band above the plot carries the axis caption and the emphasis callout.
    // Returns the height it used.
    function drawHeaderBand(kit, options) {
        var settings = options || {};
        var spec = kit.spec;
        var caption = settings.caption === undefined ? axisCaption(spec.measure) : settings.caption;
        var emphasis = settings.emphasis === false ? null : emphasisText(spec, kit.env);
        if (!caption && !emphasis) return 0;
        // Mukta's line box rises about 1.2em above the baseline; keep it inside the stage.
        var baseline = kit.size(emphasis ? STYLES.emphasis : STYLES.caption) * 1.25;
        var bandHeight = baseline + 12 * kit.k;
        var position = emphasis ? (spec.emphasis.position || 'corner') : null;
        if (emphasis) {
            var color = emphasisColor(spec);
            var lead = [emphasis.arrow, emphasis.value].filter(Boolean).join(' ');
            var leadWidth = kit.measure(lead, STYLES.emphasis);
            var labelWidth = emphasis.label ? kit.measure(' ' + emphasis.label, STYLES.legend) + 6 * kit.k : 0;
            var total = leadWidth + labelWidth;
            var center = settings.emphasisCenter === undefined ? kit.width / 2 : settings.emphasisCenter;
            var start = position === 'left' ? 0
                : position === 'between' ? clamp(center - total / 2, 0, kit.width - total)
                    : kit.width - total;
            kit.text(start, baseline, lead, STYLES.emphasis, { fill: color, role: 'emphasis-badge' });
            if (emphasis.label) {
                kit.text(start + leadWidth + 8 * kit.k, baseline, emphasis.label, STYLES.legend, {
                    fill: MUTED, role: 'emphasis-badge'
                });
            }
            if (caption && position === 'left') {
                kit.text(kit.width, baseline, caption, STYLES.caption, { anchor: 'end', role: 'axis-title' });
                caption = '';
            }
            if (caption && position === 'between' && kit.measure(caption, STYLES.caption) > start - 16) caption = '';
        }
        if (caption) kit.text(0, baseline, caption, STYLES.caption, { role: 'axis-title' });
        return bandHeight;
    }

    function drawHorizontalGrid(kit, axis, y, left, right, measure, options) {
        var settings = options || {};
        axis.ticks.forEach(function(tick) {
            var zero = tick === 0 && !axis.logarithmic;
            kit.node('line', {
                x1: left, x2: right, y1: y(tick), y2: y(tick),
                stroke: zero ? BASELINE : GRID,
                'stroke-width': zero ? 1.5 : 1
            });
            if (settings.labels === false) return;
            kit.text(left - 10 * kit.k, y(tick) + kit.size(STYLES.tick) * 0.34, tickText(tick, measure, axis), STYLES.tick, {
                anchor: 'end', role: 'axis-label', fill: settings.fill
            });
        });
    }

    function tickGutter(kit, axis, measure) {
        return Math.max.apply(null, axis.ticks.map(function(tick) {
            return kit.measure(tickText(tick, measure, axis), STYLES.tick);
        })) + 14 * kit.k;
    }

    function referenceColor(reference) {
        return !reference.tone || reference.tone === 'neutral' ? '#2a3138' : TONES[reference.tone] || '#2a3138';
    }

    // Horizontal reference lines with a caption in the right gutter, plus an
    // optional shaded band when the reference spans a range.
    function drawHorizontalReferences(kit, references, y, left, right, measure) {
        if (!references.length) return;
        var size = kit.size(STYLES.reference);
        var desired = references.map(function(reference) { return y(reference.value); });
        var order = desired.map(function(value, index) { return { value: value, index: index }; })
            .sort(function(a, b) { return a.value - b.value; });
        for (var position = 1; position < order.length; position += 1) {
            order[position].value = Math.max(order[position].value, order[position - 1].value + size * 2.5);
        }
        var captionY = [];
        order.forEach(function(entry) { captionY[entry.index] = entry.value; });
        references.forEach(function(reference, index) {
            var color = referenceColor(reference);
            var group = 'reference-' + index;
            var lineY = y(reference.value);
            if (typeof reference.endValue === 'number') {
                var endY = y(reference.endValue);
                kit.node('rect', {
                    x: left, y: Math.min(lineY, endY), width: right - left, height: Math.abs(endY - lineY),
                    fill: color, 'fill-opacity': 0.1
                });
            }
            kit.node('line', {
                x1: left, x2: right + 10 * kit.k, y1: lineY, y2: lineY,
                stroke: color, 'stroke-width': 1.5,
                'stroke-dasharray': reference.lineStyle === 'line' ? null : '6 5',
                'data-tochnyi-mark': 'reference-line', 'data-label-group': group
            });
            var captionX = right + 18 * kit.k;
            kit.text(captionX, captionY[index] - size * 0.25, kit.env.referenceValueText(reference.value, measure), STYLES.reference, {
                fill: color, role: 'reference-label', group: group
            });
            kit.wrap(reference.label, STYLES.small, kit.width - captionX, 2).forEach(function(line, lineIndex) {
                kit.text(captionX, captionY[index] + size * 0.95 + lineIndex * size * 1.15, line, STYLES.small, {
                    role: 'reference-label', group: group
                });
            });
        });
    }

    function referenceGutter(kit, references, measure) {
        if (!references.length) return 0;
        var widest = Math.max.apply(null, references.map(function(reference) {
            return Math.max(
                kit.measure(kit.env.referenceValueText(reference.value, measure), STYLES.reference),
                Math.min(kit.measure(reference.label, STYLES.small), 190 * kit.k)
            );
        }));
        return Math.min(widest + 26 * kit.k, kit.width * 0.3);
    }

    function topRoundedColumn(x, width, from, to) {
        var top = Math.min(from, to);
        var bottom = Math.max(from, to);
        var radius = Math.min(3, width / 2, (bottom - top) / 2);
        return 'M' + round(x) + ',' + round(bottom) + ' V' + round(top + radius) +
            ' Q' + round(x) + ',' + round(top) + ' ' + round(x + radius) + ',' + round(top) +
            ' H' + round(x + width - radius) +
            ' Q' + round(x + width) + ',' + round(top) + ' ' + round(x + width) + ',' + round(top + radius) +
            ' V' + round(bottom) + ' Z';
    }

    // ---------- columns and waterfall ----------
    function drawColumnFamily(kit, bars, options) {
        var spec = kit.spec;
        var k = kit.k;
        var settings = options || {};
        var references = spec.references || [];
        var showLabels = spec.options.showLabels !== false;
        var count = bars.length;
        var values = [];
        bars.forEach(function(bar) { values.push(bar.from, bar.to); });
        references.forEach(function(reference) {
            values.push(reference.value);
            if (typeof reference.endValue === 'number') values.push(reference.endValue);
        });
        var axis = valueAxis(spec.measure, values, 4, { zero: true });

        var gutter = referenceGutter(kit, references, spec.measure);
        var available = kit.width - gutter;
        var slot = Math.min(available / count, (count <= 3 ? 360 : 260) * k);
        var groupWidth = slot * count;
        var left = Math.max(0, (available - groupWidth) / 2);
        var right = left + groupWidth;
        var barWidth = Math.min(slot * 0.62, 190 * k);

        var valueStyle = count <= 4 ? STYLES.valueLarge : STYLES.value;
        var categoryLines = bars.map(function(bar) { return kit.wrap(bar.label, STYLES.category, slot - 14 * k, 3); });
        var categoryRows = Math.max.apply(null, categoryLines.map(function(lines) { return lines.length; }));
        var categoryLeading = kit.size(STYLES.category) * 1.2;
        var labelBlocks = bars.map(function(bar) {
            if (!showLabels || !bar.display) return { lines: [], style: valueStyle };
            var style = kit.fitStyle(bar.display, valueStyle, slot - 8 * k, 15);
            var lines = kit.measure(bar.display, style) > slot - 8 * k ? kit.wrap(bar.display, style, slot - 8 * k, 2) : [bar.display];
            return { lines: lines, style: style };
        });
        var deltas = settings.deltas || [];
        var deltaStyle = Object.assign({}, STYLES.value, { size: count <= 4 ? 19 : 15 });
        var deltaRoom = deltas.some(Boolean) ? kit.size(deltaStyle) * 1.3 : 0;
        var labelRoom = Math.max.apply(null, labelBlocks.map(function(block) {
            return block.lines.length * kit.size(block.style) * 1.15;
        }).concat([0])) + 12 * k + deltaRoom;

        var header = drawHeaderBand(kit, {
            emphasisCenter: count === 2 ? left + slot : undefined
        });
        kit.report('data-column-label-mode', 'outside');
        kit.report('data-column-count', count);
        var hasNegative = axis.minimum < 0;
        var top = header + labelRoom;
        var bottom = kit.height - categoryRows * categoryLeading - 14 * k - (hasNegative ? labelRoom : 0);
        var y = function(value) { return bottom - axis.position(value) * (bottom - top); };
        var zeroY = axis.logarithmic ? bottom : y(0);

        kit.node('line', {
            x1: left, x2: right, y1: zeroY, y2: zeroY, stroke: BASELINE, 'stroke-width': 1.5
        });

        if (settings.baseIndex !== undefined) {
            var baseY = y(bars[settings.baseIndex].to);
            kit.node('line', {
                x1: left + slot * settings.baseIndex + (slot - barWidth) / 2, x2: right, y1: baseY, y2: baseY,
                stroke: '#5b6670', 'stroke-width': 1.25, 'stroke-dasharray': '5 5'
            });
        }

        bars.forEach(function(bar, index) {
            var group = 'column-' + index;
            var x = left + slot * index + (slot - barWidth) / 2;
            var fromY = axis.logarithmic && bar.from <= 0 ? bottom : y(bar.from);
            var toY = y(bar.to);
            var rising = bar.to >= bar.from;
            var path = rising
                ? topRoundedColumn(x, barWidth, fromY, toY)
                : 'M' + round(x) + ',' + round(fromY) + ' H' + round(x + barWidth) + ' V' + round(toY) + ' H' + round(x) + ' Z';
            var mark = kit.node('path', {
                d: path, fill: bar.color, 'data-tochnyi-mark': 'column', 'data-label-group': group, 'fill-opacity': markOpacity()
            });
            kit.title(mark, bar.label + ': ' + bar.display);

            if (settings.connectors && index < count - 1) {
                var nextX = left + slot * (index + 1) + (slot - barWidth) / 2;
                kit.node('line', {
                    x1: x + barWidth, x2: nextX, y1: y(bar.carry), y2: y(bar.carry),
                    stroke: '#7d8791', 'stroke-width': 1, 'stroke-dasharray': '3 3'
                });
            }

            var block = labelBlocks[index];
            if (block.lines.length) {
                var size = kit.size(block.style);
                var above = settings.labelsAbove || bar.to >= bar.from || !hasNegative;
                var anchorY = above ? Math.min(fromY, toY) - 9 * k - (block.lines.length - 1) * size * 1.15
                    : Math.max(fromY, toY) + size + 5 * k;
                block.lines.forEach(function(line, lineIndex) {
                    kit.text(x + barWidth / 2, anchorY + lineIndex * size * 1.15, line, block.style, {
                        anchor: 'middle', role: 'bar-value', group: group, fill: bar.labelFill || INK
                    });
                });
                if (deltas[index] && above) {
                    kit.text(x + barWidth / 2, anchorY - size * 1.02, deltas[index], deltaStyle, {
                        anchor: 'middle', role: 'bar-delta', group: group, fill: textColor(bar.color)
                    });
                }
            }

            var categoryTop = bottom + (hasNegative ? labelRoom : 0) + categoryLeading;
            if (!hasNegative) categoryTop = zeroY + categoryLeading + 2 * k;
            categoryLines[index].forEach(function(line, lineIndex) {
                kit.text(left + slot * index + slot / 2, categoryTop + lineIndex * categoryLeading, line, STYLES.category, {
                    anchor: 'middle', role: 'category-label'
                });
            });
        });

        drawHorizontalReferences(kit, references, y, left, right, spec.measure);

        // A two-value change reads as a step: mark the distance between the levels.
        if (settings.changeArrow && count === 2) {
            var firstY = y(bars[0].to);
            var secondY = y(bars[1].to);
            if (Math.abs(firstY - secondY) > 18 * k) {
                var middle = left + slot;
                var color = emphasisColor(spec);
                var head = secondY < firstY ? -1 : 1;
                kit.node('line', {
                    x1: left + (slot + barWidth) / 2, x2: middle + 8 * k, y1: firstY, y2: firstY,
                    stroke: '#7d8791', 'stroke-width': 1, 'stroke-dasharray': '3 3'
                });
                kit.node('line', {
                    x1: middle, x2: middle, y1: firstY, y2: secondY - head * 7 * k,
                    stroke: color, 'stroke-width': 2
                });
                kit.node('path', {
                    d: 'M' + round(middle - 6 * k) + ',' + round(secondY - head * 9 * k) +
                        ' L' + round(middle) + ',' + round(secondY) +
                        ' L' + round(middle + 6 * k) + ',' + round(secondY - head * 9 * k) + ' Z',
                    fill: color
                });
            }
        }
    }

    function drawColumns(kit) {
        var spec = kit.spec;
        var data = kit.env.preparedData(spec);
        var change = spec.recipe === 'comparison.change';
        // A scenario set with exactly one neutral item is a baseline and its
        // alternatives: draw the baseline level across the chart and state how
        // far each alternative sits from it.
        var neutral = data.filter(function(item) { return item.tone === 'neutral'; });
        var baseIndex = spec.recipe === 'comparison.scenarios' && neutral.length === 1 && data.length > 1
            ? data.indexOf(neutral[0]) : undefined;
        var deltas = baseIndex === undefined ? [] : data.map(function(item, index) {
            return index === baseIndex ? null : deltaText(data[baseIndex].value, item.value, spec.measure);
        });
        if (baseIndex !== undefined) kit.report('data-column-baseline', data[baseIndex].label);
        drawColumnFamily(kit, data.map(function(item, index) {
            var fallback = change && index === 0 ? CONTEXT : TONES.primary;
            return {
                label: item.label,
                from: 0,
                to: item.value,
                display: item.display,
                color: toneColor(item.tone, fallback)
            };
        }), {
            // The step arrow belongs to an authored change, not to any two bars side by side.
            changeArrow: change && Boolean(spec.emphasis),
            baseIndex: deltas.some(Boolean) ? baseIndex : undefined,
            deltas: deltas
        });
    }

    function drawWaterfall(kit) {
        var spec = kit.spec;
        var running = 0;
        var bars = spec.data.map(function(item) {
            var total = item.role === 'start' || item.role === 'subtotal' || item.role === 'end';
            var from = total ? 0 : running;
            var to = total ? item.value : running + item.value;
            running = to;
            var fallback = total ? TONES.primary : item.value >= 0 ? TONES.positive : TONES.critical;
            var color = toneColor(item.tone, fallback);
            return {
                label: item.label,
                from: from,
                to: to,
                carry: to,
                display: item.displayValue || kit.env.formatMeasureValue(item.value, spec.measure),
                color: color,
                labelFill: total ? INK : textColor(color)
            };
        });
        drawColumnFamily(kit, bars, { connectors: true, labelsAbove: true });
    }

    // ---------- horizontal bars ----------
    function rankingColors(kit, data) {
        var plan = kit.env.plan || {};
        var toned = data.some(function(item) { return item.tone; });
        return data.map(function(item, index) {
            if (toned) return toneColor(item.tone, CONTEXT);
            if (plan.colorPolicy === 'focus') return index === 0 ? TONES.primary : CONTEXT;
            return TONES.primary;
        });
    }

    function drawHorizontalBars(kit, rows, options) {
        var spec = kit.spec;
        var k = kit.k;
        var settings = options || {};
        var references = spec.references || [];
        var showLabels = spec.options.showLabels !== false;
        var count = rows.length;
        var values = rows.map(function(row) { return row.value; });
        references.forEach(function(reference) { values.push(reference.value); });
        var axis = valueAxis(spec.measure, values, 4, { zero: true });

        var header = drawHeaderBand(kit);
        var referenceRoom = references.length ? 24 * k : 0;
        var top = header + referenceRoom + 4 * k;
        var available = kit.height - top - 4 * k;
        var minimumRow = 22 * k;
        if (available < count * minimumRow) {
            kit.requiredHeight = Math.ceil(top + count * minimumRow + 8 * k);
        }
        var rowHeight = clamp(available / count, 12 * k, 96 * k);
        var dense = rowHeight < 30 * k;
        var categoryStyle = dense ? Object.assign({}, STYLES.category, { size: clamp(rowHeight * 0.62, 11, 15) }) : STYLES.category;
        var valueStyle = dense ? Object.assign({}, STYLES.value, { size: clamp(rowHeight * 0.62, 11, 15) }) : STYLES.value;
        var barHeight = Math.min(rowHeight * 0.62, 52 * k);
        var contentHeight = rowHeight * count;
        top += Math.max(0, (available - contentHeight) / 2);

        var labelLimit = kit.width * (kit.compact ? 0.4 : 0.3);
        var canWrap = rowHeight >= kit.size(categoryStyle) * 2.5;
        var labelLines = rows.map(function(row) {
            return canWrap ? kit.wrap(row.label, categoryStyle, labelLimit, 2) : [row.label];
        });
        var labelWidth = Math.min(labelLimit, Math.max.apply(null, labelLines.map(function(lines) {
            return Math.max.apply(null, lines.map(function(line) { return kit.measure(line, categoryStyle); }));
        })));
        var detailStyle = Object.assign({}, STYLES.small, { size: Math.min(STYLES.small.size, valueStyle.size) });
        var valueWidths = rows.map(function(row) {
            if (!showLabels) return 0;
            return kit.measure(row.display, valueStyle) + (row.detail ? kit.measure('  ' + row.detail, detailStyle) : 0);
        });
        var positiveRoom = Math.max.apply(null, rows.map(function(row, index) {
            return row.value >= 0 ? valueWidths[index] : 0;
        }).concat([0])) + 12 * k;
        var negativeRoom = axis.minimum < 0 ? Math.max.apply(null, rows.map(function(row, index) {
            return row.value < 0 ? valueWidths[index] : 0;
        }).concat([0])) + 12 * k : 0;

        kit.report('data-ranking-row-count', count);
        kit.report('data-ranking-value-label-width', round(Math.max.apply(null, valueWidths.concat([0]))));
        kit.report('data-ranking-value-label-gutter', round(positiveRoom));
        var left = labelWidth + 16 * k + negativeRoom;
        var right = kit.width - positiveRoom;
        if (settings.labelsAtZero) {
            // Category labels sit beside the zero line on the side opposite the bar,
            // so each side needs room for the widest label that lands there.
            left = negativeRoom;
            var widthFor = function(sign) {
                return Math.max.apply(null, rows.map(function(row, index) {
                    return (row.value >= 0) === sign ? Math.max.apply(null, labelLines[index].map(function(line) {
                        return kit.measure(line, categoryStyle);
                    })) + 14 * k : 0;
                }).concat([0]));
            };
            var zeroShare = axis.position(0);
            left += Math.max(0, widthFor(true) - (left + zeroShare * (right - left)));
            right -= Math.max(0, widthFor(false) - (kit.width - (left + zeroShare * (right - left))));
        }
        var x = function(value) { return left + axis.position(value) * (right - left); };
        var zeroX = axis.logarithmic ? left : x(0);

        if (settings.zeroLine || axis.minimum < 0) {
            kit.node('line', {
                x1: zeroX, x2: zeroX, y1: top - 2 * k, y2: top + contentHeight + 2 * k,
                stroke: BASELINE, 'stroke-width': 1.5
            });
        }

        rows.forEach(function(row, index) {
            var group = 'bar-' + index;
            var rowTop = top + rowHeight * index;
            var middle = rowTop + rowHeight / 2;
            var end = x(row.value);
            var start = Math.min(zeroX, end);
            var length = Math.max(Math.abs(end - zeroX), 1.5);
            var mark = kit.node('rect', {
                x: start, y: middle - barHeight / 2, width: length, height: barHeight,
                rx: Math.min(2.5, barHeight / 2), fill: row.color, 'fill-opacity': markOpacity(),
                'data-tochnyi-mark': 'bar', 'data-label-group': group
            });
            kit.title(mark, row.label + ': ' + row.display);

            var lines = labelLines[index];
            var leading = kit.size(categoryStyle) * 1.15;
            var firstBaseline = middle + kit.size(categoryStyle) * 0.34 - (lines.length - 1) * leading / 2;
            lines.forEach(function(line, lineIndex) {
                var shown = !canWrap && kit.measure(line, categoryStyle) > labelLimit
                    ? truncate(kit, line, categoryStyle, labelLimit) : line;
                var beside = settings.labelsAtZero;
                kit.text(beside ? zeroX + (row.value >= 0 ? -10 : 10) * k : labelWidth,
                    firstBaseline + lineIndex * leading, shown, categoryStyle, {
                        anchor: beside && row.value < 0 ? 'start' : 'end', role: 'category-label'
                    });
            });

            if (!showLabels) return;
            var baseline = middle + kit.size(valueStyle) * 0.34;
            var positive = row.value >= 0;
            var valueNode = kit.text(positive ? end + 9 * k : end - 9 * k, baseline, row.display, valueStyle, {
                anchor: positive ? 'start' : 'end', role: 'bar-value', group: group, fill: row.labelFill || INK
            });
            if (row.detail && positive) {
                var detail = document.createElementNS(SVG_NS, 'tspan');
                detail.setAttribute('font-size', kit.size(detailStyle));
                detail.setAttribute('font-weight', detailStyle.weight);
                detail.setAttribute('fill', MUTED);
                detail.setAttribute('dx', round(8 * k));
                detail.textContent = row.detail;
                valueNode.appendChild(detail);
            }
        });

        references.forEach(function(reference, index) {
            var color = referenceColor(reference);
            var group = 'reference-' + index;
            var referenceX = x(reference.value);
            kit.node('line', {
                x1: referenceX, x2: referenceX, y1: top - 4 * k, y2: top + contentHeight + 2 * k,
                stroke: color, 'stroke-width': 1.5,
                'stroke-dasharray': reference.lineStyle === 'line' ? null : '6 5',
                'data-tochnyi-mark': 'reference-line', 'data-label-group': group
            });
            var caption = reference.label + ' · ' + kit.env.referenceValueText(reference.value, spec.measure);
            var captionWidth = kit.measure(caption, STYLES.reference);
            var anchor = referenceX + captionWidth / 2 > kit.width ? 'end' : referenceX - captionWidth / 2 < 0 ? 'start' : 'middle';
            kit.text(referenceX, top - 10 * k, caption, STYLES.reference, {
                anchor: anchor, fill: color, role: 'reference-label', group: group
            });
        });
    }

    function truncate(kit, content, style, maximumWidth) {
        var value = String(content);
        while (value.length > 2 && kit.measure(value + '…', style) > maximumWidth) value = value.slice(0, -1);
        return value.replace(/\s+$/, '') + '…';
    }

    function drawRanking(kit) {
        var data = kit.env.preparedData(kit.spec);
        var colors = rankingColors(kit, data);
        drawHorizontalBars(kit, data.map(function(item, index) {
            return {
                label: item.label,
                value: item.value,
                display: item.display,
                detail: item.detail,
                color: colors[index]
            };
        }));
    }

    function drawDiverging(kit) {
        var data = kit.env.preparedData(kit.spec);
        drawHorizontalBars(kit, data.map(function(item) {
            var color = toneColor(item.tone, item.value >= 0 ? TONES.primary : TONES.critical);
            return {
                label: item.label,
                value: item.value,
                display: item.display,
                color: color,
                labelFill: textColor(color)
            };
        }), { zeroLine: true, labelsAtZero: true });
    }

    // ---------- label placement for points ----------
    function rectsOverlap(a, b, gap) {
        var pad = gap || 0;
        return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
    }

    function segmentHitsRect(x1, y1, x2, y2, rect) {
        var minX = Math.min(x1, x2);
        var maxX = Math.max(x1, x2);
        if (maxX < rect.left || minX > rect.right) return false;
        var clippedStart = Math.max(minX, rect.left);
        var clippedEnd = Math.min(maxX, rect.right);
        var at = function(px) { return x2 === x1 ? y1 : y1 + (y2 - y1) * (px - x1) / (x2 - x1); };
        var startY = x2 === x1 ? Math.min(y1, y2) : at(clippedStart);
        var endY = x2 === x1 ? Math.max(y1, y2) : at(clippedEnd);
        return Math.max(startY, endY) >= rect.top && Math.min(startY, endY) <= rect.bottom;
    }

    function labelBox(point, width, height, placement, offset) {
        var gap = offset;
        var cx = point.x;
        var cy = point.y;
        var boxes = {
            above: [cx - width / 2, cy - gap - height],
            below: [cx - width / 2, cy + gap],
            right: [cx + gap, cy - height / 2],
            left: [cx - gap - width, cy - height / 2],
            'above-right': [cx + gap * 0.5, cy - gap * 0.7 - height],
            'above-left': [cx - gap * 0.5 - width, cy - gap * 0.7 - height],
            'below-right': [cx + gap * 0.5, cy + gap * 0.7],
            'below-left': [cx - gap * 0.5 - width, cy + gap * 0.7]
        };
        var origin = boxes[placement];
        return { left: origin[0], top: origin[1], right: origin[0] + width, bottom: origin[1] + height };
    }

    // Greedy placement in priority order. Each label takes the first candidate
    // position that stays inside the bounds and clears placed labels, other
    // points, and the plotted line segments. Returns one box (or null) per label.
    function placePointLabels(labels, context) {
        var placed = [];
        var result = [];
        labels.slice().sort(function(a, b) { return b.priority - a.priority; }).forEach(function(label) {
            var chosen = null;
            label.placements.some(function(placement) {
                var box = labelBox(label.point, label.width, label.height, placement, context.offset);
                if (box.left < context.bounds.left || box.right > context.bounds.right ||
                    box.top < context.bounds.top || box.bottom > context.bounds.bottom) return false;
                if (placed.some(function(other) { return rectsOverlap(box, other, 3); })) return false;
                var hitsPoint = context.points.some(function(point) {
                    if (point === label.point) return false;
                    return rectsOverlap(box, {
                        left: point.x - point.r, right: point.x + point.r, top: point.y - point.r, bottom: point.y + point.r
                    }, 2);
                });
                if (hitsPoint) return false;
                var hitsLine = (context.segments || []).some(function(segment) {
                    return segmentHitsRect(segment[0], segment[1], segment[2], segment[3], {
                        left: box.left - 2, right: box.right + 2, top: box.top - 2, bottom: box.bottom + 2
                    });
                });
                if (hitsLine) return false;
                chosen = Object.assign({ placement: placement }, box);
                return true;
            });
            if (!chosen && label.required) {
                var forced = labelBox(label.point, label.width, label.height, label.placements[0], context.offset);
                var shiftX = Math.max(0, context.bounds.left - forced.left) - Math.max(0, forced.right - context.bounds.right);
                var shiftY = Math.max(0, context.bounds.top - forced.top) - Math.max(0, forced.bottom - context.bounds.bottom);
                forced.left += shiftX; forced.right += shiftX; forced.top += shiftY; forced.bottom += shiftY;
                if (!placed.some(function(other) { return rectsOverlap(forced, other, 1); })) {
                    chosen = Object.assign({ placement: label.placements[0] }, forced);
                }
            }
            if (chosen) placed.push(chosen);
            result[label.index] = chosen;
        });
        return result;
    }

    // ---------- trend ----------
    function isRange(item) {
        return Number.isFinite(item.low) && Number.isFinite(item.high) && item.low < item.high;
    }

    function categoryTickPlan(kit, labels, positions, style) {
        var widths = labels.map(function(label) { return kit.measure(label, style); });
        var gap = 14 * kit.k;
        var step = 1;
        var count = labels.length;
        function fits(candidate) {
            var previousEnd = -Infinity;
            for (var index = 0; index < count; index += candidate) {
                var start = positions[index] - widths[index] / 2;
                if (start < previousEnd + gap) return false;
                previousEnd = positions[index] + widths[index] / 2;
            }
            return true;
        }
        while (step < count && !fits(step)) step += 1;
        var shown = [];
        for (var index = 0; index < count; index += step) shown.push(index);
        var last = count - 1;
        if (shown[shown.length - 1] !== last) {
            var previous = shown[shown.length - 1];
            if (positions[last] - widths[last] / 2 < positions[previous] + widths[previous] / 2 + gap) shown.pop();
            shown.push(last);
        }
        return shown;
    }

    function drawEvents(kit, events, labels, positions, top, bottom) {
        (events || []).forEach(function(event, index) {
            var after = labels.indexOf(event.afterLabel);
            if (after < 0) return;
            var next = positions[Math.min(after + 1, positions.length - 1)];
            var x = after === positions.length - 1 ? positions[after] : (positions[after] + next) / 2;
            var color = !event.tone || event.tone === 'neutral' ? '#2a3138' : TONES[event.tone] || '#2a3138';
            var group = 'event-' + index;
            kit.node('line', {
                x1: x, x2: x, y1: top + 4 * kit.k, y2: bottom,
                stroke: color, 'stroke-width': 1.5,
                'stroke-dasharray': event.lineStyle === 'line' ? null : '5 5',
                'data-tochnyi-mark': 'reference-line', 'data-label-group': group
            });
            var width = kit.measure(event.label, STYLES.reference);
            var toRight = x + 8 * kit.k + width <= kit.width;
            kit.text(toRight ? x + 8 * kit.k : x - 8 * kit.k, top + kit.size(STYLES.reference) + (index % 2) * kit.size(STYLES.reference) * 1.4,
                event.label, STYLES.reference, {
                    anchor: toRight ? 'start' : 'end', fill: color, role: 'reference-label', group: group
                });
        });
    }

    function drawTrend(kit) {
        var spec = kit.spec;
        var k = kit.k;
        var env = kit.env;
        var data = env.preparedData(spec);
        var references = spec.references || [];
        var seriesNames = [];
        data.forEach(function(item) {
            var name = item.group || '';
            if (seriesNames.indexOf(name) < 0) seriesNames.push(name);
        });
        var grouped = seriesNames.length > 1;
        var labels = [];
        data.forEach(function(item) { if (labels.indexOf(item.label) < 0) labels.push(item.label); });
        var series = seriesNames.map(function(name, index) {
            return {
                name: name,
                color: grouped ? seriesColor(index) : TONES.primary,
                items: data.filter(function(item) { return (item.group || '') === name; })
            };
        });
        var count = labels.length;
        var independent = grouped && spec.options.independentYAxes === true && series.length <= 3;
        kit.report('data-trend-series-count', series.length);
        kit.report('data-trend-y-axis-mode', independent ? 'independent' : 'shared');
        // A short single series always states its first and last reading: the image
        // has to carry the values the title is about. showLabels false only drops
        // the readings in between.
        var endpointsOnly = !grouped && spec.options.showLabels === false && count <= 12;
        var showLabels = (spec.options.showLabels !== false || endpointsOnly) && !grouped;
        var showPoints = spec.options.showPoints !== false && count <= 60;

        var referenceValues = [];
        references.forEach(function(reference) {
            referenceValues.push(reference.value);
            if (typeof reference.endValue === 'number') referenceValues.push(reference.endValue);
        });
        var tickTarget = kit.height < 360 ? 3 : 5;
        var axes = independent
            ? series.map(function(entry) {
                return valueAxis(spec.measure, entry.items.map(function(item) { return item.value; }), tickTarget, { padding: 0.18 });
            })
            : [valueAxis(spec.measure, data.reduce(function(values, item) {
                values.push(item.value);
                if (!grouped && isRange(item)) values.push(item.low, item.high);
                return values;
            }, []).concat(referenceValues), tickTarget, { padding: 0.18 })];

        // ----- frame -----
        var legendHeight = 0;
        var header = drawHeaderBand(kit, { caption: independent ? '' : undefined });
        if (independent) {
            var legendX = 0;
            series.forEach(function(entry) {
                kit.node('line', {
                    x1: legendX, x2: legendX + 22 * k, y1: header + 12 * k, y2: header + 12 * k,
                    stroke: entry.color, 'stroke-width': 3, 'stroke-linecap': 'round'
                });
                kit.text(legendX + 30 * k, header + 17 * k, entry.name, STYLES.legend, { fill: textColor(entry.color), role: 'legend-label' });
                legendX += 30 * k + kit.measure(entry.name, STYLES.legend) + 28 * k;
            });
            legendHeight = 30 * k;
        }
        var left = tickGutter(kit, axes[0], spec.measure);
        var rightGutter = 0;
        var endLabels = [];
        if (independent) {
            rightGutter = axes.slice(1).reduce(function(total, axis) { return total + tickGutter(kit, axis, spec.measure) + 6 * k; }, 0);
        } else if (grouped) {
            endLabels = series.map(function(entry) {
                var firstItem = entry.items[0];
                var lastItem = entry.items[entry.items.length - 1];
                return {
                    name: entry.name,
                    value: lastItem ? lastItem.display : '',
                    change: firstItem && lastItem && firstItem !== lastItem
                        ? deltaText(firstItem.value, lastItem.value, spec.measure) : ''
                };
            });
            // Sparse charts label the last reading on the line like every other reading,
            // so the gutter only names the series and its change.
            var readingsOnLines = count <= 6 && series.length <= 3;
            rightGutter = Math.min(kit.width * 0.26, Math.max.apply(null, endLabels.map(function(entry) {
                var changeWidth = entry.change ? kit.measure('  ' + entry.change, STYLES.legend) : 0;
                return readingsOnLines
                    ? kit.measure(entry.name, STYLES.legend) + changeWidth
                    : Math.max(kit.measure(entry.name, STYLES.legend), kit.measure(entry.value, STYLES.value) + changeWidth);
            })) + 18 * k);
        } else {
            rightGutter = referenceGutter(kit, references, spec.measure) || 18 * k;
        }
        var sparseGrouped = grouped && !independent && count <= 6 && series.length <= 3;
        var top = header + legendHeight + (showLabels || sparseGrouped ? 34 * k : 14 * k);
        var bottom = kit.height - 34 * k;
        var right = kit.width - rightGutter;
        var inset = count > 1 ? Math.min(46 * k, (right - left) / (count * 2)) : (right - left) / 2;
        var positions = labels.map(function(label, index) {
            return count > 1 ? left + inset + index * (right - left - inset * 2) / (count - 1) : left + inset;
        });
        var yFor = function(axis) {
            return function(value) { return bottom - axis.position(value) * (bottom - top); };
        };
        var y = yFor(axes[0]);

        drawHorizontalGrid(kit, axes[0], y, left, right, spec.measure, {
            fill: independent ? textColor(series[0].color) : undefined
        });
        if (independent) {
            var offset = right;
            axes.slice(1).forEach(function(axis, index) {
                var gutterWidth = tickGutter(kit, axis, spec.measure);
                var axisY = yFor(axis);
                axis.ticks.forEach(function(tick) {
                    kit.text(offset + 10 * k, axisY(tick) + kit.size(STYLES.tick) * 0.34, tickText(tick, spec.measure, axis), STYLES.tick, {
                        role: 'axis-label', fill: textColor(series[index + 1].color)
                    });
                });
                offset += gutterWidth + 6 * k;
            });
        }
        if (axes[0].minimum !== 0 || axes[0].logarithmic) {
            kit.node('line', { x1: left, x2: right, y1: bottom, y2: bottom, stroke: '#aab3bc', 'stroke-width': 1 });
        }

        var tickIndexes = categoryTickPlan(kit, labels, positions, STYLES.tick);
        tickIndexes.forEach(function(index) {
            var width = kit.measure(labels[index], STYLES.tick);
            var x = clamp(positions[index], width / 2, kit.width - width / 2);
            kit.text(x, bottom + 24 * k, labels[index], STYLES.tick, { anchor: 'middle', role: 'axis-label', fill: '#3d454d' });
        });

        if (!independent) drawHorizontalReferences(kit, references, y, left, right, spec.measure);
        drawEvents(kit, spec.events, labels, positions, top - (showLabels ? 20 * k : 0), bottom);

        // ----- lines -----
        var allPoints = [];
        var segments = [];
        series.forEach(function(entry, seriesIndex) {
            var axisY = independent ? yFor(axes[seriesIndex]) : y;
            entry.points = entry.items.map(function(item) {
                var point = {
                    x: positions[labels.indexOf(item.label)],
                    y: axisY(item.value),
                    r: 5 * k,
                    item: item
                };
                return point;
            });
            for (var index = 1; index < entry.points.length; index += 1) {
                segments.push([entry.points[index - 1].x, entry.points[index - 1].y, entry.points[index].x, entry.points[index].y]);
            }
            var path = entry.points.map(function(point, index) {
                return (index ? 'L' : 'M') + round(point.x) + ',' + round(point.y);
            }).join(' ');
            if (!grouped && axes[0].minimum === 0 && !axes[0].logarithmic && entry.points.length > 1) {
                kit.node('path', {
                    d: path + ' L' + round(entry.points[entry.points.length - 1].x) + ',' + round(bottom) +
                        ' L' + round(entry.points[0].x) + ',' + round(bottom) + ' Z',
                    fill: entry.color, 'fill-opacity': 0.08
                });
            }
            if (!grouped) {
                entry.points.forEach(function(point) {
                    if (!isRange(point.item)) return;
                    kit.node('line', {
                        x1: point.x, x2: point.x, y1: axisY(point.item.high), y2: axisY(point.item.low),
                        stroke: entry.color, 'stroke-opacity': 0.28, 'stroke-width': 14 * k, 'stroke-linecap': 'round'
                    });
                });
            }
            kit.node('path', {
                d: path, fill: 'none', stroke: entry.color,
                'stroke-width': count > 90 ? 2 : 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
            });
            allPoints = allPoints.concat(entry.points);
        });

        series.forEach(function(entry, seriesIndex) {
            entry.points.forEach(function(point, index) {
                var item = point.item;
                var last = index === entry.points.length - 1;
                // In a multi-series chart color identifies the series, so point tones are not applied.
                var toned = Boolean(item.tone) && !grouped;
                if (!showPoints && !last && !toned) return;
                var accent = toned || (last && !grouped);
                var radius = (accent ? 6 : count > 30 ? 3 : 4.5) * k;
                point.r = radius;
                var color = grouped ? entry.color : toneColor(item.tone, entry.color);
                var mark = kit.node('circle', {
                    cx: point.x, cy: point.y, r: radius,
                    fill: color, stroke: '#ffffff', 'stroke-width': 1.5,
                    'data-tochnyi-mark': 'point', 'data-label-group': 'point-' + seriesIndex + '-' + index
                });
                kit.title(mark, (entry.name ? entry.name + ', ' : '') + item.label + ': ' + item.display);
            });
        });

        // ----- value labels (single series) -----
        if (showLabels) {
            var points = series[0].points;
            var numbers = points.map(function(point) { return point.item.value; });
            var highest = Math.max.apply(null, numbers);
            var lowest = Math.min.apply(null, numbers);
            var candidates = points.map(function(point, index) {
                var item = point.item;
                var previous = index > 0 ? numbers[index - 1] : numbers[index];
                var next = index < numbers.length - 1 ? numbers[index + 1] : numbers[index];
                var last = index === points.length - 1;
                var first = index === 0;
                var extreme = item.value === highest || item.value === lowest;
                var turning = !first && !last && (item.value - previous) * (next - item.value) < 0;
                var priority = last ? 100 : item.tone ? 95 : first ? 90 : extreme ? 85 : turning ? 60 : 30;
                var style = last ? Object.assign({}, STYLES.value, { size: 21 }) : STYLES.value;
                var peak = item.value >= previous && item.value >= next;
                var trough = item.value <= previous && item.value <= next && !peak;
                var placements = trough
                    ? ['below', 'above', 'below-right', 'below-left', 'above-right', 'above-left', 'right', 'left']
                    : ['above', 'below', 'above-left', 'above-right', 'below-right', 'below-left', 'right', 'left'];
                var note = item.annotation || '';
                var annotationWidth = note ? kit.measure(note, STYLES.small) : 0;
                var anchor = point;
                if (isRange(item)) {
                    // A range's reading clears the bar: above its top, or below its bottom at a trough.
                    anchor = Object.assign({}, point, { y: y(trough ? item.low : item.high) });
                    placements = [trough ? 'below' : 'above'];
                }
                return {
                    note: note,
                    index: index,
                    point: anchor,
                    priority: priority,
                    required: last,
                    style: style,
                    placements: placements,
                    width: Math.max(kit.measure(item.display, style), annotationWidth),
                    height: kit.size(style) * 0.95 + (note ? kit.size(STYLES.small) * 1.25 : 0)
                };
            });
            if (count > 14) candidates = candidates.filter(function(candidate) { return candidate.priority >= 85; });
            if (endpointsOnly) {
                candidates = candidates.filter(function(candidate) {
                    return candidate.index === 0 || candidate.index === points.length - 1;
                });
            }
            var boxes = placePointLabels(candidates, {
                offset: 11 * k,
                points: allPoints,
                segments: segments,
                bounds: { left: left - 4, right: kit.width, top: header + legendHeight, bottom: bottom - 2 }
            });
            var visible = candidates.filter(function(candidate) { return boxes[candidate.index]; });
            kit.report('data-trend-label-layout', 'measured');
            kit.report('data-trend-label-visible-count', visible.length);
            kit.report('data-trend-label-visible-indices', visible.map(function(candidate) { return candidate.index; }).join(','));
            kit.report('data-trend-label-line-overlaps', visible.filter(function(candidate) {
                var box = boxes[candidate.index];
                return segments.some(function(segment) { return segmentHitsRect(segment[0], segment[1], segment[2], segment[3], box); });
            }).length);
            // Labels set directly above or below a point are centered on it.
            kit.report('data-trend-label-center-error', round(Math.max.apply(null, visible.map(function(candidate) {
                var box = boxes[candidate.index];
                if (box.placement !== 'above' && box.placement !== 'below') return 0;
                return Math.abs((box.left + box.right) / 2 - candidate.point.x);
            }).concat([0]))));
            candidates.forEach(function(candidate) {
                var box = boxes[candidate.index];
                if (!box) return;
                var item = candidate.point.item;
                var size = kit.size(candidate.style);
                var color = item.tone ? textColor(toneColor(item.tone, INK)) : INK;
                var group = 'point-0-' + candidate.index;
                kit.text((box.left + box.right) / 2, box.top + size * 0.82, item.display, candidate.style, {
                    anchor: 'middle', fill: color, role: 'point-value', group: group
                });
                if (candidate.note) {
                    kit.text((box.left + box.right) / 2, box.bottom - 2 * k, candidate.note, STYLES.small, {
                        anchor: 'middle', role: 'point-value', group: group
                    });
                }
            });
        }

        // ----- sparse multi-series: label every reading on its line, the last one included,
        // so all readings share one placement rule -----
        if (sparseGrouped) {
            var readingStyle = Object.assign({}, STYLES.small, { size: 15, weight: 600 });
            var readings = [];
            series.forEach(function(entry, seriesIndex) {
                entry.points.forEach(function(point, pointIndex) {
                    var others = series.filter(function(other) { return other !== entry; }).map(function(other) {
                        var match = other.points.filter(function(candidate) { return candidate.x === point.x; })[0];
                        return match ? match.y : null;
                    }).filter(function(value) { return value !== null; });
                    // The higher line labels above itself, the lower one below, so pairs never stack.
                    var above = !others.length || others.every(function(otherY) { return point.y <= otherY; });
                    readings.push({
                        index: readings.length,
                        point: point,
                        seriesIndex: seriesIndex,
                        pointIndex: pointIndex,
                        color: textColor(entry.color),
                        priority: 50,
                        required: false,
                        placements: above
                            ? ['above', 'above-right', 'above-left', 'below']
                            : ['below', 'below-right', 'below-left', 'above'],
                        width: kit.measure(point.item.display, readingStyle),
                        height: kit.size(readingStyle) * 0.95
                    });
                });
            });
            var readingBoxes = placePointLabels(readings, {
                offset: 11 * k,
                points: allPoints,
                segments: segments,
                bounds: { left: left - 4, right: right, top: header + legendHeight, bottom: bottom - 2 }
            });
            readings.forEach(function(reading) {
                var box = readingBoxes[reading.index];
                if (!box) return;
                kit.text((box.left + box.right) / 2, box.top + kit.size(readingStyle) * 0.82, reading.point.item.display, readingStyle, {
                    anchor: 'middle', fill: reading.color, role: 'point-value',
                    group: 'point-' + reading.seriesIndex + '-' + reading.pointIndex
                });
            });
        }

        // ----- direct series labels (grouped) -----
        if (grouped && !independent) {
            var nameSize = kit.size(STYLES.legend);
            var blockHeight = nameSize * (sparseGrouped ? 1.5 : 3);
            var targets = series.map(function(entry, index) {
                var lastPoint = entry.points[entry.points.length - 1];
                return { index: index, y: lastPoint ? lastPoint.y : top, anchorY: lastPoint ? lastPoint.y : top };
            }).sort(function(a, b) { return a.y - b.y; });
            targets.forEach(function(target, index) {
                target.y = clamp(target.y, top + blockHeight / 2, bottom - blockHeight / 2);
                if (index) target.y = Math.max(target.y, targets[index - 1].y + blockHeight);
            });
            for (var cursor = targets.length - 1; cursor >= 0; cursor -= 1) {
                var limit = cursor === targets.length - 1 ? bottom - blockHeight / 2 : targets[cursor + 1].y - blockHeight;
                targets[cursor].y = Math.min(targets[cursor].y, limit);
            }
            targets.forEach(function(target) {
                var entry = series[target.index];
                var x = right + 14 * k;
                var endLabel = endLabels[target.index];
                if (sparseGrouped) {
                    var nameBaseline = target.y + nameSize * 0.34;
                    kit.text(x, nameBaseline, entry.name, STYLES.legend, {
                        fill: textColor(entry.color), role: 'legend-label'
                    });
                    if (endLabel.change) {
                        kit.text(x + kit.measure(entry.name, STYLES.legend) + 8 * k, nameBaseline, endLabel.change, STYLES.legend, {
                            fill: textColor(entry.color), role: 'series-change'
                        });
                    }
                    return;
                }
                kit.text(x, target.y - 3 * k, entry.name, STYLES.legend, {
                    fill: textColor(entry.color), role: 'legend-label'
                });
                kit.text(x, target.y + nameSize * 1.0, endLabel.value, STYLES.value, {
                    role: 'point-value', group: 'point-' + target.index + '-' + (entry.points.length - 1)
                });
                if (endLabel.change) {
                    kit.text(x + kit.measure(endLabel.value, STYLES.value) + 9 * k, target.y + nameSize * 1.0, endLabel.change, STYLES.legend, {
                        fill: textColor(entry.color), role: 'series-change'
                    });
                }
            });
        }
    }

    // ---------- stacked trend ----------
    function drawStackedTrend(kit) {
        var spec = kit.spec;
        var k = kit.k;
        var env = kit.env;
        var periods = spec.data;
        var count = periods.length;
        var categories = (periods[0].segments || []).map(function(segment) { return segment.label; });
        var colors = categories.map(function(name, index) {
            var segment = periods[0].segments[index];
            return toneColor(segment.tone, seriesColor(index));
        });
        var totals = periods.map(function(period) {
            return period.segments.reduce(function(sum, segment) { return sum + segment.value; }, 0);
        });
        var axis = valueAxis(spec.measure, totals, kit.height < 360 ? 3 : 5, { zero: true });
        var showLabels = spec.options.showLabels !== false;
        var decimals = spec.measure.decimals || 0;

        var direct = !kit.compact && categories.length <= 6;
        var header = drawHeaderBand(kit);
        var legendHeight = 0;
        if (!direct) {
            var legendX = 0;
            var legendRow = 0;
            categories.forEach(function(name, index) {
                var entryWidth = 22 * k + kit.measure(name, STYLES.small) + 20 * k;
                if (legendX > 0 && legendX + entryWidth > kit.width) { legendX = 0; legendRow += 1; }
                var rowY = header + legendRow * 24 * k;
                kit.node('rect', { x: legendX, y: rowY + 3 * k, width: 14 * k, height: 14 * k, rx: 3, fill: colors[index] });
                kit.text(legendX + 21 * k, rowY + 15 * k, name, STYLES.small, { fill: INK, role: 'legend-label' });
                legendX += entryWidth;
            });
            legendHeight = (legendRow + 1) * 24 * k + 8 * k;
        }
        var left = tickGutter(kit, axis, spec.measure);
        var directWidth = direct ? Math.min(kit.width * 0.24, Math.max.apply(null, categories.map(function(name) {
            return kit.measure(name, STYLES.legend);
        })) + 22 * k) : 0;
        var right = kit.width - directWidth;
        var top = header + legendHeight + 30 * k;
        var bottom = kit.height - 34 * k;
        var y = function(value) { return bottom - axis.position(value) * (bottom - top); };
        var slot = (right - left) / count;
        var barWidth = Math.min(slot * 0.68, 150 * k);
        var positions = periods.map(function(period, index) { return left + slot * index + slot / 2; });

        drawHorizontalGrid(kit, axis, y, left, right, spec.measure);
        var labels = periods.map(function(period) { return period.label; });
        categoryTickPlan(kit, labels, positions, STYLES.tick).forEach(function(index) {
            kit.text(positions[index], bottom + 24 * k, labels[index], STYLES.tick, {
                anchor: 'middle', role: 'axis-label', fill: '#3d454d'
            });
        });

        var lastCenters = [];
        periods.forEach(function(period, periodIndex) {
            var running = 0;
            var x = positions[periodIndex] - barWidth / 2;
            period.segments.forEach(function(segment, segmentIndex) {
                var from = y(running);
                running += segment.value;
                var to = y(running);
                var group = 'segment-' + periodIndex + '-' + segmentIndex;
                if (periodIndex === count - 1) lastCenters[segmentIndex] = { y: (from + to) / 2, height: from - to };
                if (segment.value <= 0) return;
                var mark = kit.node('rect', {
                    x: x, y: to, width: barWidth, height: Math.max(from - to - 1, 0.5),
                    fill: colors[segmentIndex], 'data-tochnyi-mark': 'column', 'data-label-group': group, 'fill-opacity': markOpacity()
                });
                kit.title(mark, period.label + ', ' + segment.label + ': ' + (segment.displayValue || env.formatNumber(segment.value, decimals)));
                var text = segment.displayValue || env.formatNumber(segment.value, decimals);
                var size = kit.size(STYLES.small);
                if (showLabels && count <= 14 && from - to >= size * 1.5 && kit.measure(text, STYLES.small) < barWidth - 6) {
                    kit.text(positions[periodIndex], (from + to) / 2 + size * 0.34, text, STYLES.small, {
                        anchor: 'middle', fill: inkOn(colors[segmentIndex]), role: 'bar-value', group: group
                    });
                }
            });
            if (showLabels) {
                var totalText = period.displayValue || env.formatMeasureValue(totals[periodIndex], spec.measure);
                var totalStyle = kit.fitStyle(totalText, STYLES.value, slot - 6 * k, 12);
                if (kit.measure(totalText, totalStyle) > slot - 6 * k) {
                    totalText = env.formatNumber(totals[periodIndex], decimals);
                }
                kit.text(positions[periodIndex], y(totals[periodIndex]) - 9 * k, totalText, totalStyle, {
                    anchor: 'middle', role: 'bar-value', group: 'total-' + periodIndex
                });
            }
        });

        drawEvents(kit, spec.events, labels, positions, top - 26 * k, bottom);

        if (direct) {
            var size = kit.size(STYLES.legend);
            var entries = categories.map(function(name, index) {
                return { index: index, y: lastCenters[index] ? lastCenters[index].y : bottom };
            }).sort(function(a, b) { return a.y - b.y; });
            entries.forEach(function(entry, index) {
                if (index) entry.y = Math.max(entry.y, entries[index - 1].y + size * 1.3);
            });
            for (var cursor = entries.length - 1; cursor >= 0; cursor -= 1) {
                var limit = cursor === entries.length - 1 ? bottom : entries[cursor + 1].y - size * 1.3;
                entries[cursor].y = Math.min(entries[cursor].y, limit);
            }
            var edge = positions[count - 1] + barWidth / 2;
            entries.forEach(function(entry) {
                var anchorY = lastCenters[entry.index] ? lastCenters[entry.index].y : entry.y;
                kit.node('path', {
                    d: 'M' + round(edge + 4 * k) + ',' + round(anchorY) + ' L' + round(right + 4 * k) + ',' + round(entry.y) +
                        ' H' + round(right + 10 * k),
                    fill: 'none', stroke: colors[entry.index], 'stroke-width': 1.25
                });
                kit.text(right + 15 * k, entry.y + size * 0.34, categories[entry.index], STYLES.legend, {
                    fill: textColor(colors[entry.index]), role: 'legend-label'
                });
            });
        }
    }

    // ---------- donut ----------
    function drawDonut(kit) {
        var spec = kit.spec;
        var k = kit.k;
        var data = kit.env.preparedData(spec);
        var total = data.reduce(function(sum, item) { return sum + item.value; }, 0);
        var showLabels = spec.options.showLabels !== false;
        var nameStyle = STYLES.category;
        var valueStyle = Object.assign({}, STYLES.valueLarge, { size: 26 });
        var labelWidth = Math.max.apply(null, data.map(function(item) {
            return Math.max(kit.measure(item.label, nameStyle), kit.measure(item.display, valueStyle));
        }));
        labelWidth = Math.min(labelWidth, kit.width * 0.3);
        var cx = kit.width / 2;
        var cy = kit.height / 2;
        var radius = Math.max(60, Math.min(kit.height / 2 - 14 * k, (kit.width - 2 * (labelWidth + 74 * k)) / 2));
        var inner = radius * 0.6;
        var blockHeight = kit.size(nameStyle) * 1.2 + kit.size(valueStyle) * 1.05;

        var angle = -Math.PI / 2;
        var slices = data.map(function(item, index) {
            var sweep = total > 0 ? item.value / total * Math.PI * 2 : 0;
            var slice = {
                item: item,
                index: index,
                start: angle,
                end: angle + sweep,
                middle: angle + sweep / 2,
                color: toneColor(item.tone, seriesColor(index))
            };
            angle += sweep;
            return slice;
        });

        function polar(r, theta) { return [cx + r * Math.cos(theta), cy + r * Math.sin(theta)]; }
        slices.forEach(function(slice) {
            var sweep = slice.end - slice.start;
            if (sweep <= 0) return;
            var end = sweep >= Math.PI * 2 - 1e-6 ? slice.end - 1e-4 : slice.end;
            var large = sweep > Math.PI ? 1 : 0;
            var a = polar(radius, slice.start);
            var b = polar(radius, end);
            var c = polar(inner, end);
            var d = polar(inner, slice.start);
            var mark = kit.node('path', {
                d: 'M' + round(a[0]) + ',' + round(a[1]) +
                    ' A' + round(radius) + ',' + round(radius) + ' 0 ' + large + ' 1 ' + round(b[0]) + ',' + round(b[1]) +
                    ' L' + round(c[0]) + ',' + round(c[1]) +
                    ' A' + round(inner) + ',' + round(inner) + ' 0 ' + large + ' 0 ' + round(d[0]) + ',' + round(d[1]) + ' Z',
                // A ring's bounding box covers the hole, so slices are not registered as
                // collision marks: the center text and outside labels clear them by construction.
                fill: slice.color, stroke: '#ffffff', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'fill-opacity': markOpacity(),
                'data-slice': slice.index
            });
            kit.title(mark, slice.item.label + ': ' + slice.item.display);
        });

        if (spec.primaryMetric && spec.primaryMetric.value) {
            var centerStyle = kit.fitStyle(spec.primaryMetric.value, STYLES.center, inner * 1.5, 20);
            var centerLines = spec.primaryMetric.label ? kit.wrap(spec.primaryMetric.label, STYLES.small, inner * 1.5, 2) : [];
            var smallLeading = kit.size(STYLES.small) * 1.2;
            var centerBaseline = cy + kit.size(centerStyle) * 0.3 - centerLines.length * smallLeading / 2;
            kit.text(cx, centerBaseline, spec.primaryMetric.value, centerStyle, { anchor: 'middle', role: 'center-value' });
            centerLines.forEach(function(line, index) {
                kit.text(cx, centerBaseline + smallLeading * (index + 1) + 2 * k, line, STYLES.small, {
                    anchor: 'middle', role: 'center-label'
                });
            });
        }

        if (!showLabels) return;
        ['right', 'left'].forEach(function(side) {
            var entries = slices.filter(function(slice) {
                return slice.end > slice.start && (Math.cos(slice.middle) >= 0 ? 'right' : 'left') === side;
            }).map(function(slice) {
                return { slice: slice, y: cy + (radius + 22 * k) * Math.sin(slice.middle) };
            }).sort(function(a, b) { return a.y - b.y; });
            var topLimit = blockHeight / 2;
            var bottomLimit = kit.height - blockHeight / 2;
            entries.forEach(function(entry, index) {
                entry.y = clamp(entry.y, topLimit, bottomLimit);
                if (index) entry.y = Math.max(entry.y, entries[index - 1].y + blockHeight + 8 * k);
            });
            for (var cursor = entries.length - 1; cursor >= 0; cursor -= 1) {
                var limit = cursor === entries.length - 1 ? bottomLimit : entries[cursor + 1].y - blockHeight - 8 * k;
                entries[cursor].y = Math.min(entries[cursor].y, limit);
            }
            var sign = side === 'right' ? 1 : -1;
            var textX = cx + sign * (radius + 62 * k);
            entries.forEach(function(entry) {
                var slice = entry.slice;
                var group = 'slice-' + slice.index;
                var from = polar(radius + 5 * k, slice.middle);
                var elbow = polar(radius + 20 * k, slice.middle);
                elbow[1] = entry.y;
                elbow[0] = cx + sign * Math.max(Math.abs(elbow[0] - cx), Math.sqrt(Math.max(0,
                    Math.pow(radius + 14 * k, 2) - Math.pow(Math.min(Math.abs(entry.y - cy), radius + 14 * k), 2))));
                kit.node('path', {
                    d: 'M' + round(from[0]) + ',' + round(from[1]) + ' L' + round(elbow[0]) + ',' + round(elbow[1]) +
                        ' H' + round(textX - sign * 8 * k),
                    fill: 'none', stroke: '#9aa3ab', 'stroke-width': 1.25
                });
                var anchor = side === 'right' ? 'start' : 'end';
                var nameLines = kit.wrap(slice.item.label, nameStyle, labelWidth, 2);
                var nameLeading = kit.size(nameStyle) * 1.15;
                var blockTop = entry.y - (nameLines.length * nameLeading + kit.size(valueStyle)) / 2;
                kit.text(textX, blockTop + kit.size(valueStyle) * 0.8, slice.item.display, valueStyle, {
                    anchor: anchor, fill: textColor(slice.color), role: 'slice-value', group: group
                });
                nameLines.forEach(function(line, index) {
                    kit.text(textX, blockTop + kit.size(valueStyle) + nameLeading * (index + 0.85), line, nameStyle, {
                        anchor: anchor, role: 'slice-label', group: group
                    });
                });
            });
        });
    }

    // ---------- scatter ----------
    // Reported for diagnostics only; the chart draws no fitted line.
    function pearson(xs, ys) {
        var n = xs.length;
        var meanX = xs.reduce(function(sum, value) { return sum + value; }, 0) / n;
        var meanY = ys.reduce(function(sum, value) { return sum + value; }, 0) / n;
        var covariance = 0;
        var varianceX = 0;
        var varianceY = 0;
        for (var index = 0; index < n; index += 1) {
            covariance += (xs[index] - meanX) * (ys[index] - meanY);
            varianceX += Math.pow(xs[index] - meanX, 2);
            varianceY += Math.pow(ys[index] - meanY, 2);
        }
        var denominator = Math.sqrt(varianceX * varianceY);
        return denominator ? covariance / denominator : 0;
    }

    function drawScatter(kit) {
        var spec = kit.spec;
        var k = kit.k;
        var data = kit.env.preparedData(spec);
        var xMeasure = spec.xMeasure || {};
        var yAxis = valueAxis(Object.assign({ baseline: 'auto' }, spec.measure), data.map(function(item) { return item.value; }), 5);
        var xAxis = valueAxis(Object.assign({ baseline: 'auto' }, xMeasure), data.map(function(item) { return item.xValue; }), kit.compact ? 4 : 6);

        var header = drawHeaderBand(kit);
        var left = tickGutter(kit, yAxis, spec.measure);
        var right = kit.width - 18 * k;
        var top = header + 16 * k;
        var xCaption = axisCaption(xMeasure) || xMeasure.quantity || '';
        var bottom = kit.height - (xCaption ? 58 : 34) * k;
        var x = function(value) { return left + xAxis.position(value) * (right - left); };
        var y = function(value) { return bottom - yAxis.position(value) * (bottom - top); };

        drawHorizontalGrid(kit, yAxis, y, left, right, spec.measure);
        xAxis.ticks.forEach(function(tick) {
            kit.node('line', { x1: x(tick), x2: x(tick), y1: top, y2: bottom, stroke: GRID, 'stroke-width': 1 });
            kit.text(x(tick), bottom + 22 * k, tickText(tick, xMeasure, xAxis), STYLES.tick, { anchor: 'middle', role: 'axis-label' });
        });
        kit.node('line', { x1: left, x2: right, y1: bottom, y2: bottom, stroke: '#aab3bc', 'stroke-width': 1 });
        if (xCaption) {
            kit.text(right, kit.height - 6 * k, xCaption + ' →', STYLES.caption, { anchor: 'end', role: 'axis-title' });
        }

        var points = data.map(function(item) {
            return { x: x(item.xValue), y: y(item.value), r: 7.5 * k, item: item };
        });
        kit.report('data-scatter-point-count', data.length);
        kit.report('data-scatter-x-quantity', xMeasure.quantity || '');
        kit.report('data-scatter-y-quantity', spec.measure.quantity || '');
        kit.report('data-scatter-pearson-r', pearson(data.map(function(item) { return item.xValue; }),
            data.map(function(item) { return item.value; })).toFixed(4));
        points.forEach(function(point, index) {
            var color = toneColor(point.item.tone, TONES.primary);
            var mark = kit.node('circle', {
                cx: point.x, cy: point.y, r: point.r, fill: color, 'fill-opacity': 0.92,
                stroke: '#ffffff', 'stroke-width': 1.5,
                'data-tochnyi-mark': 'point', 'data-label-group': 'point-' + index
            });
            kit.title(mark, point.item.label + ': ' + (point.item.xDisplayValue || point.item.xValue) + ', ' + point.item.display);
        });

        if (spec.options.showLabels === false) return;
        var labelStyle = Object.assign({}, STYLES.category, { size: 15.5 });
        var candidates = points.map(function(point, index) {
            return {
                index: index,
                point: point,
                priority: 50 + (point.item.tone ? 20 : 0),
                required: true,
                placements: ['right', 'left', 'above', 'below', 'above-right', 'above-left', 'below-right', 'below-left'],
                width: kit.measure(point.item.label, labelStyle),
                height: kit.size(labelStyle) * 0.95
            };
        });
        var boxes = placePointLabels(candidates, {
            offset: 12 * k,
            points: points,
            bounds: { left: left + 2, right: kit.width, top: header, bottom: bottom - 2 }
        });
        candidates.forEach(function(candidate) {
            var box = boxes[candidate.index];
            if (!box) return;
            kit.text(box.left, box.top + kit.size(labelStyle) * 0.8, candidate.point.item.label, labelStyle, {
                role: 'point-label', group: 'point-' + candidate.index
            });
        });
    }

    // ---------- area squares ----------
    // Side length is the square root of the value, so drawn area is proportional
    // to magnitude. One shared scale sizes every square; none is capped.
    function drawAreaSquares(kit) {
        var k = kit.k;
        var data = kit.env.preparedData(kit.spec).slice().sort(function(a, b) { return b.value - a.value; });
        var maximum = Math.max.apply(null, data.map(function(item) { return item.value; }));
        var ratios = data.map(function(item) { return Math.sqrt(item.value / maximum); });
        var gap = (kit.compact ? 14 : 40) * k;
        var valueStyle = data.length > 5 || kit.compact ? STYLES.value : STYLES.valueLarge;
        var copyHeight = kit.size(valueStyle) * 1.25 + kit.size(STYLES.small) * 2.6;
        var side = Math.min(
            kit.height - copyHeight - 8 * k,
            (kit.width - gap * (data.length - 1)) / ratios.reduce(function(sum, ratio) { return sum + ratio; }, 0)
        );
        var total = ratios.reduce(function(sum, ratio) { return sum + ratio * side; }, 0) + gap * (data.length - 1);
        var x = (kit.width - total) / 2;
        var base = (kit.height - copyHeight + side) / 2;
        var toned = data.some(function(item) { return item.tone; });
        data.forEach(function(item, index) {
            var size = ratios[index] * side;
            var color = toned ? toneColor(item.tone, CONTEXT) : index === 0 ? TONES.primary : shade('#7fa9db', 1);
            var group = 'square-' + index;
            var mark = kit.node('rect', {
                x: x, y: base - size, width: size, height: size, rx: 3, fill: color, 'fill-opacity': markOpacity(),
                'data-tochnyi-mark': 'area', 'data-label-group': group
            });
            kit.title(mark, item.label + ': ' + item.display);
            var center = x + size / 2;
            var room = size + gap - 6 * k;
            var fitted = kit.fitStyle(item.display, valueStyle, room, 12);
            kit.text(center, base + kit.size(valueStyle) * 1.15, item.display, fitted, {
                anchor: 'middle', role: 'area-value', group: group
            });
            kit.wrap(item.label, STYLES.small, room, 2).forEach(function(line, lineIndex) {
                kit.text(center, base + kit.size(valueStyle) * 1.25 + kit.size(STYLES.small) * (1.15 + lineIndex * 1.15), line, STYLES.small, {
                    anchor: 'middle', fill: '#3d454d', role: 'category-label'
                });
            });
            x += size + gap;
        });
    }

    // ---------- entry ----------
    function supports(recipe) {
        return Object.prototype.hasOwnProperty.call(KIT_RECIPES, recipe);
    }

    function render(spec, chartNode, env) {
        var kit = createKit(spec, chartNode, env);
        chartNode.classList.add('tochnyi-kit-stage');
        chartNode.setAttribute('data-chart-engine', 'svg-kit');
        chartNode.appendChild(kit.svg);
        Array.from(chartNode.attributes || []).forEach(function(attribute) {
            if (/^data-(?:trend|column|ranking|scatter)-/.test(attribute.name)) chartNode.removeAttribute(attribute.name);
        });
        KIT_RECIPES[spec.recipe](kit);
        Object.keys(kit.facts).forEach(function(name) { chartNode.setAttribute(name, kit.facts[name]); });
        return { requiredHeight: kit.requiredHeight };
    }

    global.TochnyiSvgCharts = {
        supports: supports,
        render: render,
        tones: TONES
    };
})(window);
