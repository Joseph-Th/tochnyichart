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
        inactiveFill: '#c3cbd0',
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

    function pathSegmentCrosses(firstStart, firstEnd, secondStart, secondEnd) {
        var firstDx = firstEnd.x - firstStart.x;
        var firstDy = firstEnd.y - firstStart.y;
        var secondDx = secondEnd.x - secondStart.x;
        var secondDy = secondEnd.y - secondStart.y;
        var denominator = firstDx * secondDy - firstDy * secondDx;
        if (Math.abs(denominator) < 0.0001) return false;
        var deltaX = secondStart.x - firstStart.x;
        var deltaY = secondStart.y - firstStart.y;
        var firstRatio = (deltaX * secondDy - deltaY * secondDx) / denominator;
        var secondRatio = (deltaX * firstDy - deltaY * firstDx) / denominator;
        return firstRatio > 0.02 && firstRatio < 0.98 && secondRatio > 0.02 && secondRatio < 0.98;
    }

    function sampledSvgPath(pathNode) {
        if (!pathNode || typeof pathNode.getTotalLength !== 'function') return [];
        var length = pathNode.getTotalLength();
        var samples = Math.max(12, Math.min(96, Math.ceil(length / 10)));
        var points = [];
        for (var index = 0; index <= samples; index += 1) {
            var point = pathNode.getPointAtLength(length * index / samples);
            points.push({ x: point.x, y: point.y });
        }
        return points;
    }

    function countRenderedLeaderCrossings(pathNodes) {
        var sampled = (pathNodes || []).map(sampledSvgPath);
        var crossings = 0;
        for (var first = 0; first < sampled.length; first += 1) {
            for (var second = first + 1; second < sampled.length; second += 1) {
                var found = false;
                for (var firstIndex = 1; firstIndex < sampled[first].length && !found; firstIndex += 1) {
                    for (var secondIndex = 1; secondIndex < sampled[second].length; secondIndex += 1) {
                        if (pathSegmentCrosses(
                            sampled[first][firstIndex - 1],
                            sampled[first][firstIndex],
                            sampled[second][secondIndex - 1],
                            sampled[second][secondIndex]
                        )) {
                            found = true;
                            break;
                        }
                    }
                }
                if (found) {
                    crossings += 1;
                }
            }
        }
        return crossings;
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

    function pointInSvgPath(svg, pathNode, point) {
        if (!svg || !pathNode || typeof pathNode.isPointInFill !== 'function' || !point) return false;
        var svgPoint = svg.createSVGPoint();
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        return pathNode.isPointInFill(svgPoint);
    }

    function resolveInteriorAnchor(feature, pathNode, projection, geometryLayer, viewport, preferred) {
        if (!feature || !projection || !preferred || !pathNode) return preferred;
        if (pointInSvgPath(geometryLayer, pathNode, preferred)) return preferred;
        var bounds = global.TochnyiMaps.projectedFeatureBounds(
            [feature],
            projection.project,
            viewport
        );
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return preferred;
        var candidates = [{ x: bounds.centerX, y: bounds.centerY }];
        var columns = 12;
        var rows = 12;
        for (var row = 1; row < rows; row += 1) {
            for (var column = 1; column < columns; column += 1) {
                candidates.push({
                    x: bounds.left + bounds.width * column / columns,
                    y: bounds.top + bounds.height * row / rows
                });
            }
        }
        var probeRadius = Math.max(3, Math.min(10, Math.min(bounds.width, bounds.height) * 0.08));
        var probeOffsets = [
            [0, 0],
            [probeRadius, 0], [-probeRadius, 0],
            [0, probeRadius], [0, -probeRadius],
            [probeRadius * 0.7, probeRadius * 0.7],
            [probeRadius * 0.7, -probeRadius * 0.7],
            [-probeRadius * 0.7, probeRadius * 0.7],
            [-probeRadius * 0.7, -probeRadius * 0.7]
        ];
        var viable = candidates.filter(function(candidate) {
            return pointInSvgPath(geometryLayer, pathNode, candidate);
        }).map(function(candidate) {
            var interiorProbes = probeOffsets.reduce(function(count, offset) {
                return count + (pointInSvgPath(geometryLayer, pathNode, {
                    x: candidate.x + offset[0],
                    y: candidate.y + offset[1]
                }) ? 1 : 0);
            }, 0);
            return {
                point: candidate,
                score: interiorProbes * 1000 - Math.hypot(candidate.x - preferred.x, candidate.y - preferred.y)
            };
        }).sort(function(first, second) {
            return second.score - first.score;
        });
        return viable.length ? viable[0].point : preferred;
    }

    function resolveFacingInteriorAnchor(feature, pathNode, projection, geometryLayer, viewport, preferred, side, preferEdge, preferFarEdge) {
        if (!feature || !projection || !preferred || !pathNode) return preferred;
        var bounds = global.TochnyiMaps.projectedFeatureBounds(
            [feature],
            projection.project,
            viewport
        );
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return preferred;
        var edgeFractions = preferFarEdge
            ? side === 'left'
                ? [0.56, 0.66, 0.75, 0.82, 0.88, 0.92]
                : [0.44, 0.34, 0.25, 0.18, 0.12, 0.08]
            : preferEdge
            ? side === 'left'
                ? [0.06, 0.08, 0.12, 0.18, 0.25, 0.34, 0.44, 0.56]
                : [0.96, 0.94, 0.92, 0.88, 0.82, 0.75, 0.66, 0.56, 0.44]
            : side === 'left'
                ? [0.12, 0.18, 0.25, 0.34, 0.44, 0.56]
                : [0.88, 0.82, 0.75, 0.66, 0.56, 0.44];
        var yFractions = [
            (preferred.y - bounds.top) / Math.max(1, bounds.height),
            0.5, 0.35, 0.65, 0.2, 0.8
        ].map(function(value) { return Math.max(0.08, Math.min(0.92, value)); });
        var probeRadius = Math.max(2, Math.min(6, Math.min(bounds.width, bounds.height) * 0.1));
        var probeOffsets = [
            [0, 0],
            [probeRadius, 0], [-probeRadius, 0],
            [0, probeRadius], [0, -probeRadius]
        ];
        var candidates = [];
        edgeFractions.forEach(function(xFraction) {
            yFractions.forEach(function(yFraction) {
                var candidate = {
                    x: bounds.left + bounds.width * xFraction,
                    y: bounds.top + bounds.height * yFraction
                };
                if (!pointInSvgPath(geometryLayer, pathNode, candidate)) return;
                var interiorProbes = probeOffsets.reduce(function(count, offset) {
                    return count + (pointInSvgPath(geometryLayer, pathNode, {
                        x: candidate.x + offset[0],
                        y: candidate.y + offset[1]
                    }) ? 1 : 0);
                }, 0);
                var edgeDistance = side === 'left'
                    ? candidate.x - bounds.left
                    : bounds.right - candidate.x;
                candidates.push({
                    point: candidate,
                    score: preferFarEdge
                        ? edgeDistance * 1000 + interiorProbes * 20 - Math.abs(candidate.y - preferred.y)
                        : preferEdge
                        ? -edgeDistance * 1000 + interiorProbes * 20 - Math.abs(candidate.y - preferred.y)
                        : interiorProbes * 10000 - edgeDistance * 100 - Math.abs(candidate.y - preferred.y)
                });
            });
        });
        candidates.sort(function(first, second) { return second.score - first.score; });
        return candidates.length ? candidates[0].point : preferred;
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
        header.appendChild(element('span', 'tochnyi-map-index', String(index + 1)));
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

    function pack(entries, top, bottom, gap, ordering) {
        if (!entries.length) return;
        entries.sort(function(first, second) {
            if (ordering === 'optimized') {
                return Number(first.placementOrder) - Number(second.placementOrder);
            }
            if (ordering === 'geographic') return first.point.y - second.point.y;
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

    function render(spec, chartNode) {
        if (!global.TochnyiMaps) throw new Error('Tochnyi map registry did not load.');
        var regionSet = global.TochnyiMaps.getRegionSet(spec.map.regionSet);
        if (!regionSet) throw new Error('Unknown map region set: ' + spec.map.regionSet);
        var geodata = global[regionSet.geodataGlobal];
        if (!geodata) throw new Error('Map geodata did not load: ' + regionSet.geodataGlobal);

        chartNode.classList.add('tochnyi-map-stage');
        chartNode.setAttribute('data-map-workflow', 'regional-breakdown');
        var regionalPolicy = global.TochnyiMaps.getRegionalBreakdownPolicy({ count: spec.data.length });
        if (regionalPolicy.dense) chartNode.classList.add('is-dense');
        if (spec.map.callouts !== 'none') chartNode.classList.add('has-callouts');
        var mapCanvas = element('div', 'tochnyi-map-canvas');
        mapCanvas.id = 'tochnyi-map-canvas';
        var lineLayer = svgElement('svg', { class: 'tochnyi-map-lines', 'aria-hidden': 'true' });
        var cardLayer = element('div', 'tochnyi-map-callouts');
        var watermark = chartNode.parentElement && chartNode.parentElement.querySelector(':scope > .tochnyi-watermark');
        if (watermark) {
            watermark.classList.remove('corner', 'small', 'watermark-quiet');
            watermark.classList.add('watermark-map', 'watermark-map-behind');
            watermark.setAttribute('data-watermark-layer', 'behind-map');
            chartNode.appendChild(watermark);
        }
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
                    fill: match ? match.color : MAP_VISUAL_POLICY.inactiveFill,
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
            if (!narrow && summary && summaryPosition === 'below') {
                var reservedBottom = regionalPolicy.stageInset +
                    Math.ceil(summary.getBoundingClientRect().height) +
                    regionalPolicy.summaryBelowGap;
                if (legend) {
                    reservedBottom += Math.ceil(legend.getBoundingClientRect().height) +
                        regionalPolicy.legendGap;
                }
                mapCanvas.style.bottom = Math.ceil(reservedBottom) + 'px';
            } else {
                mapCanvas.style.removeProperty('bottom');
            }
            projectionSizeKey = '';
            renderGeometry();

            if (narrow || !cards.length) {
                chartNode.setAttribute('data-map-callout-placement', narrow ? 'stacked-responsive' : 'none');
                chartNode.setAttribute('data-map-leader-routing', narrow ? 'none-responsive' : 'none');
                chartNode.setAttribute('data-map-callout-predicted-crossings', '0');
                chartNode.setAttribute('data-map-port-final-collisions', '0');
                chartNode.setAttribute('data-map-port-fallback-routes', '0');
                chartNode.setAttribute('data-map-port-source-exit-routes', '0');
                chartNode.setAttribute('data-map-port-rendered-crossings', '0');
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
            var activeGeometryByRegion = {};
            Array.from(geometryLayer.querySelectorAll('.tochnyi-map-region.is-active')).forEach(function(pathNode) {
                activeGeometryByRegion[pathNode.getAttribute('data-region-id')] = pathNode;
            });
            var projectedCentroidXs = centroids.map(function(centroid) {
                var projected = projection && projection.project(centroid);
                return projected && Number.isFinite(projected.x) ? projected.x : null;
            }).filter(function(value) { return value !== null; });
            var centroidCoverage = projectedCentroidXs.length > 1
                ? (Math.max.apply(null, projectedCentroidXs) - Math.min.apply(null, projectedCentroidXs)) /
                    Math.max(1, mapCanvas.clientWidth)
                : 0;
            var useFacingInteriorAnchors = regionalPolicy.dense && centroidCoverage >= 0.45;
            var adjustedInteriorAnchors = 0;
            var entries = cards.map(function(card, index) {
                var converted = projection && projection.project(centroids[index]);
                var regionId = itemRegionIds(spec.data[index])[0];
                var preferred = converted && Number.isFinite(converted.x) && Number.isFinite(converted.y)
                    ? { x: converted.x, y: converted.y }
                    : { x: mapCanvas.clientWidth / 2, y: mapCanvas.clientHeight / 2 };
                var requested = spec.data[index].calloutSide;
                var side = requested && requested !== 'auto' ? requested : preferred.x < width / 2 ? 'left' : 'right';
                var interior = resolveInteriorAnchor(
                    featureById[regionId],
                    activeGeometryByRegion[regionId],
                    projection,
                    geometryLayer,
                    { width: mapCanvas.clientWidth, height: mapCanvas.clientHeight },
                    preferred
                );
                if (useFacingInteriorAnchors) {
                    interior = resolveFacingInteriorAnchor(
                        featureById[regionId],
                        activeGeometryByRegion[regionId],
                        projection,
                        geometryLayer,
                        { width: mapCanvas.clientWidth, height: mapCanvas.clientHeight },
                        interior,
                        side,
                        spec.map.viewport !== 'all',
                        regionId === 'RU-MUR'
                    );
                }
                if (Math.hypot(interior.x - preferred.x, interior.y - preferred.y) > 1) adjustedInteriorAnchors += 1;
                var point = interior && Number.isFinite(interior.x) && Number.isFinite(interior.y)
                    ? { x: interior.x + canvasRect.left - stageRect.left, y: interior.y + canvasRect.top - stageRect.top }
                    : { x: width / 2, y: height / 2 };
                return { card: card, item: spec.data[index], index: index, point: point, side: side };
            });
            chartNode.setAttribute('data-map-interior-anchor-adjustments', String(adjustedInteriorAnchors));

            var summaryOnRight = summary && summaryPosition === 'right';
            var gap = regionalPolicy.cardGap;
            var topLeft = regionalPolicy.stageInset;
            var topRight = summaryOnRight
                ? Math.ceil(summary.getBoundingClientRect().height) + regionalPolicy.summaryRightGap
                : regionalPolicy.stageInset;
            var bottom = height - regionalPolicy.stageInset;
            if (summary && summaryPosition === 'below') {
                bottom -= Math.ceil(summary.getBoundingClientRect().height) + regionalPolicy.summaryBelowGap;
            }
            if (legend) bottom -= Math.ceil(legend.getBoundingClientRect().height) + regionalPolicy.legendGap;
            var cardWidth = Math.min(regionalPolicy.cardWidth, Math.floor(width * 0.24));
            entries.forEach(function(entry) {
                entry.card.style.width = cardWidth + 'px';
                entry.height = Math.ceil(entry.card.getBoundingClientRect().height);
            });
            var breakdownPlan = global.TochnyiMaps.planRegionalBreakdown(entries, {
                map: spec.map,
                dense: regionalPolicy.dense,
                width: width,
                cardWidth: cardWidth,
                topLeft: topLeft,
                topRight: topRight,
                bottom: bottom,
                summaryShown: Boolean(summary),
                summaryOnRight: summaryOnRight
            });
            var placement = breakdownPlan.placement;
            var sides = breakdownPlan.sides;
            var usePortRouting = breakdownPlan.usePortRouting;
            chartNode.setAttribute('data-map-callout-placement', breakdownPlan.placementMode);
            if (usePortRouting) {
                chartNode.setAttribute('data-map-callout-predicted-crossings', String(placement.predictedCrossings));
                chartNode.setAttribute('data-map-callout-side-switches', String(placement.sideSwitches));
                chartNode.setAttribute('data-map-callout-assignment-evaluations', String(placement.assignmentEvaluations));
                chartNode.setAttribute(
                    'data-map-callout-max-attachment-slope',
                    String(Math.round((placement.maximumAttachmentSlope || 0) * 100) / 100)
                );
                chartNode.setAttribute(
                    'data-map-callout-attachment-sharpness',
                    String(Math.round((placement.attachmentSharpness || 0) * 100) / 100)
                );
            }
            var leftDistribution = breakdownPlan.leftDistribution;
            var rightDistribution = breakdownPlan.rightDistribution;
            pack(sides.left, topLeft, bottom, gap, usePortRouting ? 'optimized' : 'editorial');
            pack(sides.right, topRight, bottom, gap, usePortRouting ? 'optimized' : 'editorial');
            if (leftDistribution === 'balanced') balancePackedColumn(sides.left, topLeft, bottom, gap);
            if (rightDistribution === 'balanced') balancePackedColumn(sides.right, topRight, bottom, gap);
            chartNode.setAttribute(
                'data-map-callout-distribution',
                leftDistribution === rightDistribution ? leftDistribution : 'mixed'
            );

            sides.left.concat(sides.right).forEach(function(entry) {
                entry.card.style.top = Math.round(entry.top) + 'px';
                var attachmentInset = regionalPolicy.attachmentInset;
                var attachmentTop = entry.top + attachmentInset;
                var attachmentBottom = entry.top + entry.height - attachmentInset;
                entry.endY = attachmentTop <= attachmentBottom
                    ? Math.max(attachmentTop, Math.min(attachmentBottom, entry.point.y))
                    : entry.top + entry.height / 2;
                if (entry.side === 'left') {
                    entry.card.style.left = regionalPolicy.cardInset + 'px';
                    entry.card.style.removeProperty('right');
                } else {
                    entry.card.style.right = regionalPolicy.cardInset + 'px';
                    entry.card.style.removeProperty('left');
                }
            });

            lineLayer.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
            lineLayer.setAttribute('width', String(width));
            lineLayer.setAttribute('height', String(height));
            lineLayer.replaceChildren();
            var routeTop = Math.max(
                regionalPolicy.routeVerticalInset,
                canvasRect.top - stageRect.top + regionalPolicy.routeVerticalInset
            );
            var routeBottom = Math.min(
                bottom - regionalPolicy.routeBottomInset,
                canvasRect.bottom - stageRect.top - regionalPolicy.routeVerticalInset
            );
            var routedEntries = global.TochnyiMaps.planLeaderRoutes(sides.left.concat(sides.right), {
                routing: spec.map.leaderRouting,
                top: routeTop,
                bottom: routeBottom,
                gap: regionalPolicy.portGap
            });
            chartNode.setAttribute('data-map-leader-routing', routedEntries.routing);
            chartNode.classList.toggle('has-indexed-connectors', routedEntries.routing === 'indexed');
            chartNode.classList.toggle('has-port-connectors', routedEntries.routing === 'ports');

            if (routedEntries.routing === 'ports') {
                var activeObstacles = [];
                var canvasOffsetX = canvasRect.left - stageRect.left;
                var canvasOffsetY = canvasRect.top - stageRect.top;
                var shapeClearance = regionalPolicy.shapeClearance;
                var clearanceOffsets = [
                    [0, 0],
                    [shapeClearance, 0], [-shapeClearance, 0],
                    [0, shapeClearance], [0, -shapeClearance],
                    [shapeClearance * 0.7, shapeClearance * 0.7],
                    [shapeClearance * 0.7, -shapeClearance * 0.7],
                    [-shapeClearance * 0.7, shapeClearance * 0.7],
                    [-shapeClearance * 0.7, -shapeClearance * 0.7]
                ];
                spec.data.forEach(function(item, itemIndex) {
                    itemRegionIds(item).forEach(function(regionId) {
                        var feature = featureById[regionId];
                        var pathNode = activeGeometryByRegion[regionId];
                        if (!feature) return;
                        var bounds = global.TochnyiMaps.projectedFeatureBounds(
                            [feature],
                            projection.project,
                            { width: mapCanvas.clientWidth, height: mapCanvas.clientHeight }
                        );
                        if (!bounds) return;
                        activeObstacles.push({
                            id: regionId,
                            regionId: regionId,
                            itemIndex: itemIndex,
                            left: bounds.left + canvasRect.left - stageRect.left,
                            right: bounds.right + canvasRect.left - stageRect.left,
                            top: bounds.top + canvasRect.top - stageRect.top,
                            bottom: bounds.bottom + canvasRect.top - stageRect.top,
                            contains: pathNode && typeof pathNode.isPointInFill === 'function'
                                ? function(stagePoint) {
                                    return clearanceOffsets.some(function(offset) {
                                        var localPoint = geometryLayer.createSVGPoint();
                                        localPoint.x = stagePoint.x - canvasOffsetX + offset[0];
                                        localPoint.y = stagePoint.y - canvasOffsetY + offset[1];
                                        return pathNode.isPointInFill(localPoint);
                                    });
                                }
                                : null,
                            exactContains: pathNode && typeof pathNode.isPointInFill === 'function'
                                ? function(stagePoint) {
                                    var localPoint = geometryLayer.createSVGPoint();
                                    localPoint.x = stagePoint.x - canvasOffsetX;
                                    localPoint.y = stagePoint.y - canvasOffsetY;
                                    return pathNode.isPointInFill(localPoint);
                                }
                                : null
                        });
                    });
                });
                // Plan the left-side leaders first. In the natural Russia layout,
                // western callouts belong on the left and eastern callouts on the
                // right; keeping that relationship fixed lets the right route
                // account for any western detour without swapping the columns
                // to hide a crossover.
                function sortRouteEntries(orderMode) {
                    return routedEntries.slice().sort(function(first, second) {
                        if (first.side !== second.side) return first.side === 'left' ? -1 : 1;
                        if (orderMode === 'geographic' && spec.map.viewport !== 'all') {
                            var firstY = Number(first.point.y);
                            var secondY = Number(second.point.y);
                            return first.side === 'left' ? firstY - secondY : secondY - firstY;
                        }
                        var firstPortIndex = Number(first.portIndex) || 0;
                        var secondPortIndex = Number(second.portIndex) || 0;
                        return orderMode === 'reverse'
                            ? secondPortIndex - firstPortIndex
                            : firstPortIndex - secondPortIndex;
                    });
                }

                var routeEntries = sortRouteEntries('port');
                function planPortRoutes() {
                    var plannedLeaderSegments = [];
                    var portPlansByIndex = {};
                    routeEntries.forEach(function(entry) {
                    var cardX = entry.side === 'left'
                        ? regionalPolicy.cardInset + cardWidth
                        : width - regionalPolicy.cardInset - cardWidth;
                    var mapEdgeX = entry.side === 'left'
                        ? canvasRect.left - stageRect.left
                        : canvasRect.right - stageRect.left;
                    var obstacles = activeObstacles.filter(function(obstacle) {
                        return obstacle.itemIndex !== entry.index;
                    });
                    var sourceObstacles = activeObstacles.filter(function(obstacle) {
                        return obstacle.itemIndex === entry.index;
                    });
                    var routeSettings = {
                        mapEdgeX: mapEdgeX,
                        cardX: cardX,
                        cardTop: entry.top,
                        cardBottom: entry.top + entry.height,
                        endY: entry.endY,
                        portOffset: regionalPolicy.portOffset,
                        minimumCardStub: regionalPolicy.minimumCardStub,
                        obstacles: obstacles,
                        sourceObstacles: sourceObstacles,
                        obstacleClearance: shapeClearance,
                        routeTop: routeTop,
                        routeBottom: routeBottom,
                        routeLeft: canvasRect.left - stageRect.left + regionalPolicy.routeInset,
                        routeRight: canvasRect.right - stageRect.left - regionalPolicy.routeInset,
                        samplesPerSegment: regionalPolicy.samplesPerSegment,
                        preferSmooth: regionalPolicy.dense || spec.map.viewport === 'all',
                        preferLongCardStub: useFacingInteriorAnchors &&
                            itemRegionIds(entry.item)[0] === 'RU-MUR',
                        avoidRoutes: plannedLeaderSegments
                    };
                    var leaderPath = global.TochnyiMaps.buildPortLeaderPath(entry, routeSettings);
                    if (useFacingInteriorAnchors && spec.map.viewport !== 'all' &&
                        itemRegionIds(entry.item)[0] === 'RU-MUR' &&
                        (leaderPath.fallback || leaderPath.collisionCount || leaderPath.routeCrossings ||
                            leaderPath.selfIntersection || leaderPath.directCollisionCount)) {
                        var attachmentTop = entry.top + regionalPolicy.attachmentInset;
                        var attachmentBottom = entry.top + entry.height - regionalPolicy.attachmentInset;
                        var edgeAttachmentTop = entry.top + 4;
                        var edgeAttachmentBottom = entry.top + entry.height - 4;
                        var portCandidates = [attachmentTop, attachmentBottom, edgeAttachmentTop, edgeAttachmentBottom].filter(function(value) {
                            return Number.isFinite(value) && Math.abs(value - Number(entry.portY)) > 1;
                        });
                        var bestPortPath = leaderPath;
                        portCandidates.forEach(function(candidateY) {
                            var candidateEntry = Object.assign({}, entry, { portY: candidateY });
                            var candidatePath = global.TochnyiMaps.buildPortLeaderPath(
                                candidateEntry,
                                routeSettings
                            );
                            var currentScore = [
                                bestPortPath.selfIntersection ? 1 : 0,
                                Number(bestPortPath.routeCrossings) || 0,
                                bestPortPath.fallback ? 1 : 0,
                                Number(bestPortPath.collisionCount) || 0,
                                Number(bestPortPath.directCollisionCount) || 0,
                                Number(bestPortPath.verticalExcursion) || 0
                            ];
                            var candidateScore = [
                                candidatePath.selfIntersection ? 1 : 0,
                                Number(candidatePath.routeCrossings) || 0,
                                candidatePath.fallback ? 1 : 0,
                                Number(candidatePath.collisionCount) || 0,
                                Number(candidatePath.directCollisionCount) || 0,
                                Number(candidatePath.verticalExcursion) || 0
                            ];
                            var better = false;
                            for (var scoreIndex = 0; scoreIndex < currentScore.length; scoreIndex += 1) {
                                if (candidateScore[scoreIndex] < currentScore[scoreIndex]) {
                                    better = true;
                                    break;
                                }
                                if (candidateScore[scoreIndex] > currentScore[scoreIndex]) break;
                            }
                            if (better) bestPortPath = candidatePath;
                        });
                        leaderPath = bestPortPath;
                    }
                    var plan = {
                        entry: entry,
                        pathData: leaderPath.path,
                        routeSegments: leaderPath.routeSegments || [],
                        routeCrossings: leaderPath.routeCrossings || 0,
                        portX: leaderPath.portX,
                        portY: leaderPath.portY,
                        cardStubLength: leaderPath.cardStubLength,
                        adaptiveCardStub: Boolean(leaderPath.adaptiveCardStub),
                        avoidance: leaderPath.avoidance,
                        directCollisionCount: leaderPath.directCollisionCount,
                        collisionCount: leaderPath.collisionCount,
                        avoidedObstacleCount: leaderPath.avoidedObstacleCount,
                        verticalExcursion: Number(leaderPath.verticalExcursion) || 0,
                        routingEnvelope: leaderPath.routingEnvelope || 'direct',
                        sourceExitUsed: leaderPath.sourceExitUsed,
                        fallback: leaderPath.fallback,
                        selfIntersection: Boolean(leaderPath.selfIntersection),
                        smooth: Boolean(leaderPath.smooth),
                        candidateSource: leaderPath.candidateSource || 'direct'
                    };
                        plannedLeaderSegments.push(plan.routeSegments);
                        portPlansByIndex[entry.index] = plan;
                    });
                    return {
                        plannedLeaderSegments: plannedLeaderSegments,
                        portPlansByIndex: portPlansByIndex
                    };
                }
                var portRoutePlan = planPortRoutes();
                function routePlanMetrics(plan) {
                    return {
                        crossings: Object.keys(plan.portPlansByIndex).reduce(function(total, index) {
                            return total + (Number(plan.portPlansByIndex[index].routeCrossings) || 0);
                        }, 0),
                        selfIntersections: Object.keys(plan.portPlansByIndex).reduce(function(total, index) {
                            return total + (plan.portPlansByIndex[index].selfIntersection ? 1 : 0);
                        }, 0),
                        fallbacks: Object.keys(plan.portPlansByIndex).reduce(function(total, index) {
                            return total + (plan.portPlansByIndex[index].fallback ? 1 : 0);
                        }, 0),
                        collisions: Object.keys(plan.portPlansByIndex).reduce(function(total, index) {
                            return total + (Number(plan.portPlansByIndex[index].collisionCount) || 0);
                        }, 0),
                        verticalExcursion: Object.keys(plan.portPlansByIndex).reduce(function(total, index) {
                            return total + (Number(plan.portPlansByIndex[index].verticalExcursion) || 0);
                        }, 0)
                    };
                }
                var primaryRouteMetrics = routePlanMetrics(portRoutePlan);
                function routeMetricsBetter(candidate, incumbent) {
                    if (candidate.crossings !== incumbent.crossings) {
                        return candidate.crossings < incumbent.crossings;
                    }
                    if (candidate.selfIntersections !== incumbent.selfIntersections) {
                        return candidate.selfIntersections < incumbent.selfIntersections;
                    }
                    if (candidate.fallbacks !== incumbent.fallbacks) {
                        return candidate.fallbacks < incumbent.fallbacks;
                    }
                    if (candidate.collisions !== incumbent.collisions) {
                        return candidate.collisions < incumbent.collisions;
                    }
                    return candidate.verticalExcursion < incumbent.verticalExcursion - 0.5;
                }
                if (primaryRouteMetrics.crossings) {
                    var bestRouteEntries = routeEntries;
                    var bestRoutePlan = portRoutePlan;
                    var bestRouteMetrics = primaryRouteMetrics;
                    var alternateOrderModes = spec.map.viewport === 'all'
                        ? ['reverse']
                        : ['geographic'];
                    alternateOrderModes.forEach(function(orderMode) {
                        routeEntries = sortRouteEntries(orderMode);
                        var alternateRoutePlan = planPortRoutes();
                        var alternateRouteMetrics = routePlanMetrics(alternateRoutePlan);
                        if (routeMetricsBetter(alternateRouteMetrics, bestRouteMetrics)) {
                            bestRouteEntries = routeEntries;
                            bestRoutePlan = alternateRoutePlan;
                            bestRouteMetrics = alternateRouteMetrics;
                        }
                    });
                    routeEntries = bestRouteEntries;
                    portRoutePlan = bestRoutePlan;
                }
                var plannedLeaderSegments = portRoutePlan.plannedLeaderSegments;
                var portPlansByIndex = portRoutePlan.portPlansByIndex;
                var portRenderPlan = routedEntries.map(function(entry) {
                    return portPlansByIndex[entry.index];
                });

                var minimumPortGap = routedEntries.length
                    ? Math.min.apply(null, routedEntries.map(function(entry) {
                        return Number(entry.portGap) || 0;
                    }))
                    : 0;
                chartNode.setAttribute('data-map-port-gap', String(Math.round(minimumPortGap * 10) / 10));
                chartNode.setAttribute('data-map-port-order', 'crossing-optimized');
                chartNode.setAttribute('data-map-port-curve-model', 'bounded-tangent-spline');
                var standardPortRoutes = portRenderPlan.filter(function(plan) {
                    return plan.avoidance !== 'near-card' && !plan.adaptiveCardStub;
                });
                var minimumCardStub = standardPortRoutes.length
                    ? Math.min.apply(null, standardPortRoutes.map(function(plan) {
                        return plan.cardStubLength || 0;
                    }))
                    : 0;
                chartNode.setAttribute('data-map-port-min-card-stub', String(Math.round(minimumCardStub * 10) / 10));
                chartNode.setAttribute('data-map-port-near-card-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.avoidance === 'near-card';
                }).length));
                chartNode.setAttribute('data-map-port-adaptive-stub-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.adaptiveCardStub;
                }).length));
                var maximumVerticalExcursion = portRenderPlan.length
                    ? Math.max.apply(null, portRenderPlan.map(function(plan) {
                        return plan.verticalExcursion || 0;
                    }))
                    : 0;
                chartNode.setAttribute(
                    'data-map-port-max-vertical-excursion',
                    String(Math.round(maximumVerticalExcursion * 10) / 10)
                );
                chartNode.setAttribute('data-map-port-directionality', 'strict-envelope-first');
                chartNode.setAttribute('data-map-port-strict-envelope-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.routingEnvelope === 'strict';
                }).length));
                chartNode.setAttribute('data-map-port-expanded-envelope-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.routingEnvelope === 'expanded';
                }).length));
                chartNode.setAttribute('data-map-port-obstacle-avoidance', 'active');
                chartNode.setAttribute('data-map-port-obstacle-count', String(activeObstacles.length));
                chartNode.setAttribute('data-map-port-avoided-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.avoidance === 'above' || plan.avoidance === 'below' || plan.avoidance === 'grid';
                }).length));
                chartNode.setAttribute('data-map-port-grid-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.avoidance === 'grid';
                }).length));
                chartNode.setAttribute('data-map-port-fallback-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.fallback;
                }).length));
                chartNode.setAttribute('data-map-port-final-collisions', String(portRenderPlan.reduce(function(total, plan) {
                    return total + (Number(plan.collisionCount) || 0);
                }, 0)));
                chartNode.setAttribute('data-map-port-source-exit-routes', String(portRenderPlan.filter(function(plan) {
                    return plan.sourceExitUsed;
                }).length));
                chartNode.setAttribute('data-map-port-self-intersections', String(portRenderPlan.filter(function(plan) {
                    return plan.selfIntersection;
                }).length));
                portRenderPlan.forEach(function(plan) {
                    lineLayer.appendChild(svgElement('path', {
                        d: plan.pathData,
                        class: 'tochnyi-map-port-leader-halo',
                        'data-label-group': 'map-item-' + plan.entry.index
                    }));
                });
                var renderedLeaderNodes = [];
                portRenderPlan.forEach(function(plan) {
                    var entry = plan.entry;
                    var leaderNode = svgElement('path', {
                        d: plan.pathData,
                        class: 'tochnyi-map-port-leader',
                        stroke: itemColor(entry.item, range),
                        'data-tochnyi-mark': 'leader-line',
                        'data-label-group': 'map-item-' + entry.index,
                        'data-port-y': String(Math.round(plan.portY * 10) / 10),
                        'data-card-stub-length': String(Math.round((plan.cardStubLength || 0) * 10) / 10),
                        'data-adaptive-card-stub': plan.adaptiveCardStub ? 'true' : 'false',
                        'data-route-vertical-excursion': String(Math.round((plan.verticalExcursion || 0) * 10) / 10),
                        'data-route-envelope': plan.routingEnvelope,
                        'data-route-avoidance': plan.avoidance,
                        'data-route-direct-collisions': String(plan.directCollisionCount || 0),
                        'data-route-final-collisions': String(plan.collisionCount || 0),
                        'data-route-crossings': String(plan.routeCrossings || 0),
                        'data-route-source-exit': plan.sourceExitUsed ? 'true' : 'false',
                        'data-route-fallback': plan.fallback ? 'true' : 'false',
                        'data-route-smooth': plan.smooth ? 'true' : 'false',
                        'data-route-candidate': plan.candidateSource,
                        'data-route-self-intersection': plan.selfIntersection ? 'true' : 'false'
                    });
                    lineLayer.appendChild(leaderNode);
                    renderedLeaderNodes.push(leaderNode);
                });
                chartNode.setAttribute(
                    'data-map-port-rendered-crossings',
                    String(countRenderedLeaderCrossings(renderedLeaderNodes))
                );
                return;
            }

            if (routedEntries.routing === 'indexed') {
                routedEntries.forEach(function(entry) {
                    var badge = entry.card.querySelector('.tochnyi-map-index');
                    if (badge) badge.textContent = String(entry.markerIndex);
                    entry.card.setAttribute('data-map-marker-index', String(entry.markerIndex));
                });

                var markerPlan = global.TochnyiMaps.planIndexedMarkers(routedEntries, {
                    left: canvasRect.left - stageRect.left + 14,
                    right: canvasRect.right - stageRect.left - 14,
                    top: canvasRect.top - stageRect.top + 14,
                    bottom: canvasRect.bottom - stageRect.top - 14,
                    markerRadius: regionalPolicy.markerRadius,
                    minimumDistance: regionalPolicy.markerDistance,
                    candidateStep: regionalPolicy.markerStep
                });
                var movedMarkers = markerPlan.filter(function(entry) { return entry.markerMoved; });
                var maximumDisplacement = markerPlan.length
                    ? Math.max.apply(null, markerPlan.map(function(entry) { return entry.markerDisplacement; }))
                    : 0;
                chartNode.setAttribute('data-map-indexed-marker-count', String(markerPlan.length));
                chartNode.setAttribute('data-map-indexed-marker-links', String(movedMarkers.length));
                chartNode.setAttribute('data-map-indexed-marker-max-shift', String(Math.round(maximumDisplacement * 10) / 10));

                movedMarkers.forEach(function(entry) {
                    lineLayer.appendChild(svgElement('line', {
                        x1: entry.point.x,
                        y1: entry.point.y,
                        x2: entry.markerX,
                        y2: entry.markerY,
                        class: 'tochnyi-map-marker-link-halo',
                        'aria-hidden': 'true'
                    }));
                });
                movedMarkers.forEach(function(entry) {
                    lineLayer.appendChild(svgElement('line', {
                        x1: entry.point.x,
                        y1: entry.point.y,
                        x2: entry.markerX,
                        y2: entry.markerY,
                        class: 'tochnyi-map-marker-link',
                        stroke: itemColor(entry.item, range),
                        'data-tochnyi-mark': 'marker-link',
                        'data-label-group': 'map-item-' + entry.index
                    }));
                });
                markerPlan.forEach(function(entry) {
                    var group = svgElement('g', {
                        class: 'tochnyi-map-index-marker',
                        transform: 'translate(' + entry.markerX + ' ' + entry.markerY + ')',
                        'data-map-marker-index': String(entry.markerIndex),
                        'data-label-group': 'map-item-' + entry.index
                    });
                    group.appendChild(svgElement('circle', {
                        r: entry.markerRadius,
                        fill: itemColor(entry.item, range),
                        'data-tochnyi-mark': 'indexed-marker',
                        'data-label-group': 'map-item-' + entry.index
                    }));
                    var label = svgElement('text', {
                        x: 0,
                        y: 0,
                        'text-anchor': 'middle',
                        'dominant-baseline': 'central',
                        'data-label-role': 'marker-label',
                        'data-label-group': 'map-item-' + entry.index
                    });
                    label.textContent = String(entry.markerIndex);
                    group.appendChild(label);
                    lineLayer.appendChild(group);
                });
                return;
            }

            var routedLaneEntries = routedEntries.filter(function(entry) { return entry.sideCount > 1; });
            if (routedLaneEntries.length) {
                var minimumRouteGap = Math.min.apply(null, routedLaneEntries.map(function(entry) {
                    return Number(entry.routeGap) || 0;
                }));
                chartNode.setAttribute('data-map-leader-route-gap', String(Math.round(minimumRouteGap * 10) / 10));
                chartNode.setAttribute('data-map-leader-fanout', 'true');
            } else {
                chartNode.setAttribute('data-map-leader-route-gap', '0');
                chartNode.setAttribute('data-map-leader-fanout', 'false');
            }

            var leaderRenderPlan = routedEntries.map(function(entry) {
                var cardX = entry.side === 'left'
                    ? regionalPolicy.cardInset + cardWidth
                    : width - regionalPolicy.cardInset - cardWidth;
                var endY = entry.top + Math.min(entry.height / 2, 33);
                var mapEdgeX = entry.side === 'left'
                    ? canvasRect.left - stageRect.left
                    : canvasRect.right - stageRect.left;
                var leaderPath = global.TochnyiMaps.buildOrthogonalLeaderPath(entry, {
                    mapEdgeX: mapEdgeX,
                    cardX: cardX,
                    endY: endY
                });
                return {
                    entry: entry,
                    pathData: leaderPath.path
                };
            });

            leaderRenderPlan.forEach(function(plan) {
                lineLayer.appendChild(svgElement('path', {
                    d: plan.pathData,
                    class: 'tochnyi-map-leader-halo',
                    'data-label-group': 'map-item-' + plan.entry.index
                }));
            });

            leaderRenderPlan.forEach(function(plan) {
                var entry = plan.entry;
                lineLayer.appendChild(svgElement('path', {
                    d: plan.pathData,
                    class: 'tochnyi-map-leader',
                    stroke: itemColor(entry.item, range),
                    'data-tochnyi-mark': 'leader-line',
                    'data-label-group': 'map-item-' + entry.index,
                    'data-route-y': String(Math.round((Number(entry.routeY) || entry.point.y) * 10) / 10)
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
