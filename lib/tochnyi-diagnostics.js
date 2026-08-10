(function(root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) {
        root.TochnyiLayoutDiagnostics = api;
        if (root.document) api.schedule();
    }
})(typeof window !== 'undefined' ? window : globalThis, function() {
    'use strict';

    var DEFAULTS = {
        minimumIntersectionArea: 12,
        warningOverlapRatio: 0.06,
        errorOverlapRatio: 0.22,
        clippingTolerance: 2,
        overlayOverlapRatio: 0.08,
        lineTolerance: 3,
        minimumColumnFillOpacity: 0.42,
        warningColumnFillOpacity: 0.72,
        errorColumnFillOpacity: 0.82,
        minimumColumnStrokeOpacity: 0.65,
        minimumColumnStrokeWidth: 0.75,
        minimumLogoHeight: 48,
        minimumLogoOpacity: 0.9,
        minimumWatermarkHeight: 64,
        minimumWatermarkOpacity: 0.055,
        minimumMapWatermarkHeight: 220,
        maximumMapWatermarkHeight: 400,
        minimumMapWatermarkOpacity: 0.06,
        maximumMapWatermarkOpacity: 0.09
    };
    var QUANTITATIVE_MARK_ROLES = [
        'column', 'point', 'actual-value', 'benchmark-gap', 'benchmark-marker',
        'duration-interval', 'count-unit', 'signal-value', 'signal-range',
        'signal-point', 'signal-range-start', 'signal-range-end', 'local-benchmark',
        'range', 'range-start', 'range-end', 'reference-line'
    ];

    function round(value) {
        return Math.round(value * 10) / 10;
    }

    function normalizeRect(rect) {
        var left = Math.min(rect.left, rect.right);
        var right = Math.max(rect.left, rect.right);
        var top = Math.min(rect.top, rect.bottom);
        var bottom = Math.max(rect.top, rect.bottom);
        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };
    }

    function area(rect) {
        return Math.max(0, rect.width) * Math.max(0, rect.height);
    }

    function intersection(a, b) {
        var left = Math.max(a.left, b.left);
        var right = Math.min(a.right, b.right);
        var top = Math.max(a.top, b.top);
        var bottom = Math.min(a.bottom, b.bottom);
        if (right <= left || bottom <= top) return null;
        return normalizeRect({ left: left, right: right, top: top, bottom: bottom });
    }

    function intersectionRatio(a, b) {
        var hit = intersection(a, b);
        if (!hit) return { area: 0, ratio: 0, rect: null };
        var denominator = Math.max(1, Math.min(area(a), area(b)));
        return { area: area(hit), ratio: area(hit) / denominator, rect: hit };
    }

    function expand(rect, pixels) {
        return normalizeRect({
            left: rect.left - pixels,
            top: rect.top - pixels,
            right: rect.right + pixels,
            bottom: rect.bottom + pixels
        });
    }

    function clipRatio(rect, boundary) {
        var hit = intersection(rect, boundary);
        var visible = hit ? area(hit) : 0;
        return 1 - visible / Math.max(1, area(rect));
    }

    function iou(a, b) {
        var hit = intersection(a, b);
        if (!hit) return 0;
        return area(hit) / Math.max(1, area(a) + area(b) - area(hit));
    }

    function compactRect(rect) {
        return {
            x: round(rect.left),
            y: round(rect.top),
            width: round(rect.width),
            height: round(rect.height)
        };
    }

    function className(sprite) {
        return sprite && (
            sprite.className ||
            (sprite.constructor && sprite.constructor.className) ||
            (sprite.constructor && sprite.constructor.name)
        ) || 'Sprite';
    }

    function childrenOf(sprite) {
        var values = sprite && sprite.children && sprite.children.values;
        if (Array.isArray(values)) return values;
        if (values && typeof values[Symbol.iterator] === 'function') return Array.from(values);
        return [];
    }

    function tagsOf(sprite) {
        try {
            return sprite.get('themeTags') || [];
        } catch (error) {
            return [];
        }
    }

    function dataContext(sprite) {
        return sprite && sprite.dataItem && sprite.dataItem.dataContext || null;
    }

    function spriteNumber(sprite, name, fallback) {
        try {
            var value = sprite.get(name);
            return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function resolvedText(sprite) {
        var text = '';
        try {
            text = sprite.get('text') || '';
        } catch (error) {}
        var context = dataContext(sprite) || {};
        if (!text) {
            text = context.display || context.displayValue || context.label || context.category || '';
        } else if (/\{(?:category|label)/.test(text)) {
            text = context.label || context.category || text;
        } else if (/\{(?:value|display)/.test(text)) {
            text = context.display || context.displayValue || context.value || text;
        }
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function spriteRect(sprite, offset) {
        try {
            if (typeof sprite.globalBounds === 'function') {
                var bounds = sprite.globalBounds();
                if (bounds && [bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite)) {
                    return normalizeRect({
                        left: bounds.left + offset.left,
                        right: bounds.right + offset.left,
                        top: bounds.top + offset.top,
                        bottom: bounds.bottom + offset.top
                    });
                }
            }
        } catch (error) {}

        var width = sprite.width();
        var height = sprite.height();
        var origin = sprite.toGlobal({ x: 0, y: 0 });
        var rotation = 0;
        try {
            rotation = sprite.compositeRotation ? sprite.compositeRotation() : sprite.get('rotation') || 0;
        } catch (error) {}
        rotation = ((rotation % 360) + 360) % 360;

        var left = origin.x;
        var top = origin.y;
        var right = origin.x + width;
        var bottom = origin.y + height;
        if (Math.abs(rotation - 90) < 0.5) {
            left = origin.x - width;
            right = origin.x;
        } else if (Math.abs(rotation - 180) < 0.5) {
            left = origin.x - width;
            right = origin.x;
            top = origin.y - height;
            bottom = origin.y;
        } else if (Math.abs(rotation - 270) < 0.5) {
            top = origin.y - height;
            bottom = origin.y;
        }

        return normalizeRect({
            left: left + offset.left,
            right: right + offset.left,
            top: top + offset.top,
            bottom: bottom + offset.top
        });
    }

    function visibleSprite(sprite) {
        try {
            return sprite.isVisibleDeep() && Math.abs(sprite.width()) > 1 && Math.abs(sprite.height()) > 1;
        } catch (error) {
            return false;
        }
    }

    function labelRole(sprite) {
        var cls = className(sprite);
        var tags = tagsOf(sprite);
        if (cls === 'AxisLabel') {
            if (tags.indexOf('x') >= 0) return 'x-axis-label';
            if (tags.indexOf('y') >= 0) return 'y-axis-label';
            return 'axis-label';
        }
        if (sprite.dataItem) return 'data-label';
        return 'chart-label';
    }

    function spriteIdentity(sprite, rect) {
        var context = dataContext(sprite) || {};
        return {
            id: 'am5-' + String(sprite.uid),
            source: 'amcharts',
            role: labelRole(sprite),
            text: resolvedText(sprite),
            dataKey: context.id || context.label || context.category || null,
            dataUid: sprite.dataItem ? sprite.dataItem.uid : null,
            group: null,
            rect: rect
        };
    }

    function collectAmCharts(chartHost) {
        var labels = [];
        var objects = [];
        var hostRect = normalizeRect(chartHost.getBoundingClientRect());
        var offset = { left: hostRect.left, top: hostRect.top };
        var roots = typeof Tochnyi !== 'undefined' && Array.isArray(Tochnyi._roots) ? Tochnyi._roots : [];

        roots.forEach(function(amRoot) {
            var seen = new Set();
            function walk(sprite) {
                if (!sprite || seen.has(sprite)) return;
                seen.add(sprite);
                var cls = className(sprite);
                var tags = tagsOf(sprite);

                if (/Label$/.test(cls) && visibleSprite(sprite)) {
                    try {
                        var rect = spriteRect(sprite, offset);
                        var identity = spriteIdentity(sprite, rect);
                        if (identity.text && intersection(rect, expand(hostRect, 8))) {
                            labels.push(identity);
                        }
                    } catch (error) {}
                }

                if (
                    (cls === 'RoundedRectangle' && tags.indexOf('column') >= 0) ||
                    (cls === 'Grid' && tags.indexOf('range') >= 0) ||
                    (cls === 'Circle' && tags.indexOf('point') >= 0)
                ) {
                    try {
                        if (sprite.isVisibleDeep()) {
                            var role = cls === 'Grid'
                                ? 'reference-line'
                                : cls === 'Circle'
                                    ? 'point'
                                    : 'column';
                            objects.push({
                                id: 'am5-object-' + String(sprite.uid),
                                source: 'amcharts',
                                role: role,
                                dataUid: sprite.dataItem ? sprite.dataItem.uid : null,
                                dataKey: (dataContext(sprite) || {}).label || null,
                                group: null,
                                rect: spriteRect(sprite, offset),
                                line: cls === 'Grid',
                                fillOpacity: cls === 'Grid' ? null : spriteNumber(sprite, 'fillOpacity', 1),
                                strokeOpacity: cls === 'Grid' ? null : spriteNumber(sprite, 'strokeOpacity', 1),
                                strokeWidth: cls === 'Grid' ? null : spriteNumber(sprite, 'strokeWidth', 0)
                            });
                        }
                    } catch (error) {}
                }

                childrenOf(sprite).forEach(walk);
            }
            walk(amRoot.container);
        });

        return { labels: labels, objects: objects, boundary: hostRect };
    }

    function cssAlpha(value) {
        var match = String(value || '').match(/rgba?\(([^)]+)\)/i);
        if (!match) return 1;
        var parts = match[1].split(/[ ,/]+/).filter(Boolean);
        if (parts.length < 4) return 1;
        var alpha = Number(parts[3]);
        return Number.isFinite(alpha) ? alpha : 1;
    }

    function effectiveOpacity(element, boundary) {
        var opacity = 1;
        var current = element;
        while (current && current !== document.documentElement) {
            var value = Number(getComputedStyle(current).opacity);
            if (Number.isFinite(value)) opacity *= value;
            if (current === boundary) break;
            current = current.parentElement;
        }
        return opacity;
    }

    function isDomElementOccluded(element) {
        if (!document.elementsFromPoint) return false;
        var rect = normalizeRect(element.getBoundingClientRect());
        if (rect.width <= 1 || rect.height <= 1) return true;
        var previousValue = element.style.getPropertyValue('pointer-events');
        var previousPriority = element.style.getPropertyPriority('pointer-events');
        var points = [
            [0.5, 0.5],
            [0.25, 0.25],
            [0.75, 0.25],
            [0.25, 0.75],
            [0.75, 0.75]
        ];
        element.style.setProperty('pointer-events', 'auto', 'important');
        try {
            return !points.some(function(point) {
                var x = rect.left + rect.width * point[0];
                var y = rect.top + rect.height * point[1];
                var top = document.elementsFromPoint(x, y)[0];
                return top === element || element.contains(top);
            });
        } finally {
            if (previousValue) element.style.setProperty('pointer-events', previousValue, previousPriority);
            else element.style.removeProperty('pointer-events');
        }
    }

    function isVisibleDom(element) {
        var style = getComputedStyle(element);
        var rect = element.getBoundingClientRect();
        var hasGeometry = rect.width > 1 && rect.height > 1;
        if (element.hasAttribute('data-tochnyi-mark')) hasGeometry = rect.width > 1 || rect.height > 1;
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || 1) > 0 &&
            hasGeometry;
    }

    function clipsOverflow(value) {
        return ['hidden', 'clip', 'auto', 'scroll'].indexOf(String(value || '').toLowerCase()) >= 0;
    }

    function intersectBoundary(first, second) {
        var hit = intersection(first, second);
        return hit || normalizeRect({ left: 0, top: 0, right: 0, bottom: 0 });
    }

    function clippingRectForElement(element) {
        var clip = null;
        var current = element.parentElement;
        while (current && current !== document.documentElement) {
            var style = getComputedStyle(current);
            if (clipsOverflow(style.overflowX) || clipsOverflow(style.overflowY)) {
                var currentRect = normalizeRect(current.getBoundingClientRect());
                clip = clip ? intersectBoundary(clip, currentRect) : currentRect;
            }
            if (current === document.body) break;
            current = current.parentElement;
        }
        return clip;
    }

    function ownTextRect(element) {
        var nodes = Array.from(element.childNodes).filter(function(node) {
            return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
        });
        if (!nodes.length || !document.createRange) return null;
        try {
            var range = document.createRange();
            range.setStart(nodes[0], 0);
            range.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
            var rect = normalizeRect(range.getBoundingClientRect());
            range.detach();
            return rect.width > 0 && rect.height > 0 ? rect : null;
        } catch (error) {
            return null;
        }
    }

    function hasIntrinsicTextOverflow(element, textRect, clipRect) {
        var tolerance = 1.5;
        var style = getComputedStyle(element);
        var ownClipping = clipsOverflow(style.overflowX) || clipsOverflow(style.overflowY);
        var clientOverflow = ownClipping && element.clientWidth > 0 && element.clientHeight > 0 && (
            element.scrollWidth > element.clientWidth + tolerance ||
            element.scrollHeight > element.clientHeight + tolerance
        );
        var clippedText = textRect && clipRect && clipRatio(textRect, expand(clipRect, tolerance)) > 0.02;
        return Boolean(clientOverflow || clippedText);
    }

    function collectDom(main) {
        var labels = [];
        var objects = [];
        var mainRect = normalizeRect(main.getBoundingClientRect());
        var boundaries = [{ source: 'dom', rect: mainRect }];
        var svgSources = new Map();

        Array.from(main.querySelectorAll('svg[data-label-layout]')).forEach(function(svg, index) {
            var source = 'svg-' + index;
            svgSources.set(svg, source);
            boundaries.push({ source: source, rect: normalizeRect(svg.getBoundingClientRect()) });
        });

        var elements = Array.from(main.querySelectorAll('*'));
        elements.forEach(function(element, index) {
            if (element.closest('.am5-root')) return;
            var owningSvg = element.closest('svg[data-label-layout]');
            var source = owningSvg ? svgSources.get(owningSvg) : 'dom';
            if (element === owningSvg || !isVisibleDom(element)) return;

            if (element.hasAttribute('data-tochnyi-style-mark')) {
                var markStyle = getComputedStyle(element);
                objects.push({
                    id: 'dom-style-object-' + index,
                    source: source,
                    role: element.getAttribute('data-tochnyi-style-mark') || 'chart-mark',
                    dataUid: null,
                    dataKey: element.getAttribute('data-label-group') || null,
                    group: element.getAttribute('data-label-group') || null,
                    rect: normalizeRect(element.getBoundingClientRect()),
                    line: false,
                    styleOnly: true,
                    fillOpacity: cssAlpha(markStyle.backgroundColor),
                    strokeOpacity: 1,
                    strokeWidth: 1.5
                });
            }

            if (element.hasAttribute('data-tochnyi-mark')) {
                objects.push({
                    id: 'dom-object-' + index,
                    source: source,
                    role: element.getAttribute('data-tochnyi-mark') || 'chart-mark',
                    dataUid: null,
                    dataKey: null,
                    group: element.getAttribute('data-label-group') || null,
                    rect: normalizeRect(element.getBoundingClientRect()),
                    line: element.tagName.toLowerCase() === 'line'
                });
                return;
            }

            if (element.matches('img')) {
                objects.push({
                    id: 'dom-object-' + index,
                    source: source,
                    role: element.classList.contains('tochnyi-watermark')
                        ? 'watermark'
                        : element.classList.contains('tochnyi-logo')
                            ? 'logo'
                            : 'image',
                    dataUid: null,
                    dataKey: element.getAttribute('alt') || null,
                    group: null,
                    rect: normalizeRect(element.getBoundingClientRect()),
                    line: false,
                    opacity: effectiveOpacity(element, main),
                    loaded: Boolean(element.complete && element.naturalWidth > 0 && element.naturalHeight > 0),
                    occluded: isDomElementOccluded(element),
                    watermarkLayer: element.getAttribute('data-watermark-layer') || null,
                    naturalWidth: element.naturalWidth || 0,
                    naturalHeight: element.naturalHeight || 0
                });
                return;
            }

            var ownText = Array.from(element.childNodes)
                .filter(function(node) { return node.nodeType === Node.TEXT_NODE; })
                .map(function(node) { return node.textContent; })
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (!ownText) return;

            var role = element.getAttribute('data-label-role') || (
                element.classList.contains('tochnyi-change-badge')
                    ? 'emphasis-badge'
                    : element.classList.contains('tochnyi-context-value') || element.classList.contains('tochnyi-stat-value')
                        ? 'context-value'
                        : element.classList.contains('tochnyi-context-label') || element.classList.contains('tochnyi-stat-label')
                            ? 'context-label'
                            : element.classList.contains('tochnyi-svg-tick')
                                ? 'axis-label'
                                : element.classList.contains('tochnyi-svg-reference-label')
                                    ? 'reference-label'
                                    : element.classList.contains('tochnyi-svg-label')
                                        ? 'category-label'
                                        : owningSvg
                                            ? 'svg-label'
                                            : 'page-label'
            );

            var elementRect = normalizeRect(element.getBoundingClientRect());
            var textRect = ownTextRect(element) || elementRect;
            var clipRect = owningSvg
                ? normalizeRect(owningSvg.getBoundingClientRect())
                : clippingRectForElement(element);
            labels.push({
                id: 'dom-label-' + index,
                source: source,
                role: role,
                text: ownText,
                dataKey: null,
                dataUid: null,
                group: element.getAttribute('data-label-group') || null,
                layoutUnresolved: element.getAttribute('data-layout-overlap') === 'true',
                intrinsicOverflow: hasIntrinsicTextOverflow(element, textRect, clipRect),
                clipRect: clipRect,
                elementRect: elementRect,
                rect: textRect
            });
        });

        return {
            labels: labels,
            objects: objects,
            boundaries: boundaries
        };
    }

    function describe(item) {
        var result = {
            id: item.id,
            role: item.role,
            text: item.text || item.dataKey || '',
            bounds: compactRect(item.rect)
        };
        if (typeof item.fillOpacity === 'number') result.fillOpacity = round(item.fillOpacity);
        if (typeof item.strokeOpacity === 'number') result.strokeOpacity = round(item.strokeOpacity);
        if (typeof item.strokeWidth === 'number') result.strokeWidth = round(item.strokeWidth);
        if (typeof item.opacity === 'number') result.opacity = round(item.opacity);
        if (typeof item.loaded === 'boolean') result.loaded = item.loaded;
        if (typeof item.occluded === 'boolean') result.occluded = item.occluded;
        if (item.watermarkLayer) result.watermarkLayer = item.watermarkLayer;
        return result;
    }

    function lineHitsRect(line, rect, tolerance) {
        if (line.rect.width <= tolerance * 2) {
            var x = (line.rect.left + line.rect.right) / 2;
            return x >= rect.left - tolerance &&
                x <= rect.right + tolerance &&
                line.rect.bottom >= rect.top &&
                line.rect.top <= rect.bottom;
        }
        if (line.rect.height <= tolerance * 2) {
            var y = (line.rect.top + line.rect.bottom) / 2;
            return y >= rect.top - tolerance &&
                y <= rect.bottom + tolerance &&
                line.rect.right >= rect.left &&
                line.rect.left <= rect.right;
        }
        return false;
    }

    function makeIssue(code, severity, message, first, second, ratio, remedy) {
        var result = {
            code: code,
            severity: severity,
            message: message,
            elements: [describe(first)].concat(second ? [describe(second)] : []),
            remedy: remedy
        };
        if (ratio !== undefined) result.overlapPercent = round(ratio * 100);
        return result;
    }

    function diagnoseMarkStyles(objects, options) {
        var config = Object.assign({}, DEFAULTS, options || {});
        var issues = [];
        (objects || []).filter(function(object) { return object.role === 'column'; }).forEach(function(column) {
            var fillOpacity = typeof column.fillOpacity === 'number' ? column.fillOpacity : 1;
            if (fillOpacity > config.warningColumnFillOpacity) {
                issues.push(makeIssue(
                    'column-fill-too-opaque',
                    fillOpacity > config.errorColumnFillOpacity ? 'error' : 'warning',
                    'A quantitative column uses an overly opaque fill (' + round(fillOpacity) + ').',
                    column,
                    null,
                    undefined,
                    'Use the shared Tochnyi column appearance policy instead of recipe-specific opaque fills.'
                ));
            } else if (fillOpacity < config.minimumColumnFillOpacity) {
                issues.push(makeIssue(
                    'column-fill-too-faint',
                    'warning',
                    'A quantitative column is too faint (' + round(fillOpacity) + ').',
                    column,
                    null,
                    undefined,
                    'Use the shared Tochnyi column opacity so values remain legible without appearing saturated.'
                ));
            }

            var strokeOpacity = typeof column.strokeOpacity === 'number' ? column.strokeOpacity : 0;
            var strokeWidth = typeof column.strokeWidth === 'number' ? column.strokeWidth : 0;
            if (strokeOpacity < config.minimumColumnStrokeOpacity || strokeWidth < config.minimumColumnStrokeWidth) {
                issues.push(makeIssue(
                    'column-outline-too-weak',
                    'warning',
                    'A translucent quantitative column lacks a sufficiently defined outline.',
                    column,
                    null,
                    undefined,
                    'Use the shared Tochnyi column outline opacity and width.'
                ));
            }
        });
        return issues;
    }

    function diagnoseBranding(objects, options) {
        var config = Object.assign({}, DEFAULTS, options || {});
        var logos = (objects || []).filter(function(object) { return object.role === 'logo'; });
        var issues = [];
        var expectedLogo = {
            id: 'tochnyi-logo-required',
            role: 'logo',
            dataKey: 'Tochnyi',
            rect: normalizeRect({ left: 0, top: 0, right: 0, bottom: 0 })
        };

        if (!logos.length) {
            issues.push(makeIssue(
                'logo-missing',
                'error',
                'The Tochnyi logo is missing from the rendered chart.',
                expectedLogo,
                null,
                undefined,
                'Render the shared .tochnyi-logo asset in the chart header.'
            ));
            return issues;
        }

        logos.forEach(function(logo) {
            if (logo.loaded === false) {
                issues.push(makeIssue(
                    'logo-not-loaded',
                    'error',
                    'The Tochnyi logo element is present but its image asset did not load.',
                    logo,
                    null,
                    undefined,
                    'Fix the shared asset path and verify the logo has non-zero natural dimensions before capture.'
                ));
            }

            var opacity = typeof logo.opacity === 'number' ? logo.opacity : 1;
            if (opacity < config.minimumLogoOpacity) {
                issues.push(makeIssue(
                    'logo-too-faint',
                    'error',
                    'The Tochnyi logo effective opacity is too low (' + round(opacity) + ').',
                    logo,
                    null,
                    undefined,
                    'Keep the logo and its ancestors at full opacity and use normal blend mode.'
                ));
            }

            if (logo.rect.height < config.minimumLogoHeight) {
                issues.push(makeIssue(
                    'logo-too-small',
                    'error',
                    'The Tochnyi logo is only ' + round(logo.rect.height) + 'px high.',
                    logo,
                    null,
                    undefined,
                    'Use the shared logo sizing token so the rendered logo remains legible after deck and thumbnail scaling.'
                ));
            }
        });

        return issues;
    }

    function diagnoseWatermark(objects, options) {
        var config = Object.assign({}, DEFAULTS, options || {});
        var watermarks = (objects || []).filter(function(object) { return object.role === 'watermark'; });
        var issues = [];
        var expectedWatermark = {
            id: 'tochnyi-watermark-required',
            role: 'watermark',
            dataKey: '',
            rect: normalizeRect({ left: 0, top: 0, right: 0, bottom: 0 })
        };

        if (!watermarks.length) {
            issues.push(makeIssue(
                'watermark-missing',
                'error',
                'The Tochnyi watermark is missing from the rendered chart.',
                expectedWatermark,
                null,
                undefined,
                'Render the shared .tochnyi-watermark asset inside the chart container.'
            ));
            return issues;
        }

        watermarks.forEach(function(watermark) {
            var isMapBackground = watermark.watermarkLayer === 'behind-map';
            if (watermark.loaded === false) {
                issues.push(makeIssue(
                    'watermark-not-loaded',
                    'error',
                    'The Tochnyi watermark element is present but its image asset did not load.',
                    watermark,
                    null,
                    undefined,
                    'Fix the shared watermark asset path and verify it has non-zero natural dimensions before capture.'
                ));
            }

            if (watermark.occluded === true && !isMapBackground) {
                issues.push(makeIssue(
                    'watermark-occluded',
                    'error',
                    'The Tochnyi watermark is fully covered by another chart layer.',
                    watermark,
                    null,
                    undefined,
                    'Place the watermark above opaque chart backgrounds while keeping labels and callouts above the watermark.'
                ));
            }

            var opacity = typeof watermark.opacity === 'number' ? watermark.opacity : 1;
            var minimumOpacity = isMapBackground
                ? config.minimumMapWatermarkOpacity
                : config.minimumWatermarkOpacity;
            if (opacity < minimumOpacity) {
                issues.push(makeIssue(
                    'watermark-too-faint',
                    'error',
                    'The Tochnyi watermark effective opacity is too low (' + round(opacity) + ').',
                    watermark,
                    null,
                    undefined,
                    'Use the shared watermark opacity tokens and do not apply additional opacity inside the SVG asset.'
                ));
            }

            if (isMapBackground && opacity > config.maximumMapWatermarkOpacity) {
                issues.push(makeIssue(
                    'watermark-too-prominent',
                    'error',
                    'The regional-map watermark opacity is too high (' + round(opacity) + ').',
                    watermark,
                    null,
                    undefined,
                    'Keep the regional-map watermark behind the map and within the shared map-specific opacity range.'
                ));
            }

            var minimumHeight = isMapBackground
                ? config.minimumMapWatermarkHeight
                : config.minimumWatermarkHeight;
            if (watermark.rect.height < minimumHeight) {
                issues.push(makeIssue(
                    'watermark-too-small',
                    'error',
                    'The Tochnyi watermark is only ' + round(watermark.rect.height) + 'px high.',
                    watermark,
                    null,
                    undefined,
                    'Use the shared watermark sizing rules so the mark remains visible in exported charts.'
                ));
            }

            if (isMapBackground && watermark.rect.height > config.maximumMapWatermarkHeight) {
                issues.push(makeIssue(
                    'watermark-too-large',
                    'error',
                    'The regional-map watermark is ' + round(watermark.rect.height) + 'px high and obscures the geographic layer.',
                    watermark,
                    null,
                    undefined,
                    'Use the shared regional-map watermark size token so the mark remains subordinate to the map.'
                ));
            }
        });

        return issues;
    }

    function diagnoseBoxes(input, options) {
        var config = Object.assign({}, DEFAULTS, options || {});
        var labels = input.labels || [];
        var objects = input.objects || [];
        var boundaries = input.boundaries || [];
        var issues = [];

        labels.forEach(function(label) {
            if (label.layoutUnresolved) {
                issues.push(makeIssue(
                    'label-layout-unresolved',
                    'error',
                    'No collision-free placement was found for “' + label.text + '”.',
                    label,
                    null,
                    undefined,
                    'Shorten or consolidate the label, increase available space, or reduce persistent labels.'
                ));
            }
            if (label.intrinsicOverflow) {
                issues.push(makeIssue(
                    'text-truncated',
                    'error',
                    'Text “' + label.text + '” does not fit inside its visible layout box.',
                    label,
                    null,
                    undefined,
                    'Increase the available width or height, allow wrapping, or reduce the text before export.'
                ));
            }
            var boundary = label.clipRect
                ? { source: label.source, rect: label.clipRect }
                : boundaries.find(function(item) { return item.source === label.source; }) || boundaries[0];
            if (!boundary) return;
            var ratio = clipRatio(label.rect, expand(boundary.rect, config.clippingTolerance));
            if (ratio > 0.02) {
                issues.push(makeIssue(
                    'label-clipped',
                    ratio >= 0.2 ? 'error' : 'warning',
                    'Label “' + label.text + '” extends outside its rendering area.',
                    label,
                    null,
                    ratio,
                    'Shorten the label, increase chart height, or move labels inside/outside using options.labelMode.'
                ));
            }
        });

        for (var i = 0; i < labels.length; i += 1) {
            for (var j = i + 1; j < labels.length; j += 1) {
                var first = labels[i];
                var second = labels[j];
                var firstRect = first.elementRect || first.rect;
                var secondRect = second.elementRect || second.rect;
                var overlap = intersectionRatio(firstRect, secondRect);
                if (overlap.area < config.minimumIntersectionArea || overlap.ratio < config.warningOverlapRatio) continue;
                if (first.text === second.text && iou(first.rect, second.rect) > 0.92) continue;
                issues.push(makeIssue(
                    'text-text-overlap',
                    overlap.ratio >= config.errorOverlapRatio ? 'error' : 'warning',
                    '“' + first.text + '” overlaps “' + second.text + '”.',
                    first,
                    second,
                    overlap.ratio,
                    'Shorten one label, use annotations instead of persistent labels, increase chart height, or select a recipe with more label space.'
                ));
            }
        }

        labels.forEach(function(label) {
            objects.forEach(function(object) {
                if (object.role === 'watermark') return;
                if (
                    object.role !== 'point' &&
                    label.dataUid && object.dataUid && label.dataUid === object.dataUid
                ) return;
                if (label.group && object.group && label.group === object.group) {
                    // Labels are normally allowed to sit inside their own data mark.
                    // Reference labels are different: their corresponding line must
                    // remain visually clear and may not run through the label text.
                    if (!(object.line && label.role === 'reference-label')) return;
                }

                if (object.line) {
                    if (label.role.indexOf('axis-label') >= 0) return;
                    var lineTolerance = label.role === 'reference-label' ? 1.25 : config.lineTolerance;
                    if (lineHitsRect(object, label.rect, lineTolerance)) {
                        issues.push(makeIssue(
                            'text-line-collision',
                            label.role === 'reference-label' ? 'error' : 'warning',
                            '“' + label.text + '” is crossed by a reference line.',
                            label,
                            object,
                            undefined,
                            'Move the reference label, adjust the axis range, or reduce persistent data labels.'
                        ));
                    }
                    return;
                }

                var overlap = intersectionRatio(label.rect, object.rect);
                var threshold = object.role === 'watermark' ? 0.14 : config.overlayOverlapRatio;
                if (overlap.area < config.minimumIntersectionArea || overlap.ratio < threshold) return;
                issues.push(makeIssue(
                    'text-object-overlap',
                    overlap.ratio >= config.errorOverlapRatio ? 'error' : 'warning',
                    '“' + label.text + '” overlaps a ' + object.role + '.',
                    label,
                    object,
                    overlap.ratio,
                    object.role === 'watermark'
                        ? 'Use the corner watermark mode or move labels away from the watermark area.'
                        : 'Move the label, change options.labelMode, reduce labels, or select a less crowded recipe.'
                ));
            });
        });

        var unique = [];
        var keys = new Set();
        issues.forEach(function(item) {
            var key = item.code + '|' + item.elements
                .map(function(element) { return element.id; })
                .sort()
                .join('|');
            if (!keys.has(key)) {
                keys.add(key);
                unique.push(item);
            }
        });

        unique.sort(function(a, b) {
            var rank = { error: 0, warning: 1 };
            return rank[a.severity] - rank[b.severity] || a.code.localeCompare(b.code);
        });
        return unique;
    }

    function diagnoseRegionalCalloutContainment(main) {
        if (!main || !main.classList.contains('recipe-map-regional')) return [];
        var chart = main.querySelector('[data-map-callout-placement]');
        if (chart && chart.getAttribute('data-map-callout-placement') === 'stacked-responsive') {
            // Responsive callouts intentionally leave the clipped map stage and
            // flow below it as normal document content. Stage containment only
            // applies to the desktop/map-overlay layout.
            return [];
        }
        var stage = main.querySelector('.tochnyi-map-stage');
        if (!stage) return [];
        var stageRect = normalizeRect(stage.getBoundingClientRect());
        var safeInset = 10;
        var note = main.querySelector('.tochnyi-note');
        var noteRect = note ? normalizeRect(note.getBoundingClientRect()) : null;
        var issues = [];
        Array.from(stage.querySelectorAll('.tochnyi-map-callout')).forEach(function(card, index) {
            var rect = normalizeRect(card.getBoundingClientRect());
            var cardItem = {
                id: 'regional-callout-' + index,
                role: 'map-callout',
                text: card.textContent.replace(/\s+/g, ' ').trim(),
                rect: rect
            };
            if (
                rect.top < stageRect.top + safeInset - 1 ||
                rect.bottom > stageRect.bottom - safeInset + 1 ||
                rect.left < stageRect.left + safeInset - 1 ||
                rect.right > stageRect.right - safeInset + 1
            ) {
                issues.push(makeIssue(
                    'map-callout-clipped',
                    'error',
                    'A regional callout reaches the map-stage edge and may be cut off in export.',
                    cardItem,
                    null,
                    undefined,
                    'Increase callout clearance, compact the callout set, or increase the map stage. No callout may touch the clipped stage boundary.'
                ));
            }
            if (noteRect && rect.bottom > noteRect.top - 8) {
                issues.push(makeIssue(
                    'map-callout-note-collision',
                    'error',
                    'A regional callout reaches the note area below the map.',
                    cardItem,
                    { id: 'regional-note', role: 'note', text: note.textContent || '', rect: noteRect },
                    undefined,
                    'Reserve a clear gutter between the lowest callout and any regional note or footer.'
                ));
            }
        });
        return issues;
    }

    function viewportFitRequired(options) {
        if (options && options.requireViewportFit) return true;
        try {
            var query = new URLSearchParams(window.location.search);
            return query.get('fit') === '1' || query.get('checkFit') === '1';
        } catch (error) {
            return false;
        }
    }

    function requestedCaptureSize() {
        try {
            var query = new URLSearchParams(window.location.search);
            var width = Number(query.get('captureWidth'));
            var height = Number(query.get('captureHeight'));
            return {
                width: Number.isFinite(width) && width > 0 ? width : window.innerWidth,
                height: Number.isFinite(height) && height > 0 ? height : window.innerHeight
            };
        } catch (error) {
            return { width: window.innerWidth, height: window.innerHeight };
        }
    }

    function measureViewportFit(main) {
        if (typeof window === 'undefined' || !main) return null;
        var bodyStyle = getComputedStyle(document.body);
        var rightPadding = parseFloat(bodyStyle.paddingRight) || 0;
        var bottomPadding = parseFloat(bodyStyle.paddingBottom) || 0;
        var mainRect = normalizeRect(main.getBoundingClientRect());
        var capture = requestedCaptureSize();
        var documentElement = document.documentElement;
        var body = document.body;
        var documentWidth = Math.max(
            documentElement ? documentElement.scrollWidth : 0,
            body ? body.scrollWidth : 0,
            mainRect.right + rightPadding
        );
        var documentHeight = Math.max(
            documentElement ? documentElement.scrollHeight : 0,
            body ? body.scrollHeight : 0,
            mainRect.bottom + bottomPadding
        );
        return {
            captureWidth: round(capture.width),
            captureHeight: round(capture.height),
            requiredWidth: Math.ceil(documentWidth),
            requiredHeight: Math.ceil(documentHeight),
            horizontalOverflow: round(Math.max(0, documentWidth - capture.width)),
            verticalOverflow: round(Math.max(0, documentHeight - capture.height)),
            bodyPaddingRight: round(rightPadding),
            bodyPaddingBottom: round(bottomPadding),
            main: mainRect
        };
    }

    function diagnoseViewportFit(main, options) {
        if (typeof window === 'undefined' || !viewportFitRequired(options)) return [];
        var measurement = measureViewportFit(main);
        if (!measurement) return [];
        var mainRect = measurement.main;
        var capture = {
            width: measurement.captureWidth,
            height: measurement.captureHeight
        };
        var viewport = normalizeRect({
            left: 0,
            top: 0,
            right: capture.width,
            bottom: capture.height
        });
        var verticalOverflow = measurement.verticalOverflow;
        var horizontalOverflow = measurement.horizontalOverflow;
        if (verticalOverflow <= 1 && horizontalOverflow <= 1 && main.getAttribute('data-fit-exhausted') !== 'true') return [];

        var page = {
            id: 'page-canvas',
            role: 'page-canvas',
            text: 'fixed export canvas',
            rect: mainRect
        };
        var issue = makeIssue(
            'canvas-overflow',
            'error',
            'The rendered graphic exceeds the fixed export viewport by ' +
                round(horizontalOverflow) + 'px horizontally and ' + round(verticalOverflow) + 'px vertically.',
            page,
            null,
            undefined,
            'Reduce chart height or surrounding chrome, shorten copy, or use a larger approved export canvas before capture.'
        );
        issue.overflowPixels = {
            horizontal: round(horizontalOverflow),
            vertical: round(verticalOverflow)
        };
        issue.requiredCanvas = {
            width: measurement.requiredWidth,
            height: measurement.requiredHeight
        };
        return [issue];
    }

    function writeReport(report) {
        var node = document.getElementById('tochnyi-layout-diagnostics');
        if (!node) {
            node = document.createElement('script');
            node.id = 'tochnyi-layout-diagnostics';
            node.type = 'application/json';
            document.body.appendChild(node);
        }
        node.textContent = JSON.stringify(report);
        document.documentElement.setAttribute('data-layout-diagnostics', report.status);
        return report;
    }

    function run(options) {
        if (typeof document === 'undefined') return null;
        var main = document.querySelector('.tochnyi-v2');
        var chartHost = document.getElementById('chartdiv');
        if (!main) return null;

        var dom = collectDom(main);
        var am = chartHost
            ? collectAmCharts(chartHost)
            : { labels: [], objects: [], boundary: null };
        var labels = dom.labels.concat(am.labels);
        var objects = dom.objects.concat(am.objects);
        var boundaries = (dom.boundaries || []).slice();
        if (am.boundary) boundaries.push({ source: 'amcharts', rect: am.boundary });

        var layoutObjects = objects.filter(function(object) { return !object.styleOnly; });
        var issues = diagnoseBoxes({
            labels: labels,
            objects: layoutObjects,
            boundaries: boundaries
        }, options)
            .concat(diagnoseMarkStyles(objects, options))
            .concat(diagnoseBranding(layoutObjects, options))
            .concat(diagnoseWatermark(layoutObjects, options))
            .concat(diagnoseRegionalCalloutContainment(main))
            .concat(diagnoseViewportFit(main, options));
        issues.sort(function(a, b) {
            var rank = { error: 0, warning: 1 };
            return rank[a.severity] - rank[b.severity] || a.code.localeCompare(b.code);
        });
        var errors = issues.filter(function(item) { return item.severity === 'error'; }).length;
        var warnings = issues.filter(function(item) { return item.severity === 'warning'; }).length;
        var viewportFit = measureViewportFit(main);

        return writeReport({
            version: '1.0',
            status: errors ? 'fail' : warnings ? 'warn' : 'pass',
            summary: {
                labelsChecked: labels.length,
                objectsChecked: layoutObjects.length,
                marksChecked: objects.filter(function(object) {
                    return QUANTITATIVE_MARK_ROLES.indexOf(object.role) >= 0;
                }).length,
                errors: errors,
                warnings: warnings
            },
            viewportFit: viewportFit,
            issues: issues
        });
    }

    function writeRuntimeError(error) {
        return writeReport({
            version: '1.0',
            status: 'fail',
            summary: { labelsChecked: 0, objectsChecked: 0, marksChecked: 0, errors: 1, warnings: 0 },
            issues: [{
                code: 'diagnostic-runtime-error',
                severity: 'error',
                message: error && error.message ? error.message : String(error),
                elements: [],
                remedy: 'Fix the diagnostic runtime before accepting the chart.'
            }]
        });
    }

    function schedule() {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-layout-diagnostics', 'pending');
        var completed = false;
        var startedAt = Date.now();

        function chartReady() {
            var rendered = document.documentElement.getAttribute('data-rendered');
            if (rendered !== 'true' && rendered !== 'error') return false;
            return Array.from(document.querySelectorAll('svg[data-label-layout]')).every(function(svg) {
                return svg.getAttribute('data-label-layout') === 'complete';
            });
        }

        function execute(force) {
            if (completed) return;
            if (!force && !chartReady()) {
                if (Date.now() - startedAt < 2000) setTimeout(execute, 80);
                return;
            }
            completed = true;
            try {
                run();
            } catch (error) {
                writeRuntimeError(error);
            }
        }

        function afterFonts() {
            setTimeout(execute, 120);
        }

        setTimeout(function() { execute(true); }, 2200);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(afterFonts, afterFonts);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(execute, 500);
            }, { once: true });
        }
    }

    return {
        DEFAULTS: DEFAULTS,
        normalizeRect: normalizeRect,
        intersection: intersection,
        intersectionRatio: intersectionRatio,
        clipRatio: clipRatio,
        diagnoseBoxes: diagnoseBoxes,
        diagnoseMarkStyles: diagnoseMarkStyles,
        diagnoseBranding: diagnoseBranding,
        diagnoseWatermark: diagnoseWatermark,
        diagnoseRegionalCalloutContainment: diagnoseRegionalCalloutContainment,
        measureViewportFit: measureViewportFit,
        diagnoseViewportFit: diagnoseViewportFit,
        run: run,
        schedule: schedule
    };
});
