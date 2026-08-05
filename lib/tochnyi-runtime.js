/*
 * Tochnyi declarative renderer v2
 * Reads a validated ChartSpec and owns all HTML, AMCharts, and visual behavior.
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

    function assetsPrefix() {
        return document.documentElement.getAttribute('data-assets') || '';
    }

    function assetUrl(filename) {
        var version = document.documentElement.getAttribute('data-assets-version') || '';
        return assetsPrefix() + filename + (version ? '?v=' + encodeURIComponent(version) : '');
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

    function rankingData(spec) {
        var data = preparedData(spec);
        var plan = visualPlan(spec, data);
        return {
            plan: plan,
            data: data.map(function(item, index) {
                var color = item.color;
                if (plan.colorPolicy === 'focus') {
                    if (index === 0) {
                        color = item.tone ? colorFor(item, index) :
                            ['warning', 'collapse'].includes(spec.narrative.frame) ? TONE_COLORS.critical : TONE_COLORS.primary;
                    } else if (index === 1 && plan.accentSecond) {
                        color = TONE_COLORS.warning;
                    } else {
                        color = index % 2 ? VISUAL_COLORS.mutedLight : VISUAL_COLORS.muted;
                    }
                }
                return Object.assign({}, item, {
                    rank: index + 1,
                    axisLabel: (index + 1) + '.  ' + item.label,
                    color: color
                });
            })
        };
    }

    function labelFitsInside(item, bounds) {
        var span = Math.max(1, bounds.maximum - bounds.minimum);
        var ratio = Math.max(0, (item.value - bounds.minimum) / span);
        var estimatedTextFraction = 0.08 + String(item.display || '').length * 0.012;
        return ratio >= estimatedTextFraction;
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

    function measuredSpriteHeight(sprite) {
        if (!sprite) return 0;
        var privateHeight = sprite.getPrivate ? Number(sprite.getPrivate('height')) : 0;
        if (Number.isFinite(privateHeight) && privateHeight !== 0) return Math.abs(privateHeight);
        var publicHeight = typeof sprite.height === 'function' ? Number(sprite.height()) : 0;
        if (Number.isFinite(publicHeight) && publicHeight !== 0) return Math.abs(publicHeight);
        try {
            var bounds = sprite.localBounds && sprite.localBounds();
            var boundsHeight = bounds ? Number(bounds.bottom) - Number(bounds.top) : 0;
            if (Number.isFinite(boundsHeight) && boundsHeight !== 0) return Math.abs(boundsHeight);
        } catch (error) {}
        return 0;
    }

    function measuredSpriteBounds(sprite) {
        if (!sprite) return null;
        try {
            if (typeof sprite.globalBounds === 'function') {
                var bounds = sprite.globalBounds();
                if (bounds && [bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite)) {
                    return {
                        left: Math.min(bounds.left, bounds.right),
                        right: Math.max(bounds.left, bounds.right),
                        top: Math.min(bounds.top, bounds.bottom),
                        bottom: Math.max(bounds.top, bounds.bottom),
                        width: Math.abs(bounds.right - bounds.left),
                        height: Math.abs(bounds.bottom - bounds.top)
                    };
                }
            }
        } catch (error) {}
        return null;
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
        if (!fitCaptureRequested() || !plan.canShrinkChart || global.innerWidth < 900) return;
        var bodyStyle = global.getComputedStyle(document.body);
        var bottomPadding = parseFloat(bodyStyle.paddingBottom) || 0;
        var allowedBottom = requestedCaptureHeight() - bottomPadding;
        var mainBottom = main.getBoundingClientRect().bottom;
        var overflow = Math.ceil(mainBottom - allowedBottom);
        if (overflow <= 0) return;

        var currentHeight = chartContainer.getBoundingClientRect().height;
        var minimum = Number(plan.minimumChartHeight) || 350;
        var nextHeight = Math.max(minimum, currentHeight - overflow - 6);
        chartContainer.style.height = Math.round(nextHeight) + 'px';
        chartContainer.setAttribute('data-fitted-height', String(Math.round(nextHeight)));
        if (nextHeight === minimum && overflow > currentHeight - minimum) {
            main.setAttribute('data-fit-exhausted', 'true');
        }
    }

    function applySemanticColumnAppearance(series) {
        Tochnyi.applyColumnAppearance(series);
        series.columns.template.adapters.add('fill', function(fill, target) {
            return target.dataItem ? am5.color(target.dataItem.dataContext.color) : fill;
        });
        series.columns.template.adapters.add('stroke', function(stroke, target) {
            return target.dataItem ? am5.color(target.dataItem.dataContext.color) : stroke;
        });
        return series;
    }

    function tonePriority(tone) {
        return {
            critical: 60,
            warning: 50,
            positive: 40,
            primary: 30,
            secondary: 20,
            neutral: 10
        }[tone] || 0;
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
        (spec.references || []).forEach(function(reference) { values.push(reference.value); });
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

    function addValueReferences(root, axis, spec) {
        (spec.references || []).forEach(function(reference) {
            var dataItem = axis.makeDataItem({ value: reference.value });
            var range = axis.createAxisRange(dataItem);
            var tone = reference.tone || 'neutral';
            range.get('grid').setAll({
                stroke: am5.color(TONE_COLORS[tone] || TONE_COLORS.neutral),
                strokeWidth: 2,
                strokeOpacity: 0.9,
                strokeDasharray: reference.lineStyle === 'dashed' ? [7, 5] : []
            });
            range.get('label').setAll({
                text: reference.label,
                fill: am5.color(TONE_COLORS[tone] || TONE_COLORS.neutral),
                fontFamily: Tochnyi.font.family,
                fontSize: 13,
                fontWeight: '600',
                inside: true,
                paddingTop: 4,
                paddingLeft: 5
            });
        });
    }

    function addInteriorZeroReference(root, axis, bounds) {
        if (!bounds || !(bounds.minimum < 0 && bounds.maximum > 0)) return false;
        var dataItem = axis.makeDataItem({ value: 0 });
        var range = axis.createAxisRange(dataItem);
        range.get('grid').setAll({
            stroke: am5.color(Tochnyi.colors.black),
            strokeWidth: 3,
            strokeOpacity: 0.82
        });
        var chartHost = document.getElementById('chartdiv');
        if (chartHost) chartHost.setAttribute('data-zero-reference', 'interior-prominent');
        return true;
    }

    function addAxisTitle(root, axis, text, orientation) {
        if (!text) return;
        if (orientation === 'vertical') {
            axis.children.unshift(am5.Label.new(root, {
                rotation: -90,
                text: text.toUpperCase(),
                y: am5.percent(50),
                centerX: am5.percent(50),
                fontSize: 14,
                fontWeight: '600',
                fontFamily: Tochnyi.font.family,
                fill: am5.color(Tochnyi.colors.gray)
            }));
        } else {
            axis.children.push(am5.Label.new(root, {
                text: text.toUpperCase(),
                x: am5.percent(50),
                centerX: am5.percent(50),
                fontSize: 14,
                fontWeight: '600',
                fontFamily: Tochnyi.font.family,
                fill: am5.color(Tochnyi.colors.gray),
                paddingTop: 8
            }));
        }
    }

    function animate(chart, series, spec) {
        var staticMode = new URLSearchParams(global.location.search).has('static');
        if (staticMode || spec.options.animate === false) {
            chart.appear(0, 0);
            if (series && series.appear) series.appear(0, 0);
            return;
        }
        if (series && series.appear) series.appear(800, 80);
        chart.appear(800, 80);
    }

    function createScaffold(spec) {
        var app = document.getElementById('tochnyi-app');
        app.replaceChildren();
        document.body.classList.toggle('tochnyi-regional-page', spec.recipe === 'map.regional');

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
        header.appendChild(element('div', 'tochnyi-date', 'Date: ' + spec.date));
        var title = element('h1', 'tochnyi-title', spec.title);
        var subtitle = element('p', 'tochnyi-subtitle', spec.subtitle);
        if (!matrixLayout) {
            main.appendChild(header);
            main.appendChild(title);
            main.appendChild(subtitle);
        }

        var chartContainer = element('section', 'tochnyi-chart-container ' + spec.options.height + ' ' + recipeClass);
        if (matrixLayout) {
            chartContainer.classList.add('tochnyi-matrix-stage', 'regional-routing-matrix-stage');
            chartContainer.appendChild(header);
            chartContainer.appendChild(title);
            chartContainer.appendChild(subtitle);
        }
        chartContainer.setAttribute('aria-label', spec.title);
        chartContainer.style.height = plan.chartHeight + 'px';
        chartContainer.setAttribute('data-planned-height', String(plan.chartHeight));
        chartContainer.setAttribute('data-item-count', String(scaffoldData.length));

        var watermark = element('img', 'tochnyi-watermark');
        watermark.src = assetUrl('watermark.svg');
        watermark.alt = '';
        watermark.classList.add('watermark-' + plan.watermark);
        chartContainer.appendChild(watermark);

        if (spec.emphasis) {
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

        if (spec.note) {
            var note = element('aside', 'tochnyi-note', spec.note);
            if (spec.recipe === 'composition.stacked') note.classList.add('compact');
            main.appendChild(note);
        }

        var bottom = element('div', 'tochnyi-bottom');
        if (spec.source && spec.source.name) {
            var sourceText = 'Source: ' + spec.source.name + (spec.source.period ? ' — ' + spec.source.period : '');
            var source = element(spec.source.url ? 'a' : 'div', 'tochnyi-source', sourceText);
            if (spec.source.url) {
                source.href = spec.source.url;
                source.rel = 'noopener noreferrer';
            }
            bottom.appendChild(source);
        }

        var footer = element('footer', 'tochnyi-footer');
        footer.appendChild(element('span', '', 'Analysis by:'));
        var xLink = element('a', '', '@delfoo');
        xLink.href = 'https://x.com/delfoo';
        var bskyLink = element('a', '', '@delfoo.bsky.social');
        bskyLink.href = 'https://bsky.app/profile/delfoo.bsky.social';
        footer.appendChild(xLink);
        footer.appendChild(bskyLink);
        bottom.appendChild(footer);
        if (matrixLayout) chartContainer.appendChild(bottom);
        else main.appendChild(bottom);

        app.appendChild(main);
        fitScaffoldToViewport(main, chartContainer, plan);
        return chart;
    }

    function renderColumns(spec) {
        var data = preparedData(spec);
        var plan = visualPlan(spec, data);
        var chartHost = document.getElementById('chartdiv');
        var availableWidth = chartHost ? chartHost.clientWidth : plan.viewportWidth;
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'none',
            wheelY: 'none',
            maskBullets: false,
            paddingLeft: 10,
            paddingRight: 20,
            paddingTop: 20,
            paddingBottom: 10
        }));

        var xRenderer = Tochnyi.createXRenderer(root, {
            minGridDistance: 30,
            cellStartLocation: 0.12,
            cellEndLocation: 0.88,
            fontSize: plan.compact ? 14 : data.length > 4 ? 16 : 19,
            fontWeight: '600'
        });
        xRenderer.labels.template.setAll({
            oversizedBehavior: 'wrap',
            maxWidth: Math.max(88, Math.min(plan.compact ? 110 : 170, Math.floor((availableWidth - 120) / data.length))),
            textAlign: 'center',
            paddingTop: 10
        });
        var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: 'label',
            renderer: xRenderer
        }));
        xAxis.data.setAll(data);

        var bounds = axisBounds(spec, data);
        var yRenderer = Tochnyi.createYRenderer(root, { fontSize: plan.compact ? 12 : 15 });
        yRenderer.grid.template.setAll({ strokeOpacity: 0.14 });
        var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            min: bounds.minimum,
            max: bounds.maximum,
            strictMinMax: true,
            logarithmic: spec.measure.scale === 'logarithmic',
            renderer: yRenderer
        }));
        if (plan.showAxisTitle) addAxisTitle(root, yAxis, spec.measure.axisTitle || spec.measure.unit, 'vertical');
        addInteriorZeroReference(root, yAxis, bounds);
        addValueReferences(root, yAxis, spec);

        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: 'value',
            categoryXField: 'label',
            tooltip: am5.Tooltip.new(root, { labelText: '{label}: {display}' })
        }));
        series.columns.template.setAll({
            width: am5.percent(data.length === 2 ? 46 : 64),
            cornerRadiusTL: 7,
            cornerRadiusTR: 7
        });
        applySemanticColumnAppearance(series);
        if (spec.options.showLabels) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                var item = dataItem.dataContext;
                var fontSize = plan.compact ? 16 : data.length > 4 ? 20 : 28;
                var placement = columnLabelPlacement(item, bounds, plan, { fontSize: fontSize });
                var label = am5.Label.new(rootRef, {
                    text: item.display,
                    fill: am5.color(Tochnyi.colors.black),
                    centerY: am5.percent(placement.centerYPercent),
                    centerX: am5.percent(50),
                    dy: placement.dy,
                    fontSize: fontSize,
                    fontWeight: '700',
                    fontFamily: Tochnyi.font.family,
                    oversizedBehavior: 'wrap',
                    maxWidth: plan.compact ? 90 : 180,
                    textAlign: 'center'
                });
                var bullet = am5.Bullet.new(rootRef, {
                    locationY: placement.locationY,
                    dynamic: true,
                    sprite: label
                });
                var scheduled = false;
                var lastPlacement = '';

                function applyMeasuredPlacement() {
                    scheduled = false;
                    var column = dataItem.get('graphics');
                    var measured = columnLabelPlacement(item, bounds, plan, {
                        fontSize: fontSize,
                        plotHeight: measuredSpriteHeight(chart.plotContainer),
                        barHeight: measuredSpriteHeight(column),
                        labelHeight: measuredSpriteHeight(label)
                    });
                    var key = [measured.locationY, measured.centerYPercent, measured.dy].join(':');
                    if (key === lastPlacement) return;
                    lastPlacement = key;
                    bullet.set('locationY', measured.locationY);
                    label.setAll({
                        centerY: am5.percent(measured.centerYPercent),
                        dy: measured.dy
                    });
                    if (seriesRef && typeof seriesRef.markDirtyValues === 'function') {
                        seriesRef.markDirtyValues(dataItem);
                    }
                }

                function schedulePlacement() {
                    if (scheduled) return;
                    scheduled = true;
                    if (global.requestAnimationFrame) global.requestAnimationFrame(applyMeasuredPlacement);
                    else global.setTimeout(applyMeasuredPlacement, 0);
                }

                var column = dataItem.get('graphics');
                if (column && column.events) column.events.on('boundschanged', schedulePlacement);
                if (label.events) label.events.on('boundschanged', schedulePlacement);
                if (chart.plotContainer && chart.plotContainer.events) chart.plotContainer.events.on('boundschanged', schedulePlacement);
                global.setTimeout(schedulePlacement, 0);
                global.setTimeout(schedulePlacement, spec.options.animate === false ? 80 : 650);
                return bullet;
            });
        }
        series.data.setAll(data);
        animate(chart, series, spec);
    }

    function renderTrend(spec) {
        var data = preparedData(spec);
        var labelPlan = global.TochnyiVisualPlan && global.TochnyiVisualPlan.trendLabelPlan
            ? global.TochnyiVisualPlan.trendLabelPlan(data)
            : data.map(function(item, index) {
                return { showLabel: index === 0 || index === data.length - 1, dy: -22, dx: 0, centerXPercent: 50 };
            });
        data = data.map(function(item, index) {
            return Object.assign({}, item, { trendLabel: labelPlan[index], trendIndex: index });
        });
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: data.length > 10,
            panY: false,
            wheelX: data.length > 10 ? 'panX' : 'none',
            wheelY: 'none',
            paddingLeft: 10,
            paddingRight: 25,
            paddingTop: 30,
            paddingBottom: 10
        }));

        var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: 'label',
            startLocation: data.length >= 8 ? 0.08 : 0,
            endLocation: data.length >= 8 ? 0.92 : 1,
            renderer: Tochnyi.createXRenderer(root, {
                minGridDistance: 45,
                fontSize: data.length > 8 ? 15 : 18,
                fontWeight: '600'
            })
        }));
        xAxis.data.setAll(data);

        var bounds = axisBounds(spec, data);
        var yRenderer = Tochnyi.createYRenderer(root, { fontSize: 15 });
        yRenderer.grid.template.setAll({ strokeOpacity: 0.14 });
        var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            min: bounds.minimum,
            max: bounds.maximum,
            strictMinMax: true,
            logarithmic: spec.measure.scale === 'logarithmic',
            renderer: yRenderer
        }));
        addAxisTitle(root, yAxis, spec.measure.axisTitle || spec.measure.unit, 'vertical');
        addInteriorZeroReference(root, yAxis, bounds);
        addValueReferences(root, yAxis, spec);

        var series = Tochnyi.createLineSeries(root, chart, {
            name: spec.title,
            xAxis: xAxis,
            yAxis: yAxis,
            valueField: 'value',
            categoryField: 'label',
            color: Tochnyi.colors.blue,
            strokeWidth: 4,
            bulletRadius: data.length > 10 ? 4 : 6
        });
        series.set('tooltip', am5.Tooltip.new(root, { labelText: '{label}: {display}' }));
        var trendLabelEntries = [];
        var trendLabelHost = document.getElementById('chartdiv');
        if (trendLabelHost && spec.options.showLabels) {
            trendLabelHost.setAttribute('data-trend-label-layout', 'pending');
            trendLabelHost.setAttribute('data-trend-label-line-overlaps', 'pending');
            trendLabelHost.setAttribute('data-trend-label-visible-count', '0');
        }
        if (spec.options.showLabels) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                var item = dataItem.dataContext;
                if (!item.trendLabel || !item.trendLabel.showLabel) return undefined;
                var above = item.trendLabel.preferredPlacement === 'above' || item.trendLabel.dy < 0;
                var label = am5.Label.new(rootRef, {
                    text: item.display,
                    dy: above ? -10 : 10,
                    dx: item.trendLabel.dx,
                    centerX: am5.percent(item.trendLabel.centerXPercent),
                    centerY: am5.percent(above ? 100 : 0),
                    fontSize: 17,
                    fontWeight: '700',
                    fontFamily: Tochnyi.font.family,
                    fill: am5.color(Tochnyi.colors.black),
                    opacity: 0,
                    paddingTop: 2,
                    paddingRight: 4,
                    paddingBottom: 2,
                    paddingLeft: 4,
                    background: am5.RoundedRectangle.new(rootRef, {
                        fill: am5.color(0xffffff),
                        fillOpacity: 0.88,
                        strokeOpacity: 0,
                        cornerRadiusTL: 3,
                        cornerRadiusTR: 3,
                        cornerRadiusBL: 3,
                        cornerRadiusBR: 3
                    })
                });
                label.dataItem = dataItem;
                var bullet = am5.Bullet.new(rootRef, {
                    locationY: 1,
                    dynamic: true,
                    sprite: label
                });
                trendLabelEntries.push({
                    dataItem: dataItem,
                    index: item.trendIndex,
                    label: label,
                    bullet: bullet
                });
                return bullet;
            });
        }
        series.data.setAll(data);

        if (spec.options.showLabels && global.TochnyiVisualPlan && global.TochnyiVisualPlan.trendLabelLayout) {
            var layoutScheduled = false;
            var layoutSignature = '';
            var layoutRetryIndex = 0;
            var layoutVerificationScheduled = false;
            var layoutRetryDelays = [16, 40, 90, 180, 360, 720];

            function retryMeasuredTrendLayout() {
                if (layoutRetryIndex >= layoutRetryDelays.length) {
                    if (trendLabelHost) trendLabelHost.setAttribute('data-trend-label-layout', 'unavailable');
                    return;
                }
                var delay = layoutRetryDelays[layoutRetryIndex];
                layoutRetryIndex += 1;
                global.setTimeout(scheduleTrendLayout, delay);
            }

            function applyMeasuredTrendLayout() {
                layoutScheduled = false;
                var boundary = measuredSpriteBounds(chart.plotContainer);
                var pointEntries = Array.isArray(series._tochnyiPointSprites) ? series._tochnyiPointSprites : [];
                if (!boundary || pointEntries.length < data.length || !trendLabelEntries.length) {
                    if (trendLabelHost) trendLabelHost.setAttribute('data-trend-label-layout', 'waiting');
                    retryMeasuredTrendLayout();
                    return;
                }
                var points = new Array(data.length);
                pointEntries.forEach(function(entry) {
                    var context = entry.dataItem && entry.dataItem.dataContext;
                    var index = context && Number(context.trendIndex);
                    var box = measuredSpriteBounds(entry.sprite);
                    if (!Number.isInteger(index) || !box) return;
                    points[index] = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
                });
                if (points.some(function(point) { return !point; })) {
                    if (trendLabelHost) trendLabelHost.setAttribute('data-trend-label-layout', 'waiting');
                    retryMeasuredTrendLayout();
                    return;
                }

                var labelSizes = new Array(data.length);
                trendLabelEntries.forEach(function(entry) {
                    var box = measuredSpriteBounds(entry.label);
                    if (!box) return;
                    labelSizes[entry.index] = { width: box.width, height: box.height };
                });
                if (trendLabelEntries.some(function(entry) { return !labelSizes[entry.index]; })) {
                    if (trendLabelHost) trendLabelHost.setAttribute('data-trend-label-layout', 'waiting');
                    retryMeasuredTrendLayout();
                    return;
                }
                var lineTolerance = 4;
                var lineStrokeWidth = 4;
                var labelBackgroundPadding = 2;
                var lineClearance = lineTolerance + lineStrokeWidth / 2 + labelBackgroundPadding;
                var layout = global.TochnyiVisualPlan.trendLabelLayout(data, {
                    plans: labelPlan,
                    points: points,
                    labelSizes: labelSizes,
                    boundary: boundary,
                    pointRadius: data.length > 10 ? 4 : 6,
                    pointPadding: 5,
                    labelPadding: 6,
                    lineTolerance: lineTolerance,
                    lineStrokeWidth: lineStrokeWidth,
                    labelBackgroundPadding: labelBackgroundPadding
                });
                var lineOverlapCount = global.TochnyiVisualPlan.trendLabelLineOverlapCount
                    ? global.TochnyiVisualPlan.trendLabelLineOverlapCount(layout, points, lineClearance)
                    : 0;
                var visibleIndices = layout.map(function(item, index) {
                    return item && item.showLabel ? index : null;
                }).filter(function(index) { return index !== null; });
                var suppressedIndices = layout.map(function(item, index) {
                    return item && item.showLabel ? null : index;
                }).filter(function(index) { return index !== null; });
                var visibleCount = visibleIndices.length;
                if (trendLabelHost) {
                    trendLabelHost.setAttribute('data-trend-label-layout', 'measured');
                    trendLabelHost.setAttribute('data-trend-label-line-overlaps', String(lineOverlapCount));
                    trendLabelHost.setAttribute('data-trend-label-visible-count', String(visibleCount));
                    trendLabelHost.setAttribute('data-trend-label-visible-indices', visibleIndices.join(','));
                    trendLabelHost.setAttribute('data-trend-label-suppressed-indices', suppressedIndices.join(','));
                }
                layoutRetryIndex = 0;
                var signature = layout.map(function(item) {
                    return item.showLabel
                        ? [item.placement, item.dx, item.dy, item.centerXPercent, item.centerYPercent].join(':')
                        : 'hidden';
                }).join('|');
                if (signature === layoutSignature) return;
                layoutSignature = signature;

                trendLabelEntries.forEach(function(entry) {
                    var placement = layout[entry.index];
                    var visible = Boolean(placement && placement.showLabel);
                    entry.label.setAll({ visible: visible, opacity: visible ? 1 : 0 });
                    if (!visible) return;
                    entry.label.setAll({
                        dx: placement.dx,
                        dy: placement.dy,
                        centerX: am5.percent(placement.centerXPercent),
                        centerY: am5.percent(placement.centerYPercent)
                    });
                    if (typeof series.markDirtyValues === 'function') series.markDirtyValues(entry.dataItem);
                });
                if (!layoutVerificationScheduled) {
                    layoutVerificationScheduled = true;
                    global.setTimeout(scheduleTrendLayout, 120);
                }
            }

            function scheduleTrendLayout() {
                if (layoutScheduled) return;
                layoutScheduled = true;
                if (global.requestAnimationFrame) global.requestAnimationFrame(applyMeasuredTrendLayout);
                else global.setTimeout(applyMeasuredTrendLayout, 0);
            }

            if (chart.plotContainer && chart.plotContainer.events) {
                chart.plotContainer.events.on('boundschanged', scheduleTrendLayout);
            }
            global.setTimeout(scheduleTrendLayout, 0);
            global.setTimeout(scheduleTrendLayout, spec.options.animate === false ? 100 : 700);
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(scheduleTrendLayout, scheduleTrendLayout);
            }
        }
        animate(chart, series, spec);
    }

    function renderDonut(spec) {
        var data = preparedData(spec);
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5percent.PieChart.new(root, {
            innerRadius: am5.percent(55),
            layout: root.horizontalLayout,
            paddingLeft: 70,
            paddingRight: 40
        }));
        var series = Tochnyi.createPieSeries(root, chart, {
            valueField: 'value',
            categoryField: 'label',
            labelFormat: '{label}: {display}',
            minLabelPercent: 5,
            colors: data.map(function(item) { return item.color; })
        });
        series.slices.template.set('tooltipText', '{label}: {display}');
        series.data.setAll(data);

        var total = data.reduce(function(sum, item) { return sum + item.value; }, 0);
        var metric = spec.primaryMetric || {
            value: (spec.measure.prefix || '') + formatNumber(total, spec.measure.decimals || 0) + valueSuffix(spec.measure),
            label: 'total'
        };
        series.children.push(am5.Label.new(root, {
            text: metric.value,
            position: 'absolute',
            isMeasured: false,
            fontSize: 42,
            fontWeight: '700',
            fontFamily: Tochnyi.font.family,
            fill: am5.color(Tochnyi.colors.blue),
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            x: am5.percent(50),
            y: am5.percent(47)
        }));
        series.children.push(am5.Label.new(root, {
            text: metric.label.toUpperCase(),
            position: 'absolute',
            isMeasured: false,
            fontSize: 15,
            fontWeight: '600',
            fontFamily: Tochnyi.font.family,
            fill: am5.color(Tochnyi.colors.gray),
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            x: am5.percent(50),
            y: am5.percent(57)
        }));

        if (spec.options.showLegend) {
            var legend = Tochnyi.createPieLegend(root, chart);
            legend.data.setAll(series.dataItems);
        }
        animate(chart, series, spec);
    }

    function renderRanking(spec) {
        var ranking = rankingData(spec);
        var data = ranking.data;
        var plan = ranking.plan;
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: 'none',
            wheelY: 'none',
            maskBullets: false,
            paddingLeft: 10,
            paddingRight: plan.labelMode === 'outside' ? 95 : plan.labelMode === 'inside' ? 24 : 58,
            paddingTop: plan.density === 'minimal' ? 8 : 18,
            paddingBottom: 10
        }));

        var yRenderer = am5xy.AxisRendererY.new(root, {
            minGridDistance: 28,
            inversed: true,
            cellStartLocation: 0.14,
            cellEndLocation: 0.86
        });
        yRenderer.labels.template.setAll({
            fontSize: data.length > 8 ? 15 : 18,
            fontFamily: Tochnyi.font.family,
            fontWeight: '600',
            oversizedBehavior: 'wrap',
            maxWidth: plan.categoryLabelWidth
        });
        yRenderer.grid.template.setAll({ visible: false });
        var yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: 'axisLabel',
            renderer: yRenderer
        }));
        yAxis.data.setAll(data);

        var bounds = axisBounds(spec, data);
        var xRenderer = am5xy.AxisRendererX.new(root, { strokeOpacity: 0.3 });
        xRenderer.labels.template.setAll({
            fontSize: plan.density === 'minimal' ? 13 : 15,
            fontFamily: Tochnyi.font.family,
            fontWeight: '500'
        });
        xRenderer.grid.template.setAll({ strokeOpacity: plan.showGrid ? 0.12 : 0.05 });
        var xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, {
            min: bounds.minimum,
            max: bounds.maximum,
            strictMinMax: true,
            logarithmic: spec.measure.scale === 'logarithmic',
            renderer: xRenderer
        }));
        if (plan.showAxisTitle) addAxisTitle(root, xAxis, spec.measure.axisTitle || spec.measure.unit, 'horizontal');
        addInteriorZeroReference(root, xAxis, bounds);
        addValueReferences(root, xAxis, spec);

        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            valueXField: 'value',
            categoryYField: 'axisLabel',
            tooltip: am5.Tooltip.new(root, { labelText: '{label}: {display}' })
        }));
        series.columns.template.setAll({
            height: am5.percent(68),
            cornerRadiusTR: 6,
            cornerRadiusBR: 6
        });
        applySemanticColumnAppearance(series);
        if (spec.options.showLabels) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                var item = dataItem.dataContext;
                var inside = plan.labelMode === 'inside' ||
                    (plan.labelMode === 'auto' && labelFitsInside(item, bounds));
                return am5.Bullet.new(rootRef, {
                    locationX: 1,
                    sprite: am5.Label.new(rootRef, {
                        text: item.display,
                        centerY: am5.percent(50),
                        centerX: inside ? am5.percent(100) : 0,
                        dx: inside ? -10 : 10,
                        fontSize: 17,
                        fontWeight: '700',
                        fontFamily: Tochnyi.font.family,
                        fill: am5.color(Tochnyi.colors.black),
                        fontVariantNumeric: 'tabular-nums'
                    })
                });
            });
        }
        series.data.setAll(data);
        animate(chart, series, spec);
    }

    function renderDiverging(spec) {
        var data = preparedData(spec).map(function(item) {
            return Object.assign({}, item, {
                color: item.tone ? colorFor(item, 0) : item.value > 0 ? TONE_COLORS.positive : item.value < 0 ? TONE_COLORS.critical : TONE_COLORS.neutral
            });
        });
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false, panY: false, wheelX: 'none', wheelY: 'none', maskBullets: false,
            paddingLeft: 10, paddingRight: 90, paddingTop: 22, paddingBottom: 12
        }));
        var yRenderer = am5xy.AxisRendererY.new(root, { inversed: true, minGridDistance: 30 });
        yRenderer.labels.template.setAll({
            fontSize: data.length > 7 ? 15 : 18,
            fontFamily: Tochnyi.font.family,
            fontWeight: '600',
            maxWidth: 250,
            oversizedBehavior: 'wrap'
        });
        yRenderer.grid.template.setAll({ visible: false });
        var yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'label', renderer: yRenderer }));
        yAxis.data.setAll(data);

        var bounds = axisBounds(spec, data);
        bounds.minimum = Math.min(bounds.minimum, 0);
        bounds.maximum = Math.max(bounds.maximum, 0);
        var xRenderer = am5xy.AxisRendererX.new(root, { strokeOpacity: 0.3 });
        xRenderer.grid.template.setAll({ strokeOpacity: 0.13 });
        xRenderer.labels.template.setAll({ fontSize: 14, fontFamily: Tochnyi.font.family, fontWeight: '500' });
        var xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, {
            min: bounds.minimum, max: bounds.maximum, strictMinMax: true, renderer: xRenderer
        }));
        addAxisTitle(root, xAxis, spec.measure.axisTitle || spec.measure.unit, 'horizontal');
        addInteriorZeroReference(root, xAxis, bounds);
        addValueReferences(root, xAxis, spec);

        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis, valueXField: 'value', categoryYField: 'label',
            tooltip: am5.Tooltip.new(root, { labelText: '{label}: {display}' })
        }));
        series.columns.template.setAll({ height: am5.percent(62), cornerRadiusTR: 5, cornerRadiusBR: 5, cornerRadiusTL: 5, cornerRadiusBL: 5 });
        applySemanticColumnAppearance(series);
        if (spec.options.showLabels) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                var positive = dataItem.dataContext.value >= 0;
                return am5.Bullet.new(rootRef, {
                    locationX: positive ? 1 : 0,
                    sprite: am5.Label.new(rootRef, {
                        text: dataItem.dataContext.display,
                        centerY: am5.percent(50),
                        centerX: positive ? 0 : am5.percent(100),
                        dx: positive ? 9 : -9,
                        fontSize: 17,
                        fontWeight: '700',
                        fontFamily: Tochnyi.font.family,
                        fill: am5.color(Tochnyi.colors.black)
                    })
                });
            });
        }
        series.data.setAll(data);
        animate(chart, series, spec);
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
                x: refX + 5, y: top - 31, class: 'tochnyi-svg-reference-label',
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
            if (share >= 12) {
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

        var totalMetric = { value: formatRawValue(total, spec), label: 'total' };
        var metricBlock = element('div', 'tochnyi-stacked-total');
        metricBlock.appendChild(element('strong', '', totalMetric.value));
        metricBlock.appendChild(element('span', '', totalMetric.label));
        chartNode.appendChild(metricBlock);

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

    function renderWaterfall(spec) {
        var current = 0;
        var data = spec.data.map(function(item) {
            var open;
            var close;
            if (item.role === 'start') {
                open = 0;
                close = item.value;
                current = item.value;
            } else if (item.role === 'change') {
                open = current;
                close = current + item.value;
                current = close;
            } else {
                open = 0;
                close = item.value;
                current = item.value;
            }
            var tone = item.tone || (item.role === 'start' ? 'primary' : item.role === 'change' ? (item.value >= 0 ? 'positive' : 'critical') : 'secondary');
            return Object.assign({}, item, {
                open: open,
                close: close,
                display: item.displayValue || formatRawValue(item.value, spec),
                color: TONE_COLORS[tone]
            });
        });
        var plotted = data.flatMap(function(item) { return [item.open, item.close]; });
        var plan = visualPlan(spec, data);
        var min = Math.min.apply(null, plotted.concat([0]));
        var max = Math.max.apply(null, plotted.concat([0]));
        var pad = Math.max((max - min) * 0.16, Math.abs(max) * 0.1, 1);
        var root = Tochnyi.createRoot('chartdiv');
        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            panX: false, panY: false, wheelX: 'none', wheelY: 'none', maskBullets: false,
            paddingLeft: 10, paddingRight: 20, paddingTop: 30, paddingBottom: 12
        }));
        var xRenderer = Tochnyi.createXRenderer(root, {
            minGridDistance: 30,
            fontSize: plan.compact ? 14 : data.length > 5 ? 15 : 18,
            fontWeight: '600'
        });
        xRenderer.labels.template.setAll({
            oversizedBehavior: 'wrap',
            maxWidth: plan.compact ? 104 : 150,
            textAlign: 'center',
            paddingTop: 10
        });
        var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'label', renderer: xRenderer }));
        xAxis.data.setAll(data);
        var yRenderer = Tochnyi.createYRenderer(root, { fontSize: 14 });
        yRenderer.grid.template.setAll({ strokeOpacity: 0.13 });
        var waterfallBounds = { minimum: min - pad, maximum: max + pad };
        var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: waterfallBounds.minimum, max: waterfallBounds.maximum, strictMinMax: true, renderer: yRenderer }));
        addAxisTitle(root, yAxis, spec.measure.axisTitle || spec.measure.unit, 'vertical');
        addInteriorZeroReference(root, yAxis, waterfallBounds);
        addValueReferences(root, yAxis, spec);
        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis, valueYField: 'close', openValueYField: 'open', categoryXField: 'label',
            tooltip: am5.Tooltip.new(root, { labelText: '{label}: {display}' })
        }));
        series.columns.template.setAll({ width: am5.percent(62), cornerRadiusTL: 5, cornerRadiusTR: 5, cornerRadiusBL: 5, cornerRadiusBR: 5 });
        applySemanticColumnAppearance(series);
        if (spec.options.showLabels) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                return am5.Bullet.new(rootRef, {
                    locationY: dataItem.dataContext.value >= 0 ? 1 : 0,
                    sprite: am5.Label.new(rootRef, {
                        text: dataItem.dataContext.display,
                        centerX: am5.percent(50),
                        dy: dataItem.dataContext.value >= 0 ? -12 : 12,
                        maxWidth: plan.compact ? 104 : 180,
                        oversizedBehavior: 'wrap',
                        textAlign: 'center',
                        fontSize: plan.compact ? 14 : 17,
                        fontWeight: '700',
                        fontFamily: Tochnyi.font.family,
                        fill: am5.color(Tochnyi.colors.black)
                    })
                });
            });
        }
        series.data.setAll(data);
        animate(chart, series, spec);
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

    function render(spec) {
        var chartNode = createScaffold(spec);
        if (!global.Tochnyi && spec.recipe !== 'headline.metric') throw new Error('Tochnyi chart library did not load.');
        switch (spec.recipe) {
            case 'comparison.change':
            case 'comparison.scenarios':
                renderColumns(spec);
                break;
            case 'comparison.diverging':
                renderDiverging(spec);
                break;
            case 'comparison.range':
                renderRange(spec, chartNode);
                break;
            case 'trend.line':
                renderTrend(spec);
                break;
            case 'composition.donut':
                renderDonut(spec);
                break;
            case 'composition.stacked':
                renderStacked(spec, chartNode);
                break;
            case 'flow.waterfall':
                renderWaterfall(spec);
                break;
            case 'ranking.horizontal':
                renderRanking(spec);
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
