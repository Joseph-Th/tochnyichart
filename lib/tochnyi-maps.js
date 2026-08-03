(function(root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.TochnyiMaps = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
    'use strict';

    var RUSSIA_REGIONS = [
        ['RU-AD', 'Adygeya'], ['RU-AL', 'Altay'], ['RU-ALT', 'Altay Kray'], ['RU-AMU', 'Amur'],
        ['RU-ARK', 'Arkhangelsk'], ['RU-AST', 'Astrakhan'], ['RU-BA', 'Bashkortostan'], ['RU-BEL', 'Belgorod'],
        ['RU-BRY', 'Bryansk'], ['RU-BU', 'Buryatiya'], ['RU-CE', 'Chechnya'], ['RU-CHE', 'Chelyabinsk'],
        ['RU-CHU', 'Chukotka'], ['RU-CU', 'Chuvash'], ['RU-DA', 'Dagestan'], ['RU-IN', 'Ingushetia'],
        ['RU-IRK', 'Irkutsk'], ['RU-IVA', 'Ivanovo'], ['RU-KB', 'Kabardino-Balkar'], ['RU-KGD', 'Kaliningrad'],
        ['RU-KL', 'Kalmykia'], ['RU-KLU', 'Kaluga'], ['RU-KAM', 'Kamchatka'], ['RU-KC', 'Karachay-Cherkess'],
        ['RU-KR', 'Karelia'], ['RU-KEM', 'Kemerovo'], ['RU-KHA', 'Khabarovsk'], ['RU-KK', 'Khakassia'],
        ['RU-KHM', 'Khanty-Mansiysk'], ['RU-KIR', 'Kirov'], ['RU-KO', 'Komi'], ['RU-KOS', 'Kostroma'],
        ['RU-KDA', 'Krasnodar'], ['RU-KYA', 'Krasnoyarsk'], ['RU-KGN', 'Kurgan'], ['RU-KRS', 'Kursk'],
        ['RU-LEN', 'Leningrad'], ['RU-LIP', 'Lipetsk'], ['RU-MAG', 'Magadan'], ['RU-ME', 'Mariy-El'],
        ['RU-MO', 'Mordovia'], ['RU-MOW', 'Moscow City'], ['RU-MOS', 'Moskva'], ['RU-MUR', 'Murmansk'],
        ['RU-NEN', 'Nenets'], ['RU-NIZ', 'Nizhegorod'], ['RU-SE', 'North Ossetia-Alania'], ['RU-NGR', 'Novgorod'],
        ['RU-NVS', 'Novosibirsk'], ['RU-OMS', 'Omsk'], ['RU-ORE', 'Orenburg'], ['RU-ORL', 'Oryol'],
        ['RU-PNZ', 'Penza'], ['RU-PER', 'Perm'], ['RU-PRI', 'Primorsky'], ['RU-PSK', 'Pskov'],
        ['RU-ROS', 'Rostov'], ['RU-RYA', 'Ryazan'], ['RU-SA', 'Sakha'], ['RU-SAK', 'Sakhalin'],
        ['RU-SAM', 'Samara'], ['RU-SAR', 'Saratov'], ['RU-SMO', 'Smolensk'], ['RU-SPE', 'St. Petersburg'],
        ['RU-STA', 'Stavropol'], ['RU-SVE', 'Sverdlovsk'], ['RU-TAM', 'Tambov'], ['RU-TA', 'Tatarstan'],
        ['RU-TOM', 'Tomsk'], ['RU-TUL', 'Tula'], ['RU-TY', 'Tuva'], ['RU-TVE', 'Tver'],
        ['RU-TYU', 'Tyumen'], ['RU-UD', 'Udmurt'], ['RU-ULY', 'Ulyanovsk'], ['RU-VLA', 'Vladimir'],
        ['RU-VGG', 'Volgograd'], ['RU-VLG', 'Vologda'], ['RU-VOR', 'Voronezh'], ['RU-YAN', 'Yamalo-Nenets'],
        ['RU-YAR', 'Yaroslavl'], ['RU-YEV', 'Yevrey'], ['RU-ZAB', 'Zabaykalsky']
    ];

    function regionMap(entries) {
        return Object.freeze(entries.reduce(function(result, entry) {
            result[entry[0]] = entry[1];
            return result;
        }, {}));
    }

    var visualPolicy = Object.freeze({
        statusColors: Object.freeze({
            stable: '#71808a',
            improving: '#3f727b',
            strained: '#a87436',
            critical: '#a45350',
            blocked: '#66505e',
            unknown: '#73777a'
        }),
        toneColors: Object.freeze({
            primary: '#526f8a',
            secondary: '#88764b',
            warning: '#a87436',
            critical: '#a45350',
            neutral: '#71808a',
            positive: '#3f727b'
        }),
        valueScale: Object.freeze({
            start: Object.freeze([184, 200, 212]),
            end: Object.freeze([78, 105, 126])
        }),
        activeFillOpacity: 0.84,
        inactiveFillOpacity: 0.72
    });

    function itemRegionIds(item) {
        return item && (item.regionIds || (item.regionId ? [item.regionId] : [])) || [];
    }

    function resolveAnchorStyle(map) {
        var requested = map && map.anchorStyle || 'auto';
        if (requested === 'dot') return 'dot';
        return 'none';
    }

    function integerFromDisplayValue(value) {
        var match = String(value === undefined || value === null ? '' : value)
            .replace(/,/g, '')
            .match(/-?\d+/);
        return match ? Number(match[0]) : NaN;
    }

    function statusCount(data, statuses) {
        return (data || []).filter(function(item) {
            return statuses.indexOf(item && item.status) >= 0;
        }).length;
    }

    function factMatchesStatusCount(fact, data) {
        var value = integerFromDisplayValue(fact && fact.value);
        if (!Number.isInteger(value)) return false;
        var label = String(fact && fact.label || '').toLowerCase();
        var statuses = ['stable', 'improving', 'strained', 'critical', 'blocked'].filter(function(status) {
            return label.indexOf(status) >= 0;
        });
        if (!statuses.length) {
            var tone = fact && fact.tone;
            if (tone === 'positive') statuses = ['improving'];
            else if (tone === 'warning') statuses = ['strained'];
            else if (tone === 'critical') statuses = ['critical', 'blocked'];
        }
        return statuses.length > 0 && value === statusCount(data, statuses);
    }

    function resolveSummaryPlan(spec) {
        var map = spec && spec.map || {};
        var requested = map.summaryDisplay || 'auto';
        var hasSummary = Boolean(spec && (spec.primaryMetric || (spec.supportingFacts || []).length));
        if (!hasSummary || requested === 'hide' || map.summaryPosition === 'none') {
            return { show: false, mode: requested, reason: hasSummary ? 'explicitly-hidden' : 'empty' };
        }
        if (requested === 'show') return { show: true, mode: requested, reason: 'explicitly-shown' };

        var data = spec.data || [];
        var dense = data.length >= 8;
        var primaryValue = integerFromDisplayValue(spec.primaryMetric && spec.primaryMetric.value);
        var primaryLabel = String(spec.primaryMetric && spec.primaryMetric.label || '').toLowerCase();
        var primaryIsItemCount = Number.isInteger(primaryValue) && primaryValue === data.length &&
            /region|area|location|site|market|tracked|covered/.test(primaryLabel);
        var facts = spec.supportingFacts || [];
        var factsAreDerivedCounts = facts.length > 0 && facts.every(function(fact) {
            return factMatchesStatusCount(fact, data);
        });
        if (dense && primaryIsItemCount && factsAreDerivedCounts) {
            return {
                show: false,
                mode: requested,
                reason: 'redundant-dense-summary',
                primaryIsItemCount: true,
                factsAreDerivedCounts: true
            };
        }
        return { show: true, mode: requested, reason: 'informative' };
    }

    function resolveCalloutDistribution(map, summaryShown, sideEntries) {
        var requested = map && map.calloutDistribution || 'auto';
        if (requested === 'geographic' || requested === 'balanced') return requested;
        return !summaryShown && (sideEntries || []).length >= 4 ? 'balanced' : 'geographic';
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function resolveLeaderRouting(map, entries) {
        var requested = map && map.leaderRouting || 'auto';
        if (requested === 'direct' || requested === 'lanes') return requested;
        var points = (entries || []).map(function(entry) {
            return entry && entry.point ? Number(entry.point.y) : NaN;
        }).filter(Number.isFinite).sort(function(first, second) { return first - second; });
        if (points.length <= 2) return 'direct';
        var minimumGap = Infinity;
        for (var index = 1; index < points.length; index += 1) {
            minimumGap = Math.min(minimumGap, points[index] - points[index - 1]);
        }
        return points.length >= 4 || minimumGap < 24 ? 'lanes' : 'direct';
    }

    function distributeLeaderLanes(entries) {
        var ordered = (entries || []).slice().sort(function(first, second) {
            return first.point.y - second.point.y;
        });
        ordered.forEach(function(entry, laneIndex) {
            entry.laneIndex = laneIndex;
            entry.sideCount = ordered.length;
        });
        return ordered;
    }

    function planLeaderRoutes(entries, options) {
        var settings = options || {};
        var planned = (entries || []).map(function(entry) {
            var copy = {};
            Object.keys(entry).forEach(function(key) { copy[key] = entry[key]; });
            return copy;
        });
        var routingModes = [];
        ['left', 'right'].forEach(function(side) {
            var sideEntries = planned.filter(function(entry) { return entry.side === side; });
            var sideRouting = resolveLeaderRouting({ leaderRouting: settings.routing || 'auto' }, sideEntries);
            routingModes.push(sideRouting);
            if (sideRouting === 'lanes') {
                distributeLeaderLanes(sideEntries);
            } else {
                sideEntries.sort(function(first, second) { return first.point.y - second.point.y; });
                sideEntries.forEach(function(entry) {
                    entry.laneIndex = 0;
                    entry.sideCount = 1;
                });
            }
        });
        planned.routing = routingModes.indexOf('lanes') >= 0 ? 'lanes' : 'direct';
        return planned;
    }

    function buildOrthogonalLeaderPath(entry, geometry) {
        var settings = geometry || {};
        var point = entry && entry.point || { x: 0, y: 0 };
        var side = entry && entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? 1 : -1;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var endY = Number(settings.endY) || 0;
        var laneIndex = Math.max(0, Number(entry && entry.laneIndex) || 0);
        var sideCount = Math.max(1, Number(entry && entry.sideCount) || 1);
        var approachSpread = Number(settings.approachSpread) || 54;
        var approachSpacing = sideCount > 1 ? Math.min(12, approachSpread / (sideCount - 1)) : 0;
        var desiredApproachX = mapEdgeX + direction * (26 + laneIndex * approachSpacing);
        var minimumStub = Number(settings.minimumStub) || 10;
        var approachX;

        if (side === 'left') {
            var leftMinimum = mapEdgeX + 18;
            var leftMaximum = Number(point.x) - minimumStub;
            approachX = leftMaximum >= leftMinimum
                ? clamp(desiredApproachX, leftMinimum, leftMaximum)
                : (mapEdgeX + Number(point.x)) / 2;
        } else {
            var rightMinimum = Number(point.x) + minimumStub;
            var rightMaximum = mapEdgeX - 18;
            approachX = rightMaximum >= rightMinimum
                ? clamp(desiredApproachX, rightMinimum, rightMaximum)
                : (mapEdgeX + Number(point.x)) / 2;
        }

        return {
            path: [
                'M', point.x, point.y,
                'H', approachX,
                'V', endY,
                'H', cardX
            ].join(' '),
            approachX: approachX,
            endY: endY
        };
    }

    function visitPositions(coordinates, visitor) {
        if (!Array.isArray(coordinates)) return;
        if (
            coordinates.length >= 2 &&
            typeof coordinates[0] === 'number' &&
            typeof coordinates[1] === 'number'
        ) {
            visitor(coordinates[0], coordinates[1]);
            return;
        }
        coordinates.forEach(function(child) { visitPositions(child, visitor); });
    }

    function longitudeInterval(longitudes) {
        if (!longitudes.length) return null;
        var values = longitudes.map(function(longitude) {
            var normalized = longitude % 360;
            return normalized < 0 ? normalized + 360 : normalized;
        }).sort(function(first, second) { return first - second; });
        if (values.length === 1) return { left: values[0], right: values[0], span: 0 };

        var largestGap = -1;
        var gapIndex = 0;
        for (var index = 0; index < values.length; index += 1) {
            var next = index === values.length - 1 ? values[0] + 360 : values[index + 1];
            var gap = next - values[index];
            if (gap > largestGap) {
                largestGap = gap;
                gapIndex = index;
            }
        }

        var startIndex = (gapIndex + 1) % values.length;
        var left = values[startIndex];
        var right = values[gapIndex];
        if (right < left) right += 360;
        var center = (left + right) / 2;
        while (center > 180) {
            left -= 360;
            right -= 360;
            center -= 360;
        }
        while (center <= -180) {
            left += 360;
            right += 360;
            center += 360;
        }
        return { left: left, right: right, span: right - left };
    }

    function geoBounds(features) {
        var longitudes = [];
        var minimumLatitude = Infinity;
        var maximumLatitude = -Infinity;
        (features || []).forEach(function(feature) {
            var geometry = feature && feature.geometry;
            if (!geometry) return;
            visitPositions(geometry.coordinates, function(longitude, latitude) {
                if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
                longitudes.push(longitude);
                minimumLatitude = Math.min(minimumLatitude, latitude);
                maximumLatitude = Math.max(maximumLatitude, latitude);
            });
        });
        var longitude = longitudeInterval(longitudes);
        if (!longitude || !Number.isFinite(minimumLatitude) || !Number.isFinite(maximumLatitude)) return null;
        return {
            left: longitude.left,
            right: longitude.right,
            bottom: minimumLatitude,
            top: maximumLatitude,
            longitudeSpan: longitude.span,
            latitudeSpan: maximumLatitude - minimumLatitude
        };
    }

    function featureId(feature) {
        return feature && (feature.id || feature.properties && feature.properties.id) || '';
    }

    function featurePolygons(feature) {
        var geometry = feature && feature.geometry;
        if (!geometry) return [];
        if (geometry.type === 'Polygon') return [geometry.coordinates];
        if (geometry.type === 'MultiPolygon') return geometry.coordinates || [];
        return [];
    }

    function ringArea(ring) {
        if (!Array.isArray(ring) || ring.length < 3) return 0;
        var reference = Number(ring[0] && ring[0][0]) || 0;
        var previous = ring[ring.length - 1] || [0, 0];
        var previousLongitude = unwrapLongitudeNear(Number(previous[0]) || 0, reference);
        var previousLatitude = Number(previous[1]) || 0;
        var sum = 0;
        ring.forEach(function(coordinate) {
            var longitude = unwrapLongitudeNear(Number(coordinate && coordinate[0]) || 0, reference);
            var latitude = Number(coordinate && coordinate[1]) || 0;
            sum += previousLongitude * latitude - longitude * previousLatitude;
            previousLongitude = longitude;
            previousLatitude = latitude;
        });
        return Math.abs(sum / 2);
    }

    function polygonArea(polygon) {
        if (!Array.isArray(polygon) || !polygon.length) return 0;
        var area = ringArea(polygon[0]);
        for (var index = 1; index < polygon.length; index += 1) area -= ringArea(polygon[index]);
        return Math.max(0, area);
    }

    function boundaryKeys(polygon, precision) {
        var scale = precision || 1000;
        var keys = {};
        (polygon || []).forEach(function(ring) {
            (ring || []).forEach(function(coordinate) {
                var longitude = Number(coordinate && coordinate[0]);
                var latitude = Number(coordinate && coordinate[1]);
                if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
                keys[Math.round(longitude * scale) + ',' + Math.round(latitude * scale)] = true;
            });
        });
        return Object.keys(keys);
    }

    function cloneFeatureWithPolygons(feature, polygons) {
        var geometry = polygons.length === 1
            ? { type: 'Polygon', coordinates: polygons[0] }
            : { type: 'MultiPolygon', coordinates: polygons };
        var clone = {};
        Object.keys(feature || {}).forEach(function(key) {
            if (key !== 'geometry') clone[key] = feature[key];
        });
        clone.geometry = geometry;
        return clone;
    }

    function selectLargestConnectedLandmass(features, options) {
        var settings = options || {};
        var components = [];
        (features || []).forEach(function(feature, featureIndex) {
            featurePolygons(feature).forEach(function(polygon, polygonIndex) {
                components.push({
                    id: components.length,
                    feature: feature,
                    featureIndex: featureIndex,
                    regionId: featureId(feature),
                    polygon: polygon,
                    polygonIndex: polygonIndex,
                    area: polygonArea(polygon)
                });
            });
        });
        if (!components.length) {
            return {
                features: [],
                keptComponentCount: 0,
                removedComponentCount: 0,
                removedRegionIds: []
            };
        }

        var parents = components.map(function(component) { return component.id; });
        function find(id) {
            var current = id;
            while (parents[current] !== current) {
                parents[current] = parents[parents[current]];
                current = parents[current];
            }
            return current;
        }
        function union(first, second) {
            var firstRoot = find(first);
            var secondRoot = find(second);
            if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
        }

        var coordinateIndex = {};
        components.forEach(function(component) {
            boundaryKeys(component.polygon, settings.coordinatePrecision || 1000).forEach(function(key) {
                if (coordinateIndex[key] !== undefined) union(component.id, coordinateIndex[key]);
                else coordinateIndex[key] = component.id;
            });
        });

        var groups = {};
        components.forEach(function(component) {
            var root = find(component.id);
            if (!groups[root]) groups[root] = { root: root, area: 0, componentIds: [] };
            groups[root].area += component.area;
            groups[root].componentIds.push(component.id);
        });
        var largest = Object.keys(groups).map(function(key) { return groups[key]; })
            .sort(function(first, second) { return second.area - first.area; })[0];
        var kept = {};
        (largest && largest.componentIds || []).forEach(function(id) { kept[id] = true; });

        var polygonsByFeature = {};
        components.forEach(function(component) {
            if (!kept[component.id]) return;
            if (!polygonsByFeature[component.featureIndex]) polygonsByFeature[component.featureIndex] = [];
            polygonsByFeature[component.featureIndex].push(component.polygon);
        });
        var selectedFeatures = [];
        var selectedRegionIds = {};
        (features || []).forEach(function(feature, featureIndex) {
            var polygons = polygonsByFeature[featureIndex] || [];
            if (!polygons.length) return;
            selectedFeatures.push(cloneFeatureWithPolygons(feature, polygons));
            selectedRegionIds[featureId(feature)] = true;
        });
        var removedRegionIds = [];
        (features || []).forEach(function(feature) {
            var id = featureId(feature);
            if (id && !selectedRegionIds[id]) removedRegionIds.push(id);
        });
        return {
            features: selectedFeatures,
            keptComponentCount: Object.keys(kept).length,
            removedComponentCount: components.length - Object.keys(kept).length,
            removedRegionIds: removedRegionIds,
            sourceComponentCount: components.length,
            landmassArea: largest ? largest.area : 0
        };
    }

    function resolveLandmassPlan(map, regionSet, data, features) {
        var configuration = map || {};
        var requested = configuration.landmass || 'auto';
        var activeIds = [];
        (data || []).forEach(function(item) {
            itemRegionIds(item).forEach(function(regionId) {
                if (activeIds.indexOf(regionId) === -1) activeIds.push(regionId);
            });
        });
        var continental = selectLargestConnectedLandmass(features, regionSet && regionSet.landmass || {});
        var continentalIds = {};
        continental.features.forEach(function(feature) { continentalIds[featureId(feature)] = true; });
        var removedActiveRegionIds = activeIds.filter(function(regionId) { return !continentalIds[regionId]; });
        var mode = requested;
        var reason = 'explicit';
        if (mode === 'auto') {
            mode = regionSet && regionSet.defaultLandmass || 'all';
            reason = 'region-set-default';
            if (mode === 'continental' && removedActiveRegionIds.length) {
                mode = 'all';
                reason = 'active-detached-region';
            }
        }
        if (mode === 'continental') {
            return {
                mode: mode,
                requested: requested,
                reason: reason,
                features: continental.features,
                removedRegionIds: continental.removedRegionIds,
                removedActiveRegionIds: removedActiveRegionIds,
                keptComponentCount: continental.keptComponentCount,
                removedComponentCount: continental.removedComponentCount,
                sourceComponentCount: continental.sourceComponentCount
            };
        }
        return {
            mode: 'all',
            requested: requested,
            reason: reason,
            features: (features || []).slice(),
            removedRegionIds: [],
            removedActiveRegionIds: [],
            keptComponentCount: continental.sourceComponentCount,
            removedComponentCount: 0,
            sourceComponentCount: continental.sourceComponentCount
        };
    }

    function paddedGeoBounds(bounds, settings) {
        if (!bounds) return null;
        var options = settings || {};
        var longitudeSpan = Math.max(bounds.longitudeSpan || bounds.right - bounds.left, options.minimumLongitudeSpan || 0);
        var latitudeSpan = Math.max(bounds.latitudeSpan || bounds.top - bounds.bottom, options.minimumLatitudeSpan || 0);
        var longitudeCenter = (bounds.left + bounds.right) / 2;
        var latitudeCenter = (bounds.top + bounds.bottom) / 2;
        var longitudePadding = longitudeSpan * (options.longitudePaddingRatio === undefined ? 0.12 : options.longitudePaddingRatio);
        var latitudePadding = latitudeSpan * (options.latitudePaddingRatio === undefined ? 0.22 : options.latitudePaddingRatio);
        var left = longitudeCenter - longitudeSpan / 2 - longitudePadding;
        var right = longitudeCenter + longitudeSpan / 2 + longitudePadding;
        var bottom = Math.max(-84, latitudeCenter - latitudeSpan / 2 - latitudePadding);
        var top = Math.min(84, latitudeCenter + latitudeSpan / 2 + latitudePadding);
        return {
            left: left,
            right: right,
            bottom: bottom,
            top: top,
            longitudeSpan: right - left,
            latitudeSpan: top - bottom
        };
    }

    function unwrapLongitudeNear(value, reference) {
        var result = value;
        while (result - reference > 180) result -= 360;
        while (result - reference < -180) result += 360;
        return result;
    }

    function balanceViewportCenter(viewportBounds, dataBounds, contextBounds, alignment) {
        if (!viewportBounds || !dataBounds || !contextBounds) return viewportBounds;
        var mode = alignment || 'auto';
        if (mode === 'data') return viewportBounds;

        var contextSpan = Math.max(contextBounds.longitudeSpan || 0, 0.0001);
        var dataSpan = Math.max(dataBounds.longitudeSpan || 0, 0.0001);
        var ratio = clamp(dataSpan / contextSpan, 0, 1);
        var influence = Math.min(0.22, 1.5 * ratio * (1 - ratio));
        if (mode === 'context') influence = 1;

        var viewportCenter = (viewportBounds.left + viewportBounds.right) / 2;
        var contextCenter = unwrapLongitudeNear((contextBounds.left + contextBounds.right) / 2, viewportCenter);
        var shift = (contextCenter - viewportCenter) * influence;
        return {
            left: viewportBounds.left + shift,
            right: viewportBounds.right + shift,
            bottom: viewportBounds.bottom,
            top: viewportBounds.top,
            longitudeSpan: viewportBounds.longitudeSpan,
            latitudeSpan: viewportBounds.latitudeSpan,
            centerShiftLongitude: shift,
            alignment: mode === 'auto' ? 'balanced' : mode
        };
    }

    function projectedFeatureBounds(features, convert, viewport) {
        if (typeof convert !== 'function') return null;
        var left = Infinity;
        var right = -Infinity;
        var top = Infinity;
        var bottom = -Infinity;
        var points = 0;
        (features || []).forEach(function(feature) {
            var geometry = feature && feature.geometry;
            if (!geometry) return;
            visitPositions(geometry.coordinates, function(longitude, latitude) {
                var converted = convert({ longitude: longitude, latitude: latitude });
                if (!converted || !Number.isFinite(converted.x) || !Number.isFinite(converted.y)) return;
                left = Math.min(left, converted.x);
                right = Math.max(right, converted.x);
                top = Math.min(top, converted.y);
                bottom = Math.max(bottom, converted.y);
                points += 1;
            });
        });
        if (!points) return null;
        var raw = { left: left, right: right, top: top, bottom: bottom };
        var width = viewport && Number(viewport.width);
        var height = viewport && Number(viewport.height);
        if (Number.isFinite(width)) {
            left = clamp(left, 0, width);
            right = clamp(right, 0, width);
        }
        if (Number.isFinite(height)) {
            top = clamp(top, 0, height);
            bottom = clamp(bottom, 0, height);
        }
        if (right < left || bottom < top) return null;
        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            width: right - left,
            height: bottom - top,
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2,
            raw: raw,
            points: points
        };
    }

    function correctViewportCenter(geoBounds, projectedBounds, viewportWidth, pixelsPerLongitude, options) {
        if (!geoBounds || !projectedBounds || !Number.isFinite(viewportWidth) || !Number.isFinite(pixelsPerLongitude) || pixelsPerLongitude <= 0) {
            return null;
        }
        var settings = options || {};
        var desiredCenter = viewportWidth / 2;
        var pixelShift = desiredCenter - projectedBounds.centerX;
        var tolerance = settings.tolerance === undefined ? 2 : settings.tolerance;
        if (Math.abs(pixelShift) <= tolerance) {
            return {
                geoBounds: geoBounds,
                pixelShift: 0,
                longitudeShift: 0,
                centered: true
            };
        }
        var longitudeSpan = geoBounds.longitudeSpan || geoBounds.right - geoBounds.left;
        var maximumShift = longitudeSpan * (settings.maximumShiftRatio === undefined ? 0.22 : settings.maximumShiftRatio);
        var longitudeShift = clamp(-pixelShift / pixelsPerLongitude, -maximumShift, maximumShift);
        return {
            geoBounds: {
                left: geoBounds.left + longitudeShift,
                right: geoBounds.right + longitudeShift,
                bottom: geoBounds.bottom,
                top: geoBounds.top,
                longitudeSpan: longitudeSpan,
                latitudeSpan: geoBounds.latitudeSpan || geoBounds.top - geoBounds.bottom
            },
            pixelShift: pixelShift,
            longitudeShift: longitudeShift,
            centered: false
        };
    }

    function resolveVisualOffset(projectedBounds, viewport, options) {
        var width = viewport && Number(viewport.width);
        var height = viewport && Number(viewport.height);
        if (!projectedBounds || !Number.isFinite(width) || !Number.isFinite(height)) return null;
        var settings = options || {};
        var toleranceX = settings.toleranceX === undefined
            ? (settings.tolerance === undefined ? 2 : settings.tolerance)
            : settings.toleranceX;
        var toleranceY = settings.toleranceY === undefined
            ? (settings.tolerance === undefined ? 2 : settings.tolerance)
            : settings.toleranceY;
        var rawX = width / 2 - projectedBounds.centerX;
        var rawY = height / 2 - projectedBounds.centerY;
        var maximumX = width * (settings.maximumXRatio === undefined ? 0.22 : settings.maximumXRatio);
        var maximumY = height * (settings.maximumYRatio === undefined ? 0.35 : settings.maximumYRatio);
        var x = Math.abs(rawX) <= toleranceX ? 0 : clamp(rawX, -maximumX, maximumX);
        var y = Math.abs(rawY) <= toleranceY ? 0 : clamp(rawY, -maximumY, maximumY);
        var hardBounds = settings.hardBounds;
        var padding = settings.padding === undefined ? 4 : Math.max(0, settings.padding);
        var constrainedX = false;
        var constrainedY = false;
        var hardOverflowX = false;
        var hardOverflowY = false;
        if (hardBounds) {
            var minimumX = padding - hardBounds.left;
            var maximumSafeX = width - padding - hardBounds.right;
            var minimumY = padding - hardBounds.top;
            var maximumSafeY = height - padding - hardBounds.bottom;
            if (minimumX <= maximumSafeX) {
                var safeX = clamp(x, minimumX, maximumSafeX);
                constrainedX = safeX !== x;
                x = safeX;
            } else {
                hardOverflowX = true;
                x = 0;
            }
            if (minimumY <= maximumSafeY) {
                var safeY = clamp(y, minimumY, maximumSafeY);
                constrainedY = safeY !== y;
                y = safeY;
            } else {
                hardOverflowY = true;
                y = 0;
            }
        }
        return {
            x: x,
            y: y,
            rawX: rawX,
            rawY: rawY,
            centered: x === 0 && y === 0,
            constrainedX: constrainedX,
            constrainedY: constrainedY,
            hardOverflowX: hardOverflowX,
            hardOverflowY: hardOverflowY
        };
    }

    function expandGeoBoundsForProjectedOverflow(geoBounds, projectedBounds, viewport, options) {
        var width = viewport && Number(viewport.width);
        var height = viewport && Number(viewport.height);
        if (!geoBounds || !projectedBounds || !Number.isFinite(width) || !Number.isFinite(height)) return null;
        var settings = options || {};
        var padding = settings.padding === undefined ? 6 : Math.max(0, settings.padding);
        var availableWidth = Math.max(1, width - padding * 2);
        var availableHeight = Math.max(1, height - padding * 2);
        var projectedWidth = Math.max(0, projectedBounds.right - projectedBounds.left);
        var projectedHeight = Math.max(0, projectedBounds.bottom - projectedBounds.top);
        var requiredScale = Math.max(1, projectedWidth / availableWidth, projectedHeight / availableHeight);
        var tolerance = settings.tolerance === undefined ? 0.012 : settings.tolerance;
        if (requiredScale <= 1 + tolerance) {
            return { geoBounds: geoBounds, scale: 1, requiresRefit: false };
        }
        var safetyScale = requiredScale * (settings.safetyRatio === undefined ? 1.025 : settings.safetyRatio);
        var longitudeSpan = (geoBounds.longitudeSpan || geoBounds.right - geoBounds.left) * safetyScale;
        var latitudeSpan = (geoBounds.latitudeSpan || geoBounds.top - geoBounds.bottom) * safetyScale;
        var longitudeCenter = (geoBounds.left + geoBounds.right) / 2;
        var latitudeCenter = (geoBounds.bottom + geoBounds.top) / 2;
        var bottom = latitudeCenter - latitudeSpan / 2;
        var top = latitudeCenter + latitudeSpan / 2;
        if (bottom < -84) {
            top += -84 - bottom;
            bottom = -84;
        }
        if (top > 84) {
            bottom -= top - 84;
            top = 84;
        }
        bottom = Math.max(-84, bottom);
        top = Math.min(84, top);
        return {
            geoBounds: {
                left: longitudeCenter - longitudeSpan / 2,
                right: longitudeCenter + longitudeSpan / 2,
                bottom: bottom,
                top: top,
                longitudeSpan: longitudeSpan,
                latitudeSpan: top - bottom
            },
            scale: safetyScale,
            requiresRefit: true
        };
    }

    function alignBoundsToReference(bounds, reference) {
        if (!bounds || !reference) return bounds;
        var result = {
            left: bounds.left,
            right: bounds.right,
            bottom: bounds.bottom,
            top: bounds.top,
            longitudeSpan: bounds.longitudeSpan || bounds.right - bounds.left,
            latitudeSpan: bounds.latitudeSpan || bounds.top - bounds.bottom
        };
        var referenceCenter = (reference.left + reference.right) / 2;
        var center = (result.left + result.right) / 2;
        while (center - referenceCenter > 180) {
            result.left -= 360;
            result.right -= 360;
            center -= 360;
        }
        while (center - referenceCenter < -180) {
            result.left += 360;
            result.right += 360;
            center += 360;
        }
        return result;
    }

    function boundsFullyInside(bounds, viewport, tolerance) {
        if (!bounds || !viewport) return false;
        var aligned = alignBoundsToReference(bounds, viewport);
        var epsilon = tolerance === undefined ? 0.05 : tolerance;
        return aligned.left >= viewport.left - epsilon && aligned.right <= viewport.right + epsilon &&
            aligned.bottom >= viewport.bottom - epsilon && aligned.top <= viewport.top + epsilon;
    }

    function normalizeLongitude(value) {
        var result = value;
        while (result > 180) result -= 360;
        while (result < -180) result += 360;
        return result;
    }

    function rendererGeoBounds(bounds) {
        if (!bounds) return bounds;
        var longitudeSpan = bounds.longitudeSpan || bounds.right - bounds.left;
        if (longitudeSpan >= 359.5) {
            return { left: -180, right: 180, bottom: bounds.bottom, top: bounds.top };
        }
        return {
            left: normalizeLongitude(bounds.left),
            right: normalizeLongitude(bounds.right),
            bottom: bounds.bottom,
            top: bounds.top
        };
    }

    function mercatorY(latitude) {
        var clamped = clamp(latitude, -84, 84) * Math.PI / 180;
        return -Math.log(Math.tan(Math.PI / 4 + clamped / 2));
    }

    function buildStaticProjection(features, viewport, options) {
        var width = viewport && Number(viewport.width);
        var height = viewport && Number(viewport.height);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
        var settings = options || {};
        var bounds = geoBounds(features || []);
        if (!bounds) return null;
        var centerLongitude = Number.isFinite(settings.centerLongitude)
            ? settings.centerLongitude
            : (bounds.left + bounds.right) / 2;
        var paddingX = settings.paddingX === undefined
            ? (settings.padding === undefined ? 8 : settings.padding)
            : settings.paddingX;
        var paddingY = settings.paddingY === undefined
            ? (settings.padding === undefined ? 8 : settings.padding)
            : settings.paddingY;
        paddingX = clamp(Number(paddingX) || 0, 0, width / 3);
        paddingY = clamp(Number(paddingY) || 0, 0, height / 3);

        var minimumX = Infinity;
        var maximumX = -Infinity;
        var minimumY = Infinity;
        var maximumY = -Infinity;
        (features || []).forEach(function(feature) {
            if (!feature || !feature.geometry) return;
            visitPositions(feature.geometry.coordinates, function(longitude, latitude) {
                var x = unwrapLongitudeNear(longitude, centerLongitude) * Math.PI / 180;
                var y = mercatorY(latitude);
                minimumX = Math.min(minimumX, x);
                maximumX = Math.max(maximumX, x);
                minimumY = Math.min(minimumY, y);
                maximumY = Math.max(maximumY, y);
            });
        });
        if (![minimumX, maximumX, minimumY, maximumY].every(Number.isFinite)) return null;
        var spanX = Math.max(maximumX - minimumX, 0.000001);
        var spanY = Math.max(maximumY - minimumY, 0.000001);
        var scale = Math.min(
            Math.max(1, width - paddingX * 2) / spanX,
            Math.max(1, height - paddingY * 2) / spanY
        );
        var projectedWidth = spanX * scale;
        var projectedHeight = spanY * scale;
        var offsetX = (width - projectedWidth) / 2 - minimumX * scale;
        var offsetY = (height - projectedHeight) / 2 - minimumY * scale;

        function project(point) {
            if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) return null;
            var x = unwrapLongitudeNear(point.longitude, centerLongitude) * Math.PI / 180;
            var y = mercatorY(point.latitude);
            return { x: x * scale + offsetX, y: y * scale + offsetY };
        }

        function path(feature) {
            var geometry = feature && feature.geometry;
            if (!geometry) return '';
            var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] :
                geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
            var commands = [];
            (polygons || []).forEach(function(polygon) {
                (polygon || []).forEach(function(ring) {
                    var ringCommands = [];
                    (ring || []).forEach(function(coordinate, index) {
                        var point = project({ longitude: coordinate[0], latitude: coordinate[1] });
                        if (!point) return;
                        ringCommands.push((index === 0 ? 'M ' : 'L ') +
                            Math.round(point.x * 100) / 100 + ' ' + Math.round(point.y * 100) / 100);
                    });
                    if (ringCommands.length) commands.push(ringCommands.join(' ') + ' Z');
                });
            });
            return commands.join(' ');
        }

        return {
            project: project,
            path: path,
            centerLongitude: centerLongitude,
            scale: scale,
            sourceBounds: bounds,
            renderedBounds: {
                left: minimumX * scale + offsetX,
                right: maximumX * scale + offsetX,
                top: minimumY * scale + offsetY,
                bottom: maximumY * scale + offsetY,
                width: projectedWidth,
                height: projectedHeight,
                centerX: width / 2,
                centerY: height / 2
            }
        };
    }

    function resolveContextFit(map, dataBounds, contextBounds, activeCount, regionSet) {
        var requested = map && map.contextFit || 'auto';
        if (requested === 'all' || requested === 'focus') return requested;
        if (!dataBounds || !contextBounds) return 'focus';
        var longitudeCoverage = dataBounds.longitudeSpan / Math.max(contextBounds.longitudeSpan, 0.0001);
        var latitudeCoverage = dataBounds.latitudeSpan / Math.max(contextBounds.latitudeSpan, 0.0001);
        var minimumRegions = regionSet.autoContextFitMinRegions === undefined ? 8 : regionSet.autoContextFitMinRegions;
        var minimumLongitudeCoverage = regionSet.autoContextFitMinLongitudeCoverage === undefined
            ? 0.48
            : regionSet.autoContextFitMinLongitudeCoverage;
        return activeCount >= minimumRegions || longitudeCoverage >= minimumLongitudeCoverage ||
            longitudeCoverage >= 0.38 && latitudeCoverage >= 0.45
            ? 'all'
            : 'focus';
    }

    function visualBoundsFromAxisWeights(weights, viewportSize, trimRatio) {
        var values = Array.isArray(weights) ? weights : [];
        var total = values.reduce(function(sum, value) {
            return sum + (Number.isFinite(value) && value > 0 ? value : 0);
        }, 0);
        if (!values.length || !total || !Number.isFinite(viewportSize) || viewportSize <= 0) return null;
        var trim = clamp(trimRatio === undefined ? 0.005 : trimRatio, 0, 0.2);
        var startTarget = total * trim;
        var endTarget = total * trim;
        var cumulative = 0;
        var startIndex = 0;
        var endIndex = values.length - 1;
        for (var index = 0; index < values.length; index += 1) {
            cumulative += Math.max(0, Number(values[index]) || 0);
            if (cumulative >= startTarget) {
                startIndex = index;
                break;
            }
        }
        cumulative = 0;
        for (var reverse = values.length - 1; reverse >= 0; reverse -= 1) {
            cumulative += Math.max(0, Number(values[reverse]) || 0);
            if (cumulative >= endTarget) {
                endIndex = reverse;
                break;
            }
        }
        var start = startIndex / values.length * viewportSize;
        var end = (endIndex + 1) / values.length * viewportSize;
        return {
            start: start,
            end: end,
            size: end - start,
            center: (start + end) / 2,
            totalWeight: total,
            startIndex: startIndex,
            endIndex: endIndex,
            trimRatio: trim
        };
    }

    function visualBoundsFromColumnWeights(weights, viewportWidth, trimRatio) {
        var axis = visualBoundsFromAxisWeights(weights, viewportWidth, trimRatio);
        if (!axis) return null;
        return {
            left: axis.start,
            right: axis.end,
            width: axis.size,
            centerX: axis.center,
            totalWeight: axis.totalWeight,
            leftIndex: axis.startIndex,
            rightIndex: axis.endIndex,
            trimRatio: axis.trimRatio
        };
    }

    function visualBoundsFromRasterWeights(columnWeights, rowWeights, viewportWidth, viewportHeight, trimRatio) {
        var horizontal = visualBoundsFromAxisWeights(columnWeights, viewportWidth, trimRatio);
        var vertical = visualBoundsFromAxisWeights(rowWeights, viewportHeight, trimRatio);
        if (!horizontal || !vertical) return null;
        return {
            left: horizontal.start,
            right: horizontal.end,
            top: vertical.start,
            bottom: vertical.end,
            width: horizontal.size,
            height: vertical.size,
            centerX: horizontal.center,
            centerY: vertical.center,
            horizontal: horizontal,
            vertical: vertical
        };
    }

    function resolveMapPlan(map, regionSet, data, featureById) {
        var configuration = map || {};
        var activeIds = [];
        (data || []).forEach(function(item) {
            itemRegionIds(item).forEach(function(regionId) {
                if (activeIds.indexOf(regionId) === -1) activeIds.push(regionId);
            });
        });

        var exclusions = (configuration.excludeRegions || []).slice();
        if ((configuration.viewport || 'auto') !== 'all') {
            (regionSet.detachedRegionIds || []).forEach(function(regionId) {
                if (activeIds.indexOf(regionId) === -1 && exclusions.indexOf(regionId) === -1) exclusions.push(regionId);
            });
        }

        var features = activeIds
            .filter(function(regionId) { return exclusions.indexOf(regionId) === -1; })
            .map(function(regionId) { return featureById[regionId]; })
            .filter(Boolean);
        var rawBounds = geoBounds(features);
        var contextFeatures = Object.keys(featureById || {})
            .filter(function(regionId) { return exclusions.indexOf(regionId) === -1; })
            .map(function(regionId) { return featureById[regionId]; })
            .filter(Boolean);
        var contextBounds = geoBounds(contextFeatures);
        var requestedViewport = configuration.viewport || 'auto';
        var viewportMode = requestedViewport;
        if (viewportMode === 'auto') {
            var maximumSpan = regionSet.autoDataViewportMaxLongitudeSpan || 140;
            viewportMode = rawBounds && rawBounds.longitudeSpan <= maximumSpan ? 'data' : 'all';
        }
        var viewportSettings = regionSet.viewport || {};
        var requestedAlignment = configuration.viewportAlignment || 'auto';
        var contextFit = resolveContextFit(configuration, rawBounds, contextBounds, activeIds.length, regionSet);
        var paddedBounds = viewportMode === 'data' ? paddedGeoBounds(rawBounds, viewportSettings) : null;
        if (viewportMode === 'data' && contextFit === 'all') {
            paddedBounds = paddedGeoBounds(contextBounds, regionSet.contextViewport || {
                minimumLongitudeSpan: viewportSettings.minimumLongitudeSpan,
                minimumLatitudeSpan: viewportSettings.minimumLatitudeSpan,
                longitudePaddingRatio: 0.025,
                latitudePaddingRatio: 0.06
            });
        }
        var alignedBounds = viewportMode === 'data' && requestedAlignment === 'context'
            ? balanceViewportCenter(paddedBounds, rawBounds, contextBounds, 'context')
            : paddedBounds;
        if (viewportMode === 'data' && contextFit === 'focus' && alignedBounds) {
            Object.keys(featureById || {}).forEach(function(regionId) {
                if (activeIds.indexOf(regionId) >= 0 || exclusions.indexOf(regionId) >= 0) return;
                if (!boundsFullyInside(geoBounds([featureById[regionId]]), alignedBounds)) exclusions.push(regionId);
            });
        }
        return {
            activeRegionIds: activeIds,
            excludedRegionIds: exclusions,
            viewportMode: viewportMode,
            viewportAlignment: requestedAlignment,
            contextFit: contextFit,
            visualCentering: viewportMode === 'data' && requestedAlignment === 'auto',
            centerShiftLongitude: alignedBounds && alignedBounds.centerShiftLongitude || 0,
            centerShiftLatitude: 0,
            contextRegionIds: Object.keys(featureById || {}).filter(function(regionId) {
                return exclusions.indexOf(regionId) === -1;
            }),
            geoBounds: alignedBounds
        };
    }

    var baseRegions = regionMap(RUSSIA_REGIONS);
    var sets = Object.freeze({
        russia: Object.freeze({
            id: 'russia',
            label: 'Russia regions',
            geodataScript: 'https://cdn.amcharts.com/lib/5/geodata/russiaLow.js',
            geodataGlobal: 'am5geodata_russiaLow',
            detachedRegionIds: Object.freeze(['RU-KGD']),
            defaultLandmass: 'continental',
            landmass: Object.freeze({ coordinatePrecision: 1000 }),
            autoDataViewportMaxLongitudeSpan: 140,
            autoContextFitMinRegions: 8,
            autoContextFitMinLongitudeCoverage: 0.48,
            viewport: Object.freeze({
                minimumLongitudeSpan: 28,
                minimumLatitudeSpan: 16,
                longitudePaddingRatio: 0.1,
                latitudePaddingRatio: 0.2
            }),
            regions: baseRegions
        })
    });

    function getRegionSet(id) {
        return sets[id] || null;
    }

    function listRegionSets() {
        return Object.keys(sets).map(function(id) {
            var set = sets[id];
            return {
                id: set.id,
                label: set.label,
                detachedRegionIds: (set.detachedRegionIds || []).slice(),
                defaultLandmass: set.defaultLandmass || 'all',
                regions: Object.keys(set.regions).map(function(regionId) {
                    return { id: regionId, name: set.regions[regionId] };
                })
            };
        });
    }

    return {
        getRegionSet: getRegionSet,
        listRegionSets: listRegionSets,
        geoBounds: geoBounds,
        paddedGeoBounds: paddedGeoBounds,
        balanceViewportCenter: balanceViewportCenter,
        projectedFeatureBounds: projectedFeatureBounds,
        correctViewportCenter: correctViewportCenter,
        resolveVisualOffset: resolveVisualOffset,
        expandGeoBoundsForProjectedOverflow: expandGeoBoundsForProjectedOverflow,
        boundsFullyInside: boundsFullyInside,
        rendererGeoBounds: rendererGeoBounds,
        buildStaticProjection: buildStaticProjection,
        selectLargestConnectedLandmass: selectLargestConnectedLandmass,
        resolveLandmassPlan: resolveLandmassPlan,
        resolveContextFit: resolveContextFit,
        visualBoundsFromAxisWeights: visualBoundsFromAxisWeights,
        visualBoundsFromColumnWeights: visualBoundsFromColumnWeights,
        visualBoundsFromRasterWeights: visualBoundsFromRasterWeights,
        resolveMapPlan: resolveMapPlan,
        resolveAnchorStyle: resolveAnchorStyle,
        resolveSummaryPlan: resolveSummaryPlan,
        resolveCalloutDistribution: resolveCalloutDistribution,
        resolveLeaderRouting: resolveLeaderRouting,
        distributeLeaderLanes: distributeLeaderLanes,
        planLeaderRoutes: planLeaderRoutes,
        buildOrthogonalLeaderPath: buildOrthogonalLeaderPath,
        visualPolicy: visualPolicy,
        regionSetIds: Object.freeze(Object.keys(sets))
    };
});
