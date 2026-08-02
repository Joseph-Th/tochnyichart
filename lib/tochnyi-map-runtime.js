(function(global) {
    'use strict';

    var STATUS_LABELS = {
        stable: 'Stable', improving: 'Improving', strained: 'Strained',
        critical: 'Critical', blocked: 'Blocked', unknown: 'Unknown'
    };
    var STATUS_COLORS = {
        stable: '#71808b', improving: '#008844', strained: '#d97706',
        critical: '#cc0000', blocked: '#7f0000', unknown: '#666666'
    };
    var TONE_COLORS = {
        primary: '#005bbb', secondary: '#cc9900', warning: '#d97706',
        critical: '#cc0000', neutral: '#666666', positive: '#008844'
    };

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
            var start = [143, 188, 226];
            var end = [0, 61, 122];
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
        if (!global.am5map) throw new Error('AMCharts map module did not load.');
        if (!global.TochnyiMaps) throw new Error('Tochnyi map registry did not load.');
        var regionSet = global.TochnyiMaps.getRegionSet(spec.map.regionSet);
        if (!regionSet) throw new Error('Unknown map region set: ' + spec.map.regionSet);
        var geodata = global[regionSet.geodataGlobal];
        if (!geodata) throw new Error('Map geodata did not load: ' + regionSet.geodataGlobal);

        chartNode.classList.add('tochnyi-map-stage');
        if (spec.data.length > 8) chartNode.classList.add('is-dense');
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
        var summary = spec.map.summaryPosition === 'none' ? null : buildSummary(spec);
        if (summary) chartNode.appendChild(summary);
        var legend = buildLegend(spec);
        if (legend) chartNode.appendChild(legend);

        var root = global.Tochnyi.createRoot(mapCanvas.id);
        var chart = root.container.children.push(am5map.MapChart.new(root, {
            panX: 'none', panY: 'none', wheelX: 'none', wheelY: 'none', pinchZoom: false,
            projection: am5map.geoMercator(), paddingLeft: 8, paddingRight: 8, paddingTop: 8, paddingBottom: 8
        }));
        var polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, { geoJSON: geodata }));
        polygonSeries.mapPolygons.template.setAll({
            fill: am5.color(0xd9e1e6), stroke: am5.color(0xffffff), strokeWidth: 0.8,
            tooltipText: '{name}', interactive: true
        });
        polygonSeries.mapPolygons.template.states.create('hover', { fill: am5.color(0xa9bac7) });

        var byRegion = {};
        spec.data.forEach(function(item, index) {
            itemRegionIds(item).forEach(function(regionId) {
                byRegion[regionId] = { item: item, itemIndex: index, color: itemColor(item, range) };
            });
        });
        polygonSeries.mapPolygons.template.adapters.add('fill', function(fill, target) {
            var id = target.dataItem && target.dataItem.get('id');
            return byRegion[id] ? am5.color(byRegion[id].color) : fill;
        });
        polygonSeries.mapPolygons.template.adapters.add('stroke', function(stroke, target) {
            var id = target.dataItem && target.dataItem.get('id');
            return byRegion[id] ? am5.color(0xffffff) : stroke;
        });
        polygonSeries.mapPolygons.template.adapters.add('tooltipText', function(text, target) {
            var id = target.dataItem && target.dataItem.get('id');
            var match = byRegion[id];
            if (!match) return '{name}';
            return match.item.label + (match.item.displayValue ? ': ' + match.item.displayValue : '');
        });

        var featureById = {};
        geodata.features.forEach(function(feature) { featureById[feature.id || feature.properties.id] = feature; });
        var centroids = spec.data.map(function(item) {
            return featureCentroid(featureById[itemRegionIds(item)[0]]);
        });

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
                var converted = chart.convert(centroids[index]);
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
            sides.left.concat(sides.right).forEach(function(entry) {
                var cardX = entry.side === 'left' ? 10 + cardWidth : width - 10 - cardWidth;
                var endY = entry.top + Math.min(entry.height / 2, 33);
                var elbowX = entry.side === 'left' ? cardX + 16 : cardX - 16;
                var points = [
                    entry.point.x + ',' + entry.point.y,
                    elbowX + ',' + entry.point.y,
                    elbowX + ',' + endY,
                    cardX + ',' + endY
                ].join(' ');
                lineLayer.appendChild(svgElement('polyline', {
                    points: points, class: 'tochnyi-map-leader',
                    'data-tochnyi-mark': 'leader-line', 'data-label-group': 'map-item-' + entry.index
                }));
                lineLayer.appendChild(svgElement('circle', {
                    cx: entry.point.x, cy: entry.point.y, r: 4.5, class: 'tochnyi-map-anchor',
                    fill: itemColor(entry.item, range), 'data-tochnyi-mark': 'map-anchor',
                    'data-label-group': 'map-item-' + entry.index
                }));
            });
        }

        polygonSeries.events.on('datavalidated', function() {
            chart.goHome(0);
            setTimeout(layout, 50);
            setTimeout(layout, 180);
            setTimeout(layout, 500);
        });
        global.addEventListener('resize', layout);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
        chart.appear(spec.options.animate === false ? 0 : 500, 0);
        polygonSeries.appear(spec.options.animate === false ? 0 : 500);
    }

    global.TochnyiMapRuntime = { render: render, featureCentroid: featureCentroid };
})(window);
