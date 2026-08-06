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
        var columns = viewportWidth <= 760 ? 1 : 2;
        var rows = Math.ceil(count / columns);
        var rowHeight = viewportWidth <= 520 ? 190 : viewportWidth <= 760 ? 126 : 120;
        return Math.max(390, 72 + rows * rowHeight + densityAdjustment(density));
    }

    function mapHeight(count, density, viewportWidth) {
        if (viewportWidth <= 520) return 360 + count * 126 + densityAdjustment(density);
        if (viewportWidth <= 760) return 420 + Math.ceil(count / 2) * 132 + densityAdjustment(density);
        return clamp(500 + Math.max(0, count - 7) * 22 + densityAdjustment(density), 500, 650);
    }

    function minimumChartHeight(spec, count, viewportWidth) {
        if (spec.recipe === 'ranking.horizontal') return clamp(180 + count * 42, 320, 620);
        if (spec.recipe === 'comparison.range') return 310;
        if (spec.recipe === 'comparison.benchmark-gap') return 330;
        if (spec.recipe === 'comparison.dumbbell') return clamp(220 + count * 42, 360, 650);
        if (spec.recipe === 'trend.line') return 360;
        if (spec.recipe === 'timeline.duration') return 330;
        if (spec.recipe === 'composition.donut') return 360;
        if (spec.recipe === 'flow.waterfall') return 360;
        if (spec.recipe === 'comparison.diverging') return 360;
        if (spec.recipe === 'map.regional') return viewportWidth <= 760 ? 620 : 480;
        if (spec.recipe === 'story.facets') return viewportWidth <= 760 ? 560 : 420;
        if (spec.recipe === 'comparison.change' || spec.recipe === 'comparison.scenarios') return 350;
        return viewportWidth <= 760 ? 420 : 360;
    }

    function canShrinkChart(spec) {
        return [
            'comparison.change', 'comparison.scenarios', 'comparison.diverging',
            'comparison.range', 'comparison.benchmark-gap', 'comparison.dumbbell', 'trend.line', 'timeline.duration', 'composition.donut',
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
            var visualType = spec.visual && spec.visual.type || 'auto';
            if (visualType === 'pictogram' || visualType === 'progress') return viewportWidth <= 760 ? 430 : 390;
            if (spec.options && spec.options.height === 'short') return viewportWidth <= 760 ? 340 : 360;
            return density === 'detailed' ? 430 : 380;
        }
        if (spec.recipe === 'composition.stacked') return density === 'detailed' ? 330 : 290;
        if (spec.recipe === 'timeline.duration') {
            return clamp(210 + count * 68 + densityAdjustment(density), 360, 690);
        }
        if (spec.recipe === 'comparison.benchmark-gap') {
            return clamp(225 + count * 72 + densityAdjustment(density), 390, 690);
        }
        if (spec.recipe === 'comparison.dumbbell') {
            return clamp(190 + count * 62 + densityAdjustment(density), 430, 780);
        }
        if (spec.recipe === 'story.facets') {
            return clamp(150 + count * 68 + densityAdjustment(density), 420, 760);
        }
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
        // Candidate selection must not silently delete otherwise valid points.
        // The measured layout stage already knows the real plot bounds, label
        // sizes, line geometry, and neighboring points, so it is the correct
        // place to suppress labels that genuinely cannot fit. Keeping every
        // point as a candidate also preserves repeated values on consecutive
        // dates when there is enough horizontal room to show both.
        var maximumLabels = items.length;

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
        for (var slot = 1; selected.size < maximumLabels && slot < items.length - 1; slot += 1) {
            selected.add(slot);
        }

        var prioritized = Array.from(selected).sort(function(first, second) {
            function priority(index) {
                if (index === 0 || index === items.length - 1) return 100;
                if (values[index] === minimum || values[index] === maximum) return 90;
                return 50;
            }
            return priority(second) - priority(first) || first - second;
        });
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
            var turningPoint = index > 0 && index < items.length - 1 && (
                value >= previous && value >= next ||
                value <= previous && value <= next
            );
            return {
                showLabel: selected.has(index),
                priority: index === 0 || index === items.length - 1
                    ? 100
                    : value === minimum || value === maximum
                        ? 90
                        : turningPoint
                            ? 70
                            : 50,
                dy: placeAbove ? -22 : 22,
                dx: index === 0 ? 8 : index === items.length - 1 ? -8 : 0,
                centerXPercent: index === 0 ? 0 : index === items.length - 1 ? 100 : 50,
                preferredPlacement: placeAbove ? 'above' : 'below'
            };
        });
    }

    function normalizeRect(rect) {
        var left = Math.min(rect.left, rect.right);
        var right = Math.max(rect.left, rect.right);
        var top = Math.min(rect.top, rect.bottom);
        var bottom = Math.max(rect.top, rect.bottom);
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };
    }

    function expandRect(rect, amount) {
        return normalizeRect({
            left: rect.left - amount,
            right: rect.right + amount,
            top: rect.top - amount,
            bottom: rect.bottom + amount
        });
    }

    function rectsOverlap(first, second) {
        return first.left < second.right && first.right > second.left &&
            first.top < second.bottom && first.bottom > second.top;
    }

    function pointInsideRect(point, rect) {
        return point.x >= rect.left && point.x <= rect.right &&
            point.y >= rect.top && point.y <= rect.bottom;
    }

    function orientation(first, second, third) {
        return (second.y - first.y) * (third.x - second.x) -
            (second.x - first.x) * (third.y - second.y);
    }

    function onSegment(first, second, point) {
        return point.x >= Math.min(first.x, second.x) && point.x <= Math.max(first.x, second.x) &&
            point.y >= Math.min(first.y, second.y) && point.y <= Math.max(first.y, second.y);
    }

    function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
        var a = orientation(firstStart, firstEnd, secondStart);
        var b = orientation(firstStart, firstEnd, secondEnd);
        var c = orientation(secondStart, secondEnd, firstStart);
        var d = orientation(secondStart, secondEnd, firstEnd);
        if ((a > 0) !== (b > 0) && (c > 0) !== (d > 0)) return true;
        if (a === 0 && onSegment(firstStart, firstEnd, secondStart)) return true;
        if (b === 0 && onSegment(firstStart, firstEnd, secondEnd)) return true;
        if (c === 0 && onSegment(secondStart, secondEnd, firstStart)) return true;
        if (d === 0 && onSegment(secondStart, secondEnd, firstEnd)) return true;
        return false;
    }

    function segmentHitsRect(start, end, rect, tolerance) {
        var expanded = expandRect(rect, tolerance || 0);
        if (pointInsideRect(start, expanded) || pointInsideRect(end, expanded)) return true;
        var topLeft = { x: expanded.left, y: expanded.top };
        var topRight = { x: expanded.right, y: expanded.top };
        var bottomLeft = { x: expanded.left, y: expanded.bottom };
        var bottomRight = { x: expanded.right, y: expanded.bottom };
        return segmentsIntersect(start, end, topLeft, topRight) ||
            segmentsIntersect(start, end, topRight, bottomRight) ||
            segmentsIntersect(start, end, bottomRight, bottomLeft) ||
            segmentsIntersect(start, end, bottomLeft, topLeft);
    }

    function labelCandidate(point, size, placement, gap) {
        var width = Math.max(1, Number(size && size.width) || 1);
        var height = Math.max(1, Number(size && size.height) || 1);
        var offset = Math.max(1, Number(gap) || 1);
        var settings = { placement: placement, dx: 0, dy: 0, centerXPercent: 50, centerYPercent: 50 };
        var left;
        var top;

        if (placement.indexOf('left') >= 0 || placement === 'left') {
            settings.centerXPercent = 100;
            settings.dx = -offset;
            left = point.x - offset - width;
        } else if (placement.indexOf('right') >= 0 || placement === 'right') {
            settings.centerXPercent = 0;
            settings.dx = offset;
            left = point.x + offset;
        } else {
            left = point.x - width / 2;
        }

        if (placement.indexOf('above') === 0) {
            settings.centerYPercent = 100;
            settings.dy = -offset;
            top = point.y - offset - height;
        } else if (placement.indexOf('below') === 0) {
            settings.centerYPercent = 0;
            settings.dy = offset;
            top = point.y + offset;
        } else {
            top = point.y - height / 2;
        }

        return Object.assign(settings, {
            box: normalizeRect({ left: left, top: top, right: left + width, bottom: top + height })
        });
    }

    function trendLabelLayout(data, options) {
        var items = Array.isArray(data) ? data : [];
        var settings = options || {};
        var plans = Array.isArray(settings.plans) ? settings.plans : trendLabelPlan(items);
        var points = Array.isArray(settings.points) ? settings.points : [];
        var sizes = Array.isArray(settings.labelSizes) ? settings.labelSizes : [];
        var boundary = normalizeRect(settings.boundary || { left: 0, top: 0, right: 1000, bottom: 500 });
        var pointRadius = Math.max(1, Number(settings.pointRadius) || 6);
        var pointPadding = Math.max(2, Number(settings.pointPadding) || 4);
        var labelPadding = Math.max(2, Number(settings.labelPadding) || 5);
        var lineTolerance = Math.max(1, Number(settings.lineTolerance) || 4);
        var lineStrokeWidth = Math.max(0, Number(settings.lineStrokeWidth) || 0);
        var labelBackgroundPadding = Math.max(0, Number(settings.labelBackgroundPadding) || 0);
        var lineClearance = lineTolerance + lineStrokeWidth / 2 + labelBackgroundPadding;
        var gap = pointRadius + pointPadding;
        var pointBoxes = points.map(function(point) {
            return normalizeRect({
                left: point.x - pointRadius,
                right: point.x + pointRadius,
                top: point.y - pointRadius,
                bottom: point.y + pointRadius
            });
        });
        var segments = [];
        for (var segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex += 1) {
            segments.push([points[segmentIndex], points[segmentIndex + 1]]);
        }
        var result = plans.map(function(plan) {
            return Object.assign({}, plan, { showLabel: false, suppressed: Boolean(plan && plan.showLabel) });
        });
        var placed = [];
        var ordered = plans.map(function(plan, index) { return { plan: plan, index: index }; })
            .filter(function(entry) { return entry.plan && entry.plan.showLabel && points[entry.index]; })
            .sort(function(first, second) {
                return Number(second.plan.priority || 0) - Number(first.plan.priority || 0) || first.index - second.index;
            });

        function candidateIsClear(candidate) {
            var box = candidate && candidate.box;
            if (!box) return false;
            var inside = box.left >= boundary.left && box.right <= boundary.right &&
                box.top >= boundary.top && box.bottom <= boundary.bottom;
            if (!inside) return false;
            if (pointBoxes.some(function(pointBox) { return rectsOverlap(expandRect(box, pointPadding), pointBox); })) return false;
            if (placed.some(function(other) { return rectsOverlap(expandRect(box, labelPadding), other.box); })) return false;
            if (segments.some(function(segment) { return segmentHitsRect(segment[0], segment[1], box, lineClearance); })) return false;
            return true;
        }

        function endpointFallbackCandidate(index, size, preferred) {
            if (index !== 0 && index !== points.length - 1) return null;
            var point = points[index];
            var width = Math.max(1, Number(size && size.width) || 1);
            var height = Math.max(1, Number(size && size.height) || 1);
            var minimumCenterX = boundary.left + width / 2;
            var maximumCenterX = boundary.right - width / 2;
            var minimumCenterY = boundary.top + height / 2;
            var maximumCenterY = boundary.bottom - height / 2;
            if (minimumCenterX > maximumCenterX || minimumCenterY > maximumCenterY) return null;

            var horizontalReach = Math.min(boundary.width * 0.4, Math.max(120, width * 2.5));
            var verticalReach = Math.min(boundary.height * 0.5, Math.max(120, height * 4));
            var minimumX = Math.max(minimumCenterX, point.x - horizontalReach);
            var maximumX = Math.min(maximumCenterX, point.x + horizontalReach);
            var minimumY = Math.max(minimumCenterY, point.y - verticalReach);
            var maximumY = Math.min(maximumCenterY, point.y + verticalReach);
            var stepX = Math.max(6, Math.min(14, width / 4));
            var stepY = Math.max(6, Math.min(14, height / 2));
            var centers = [];
            var seen = new Set();

            function addCenter(centerX, centerY) {
                var x = clamp(centerX, minimumCenterX, maximumCenterX);
                var y = clamp(centerY, minimumCenterY, maximumCenterY);
                if (x < minimumX - 0.1 || x > maximumX + 0.1 || y < minimumY - 0.1 || y > maximumY + 0.1) return;
                var key = Math.round(x * 10) + ':' + Math.round(y * 10);
                if (seen.has(key)) return;
                seen.add(key);
                var dx = x - point.x;
                var dy = y - point.y;
                var distance = Math.sqrt(dx * dx + dy * dy);
                var wrongVerticalSide = preferred === 'above' ? dy > 0 : dy < 0;
                var inwardDirection = index === 0 ? 1 : -1;
                var wrongHorizontalSide = dx * inwardDirection < 0;
                centers.push({
                    x: x,
                    y: y,
                    distance: distance,
                    score: distance +
                        (wrongVerticalSide ? Math.max(18, height) : 0) +
                        (wrongHorizontalSide ? Math.max(8, width * 0.2) : 0)
                });
            }

            addCenter(point.x, point.y);
            addCenter(minimumX, point.y);
            addCenter(maximumX, point.y);
            addCenter(point.x, minimumY);
            addCenter(point.x, maximumY);
            for (var x = minimumX; x <= maximumX + 0.1; x += stepX) {
                for (var y = minimumY; y <= maximumY + 0.1; y += stepY) {
                    addCenter(x, y);
                }
            }
            centers.sort(function(first, second) {
                return first.score - second.score || first.distance - second.distance || first.y - second.y || first.x - second.x;
            });

            for (var candidateIndex = 0; candidateIndex < centers.length; candidateIndex += 1) {
                var center = centers[candidateIndex];
                var candidate = {
                    placement: 'endpoint-search',
                    dx: center.x - point.x,
                    dy: center.y - point.y,
                    centerXPercent: 50,
                    centerYPercent: 50,
                    searchOffset: center.distance,
                    box: normalizeRect({
                        left: center.x - width / 2,
                        right: center.x + width / 2,
                        top: center.y - height / 2,
                        bottom: center.y + height / 2
                    })
                };
                if (candidateIsClear(candidate)) return candidate;
            }
            return null;
        }

        ordered.forEach(function(entry) {
            var index = entry.index;
            var plan = entry.plan;
            var preferred = plan.preferredPlacement || (plan.dy < 0 ? 'above' : 'below');
            var opposite = preferred === 'above' ? 'below' : 'above';
            var candidates = [
                preferred,
                preferred + '-right',
                preferred + '-left',
                'right',
                'left',
                opposite,
                opposite + '-right',
                opposite + '-left'
            ];
            var size = sizes[index] || {
                width: Math.max(34, String(items[index] && (items[index].displayValue || items[index].display || items[index].value) || '').length * 9),
                height: 24
            };
            var selected = null;

            var searchOffsets = [
                gap,
                gap + Math.max(8, size.height * 0.55),
                gap + Math.max(18, size.height + labelPadding),
                gap + Math.max(30, size.height * 1.6 + labelPadding)
            ].map(function(value) {
                return Math.round(value * 10) / 10;
            }).filter(function(value, offsetIndex, values) {
                return values.indexOf(value) === offsetIndex;
            });

            searchOffsets.some(function(candidateGap) {
                return candidates.some(function(placement) {
                    var candidate = labelCandidate(points[index], size, placement, candidateGap);
                    if (!candidateIsClear(candidate)) return false;
                    selected = Object.assign(candidate, { searchOffset: candidateGap });
                    return true;
                });
            });

            if (!selected) selected = endpointFallbackCandidate(index, size, preferred);

            if (!selected) return;
            result[index] = Object.assign({}, plan, selected, { showLabel: true, suppressed: false });
            placed.push({ index: index, box: selected.box });
        });

        return result;
    }

    function trendLabelLineOverlapCount(layout, points, tolerance) {
        var items = Array.isArray(layout) ? layout : [];
        var anchors = Array.isArray(points) ? points : [];
        var clearance = Math.max(0, Number(tolerance) || 0);
        var segments = [];
        for (var index = 0; index < anchors.length - 1; index += 1) {
            segments.push([anchors[index], anchors[index + 1]]);
        }
        return items.reduce(function(total, item) {
            if (!item || !item.showLabel || !item.box) return total;
            return total + (segments.some(function(segment) {
                return segmentHitsRect(segment[0], segment[1], item.box, clearance);
            }) ? 1 : 0);
        }, 0);
    }

    function contextLayoutPlan(spec, data) {
        var items = Array.isArray(data) ? data : [];
        var annotations = items.filter(function(item) { return item && item.annotation; }).length;
        var facts = Array.isArray(spec && spec.supportingFacts) ? spec.supportingFacts.length : 0;
        var references = Array.isArray(spec && spec.references) ? spec.references.length : 0;
        var basisItems = Array.isArray(spec && spec.basis && spec.basis.items) ? spec.basis.items.length : 0;
        var density = spec && spec.narrative && spec.narrative.density || 'editorial';
        var budget = density === 'minimal' ? 5 : density === 'detailed' ? 10 : 8;
        var contextLoad = annotations + facts + references + Math.min(2, basisItems) +
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

    function normalizedSemanticText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function contextFactLayout(fact) {
        var value = String(fact && fact.value || '').trim();
        var wordCount = value ? value.split(/\s+/).length : 0;
        var hasMetricSignal = /\d|[%$€£¥₽₸₹₩₺₴]|\b(?:bn|mn|mln|million|billion|trillion|tons?|tonnes?|days?|hours?|weeks?|months?|years?|m²|km²|km|kg|t)\b/i.test(value);
        var proseValue = !hasMetricSignal || wordCount >= 4 || value.length > 28;
        return {
            mode: proseValue ? 'stacked' : 'inline',
            proseValue: proseValue,
            wordCount: wordCount,
            length: value.length
        };
    }

    function inferChangeDirection(item, spec) {
        if (item && (item.direction === 'up' || item.direction === 'down' || item.direction === 'neutral')) {
            return item.direction;
        }
        var values = ['value', 'low', 'high'].map(function(key) {
            return Number(item && item[key]);
        }).filter(Number.isFinite);
        if (values.length && values.every(function(value) { return value <= 0; }) &&
            values.some(function(value) { return value < 0; })) {
            return 'down';
        }

        var primaryText = normalizedSemanticText([
            item && item.label,
            item && item.quantity,
            item && item.annotation
        ].filter(Boolean).join(' '));
        var secondaryText = normalizedSemanticText([
            spec && spec.measure && spec.measure.quantity,
            spec && spec.measure && spec.measure.unit,
            spec && spec.title,
            spec && spec.subtitle,
            spec && spec.metadata && spec.metadata.keyFinding
        ].filter(Boolean).join(' '));
        var downPattern = /\b(?:declin(?:e|ed|ing)|decreas(?:e|ed|ing)|fall|fell|falling|drop(?:ped|ping)?|loss|lost|lower|reduc(?:e|ed|tion)|contract(?:ed|ion)?|shortfall|shrink|shrunk|cut|downturn|down)\b/;
        var upPattern = /\b(?:increas(?:e|ed|ing)|rise|rose|rising|growth|grew|gain(?:ed|ing)?|higher|expand(?:ed|ing|sion)?|upturn|up)\b/;

        function directionFromText(text) {
            var down = downPattern.test(text);
            var up = upPattern.test(text);
            if (down && !up) return 'down';
            if (up && !down) return 'up';
            return 'neutral';
        }

        var primaryDirection = directionFromText(primaryText);
        if (primaryDirection !== 'neutral') return primaryDirection;
        return directionFromText(secondaryText);
    }

    function percentageChangeRangePlan(spec, data) {
        var items = Array.isArray(data) ? data : [];
        if (!spec || spec.recipe !== 'comparison.range' || !items.length) {
            return { mode: 'raw-range' };
        }
        var measureText = normalizedSemanticText([
            spec.measure && spec.measure.unit,
            spec.measure && spec.measure.quantity,
            spec.measure && spec.measure.axisTitle
        ].filter(Boolean).join(' '));
        var isRelativePercent = /%|\bpercent(?:age)?\b/.test(measureText) &&
            !/percentage points?|\bpp\b/.test(measureText);
        if (!isRelativePercent) return { mode: 'raw-range' };

        var decimals = Math.max(0, Number(spec.measure && spec.measure.decimals) || 0);
        function format(value) {
            var rounded = Number(value).toFixed(decimals);
            return decimals ? rounded.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') : rounded;
        }
        function displayRange(low, high, suffix) {
            if (Math.abs(low - high) < 1e-9) return format(low) + suffix;
            return format(low) + '–' + format(high) + suffix;
        }

        var planned = [];
        for (var index = 0; index < items.length; index += 1) {
            var item = items[index] || {};
            var direction = inferChangeDirection(item, spec);
            if (direction !== 'up' && direction !== 'down') return { mode: 'raw-range' };
            var rawLow = typeof item.low === 'number' ? item.low : item.value;
            var rawHigh = typeof item.high === 'number' ? item.high : item.value;
            if (!Number.isFinite(rawLow) || !Number.isFinite(rawHigh)) return { mode: 'raw-range' };
            var magnitudeLow = Math.min(Math.abs(rawLow), Math.abs(rawHigh));
            var magnitudeHigh = Math.max(Math.abs(rawLow), Math.abs(rawHigh));
            if (magnitudeHigh > 100) return { mode: 'raw-range' };
            var outcomeLow = direction === 'down' ? 100 - magnitudeHigh : 100 + magnitudeLow;
            var outcomeHigh = direction === 'down' ? 100 - magnitudeLow : 100 + magnitudeHigh;
            planned.push({
                item: item,
                direction: direction,
                magnitudeLow: magnitudeLow,
                magnitudeHigh: magnitudeHigh,
                outcomeLow: outcomeLow,
                outcomeHigh: outcomeHigh,
                outcomeDisplay: displayRange(outcomeLow, outcomeHigh, '% of prior level'),
                impactDisplay: displayRange(magnitudeLow, magnitudeHigh, direction === 'down' ? '% lower' : '% higher')
            });
        }

        var allDown = planned.every(function(item) { return item.direction === 'down'; });
        var allUp = planned.every(function(item) { return item.direction === 'up'; });
        var outcomes = planned.reduce(function(values, item) {
            values.push(item.outcomeLow, item.outcomeHigh);
            return values;
        }, [100]);
        var minimum = allDown ? 0 : Math.min.apply(null, outcomes);
        var maximum = allDown ? 100 : Math.max.apply(null, outcomes);
        if (allUp) {
            var growthSpan = Math.max(5, maximum - 100);
            minimum = Math.max(0, 100 - growthSpan * 0.24);
            maximum += growthSpan * 0.18;
        } else if (!allDown) {
            var span = Math.max(10, maximum - minimum);
            minimum = Math.max(0, minimum - span * 0.12);
            maximum += span * 0.12;
        }

        return {
            mode: 'outcome-index',
            baseline: 100,
            baselineLabel: 'Prior period = 100%',
            axisTitle: 'Share of prior period',
            minimum: minimum,
            maximum: maximum,
            allDown: allDown,
            allUp: allUp,
            items: planned
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
        trendLabelLayout: trendLabelLayout,
        trendLabelLineOverlapCount: trendLabelLineOverlapCount,
        contextLayoutPlan: contextLayoutPlan,
        contextFactLayout: contextFactLayout,
        inferChangeDirection: inferChangeDirection,
        percentageChangeRangePlan: percentageChangeRangePlan,
        minimumChartHeight: minimumChartHeight,
        canShrinkChart: canShrinkChart,
        resolveVisualPlan: resolveVisualPlan
    };
});