(function(root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.TochnyiVisualPlan = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    'use strict';

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function densityAdjustment(density) {
        if (density === 'minimal') return -34;
        if (density === 'detailed') return 34;
        return 0;
    }

    function rankingHeight(count, density) {
        return clamp(140 + count * 56 + densityAdjustment(density), 340, 700);
    }

    function statusHeight(count, density, viewportWidth) {
        var columns = viewportWidth <= 520 ? 1 : viewportWidth <= 760 ? 2 : 3;
        var rows = Math.ceil(count / columns);
        var rowHeight = viewportWidth <= 520 ? 190 : viewportWidth <= 760 ? 176 : 154;
        return Math.max(390, 72 + rows * rowHeight + densityAdjustment(density));
    }

    function mapHeight(count, density, viewportWidth) {
        if (viewportWidth <= 520) return 360 + count * 126 + densityAdjustment(density);
        if (viewportWidth <= 760) return 420 + Math.ceil(count / 2) * 132 + densityAdjustment(density);
        return clamp(590 + Math.max(0, count - 7) * 24 + densityAdjustment(density), 590, 760);
    }

    function minimumChartHeight(spec, count, viewportWidth) {
        if (spec.recipe === 'ranking.horizontal') return clamp(180 + count * 42, 320, 620);
        if (spec.recipe === 'comparison.range') return 310;
        if (spec.recipe === 'trend.line') return 360;
        if (spec.recipe === 'composition.donut') return 360;
        if (spec.recipe === 'flow.waterfall') return 360;
        if (spec.recipe === 'comparison.diverging') return 360;
        if (spec.recipe === 'map.regional') return viewportWidth <= 760 ? 620 : 560;
        if (spec.recipe === 'comparison.change' || spec.recipe === 'comparison.scenarios') return 350;
        return viewportWidth <= 760 ? 420 : 360;
    }

    function canShrinkChart(spec) {
        return [
            'comparison.change', 'comparison.scenarios', 'comparison.diverging',
            'comparison.range', 'trend.line', 'composition.donut',
            'flow.waterfall', 'ranking.horizontal'
        ].indexOf(spec.recipe) >= 0;
    }

    function defaultHeight(spec, count, viewportWidth) {
        var density = spec.narrative && spec.narrative.density || 'editorial';
        if (spec.recipe === 'ranking.horizontal') return rankingHeight(count, density);
        if (spec.recipe === 'status.grid') return statusHeight(count, density, viewportWidth);
        if (spec.recipe === 'map.regional') {
            var isRoutingMatrix = spec.metadata && spec.metadata.topic === 'synthetic regional routing matrix';
            if (isRoutingMatrix && viewportWidth > 760) return 860;
            return mapHeight(count, density, viewportWidth);
        }
        if (spec.recipe === 'headline.metric') {
            if (spec.options && spec.options.height === 'short') return viewportWidth <= 760 ? 340 : 360;
            return density === 'detailed' ? 430 : 380;
        }
        if (spec.recipe === 'composition.stacked') return density === 'detailed' ? 330 : 290;
        var narrowAdjustment = viewportWidth <= 600 ? 82 : 0;
        if (spec.options && spec.options.height === 'short') return 400 + narrowAdjustment;
        if (spec.options && spec.options.height === 'tall') return Math.min(700, 640 + narrowAdjustment);
        return (density === 'minimal' ? 470 : density === 'detailed' ? 590 : 540) + narrowAdjustment;
    }

    function rankingPolicy(spec, data) {
        var emphasis = spec.narrative && spec.narrative.emphasis;
        if (emphasis !== 'ranking' || data.length < 2) {
            return { colorPolicy: 'semantic', accentSecond: false };
        }
        var first = Number(data[0] && data[0].value);
        var second = Number(data[1] && data[1].value);
        var closeGap = Number.isFinite(first) && Number.isFinite(second) && first !== 0
            ? Math.abs(first - second) / Math.abs(first) <= 0.15
            : false;
        return {
            colorPolicy: 'focus',
            accentSecond: closeGap && ['warning', 'collapse'].includes(spec.narrative.frame)
        };
    }

    function columnLabelPlacement(item, bounds, plan, metrics) {
        var options = metrics || {};
        var minimum = Number(bounds && bounds.minimum);
        var maximum = Number(bounds && bounds.maximum);
        var value = Number(item && item.value);
        var span = Math.max(1, maximum - minimum);
        var baseline = clamp(0, minimum, maximum);
        var plotHeight = Number(options.plotHeight) || Math.max(220, (Number(plan && plan.chartHeight) || 420) - 110);
        var fontSize = Number(options.fontSize) || (plan && plan.compact ? 16 : 28);
        var labelHeight = Number(options.labelHeight) || Math.ceil(fontSize * 1.82);
        var estimatedBarHeight = Math.abs(value - baseline) / span * plotHeight;
        var barHeight = Number(options.barHeight) > 0 ? Number(options.barHeight) : estimatedBarHeight;
        var endpoint = clamp((value - minimum) / span, 0, 1);
        var baselinePoint = clamp((baseline - minimum) / span, 0, 1);
        var positive = value >= baseline;
        var outsideSpace = (positive ? 1 - endpoint : endpoint) * plotHeight;
        var startOutsideSpace = (positive ? baselinePoint : 1 - baselinePoint) * plotHeight;
        var insidePadding = Math.max(10, Math.ceil(fontSize * 0.42));
        var outsideGap = Math.max(8, Math.ceil(fontSize * 0.32));
        var insideFits = barHeight >= labelHeight + insidePadding * 2;
        var outsideFits = outsideSpace >= labelHeight + outsideGap + 4;
        var startOutsideFits = startOutsideSpace >= labelHeight + outsideGap + 4;
        var mode = plan && plan.labelMode || 'auto';
        var placement = 'end';

        if (mode === 'inside') {
            if (insideFits) placement = 'inside';
            else if (!outsideFits && startOutsideFits) placement = 'start';
        } else if (mode === 'outside') {
            if (!outsideFits && startOutsideFits) placement = 'start';
        } else if (insideFits && !outsideFits) {
            placement = 'inside';
        } else if (!outsideFits && startOutsideFits) {
            placement = 'start';
        }

        var inside = placement === 'inside';
        var atStart = placement === 'start';
        var centerYPercent = 50;
        var dy = 0;
        if (!inside && !atStart) {
            centerYPercent = positive ? 100 : 0;
            dy = positive ? -outsideGap : outsideGap;
        } else if (atStart) {
            centerYPercent = positive ? 0 : 100;
            dy = positive ? outsideGap : -outsideGap;
        }

        return {
            placement: placement,
            inside: inside,
            insideFits: insideFits,
            outsideFits: outsideFits,
            startOutsideFits: startOutsideFits,
            fellBackOutside: mode === 'inside' && !insideFits,
            barHeight: barHeight,
            labelHeight: labelHeight,
            locationY: inside ? 0.5 : atStart ? 0 : 1,
            centerYPercent: centerYPercent,
            dy: dy
        };
    }

    function trendLabelPlan(data) {
        var items = Array.isArray(data) ? data : [];
        if (!items.length) return [];
        var values = items.map(function(item) { return Number(item && item.value); });
        var finiteValues = values.filter(Number.isFinite);
        var minimum = finiteValues.length ? Math.min.apply(null, finiteValues) : 0;
        var maximum = finiteValues.length ? Math.max.apply(null, finiteValues) : 1;
        var span = Math.max(maximum - minimum, Math.abs(maximum) * 0.1, 1e-9);
        var selected = new Set();
        var maximumLabels = items.length <= 6 ? items.length : 6;

        selected.add(0);
        if (items.length > 1) selected.add(items.length - 1);
        values.forEach(function(value, index) {
            if (value === minimum || value === maximum) selected.add(index);
        });
        for (var index = 1; index < items.length - 1; index += 1) {
            var previousDelta = values[index] - values[index - 1];
            var nextDelta = values[index + 1] - values[index];
            if (Number.isFinite(previousDelta) && Number.isFinite(nextDelta) && previousDelta * nextDelta <= 0 && previousDelta !== nextDelta) {
                selected.add(index);
            }
        }
        if (items.length <= 6) {
            items.forEach(function(item, index) { selected.add(index); });
        } else {
            for (var slot = 1; selected.size < maximumLabels && slot < maximumLabels - 1; slot += 1) {
                selected.add(Math.round(slot * (items.length - 1) / (maximumLabels - 1)));
            }
        }

        var prioritized = Array.from(selected).sort(function(first, second) {
            function priority(index) {
                if (index === 0 || index === items.length - 1) return 100;
                if (values[index] === minimum || values[index] === maximum) return 90;
                return 50;
            }
            return priority(second) - priority(first) || first - second;
        }).slice(0, maximumLabels);
        selected = new Set(prioritized);

        return items.map(function(item, index) {
            var value = values[index];
            var previous = index > 0 ? values[index - 1] : value;
            var next = index < items.length - 1 ? values[index + 1] : value;
            var localPeak = value >= previous && value >= next;
            var localTrough = value <= previous && value <= next;
            var normalized = (value - minimum) / span;
            var placeAbove = localPeak || (!localTrough && value >= (previous + next) / 2);
            if (localTrough && normalized < 0.18) placeAbove = true;
            if (localPeak && normalized > 0.88) placeAbove = false;
            return {
                showLabel: selected.has(index),
                dy: placeAbove ? -22 : 22,
                dx: index === 0 ? 8 : index === items.length - 1 ? -8 : 0,
                centerXPercent: index === 0 ? 0 : index === items.length - 1 ? 100 : 50
            };
        });
    }

    function contextLayoutPlan(spec, data) {
        var items = Array.isArray(data) ? data : [];
        var annotations = items.filter(function(item) { return item && item.annotation; }).length;
        var facts = Array.isArray(spec && spec.supportingFacts) ? spec.supportingFacts.length : 0;
        var references = Array.isArray(spec && spec.references) ? spec.references.length : 0;
        var density = spec && spec.narrative && spec.narrative.density || 'editorial';
        var budget = density === 'minimal' ? 5 : density === 'detailed' ? 10 : 8;
        var contextLoad = annotations + facts + references +
            (spec && spec.primaryMetric ? 1 : 0) +
            (spec && spec.note ? 1 : 0) +
            (spec && spec.emphasis ? 1 : 0);
        return {
            annotationMode: annotations > 2 || contextLoad > budget ? 'compact' : 'cards',
            compactFacts: facts >= 4 && annotations >= 2 || contextLoad > budget,
            contextLoad: contextLoad,
            budget: budget
        };
    }

    function resolveVisualPlan(spec, data, viewportWidth) {
        var width = Number(viewportWidth) || 1200;
        var items = Array.isArray(data) ? data : [];
        var density = spec.narrative && spec.narrative.density || 'editorial';
        var ranking = rankingPolicy(spec, items);
        var labelMode = spec.options && spec.options.labelMode || 'auto';

        return {
            viewportWidth: width,
            compact: width <= 600,
            itemCount: items.length,
            density: density,
            titleAlign: density === 'minimal' ? 'center' : 'left',
            chartHeight: defaultHeight(spec, items.length, width),
            minimumChartHeight: minimumChartHeight(spec, items.length, width),
            canShrinkChart: canShrinkChart(spec),
            labelMode: labelMode,
            showAxisTitle: density !== 'minimal' && width > 600,
            showGrid: density !== 'minimal',
            categoryLabelWidth: width <= 760 ? 190 : items.length > 8 ? 250 : 300,
            colorPolicy: ranking.colorPolicy,
            accentSecond: ranking.accentSecond,
            watermark: density === 'minimal' ? 'quiet' : 'standard'
        };
    }

    return {
        clamp: clamp,
        rankingHeight: rankingHeight,
        mapHeight: mapHeight,
        columnLabelPlacement: columnLabelPlacement,
        trendLabelPlan: trendLabelPlan,
        contextLayoutPlan: contextLayoutPlan,
        minimumChartHeight: minimumChartHeight,
        canShrinkChart: canShrinkChart,
        resolveVisualPlan: resolveVisualPlan
    };
});