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

    function sequenceHeight(count, density, viewportWidth) {
        if (viewportWidth <= 760) {
            return clamp(110 + count * 142 + densityAdjustment(density), 480, 760);
        }
        return clamp(390 + densityAdjustment(density), 350, 500);
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
        if (spec.recipe === 'story.sequence') return sequenceHeight(count, density, viewportWidth);
        if (spec.recipe === 'map.regional') {
            var isRoutingMatrix = spec.metadata && spec.metadata.topic === 'synthetic regional routing matrix';
            if (isRoutingMatrix && viewportWidth > 760) return 860;
            return mapHeight(count, density, viewportWidth);
        }
        if (spec.recipe === 'headline.metric') return density === 'detailed' ? 430 : 380;
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
        minimumChartHeight: minimumChartHeight,
        canShrinkChart: canShrinkChart,
        resolveVisualPlan: resolveVisualPlan
    };
});
