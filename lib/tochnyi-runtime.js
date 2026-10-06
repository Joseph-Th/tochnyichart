/*
 * Tochnyi declarative renderer v2
 * Reads a validated ChartSpec and owns all HTML, SVG, and visual behavior.
 */
(function(global) {
    'use strict';

    var TONE_COLORS = {
        primary: 0x005bbb,
        secondary: 0xffd500,
        warning: 0xcc9900,
        critical: 0xcc0000,
        neutral: 0x666666,
        positive: 0x008844
    };
    var TONE_HEX = {
        primary: '#005bbb',
        secondary: '#cc9900',
        warning: '#d97706',
        critical: '#cc0000',
        neutral: '#666666',
        positive: '#008844'
    };
    var VISUAL_COLORS = {
        muted: 0x82909d,
        mutedLight: 0xaab4bd
    };

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function svgElement(tag, attributes, text) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.keys(attributes || {}).forEach(function(key) { node.setAttribute(key, attributes[key]); });
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function semanticIcon(name, className) {
        var svg = svgElement('svg', {
            viewBox: '0 0 24 24',
            class: className || 'tochnyi-semantic-icon',
            'aria-hidden': 'true',
            focusable: 'false'
        });
        var common = {
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.8',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
        };
        function path(d) { svg.appendChild(svgElement('path', Object.assign({ d: d }, common))); }
        function line(x1, y1, x2, y2) {
            svg.appendChild(svgElement('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2 }, common)));
        }
        switch (name) {
            case 'person':
                svg.appendChild(svgElement('circle', Object.assign({ cx: 12, cy: 7, r: 3 }, common)));
                path('M5.5 21c.7-5 3-7.5 6.5-7.5s5.8 2.5 6.5 7.5');
                break;
            case 'shield':
                path('M12 2.5 20 6v5.5c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6l8-3.5Z');
                path('m8.5 12 2.2 2.2 4.8-5');
                break;
            case 'warehouse':
                path('M2.5 10 12 3l9.5 7v11h-19V10Z');
                path('M7 21v-7h10v7M7 17h10M12 14v7');
                break;
            case 'pause':
                svg.appendChild(svgElement('rect', Object.assign({ x: 6, y: 4, width: 4, height: 16, rx: 1 }, common)));
                svg.appendChild(svgElement('rect', Object.assign({ x: 14, y: 4, width: 4, height: 16, rx: 1 }, common)));
                break;
            case 'exit':
                path('M10 4H4v16h6M14 8l4 4-4 4M8 12h10');
                break;
            case 'money':
                svg.appendChild(svgElement('circle', Object.assign({ cx: 12, cy: 12, r: 9 }, common)));
                path('M15 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1 1.8 3.1 2.3c2 .5 2.9 1.1 2.9 2.4 0 1.4-1.3 2.3-3.2 2.3-1.3 0-2.5-.4-3.4-1.2M12 5.5v13');
                break;
            case 'ship':
                path('M3 14h18l-2.5 5H6L3 14ZM7 14V8h10v6M10 8V4h4v4');
                path('M4 21c1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0 1 .7 2 .7 3 0');
                break;
            case 'fuel':
                path('M5 21V4h10v17M7.5 7h5v5h-5zM15 8h2l2 2v7.5c0 1.8-2.5 1.8-2.5 0V13');
                line(3, 21, 17, 21);
                break;
            case 'factory':
                path('M3 21V10l6 3V9l6 4V6h6v15H3Z');
                path('M7 17h2M12 17h2M17 17h2');
                break;
            case 'warning':
                path('M12 3 22 21H2L12 3Z');
                line(12, 9, 12, 15);
                line(12, 18, 12, 18.1);
                break;
            case 'trend':
                path('m3 17 6-6 4 4 7-8M15 7h5v5');
                break;
            case 'document':
                path('M6 2.5h8l4 4V21H6V2.5ZM14 2.5V7h4M9 11h6M9 15h6');
                break;
            default:
                svg.appendChild(svgElement('circle', Object.assign({ cx: 12, cy: 12, r: 8 }, common)));
                line(12, 8, 12, 13);
                line(12, 16, 12, 16.1);
        }
        return svg;
    }

    function svgBox(node) {
        var box = node.getBBox();
        return {
            left: box.x,
            top: box.y,
            right: box.x + box.width,
            bottom: box.y + box.height,
            width: box.width,
            height: box.height
        };
    }

    function boxesOverlap(first, second, padding) {
        var gap = padding || 0;
        return first.left < second.right + gap &&
            first.right > second.left - gap &&
            first.top < second.bottom + gap &&
            first.bottom > second.top - gap;
    }

    function svgPlacement(anchorX, anchorY, name) {
        var placements = {
            above: { x: anchorX, y: anchorY - 14, anchor: 'middle' },
            below: { x: anchorX, y: anchorY + 25, anchor: 'middle' },
            left: { x: anchorX - 13, y: anchorY + 5, anchor: 'end' },
            right: { x: anchorX + 13, y: anchorY + 5, anchor: 'start' },
            'above-left': { x: anchorX - 10, y: anchorY - 14, anchor: 'end' },
            'above-right': { x: anchorX + 10, y: anchorY - 14, anchor: 'start' },
            'below-left': { x: anchorX - 10, y: anchorY + 25, anchor: 'end' },
            'below-right': { x: anchorX + 10, y: anchorY + 25, anchor: 'start' }
        };
        return placements[name] || placements.above;
    }

    function layoutSvgLabels(svg) {
        if (!svg || !svg.isConnected) return;
        var viewBox = svg.viewBox.baseVal;
        var boundary = {
            left: viewBox.x + 6,
            top: viewBox.y + 6,
            right: viewBox.x + viewBox.width - 6,
            bottom: viewBox.y + viewBox.height - 6
        };
        var fixed = Array.from(svg.querySelectorAll('[data-tochnyi-reserved]')).map(function(node) {
            return { box: svgBox(node), group: node.getAttribute('data-label-group') || '' };
        });
        var marks = Array.from(svg.querySelectorAll('[data-tochnyi-mark]')).map(function(node) {
            return {
                box: svgBox(node),
                group: node.getAttribute('data-label-group') || '',
                kind: node.getAttribute('data-tochnyi-mark') || ''
            };
        });
        var placed = [];
        var labels = Array.from(svg.querySelectorAll('[data-tochnyi-label]')).sort(function(a, b) {
            return Number(b.getAttribute('data-label-priority') || 0) - Number(a.getAttribute('data-label-priority') || 0);
        });

        labels.forEach(function(label) {
            var anchorX = Number(label.getAttribute('data-anchor-x'));
            var anchorY = Number(label.getAttribute('data-anchor-y'));
            var group = label.getAttribute('data-label-group') || '';
            var role = label.getAttribute('data-label-role') || '';
            var candidates = (label.getAttribute('data-label-placements') || 'above,below,right,left').split(',');
            var selected = null;

            label.classList.remove('tochnyi-svg-label-unresolved');
            label.removeAttribute('data-layout-overlap');

            candidates.some(function(candidateName) {
                var candidate = svgPlacement(anchorX, anchorY, candidateName.trim());
                label.setAttribute('x', candidate.x);
                label.setAttribute('y', candidate.y);
                label.setAttribute('text-anchor', candidate.anchor);
                var box = svgBox(label);
                var inside = box.left >= boundary.left && box.right <= boundary.right && box.top >= boundary.top && box.bottom <= boundary.bottom;
                if (!inside) return false;
                var blockedByText = fixed.concat(placed).some(function(entry) {
                    return boxesOverlap(box, entry.box, 4);
                });
                if (blockedByText) return false;
                var blockedByMark = marks.some(function(entry) {
                    var ownAnchor = entry.group === group && (
                        role === 'point-value' && entry.kind === 'point' ||
                        role === 'range-value' && ['range', 'range-start', 'range-end'].indexOf(entry.kind) >= 0
                    );
                    if (ownAnchor) return false;
                    return boxesOverlap(box, entry.box, 3);
                });
                if (blockedByMark) return false;
                selected = box;
                label.setAttribute('data-label-placement', candidateName.trim());
                return true;
            });

            if (!selected) {
                var fallback = svgPlacement(anchorX, anchorY, candidates[0].trim());
                label.setAttribute('x', fallback.x);
                label.setAttribute('y', fallback.y);
                label.setAttribute('text-anchor', fallback.anchor);
                selected = svgBox(label);
                label.classList.add('tochnyi-svg-label-unresolved');
                label.setAttribute('data-layout-overlap', 'true');
            }
            placed.push({ box: selected, group: group });
        });
        svg.setAttribute('data-label-layout', 'complete');
    }

    function scheduleSvgLabelLayout(svg) {
        layoutSvgLabels(svg);
        setTimeout(function() { layoutSvgLabels(svg); }, 80);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() { layoutSvgLabels(svg); });
        }
    }

    // Brand images are embedded in the generated HTML as data URIs (self-contained shell).
    function assetUrl(filename) {
        var assets = global.TOCHNYI_ASSETS || {};
        if (!assets[filename]) throw new Error('Embedded asset is missing: ' + filename);
        return assets[filename];
    }

    function formatNumber(value, decimals) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    function valueSuffix(measure) {
        if (measure.suffix !== undefined) return measure.suffix;
        if (!measure.unit) return '';
        return measure.unit === '%' ? '%' : ' ' + measure.unit;
    }

    function formatValue(item, spec) {
        if (item.displayValue) return item.displayValue;
        if (typeof item.value !== 'number') return '';
        var measure = spec.measure || {};
        return (measure.prefix || '') + formatNumber(item.value, measure.decimals || 0) + valueSuffix(measure);
    }

    function formatRawValue(value, spec) {
        var measure = spec.measure || {};
        return (measure.prefix || '') + formatNumber(value, measure.decimals || 0) + valueSuffix(measure);
    }

    function formatMeasureValue(value, measure) {
        var active = measure || {};
        return (active.prefix || '') + formatNumber(value, active.decimals || 0) + valueSuffix(active);
    }

    function formatRangeValue(low, high, spec) {
        var measure = spec.measure || {};
        return (measure.prefix || '') +
            formatNumber(low, measure.decimals || 0) + '–' +
            formatNumber(high, measure.decimals || 0) +
            valueSuffix(measure);
    }

    function colorFor(item, index) {
        if (item.tone && TONE_COLORS[item.tone] !== undefined) return TONE_COLORS[item.tone];
        return Tochnyi.palette[index % Tochnyi.palette.length];
    }

    function preparedData(spec) {
        var data = spec.data.map(function(item, index) {
            return Object.assign({}, item, {
                display: formatValue(item, spec),
                color: colorFor(item, index)
            });
        });
        if (spec.options.sort === 'ascending') data.sort(function(a, b) { return (a.value || 0) - (b.value || 0); });
        if (spec.options.sort === 'descending') data.sort(function(a, b) { return (b.value || 0) - (a.value || 0); });
        return data;
    }

    function visualPlan(spec, data) {
        if (global.TochnyiVisualPlan && global.TochnyiVisualPlan.resolveVisualPlan) {
            return global.TochnyiVisualPlan.resolveVisualPlan(spec, data, global.innerWidth || 1200);
        }
        return {
            density: spec.narrative.density,
            titleAlign: spec.narrative.density === 'minimal' ? 'center' : 'left',
            compact: (global.innerWidth || 1200) <= 600,
            chartHeight: spec.options.height === 'tall' ? 700 : spec.options.height === 'short' ? 400 : 550,
            minimumChartHeight: 350,
            canShrinkChart: true,
            labelMode: spec.options.labelMode || 'auto',
            showAxisTitle: true,
            showGrid: true,
            categoryLabelWidth: 260,
            colorPolicy: 'semantic',
            accentSecond: false,
            watermark: 'standard'
        };
    }

    function columnLabelPlacement(item, bounds, plan, metrics) {
        if (global.TochnyiVisualPlan && global.TochnyiVisualPlan.columnLabelPlacement) {
            return global.TochnyiVisualPlan.columnLabelPlacement(item, bounds, plan, metrics);
        }
        var positive = item.value >= 0;
        return {
            inside: false,
            locationY: 1,
            centerYPercent: positive ? 100 : 0,
            dy: positive ? -10 : 10
        };
    }

    function fitCaptureRequested() {
        try {
            return new URLSearchParams(global.location.search).get('fit') === '1';
        } catch (error) {
            return false;
        }
    }

    function requestedCaptureHeight() {
        try {
            var value = Number(new URLSearchParams(global.location.search).get('captureHeight'));
            return Number.isFinite(value) && value > 0 ? value : global.innerHeight;
        } catch (error) {
            return global.innerHeight;
        }
    }

    function fitScaffoldToViewport(main, chartContainer, plan) {
        if (!fitCaptureRequested() || global.innerWidth < 900) return;
        var bodyStyle = global.getComputedStyle(document.body);
        var bottomPadding = parseFloat(bodyStyle.paddingBottom) || 0;
        var allowedBottom = requestedCaptureHeight() - bottomPadding;
        var mainBottom = main.getBoundingClientRect().bottom;
        var overflow = Math.ceil(mainBottom - allowedBottom);
        var currentHeight = chartContainer.getBoundingClientRect().height;

        // Recipes that lay out from the measured stage size may also grow into
        // unused canvas so a fixed publishing profile has no dead band below.
        if (overflow < -8 && plan.canFillChart) {
            var grow = -overflow;
            chartContainer.style.height = Math.round(currentHeight + grow) + 'px';
            chartContainer.setAttribute('data-fitted-height', String(Math.round(currentHeight + grow)));
            chartContainer.setAttribute('data-canvas-fit-mode', 'fill');
            chartContainer.setAttribute('data-canvas-fit-delta', String(Math.round(grow)));
            return;
        }
        if (overflow > 0) {
            if (!plan.canShrinkChart) return;
            var minimum = Number(plan.minimumChartHeight) || 350;
            var nextHeight = Math.max(minimum, currentHeight - overflow - 6);
            chartContainer.style.height = Math.round(nextHeight) + 'px';
            chartContainer.setAttribute('data-fitted-height', String(Math.round(nextHeight)));
            chartContainer.setAttribute('data-canvas-fit-mode', 'shrink');
            chartContainer.setAttribute('data-canvas-fit-delta', String(Math.round(nextHeight - currentHeight)));
            if (nextHeight === minimum && overflow > currentHeight - minimum) {
                main.setAttribute('data-fit-exhausted', 'true');
            }
            return;
        }
    }

    function percentText(value) {
        var decimals = Math.abs(value - Math.round(value)) < 0.05 ? 0 : 1;
        return formatNumber(value, decimals) + '%';
    }

    function normalizedCopy(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[−–—]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function compositionFacts(spec, data, total) {
        if (spec.recipe !== 'composition.stacked') return spec.supportingFacts || [];
        var repeatedValues = new Set();
        data.forEach(function(item) {
            repeatedValues.add(normalizedCopy(item.display));
            repeatedValues.add(normalizedCopy(percentText(item.value / total * 100)));
        });
        return (spec.supportingFacts || []).filter(function(fact) {
            return !repeatedValues.has(normalizedCopy(fact.value));
        });
    }

    function compositionAnnotations(spec, visibleFacts) {
        if (spec.recipe === 'trend.line' || spec.recipe === 'comparison.grouped') return [];
        if (spec.recipe === 'composition.stacked' && visibleFacts.length) return [];
        return spec.data.filter(function(item) { return item.annotation; });
    }

    function contextLayoutPlan(spec, data) {
        if (global.TochnyiVisualPlan && global.TochnyiVisualPlan.contextLayoutPlan) {
            return global.TochnyiVisualPlan.contextLayoutPlan(spec, data);
        }
        return {
            annotationMode: data.filter(function(item) { return item.annotation; }).length > 2 ? 'compact' : 'cards',
            compactFacts: false,
            contextLoad: 0,
            budget: 8
        };
    }

    function axisBounds(spec, data) {
        var measure = spec.measure || {};
        var values = [];
        data.forEach(function(item) {
            ['value', 'low', 'high', 'benchmark'].forEach(function(key) {
                if (typeof item[key] === 'number') values.push(item[key]);
            });
        });
        (spec.references || []).forEach(function(reference) {
            values.push(reference.value);
            if (typeof reference.endValue === 'number') values.push(reference.endValue);
        });
        if (!values.length) return { minimum: 0, maximum: 1 };
        var minValue = Math.min.apply(null, values);
        var maxValue = Math.max.apply(null, values);
        var range = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.1, 1);
        var minimum = 0;
        var maximum;

        if (measure.baseline === 'explicit') minimum = measure.minimum;
        else if (measure.scale === 'logarithmic') minimum = Math.max(minValue * 0.65, Number.MIN_VALUE);
        else if (measure.baseline === 'auto') {
            minimum = minValue < 0
                ? minValue - range * 0.25
                : Math.max(0, minValue - range * 0.25);
        }
        else minimum = Math.min(0, minValue);

        if (typeof measure.maximum === 'number') maximum = measure.maximum;
        else maximum = maxValue + Math.max(range * 0.25, Math.abs(maxValue) * 0.12);
        if (measure.baseline === 'zero') maximum = Math.max(0, maximum);
        if (maximum === minimum) maximum = minimum + Math.max(Math.abs(minimum) * 0.2, 1);

        return { minimum: minimum, maximum: maximum };
    }

    function hasInteriorZeroDomain(spec, data) {
        if (spec.measure && spec.measure.scale === 'logarithmic') return false;
        if (spec.recipe === 'flow.waterfall') {
            var current = 0;
            var values = [0];
            (data || []).forEach(function(item) {
                if (item.role === 'start' || item.role === 'subtotal' || item.role === 'end') current = item.value;
                else current += item.value;
                values.push(current);
            });
            return Math.min.apply(null, values) < 0 && Math.max.apply(null, values) > 0;
        }
        var bounds = axisBounds(spec, data || []);
        return bounds.minimum < 0 && bounds.maximum > 0;
    }

    // "2026-01-27" reads as "27 January 2026" in the header; anything else is shown as written.
    function formatDisplayDate(value) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
        if (!match) return String(value || '');
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December'];
        return Number(match[3]) + ' ' + months[Number(match[2]) - 1] + ' ' + match[1];
    }

    function createScaffold(spec) {
        var app = document.getElementById('tochnyi-app');
        app.replaceChildren();
        document.body.classList.toggle('tochnyi-regional-page', spec.recipe === 'map.regional');
        var hideBranding = false;
        try {
            hideBranding = new URLSearchParams(global.location.search).get('hideBranding') === '1';
        } catch (error) {}
        document.body.classList.toggle('tochnyi-hide-branding', hideBranding);

        var recipeClass = 'recipe-' + spec.recipe.replace(/\./g, '-');
        var scaffoldData = preparedData(spec);
        var plan = visualPlan(spec, scaffoldData);
        var contextPlan = contextLayoutPlan(spec, scaffoldData);
        var matrixLayout = spec.recipe === 'map.regional' && spec.metadata &&
            spec.metadata.topic === 'synthetic regional routing matrix';
        var main = element(
            'main',
            'tochnyi-chart tochnyi-v2 frame-' + spec.narrative.frame +
            ' density-' + plan.density +
            ' emphasis-' + spec.narrative.emphasis +
            ' title-' + plan.titleAlign +
            ' color-' + plan.colorPolicy +
            ' ' + recipeClass + (matrixLayout ? ' tochnyi-regional-matrix' : '')
        );
        main.setAttribute('data-visual-density', plan.density);
        main.setAttribute('data-color-policy', plan.colorPolicy);
        main.setAttribute(
            'data-output-mode',
            new URLSearchParams(global.location.search).has('static') ? 'static-image' : 'preview'
        );
        main.setAttribute('data-context-load', String(contextPlan.contextLoad));
        main.setAttribute('data-context-budget', String(contextPlan.budget));
        if (contextPlan.contextLoad > contextPlan.budget) main.classList.add('context-compact');
        if (matrixLayout) {
            main.setAttribute('data-layout-mode', 'regional-matrix-widescreen');
            document.body.classList.add('tochnyi-regional-matrix-page');
        }
        var header = element('header', 'tochnyi-header');
        var logo = element('img', 'tochnyi-logo');
        logo.src = assetUrl('tochnyi-logo.png');
        logo.alt = 'Tochnyi';
        header.appendChild(logo);
        header.appendChild(element('div', 'tochnyi-date', formatDisplayDate(spec.date)));
        var title = element('h1', 'tochnyi-title', spec.title);
        var subtitle = spec.subtitle ? element('p', 'tochnyi-subtitle', spec.subtitle) : null;
        if (!matrixLayout) {
            main.appendChild(header);
            main.appendChild(title);
            if (subtitle) main.appendChild(subtitle);
        }

        var chartContainer = element('section', 'tochnyi-chart-container ' + spec.options.height + ' ' + recipeClass);
        if (matrixLayout) {
            chartContainer.classList.add('tochnyi-matrix-stage', 'regional-routing-matrix-stage');
            chartContainer.appendChild(header);
            chartContainer.appendChild(title);
            if (subtitle) chartContainer.appendChild(subtitle);
        }
        chartContainer.setAttribute('aria-label', spec.title);
        chartContainer.style.height = plan.chartHeight + 'px';
        chartContainer.setAttribute('data-planned-height', String(plan.chartHeight));
        chartContainer.setAttribute('data-item-count', String(scaffoldData.length));

        main.setAttribute('data-watermark', plan.watermark);
        if (plan.watermark !== 'none') {
            var watermark = element('img', 'tochnyi-watermark');
            watermark.src = assetUrl('watermark.svg');
            watermark.alt = '';
            watermark.classList.add('watermark-' + plan.watermark);
            chartContainer.appendChild(watermark);
        }

        if (spec.emphasis && !usesSvgKit(spec)) {
            chartContainer.classList.add('has-emphasis');
            var arrow = spec.emphasis.direction === 'up' ? '▲' : spec.emphasis.direction === 'down' ? '▼' : '•';
            var shownValue = spec.emphasis.displayValue !== undefined
                ? spec.emphasis.displayValue
                : spec.emphasis.value !== undefined
                    ? formatNumber(spec.emphasis.value, spec.measure.decimals || 0)
                    : '';
            var badgeText = [arrow, shownValue, spec.emphasis.label].filter(Boolean).join(' ');
            var badge = element('div', 'tochnyi-change-badge ' + spec.emphasis.direction, badgeText);
            var position = spec.emphasis.position || (spec.recipe === 'comparison.change' ? 'between' : 'corner');
            badge.classList.add('position-' + position);
            var emphasisRail = element('div', 'tochnyi-emphasis-rail position-' + position);
            emphasisRail.setAttribute('aria-label', 'Key change');
            emphasisRail.appendChild(badge);
            chartContainer.appendChild(emphasisRail);
        }

        var chart = element('div', 'tochnyi-amchart');
        chart.id = 'chartdiv';
        if (hasInteriorZeroDomain(spec, scaffoldData)) {
            chart.setAttribute('data-zero-reference', 'interior-prominent');
        }
        chartContainer.appendChild(chart);
        main.appendChild(chartContainer);

        if (spec.basis && Array.isArray(spec.basis.items) && spec.basis.items.length) {
            var basisRail = element('section', 'tochnyi-basis-rail');
            basisRail.setAttribute('aria-label', spec.basis.label || 'Tangible basis');
            var basisHeader = element('div', 'tochnyi-basis-header');
            basisHeader.appendChild(element('strong', '', spec.basis.label || (spec.basis.type === 'population' ? 'Population basis' : 'Ratio basis')));
            if (spec.basis.formula) basisHeader.appendChild(element('span', '', spec.basis.formula));
            basisRail.appendChild(basisHeader);
            var basisItems = element('div', 'tochnyi-basis-items');
            spec.basis.items.forEach(function(item, index) {
                var basisItem = element('div', 'tochnyi-basis-item');
                basisItem.setAttribute('data-role', item.role || 'derived');
                basisItem.setAttribute('data-tone', item.tone || ['primary', 'neutral', 'warning', 'secondary'][index] || 'neutral');
                basisItem.appendChild(element('strong', '', item.displayValue));
                basisItem.appendChild(element('span', '', item.label));
                basisItems.appendChild(basisItem);
            });
            basisRail.appendChild(basisItems);
            main.appendChild(basisRail);
        }

        var scaffoldTotal = scaffoldData.reduce(function(sum, item) {
            return sum + (typeof item.value === 'number' ? item.value : 0);
        }, 0);
        var visibleFacts = spec.recipe === 'map.regional' ? [] : compositionFacts(spec, scaffoldData, scaffoldTotal);
        var annotated = compositionAnnotations(spec, visibleFacts);
        if (annotated.length) {
            var annotations = element('section', 'tochnyi-annotation-strip');
            annotations.classList.add(contextPlan.annotationMode === 'compact' ? 'compact-list' : 'card-grid');
            annotations.setAttribute('aria-label', 'Chart annotations');
            annotated.forEach(function(item) {
                var annotation = element('div', 'tochnyi-annotation');
                annotation.setAttribute('data-tone', item.tone || 'neutral');
                annotation.appendChild(element('strong', '', item.label));
                annotation.appendChild(element('span', '', item.annotation));
                annotations.appendChild(annotation);
            });
            main.appendChild(annotations);
        }

        if (visibleFacts.length) {
            var rail = element('section', 'tochnyi-context-rail');
            if (contextPlan.compactFacts) rail.classList.add('compact');
            rail.setAttribute('aria-label', 'Supporting context');
            var factLayouts = visibleFacts.map(function(fact) {
                if (global.TochnyiVisualPlan && global.TochnyiVisualPlan.contextFactLayout) {
                    return global.TochnyiVisualPlan.contextFactLayout(fact);
                }
                return { mode: String(fact && fact.value || '').length > 24 ? 'stacked' : 'inline' };
            });
            if (factLayouts.some(function(layout) { return layout.mode === 'stacked'; })) {
                rail.classList.add('has-stacked-values');
            }
            visibleFacts.forEach(function(fact, index) {
                var tone = fact.tone || ['primary', 'secondary', 'neutral', 'warning'][index] || 'neutral';
                var item = element('div', 'tochnyi-context-item');
                item.setAttribute('data-tone', tone);
                item.setAttribute('data-value-layout', factLayouts[index].mode);
                item.appendChild(element('strong', 'tochnyi-context-value', fact.value));
                item.appendChild(element('span', 'tochnyi-context-label', fact.label));
                rail.appendChild(item);
            });
            main.appendChild(rail);
        }

        // Standard charts carry the note as a centered footnote in the footer;
        // maps keep it below the stage where callout diagnostics expect it.
        var footerNote = Boolean(spec.note) && spec.recipe !== 'map.regional';
        if (spec.note && !footerNote) {
            var note = element('aside', 'tochnyi-note', spec.note);
            if (spec.recipe === 'composition.stacked') note.classList.add('compact');
            main.appendChild(note);
        }

        var bottom = element('div', 'tochnyi-bottom');
        var bottomStart = element('div', 'tochnyi-bottom-start');
        var bottomEnd = element('div', 'tochnyi-bottom-end');
        if (spec.source && spec.source.name) {
            var sourceText = 'Source: ' + spec.source.name + (spec.source.period ? ' — ' + spec.source.period : '');
            var source = element(spec.source.url ? 'a' : 'div', 'tochnyi-source', sourceText);
            if (spec.source.url) {
                source.href = spec.source.url;
                source.rel = 'noopener noreferrer';
            }
            bottomStart.appendChild(source);
            (spec.source.additional || []).forEach(function(extra) {
                var extraText = extra.name + (extra.period ? ' — ' + extra.period : '');
                var extraSource = element(extra.url ? 'a' : 'div', 'tochnyi-source tochnyi-source-additional', extraText);
                if (extra.url) {
                    extraSource.href = extra.url;
                    extraSource.rel = 'noopener noreferrer';
                }
                bottomStart.appendChild(extraSource);
            });
        }
        bottom.appendChild(bottomStart);
        bottom.appendChild(footerNote ? element('div', 'tochnyi-footnote', spec.note) : element('div', 'tochnyi-footnote empty'));
        bottom.appendChild(bottomEnd);

        if (spec.analysis && spec.analysis.name) {
            var analysisText = 'Analysis: ' + spec.analysis.name;
            var analysis = element(spec.analysis.url ? 'a' : 'div', 'tochnyi-analysis', analysisText);
            if (spec.analysis.url) {
                analysis.href = spec.analysis.url;
                analysis.rel = 'noopener noreferrer';
            }
            bottomEnd.appendChild(analysis);
        }

        if (spec.credits && (spec.credits.dataGatheredBy || spec.credits.analysisBy)) {
            var creditParts = [];
            if (spec.credits.dataGatheredBy) creditParts.push('Data gathered by ' + spec.credits.dataGatheredBy);
            if (spec.credits.analysisBy) creditParts.push('Analysis by ' + spec.credits.analysisBy);
            creditParts.forEach(function(part) {
                bottomEnd.appendChild(element('div', 'tochnyi-credits', part));
            });
        }

        if (matrixLayout) chartContainer.appendChild(bottom);
        else main.appendChild(bottom);

        app.appendChild(main);
        fitScaffoldToViewport(main, chartContainer, plan);
        // The webfont changes the title and footer height after the first fit.
        // Stage-measured recipes redraw themselves; the rest only need the stage refitted.
        var stageMeasured = usesSvgKit(spec) || spec.recipe === 'comparison.grouped';
        if (!stageMeasured && spec.recipe !== 'map.regional' && document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() { refitStage(spec, chart); });
        }
        return chart;
    }

    function renderOutcomeIndexRange(spec, chartNode, outcomePlan) {
        chartNode.classList.add('tochnyi-svg-stage', 'tochnyi-outcome-range-stage');
        if (spec.primaryMetric) {
            var metricBlock = element('div', 'tochnyi-range-metric');
            metricBlock.appendChild(element('strong', '', spec.primaryMetric.value));
            metricBlock.appendChild(element('span', '', spec.primaryMetric.label));
            chartNode.appendChild(metricBlock);
        }
        var width = 1000;
        var left = 255;
        var right = 900;
        var top = spec.primaryMetric ? 124 : 72;
        var rowHeight = 82;
        var height = top + outcomePlan.items.length * rowHeight + 54;
        function scale(value) {
            return left + ((value - outcomePlan.minimum) /
                (outcomePlan.maximum - outcomePlan.minimum)) * (right - left);
        }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title + '. Values are shown as a share of the prior period.',
            class: 'tochnyi-range-svg tochnyi-outcome-range-svg',
            'data-label-layout': 'pending'
        });
        for (var tick = 0; tick <= 4; tick += 1) {
            var ratio = tick / 4;
            var raw = outcomePlan.minimum + ratio * (outcomePlan.maximum - outcomePlan.minimum);
            var x = left + ratio * (right - left);
            svg.appendChild(svgElement('line', {
                x1: x, y1: top - 26, x2: x, y2: height - 38, class: 'tochnyi-svg-grid'
            }));
            svg.appendChild(svgElement('text', {
                x: x, y: height - 16, 'text-anchor': 'middle', class: 'tochnyi-svg-tick',
                'data-tochnyi-reserved': 'axis-tick'
            }, formatNumber(raw, spec.measure.decimals || 0) + '%'));
        }
        var baselineX = scale(outcomePlan.baseline);
        svg.appendChild(svgElement('line', {
            x1: baselineX, y1: top - 36, x2: baselineX, y2: height - 38,
            class: 'tochnyi-svg-reference dashed',
            'data-tochnyi-mark': 'reference-line',
            'data-label-group': 'outcome-baseline'
        }));
        svg.appendChild(svgElement('text', {
            x: baselineX - 6, y: top - 40, 'text-anchor': 'end',
            class: 'tochnyi-svg-reference-label',
            'data-tochnyi-reserved': 'reference-label',
            'data-label-group': 'outcome-baseline'
        }, outcomePlan.baselineLabel));

        outcomePlan.items.forEach(function(planned, index) {
            var item = planned.item;
            var y = top + index * rowHeight;
            var tone = item.tone || (planned.direction === 'down' ? 'critical' : 'positive');
            var color = TONE_HEX[tone] || TONE_HEX.primary;
            var group = 'outcome-range-item-' + index;
            var lowX = scale(planned.outcomeLow);
            var highX = scale(planned.outcomeHigh);
            var rangeCenterX = (lowX + highX) / 2;
            svg.appendChild(svgElement('text', {
                x: left - 18, y: y + 6, 'text-anchor': 'end', class: 'tochnyi-svg-label',
                'data-tochnyi-reserved': 'category-label', 'data-label-group': group
            }, item.label));
            svg.appendChild(svgElement('line', {
                x1: left, y1: y, x2: right, y2: y, class: 'tochnyi-svg-track',
                'data-tochnyi-mark': 'track', 'data-label-group': group
            }));
            if (planned.direction === 'down') {
                svg.appendChild(svgElement('line', {
                    x1: scale(outcomePlan.minimum), y1: y, x2: lowX, y2: y,
                    class: 'tochnyi-svg-outcome-retained',
                    'data-tochnyi-mark': 'retained-share', 'data-label-group': group
                }));
                svg.appendChild(svgElement('line', {
                    x1: highX, y1: y, x2: baselineX, y2: y,
                    class: 'tochnyi-svg-outcome-impact',
                    'data-tochnyi-mark': 'impact-share', 'data-label-group': group
                }));
            } else {
                svg.appendChild(svgElement('line', {
                    x1: baselineX, y1: y, x2: lowX, y2: y,
                    class: 'tochnyi-svg-outcome-retained growth',
                    'data-tochnyi-mark': 'growth-share', 'data-label-group': group
                }));
            }
            svg.appendChild(svgElement('line', {
                x1: lowX, y1: y, x2: highX, y2: y, stroke: color,
                class: 'tochnyi-svg-range',
                'data-tochnyi-mark': 'range', 'data-label-group': group
            }));
            svg.appendChild(svgElement('circle', {
                cx: lowX, cy: y, r: 7, fill: color,
                'data-tochnyi-mark': 'range-start', 'data-label-group': group
            }));
            svg.appendChild(svgElement('circle', {
                cx: highX, cy: y, r: 7, fill: color,
                'data-tochnyi-mark': 'range-end', 'data-label-group': group
            }));
            svg.appendChild(svgElement('text', {
                x: rangeCenterX, y: y - 14, 'text-anchor': 'middle', class: 'tochnyi-svg-value',
                'data-tochnyi-label': 'outcome-range-value', 'data-label-role': 'range-value',
                'data-label-group': group, 'data-anchor-x': rangeCenterX, 'data-anchor-y': y,
                'data-label-placements': 'above,below,above-right,above-left,right,left',
                'data-label-priority': '90'
            }, planned.outcomeDisplay));
            svg.appendChild(svgElement('text', {
                x: baselineX - 8, y: y + 27, 'text-anchor': 'end',
                class: 'tochnyi-svg-impact-label ' + planned.direction,
                'data-tochnyi-reserved': 'impact-label', 'data-label-group': group
            }, planned.impactDisplay));
        });
        svg.appendChild(svgElement('text', {
            x: left, y: top - 40, 'text-anchor': 'start', class: 'tochnyi-svg-axis-title',
            'data-tochnyi-reserved': 'axis-title'
        }, outcomePlan.axisTitle));
        chartNode.appendChild(svg);
        scheduleSvgLabelLayout(svg);
    }

    function renderBenchmarkGap(spec, chartNode) {
        chartNode.classList.add('tochnyi-svg-stage', 'tochnyi-benchmark-gap-stage');
        var data = preparedData(spec);
        var single = data.length === 1;
        var width = 1000;
        var baseLeft = single ? 205 : 240;
        var longestCategoryLabel = data.reduce(function(result, item) {
            return Math.max(result, String(item.label || '').length);
        }, 0);
        var left = Math.min(340, Math.max(baseLeft, 32 + longestCategoryLabel * 10));
        var right = 930;
        var top = single ? 94 : 68;
        var rowHeight = single ? 126 : 132;
        var height = single ? 242 : top + data.length * rowHeight + 36;
        var maximum = data.reduce(function(result, item) {
            return Math.max(result, Number(item.value) || 0, Number(item.benchmark) || 0);
        }, 0);
        maximum = maximum > 0 ? maximum * 1.08 : 1;
        function scale(value) { return left + Math.max(0, value) / maximum * (right - left); }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title,
            'data-label-layout': 'complete',
            class: 'tochnyi-benchmark-gap-svg'
        });

        data.forEach(function(item, index) {
            var y = top + index * rowHeight;
            var actual = Number(item.value);
            var benchmark = Number(item.benchmark);
            var actualX = scale(actual);
            var benchmarkX = scale(benchmark);
            var lowX = Math.min(actualX, benchmarkX);
            var highX = Math.max(actualX, benchmarkX);
            var tone = item.tone || (benchmark >= actual ? 'critical' : 'positive');
            var gapTone = item.gapTone;
            var consumedShare = item.benchmarkRelation === 'consumed-share';
            var actualColor = consumedShare
                ? (TONE_HEX[tone] || TONE_HEX.critical)
                : TONE_HEX.primary;
            var gapColor = consumedShare
                ? '#aab4bd'
                : gapTone
                    ? (TONE_HEX[gapTone] || TONE_HEX.warning)
                : tone === 'primary'
                    ? '#78aee3'
                    : tone === 'neutral'
                        ? '#aab4bd'
                        : (TONE_HEX[tone] || TONE_HEX.warning);
            var group = 'benchmark-gap-' + index;
            var gapValue = benchmark - actual;
            var gapText = item.gapDisplayValue || (gapValue >= 0 ? 'Gap ' : 'Premium ') + formatRawValue(Math.abs(gapValue), spec);
            var actualText = item.display || formatRawValue(actual, spec);
            var benchmarkText = item.benchmarkDisplayValue || formatRawValue(benchmark, spec);
            var gapCenterX = (lowX + highX) / 2;
            var actualLabelRight = benchmark < actual ? benchmarkX : actualX;
            var labelPlan = global.TochnyiVisualPlan && global.TochnyiVisualPlan.benchmarkGapLabelPlan
                ? global.TochnyiVisualPlan.benchmarkGapLabelPlan(
                    [actualText, gapText, benchmarkText],
                    [actualX, gapCenterX, benchmarkX],
                    { left: left, right: right },
                    [
                        { left: left, right: actualLabelRight, role: 'actual' },
                        { left: lowX, right: highX, role: 'gap' },
                        { role: 'benchmark' }
                    ]
                )
                : [
                    { x: (left + actualLabelRight) / 2, lane: 0, textAnchor: 'middle', placement: 'inside' },
                    { x: gapCenterX, lane: 0, textAnchor: 'middle', placement: 'inside' },
                    { x: benchmarkX, lane: 0, textAnchor: 'middle', placement: 'above' }
                ];
            var labelBaseY = y + 38;
            var labelLaneHeight = 30;

            function benchmarkLabelY(plan) {
                if (plan.placement === 'inside') return y + 1;
                if (plan.placement === 'above') return y - 31;
                return labelBaseY + plan.lane * labelLaneHeight;
            }

            function benchmarkLabelClass(baseClass, plan) {
                return baseClass + ' placement-' + (plan.placement || 'below');
            }

            svg.appendChild(svgElement('text', {
                x: left - 20, y: y + 6, 'text-anchor': 'end', class: 'tochnyi-svg-label',
                'data-tochnyi-reserved': 'category-label', 'data-label-group': group
            }, item.label));
            svg.appendChild(svgElement('line', {
                x1: left, y1: y, x2: right, y2: y, class: 'tochnyi-svg-track',
                'data-tochnyi-mark': 'benchmark-track', 'data-label-group': group
            }));
            svg.appendChild(svgElement('rect', {
                x: left, y: y - 13, width: Math.max(2, actualX - left), height: 26, rx: 7,
                fill: actualColor, class: 'tochnyi-benchmark-actual',
                'data-tochnyi-mark': 'actual-value', 'data-label-group': group
            }));
            if (Math.abs(highX - lowX) > 1) {
                svg.appendChild(svgElement('rect', {
                    x: lowX, y: y - 13, width: Math.max(2, highX - lowX), height: 26, rx: 7,
                    fill: gapColor, class: 'tochnyi-benchmark-gap',
                    'data-tochnyi-mark': 'benchmark-gap', 'data-label-group': group
                }));
            }
            svg.appendChild(svgElement('line', {
                x1: benchmarkX, y1: y - 22, x2: benchmarkX, y2: y + 22,
                class: 'tochnyi-svg-benchmark',
                'data-tochnyi-mark': 'benchmark-marker', 'data-label-group': group
            }));
            svg.appendChild(svgElement('text', {
                x: labelPlan[0].x, y: benchmarkLabelY(labelPlan[0]),
                'text-anchor': labelPlan[0].textAnchor,
                'dominant-baseline': labelPlan[0].placement === 'inside' ? 'central' : 'auto',
                class: benchmarkLabelClass('tochnyi-svg-value tochnyi-svg-benchmark-actual-label', labelPlan[0]),
                'data-tochnyi-reserved': 'actual-label', 'data-label-group': group,
                'data-label-lane': String(labelPlan[0].lane),
                'data-label-placement': labelPlan[0].placement || 'below'
            }, actualText));
            svg.appendChild(svgElement('text', {
                x: labelPlan[2].x, y: benchmarkLabelY(labelPlan[2]),
                'text-anchor': labelPlan[2].textAnchor,
                class: benchmarkLabelClass('tochnyi-svg-benchmark-label', labelPlan[2]),
                'data-tochnyi-reserved': 'benchmark-label', 'data-label-group': group,
                'data-label-lane': String(labelPlan[2].lane),
                'data-label-placement': labelPlan[2].placement || 'above'
            }, benchmarkText));
            svg.appendChild(svgElement('text', {
                x: labelPlan[1].x, y: benchmarkLabelY(labelPlan[1]),
                'text-anchor': labelPlan[1].textAnchor,
                'dominant-baseline': labelPlan[1].placement === 'inside' ? 'central' : 'auto',
                class: benchmarkLabelClass('tochnyi-svg-gap-label', labelPlan[1]),
                fill: labelPlan[1].placement === 'inside' ? '#ffffff' : gapColor,
                'data-tochnyi-reserved': 'gap-label', 'data-label-group': group,
                'data-label-lane': String(labelPlan[1].lane),
                'data-label-placement': labelPlan[1].placement || 'below'
            }, gapText));
        });
        chartNode.appendChild(svg);
    }

    function renderDumbbell(spec, chartNode) {
        chartNode.classList.add('tochnyi-svg-stage', 'tochnyi-dumbbell-stage');
        var data = preparedData(spec);
        var bounds = axisBounds(spec, data);
        var logarithmic = spec.measure.scale === 'logarithmic';
        var width = 1000;
        var left = 260;
        var right = 925;
        var top = 92;
        var rowHeight = data.length > 8 ? 58 : 66;
        var height = top + data.length * rowHeight + 52;
        function scale(value) {
            var minimum = bounds.minimum;
            var maximum = bounds.maximum;
            if (logarithmic) {
                minimum = Math.log10(minimum);
                maximum = Math.log10(maximum);
                value = Math.log10(value);
            }
            return left + ((value - minimum) / (maximum - minimum)) * (right - left);
        }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title + '. Hollow points are benchmark or earlier values; solid points are actual or later values.',
            class: 'tochnyi-dumbbell-svg',
            'data-label-layout': 'pending'
        });

        svg.appendChild(svgElement('circle', {
            cx: right - 245, cy: 24, r: 7, class: 'tochnyi-dumbbell-start',
            'data-tochnyi-reserved': 'dumbbell-legend-start'
        }));
        svg.appendChild(svgElement('text', {
            x: right - 230, y: 29, class: 'tochnyi-dumbbell-legend',
            'data-tochnyi-reserved': 'dumbbell-legend-start-label'
        }, 'BEFORE / BENCHMARK'));
        svg.appendChild(svgElement('circle', {
            // The solid marker explains time/role through fill state only.
            // Individual after-points may use semantic tone colors, so a blue
            // legend swatch would make a false categorical promise.
            cx: right - 75, cy: 24, r: 8, fill: TONE_HEX.neutral,
            class: 'tochnyi-dumbbell-end',
            'data-tochnyi-reserved': 'dumbbell-legend-end'
        }));
        svg.appendChild(svgElement('text', {
            x: right - 60, y: 29, class: 'tochnyi-dumbbell-legend',
            'data-tochnyi-reserved': 'dumbbell-legend-end-label'
        }, 'AFTER / ACTUAL'));

        for (var tick = 0; tick <= 4; tick += 1) {
            var ratio = tick / 4;
            var raw = logarithmic
                ? Math.pow(10, Math.log10(bounds.minimum) + ratio * (Math.log10(bounds.maximum) - Math.log10(bounds.minimum)))
                : bounds.minimum + ratio * (bounds.maximum - bounds.minimum);
            var tickX = left + ratio * (right - left);
            svg.appendChild(svgElement('line', {
                x1: tickX, y1: top - 34, x2: tickX, y2: height - 95, class: 'tochnyi-svg-grid'
            }));
            svg.appendChild(svgElement('text', {
                x: tickX, y: height - 70, 'text-anchor': 'middle', class: 'tochnyi-svg-tick',
                'data-tochnyi-reserved': 'dumbbell-axis-tick'
            }, formatRawValue(raw, spec)));
        }
        if (!logarithmic && bounds.minimum < 0 && bounds.maximum > 0) {
            var zeroX = scale(0);
            svg.appendChild(svgElement('line', {
                x1: zeroX, y1: top - 42, x2: zeroX, y2: height - 95,
                class: 'tochnyi-svg-zero-reference',
                'data-tochnyi-mark': 'zero-reference'
            }));
            chartNode.setAttribute('data-zero-reference', 'interior-prominent');
        }
        (spec.references || []).forEach(function(reference) {
            var referenceX = scale(reference.value);
            svg.appendChild(svgElement('line', {
                x1: referenceX, y1: top - 42, x2: referenceX, y2: height - 95,
                class: 'tochnyi-svg-reference ' + (reference.lineStyle === 'dashed' ? 'dashed' : ''),
                stroke: TONE_HEX[reference.tone || 'neutral'],
                'data-tochnyi-mark': 'reference-line',
                'data-label-group': 'reference-' + reference.value
            }));
            svg.appendChild(svgElement('text', {
                x: referenceX + 5, y: top - 45, class: 'tochnyi-svg-reference-label',
                fill: TONE_HEX[reference.tone || 'neutral'],
                'data-tochnyi-reserved': 'reference-label',
                'data-label-group': 'reference-' + reference.value
            }, reference.label));
        });

        data.forEach(function(item, index) {
            var y = top + index * rowHeight;
            var startValue = Number(item.benchmark);
            var endValue = Number(item.value);
            var startX = scale(startValue);
            var endX = scale(endValue);
            var rowGroup = 'dumbbell-row-' + index;
            var startGroup = rowGroup + '-start';
            var endGroup = rowGroup + '-end';
            var endColor = TONE_HEX[item.tone || 'primary'] || TONE_HEX.primary;
            var startDisplay = item.benchmarkDisplayValue || formatRawValue(startValue, spec);
            var endDisplay = item.display || formatRawValue(endValue, spec);
            var direction = endValue >= startValue ? 'up' : 'down';
            var unchanged = Math.abs(startX - endX) < 2;

            svg.appendChild(svgElement('text', {
                x: left - 20, y: y + 6, 'text-anchor': 'end', class: 'tochnyi-svg-label',
                'data-tochnyi-reserved': 'category-label', 'data-label-group': rowGroup
            }, item.label + (item.gapDisplayValue ? ' · ' + item.gapDisplayValue : '')));
            if (!unchanged) {
                svg.appendChild(svgElement('line', {
                    x1: startX, y1: y, x2: endX, y2: y,
                    class: 'tochnyi-dumbbell-connector ' + direction,
                    'data-tochnyi-mark': 'dumbbell-connector', 'data-label-group': rowGroup
                }));
            }
            svg.appendChild(svgElement('circle', {
                cx: startX, cy: y, r: unchanged ? 11 : 8, class: 'tochnyi-dumbbell-start',
                'data-tochnyi-mark': 'point', 'data-label-group': unchanged ? endGroup : startGroup
            }));
            svg.appendChild(svgElement('circle', {
                cx: endX, cy: y, r: unchanged ? 6 : 10, fill: endColor, class: 'tochnyi-dumbbell-end',
                'data-tochnyi-mark': 'point', 'data-label-group': endGroup
            }));
            if (spec.options.showLabels) {
                if (!unchanged) {
                    svg.appendChild(svgElement('text', {
                        x: startX, y: y - 15, 'text-anchor': 'middle', class: 'tochnyi-svg-benchmark-label',
                        'data-tochnyi-label': 'dumbbell-start-value', 'data-label-role': 'point-value',
                        'data-label-group': startGroup, 'data-anchor-x': startX, 'data-anchor-y': y,
                        'data-label-placements': 'above,below,left,right,above-left,below-left',
                        'data-label-priority': '80'
                    }, startDisplay));
                }
                svg.appendChild(svgElement('text', {
                    x: endX, y: y + 27, 'text-anchor': 'middle', class: 'tochnyi-svg-value',
                    'data-tochnyi-label': 'dumbbell-end-value', 'data-label-role': 'point-value',
                    'data-label-group': endGroup, 'data-anchor-x': endX, 'data-anchor-y': y,
                    'data-label-placements': unchanged ? 'right,above,below,left' : 'below,above,right,left,below-right,above-right',
                    'data-label-priority': '90'
                }, endDisplay));
            }
        });
        svg.appendChild(svgElement('text', {
            x: left, y: top - 48, 'text-anchor': 'start', class: 'tochnyi-svg-axis-title',
            'data-tochnyi-reserved': 'axis-title'
        }, spec.measure.axisTitle || spec.measure.unit || 'VALUE'));
        chartNode.appendChild(svg);
        scheduleSvgLabelLayout(svg);
    }

    var GROUPED_CATEGORICAL = ['#005bbb', '#e8a200', '#1f9e89', '#8e5cc4'];
    var GROUPED_SEQUENTIAL = {
        1: ['#005bbb'],
        2: ['#a9c9ee', '#005bbb'],
        3: ['#a9c9ee', '#4f8fd6', '#005bbb'],
        4: ['#c9dcf3', '#8cb6e6', '#4f8fd6', '#005bbb']
    };

    function groupedSeriesColor(plan, index) {
        if (plan.series.length === 1) return TONE_HEX.primary;
        if (plan.seriesScale === 'sequential') {
            var ramp = GROUPED_SEQUENTIAL[plan.series.length] || GROUPED_SEQUENTIAL[4];
            return ramp[Math.min(index, ramp.length - 1)];
        }
        return GROUPED_CATEGORICAL[index % GROUPED_CATEGORICAL.length];
    }

    // Text set inside a filled mark takes ink or white by the fill's luminance.
    function groupedInkClass(hex) {
        var value = parseInt(String(hex).replace('#', ''), 16);
        var r = (value >> 16) & 255;
        var g = (value >> 8) & 255;
        var b = value & 255;
        return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? 'on-light' : 'on-dark';
    }

    function niceTicks(maximum, target) {
        if (!(maximum > 0)) return { max: 1, ticks: [0, 1] };
        var rough = maximum / (target || 4);
        var power = Math.pow(10, Math.floor(Math.log10(rough)));
        var step = [1, 2, 2.5, 5, 10].map(function(multiple) { return multiple * power; })
            .find(function(candidate) { return candidate >= rough; });
        var top = Math.ceil(maximum / step - 1e-9) * step;
        var ticks = [];
        for (var tick = 0; tick <= top + step / 2; tick += step) ticks.push(Number(tick.toPrecision(12)));
        return { max: top, ticks: ticks };
    }

    // Axis ticks and reference values stay short. A currency prefix already
    // names the unit, so the verbose measure.unit ("RUB/month") is not repeated;
    // large magnitudes compact to k/m/bn unless the suffix already names one.
    function compactValue(value, measure, decimals) {
        var active = measure || {};
        var suffix = active.suffix !== undefined ? active.suffix : active.prefix ? '' : valueSuffix(active);
        var magnitudeSuffix = /^\s*(?:k|m|bn|million|billion|thousand)\b/i.test(suffix);
        var absolute = Math.abs(value);
        var prefix = active.prefix || '';
        function scaled(divisor, unit) {
            var places = decimals !== undefined ? decimals : (absolute % divisor ? 1 : 0);
            return prefix + formatNumber(value / divisor, places) + unit + suffix;
        }
        if (!magnitudeSuffix && absolute >= 1e9) return scaled(1e9, 'bn');
        if (!magnitudeSuffix && absolute >= 1e6) return scaled(1e6, 'm');
        if (!magnitudeSuffix && absolute >= 1e4) return scaled(1e3, 'k');
        return prefix + formatNumber(value, decimals !== undefined ? decimals : Number.isInteger(value) ? 0 : 1) + suffix;
    }

    function compactTick(value, measure) {
        return compactValue(value, measure);
    }

    function referenceValueText(value, measure) {
        var active = measure || {};
        return compactValue(value, active, Math.abs(value) >= 1e4 ? 1 : active.decimals || 0);
    }

    // Keep stacked reference captions at least the given spacing apart while staying
    // as close as possible to their own lines.
    function spreadPositions(positions, spacing) {
        var order = positions.map(function(value, index) { return { value: value, index: index }; })
            .sort(function(a, b) { return a.value - b.value; });
        for (var index = 1; index < order.length; index += 1) {
            order[index].value = Math.max(order[index].value, order[index - 1].value + spacing);
        }
        var result = [];
        order.forEach(function(entry) { result[entry.index] = entry.value; });
        return result;
    }

    function estimatedTextWidth(text, size) {
        return String(text || '').length * (size || 15) * 0.56;
    }

    function groupedColumnPath(x, width, base, cap) {
        var radius = Math.min(4, width / 2, Math.max(0, base - cap));
        return 'M' + x + ',' + base + ' V' + (cap + radius) +
            ' Q' + x + ',' + cap + ' ' + (x + radius) + ',' + cap +
            ' H' + (x + width - radius) +
            ' Q' + (x + width) + ',' + cap + ' ' + (x + width) + ',' + (cap + radius) +
            ' V' + base + ' Z';
    }

    function groupedBarPath(start, end, y, height) {
        var radius = Math.min(4, height / 2, Math.max(0, end - start));
        return 'M' + start + ',' + y + ' H' + (end - radius) +
            ' Q' + end + ',' + y + ' ' + end + ',' + (y + radius) +
            ' V' + (y + height - radius) +
            ' Q' + end + ',' + (y + height) + ' ' + (end - radius) + ',' + (y + height) +
            ' H' + start + ' Z';
    }

    function groupedReferenceColor(reference) {
        var tone = reference.tone || 'neutral';
        return tone === 'neutral' ? '#111418' : TONE_HEX[tone] || '#111418';
    }

    // The stage size depends on the final title/footer height, which changes when
    // the webfont replaces the fallback. Draw once, then re-fit the stage and
    // redraw after fonts load; diagnostics wait for data-label-layout=complete.
    function usesSvgKit(spec) {
        return Boolean(global.TochnyiSvgCharts && global.TochnyiSvgCharts.supports(spec.recipe));
    }

    // Redraws a stage-measured recipe after the stage height is settled.
    function refitStage(spec, chartNode) {
        var main = chartNode.closest('.tochnyi-v2');
        var container = chartNode.closest('.tochnyi-chart-container');
        if (!main || !container) return null;
        var plan = visualPlan(spec, preparedData(spec));
        container.style.height = plan.chartHeight + 'px';
        container.removeAttribute('data-canvas-fit-mode');
        container.removeAttribute('data-canvas-fit-delta');
        fitScaffoldToViewport(main, container, plan);
        return container;
    }

    function renderWhenStable(spec, chartNode, draw) {
        var fontsPending = Boolean(document.fonts && document.fonts.ready);
        draw(spec, chartNode, !fontsPending);
        if (!fontsPending) return;
        document.fonts.ready.then(function() {
            refitStage(spec, chartNode);
            chartNode.replaceChildren();
            draw(spec, chartNode, true);
        });
    }

    function renderKitChart(spec, chartNode, layoutFinal) {
        var env = {
            layoutFinal: layoutFinal,
            plan: visualPlan(spec, preparedData(spec)),
            preparedData: preparedData,
            formatNumber: formatNumber,
            formatMeasureValue: formatMeasureValue,
            referenceValueText: referenceValueText
        };
        var result = global.TochnyiSvgCharts.render(spec, chartNode, env);
        // Dense rankings need a minimum row height; grow the stage once to fit.
        var container = chartNode.closest('.tochnyi-chart-container');
        if (result.requiredHeight && container && result.requiredHeight > chartNode.clientHeight + 1) {
            container.style.height = (result.requiredHeight + container.clientHeight - chartNode.clientHeight) + 'px';
            container.setAttribute('data-canvas-fit-mode', 'content');
            chartNode.replaceChildren();
            global.TochnyiSvgCharts.render(spec, chartNode, env);
        }
    }

    function renderGroupedComparisonWhenStable(spec, chartNode) {
        renderWhenStable(spec, chartNode, renderGroupedComparison);
    }

    function renderGroupedComparison(spec, chartNode, layoutFinal) {
        chartNode.classList.add('tochnyi-svg-stage', 'tochnyi-grouped-stage');
        var plan = global.TochnyiVisualPlan.groupedComparisonPlan(spec, global.innerWidth || 1200);
        var width = Math.max(320, Math.round(chartNode.clientWidth || 1000));
        var height = Math.max(260, Math.round(chartNode.clientHeight || 480));
        chartNode.setAttribute('data-grouped-orientation', plan.orientation);
        var panels = (spec.panels && spec.panels.length ? spec.panels : [{ id: null }]).map(function(panel) {
            return {
                id: panel.id,
                title: panel.title || null,
                measure: Object.assign({}, spec.measure, panel.measure || {})
            };
        });
        var lookup = {};
        spec.data.forEach(function(item) {
            lookup[[item.panel || '', item.label, item.group || ''].join('\u0000')] = item;
        });
        function itemAt(panel, category, series) {
            return lookup[[panel.id || '', category, series || ''].join('\u0000')];
        }
        function panelValues(panel, references) {
            return spec.data.filter(function(item) { return (item.panel || null) === panel.id; })
                .map(function(item) { return item.value; })
                .concat(references.map(function(reference) { return reference.value; }));
        }
        function display(item, measure) {
            return item.displayValue || formatMeasureValue(item.value, measure);
        }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title,
            class: 'tochnyi-grouped-svg',
            'data-label-layout': layoutFinal === false ? 'pending' : 'complete'
        });
        var references = spec.panels && spec.panels.length ? [] : (spec.references || []);
        var top = 0;

        if (plan.series.length > 1) {
            var legendX = 0;
            var legendRow = 0;
            plan.series.forEach(function(name, index) {
                var entryWidth = 23 + estimatedTextWidth(name, 16) * 0.9 + 30;
                if (legendX > 0 && legendX + entryWidth - 30 > width) {
                    legendX = 0;
                    legendRow += 1;
                }
                var rowY = legendRow * 24;
                svg.appendChild(svgElement('rect', {
                    x: legendX, y: rowY + 6, width: 15, height: 15, rx: 4,
                    fill: groupedSeriesColor(plan, index),
                    'data-tochnyi-reserved': 'legend-swatch'
                }));
                svg.appendChild(svgElement('text', {
                    x: legendX + 23, y: rowY + 19, class: 'tochnyi-grouped-legend',
                    'data-tochnyi-reserved': 'legend-label'
                }, name));
                legendX += entryWidth;
            });
            top = 44 + legendRow * 24;
        }
        var panelTitleHeight = panels.length > 1 || panels[0].title ? 34 : 0;

        if (plan.orientation === 'columns') {
            var panelGap = panels.length > 1 ? 72 : 0;
            var referenceRoom = references.length ? 160 : 0;
            var panelWidth = (width - referenceRoom - panelGap * (panels.length - 1)) / panels.length;
            var bottomRoom = 34 + (plan.hasDetails ? 22 : 0);
            var labelHeadroom = 30 + (plan.hasAnnotations ? 20 : 0);
            panels.forEach(function(panel, panelIndex) {
                var x0 = panelIndex * (panelWidth + panelGap);
                var plotHeightEstimate = height - bottomRoom - (top + panelTitleHeight + labelHeadroom);
                var scale = niceTicks(Math.max.apply(null, panelValues(panel, references).concat([0])), plotHeightEstimate < 220 ? 3 : 4);
                var tickRoom = Math.max.apply(null, scale.ticks.map(function(tick) {
                    return estimatedTextWidth(compactTick(tick, panel.measure), 14);
                })) + 14;
                var left = x0 + tickRoom;
                var right = x0 + panelWidth;
                var plotTop = top + panelTitleHeight + labelHeadroom;
                var base = height - bottomRoom;
                var y = function(value) { return base - (value / scale.max) * (base - plotTop); };
                if (panelTitleHeight) {
                    svg.appendChild(svgElement('text', {
                        x: x0, y: top + 20, class: 'tochnyi-grouped-panel-title',
                        'data-tochnyi-reserved': 'panel-title'
                    }, panel.title || ''));
                }
                scale.ticks.forEach(function(tick) {
                    svg.appendChild(svgElement('line', {
                        x1: left, y1: y(tick), x2: right, y2: y(tick),
                        class: tick === 0 ? 'tochnyi-grouped-baseline' : 'tochnyi-svg-grid'
                    }));
                    svg.appendChild(svgElement('text', {
                        x: left - 10, y: y(tick) + 5, 'text-anchor': 'end', class: 'tochnyi-svg-tick',
                        'data-tochnyi-reserved': 'axis-tick'
                    }, compactTick(tick, panel.measure)));
                });
                var slot = (right - left) / plan.categories.length;
                var barWidth = Math.min(64, (slot * 0.74 - (plan.series.length - 1) * 4) / plan.series.length);
                var referenceYs = references.map(function(reference) { return y(reference.value); });
                plan.categories.forEach(function(category, categoryIndex) {
                    var present = plan.series.map(function(series, seriesIndex) {
                        return { index: seriesIndex, item: itemAt(panel, category, series) };
                    }).filter(function(entry) { return entry.item; });
                    var groupWidth = present.length * barWidth + (present.length - 1) * 4;
                    var center = left + slot * categoryIndex + slot / 2;
                    present.forEach(function(entry, position) {
                        var bx = center - groupWidth / 2 + position * (barWidth + 4);
                        var cap = y(entry.item.value);
                        var fill = groupedSeriesColor(plan, entry.index);
                        var group = 'grouped-' + panelIndex + '-' + categoryIndex + '-' + entry.index;
                        svg.appendChild(svgElement('path', {
                            d: groupedColumnPath(bx, barWidth, base, cap),
                            fill: fill, 'data-tochnyi-mark': 'column', 'data-label-group': group
                        }));
                        // A reference line running through the outside value label
                        // moves the label inside the column when the column is tall enough.
                        var crossed = referenceYs.some(function(refY) { return refY > cap - 34 && refY < cap + 4; });
                        var inside = crossed && base - cap > 36;
                        var labelText = display(entry.item, panel.measure);
                        var compactLabel = estimatedTextWidth(labelText, 16) > barWidth + 12;
                        var valueAttributes = {
                            x: bx + barWidth / 2, y: inside ? cap + 22 : cap - 10, 'text-anchor': 'middle',
                            class: 'tochnyi-svg-value tochnyi-grouped-value' + (inside ? ' inside ' + groupedInkClass(fill) : '') + (compactLabel ? ' compact' : ''),
                            'data-label-role': 'bar-value', 'data-label-group': group
                        };
                        svg.appendChild(svgElement('text', valueAttributes, labelText));
                        if (entry.item.annotation) {
                            svg.appendChild(svgElement('text', {
                                x: bx + barWidth / 2, y: inside ? cap - 10 : cap - 32, 'text-anchor': 'middle',
                                class: 'tochnyi-grouped-annotation', 'data-label-group': group
                            }, entry.item.annotation));
                        }
                        if (entry.item.detail) {
                            svg.appendChild(svgElement('text', {
                                x: bx + barWidth / 2, y: base + 19, 'text-anchor': 'middle',
                                class: 'tochnyi-grouped-detail', 'data-label-group': group
                            }, entry.item.detail));
                        }
                    });
                    svg.appendChild(svgElement('text', {
                        x: center, y: base + (plan.hasDetails ? 44 : 24), 'text-anchor': 'middle',
                        class: 'tochnyi-svg-label tochnyi-grouped-category',
                        'data-tochnyi-reserved': 'category-label'
                    }, category));
                });
                var captionYs = spreadPositions(referenceYs, 40);
                references.forEach(function(reference, referenceIndex) {
                    var refY = y(reference.value);
                    var captionY = captionYs[referenceIndex];
                    var referenceGroup = 'reference-' + referenceIndex;
                    svg.appendChild(svgElement('line', {
                        x1: left, y1: refY, x2: right + 14, y2: refY,
                        class: 'tochnyi-svg-reference' + (reference.lineStyle === 'line' ? '' : ' dashed'),
                        stroke: groupedReferenceColor(reference), 'data-tochnyi-mark': 'reference-line',
                        'data-label-group': referenceGroup
                    }));
                    svg.appendChild(svgElement('text', {
                        x: right + 24, y: captionY - 5, class: 'tochnyi-grouped-reference-value',
                        'data-tochnyi-reserved': 'reference-label', 'data-label-group': referenceGroup
                    }, referenceValueText(reference.value, panel.measure)));
                    svg.appendChild(svgElement('text', {
                        x: right + 24, y: captionY + 14, class: 'tochnyi-svg-reference-label tochnyi-grouped-reference-label',
                        'data-tochnyi-reserved': 'reference-label', 'data-label-group': referenceGroup
                    }, reference.label));
                });
            });
        } else {
            var longest = plan.categories.reduce(function(max, label) {
                return Math.max(max, estimatedTextWidth(label, 18));
            }, 0);
            var labelWidth = Math.min(width * 0.28, longest + 28);
            var barPanelGap = panels.length > 1 ? 64 : 0;
            var barPanelWidth = (width - labelWidth - barPanelGap * (panels.length - 1)) / panels.length;
            var valueRoom = Math.min(plan.hasAnnotations ? 190 : 110, barPanelWidth * 0.4);
            var axisRoom = 32;
            var referenceRows = Math.min(references.length, 2);
            var rowsTop = top + panelTitleHeight + (referenceRows ? 10 + referenceRows * 20 : 8);
            var available = height - rowsTop - axisRoom;
            var seriesCount = plan.series.length;
            var barHeight = seriesCount > 1 ? 30 : (plan.hasAnnotations ? 52 : 44);
            var innerGap = 4;
            var groupHeight = seriesCount * barHeight + (seriesCount - 1) * innerGap;
            var rowGap = (available - plan.categories.length * groupHeight) / Math.max(1, plan.categories.length);
            if (rowGap < 16) {
                barHeight = Math.max(14, (available - plan.categories.length * (16 + (seriesCount - 1) * innerGap)) /
                    (plan.categories.length * seriesCount));
                groupHeight = seriesCount * barHeight + (seriesCount - 1) * innerGap;
                rowGap = (available - plan.categories.length * groupHeight) / Math.max(1, plan.categories.length);
            }
            var rowTop = function(categoryIndex) { return rowsTop + rowGap / 2 + categoryIndex * (groupHeight + rowGap); };
            plan.categories.forEach(function(category, categoryIndex) {
                svg.appendChild(svgElement('text', {
                    x: labelWidth - 18, y: rowTop(categoryIndex) + groupHeight / 2 + 6, 'text-anchor': 'end',
                    class: 'tochnyi-svg-label tochnyi-grouped-category',
                    'data-tochnyi-reserved': 'category-label'
                }, category));
            });
            panels.forEach(function(panel, panelIndex) {
                var x0 = labelWidth + panelIndex * (barPanelWidth + barPanelGap);
                var values = panelValues(panel, references);
                var dataMax = Math.max.apply(null, values.concat([0]));
                var plotRight = x0 + barPanelWidth - valueRoom;
                var plotWidth = plotRight - x0;
                var scale = niceTicks(dataMax, plotWidth < 260 ? 2 : plotWidth < 440 ? 3 : 4);
                var x = function(value) { return x0 + (value / scale.max) * (plotRight - x0); };
                if (panelTitleHeight) {
                    svg.appendChild(svgElement('text', {
                        x: x0, y: top + 20, class: 'tochnyi-grouped-panel-title',
                        'data-tochnyi-reserved': 'panel-title'
                    }, panel.title || ''));
                }
                scale.ticks.forEach(function(tick) {
                    svg.appendChild(svgElement('line', {
                        x1: x(tick), y1: rowsTop - 6, x2: x(tick), y2: height - axisRoom + 4,
                        class: tick === 0 ? 'tochnyi-grouped-baseline' : 'tochnyi-svg-grid'
                    }));
                    svg.appendChild(svgElement('text', {
                        x: x(tick), y: height - 8, 'text-anchor': 'middle', class: 'tochnyi-svg-tick',
                        'data-tochnyi-reserved': 'axis-tick'
                    }, compactTick(tick, panel.measure)));
                });
                plan.categories.forEach(function(category, categoryIndex) {
                    var gy = rowTop(categoryIndex);
                    plan.series.forEach(function(series, seriesIndex) {
                        var item = itemAt(panel, category, series);
                        if (!item) return;
                        var by = gy + seriesIndex * (barHeight + innerGap);
                        var end = x(item.value);
                        var fill = groupedSeriesColor(plan, seriesIndex);
                        var group = 'grouped-' + panelIndex + '-' + categoryIndex + '-' + seriesIndex;
                        svg.appendChild(svgElement('path', {
                            d: groupedBarPath(x0, end, by, barHeight),
                            fill: fill, 'data-tochnyi-mark': 'bar', 'data-label-group': group
                        }));
                        var detailFits = item.detail && estimatedTextWidth(item.detail, 13) + 20 < end - x0;
                        if (detailFits) {
                            svg.appendChild(svgElement('text', {
                                x: x0 + 10, y: by + barHeight / 2 + 5, class: 'tochnyi-grouped-detail inside ' + groupedInkClass(fill),
                                'data-label-group': group
                            }, item.detail));
                        }
                        var valueText = display(item, panel.measure) + (item.detail && !detailFits ? ' · ' + item.detail : '');
                        var stacked = Boolean(item.annotation) && barHeight >= 40;
                        var valueNode = svgElement('text', {
                            x: end + 10, y: stacked ? by + barHeight / 2 - 2 : by + barHeight / 2 + 6,
                            class: 'tochnyi-svg-value tochnyi-grouped-value',
                            'data-label-role': 'bar-value', 'data-label-group': group
                        }, valueText);
                        if (item.annotation && !stacked) {
                            valueNode.appendChild(svgElement('tspan', { class: 'tochnyi-grouped-annotation', dx: 8 }, item.annotation));
                        }
                        svg.appendChild(valueNode);
                        if (stacked) {
                            svg.appendChild(svgElement('text', {
                                x: end + 10, y: by + barHeight / 2 + 17, class: 'tochnyi-grouped-annotation',
                                'data-label-group': group
                            }, item.annotation));
                        }
                    });
                });
                references.forEach(function(reference, referenceIndex) {
                    var refX = x(reference.value);
                    var referenceGroup = 'reference-' + referenceIndex;
                    svg.appendChild(svgElement('line', {
                        x1: refX, y1: rowsTop - 8 - (referenceIndex % 2) * 20, x2: refX, y2: height - axisRoom + 4,
                        class: 'tochnyi-svg-reference' + (reference.lineStyle === 'line' ? '' : ' dashed'),
                        stroke: groupedReferenceColor(reference), 'data-tochnyi-mark': 'reference-line',
                        'data-label-group': referenceGroup
                    }));
                    var caption = reference.label + ' · ' + referenceValueText(reference.value, panel.measure);
                    var captionWidth = estimatedTextWidth(caption, 13);
                    var anchor = refX + captionWidth / 2 > width ? 'end' : refX - captionWidth / 2 < x0 ? 'start' : 'middle';
                    svg.appendChild(svgElement('text', {
                        x: anchor === 'end' ? refX + 6 : anchor === 'start' ? refX - 6 : refX,
                        y: rowsTop - 14 - (referenceIndex % 2) * 20, 'text-anchor': anchor,
                        class: 'tochnyi-svg-reference-label tochnyi-grouped-reference-label',
                        'data-tochnyi-reserved': 'reference-label', 'data-label-group': referenceGroup
                    }, caption));
                });
            });
        }
        chartNode.appendChild(svg);
    }

    function utcDate(value) {
        return new Date(String(value) + 'T00:00:00Z');
    }

    function addDurationDate(anchorDate, duration, durationUnit) {
        var end = utcDate(anchorDate);
        if (durationUnit === 'days') end.setUTCDate(end.getUTCDate() + duration);
        else if (durationUnit === 'weeks') end.setUTCDate(end.getUTCDate() + duration * 7);
        else end.setUTCMonth(end.getUTCMonth() + duration);
        return end.toISOString().slice(0, 10);
    }

    function resolvedTimelineItem(spec, item) {
        if (item.start && item.end) return item;
        var anchorDate = spec.timeline && spec.timeline.anchorDate;
        return Object.assign({}, item, {
            start: anchorDate,
            end: addDurationDate(anchorDate, item.duration, item.durationUnit)
        });
    }

    function renderDurationTimeline(spec, chartNode) {
        chartNode.classList.add('tochnyi-svg-stage', 'tochnyi-timeline-stage');
        var data = preparedData(spec).map(function(item) { return resolvedTimelineItem(spec, item); });
        var starts = data.map(function(item) { return utcDate(item.start).getTime(); });
        var ends = data.map(function(item) { return utcDate(item.end).getTime(); });
        var domainStart = Math.min.apply(null, starts);
        var domainEnd = Math.max.apply(null, ends) + 86400000;
        if (domainEnd <= domainStart) domainEnd = domainStart + 86400000;
        var width = 1000;
        var left = 220;
        var right = 940;
        var top = 82;
        var rowHeight = 72;
        var height = top + data.length * rowHeight + 55;
        function scale(time) { return left + (time - domainStart) / (domainEnd - domainStart) * (right - left); }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title,
            'data-label-layout': 'complete',
            class: 'tochnyi-timeline-svg'
        });

        var approximateMonths = Math.max(1, Math.ceil((domainEnd - domainStart) / (86400000 * 28)));
        var tickStep = approximateMonths > 30 ? 6 : approximateMonths > 18 ? 3 : approximateMonths > 9 ? 2 : 1;
        var tick = new Date(domainStart);
        tick = new Date(Date.UTC(tick.getUTCFullYear(), tick.getUTCMonth(), 1));
        if (tick.getTime() < domainStart) tick = new Date(Date.UTC(tick.getUTCFullYear(), tick.getUTCMonth() + 1, 1));
        var tickIndex = 0;
        while (tick.getTime() < domainEnd && tickIndex < 36) {
            var x = scale(tick.getTime());
            svg.appendChild(svgElement('line', {
                x1: x, y1: top - 42, x2: x, y2: height - 30, class: 'tochnyi-svg-grid'
            }));
            svg.appendChild(svgElement('text', {
                x: x, y: top - 51, 'text-anchor': 'middle', class: 'tochnyi-svg-tick',
                'data-tochnyi-reserved': 'timeline-tick'
            }, new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(tick)));
            tick = new Date(Date.UTC(tick.getUTCFullYear(), tick.getUTCMonth() + tickStep, 1));
            tickIndex += 1;
        }

        data.forEach(function(item, index) {
            var y = top + index * rowHeight;
            var start = utcDate(item.start).getTime();
            var end = utcDate(item.end).getTime() + 86400000;
            var x1 = scale(start);
            var x2 = scale(end);
            var group = 'duration-' + index;
            var tone = item.tone || (index === 0 ? 'critical' : 'warning');
            svg.appendChild(svgElement('text', {
                x: left - 18, y: y + 6, 'text-anchor': 'end', class: 'tochnyi-svg-label',
                'data-tochnyi-reserved': 'timeline-label', 'data-label-group': group
            }, item.label));
            svg.appendChild(svgElement('line', {
                x1: left, y1: y, x2: right, y2: y, class: 'tochnyi-svg-track',
                'data-tochnyi-mark': 'timeline-track', 'data-label-group': group
            }));
            svg.appendChild(svgElement('rect', {
                x: x1, y: y - 17, width: Math.max(4, x2 - x1), height: 34, rx: 9,
                fill: TONE_HEX[tone] || TONE_HEX.primary,
                class: 'tochnyi-duration-interval',
                'data-tochnyi-mark': 'duration-interval', 'data-label-group': group
            }));
            svg.appendChild(svgElement('text', {
                x: (x1 + x2) / 2, y: y + 6, 'text-anchor': 'middle',
                class: 'tochnyi-duration-value',
                'data-tochnyi-reserved': 'duration-value', 'data-label-group': group
            }, item.display || item.start + '–' + item.end));
            svg.appendChild(svgElement('text', {
                x: (x1 + x2) / 2, y: y + 34, 'text-anchor': 'middle', class: 'tochnyi-duration-date',
                'data-tochnyi-reserved': 'duration-dates', 'data-label-group': group
            }, item.start + ' → ' + item.end));
        });
        chartNode.appendChild(svg);
    }

    function renderRange(spec, chartNode) {
        chartNode.classList.add('tochnyi-svg-stage');
        var data = preparedData(spec);
        var outcomePlan = global.TochnyiVisualPlan && global.TochnyiVisualPlan.percentageChangeRangePlan
            ? global.TochnyiVisualPlan.percentageChangeRangePlan(spec, data)
            : { mode: 'raw-range' };
        if (outcomePlan.mode === 'outcome-index') {
            renderOutcomeIndexRange(spec, chartNode, outcomePlan);
            return;
        }
        if (spec.primaryMetric) {
            var metricBlock = element('div', 'tochnyi-range-metric');
            metricBlock.appendChild(element('strong', '', spec.primaryMetric.value));
            metricBlock.appendChild(element('span', '', spec.primaryMetric.label));
            chartNode.appendChild(metricBlock);
        }
        var bounds = axisBounds(spec, data);
        var width = 1000;
        var left = 255;
        var right = 900;
        var top = spec.primaryMetric ? 112 : 52;
        var rowHeight = 67;
        var height = top + data.length * rowHeight + 45;
        var logarithmic = spec.measure.scale === 'logarithmic';
        function coincidesWithReference(value) {
            return (spec.references || []).some(function(reference) {
                var referenceValue = Number(reference && reference.value);
                if (!Number.isFinite(referenceValue)) return false;
                var tolerance = Math.max(1e-9, Math.abs(value) * 1e-9, Math.abs(referenceValue) * 1e-9);
                return Math.abs(referenceValue - value) <= tolerance;
            });
        }
        function scale(value) {
            var min = bounds.minimum;
            var max = bounds.maximum;
            if (logarithmic) {
                min = Math.log10(min);
                max = Math.log10(max);
                value = Math.log10(value);
            }
            return left + ((value - min) / (max - min)) * (right - left);
        }
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            role: 'img',
            'aria-label': spec.title,
            class: 'tochnyi-range-svg',
            'data-label-layout': 'pending'
        });
        for (var tick = 0; tick <= 4; tick += 1) {
            var ratio = tick / 4;
            var raw = logarithmic
                ? Math.pow(10, Math.log10(bounds.minimum) + ratio * (Math.log10(bounds.maximum) - Math.log10(bounds.minimum)))
                : bounds.minimum + ratio * (bounds.maximum - bounds.minimum);
            var x = left + ratio * (right - left);
            svg.appendChild(svgElement('line', { x1: x, y1: top - 20, x2: x, y2: height - 32, class: 'tochnyi-svg-grid' }));
            svg.appendChild(svgElement('text', {
                x: x, y: height - 10, 'text-anchor': 'middle', class: 'tochnyi-svg-tick',
                'data-tochnyi-reserved': 'axis-tick'
            }, formatRawValue(raw, spec)));
        }
        if (!logarithmic && bounds.minimum < 0 && bounds.maximum > 0) {
            var zeroX = scale(0);
            svg.appendChild(svgElement('line', {
                x1: zeroX, y1: top - 28, x2: zeroX, y2: height - 32,
                class: 'tochnyi-svg-zero-reference',
                'data-tochnyi-mark': 'zero-reference'
            }));
            chartNode.setAttribute('data-zero-reference', 'interior-prominent');
        }
        (spec.references || []).forEach(function(reference) {
            var refX = scale(reference.value);
            svg.appendChild(svgElement('line', {
                x1: refX, y1: top - 28, x2: refX, y2: height - 32,
                class: 'tochnyi-svg-reference ' + (reference.lineStyle === 'dashed' ? 'dashed' : ''),
                stroke: TONE_HEX[reference.tone || 'neutral'],
                'data-tochnyi-mark': 'reference-line',
                'data-label-group': 'reference-' + reference.value
            }));
            svg.appendChild(svgElement('text', {
                // The baseline clears the line's top end by more than a descender.
                x: refX + 5, y: top - 34, class: 'tochnyi-svg-reference-label',
                fill: TONE_HEX[reference.tone || 'neutral'],
                'data-tochnyi-reserved': 'reference-label',
                'data-label-group': 'reference-' + reference.value
            }, reference.label));
        });
        data.forEach(function(item, index) {
            var y = top + index * rowHeight;
            var tone = item.tone || (index === 0 ? 'primary' : 'warning');
            var color = TONE_HEX[tone] || TONE_HEX.primary;
            var group = 'range-item-' + index;
            svg.appendChild(svgElement('text', {
                x: left - 18, y: y + 6, 'text-anchor': 'end', class: 'tochnyi-svg-label',
                'data-tochnyi-reserved': 'category-label', 'data-label-group': group
            }, item.label));
            svg.appendChild(svgElement('line', {
                x1: left, y1: y, x2: right, y2: y, class: 'tochnyi-svg-track',
                'data-tochnyi-mark': 'track', 'data-label-group': group
            }));
            if (typeof item.low === 'number' && typeof item.high === 'number') {
                var lowX = scale(item.low);
                var highX = scale(item.high);
                var rangeCenterX = (lowX + highX) / 2;
                var rangeDisplay = item.display || formatRangeValue(item.low, item.high, spec);
                svg.appendChild(svgElement('line', {
                    x1: lowX, y1: y, x2: highX, y2: y, stroke: color, class: 'tochnyi-svg-range',
                    'data-tochnyi-mark': 'range', 'data-label-group': group
                }));
                svg.appendChild(svgElement('circle', {
                    cx: lowX, cy: y, r: 7, fill: color,
                    'data-tochnyi-mark': 'range-start', 'data-label-group': group
                }));
                svg.appendChild(svgElement('circle', {
                    cx: highX, cy: y, r: 7, fill: color,
                    'data-tochnyi-mark': 'range-end', 'data-label-group': group
                }));
                svg.appendChild(svgElement('text', {
                    x: rangeCenterX, y: y - 14, 'text-anchor': 'middle', class: 'tochnyi-svg-value',
                    'data-tochnyi-label': 'range-value', 'data-label-role': 'range-value',
                    'data-label-group': group, 'data-anchor-x': rangeCenterX, 'data-anchor-y': y,
                    'data-label-placements': 'above,below,above-right,above-left,right,left',
                    'data-label-priority': '80'
                }, rangeDisplay));
            }
            if (typeof item.value === 'number') {
                var valueX = scale(item.value);
                svg.appendChild(svgElement('circle', {
                    cx: valueX, cy: y, r: 10, fill: color, stroke: '#ffffff', 'stroke-width': 3,
                    'data-tochnyi-mark': 'point', 'data-label-group': group
                }));
                if (!coincidesWithReference(item.value)) {
                    svg.appendChild(svgElement('text', {
                        x: valueX, y: y - 15, 'text-anchor': 'middle', class: 'tochnyi-svg-value',
                        'data-tochnyi-label': 'point-value', 'data-label-role': 'point-value',
                        'data-label-group': group, 'data-anchor-x': valueX, 'data-anchor-y': y,
                        'data-label-placements': 'above,below,right,left,above-right,above-left',
                        'data-label-priority': '90'
                    }, item.display || formatRawValue(item.value, spec)));
                }
            }
            if (typeof item.benchmark === 'number') {
                var benchmarkX = scale(item.benchmark);
                svg.appendChild(svgElement('line', {
                    x1: benchmarkX, y1: y - 18, x2: benchmarkX, y2: y + 18, class: 'tochnyi-svg-benchmark',
                    'data-tochnyi-mark': 'benchmark', 'data-label-group': group
                }));
            }
        });
        chartNode.appendChild(svg);
        scheduleSvgLabelLayout(svg);
    }

    function renderStacked(spec, chartNode) {
        chartNode.classList.add('tochnyi-stacked-stage');
        var data = preparedData(spec);
        var total = data.reduce(function(sum, item) { return sum + item.value; }, 0);
        var compact = data.length === 2;
        var compactUseExternalLabels = compact && data.some(function(item) {
            return item.value / total * 100 < 18;
        });
        if (compact) chartNode.classList.add('tochnyi-stacked-compact');

        var bar = element('div', 'tochnyi-stacked-bar');
        data.forEach(function(item, index) {
            var share = item.value / total * 100;
            var segment = element('div', 'tochnyi-stacked-segment');
            segment.setAttribute('data-tone', item.tone || ['primary', 'secondary', 'critical', 'warning', 'positive', 'neutral'][index]);
            segment.setAttribute('data-tochnyi-style-mark', 'column');
            segment.setAttribute('data-label-group', 'stacked-segment-' + index);
            segment.style.width = share + '%';
            segment.title = item.label + ': ' + item.display + ' (' + formatNumber(share, 1) + '%)';
            if (share >= 12 && !compactUseExternalLabels) {
                segment.appendChild(element('strong', '', percentText(share)));
                segment.appendChild(element('span', '', item.label));
                if (normalizedCopy(item.display) !== normalizedCopy(percentText(share))) {
                    segment.appendChild(element('small', '', item.display));
                }
            }
            bar.appendChild(segment);
        });
        chartNode.appendChild(bar);

        if (compact) {
            if (!compactUseExternalLabels) return;
            var binaryLabels = element('div', 'tochnyi-stacked-binary-labels');
            data.forEach(function(item, index) {
                var share = item.value / total * 100;
                var label = element('div', 'tochnyi-stacked-binary-label');
                label.setAttribute('data-tone', item.tone || (index === 0 ? 'primary' : 'secondary'));
                label.appendChild(element('strong', '', percentText(share)));
                label.appendChild(element('span', '', item.label));
                if (normalizedCopy(item.display) !== normalizedCopy(percentText(share))) {
                    label.appendChild(element('small', '', item.display));
                }
                binaryLabels.appendChild(label);
            });
            chartNode.appendChild(binaryLabels);
            return;
        }

        var isTrivialPercentTotal = spec.measure && spec.measure.unit === '%' && Math.abs(total - 100) < 0.05;
        if (!isTrivialPercentTotal) {
            var totalMetric = { value: formatRawValue(total, spec), label: 'total' };
            var metricBlock = element('div', 'tochnyi-stacked-total');
            metricBlock.appendChild(element('strong', '', totalMetric.value));
            metricBlock.appendChild(element('span', '', totalMetric.label));
            chartNode.appendChild(metricBlock);
        }

        if (data.every(function(item) { return item.value / total * 100 >= 12; })) return;

        var legend = element('div', 'tochnyi-stacked-legend');
        data.forEach(function(item, index) {
            var entry = element('div', 'tochnyi-stacked-entry');
            entry.setAttribute('data-tone', item.tone || ['primary', 'secondary', 'critical', 'warning', 'positive', 'neutral'][index]);
            entry.appendChild(element('span', 'tochnyi-stacked-swatch'));
            var copy = element('div', '');
            copy.appendChild(element('strong', '', item.label));
            copy.appendChild(element('span', '', item.display + ' · ' + formatNumber(item.value / total * 100, 1) + '%'));
            entry.appendChild(copy);
            legend.appendChild(entry);
        });
        chartNode.appendChild(legend);
    }

    function renderComparedComposition(spec, chartNode) {
        chartNode.classList.add('tochnyi-compared-composition-stage');
        var groups = (spec.data || []).map(function(group) {
            var segments = (group.segments || []).map(function(segment, index) {
                var tone = segment.tone || ['primary', 'secondary', 'warning', 'neutral', 'positive', 'critical'][index];
                return Object.assign({}, segment, {
                    tone: tone,
                    display: segment.displayValue || formatRawValue(segment.value, spec)
                });
            });
            return Object.assign({}, group, {
                segments: segments,
                total: segments.reduce(function(sum, segment) { return sum + Number(segment.value || 0); }, 0)
            });
        });
        var maximum = Math.max.apply(null, groups.map(function(group) { return group.total; }));
        var categories = groups[0] ? groups[0].segments : [];
        var hasNarrowSegment = groups.some(function(group) {
            return group.segments.some(function(segment) {
                return group.total > 0 && segment.value / group.total * 100 < 11;
            });
        });
        var outsideFamily = spec.options.showLabels !== false &&
            (spec.options.labelMode === 'outside' || (spec.options.labelMode === 'auto' && hasNarrowSegment));
        chartNode.setAttribute('data-compared-label-family', outsideFamily ? 'outside' : 'inside');
        if (spec.options.showLegend && !outsideFamily) {
            var key = element('div', 'tochnyi-compared-key');
            categories.forEach(function(segment) {
                var entry = element('div', 'tochnyi-compared-key-item');
                entry.setAttribute('data-tone', segment.tone);
                entry.appendChild(element('span', 'tochnyi-compared-swatch'));
                entry.appendChild(element('span', '', segment.label));
                key.appendChild(entry);
            });
            chartNode.appendChild(key);
        }

        var rows = element('div', 'tochnyi-compared-rows');
        var outsideRails = [];
        groups.forEach(function(group) {
            var row = element('article', 'tochnyi-compared-row');
            var heading = element('div', 'tochnyi-compared-heading');
            heading.appendChild(element('strong', '', group.label));
            heading.appendChild(element('span', '', group.displayValue || formatRawValue(group.total, spec) + ' total'));
            row.appendChild(heading);

            var barWrap = element('div', 'tochnyi-compared-bar-wrap');
            if (outsideFamily) barWrap.classList.add('outside-family');
            var track = element('div', 'tochnyi-compared-track');
            var bar = element('div', 'tochnyi-compared-bar');
            bar.style.width = (group.total / maximum * 100) + '%';
            var cumulativeValue = 0;
            var outsideLabels = [];
            group.segments.forEach(function(segment, segmentIndex) {
                var share = group.total > 0 ? segment.value / group.total * 100 : 0;
                var block = element('div', 'tochnyi-compared-segment');
                block.setAttribute('data-tone', segment.tone);
                block.setAttribute('data-tochnyi-style-mark', 'column');
                block.style.width = share + '%';
                block.title = segment.label + ': ' + segment.display;
                if (!outsideFamily && spec.options.showLabels !== false) {
                    block.appendChild(element('strong', 'tochnyi-compared-segment-value', segment.display));
                }
                bar.appendChild(block);
                if (outsideFamily) {
                    var centerPercent = maximum > 0 ? (cumulativeValue + segment.value / 2) / maximum * 100 : 0;
                    var estimatePercent = Math.min(30, Math.max(12, (segment.label.length + segment.display.length) * 0.72));
                    outsideLabels.push({ segment: segment, center: centerPercent, halfWidth: estimatePercent / 2, lane: 0 });
                }
                cumulativeValue += segment.value;
            });
            track.appendChild(bar);
            barWrap.appendChild(track);
            if (outsideFamily) {
                var labelRail = element('div', 'tochnyi-compared-label-rail');
                outsideLabels.forEach(function(labelInfo) {
                    var directLabel = element('div', 'tochnyi-compared-direct-label');
                    directLabel.setAttribute('data-tone', labelInfo.segment.tone);
                    directLabel.setAttribute('data-segment-center', labelInfo.center.toFixed(3));
                    directLabel.style.left = labelInfo.center + '%';
                    var directCategory = element('strong', '', labelInfo.segment.label);
                    directCategory.style.color = TONE_HEX[labelInfo.segment.tone] || TONE_HEX.neutral;
                    directLabel.appendChild(directCategory);
                    directLabel.appendChild(element('span', '', labelInfo.segment.display));
                    labelRail.appendChild(directLabel);
                    labelInfo.node = directLabel;
                });
                barWrap.appendChild(labelRail);
                outsideRails.push({ rail: labelRail, labels: outsideLabels });
            }
            row.appendChild(barWrap);
            rows.appendChild(row);
        });
        chartNode.appendChild(rows);
        if (outsideFamily) {
            outsideRails.forEach(function(railInfo) {
                var railWidth = railInfo.rail.getBoundingClientRect().width;
                var measured = railInfo.labels.map(function(labelInfo) {
                    return {
                        center: labelInfo.center / 100 * railWidth,
                        width: labelInfo.node.getBoundingClientRect().width
                    };
                });
                var positions = global.TochnyiVisualPlan && global.TochnyiVisualPlan.comparedCompositionLabelCenters
                    ? global.TochnyiVisualPlan.comparedCompositionLabelCenters(measured, railWidth, 8)
                    : measured.map(function(item) { return { center: item.center, desired: item.center, shifted: false }; });
                positions.forEach(function(position, index) {
                    var node = railInfo.labels[index].node;
                    node.style.left = position.center + 'px';
                    node.setAttribute('data-label-shifted', position.shifted ? 'true' : 'false');
                });
            });
            chartNode.setAttribute('data-compared-label-layout', 'segment-centered');
        }
    }

    function renderConvergingSignals(spec, chartNode) {
        chartNode.classList.add('tochnyi-converging-signals-stage');
        var data = preparedData(spec);
        var drivers = data.filter(function(item) { return item.relationshipRole === 'driver'; });
        var outcome = data.find(function(item) { return item.relationshipRole === 'outcome'; });
        var relationship = spec.relationship || {};
        var compact = window.innerWidth <= 900;
        var width = compact ? 600 : 1100;
        var height = compact ? 720 : 430;
        var svg = svgElement('svg', {
            viewBox: '0 0 ' + width + ' ' + height,
            class: 'tochnyi-converging-signals-svg',
            role: 'img',
            'aria-label': drivers[0].label + ' and ' + drivers[1].label + ' converge on ' + outcome.label
        });

        function signedNumber(item, value) {
            var number = Number(value);
            if (!Number.isFinite(number)) return null;
            if (number < 0) return number;
            if (item.direction === 'down') return -number;
            return number;
        }

        function localGeometry(item, layout) {
            var values = [0];
            var point = signedNumber(item, item.value);
            var low = signedNumber(item, item.low);
            var high = signedNumber(item, item.high);
            if (Number.isFinite(low) && Number.isFinite(high) && low > high) {
                var swap = low;
                low = high;
                high = swap;
            }
            if (Number.isFinite(point)) values.push(point);
            if (Number.isFinite(low)) values.push(low);
            if (Number.isFinite(high)) values.push(high);
            if (Number.isFinite(item.benchmark)) values.push(Number(item.benchmark));
            var minimum = Math.min.apply(null, values);
            var maximum = Math.max.apply(null, values);
            if (minimum === maximum) {
                minimum -= 1;
                maximum += 1;
            }
            var span = maximum - minimum;
            minimum -= span * 0.16;
            maximum += span * 0.16;
            var scale = function(value) {
                return layout.x1 + (value - minimum) / (maximum - minimum) * (layout.x2 - layout.x1);
            };
            var endpointValue = Number.isFinite(point)
                ? point
                : item.direction === 'down' ? low : high;
            return {
                point: point,
                low: low,
                high: high,
                scale: scale,
                zeroX: scale(0),
                endpointX: scale(Number.isFinite(endpointValue) ? endpointValue : 0)
            };
        }

        function appendWrappedText(parent, text, x, y, maxCharacters, className, anchor, maxLines) {
            var words = String(text || '').split(/\s+/).filter(Boolean);
            var lines = [];
            var current = '';
            words.forEach(function(word) {
                var candidate = current ? current + ' ' + word : word;
                if (candidate.length > maxCharacters && current) {
                    lines.push(current);
                    current = word;
                } else current = candidate;
            });
            if (current) lines.push(current);
            if (lines.length > maxLines) {
                lines = lines.slice(0, maxLines);
                lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:]?$/, '…');
            }
            var label = svgElement('text', {
                x: x,
                y: y,
                class: className,
                'text-anchor': anchor || 'start',
                'data-tochnyi-reserved': 'true'
            });
            lines.forEach(function(line, index) {
                label.appendChild(svgElement('tspan', {
                    x: x,
                    dy: index === 0 ? 0 : 23
                }, line));
            });
            parent.appendChild(label);
            return label;
        }

        function addArrowHead(parent, x, y, direction, color, group) {
            var points;
            if (direction === 'down') points = (x - 1) + ',' + y + ' ' + (x + 12) + ',' + (y - 8) + ' ' + (x + 12) + ',' + (y + 8);
            else points = (x + 1) + ',' + y + ' ' + (x - 12) + ',' + (y - 8) + ' ' + (x - 12) + ',' + (y + 8);
            parent.appendChild(svgElement('polygon', {
                points: points,
                fill: color,
                'data-label-group': group
            }));
        }

        function drawSignal(item, layout, role, index) {
            var tone = item.tone || (role === 'outcome' ? 'primary' : 'neutral');
            var color = TONE_HEX[tone] || TONE_HEX.neutral;
            var group = 'converging-' + role + '-' + index;
            var geometry = localGeometry(item, layout);
            var labelAnchor = compact ? 'start' : role === 'outcome' ? 'start' : 'start';

            appendWrappedText(svg, item.label,
                layout.x1, layout.y - 62, compact ? 42 : 34, 'tochnyi-signal-label', labelAnchor, 2);
            svg.appendChild(svgElement('text', {
                x: layout.x1,
                y: layout.y - 25,
                class: 'tochnyi-signal-value',
                fill: color,
                'text-anchor': 'start',
                'data-tochnyi-reserved': 'true'
            }, item.display));
            appendWrappedText(svg, item.quantity,
                layout.x1, layout.y + 42, compact ? 58 : 46, 'tochnyi-signal-context', 'start', 2);
            appendWrappedText(svg, item.period,
                layout.x1, layout.y + 68, compact ? 58 : 46, 'tochnyi-signal-period', 'start', 1);

            svg.appendChild(svgElement('line', {
                x1: layout.x1,
                y1: layout.y,
                x2: layout.x2,
                y2: layout.y,
                class: 'tochnyi-signal-track',
                'data-tochnyi-mark': 'local-scale',
                'data-label-group': group
            }));
            svg.appendChild(svgElement('line', {
                x1: geometry.zeroX,
                y1: layout.y - 12,
                x2: geometry.zeroX,
                y2: layout.y + 12,
                class: 'tochnyi-signal-zero',
                'data-tochnyi-mark': 'zero-reference',
                'data-label-group': group
            }));

            if (Number.isFinite(item.benchmark)) {
                var benchmarkX = geometry.scale(Number(item.benchmark));
                svg.appendChild(svgElement('line', {
                    x1: benchmarkX,
                    y1: layout.y - 20,
                    x2: benchmarkX,
                    y2: layout.y + 20,
                    class: 'tochnyi-signal-benchmark',
                    'data-tochnyi-mark': 'local-benchmark',
                    'data-label-group': group
                }));
            }

            if (Number.isFinite(geometry.low) && Number.isFinite(geometry.high)) {
                var lowX = geometry.scale(geometry.low);
                var highX = geometry.scale(geometry.high);
                svg.appendChild(svgElement('line', {
                    x1: lowX,
                    y1: layout.y,
                    x2: highX,
                    y2: layout.y,
                    stroke: color,
                    class: role === 'outcome' ? 'tochnyi-signal-range outcome' : 'tochnyi-signal-range',
                    'data-tochnyi-mark': 'signal-range',
                    'data-label-group': group
                }));
                svg.appendChild(svgElement('circle', {
                    cx: lowX,
                    cy: layout.y,
                    r: role === 'outcome' ? 8 : 6,
                    fill: color,
                    'data-tochnyi-mark': 'signal-range-start',
                    'data-label-group': group
                }));
                svg.appendChild(svgElement('circle', {
                    cx: highX,
                    cy: layout.y,
                    r: role === 'outcome' ? 8 : 6,
                    fill: color,
                    'data-tochnyi-mark': 'signal-range-end',
                    'data-label-group': group
                }));
                addArrowHead(svg, item.direction === 'down' ? lowX : highX, layout.y, item.direction, color, group);
            } else {
                svg.appendChild(svgElement('line', {
                    x1: geometry.zeroX,
                    y1: layout.y,
                    x2: geometry.endpointX,
                    y2: layout.y,
                    stroke: color,
                    class: role === 'outcome' ? 'tochnyi-signal-stroke outcome' : 'tochnyi-signal-stroke',
                    'data-tochnyi-mark': 'signal-value',
                    'data-label-group': group
                }));
                svg.appendChild(svgElement('circle', {
                    cx: geometry.endpointX,
                    cy: layout.y,
                    r: role === 'outcome' ? 9 : 7,
                    fill: color,
                    'data-tochnyi-mark': 'signal-point',
                    'data-label-group': group
                }));
                addArrowHead(svg, geometry.endpointX, layout.y, item.direction, color, group);
            }
            return geometry;
        }

        var driverLayouts;
        var outcomeLayout;
        var hub;
        if (compact) {
            driverLayouts = [
                { x1: 72, x2: 528, y: 118 },
                { x1: 72, x2: 528, y: 288 }
            ];
            outcomeLayout = { x1: 72, x2: 528, y: 535 };
            hub = { x: 300, y: 430 };
        } else {
            driverLayouts = [
                { x1: 58, x2: 430, y: 112 },
                { x1: 58, x2: 430, y: 302 }
            ];
            outcomeLayout = { x1: 710, x2: 1040, y: 207 };
            hub = { x: 575, y: 207 };
        }

        var connectorGroup = svgElement('g', { class: 'tochnyi-signal-connectors', 'aria-hidden': 'true' });
        if (compact) {
            connectorGroup.appendChild(svgElement('path', {
                d: 'M 300 160 C 300 245 260 340 ' + hub.x + ' ' + hub.y,
                class: 'tochnyi-signal-link'
            }));
            connectorGroup.appendChild(svgElement('path', {
                d: 'M 300 365 C 300 390 340 405 ' + hub.x + ' ' + hub.y,
                class: 'tochnyi-signal-link'
            }));
            connectorGroup.appendChild(svgElement('path', {
                d: 'M ' + hub.x + ' ' + hub.y + ' L ' + hub.x + ' ' + (outcomeLayout.y - 38),
                class: 'tochnyi-signal-link',
                'data-relationship-connector': 'continuation'
            }));
        } else {
            connectorGroup.appendChild(svgElement('path', {
                d: 'M 444 112 C 500 112 520 177 ' + hub.x + ' ' + hub.y,
                class: 'tochnyi-signal-link'
            }));
            connectorGroup.appendChild(svgElement('path', {
                d: 'M 444 302 C 500 302 520 237 ' + hub.x + ' ' + hub.y,
                class: 'tochnyi-signal-link'
            }));
            connectorGroup.appendChild(svgElement('path', {
                d: 'M ' + hub.x + ' ' + hub.y + ' L ' + (outcomeLayout.x1 - 18) + ' ' + hub.y,
                class: 'tochnyi-signal-link',
                'data-relationship-connector': 'continuation'
            }));
        }
        chartNode.setAttribute('data-relationship-continuation', 'true');
        svg.appendChild(connectorGroup);

        drawSignal(drivers[0], driverLayouts[0], 'driver', 0);
        drawSignal(drivers[1], driverLayouts[1], 'driver', 1);
        drawSignal(outcome, outcomeLayout, 'outcome', 0);
        chartNode.appendChild(svg);
    }

    function renderStatusGrid(spec, chartNode) {
        chartNode.classList.add('tochnyi-status-stage');
        var labels = {
            stable: 'Stable', improving: 'Improving', strained: 'Strained',
            critical: 'Critical', blocked: 'Blocked', unknown: 'Unknown'
        };
        var list = element('div', 'tochnyi-status-list');
        spec.data.forEach(function(item) {
            var row = element('article', 'tochnyi-status-row');
            row.setAttribute('data-status', item.status);
            var indicator = element('span', 'tochnyi-status-indicator');
            indicator.setAttribute('aria-hidden', 'true');
            row.appendChild(indicator);
            var content = element('div', 'tochnyi-status-content');
            var header = element('div', 'tochnyi-status-header');
            header.appendChild(element('strong', 'tochnyi-status-title', item.label));
            header.appendChild(element('span', 'tochnyi-status-badge', labels[item.status]));
            content.appendChild(header);
            if (item.displayValue) content.appendChild(element('div', 'tochnyi-status-value', item.displayValue));
            content.appendChild(element('p', '', item.detail));
            row.appendChild(content);
            list.appendChild(row);
        });
        chartNode.appendChild(list);
    }

    function renderLegacyStoryEvidence(spec, chartNode) {
        chartNode.classList.add('tochnyi-evidence-stage');
        var groups = [];
        var byGroup = {};
        preparedData(spec).forEach(function(item) {
            var groupName = item.group || '';
            if (!byGroup[groupName]) {
                byGroup[groupName] = [];
                groups.push(groupName);
            }
            byGroup[groupName].push(item);
        });

        groups.forEach(function(groupName) {
            var section = element('section', 'tochnyi-evidence-group');
            if (groupName) section.appendChild(element('h3', 'tochnyi-evidence-group-title', groupName));
            var list = element('ol', 'tochnyi-evidence-list');
            byGroup[groupName].forEach(function(item) {
                var row = element('li', 'tochnyi-evidence-item');
                row.setAttribute('data-tone', item.tone || 'neutral');
                if (item.status) row.setAttribute('data-status', item.status);
                var marker = element('span', 'tochnyi-evidence-marker');
                marker.setAttribute('aria-hidden', 'true');
                row.appendChild(marker);
                var copy = element('div', 'tochnyi-evidence-copy');
                var heading = element('div', 'tochnyi-evidence-heading');
                heading.appendChild(element('strong', 'tochnyi-evidence-label', item.label));
                heading.appendChild(element('span', 'tochnyi-evidence-value', item.display || formatValue(item, spec)));
                if (item.direction) {
                    var directionMarker = item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : '•';
                    heading.appendChild(element('span', 'tochnyi-evidence-direction ' + item.direction, directionMarker));
                }
                copy.appendChild(heading);
                copy.appendChild(element('p', '', item.detail));
                row.appendChild(copy);
                list.appendChild(row);
            });
            section.appendChild(list);
            chartNode.appendChild(section);
        });
    }

    function renderHeadline(spec, chartNode) {
        chartNode.classList.add('tochnyi-headline-stage');
        var item = preparedData(spec)[0];
        var metric = spec.primaryMetric || { value: item.display, label: item.label };
        var visual = spec.visual || { type: 'auto' };
        var visualType = visual.type || 'auto';
        if (visualType === 'auto') {
            visualType = spec.measure && spec.measure.unit === '%' && item.value >= 0 && item.value <= 100
                ? 'progress'
                : 'number';
        }
        var block = element('div', 'tochnyi-headline-metric');
        block.setAttribute('data-tone', item.tone || 'primary');
        block.setAttribute('data-visual-type', visualType);
        var copy = element('div', 'tochnyi-headline-copy');
        copy.appendChild(element('div', 'tochnyi-headline-value', metric.value));
        copy.appendChild(element('div', 'tochnyi-headline-label', metric.label));
        block.appendChild(copy);

        if (visualType === 'progress') {
            var progressValue = Math.max(0, Math.min(100, Number(item.value) || 0));
            var progress = element('div', 'tochnyi-headline-progress');
            progress.setAttribute('role', 'img');
            progress.setAttribute('aria-label', metric.value + ' ' + metric.label);
            var progressFill = element('div', 'tochnyi-headline-progress-fill');
            progressFill.style.width = progressValue + '%';
            progress.appendChild(progressFill);
            block.appendChild(progress);
        }

        if (visualType === 'pictogram') {
            var total = visual.total || 10;
            var filled = visual.filled;
            if (!Number.isInteger(filled)) {
                filled = spec.measure && spec.measure.unit === '%'
                    ? Math.round(Math.max(0, Math.min(100, Number(item.value) || 0)) / 100 * total)
                    : total;
            }
            var pictogram = element('div', 'tochnyi-pictogram');
            pictogram.style.setProperty('--tochnyi-pictogram-columns', String(visual.columns || Math.min(10, total)));
            pictogram.setAttribute('role', 'img');
            pictogram.setAttribute('aria-label', filled + ' of ' + total + ' ' + (visual.icon || 'person') + ' symbols highlighted');
            for (var index = 0; index < total; index += 1) {
                var icon = semanticIcon(visual.icon, 'tochnyi-pictogram-icon');
                icon.classList.toggle('is-filled', index < filled);
                pictogram.appendChild(icon);
            }
            block.appendChild(pictogram);
        }
        chartNode.appendChild(block);
    }

    function renderHeatMatrix(spec, chartNode) {
        chartNode.classList.add('tochnyi-heat-stage');
        var data = preparedData(spec);
        var rows = [];
        var columns = [];
        var rowKeys = new Set();
        var columnKeys = new Set();
        var cells = new Map();

        data.forEach(function(item) {
            var rowKey = normalizedCopy(item.label);
            var columnKey = normalizedCopy(item.column);
            if (!rowKeys.has(rowKey)) {
                rowKeys.add(rowKey);
                rows.push({ key: rowKey, label: item.label });
            }
            if (!columnKeys.has(columnKey)) {
                columnKeys.add(columnKey);
                columns.push({ key: columnKey, label: item.column });
            }
            cells.set(rowKey + '\u0000' + columnKey, item);
        });

        var values = data.map(function(item) { return Number(item.value); });
        var observedMinimum = Math.min.apply(null, values);
        var observedMaximum = Math.max.apply(null, values);
        var minimum = Number.isFinite(Number(spec.measure.minimum)) ? Number(spec.measure.minimum) : observedMinimum;
        var maximum = Number.isFinite(Number(spec.measure.maximum)) ? Number(spec.measure.maximum) : observedMaximum;
        var span = Math.max(1e-12, maximum - minimum);

        function clamp01(value) { return Math.max(0, Math.min(1, value)); }
        var heatScale = Tochnyi.scales && Tochnyi.scales.sequentialBlue || {
            startRgb: [238, 243, 248],
            endRgb: [0, 91, 187],
            minimumVisualRatio: 0.10,
            lightTextThreshold: 0.60,
            lightText: '#ffffff',
            darkText: '#17212b'
        };
        function cellColor(value) {
            var ratio = clamp01((Number(value) - minimum) / span);
            var minimumVisualRatio = Number(heatScale.minimumVisualRatio);
            if (!Number.isFinite(minimumVisualRatio)) minimumVisualRatio = 0.10;
            var visualRatio = minimumVisualRatio + ratio * (1 - minimumVisualRatio);
            var start = heatScale.startRgb;
            var end = heatScale.endRgb;
            var channels = start.map(function(channel, index) {
                return Math.round(channel + (end[index] - channel) * visualRatio);
            });
            return 'rgb(' + channels.join(', ') + ')';
        }
        function labelColor(value) {
            var ratio = clamp01((Number(value) - minimum) / span);
            return ratio >= Number(heatScale.lightTextThreshold)
                ? heatScale.lightText
                : heatScale.darkText;
        }

        chartNode.setAttribute('data-heat-rows', String(rows.length));
        chartNode.setAttribute('data-heat-columns', String(columns.length));
        chartNode.setAttribute('data-heat-cells', String(data.length));
        chartNode.setAttribute('data-heat-scale', 'sequential');
        chartNode.setAttribute('data-heat-domain-min', String(minimum));
        chartNode.setAttribute('data-heat-domain-max', String(maximum));
        chartNode.setAttribute('data-heat-direct-labels', 'true');

        var grid = element('div', 'tochnyi-heat-grid');
        grid.style.setProperty('--tochnyi-heat-columns', String(columns.length));
        grid.style.setProperty('--tochnyi-heat-rows', String(rows.length));
        grid.setAttribute('role', 'table');
        grid.setAttribute('aria-label', spec.measure.axisTitle || spec.measure.quantity || 'Matrix values');

        var corner = element('div', 'tochnyi-heat-corner');
        corner.setAttribute('aria-hidden', 'true');
        grid.appendChild(corner);
        columns.forEach(function(column) {
            var header = element('div', 'tochnyi-heat-column-label', column.label);
            header.setAttribute('role', 'columnheader');
            grid.appendChild(header);
        });

        rows.forEach(function(row, rowIndex) {
            var rowLabel = element('div', 'tochnyi-heat-row-label', row.label);
            rowLabel.setAttribute('role', 'rowheader');
            grid.appendChild(rowLabel);
            columns.forEach(function(column, columnIndex) {
                var item = cells.get(row.key + '\u0000' + column.key);
                var cell = element('div', 'tochnyi-heat-cell');
                var group = 'heat-' + rowIndex + '-' + columnIndex;
                cell.setAttribute('role', 'cell');
                cell.setAttribute('data-tochnyi-style-mark', 'heat-cell');
                cell.setAttribute('data-label-group', group);
                cell.setAttribute('aria-label', row.label + ', ' + column.label + ': ' + item.display);
                cell.style.backgroundColor = cellColor(item.value);
                cell.style.color = labelColor(item.value);
                var value = element('strong', 'tochnyi-heat-value', item.display);
                value.setAttribute('data-label-role', 'data-label');
                cell.appendChild(value);
                grid.appendChild(cell);
            });
        });
        chartNode.appendChild(grid);

        var legend = element('div', 'tochnyi-heat-legend');
        legend.setAttribute('aria-label', 'Color scale from ' + formatRawValue(minimum, spec) + ' to ' + formatRawValue(maximum, spec));
        legend.appendChild(element('span', 'tochnyi-heat-legend-value', formatRawValue(minimum, spec)));
        var ramp = element('div', 'tochnyi-heat-legend-ramp');
        ramp.style.background = 'linear-gradient(90deg, ' + cellColor(minimum) + ', ' + cellColor(maximum) + ')';
        legend.appendChild(ramp);
        legend.appendChild(element('span', 'tochnyi-heat-legend-value', formatRawValue(maximum, spec)));
        legend.appendChild(element('small', 'tochnyi-heat-legend-label', spec.measure.axisTitle || spec.measure.quantity || 'Value'));
        chartNode.appendChild(legend);
    }

    function render(spec) {
        var chartNode = createScaffold(spec);
        if (usesSvgKit(spec)) {
            renderWhenStable(spec, chartNode, renderKitChart);
            document.documentElement.setAttribute('data-rendered', 'true');
            return;
        }
        switch (spec.recipe) {
            case 'comparison.range':
                renderRange(spec, chartNode);
                break;
            case 'comparison.benchmark-gap':
                renderBenchmarkGap(spec, chartNode);
                break;
            case 'comparison.dumbbell':
                renderDumbbell(spec, chartNode);
                break;
            case 'comparison.grouped':
                renderGroupedComparisonWhenStable(spec, chartNode);
                break;
            case 'matrix.heat':
                renderHeatMatrix(spec, chartNode);
                break;
            case 'relationship.converging-signals':
                renderConvergingSignals(spec, chartNode);
                break;
            case 'timeline.duration':
                renderDurationTimeline(spec, chartNode);
                break;
            case 'composition.stacked':
                renderStacked(spec, chartNode);
                break;
            case 'composition.compared':
                renderComparedComposition(spec, chartNode);
                break;
            case 'status.grid':
                renderStatusGrid(spec, chartNode);
                break;
            case 'story.facets':
                renderLegacyStoryEvidence(spec, chartNode);
                break;
            case 'map.regional':
                if (!global.TochnyiMapRuntime) throw new Error('Tochnyi map runtime did not load.');
                global.TochnyiMapRuntime.render(spec, chartNode);
                break;
            case 'headline.metric':
                renderHeadline(spec, chartNode);
                break;
            default:
                throw new Error('Unsupported chart recipe: ' + spec.recipe);
        }
        document.documentElement.setAttribute('data-rendered', 'true');
    }

    function showError(error) {
        var app = document.getElementById('tochnyi-app');
        app.replaceChildren();
        var box = element('div', 'tochnyi-render-error');
        box.appendChild(element('strong', '', 'Chart could not be rendered.'));
        box.appendChild(element('pre', '', error && error.message ? error.message : String(error)));
        app.appendChild(box);
        document.documentElement.setAttribute('data-rendered', 'error');
        console.error(error);
    }

    function boot() {
        try {
            var specNode = document.getElementById('tochnyi-spec');
            if (!specNode) throw new Error('Missing #tochnyi-spec JSON payload.');
            var spec = JSON.parse(specNode.textContent);
            render(spec);
        } catch (error) {
            showError(error);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    global.TochnyiRuntime = { render: render, formatValue: formatValue };
})(window);
