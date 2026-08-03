(function(global) {
    'use strict';

    var STATUS_LABELS = {
        stable: 'Stable', improving: 'Improving', strained: 'Strained',
        critical: 'Critical', blocked: 'Blocked', unknown: 'Unknown'
    };
    var MAP_VISUAL_POLICY = global.TochnyiMaps && global.TochnyiMaps.visualPolicy || {
        statusColors: {
            stable: '#71808a', improving: '#3f727b', strained: '#a87436',
            critical: '#a45350', blocked: '#66505e', unknown: '#73777a'
        },
        toneColors: {
            primary: '#526f8a', secondary: '#88764b', warning: '#a87436',
            critical: '#a45350', neutral: '#71808a', positive: '#3f727b'
        },
        valueScale: { start: [184, 200, 212], end: [78, 105, 126] },
        activeFillOpacity: 0.84,
        inactiveFillOpacity: 0.72
    };
    var STATUS_COLORS = MAP_VISUAL_POLICY.statusColors;
    var TONE_COLORS = MAP_VISUAL_POLICY.toneColors;

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function svgElement(tag, attributes) {
        var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.keys(attributes || {}).forEach(function(key) { node.setAttribute(key, attributes[key]); });
        return node;
    }

    function itemRegionIds(item) {
        return item.regionIds || (item.regionId ? [item.regionId] : []);
    }

    function itemColor(item, valueRange) {
        if (item.status && STATUS_COLORS[item.status]) return STATUS_COLORS[item.status];
        if (item.tone && TONE_COLORS[item.tone]) return TONE_COLORS[item.tone];
        if (typeof item.value === 'number' && valueRange.maximum > valueRange.minimum) {
            var ratio = (item.value - valueRange.minimum) / (valueRange.maximum - valueRange.minimum);
            var start = MAP_VISUAL_POLICY.valueScale.start;
            var end = MAP_VISUAL_POLICY.valueScale.end;
            var channels = start.map(function(channel, index) {
                return Math.round(channel + (end[index] - channel) * ratio);
            });
            return '#' + channels.map(function(channel) { return channel.toString(16).padStart(2, '0'); }).join('');
        }
        return '#005bbb';
    }

    function valueRange(data) {
        var values = data.map(function(item) { return item.value; }).filter(function(value) { return typeof value === 'number'; });
        return values.length
            ? { minimum: Math.min.apply(null, values), maximum: Math.max.apply(null, values) }
            : { minimum: 0, maximum: 0 };
    }

    function largestRing(geometry) {
        if (!geometry) return [];
        var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        var largest = [];
        var largestArea = -1;
        (polygons || []).forEach(function(polygon) {
            var ring = polygon && polygon[0] || [];
            var area = Math.abs(ringArea(unwrapRing(ring)));
            if (area > largestArea) {
                largestArea = area;
                largest = ring;
            }
        });
        return largest;
    }

    function unwrapRing(ring) {
        if (!ring.length) return [];
        var result = [[ring[0][0], ring[0][1]]];
        for (var index = 1; index < ring.length; index += 1) {
            var longitude = ring[index][0];
            var previous = result[index - 1][0];
            while (longitude - previous > 180) longitude -= 360;
            while (longitude - previous < -180) longitude += 360;
            result.push([longitude, ring[index][1]]);
        }
        return result;
    }

    function ringArea(ring) {
        var area = 0;
        for (var index = 0; index < ring.length - 1; index += 1) {
            area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
        }
        return area / 2;
    }

    function featureCentroid(feature) {
        var ring = unwrapRing(largestRing(feature && feature.geometry));
        if (!ring.length) return { longitude: 90, latitude: 60 };
        var area = ringArea(ring);
        var longitude = 0;
        var latitude = 0;
        if (Math.abs(area) > 0.000001) {
            for (var index = 0; index < ring.length - 1; index += 1) {
                var cross = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
                longitude += (ring[index][0] + ring[index + 1][0]) * cross;
                latitude += (ring[index][1] + ring[index + 1][1]) * cross;
            }
            longitude /= 6 * area;
            latitude /= 6 * area;
        } else {
            longitude = ring.reduce(function(sum, point) { return sum + point[0]; }, 0) / ring.length;
            latitude = ring.reduce(function(sum, point) { return sum + point[1]; }, 0) / ring.length;
        }
        while (longitude > 180) longitude -= 360;
        while (longitude < -180) longitude += 360;
        return { longitude: longitude, latitude: latitude };
    }

    function geometryPolygons(geometry) {
        if (!geometry) return [];
        if (geometry.type === 'Polygon') return [geometry.coordinates];
        if (geometry.type === 'MultiPolygon') return geometry.coordinates || [];
        return [];
    }

    function rasterizedVisualBounds(features, convert, viewportWidth, viewportHeight) {
        if (!features.length || typeof convert !== 'function' || !viewportWidth || !viewportHeight) return null;
        var rasterWidth = 256;
        var rasterHeight = Math.max(96, Math.min(256, Math.round(rasterWidth * viewportHeight / viewportWidth)));
        var raster = document.createElement('canvas');
        raster.width = rasterWidth;
        raster.height = rasterHeight;
        var context = raster.getContext('2d', { willReadFrequently: true });
        if (!context) return null;
        context.clearRect(0, 0, rasterWidth, rasterHeight);
        context.fillStyle = '#000000';

        features.forEach(function(feature) {
            geometryPolygons(feature && feature.geometry).forEach(function(polygon) {
                context.beginPath();
                (polygon || []).forEach(function(ring) {
                    var started = false;
                    var previousX = 0;
                    (ring || []).forEach(function(coordinate) {
                        var point = convert({ longitude: coordinate[0], latitude: coordinate[1] });
                        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
                        var x = point.x / viewportWidth * rasterWidth;
                        var y = point.y / viewportHeight * rasterHeight;
                        if (started) {
                            while (x - previousX > rasterWidth / 2) x -= rasterWidth;
                            while (x - previousX < -rasterWidth / 2) x += rasterWidth;
                            context.lineTo(x, y);
                        } else {
                            context.moveTo(x, y);
                            started = true;
                        }
                        previousX = x;
                    });
                    if (started) context.closePath();
                });
                context.fill('evenodd');
            });
        });

        var pixels = context.getImageData(0, 0, rasterWidth, rasterHeight).data;
        var columnWeights = new Array(rasterWidth).fill(0);
        var rowWeights = new Array(rasterHeight).fill(0);
        for (var y = 0; y < rasterHeight; y += 1) {
            for (var x = 0; x < rasterWidth; x += 1) {
                if (pixels[(y * rasterWidth + x) * 4 + 3] > 16) {
                    columnWeights[x] += 1;
                    rowWeights[y] += 1;
                }
            }
        }
        return global.TochnyiMaps.visualBoundsFromRasterWeights(
            columnWeights,
            rowWeights,
            viewportWidth,
            viewportHeight,
            0.0075
        );
    }

    function buildCard(item, index, range) {
        var color = itemColor(item, range);
        var card = element('article', 'tochnyi-map-callout');
        card.setAttribute('data-map-index', String(index));
        card.setAttribute('data-status', item.status || 'unknown');
        card.setAttribute('data-tone', item.tone || 'neutral');
        card.style.setProperty('--tochnyi-map-accent', color);
        var header = element('div', 'tochnyi-map-callout-header');
        header.appendChild(element('strong', '', item.label));
        if (item.status) header.appendChild(element('span', 'tochnyi-map-status', STATUS_LABELS[item.status] || item.status));
        card.appendChild(header);
        if (item.displayValue) card.appendChild(element('div', 'tochnyi-map-value', item.displayValue));
        else if (typeof item.value === 'number') card.appendChild(element('div', 'tochnyi-map-value', String(item.value)));
        if (item.detail) card.appendChild(element('p', '', item.detail));
        return card;
    }

    function buildSummary(spec) {
        if (!spec.primaryMetric && !(spec.supportingFacts || []).length) return null;
        var summary = element('aside', 'tochnyi-map-summary');
        if (spec.primaryMetric) {
            summary.appendChild(element('strong', 'tochnyi-map-summary-value', spec.primaryMetric.value));
            summary.appendChild(element('span', 'tochnyi-map-summary-label', spec.primaryMetric.label));
        }
        (spec.supportingFacts || []).forEach(function(fact) {
            var row = element('div', 'tochnyi-map-summary-fact');
            row.setAttribute('data-tone', fact.tone || 'neutral');
            row.appendChild(element('strong', '', fact.value));
            row.appendChild(element('span', '', fact.label));
            summary.appendChild(row);
        });
        return summary;
    }

    function buildLegend(spec) {
        if (!spec.options.showLegend) return null;
        var statuses = Array.from(new Set(spec.data.map(function(item) { return item.status; }).filter(Boolean)));
        if (!statuses.length) return null;
        var legend = element('div', 'tochnyi-map-legend');
        statuses.forEach(function(status) {
            var item = element('span', 'tochnyi-map-legend-item');
            item.style.setProperty('--tochnyi-map-accent', STATUS_COLORS[status]);
            item.appendChild(element('i', ''));
            item.appendChild(element('b', '', STATUS_LABELS[status] || status));
            legend.appendChild(item);
        });
        return legend;
    }

    function pack(entries, top, bottom, gap) {
        if (!entries.length) return;
        entries.sort(function(first, second) {
            var firstOrder = first.item.calloutOrder;
            var secondOrder = second.item.calloutOrder;
            if (firstOrder !== undefined || secondOrder !== undefined) {
                return (firstOrder === undefined ? 999 : firstOrder) - (secondOrder === undefined ? 999 : secondOrder);
            }
            return first.point.y - second.point.y;
        });
        var cursor = top;
        entries.forEach(function(entry) {
            entry.height = Math.ceil(entry.card.getBoundingClientRect().height);
            entry.top = Math.max(cursor, Math.min(entry.point.y - entry.height / 2, bottom - entry.height));
            cursor = entry.top + entry.height + gap;
        });
        var overflow = cursor - gap - bottom;
        if (overflow > 0) {
            entries.forEach(function(entry) { entry.top -= overflow; });
            for (var index = entries.length - 2; index >= 0; index -= 1) {
                entries[index].top = Math.min(entries[index].top, entries[index + 1].top - entries[index].height - gap);
            }
            if (entries[0].top < top) {
                var shift = top - entries[0].top;
                entries.forEach(function(entry) { entry.top += shift; });
            }
        }
    }

    function balancePackedColumn(entries, top, bottom, baseGap) {
        if (!entries.length) return;
        var available = Math.max(0, bottom - top);
        var totalHeight = entries.reduce(function(sum, entry) { return sum + entry.height; }, 0);
        var maximumGap = 36;
        var gap = entries.length > 1
            ? Math.min(maximumGap, Math.max(baseGap, (available - totalHeight) / (entries.length + 1)))
            : 0;
        var used = totalHeight + gap * Math.max(0, entries.length - 1);
        var cursor = top + Math.max(0, (available - used) / 2);
        entries.forEach(function(entry) {
            entry.top = cursor;
            cursor += entry.height + gap;
        });
    }

    function balanceSides(entries, summaryOnRight) {
        var left = entries.filter(function(entry) { return entry.side === 'left'; });
        var right = entries.filter(function(entry) { return entry.side === 'right'; });
        var desiredLeft = Math.ceil(entries.length * (summaryOnRight ? 0.58 : 0.5));
        function movable(list) {
            return list.filter(function(entry) { return !entry.item.calloutSide || entry.item.calloutSide === 'auto'; })
                .sort(function(first, second) { return Math.abs(first.point.x - second.point.x); });
        }
        while (left.length > desiredLeft) {
            var toRight = movable(left)[0];
            if (!toRight) break;
            toRight.side = 'right';
            left = left.filter(function(entry) { return entry !== toRight; });
            right.push(toRight);
        }
        while (left.length < desiredLeft && right.length) {
            var toLeft = movable(right)[0];
            if (!toLeft) break;
            toLeft.side = 'left';
            right = right.filter(function(entry) { return entry !== toLeft; });
            left.push(toLeft);
        }
        return { left: left, right: right };
    }

    function render(spec, chartNode) {
        if (!global.TochnyiMaps) throw new Error('Tochnyi map registry did not load.');
        var regionSet = global.TochnyiMaps.getRegionSet(spec.map.regionSet);
        if (!regionSet) throw new Error('Unknown map region set: ' + spec.map.regionSet);
        var geodata = global[regionSet.geodataGlobal];
        if (!geodata) throw new Error('Map geodata did not load: ' + regionSet.geodataGlobal);

        chartNode.classList.add('tochnyi-map-stage');
        if (spec.data.length > 8) chartNode.classList.add('is-dense');
        if (spec.map.callouts !== 'none') chartNode.classList.add('has-callouts');
        var mapCanvas = element('div', 'tochnyi-map-canvas');
        mapCanvas.id = 'tochnyi-map-canvas';
        var lineLayer = svgElement('svg', { class: 'tochnyi-map-lines', 'aria-hidden': 'true' });
        var cardLayer = element('div', 'tochnyi-map-callouts');
        chartNode.appendChild(mapCanvas);
        chartNode.appendChild(lineLayer);
        chartNode.appendChild(cardLayer);

        var range = valueRange(spec.data);
        var cards = spec.map.callouts === 'none' ? [] : spec.data.map(function(item, index) {
            var card = buildCard(item, index, range);
            cardLayer.appendChild(card);
            return card;
        });
        var summaryPlan = global.TochnyiMaps.resolveSummaryPlan(spec);
        var summary = summaryPlan.show ? buildSummary(spec) : null;
        if (summary) chartNode.appendChild(summary);
        var legend = buildLegend(spec);
        if (legend) chartNode.appendChild(legend);

        var landmassPlan = global.TochnyiMaps.resolveLandmassPlan(
            spec.map,
            regionSet,
            spec.data,
            geodata.features
        );
        if (landmassPlan.removedActiveRegionIds.length) {
            throw new Error(
                'map.landmass removes active region(s): ' + landmassPlan.removedActiveRegionIds.join(', ') +
                '. Use map.landmass = "all" for island or detached-region stories.'
            );
        }
        var featureById = {};
        landmassPlan.features.forEach(function(feature) {
            var featureId = feature.id || feature.properties && feature.properties.id;
            if (featureId) featureById[featureId] = feature;
        });
        var mapPlan = global.TochnyiMaps.resolveMapPlan(spec.map, regionSet, spec.data, featureById);
        var anchorStyle = global.TochnyiMaps.resolveAnchorStyle(spec.map, spec.data);
        chartNode.setAttribute('data-map-landmass', landmassPlan.mode);
        chartNode.setAttribute('data-map-landmass-requested', landmassPlan.requested);
        chartNode.setAttribute('data-map-landmass-reason', landmassPlan.reason);
        chartNode.setAttribute('data-map-landmass-components-kept', String(landmassPlan.keptComponentCount));
        chartNode.setAttribute('data-map-landmass-components-removed', String(landmassPlan.removedComponentCount));
        if (landmassPlan.removedRegionIds.length) {
            chartNode.setAttribute('data-map-landmass-regions-removed', landmassPlan.removedRegionIds.join(','));
        }
        chartNode.setAttribute('data-map-viewport', mapPlan.viewportMode);
        chartNode.setAttribute('data-map-viewport-alignment', mapPlan.viewportAlignment);
        chartNode.setAttribute('data-map-context-fit', mapPlan.contextFit || 'focus');
        chartNode.setAttribute('data-map-center-shift-longitude', String(mapPlan.centerShiftLongitude || 0));
        chartNode.setAttribute('data-map-center-shift-latitude', String(mapPlan.centerShiftLatitude || 0));
        chartNode.setAttribute('data-map-anchor-style', anchorStyle);
        chartNode.setAttribute('data-map-summary-display', summary ? 'shown' : 'hidden');
        chartNode.setAttribute('data-map-summary-reason', summaryPlan.reason);
        if (mapPlan.excludedRegionIds.length) {
            chartNode.setAttribute('data-map-excluded-regions', mapPlan.excludedRegionIds.join(','));
        }

        var byRegion = {};
        spec.data.forEach(function(item, index) {
            itemRegionIds(item).forEach(function(regionId) {
                byRegion[regionId] = { item: item, itemIndex: index, color: itemColor(item, range) };
            });
        });

        var centroids = spec.data.map(function(item) {
            return featureCentroid(featureById[itemRegionIds(item)[0]]);
        });

        var contextFeatures = (mapPlan.contextRegionIds || []).map(function(regionId) {
            return featureById[regionId];
        }).filter(Boolean);
        var geometryLayer = svgElement('svg', {
            class: 'tochnyi-map-geometry',
            role: 'img',
            'aria-label': 'Regional map'
        });
        mapCanvas.appendChild(geometryLayer);
        var projection = null;
        var projectionSizeKey = '';

        function renderGeometry() {
            var canvasWidth = mapCanvas.clientWidth;
            var canvasHeight = mapCanvas.clientHeight;
            if (!canvasWidth || !canvasHeight || !contextFeatures.length) return false;
            var sizeKey = canvasWidth + 'x' + canvasHeight;
            if (projection && projectionSizeKey === sizeKey) return true;
            projection = global.TochnyiMaps.buildStaticProjection(
                contextFeatures,
                { width: canvasWidth, height: canvasHeight },
                {
                    centerLongitude: mapPlan.geoBounds
                        ? (mapPlan.geoBounds.left + mapPlan.geoBounds.right) / 2
                        : undefined,
                    paddingX: 8,
                    paddingY: 8
                }
            );
            if (!projection) return false;
            projectionSizeKey = sizeKey;
            geometryLayer.setAttribute('viewBox', '0 0 ' + canvasWidth + ' ' + canvasHeight);
            geometryLayer.setAttribute('width', String(canvasWidth));
            geometryLayer.setAttribute('height', String(canvasHeight));
            geometryLayer.replaceChildren();
            contextFeatures.forEach(function(feature) {
                var featureId = feature.id || feature.properties && feature.properties.id;
                var match = featureId && byRegion[featureId];
                var pathNode = svgElement('path', {
                    d: projection.path(feature),
                    class: match ? 'tochnyi-map-region is-active' : 'tochnyi-map-region',
                    fill: match ? match.color : '#d9e1e6',
                    'fill-opacity': match ? MAP_VISUAL_POLICY.activeFillOpacity : MAP_VISUAL_POLICY.inactiveFillOpacity,
                    stroke: '#ffffff',
                    'stroke-width': '0.8',
                    'fill-rule': 'evenodd',
                    'data-region-id': featureId || ''
                });
                var title = svgElement('title');
                var name = feature.properties && (feature.properties.name || feature.properties.NAME_1) || featureId || 'Region';
                title.textContent = match && match.item
                    ? match.item.label + (match.item.displayValue ? ': ' + match.item.displayValue : '')
                    : name;
                pathNode.appendChild(title);
                geometryLayer.appendChild(pathNode);
            });
            var rendered = projection.renderedBounds;
            chartNode.setAttribute('data-map-projection', 'static-mercator');
            chartNode.setAttribute('data-map-projection-center-longitude', String(Math.round(projection.centerLongitude * 1000) / 1000));
            chartNode.setAttribute('data-map-rendered-left', String(Math.round(rendered.left * 10) / 10));
            chartNode.setAttribute('data-map-rendered-right', String(Math.round(rendered.right * 10) / 10));
            chartNode.setAttribute('data-map-rendered-top', String(Math.round(rendered.top * 10) / 10));
            chartNode.setAttribute('data-map-rendered-bottom', String(Math.round(rendered.bottom * 10) / 10));
            chartNode.setAttribute('data-map-hard-overflow-x', 'false');
            chartNode.setAttribute('data-map-hard-overflow-y', 'false');
            chartNode.setAttribute('data-map-containment-refit', 'false');
            return true;
        }

        function layout() {
            var width = chartNode.clientWidth;
            var height = chartNode.clientHeight;
            if (!width || !height) return;
            var narrow = width <= 760;
            chartNode.classList.toggle('is-narrow', narrow);
            projectionSizeKey = '';
            renderGeometry();
            var summaryPosition = spec.map.summaryPosition;
            if (summaryPosition === 'auto') summaryPosition = spec.data.length <= 7 && !narrow ? 'right' : 'below';
            if (summary) {
                summary.classList.toggle('is-right', summaryPosition === 'right' && !narrow);
                summary.classList.toggle('is-below', summaryPosition !== 'right' || narrow);
                summary.style.removeProperty('bottom');
                if (!narrow && summaryPosition === 'below' && legend) {
                    summary.style.bottom = Math.ceil(legend.getBoundingClientRect().height) + 16 + 'px';
                }
            }

            if (narrow || !cards.length) {
                lineLayer.replaceChildren();
                cards.forEach(function(card) {
                    card.style.removeProperty('left');
                    card.style.removeProperty('right');
                    card.style.removeProperty('top');
                });
                return;
            }

            var canvasRect = mapCanvas.getBoundingClientRect();
            var stageRect = chartNode.getBoundingClientRect();
            var entries = cards.map(function(card, index) {
                var converted = projection && projection.project(centroids[index]);
                var point = converted && Number.isFinite(converted.x) && Number.isFinite(converted.y)
                    ? { x: converted.x + canvasRect.left - stageRect.left, y: converted.y + canvasRect.top - stageRect.top }
                    : { x: width / 2, y: height / 2 };
                var requested = spec.data[index].calloutSide;
                var side = requested && requested !== 'auto' ? requested : point.x < width / 2 ? 'left' : 'right';
                return { card: card, item: spec.data[index], index: index, point: point, side: side };
            });

            var summaryOnRight = summary && summaryPosition === 'right';
            var sides = balanceSides(entries, summaryOnRight);
            var gap = chartNode.classList.contains('is-dense') ? 7 : 10;
            var topLeft = 10;
            var topRight = summaryOnRight ? Math.ceil(summary.getBoundingClientRect().height) + 22 : 10;
            var bottom = height - 10;
            if (summary && summaryPosition === 'below') bottom -= Math.ceil(summary.getBoundingClientRect().height) + 18;
            if (legend) bottom -= Math.ceil(legend.getBoundingClientRect().height) + 8;
            pack(sides.left, topLeft, bottom, gap);
            pack(sides.right, topRight, bottom, gap);
            var leftDistribution = global.TochnyiMaps.resolveCalloutDistribution(spec.map, Boolean(summary), sides.left);
            var rightDistribution = global.TochnyiMaps.resolveCalloutDistribution(spec.map, Boolean(summary), sides.right);
            if (leftDistribution === 'balanced') balancePackedColumn(sides.left, topLeft, bottom, gap);
            if (rightDistribution === 'balanced') balancePackedColumn(sides.right, topRight, bottom, gap);
            chartNode.setAttribute(
                'data-map-callout-distribution',
                leftDistribution === rightDistribution ? leftDistribution : 'mixed'
            );

            var cardWidth = Math.min(chartNode.classList.contains('is-dense') ? 210 : 226, Math.floor(width * 0.24));
            sides.left.concat(sides.right).forEach(function(entry) {
                entry.card.style.width = cardWidth + 'px';
                entry.card.style.top = Math.round(entry.top) + 'px';
                if (entry.side === 'left') {
                    entry.card.style.left = '10px';
                    entry.card.style.removeProperty('right');
                } else {
                    entry.card.style.right = '10px';
                    entry.card.style.removeProperty('left');
                }
            });

            lineLayer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
            lineLayer.setAttribute('width', String(width));
            lineLayer.setAttribute('height', String(height));
            lineLayer.replaceChildren();
            var routeTop = Math.max(20, canvasRect.top - stageRect.top + 20);
            var routeBottom = Math.min(bottom - 8, canvasRect.bottom - stageRect.top - 20);
            var routedEntries = global.TochnyiMaps.planLeaderRoutes(sides.left.concat(sides.right), {
                routing: spec.map.leaderRouting,
                top: routeTop,
                bottom: routeBottom,
                gap: chartNode.classList.contains('is-dense') ? 15 : 18
            });
            chartNode.setAttribute('data-map-leader-routing', routedEntries.routing);
            routedEntries.forEach(function(entry) {
                var cardX = entry.side === 'left' ? 10 + cardWidth : width - 10 - cardWidth;
                var endY = entry.top + Math.min(entry.height / 2, 33);
                var mapEdgeX = entry.side === 'left'
                    ? canvasRect.left - stageRect.left
                    : canvasRect.right - stageRect.left;
                var leaderPath = global.TochnyiMaps.buildOrthogonalLeaderPath(entry, {
                    mapEdgeX: mapEdgeX,
                    cardX: cardX,
                    endY: endY
                });
                var pathData = leaderPath.path;
                lineLayer.appendChild(svgElement('path', {
                    d: pathData, class: 'tochnyi-map-leader-halo',
                    'data-label-group': 'map-item-' + entry.index
                }));
                lineLayer.appendChild(svgElement('path', {
                    d: pathData, class: 'tochnyi-map-leader',
                    stroke: itemColor(entry.item, range),
                    'data-tochnyi-mark': 'leader-line', 'data-label-group': 'map-item-' + entry.index
                }));
                if (anchorStyle === 'dot') {
                    lineLayer.appendChild(svgElement('circle', {
                        cx: entry.point.x, cy: entry.point.y, r: 4.5, class: 'tochnyi-map-anchor',
                        fill: itemColor(entry.item, range), 'data-tochnyi-mark': 'map-anchor',
                        'data-label-group': 'map-item-' + entry.index
                    }));
                }
            });
        }

        layout();
        if (global.requestAnimationFrame) global.requestAnimationFrame(layout);
        global.addEventListener('resize', function() {
            projectionSizeKey = '';
            layout();
            setTimeout(layout, 80);
        });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() {
            projectionSizeKey = '';
            layout();
        });
    }

    global.TochnyiMapRuntime = { render: render, featureCentroid: featureCentroid };
})(window);
