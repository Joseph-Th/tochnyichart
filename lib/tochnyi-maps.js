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
        inactiveFill: '#c3cbd0',
        activeFillOpacity: 0.84,
        inactiveFillOpacity: 0.72
    });

    // Regional maps are permanently north-up. Keep this as a public invariant
    // so projection callers cannot accidentally reintroduce a bearing or tilt.
    var mapOrientation = Object.freeze({
        rotation: 0,
        bearing: 0,
        pitch: 0,
        tilt: 0
    });

    var regionalBreakdownPolicy = Object.freeze({
        // Port routing is reserved for genuinely dense maps. Medium regional
        // sets are clearer with one direct smooth spline per callout; switching
        // to port routing too early creates needless hooks and long detours.
        portRoutingThreshold: 9,
        denseThreshold: 9,
        cardInset: 10,
        cardWidthDense: 190,
        cardWidthStandard: 204,
        cardGapDense: 7,
        cardGapStandard: 10,
        attachmentInsetDense: 14,
        attachmentInsetStandard: 16,
        portGapDense: 18,
        portGapStandard: 22,
        minimumCardStubDense: 16,
        minimumCardStubStandard: 18,
        leaderClearanceDense: 16,
        leaderClearanceStandard: 14,
        shapeClearanceDense: 2,
        shapeClearanceStandard: 8,
        markerRadiusDense: 11,
        markerRadiusStandard: 12,
        markerDistanceDense: 28,
        markerDistanceStandard: 30,
        markerStepDense: 24,
        markerStepStandard: 26,
        portOffset: 10,
        routeInset: 2,
        routeVerticalInset: 20,
        routeBottomInset: 8,
        samplesPerSegment: 36,
        summaryRightGap: 22,
        summaryBelowGap: 18,
        legendGap: 8,
        stageInset: 10,
        calloutBottomInset: 22
    });

    var regionalMapDefaults = Object.freeze({
        regionSet: 'russia',
        callouts: 'auto',
        calloutDistribution: 'auto',
        summaryPosition: 'none',
        summaryDisplay: 'hide',
        viewport: 'all',
        viewportAlignment: 'context',
        contextFit: 'all',
        landmass: 'continental',
        anchorStyle: 'auto',
        leaderRouting: 'auto',
        excludeRegions: Object.freeze([])
    });

    function getRegionalBreakdownPolicy(options) {
        var settings = options || {};
        var count = Math.max(0, Number(settings.count) || 0);
        var dense = settings.dense === undefined
            ? count >= regionalBreakdownPolicy.denseThreshold
            : Boolean(settings.dense);
        return {
            dense: dense,
            portRoutingThreshold: regionalBreakdownPolicy.portRoutingThreshold,
            cardInset: regionalBreakdownPolicy.cardInset,
            cardWidth: dense
                ? regionalBreakdownPolicy.cardWidthDense
                : regionalBreakdownPolicy.cardWidthStandard,
            cardGap: dense
                ? regionalBreakdownPolicy.cardGapDense
                : regionalBreakdownPolicy.cardGapStandard,
            attachmentInset: dense
                ? regionalBreakdownPolicy.attachmentInsetDense
                : regionalBreakdownPolicy.attachmentInsetStandard,
            portGap: dense
                ? regionalBreakdownPolicy.portGapDense
                : regionalBreakdownPolicy.portGapStandard,
            minimumCardStub: dense
                ? regionalBreakdownPolicy.minimumCardStubDense
                : regionalBreakdownPolicy.minimumCardStubStandard,
            leaderClearance: dense
                ? regionalBreakdownPolicy.leaderClearanceDense
                : regionalBreakdownPolicy.leaderClearanceStandard,
            shapeClearance: dense
                ? regionalBreakdownPolicy.shapeClearanceDense
                : regionalBreakdownPolicy.shapeClearanceStandard,
            markerRadius: dense
                ? regionalBreakdownPolicy.markerRadiusDense
                : regionalBreakdownPolicy.markerRadiusStandard,
            markerDistance: dense
                ? regionalBreakdownPolicy.markerDistanceDense
                : regionalBreakdownPolicy.markerDistanceStandard,
            markerStep: dense
                ? regionalBreakdownPolicy.markerStepDense
                : regionalBreakdownPolicy.markerStepStandard,
            portOffset: regionalBreakdownPolicy.portOffset,
            routeInset: regionalBreakdownPolicy.routeInset,
            routeVerticalInset: regionalBreakdownPolicy.routeVerticalInset,
            routeBottomInset: regionalBreakdownPolicy.routeBottomInset,
            samplesPerSegment: regionalBreakdownPolicy.samplesPerSegment,
            summaryRightGap: regionalBreakdownPolicy.summaryRightGap,
            summaryBelowGap: regionalBreakdownPolicy.summaryBelowGap,
            legendGap: regionalBreakdownPolicy.legendGap,
            stageInset: regionalBreakdownPolicy.stageInset,
            calloutBottomInset: regionalBreakdownPolicy.calloutBottomInset
        };
    }

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
        var hasSummary = Boolean(spec && (spec.primaryMetric || (spec.supportingFacts || []).length));
        return {
            show: false,
            mode: 'hide',
            reason: hasSummary ? 'regional-summary-disabled' : 'empty'
        };
    }

    function resolveCalloutDistribution(map, summaryShown, sideEntries) {
        var requested = map && map.calloutDistribution || 'auto';
        if (requested === 'geographic' || requested === 'balanced') return requested;
        return 'geographic';
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function resolveLeaderRouting(map, entries, options) {
        var requested = map && map.leaderRouting || 'auto';
        if (
            requested === 'direct' ||
            requested === 'lanes' ||
            requested === 'ports' ||
            requested === 'indexed'
        ) return requested;
        var ordered = (entries || []).slice().sort(function(first, second) {
            return Number(first.point && first.point.y) - Number(second.point && second.point.y);
        });
        if (ordered.length >= 2) {
            var settings = options || {};
            var preferredGap = Math.max(14, Number(settings.gap) || 18);
            var closePairCount = 0;
            for (var index = 1; index < ordered.length; index += 1) {
                var sourceGap = Math.abs(
                    Number(ordered[index].point && ordered[index].point.y) -
                    Number(ordered[index - 1].point && ordered[index - 1].point.y)
                );
                var endGap = Math.abs(
                    Number(ordered[index].endY) - Number(ordered[index - 1].endY)
                );
                if (sourceGap < preferredGap * 1.25 ||
                    Number.isFinite(endGap) && endGap < preferredGap * 0.75) {
                    closePairCount += 1;
                }
            }
            if (closePairCount > 0) return 'lanes';
        }
        return 'direct';
    }

    function distributeLeaderLanes(entries, options) {
        var settings = options || {};
        var ordered = (entries || []).slice().sort(function(first, second) {
            return first.point.y - second.point.y;
        });
        var top = Number.isFinite(Number(settings.top)) ? Number(settings.top) : -Infinity;
        var bottom = Number.isFinite(Number(settings.bottom)) ? Number(settings.bottom) : Infinity;
        var requestedGap = Math.max(14, Number(settings.gap) || 18);
        var available = Number.isFinite(top) && Number.isFinite(bottom)
            ? Math.max(0, bottom - top)
            : Infinity;
        var laneGap = ordered.length > 1 && Number.isFinite(available)
            ? Math.min(requestedGap, available / (ordered.length - 1))
            : requestedGap;
        var desired = ordered.map(function(entry) {
            return clamp(Number(entry.point.y) || 0, top, bottom);
        });
        var routed = desired.slice();

        for (var index = 1; index < routed.length; index += 1) {
            routed[index] = Math.max(routed[index], routed[index - 1] + laneGap);
        }

        if (routed.length > 1) {
            var averageOffset = routed.reduce(function(sum, value, routeIndex) {
                return sum + value - desired[routeIndex];
            }, 0) / routed.length;
            var minimumShift = Number.isFinite(top) ? top - routed[0] : -Infinity;
            var maximumShift = Number.isFinite(bottom) ? bottom - routed[routed.length - 1] : Infinity;
            var centeringShift = clamp(-averageOffset, minimumShift, maximumShift);
            routed = routed.map(function(value) { return value + centeringShift; });
        }

        ordered.forEach(function(entry, laneIndex) {
            entry.laneIndex = laneIndex;
            entry.sideCount = ordered.length;
            entry.routeY = routed[laneIndex];
            entry.routeGap = laneGap;
        });
        // Edge turns must be nested in the opposite order from card
        // attachments. The top card receives the outermost turn and the
        // bottom card the innermost turn. Otherwise an upper route's vertical
        // turn cuts through the horizontal card stubs below it, even when the
        // source lanes themselves are perfectly separated.
        ordered.slice().sort(function(first, second) {
            var firstEnd = Number.isFinite(Number(first.endY))
                ? Number(first.endY)
                : (Number.isFinite(Number(first.top)) ? Number(first.top) : Number(first.point.y) || 0);
            var secondEnd = Number.isFinite(Number(second.endY))
                ? Number(second.endY)
                : (Number.isFinite(Number(second.top)) ? Number(second.top) : Number(second.point.y) || 0);
            return firstEnd - secondEnd;
        }).forEach(function(entry, attachmentIndex) {
            entry.approachLaneIndex = ordered.length - 1 - attachmentIndex;
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
        var requestedRouting = settings.routing || 'auto';
        var useIndexedRouting = requestedRouting === 'indexed';
        var usePortRouting = requestedRouting === 'ports' || (
            requestedRouting === 'auto' &&
            planned.length >= regionalBreakdownPolicy.portRoutingThreshold
        );

        if (useIndexedRouting) {
            var visualOrder = planned.slice().sort(function(first, second) {
                if (first.side !== second.side) return first.side === 'left' ? -1 : 1;
                var firstTop = Number.isFinite(Number(first.top)) ? Number(first.top) : Number(first.point.y) || 0;
                var secondTop = Number.isFinite(Number(second.top)) ? Number(second.top) : Number(second.point.y) || 0;
                return firstTop - secondTop;
            });
            visualOrder.forEach(function(entry, visualIndex) {
                entry.markerIndex = visualIndex + 1;
                entry.laneIndex = 0;
                entry.sideCount = 1;
                entry.routeY = entry.point.y;
                entry.routeGap = 0;
            });
            planned.routing = 'indexed';
            return planned;
        }

        if (usePortRouting) {
            planEdgePorts(planned, {
                top: settings.top,
                bottom: settings.bottom,
                gap: settings.gap
            });
            planned.routing = 'ports';
            return planned;
        }

        var routingModes = [];
        ['left', 'right'].forEach(function(side) {
            var sideEntries = planned.filter(function(entry) { return entry.side === side; });
            var sideRouting = resolveLeaderRouting(
                { leaderRouting: settings.routing || 'auto' },
                sideEntries,
                { gap: settings.gap }
            );
            routingModes.push(sideRouting);
            if (sideRouting === 'lanes') {
                distributeLeaderLanes(sideEntries, {
                    top: settings.top,
                    bottom: settings.bottom,
                    gap: settings.gap
                });
            } else {
                sideEntries.sort(function(first, second) { return first.point.y - second.point.y; });
                sideEntries.forEach(function(entry) {
                    entry.laneIndex = 0;
                    entry.approachLaneIndex = 0;
                    entry.sideCount = 1;
                    entry.routeY = entry.point.y;
                    entry.routeGap = 0;
                });
            }
        });
        planned.routing = routingModes.indexOf('lanes') >= 0 ? 'lanes' : 'direct';
        return planned;
    }

    function segmentsCross(a1, a2, b1, b2) {
        var adx = a2.x - a1.x;
        var ady = a2.y - a1.y;
        var bdx = b2.x - b1.x;
        var bdy = b2.y - b1.y;
        var denominator = adx * bdy - ady * bdx;
        if (Math.abs(denominator) < 0.0001) return false;
        var dx = b1.x - a1.x;
        var dy = b1.y - a1.y;
        var ta = (dx * bdy - dy * bdx) / denominator;
        var tb = (dx * ady - dy * adx) / denominator;
        return ta > 0.025 && ta < 0.975 && tb > 0.025 && tb < 0.975;
    }

    function placementColumn(entries, side, options) {
        var settings = options || {};
        var ordered = (entries || []).slice();
        if (!settings.preserveOrder) {
            ordered.sort(function(first, second) {
                return first.point.y - second.point.y;
            });
        }
        var top = side === 'left' ? Number(settings.topLeft) : Number(settings.topRight);
        if (!Number.isFinite(top)) top = 10;
        var bottom = Number.isFinite(Number(settings.bottom)) ? Number(settings.bottom) : 600;
        var gap = Math.max(0, Number(settings.gap) || 0);
        var heights = ordered.map(function(entry) {
            return Math.max(1, Number(entry.height) || 1);
        });
        var distribution = side === 'left' ? settings.leftDistribution : settings.rightDistribution;
        var tops = [];
        if (distribution === 'geographic') {
            var geographicCursor = top;
            ordered.forEach(function(entry, index) {
                var entryTop = Math.max(
                    geographicCursor,
                    Math.min(Number(entry.point.y) - heights[index] / 2, bottom - heights[index])
                );
                tops.push(entryTop);
                geographicCursor = entryTop + heights[index] + gap;
            });
            var overflow = geographicCursor - gap - bottom;
            if (overflow > 0 && tops.length) {
                tops = tops.map(function(value) { return value - overflow; });
                for (var reverseIndex = tops.length - 2; reverseIndex >= 0; reverseIndex -= 1) {
                    tops[reverseIndex] = Math.min(
                        tops[reverseIndex],
                        tops[reverseIndex + 1] - heights[reverseIndex] - gap
                    );
                }
                if (tops[0] < top) {
                    var shift = top - tops[0];
                    tops = tops.map(function(value) { return value + shift; });
                }
            }
        } else {
            var totalHeight = heights.reduce(function(sum, value) { return sum + value; }, 0);
            var balancedGap = ordered.length > 1
                ? Math.min(36, Math.max(gap, (Math.max(0, bottom - top) - totalHeight) / (ordered.length + 1)))
                : 0;
            var used = totalHeight + balancedGap * Math.max(0, ordered.length - 1);
            var balancedCursor = top + Math.max(0, (bottom - top - used) / 2);
            heights.forEach(function(height) {
                tops.push(balancedCursor);
                balancedCursor += height + balancedGap;
            });
        }
        var width = Number(settings.width) || 1200;
        var cardWidth = Number(settings.cardWidth) || 210;
        var cardInset = Number(settings.cardInset) || 10;
        var attachmentInset = Math.max(0, Number(settings.attachmentInset) || 14);
        var endpointX = side === 'left' ? cardInset + cardWidth : width - cardInset - cardWidth;
        return ordered.map(function(entry, index) {
            var height = heights[index];
            var attachmentTop = tops[index] + attachmentInset;
            var attachmentBottom = tops[index] + height - attachmentInset;
            var endpointY = attachmentTop <= attachmentBottom
                ? clamp(Number(entry.point.y), attachmentTop, attachmentBottom)
                : tops[index] + height / 2;
            return {
                entry: entry,
                start: { x: Number(entry.point.x), y: Number(entry.point.y) },
                end: { x: endpointX, y: endpointY }
            };
        });
    }

    function sampledPlacementRoute(route, options) {
        var settings = options || {};
        var side = route.entry && route.entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? -1 : 1;
        var minimumCardStub = Math.max(24, Number(settings.minimumCardStub) || 36);
        var availableCardGap = Math.abs(Number(route.start.x) - Number(route.end.x));
        var effectiveCardStub = availableCardGap < minimumCardStub * 3
            ? Math.max(14, Math.min(minimumCardStub, availableCardGap * 0.28))
            : minimumCardStub;
        var samplesPerSegment = Math.max(
            12,
            Math.min(18, Number(settings.placementSamples) || 14)
        );
        var portX = route.end.x - direction * effectiveCardStub;
        var candidate = directPortCandidate(
            route.start,
            portX,
            route.end.y,
            route.end.x,
            direction
        );
        var points = [candidate.segments[0].start];
        candidate.segments.forEach(function(segment) {
            for (var sample = 1; sample <= samplesPerSegment; sample += 1) {
                points.push(cubicPoint(segment, sample / samplesPerSegment));
            }
        });
        points.push({ x: route.end.x, y: route.end.y });
        return points;
    }

    function sampledPlacementRoutesCross(firstRoute, secondRoute, options) {
        var firstPoints = sampledPlacementRoute(firstRoute, options);
        var secondPoints = sampledPlacementRoute(secondRoute, options);
        for (var first = 1; first < firstPoints.length; first += 1) {
            for (var second = 1; second < secondPoints.length; second += 1) {
                if (segmentsCross(
                    firstPoints[first - 1],
                    firstPoints[first],
                    secondPoints[second - 1],
                    secondPoints[second]
                )) return true;
            }
        }
        return false;
    }

    function sampledPlacementRoutesCrowding(firstRoute, secondRoute, options) {
        var settings = options || {};
        var firstPoints = sampledPlacementRoute(firstRoute, settings);
        var secondPoints = sampledPlacementRoute(secondRoute, settings);
        var firstSegments = [];
        var secondSegments = [];
        for (var first = 1; first < firstPoints.length; first += 1) {
            firstSegments.push([firstPoints[first - 1], firstPoints[first]]);
        }
        for (var second = 1; second < secondPoints.length; second += 1) {
            secondSegments.push([secondPoints[second - 1], secondPoints[second]]);
        }
        return sampledSegmentCrowding(
            firstSegments,
            secondSegments,
            Math.max(10, Number(settings.leaderClearance) || 14)
        );
    }

    function geographicOrderInversions(entries) {
        var ordered = entries || [];
        var inversions = 0;
        for (var first = 0; first < ordered.length; first += 1) {
            for (var second = first + 1; second < ordered.length; second += 1) {
                if (Number(ordered[first].point && ordered[first].point.y) >
                    Number(ordered[second].point && ordered[second].point.y)) {
                    inversions += 1;
                }
            }
        }
        return inversions;
    }

    function scoreCalloutPlacement(leftEntries, rightEntries, options) {
        var settings = options || {};
        var routes = placementColumn(leftEntries, 'left', options)
            .concat(placementColumn(rightEntries, 'right', options));
        var crossings = 0;
        for (var first = 0; first < routes.length; first += 1) {
            for (var second = first + 1; second < routes.length; second += 1) {
                if (sampledPlacementRoutesCross(routes[first], routes[second], settings)) {
                    crossings += 1;
                }
            }
        }
        var length = routes.reduce(function(sum, route) {
            return sum + Math.hypot(route.end.x - route.start.x, route.end.y - route.start.y);
        }, 0);
        var verticalTravel = routes.reduce(function(sum, route) {
            return sum + Math.abs(route.end.y - route.start.y);
        }, 0);
        var horizontalTravel = routes.reduce(function(sum, route) {
            return sum + Math.abs(route.end.x - route.start.x);
        }, 0);
        var switchedTravel = routes.reduce(function(sum, route) {
            return sum + (
                route.entry.initialSide && route.entry.initialSide !== route.entry.side
                    ? Math.abs(route.end.x - route.start.x)
                    : 0
            );
        }, 0);
        var minimumCardStub = Math.max(24, Number(settings.minimumCardStub) || 36);
        var maximumAttachmentSlope = 0;
        var attachmentSharpness = routes.reduce(function(sum, route) {
            var curveWidth = Math.max(
                16,
                Math.abs(route.end.x - route.start.x) - minimumCardStub
            );
            var verticalDistance = Math.abs(route.end.y - route.start.y);
            var slope = verticalDistance / curveWidth;
            maximumAttachmentSlope = Math.max(maximumAttachmentSlope, slope);
            var excess = Math.max(0, slope - 1.25);
            return sum + excess * excess;
        }, 0);
        var switches = routes.reduce(function(sum, route) {
            return sum + (route.entry.initialSide && route.entry.initialSide !== route.entry.side ? 1 : 0);
        }, 0);
        var geographicInversions = geographicOrderInversions(leftEntries) +
            geographicOrderInversions(rightEntries);
        var hasInitialLeft = routes.some(function(route) {
            return route.entry.initialSide === 'left';
        });
        var hasInitialRight = routes.some(function(route) {
            return route.entry.initialSide === 'right';
        });
        var sideStabilityPenalty = hasInitialLeft && hasInitialRight
            ? switches * 100000000000 + switchedTravel * 100000000
            : switches * 6;
        return {
            crossings: crossings,
            crowding: 0,
            geographicInversions: geographicInversions,
            length: length,
            verticalTravel: verticalTravel,
            maximumAttachmentSlope: maximumAttachmentSlope,
            attachmentSharpness: attachmentSharpness,
            switches: switches,
            score: crossings * 1000000000 + attachmentSharpness * 10000000 +
                maximumAttachmentSlope * 1000000 + switchedTravel * 1000000 +
                geographicInversions * 10000000 +
                horizontalTravel * 100 + length * 100 + verticalTravel * 8 + sideStabilityPenalty
        };
    }

    function finalPlacementCrowding(leftEntries, rightEntries, options) {
        var settings = options || {};
        var routes = placementColumn(leftEntries, 'left', settings)
            .concat(placementColumn(rightEntries, 'right', settings));
        var crowding = 0;
        for (var first = 0; first < routes.length; first += 1) {
            for (var second = first + 1; second < routes.length; second += 1) {
                crowding += sampledPlacementRoutesCrowding(
                    routes[first], routes[second], settings
                ).score;
            }
        }
        return crowding;
    }

    function optimizeColumnOrder(leftEntries, rightEntries, options) {
        var settings = options || {};
        var orderedSettings = Object.assign({}, settings, { preserveOrder: true });
        var left = (leftEntries || []).slice();
        var right = (rightEntries || []).slice();

        function compare(first, second) {
            if (!second) return true;
            return first.score < second.score - 0.001 ||
                Math.abs(first.score - second.score) <= 0.001 && first.signature < second.signature;
        }

        function searchColumn(side) {
            var source = side === 'left' ? left : right;
            if (source.length < 2) return;
            var best = null;

            function evaluate(order) {
                var candidateLeft = side === 'left' ? order : left;
                var candidateRight = side === 'right' ? order : right;
                var metrics = scoreCalloutPlacement(candidateLeft, candidateRight, orderedSettings);
                var signature = order.map(function(entry) { return entry._placementIndex; }).join(',');
                if (compare(metrics, best && { score: best.metrics.score, signature: best.signature })) {
                    best = { order: order.slice(), metrics: metrics, signature: signature };
                }
            }

            // Exact permutation scoring is useful for small columns, but its
            // cost grows factorially and is unnecessary once a dense chart
            // has six or more cards on one side. The bounded swap pass keeps
            // the placement deterministic without making browser rendering
            // depend on a multi-minute search.
            if (source.length <= 5) {
                function enumerate(start, remaining, chosen) {
                    if (remaining === 0) {
                        evaluate(chosen);
                        return;
                    }
                    for (var index = 0; index < source.length; index += 1) {
                        if (chosen.indexOf(source[index]) >= 0) continue;
                        chosen.push(source[index]);
                        enumerate(index + 1, remaining - 1, chosen);
                        chosen.pop();
                    }
                }
                enumerate(0, source.length, []);
            } else {
                var current = source.slice();
                evaluate(current);
                var improved = true;
                var passes = 0;
                while (improved && passes < 3) {
                    improved = false;
                    passes += 1;
                    for (var first = 0; first < current.length; first += 1) {
                        for (var second = first + 1; second < current.length; second += 1) {
                        var swapped = current.slice();
                        var temporary = swapped[first];
                        swapped[first] = swapped[second];
                            swapped[second] = temporary;
                            var previousScore = best.metrics.score;
                            evaluate(swapped);
                            if (best.metrics.score < previousScore - 0.001) {
                                current = swapped;
                                improved = true;
                            }
                        }
                    }
                }
            }
            if (best) {
                if (side === 'left') left = best.order.slice();
                else right = best.order.slice();
            }
        }

        searchColumn('left');
        searchColumn('right');
        var metrics = scoreCalloutPlacement(left, right, orderedSettings);
        return { left: left, right: right, metrics: metrics };
    }

    function optimizeCalloutPlacement(entries, options) {
        var settings = options || {};
        var all = (entries || []).slice();
        var desiredLeft = Number.isFinite(Number(settings.desiredLeft))
            ? Math.round(Number(settings.desiredLeft))
            : Math.ceil(all.length * (settings.summaryOnRight ? 0.58 : 0.5));
        all.forEach(function(entry, index) {
            entry.initialSide = entry.side === 'right' ? 'right' : 'left';
            entry._placementIndex = index;
        });
        var fixedLeft = all.filter(function(entry) {
            return entry.item && entry.item.calloutSide === 'left';
        });
        var fixedRight = all.filter(function(entry) {
            return entry.item && entry.item.calloutSide === 'right';
        });
        var automatic = all.filter(function(entry) {
            return !entry.item || !entry.item.calloutSide || entry.item.calloutSide === 'auto';
        });
        desiredLeft = clamp(desiredLeft, fixedLeft.length, all.length - fixedRight.length);
        var chooseLeft = desiredLeft - fixedLeft.length;
        var best = null;
        var evaluations = 0;
        var evaluatedSignatures = {};
        var placementSearchBudget = Math.max(
            1,
            Math.round(Number(settings.placementSearchBudget) || 1024)
        );

        function combinationCount(total, choose, limit) {
            var selected = Math.min(choose, total - choose);
            var count = 1;
            for (var index = 1; index <= selected; index += 1) {
                count = count * (total - selected + index) / index;
                if (count > limit) return count;
            }
            return count;
        }

        function evaluate(selectedIndexes) {
            if (evaluations >= placementSearchBudget) return;
            var normalizedIndexes = selectedIndexes.slice().sort(function(first, second) {
                return first - second;
            });
            var evaluationSignature = normalizedIndexes.join(',');
            if (evaluatedSignatures[evaluationSignature]) return;
            evaluatedSignatures[evaluationSignature] = true;
            var selected = {};
            normalizedIndexes.forEach(function(index) { selected[index] = true; });
            var left = fixedLeft.slice();
            var right = fixedRight.slice();
            automatic.forEach(function(entry, index) {
                if (selected[index]) left.push(entry);
                else right.push(entry);
            });
            left.forEach(function(entry) { entry.side = 'left'; });
            right.forEach(function(entry) { entry.side = 'right'; });
            left.sort(function(first, second) { return first.point.y - second.point.y; });
            right.sort(function(first, second) { return first.point.y - second.point.y; });
            var metrics = scoreCalloutPlacement(left, right, settings);
            evaluations += 1;
            var signature = left.map(function(entry) { return entry._placementIndex; }).join(',') + '|' +
                right.map(function(entry) { return entry._placementIndex; }).join(',');
            if (!best || metrics.score < best.metrics.score - 0.001 ||
                Math.abs(metrics.score - best.metrics.score) <= 0.001 && signature < best.signature) {
                best = {
                    left: left.slice(),
                    right: right.slice(),
                    metrics: metrics,
                    signature: signature
                };
            }
        }

        function seedSelection(indexes) {
            if (indexes.length !== chooseLeft) return;
            evaluate(indexes);
        }

        var totalAssignments = combinationCount(
            automatic.length,
            chooseLeft,
            placementSearchBudget + 1
        );
        var geographicIndexes = automatic.map(function(entry, index) {
            return { index: index, y: Number(entry.point && entry.point.y) || 0 };
        }).sort(function(first, second) {
            return first.y - second.y || first.index - second.index;
        }).map(function(entry) { return entry.index; });
        var originalIndexes = automatic.reduce(function(selected, entry, index) {
            if (entry.initialSide === 'left') selected.push(index);
            return selected;
        }, []);
        if (originalIndexes.length !== chooseLeft) {
            originalIndexes = geographicIndexes.slice(0, chooseLeft);
        }
        seedSelection(originalIndexes);
        seedSelection(geographicIndexes.slice(0, chooseLeft));
        seedSelection(geographicIndexes.slice(geographicIndexes.length - chooseLeft));
        seedSelection(geographicIndexes.filter(function(_, index) {
            return index % 2 === 0;
        }).slice(0, chooseLeft));
        seedSelection(geographicIndexes.filter(function(_, index) {
            return index % 2 === 1;
        }).slice(0, chooseLeft));

        function choose(start, remaining, selected) {
            if (evaluations >= placementSearchBudget) return;
            if (remaining === 0) {
                evaluate(selected);
                return;
            }
            for (var index = start; index <= automatic.length - remaining; index += 1) {
                if (evaluations >= placementSearchBudget) return;
                selected.push(index);
                choose(index + 1, remaining - 1, selected);
                selected.pop();
            }
        }
        choose(0, chooseLeft, []);
        if (!best) evaluate([]);
        // Evaluations reuse entry objects, so later candidate assignments can
        // otherwise overwrite the side flags held by the winning arrays.
        best.left.forEach(function(entry) { entry.side = 'left'; });
        best.right.forEach(function(entry) { entry.side = 'right'; });
        var ordered = optimizeColumnOrder(best.left, best.right, settings);
        best.left = ordered.left;
        best.right = ordered.right;
        best.metrics = ordered.metrics;
        // Clearance is expensive to sample and does not belong inside the
        // factorial side/order search. Evaluate it once on the selected
        // placement; the final route builders perform the authoritative
        // crowding-aware geometry search afterward.
        best.metrics.crowding = finalPlacementCrowding(
            best.left,
            best.right,
            settings
        );
        best.left.forEach(function(entry, index) {
            entry.side = 'left';
            entry.placementOrder = index;
        });
        best.right.forEach(function(entry, index) {
            entry.side = 'right';
            entry.placementOrder = index;
        });
        return {
            left: best.left,
            right: best.right,
            predictedCrossings: best.metrics.crossings,
            predictedCrowding: best.metrics.crowding,
            predictedLength: best.metrics.length,
            maximumAttachmentSlope: best.metrics.maximumAttachmentSlope,
            attachmentSharpness: best.metrics.attachmentSharpness,
            sideSwitches: best.metrics.switches,
            assignmentEvaluations: evaluations
        };
    }

    function balanceCalloutSides(entries, options) {
        var settings = options || {};
        var all = (entries || []).slice();
        var left = all.filter(function(entry) { return entry.side === 'left'; });
        var right = all.filter(function(entry) { return entry.side === 'right'; });
        var desiredLeft = Number.isFinite(Number(settings.desiredLeft))
            ? Math.round(Number(settings.desiredLeft))
            : Math.ceil(all.length * (settings.summaryOnRight ? 0.58 : 0.5));
        var centerX = Number(settings.width) / 2;
        if (!Number.isFinite(centerX)) centerX = 0;

        function movable(list) {
            return list.filter(function(entry) {
                return !entry.item || !entry.item.calloutSide || entry.item.calloutSide === 'auto';
            }).sort(function(first, second) {
                return Math.abs(first.point.x - centerX) - Math.abs(second.point.x - centerX);
            });
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

    function planRegionalBreakdown(entries, options) {
        var settings = options || {};
        var map = settings.map || {};
        var all = (entries || []).slice();
        all.forEach(function(entry, index) {
            entry._placementIndex = index;
            entry.initialSide = entry.side === 'right' ? 'right' : 'left';
        });
        var policy = getRegionalBreakdownPolicy({
            count: all.length,
            dense: settings.dense
        });
        var requestedRouting = map.leaderRouting || 'auto';
        var usePortRouting = requestedRouting === 'ports' || (
            requestedRouting === 'auto' && all.length >= policy.portRoutingThreshold
        );
        var summaryOnRight = Boolean(settings.summaryOnRight);
        var summaryShown = Boolean(settings.summaryShown);
        var desiredLeft = Number.isFinite(Number(settings.desiredLeft))
            ? Math.round(Number(settings.desiredLeft))
            : Math.ceil(all.length * (summaryOnRight ? 0.58 : 0.5));
        var leftDistribution = resolveCalloutDistribution(
            map,
            summaryShown,
            all.slice(0, desiredLeft)
        );
        var rightDistribution = resolveCalloutDistribution(
            map,
            summaryShown,
            all.slice(desiredLeft)
        );
        var placementOptions = {
            width: settings.width,
            cardWidth: settings.cardWidth,
            cardInset: policy.cardInset,
            attachmentInset: policy.attachmentInset,
            topLeft: settings.topLeft,
            topRight: settings.topRight,
            bottom: settings.bottom,
            gap: policy.cardGap,
            desiredLeft: desiredLeft,
            summaryOnRight: summaryOnRight,
            leftDistribution: leftDistribution,
            rightDistribution: rightDistribution,
            minimumCardStub: policy.minimumCardStub,
            leaderClearance: policy.leaderClearance
        };
        var placement;
        if (usePortRouting) {
            var placementTemplateEntries = all.map(function(entry) {
                return Object.assign({}, entry);
            });
            function placementEntries() {
                return placementTemplateEntries.map(function(entry) {
                    return Object.assign({}, entry);
                });
            }
            function comparePlacement(first, second) {
                var firstMetrics = first.result;
                var secondMetrics = second.result;
                var firstValues = [
                    firstMetrics.predictedCrossings,
                    firstMetrics.predictedCrowding,
                    firstMetrics.attachmentSharpness,
                    firstMetrics.maximumAttachmentSlope,
                    Math.abs(first.count - desiredLeft),
                    firstMetrics.predictedLength,
                    firstMetrics.sideSwitches
                ];
                var secondValues = [
                    secondMetrics.predictedCrossings,
                    secondMetrics.predictedCrowding,
                    secondMetrics.attachmentSharpness,
                    secondMetrics.maximumAttachmentSlope,
                    Math.abs(second.count - desiredLeft),
                    secondMetrics.predictedLength,
                    secondMetrics.sideSwitches
                ];
                for (var index = 0; index < firstValues.length; index += 1) {
                    if (firstValues[index] !== secondValues[index]) {
                        return firstValues[index] - secondValues[index];
                    }
                }
                return 0;
            }
            function fitsColumn(entries, top) {
                var totalHeight = entries.reduce(function(sum, entry) {
                    return sum + Math.max(1, Number(entry.height) || 1);
                }, 0);
                var requiredHeight = totalHeight + Math.max(0, entries.length - 1) * placementOptions.gap;
                return requiredHeight <= Math.max(0, placementOptions.bottom - top) + 0.5;
            }
            function fitsPlacement(result) {
                return fitsColumn(result.left, placementOptions.topLeft) &&
                    fitsColumn(result.right, placementOptions.topRight);
            }
            var primaryPlacement = optimizeCalloutPlacement(all, placementOptions);
            var placementCandidates = [{
                count: desiredLeft,
                result: primaryPlacement
            }];
            if (primaryPlacement.predictedCrossings > 0 || primaryPlacement.predictedCrowding > 1) {
                [desiredLeft - 1, desiredLeft + 1].forEach(function(candidateCount) {
                    if (candidateCount < 0 || candidateCount > all.length) return;
                    var candidateResult = optimizeCalloutPlacement(
                        placementEntries(),
                        Object.assign({}, placementOptions, { desiredLeft: candidateCount })
                    );
                    if (fitsPlacement(candidateResult)) {
                        placementCandidates.push({
                            count: candidateCount,
                            result: candidateResult
                        });
                    }
                });
            }
            placement = placementCandidates.sort(comparePlacement)[0].result;
        } else {
            // Sparse maps still need crossing- and distance-aware card order.
            // The old nearest-side path preserved input order, which meant a
            // simple swap of two cards could leave avoidable crossings and
            // long leaders. Reuse the same global placement scorer for direct
            // routes; leader routing and card assignment remain separate.
            placement = optimizeCalloutPlacement(all, placementOptions);
        }

        return {
            policy: policy,
            requestedRouting: requestedRouting,
            usePortRouting: usePortRouting,
            placementMode: usePortRouting ? 'crossing-optimized-ports' : 'crossing-optimized-direct',
            placement: placement,
            sides: { left: placement.left, right: placement.right },
            desiredLeft: desiredLeft,
            leftDistribution: leftDistribution,
            rightDistribution: rightDistribution
        };
    }

    function planEdgePorts(entries, options) {
        var settings = options || {};
        var top = Number.isFinite(Number(settings.top)) ? Number(settings.top) : -Infinity;
        var bottom = Number.isFinite(Number(settings.bottom)) ? Number(settings.bottom) : Infinity;
        var requestedGap = Math.max(18, Number(settings.gap) || 22);

        ['left', 'right'].forEach(function(side) {
            var ordered = (entries || []).filter(function(entry) {
                return entry.side === side;
            }).sort(function(first, second) {
                if (Number.isFinite(Number(first.placementOrder)) && Number.isFinite(Number(second.placementOrder))) {
                    return Number(first.placementOrder) - Number(second.placementOrder);
                }
                return first.point.y - second.point.y;
            });
            if (!ordered.length) return;

            var available = Number.isFinite(top) && Number.isFinite(bottom)
                ? Math.max(0, bottom - top)
                : Infinity;
            var portGap = ordered.length > 1 && Number.isFinite(available)
                ? Math.min(requestedGap, available / (ordered.length - 1))
                : requestedGap;
            var desired = ordered.map(function(entry) {
                var target = Number.isFinite(Number(entry.endY))
                    ? Number(entry.endY)
                    : Number(entry.point.y) || 0;
                return clamp(target, top, bottom);
            });
            var ports = desired.slice();

            for (var index = 1; index < ports.length; index += 1) {
                ports[index] = Math.max(ports[index], ports[index - 1] + portGap);
            }
            for (var reverseIndex = ports.length - 2; reverseIndex >= 0; reverseIndex -= 1) {
                ports[reverseIndex] = Math.min(ports[reverseIndex], ports[reverseIndex + 1] - portGap);
            }

            if (Number.isFinite(top) && ports[0] < top) {
                var topShift = top - ports[0];
                ports = ports.map(function(value) { return value + topShift; });
            }
            if (Number.isFinite(bottom) && ports[ports.length - 1] > bottom) {
                var bottomShift = bottom - ports[ports.length - 1];
                ports = ports.map(function(value) { return value + bottomShift; });
            }

            ordered.forEach(function(entry, portIndex) {
                entry.portIndex = portIndex;
                entry.sideCount = ordered.length;
                entry.portY = ports[portIndex];
                entry.portGap = portGap;
            });
        });

        return entries;
    }

    function cubicPoint(segment, t) {
        var inverse = 1 - t;
        var inverseSquared = inverse * inverse;
        var tSquared = t * t;
        return {
            x: inverseSquared * inverse * segment.start.x +
                3 * inverseSquared * t * segment.control1.x +
                3 * inverse * tSquared * segment.control2.x +
                tSquared * t * segment.end.x,
            y: inverseSquared * inverse * segment.start.y +
                3 * inverseSquared * t * segment.control1.y +
                3 * inverse * tSquared * segment.control2.y +
                tSquared * t * segment.end.y
        };
    }

    function normalizeObstacle(obstacle, clearance) {
        if (!obstacle) return null;
        var left = Number(obstacle.left);
        var right = Number(obstacle.right);
        var top = Number(obstacle.top);
        var bottom = Number(obstacle.bottom);
        if (![left, right, top, bottom].every(Number.isFinite)) return null;
        // Geometry-aware obstacles already apply the requested clearance in
        // their point-in-shape predicate. Expanding their coarse bounds again
        // here makes the router treat the clearance ring as a second obstacle,
        // which can incorrectly eliminate otherwise clean corridors and
        // trigger fallback routes. Synthetic/rectangular obstacles still use
        // the supplied padding.
        var hasGeometryClearance = typeof obstacle.contains === 'function' &&
            typeof obstacle.exactContains === 'function';
        var padding = hasGeometryClearance ? 0 : Math.max(0, Number(clearance) || 0);
        var geometryContains = typeof obstacle.contains === 'function' ? obstacle.contains : null;
        var exactContains = typeof obstacle.exactContains === 'function' ? obstacle.exactContains : null;
        var containsCache = Object.create(null);
        var exactContainsCache = Object.create(null);
        function cachedGeometryPredicate(predicate, cache, point) {
            if (!predicate) return null;
            var key = Math.round(Number(point.x) * 2) + ':' + Math.round(Number(point.y) * 2);
            if (cache[key] === undefined) cache[key] = Boolean(predicate(point));
            return cache[key];
        }
        return {
            id: obstacle.id || obstacle.regionId || null,
            left: Math.min(left, right) - padding,
            right: Math.max(left, right) + padding,
            top: Math.min(top, bottom) - padding,
            bottom: Math.max(top, bottom) + padding,
            contains: geometryContains
                ? function(point) { return cachedGeometryPredicate(geometryContains, containsCache, point); }
                : null,
            exactContains: exactContains
                ? function(point) { return cachedGeometryPredicate(exactContains, exactContainsCache, point); }
                : null,
            clearanceExemptCenter: null,
            clearanceExemptRadius: 0
        };
    }

    function pointInsideObstacle(point, obstacle) {
        var insideBounds = point.x >= obstacle.left && point.x <= obstacle.right &&
            point.y >= obstacle.top && point.y <= obstacle.bottom;
        if (!insideBounds) return false;
        if (
            obstacle.clearanceExemptCenter &&
            obstacle.exactContains &&
            Math.hypot(
                point.x - obstacle.clearanceExemptCenter.x,
                point.y - obstacle.clearanceExemptCenter.y
            ) <= obstacle.clearanceExemptRadius &&
            !obstacle.exactContains(point)
        ) return false;
        return obstacle.contains ? Boolean(obstacle.contains(point)) : true;
    }

    function evaluateBezierCandidate(candidate, obstacles, samplesPerSegment, exact) {
        var collisions = {};
        var length = 0;
        var samples = exact
            ? Math.max(12, Math.min(18, Number(samplesPerSegment) || 28))
            : Math.max(8, Math.min(12, Number(samplesPerSegment) || 28));
        (candidate.segments || []).forEach(function(segment) {
            var previous = segment.start;
            for (var index = 1; index <= samples; index += 1) {
                var point = cubicPoint(segment, index / samples);
                length += Math.hypot(point.x - previous.x, point.y - previous.y);
                obstacles.forEach(function(obstacle, obstacleIndex) {
                    if (pointInsideObstacle(point, obstacle)) collisions[obstacleIndex] = true;
                });
                previous = point;
            }
        });
        return {
            collisionIndexes: Object.keys(collisions).map(Number),
            collisionCount: Object.keys(collisions).length,
            length: length
        };
    }

    function verticalExcursion(candidate, startY, endY, samplesPerSegment) {
        var envelopeTop = Math.min(Number(startY), Number(endY));
        var envelopeBottom = Math.max(Number(startY), Number(endY));
        var minimumY = Number(startY);
        var maximumY = Number(startY);
        var samples = Math.max(12, Math.min(24, Number(samplesPerSegment) || 28));
        (candidate.segments || []).forEach(function(segment) {
            for (var index = 1; index <= samples; index += 1) {
                var point = cubicPoint(segment, index / samples);
                minimumY = Math.min(minimumY, point.y);
                maximumY = Math.max(maximumY, point.y);
            }
        });
        return {
            above: Math.max(0, envelopeTop - minimumY),
            below: Math.max(0, maximumY - envelopeBottom),
            total: Math.max(0, envelopeTop - minimumY) +
                Math.max(0, maximumY - envelopeBottom)
        };
    }

    function findSourceExit(point, target, sourceObstacles, routeTop, routeBottom) {
        var obstacles = (sourceObstacles || []).map(function(obstacle) {
            return normalizeObstacle(obstacle, 0);
        }).filter(Boolean);
        if (!obstacles.length) return null;
        var start = { x: Number(point.x), y: Number(point.y) };
        var startsInside = obstacles.some(function(obstacle) {
            return pointInsideObstacle(start, obstacle);
        });
        if (!startsInside) return null;
        var targetPoint = target && Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y))
            ? { x: Number(target.x), y: Number(target.y) }
            : { x: start.x, y: start.y - 120 };
        var deltaX = targetPoint.x - start.x;
        var deltaY = targetPoint.y - start.y;
        var distance = Math.max(1, Math.hypot(deltaX, deltaY));
        var unitX = deltaX / distance;
        var unitY = deltaY / distance;
        var maximumDistance = Math.min(360, distance + 120);
        for (var travelled = 3; travelled <= maximumDistance; travelled += 3) {
            var candidate = {
                x: start.x + unitX * travelled,
                y: start.y + unitY * travelled
            };
            if (Number.isFinite(routeTop)) candidate.y = Math.max(routeTop, candidate.y);
            if (Number.isFinite(routeBottom)) candidate.y = Math.min(routeBottom, candidate.y);
            var stillInside = obstacles.some(function(obstacle) {
                return pointInsideObstacle(candidate, obstacle);
            });
            if (!stillInside) {
                return {
                    x: candidate.x + unitX * 5,
                    y: clamp(candidate.y + unitY * 5, routeTop, routeBottom)
                };
            }
        }
        return null;
    }

    function attachmentTangentHandle(start, end) {
        var horizontalDistance = Math.max(1, Math.abs(Number(end.x) - Number(start.x)));
        var verticalDistance = Math.abs(Number(end.y) - Number(start.y));
        var steepness = verticalDistance / horizontalDistance;
        var fraction = clamp(0.34 + Math.max(0, steepness - 0.8) * 0.16, 0.34, 0.74);
        return horizontalDistance * fraction;
    }

    function directPortCandidate(point, portX, portY, cardX, direction) {
        var startX = Number(point.x);
        var startY = Number(point.y);
        var deltaX = portX - startX;
        var horizontalDistance = Math.max(1, Math.abs(deltaX));
        var horizontalDirection = deltaX < 0 ? -1 : 1;
        var terminalHandle = attachmentTangentHandle(
            { x: startX, y: startY },
            { x: portX, y: portY }
        );
        var startHandle = Math.min(
            horizontalDistance * 0.2,
            Math.max(6, horizontalDistance - terminalHandle - 4)
        );
        var control1 = {
            x: startX + horizontalDirection * startHandle,
            y: startY
        };
        var control2 = {
            x: portX - horizontalDirection * terminalHandle,
            y: portY
        };
        var end = { x: portX, y: portY };
        return {
            path: [
                'M', point.x, point.y,
                'C', control1.x, control1.y,
                control2.x, control2.y,
                portX, portY,
                'H', cardX
            ].join(' '),
            segments: [{
                start: { x: Number(point.x), y: Number(point.y) },
                control1: control1,
                control2: control2,
                end: end
            }],
            firstControlX: control1.x,
            secondControlX: control2.x
        };
    }

    function singleSplineFanCandidate(point, portX, portY, cardX, bowY, sourceHandleFraction) {
        var start = { x: Number(point.x), y: Number(point.y) };
        var end = { x: Number(portX), y: Number(portY) };
        var deltaX = end.x - start.x;
        var horizontalDistance = Math.max(1, Math.abs(deltaX));
        var horizontalDirection = deltaX < 0 ? -1 : 1;
        var terminalHandle = Math.min(
            horizontalDistance * 0.42,
            attachmentTangentHandle(start, end)
        );
        var requestedSourceHandle = horizontalDistance * clamp(
            Number(sourceHandleFraction) || 0.28,
            0.14,
            0.48
        );
        var sourceHandle = Math.max(
            12,
            Math.min(requestedSourceHandle, horizontalDistance - terminalHandle - 8)
        );
        var control1 = {
            x: start.x + horizontalDirection * sourceHandle,
            y: Number(bowY)
        };
        var control2 = {
            x: end.x - horizontalDirection * terminalHandle,
            y: end.y
        };
        return {
            path: [
                'M', start.x, start.y,
                'C', control1.x, control1.y,
                control2.x, control2.y,
                end.x, end.y,
                'H', cardX
            ].join(' '),
            segments: [{
                start: start,
                control1: control1,
                control2: control2,
                end: end
            }],
            firstControlX: control1.x,
            secondControlX: control2.x
        };
    }

    function nearCardCandidate(point, cardX) {
        var start = { x: Number(point.x), y: Number(point.y) };
        var end = { x: Number(cardX), y: Number(point.y) };
        return {
            path: ['M', start.x, start.y, 'H', end.x].join(' '),
            segments: [straightCubicSegment(start, end)]
        };
    }

    function vectorLength(vector) {
        return Math.hypot(vector.x, vector.y);
    }

    function normalizedVector(vector, fallback) {
        var length = vectorLength(vector);
        if (length <= 0.0001) return fallback || { x: 1, y: 0 };
        return { x: vector.x / length, y: vector.y / length };
    }

    function splineTangent(points, index, cardX) {
        var point = points[index];
        if (index === 0) {
            return normalizedVector({
                x: points[1].x - point.x,
                y: points[1].y - point.y
            });
        }
        if (index === points.length - 1) {
            return { x: cardX >= point.x ? 1 : -1, y: 0 };
        }
        var incoming = normalizedVector({
            x: point.x - points[index - 1].x,
            y: point.y - points[index - 1].y
        });
        var outgoing = normalizedVector({
            x: points[index + 1].x - point.x,
            y: points[index + 1].y - point.y
        });
        var bisector = { x: incoming.x + outgoing.x, y: incoming.y + outgoing.y };
        if (vectorLength(bisector) <= 0.08) {
            bisector = {
                x: points[index + 1].x - points[index - 1].x,
                y: points[index + 1].y - points[index - 1].y
            };
        }
        return normalizedVector(bisector, outgoing);
    }

    function tangentHandleLength(points, index, segmentLength, tension) {
        var adjacentLength = Infinity;
        if (index > 0) {
            adjacentLength = Math.min(
                adjacentLength,
                Math.hypot(
                    points[index].x - points[index - 1].x,
                    points[index].y - points[index - 1].y
                )
            );
        }
        if (index < points.length - 1) {
            adjacentLength = Math.min(
                adjacentLength,
                Math.hypot(
                    points[index + 1].x - points[index].x,
                    points[index + 1].y - points[index].y
                )
            );
        }
        if (!Number.isFinite(adjacentLength)) adjacentLength = segmentLength;
        return Math.min(segmentLength * tension * 0.56, adjacentLength * tension * 0.46);
    }

    // A* returns a dense, stair-stepped corridor. Splining through every knot is
    // what produces visible wiggles, so drop any interior point that sits close to
    // the straight line between its neighbours before the curve is fitted.
    function simplifyRoutePoints(points, tolerance) {
        if (!points || points.length < 3) return (points || []).slice();
        var limit = Math.max(0, Number(tolerance) || 0);
        var simplified = [points[0]];
        for (var index = 1; index < points.length - 1; index += 1) {
            var previous = simplified[simplified.length - 1];
            var candidate = points[index];
            var next = points[index + 1];
            var spanX = next.x - previous.x;
            var spanY = next.y - previous.y;
            var spanLength = Math.hypot(spanX, spanY);
            if (spanLength <= 0.0001) continue;
            var deviation = Math.abs(
                (candidate.x - previous.x) * spanY - (candidate.y - previous.y) * spanX
            ) / spanLength;
            if (deviation > limit) simplified.push(candidate);
        }
        simplified.push(points[points.length - 1]);
        return simplified;
    }

    // Keep a cubic inside the bounding box of the polyline segment it smooths.
    // Free tangents can otherwise reach past the segment and make a leader bulge
    // or hook backwards before it reaches its card. Only the handle *length* is
    // reduced: the tangent direction is left untouched, so adjacent sections still
    // share one tangent and the curve stays G1-continuous across knots.
    function limitHandleToSegment(direction, handle, start, end) {
        var limit = Math.max(0, Number(handle) || 0);
        if (!limit) return 0;
        var spanX = end.x - start.x;
        var spanY = end.y - start.y;
        var length = Math.hypot(spanX, spanY);
        if (length <= 0.0001) return limit;
        // How far the handle carries the control point along the segment itself.
        // Perpendicular reach is left alone, so detours keep their bow and stay
        // distinguishable; only travel along the segment is bounded.
        var along = (direction.x * spanX + direction.y * spanY) / length;
        if (along > 0.0001) {
            // Forward: stop short of the far knot so the curve cannot overshoot it.
            return Math.min(limit, length * 0.9 / along);
        }
        if (along < -0.0001) {
            // Backward: this is the hook-back case. Allow only a token handle so
            // the tangent direction survives without visibly reversing the line.
            return Math.min(limit, length * 0.12 / -along);
        }
        return limit;
    }

    function detourPortCandidate(point, waypoints, portX, portY, cardX, requestedTension) {
        var rawPoints = [{ x: Number(point.x), y: Number(point.y) }]
            .concat(waypoints || [])
            .concat([{ x: portX, y: portY }]);
        var points = rawPoints.filter(function(candidate, index) {
            if (!index) return true;
            var previous = rawPoints[index - 1];
            return Math.hypot(candidate.x - previous.x, candidate.y - previous.y) > 0.5;
        });
        points = simplifyRoutePoints(points, 1.5);
        var tension = clamp(Number(requestedTension) || 0.62, 0.2, 0.94);
        var path = ['M', points[0].x, points[0].y];
        var segments = [];

        var tangents = points.map(function(candidate, index) {
            return splineTangent(points, index, cardX);
        });

        for (var index = 0; index < points.length - 1; index += 1) {
            var start = points[index];
            var end = points[index + 1];
            var segmentLength = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
            var startHandle = tangentHandleLength(points, index, segmentLength, tension);
            var endHandle = tangentHandleLength(points, index + 1, segmentLength, tension);
            if (index + 1 === points.length - 1) {
                endHandle = Math.max(endHandle, attachmentTangentHandle(start, end));
            }
            startHandle = limitHandleToSegment(
                tangents[index], startHandle, start, end
            );
            endHandle = limitHandleToSegment(
                { x: -tangents[index + 1].x, y: -tangents[index + 1].y },
                endHandle,
                end,
                start
            );
            var control1 = {
                x: start.x + tangents[index].x * startHandle,
                y: start.y + tangents[index].y * startHandle
            };
            var control2 = {
                x: end.x - tangents[index + 1].x * endHandle,
                y: end.y - tangents[index + 1].y * endHandle
            };
            path.push('C', control1.x, control1.y, control2.x, control2.y, end.x, end.y);
            segments.push({
                start: start,
                control1: control1,
                control2: control2,
                end: end
            });
        }

        path.push('H', cardX);
        return {
            path: path.join(' '),
            segments: segments,
            waypoints: (waypoints || []).slice(),
            tension: tension
        };
    }

    function segmentClear(first, second, obstacles, sampleStep) {
        var distance = Math.hypot(second.x - first.x, second.y - first.y);
        var samples = Math.max(1, Math.ceil(distance / Math.max(3, sampleStep || 6)));
        for (var index = 1; index < samples; index += 1) {
            var ratio = index / samples;
            var point = {
                x: first.x + (second.x - first.x) * ratio,
                y: first.y + (second.y - first.y) * ratio
            };
            if (obstacles.some(function(obstacle) { return pointInsideObstacle(point, obstacle); })) return false;
        }
        return true;
    }

    function heapPush(heap, item) {
        heap.push(item);
        var index = heap.length - 1;
        while (index > 0) {
            var parent = Math.floor((index - 1) / 2);
            if (heap[parent].priority <= item.priority) break;
            heap[index] = heap[parent];
            index = parent;
        }
        heap[index] = item;
    }

    function heapPop(heap) {
        if (!heap.length) return null;
        var first = heap[0];
        var last = heap.pop();
        if (!heap.length) return first;
        var index = 0;
        while (true) {
            var left = index * 2 + 1;
            var right = left + 1;
            if (left >= heap.length) break;
            var child = right < heap.length && heap[right].priority < heap[left].priority ? right : left;
            if (heap[child].priority >= last.priority) break;
            heap[index] = heap[child];
            index = child;
        }
        heap[index] = last;
        return first;
    }

    function simplifyClearPath(points, obstacles) {
        if (!points || points.length <= 2) return points || [];
        var simplified = [points[0]];
        var anchorIndex = 0;
        while (anchorIndex < points.length - 1) {
            var nextIndex = points.length - 1;
            while (nextIndex > anchorIndex + 1 && !segmentClear(points[anchorIndex], points[nextIndex], obstacles, 4)) {
                nextIndex -= 1;
            }
            simplified.push(points[nextIndex]);
            anchorIndex = nextIndex;
        }
        return simplified;
    }

    function findGridRoute(start, goal, obstacles, settings) {
        var options = settings || {};
        var step = Math.max(8, Number(options.gridStep) || 18);
        var left = Math.min(start.x, goal.x);
        var right = Math.max(start.x, goal.x);
        var detourMargin = Math.max(60, Number(options.detourMargin) || 120);
        if (goal.x < start.x) right += detourMargin;
        else left -= detourMargin;
        if (Number.isFinite(Number(options.routeLeft))) left = Math.max(left, Number(options.routeLeft));
        if (Number.isFinite(Number(options.routeRight))) right = Math.min(right, Number(options.routeRight));
        var top = Number.isFinite(Number(options.routeTop)) ? Number(options.routeTop) : Math.min(start.y, goal.y) - 160;
        var bottom = Number.isFinite(Number(options.routeBottom)) ? Number(options.routeBottom) : Math.max(start.y, goal.y) + 160;
        var columns = Math.max(2, Math.ceil((right - left) / step));
        var rows = Math.max(2, Math.ceil((bottom - top) / step));
        var nodes = {};
        var blocked = {};
        function key(column, row) { return column + ',' + row; }
        function node(column, row) {
            var nodeKey = key(column, row);
            if (!nodes[nodeKey]) {
                nodes[nodeKey] = {
                    x: column === columns ? right : left + column * step,
                    y: row === rows ? bottom : top + row * step,
                    column: column,
                    row: row,
                    key: nodeKey
                };
            }
            return nodes[nodeKey];
        }
        var startNode = node(clamp(Math.round((start.x - left) / step), 0, columns), clamp(Math.round((start.y - top) / step), 0, rows));
        var goalNode = node(clamp(Math.round((goal.x - left) / step), 0, columns), clamp(Math.round((goal.y - top) / step), 0, rows));
        startNode.x = start.x; startNode.y = start.y;
        goalNode.x = goal.x; goalNode.y = goal.y;
        function isBlocked(candidate) {
            if (candidate.key === startNode.key || candidate.key === goalNode.key) return false;
            if (blocked[candidate.key] === undefined) {
                blocked[candidate.key] = obstacles.some(function(obstacle) { return pointInsideObstacle(candidate, obstacle); });
            }
            return blocked[candidate.key];
        }
        var directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        var verticalDirection = Math.sign(goal.y - start.y);
        var verticalEnvelopeTop = Math.min(start.y, goal.y);
        var verticalEnvelopeBottom = Math.max(start.y, goal.y);
        var open = [];
        var cameFrom = {};
        var gScore = {};
        var closed = {};
        gScore[startNode.key] = 0;
        heapPush(open, { key: startNode.key, priority: Math.hypot(goal.x - start.x, goal.y - start.y) });
        while (open.length) {
            var currentItem = heapPop(open);
            if (!currentItem || closed[currentItem.key]) continue;
            var current = nodes[currentItem.key];
            if (current.key === goalNode.key) {
                var keys = [goalNode.key];
                var currentKey = goalNode.key;
                while (cameFrom[currentKey]) { currentKey = cameFrom[currentKey]; keys.push(currentKey); }
                keys.reverse();
                return simplifyClearPath(keys.map(function(nodeKey) { return nodes[nodeKey]; }), obstacles);
            }
            closed[current.key] = true;
            directions.forEach(function(direction) {
                var column = current.column + direction[0];
                var row = current.row + direction[1];
                if (column < 0 || column > columns || row < 0 || row > rows) return;
                var neighbor = node(column, row);
                if (closed[neighbor.key] || isBlocked(neighbor) || !segmentClear(current, neighbor, obstacles, 3)) return;
                var movementX = neighbor.x - current.x;
                var movementY = neighbor.y - current.y;
                var movementCost = Math.hypot(movementX, movementY);
                var oppositeDirectionCost = verticalDirection && movementY * verticalDirection < 0
                    ? Math.abs(movementY) * 1.35
                    : 0;
                var envelopeExcursion = neighbor.y < verticalEnvelopeTop
                    ? verticalEnvelopeTop - neighbor.y
                    : neighbor.y > verticalEnvelopeBottom
                        ? neighbor.y - verticalEnvelopeBottom
                        : 0;
                var tentative = gScore[current.key] + movementCost +
                    oppositeDirectionCost + envelopeExcursion * 0.42;
                if (gScore[neighbor.key] !== undefined && tentative >= gScore[neighbor.key]) return;
                cameFrom[neighbor.key] = current.key;
                gScore[neighbor.key] = tentative;
                heapPush(open, { key: neighbor.key, priority: tentative + Math.hypot(goal.x - neighbor.x, goal.y - neighbor.y) });
            });
        }
        return null;
    }

    function straightCubicSegment(start, end) {
        return {
            start: start,
            control1: {
                x: start.x + (end.x - start.x) / 3,
                y: start.y + (end.y - start.y) / 3
            },
            control2: {
                x: start.x + (end.x - start.x) * 2 / 3,
                y: start.y + (end.y - start.y) * 2 / 3
            },
            end: end
        };
    }

    function roundedGridCandidate(points, cardX, requestedRadius) {
        if (!points || points.length < 2) return null;
        // Grid paths are only an internal clearance scaffold. Render their
        // turns as cubic bends even when the clearance search requested a
        // zero-radius fallback; a visible leader should never expose the
        // scaffold's square corners.
        var radius = Math.max(2.5, Number(requestedRadius) || 0);
        var cleaned = [points[0]];
        (points || []).slice(1).forEach(function(candidate) {
            var previous = cleaned[cleaned.length - 1];
            if (Math.hypot(candidate.x - previous.x, candidate.y - previous.y) > 0.5) {
                cleaned.push(candidate);
            }
        });
        if (cleaned.length < 2) return null;
        var path = ['M', cleaned[0].x, cleaned[0].y];
        var segments = [];
        var cursor = cleaned[0];
        for (var index = 1; index < cleaned.length - 1; index += 1) {
            var previous = cleaned[index - 1];
            var corner = cleaned[index];
            var next = cleaned[index + 1];
            var incomingLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
            var outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
            if (incomingLength <= 0.5 || outgoingLength <= 0.5) {
                cursor = corner;
                continue;
            }
            var cornerRadius = Math.min(radius, incomingLength / 3, outgoingLength / 3);
            var incomingUnit = {
                x: (corner.x - previous.x) / incomingLength,
                y: (corner.y - previous.y) / incomingLength
            };
            var outgoingUnit = {
                x: (next.x - corner.x) / outgoingLength,
                y: (next.y - corner.y) / outgoingLength
            };
            var after = {
                x: corner.x + outgoingUnit.x * cornerRadius,
                y: corner.y + outgoingUnit.y * cornerRadius
            };
            // Collapse the straight-in leg and the corner arc into one cubic.
            // The endpoint remains outside the turn by cornerRadius, while
            // both handles preserve the incoming and outgoing tangents.
            var incomingHandle = Math.min(
                incomingLength * 0.46,
                Math.max(4, cornerRadius * 4)
            );
            var outgoingHandle = Math.min(
                outgoingLength * 0.46,
                Math.max(4, cornerRadius * 4)
            );
            var roundedCorner = {
                start: cursor,
                control1: {
                    x: cursor.x + incomingUnit.x * incomingHandle,
                    y: cursor.y + incomingUnit.y * incomingHandle
                },
                control2: {
                    x: after.x - outgoingUnit.x * outgoingHandle,
                    y: after.y - outgoingUnit.y * outgoingHandle
                },
                end: after
            };
            path.push(
                'C',
                roundedCorner.control1.x, roundedCorner.control1.y,
                roundedCorner.control2.x, roundedCorner.control2.y,
                after.x, after.y
            );
            segments.push({
                start: roundedCorner.start,
                control1: roundedCorner.control1,
                control2: roundedCorner.control2,
                end: roundedCorner.end
            });
            cursor = after;
        }
        var end = cleaned[cleaned.length - 1];
        var finalDistance = Math.hypot(end.x - cursor.x, end.y - cursor.y);
        if (finalDistance > 0.5) {
            var cardDirection = Number(cardX) >= end.x ? 1 : -1;
            var terminalHandle = Math.min(
                Math.max(8, Math.abs(Number(cardX) - end.x) * 0.72),
                Math.max(8, finalDistance * 0.42)
            );
            var finalSegment = {
                start: cursor,
                control1: {
                    x: cursor.x + (end.x - cursor.x) * 0.42,
                    y: cursor.y + (end.y - cursor.y) * 0.42
                },
                control2: {
                    x: end.x - cardDirection * terminalHandle,
                    y: end.y
                },
                end: end
            };
            path.push(
                'C',
                finalSegment.control1.x, finalSegment.control1.y,
                finalSegment.control2.x, finalSegment.control2.y,
                end.x, end.y
            );
            segments.push(finalSegment);
        }
        // The last card stub is deliberately horizontal. Every candidate
        // reaches it with a horizontal cubic tangent, so this continuation
        // does not introduce a visible corner.
        if (Math.abs(end.x - Number(cardX)) > 0.5) {
            path.push('H', cardX);
            segments.push(straightCubicSegment(end, { x: cardX, y: end.y }));
        }
        return { path: path.join(' '), segments: segments };
    }

    function routeSegmentsForCandidate(candidate, cardX) {
        var segments = (candidate && candidate.segments || []).slice();
        if (!segments.length) return segments;
        var last = segments[segments.length - 1].end;
        if (Math.abs(last.x - cardX) > 0.5) {
            segments.push(straightCubicSegment(last, { x: cardX, y: last.y }));
        }
        return segments;
    }

    function candidateTerminalBacktracks(candidate, cardX) {
        var segments = routeSegmentsForCandidate(candidate, cardX);
        if (segments.length < 2) return false;
        var approach = segments[segments.length - 2];
        var terminal = segments[segments.length - 1];
        if (Math.abs(terminal.start.y - terminal.end.y) > 0.5) return false;
        var tangentX = Number(approach.end.x) - Number(approach.control2.x);
        var cardDirection = Number(cardX) >= Number(terminal.start.x) ? 1 : -1;
        return Math.abs(tangentX) > 0.5 && tangentX * cardDirection < -0.5;
    }

    function candidateHasSelfIntersection(candidate, cardX) {
        if (!candidate) return false;
        if (candidateTerminalBacktracks(candidate, cardX)) return true;
        var segments = sampledRouteSegments(routeSegmentsForCandidate(candidate, cardX), 24);
        for (var firstIndex = 0; firstIndex < segments.length; firstIndex += 1) {
            for (var secondIndex = firstIndex + 2; secondIndex < segments.length; secondIndex += 1) {
                if (secondIndex - firstIndex <= 1) continue;
                var first = segments[firstIndex];
                var second = segments[secondIndex];
                if (segmentsCross(first[0], first[1], second[0], second[1])) return true;
            }
        }
        return false;
    }

    function sampledRouteSegments(segments, samplesPerSegment) {
        var samples = Math.max(8, Number(samplesPerSegment) || 18);
        var points = [];
        (segments || []).forEach(function(segment) {
            var previous = segment.start;
            for (var index = 1; index <= samples; index += 1) {
                var point = cubicPoint(segment, index / samples);
                points.push([previous, point]);
                previous = point;
            }
        });
        return points;
    }

    function routeSegmentsConflict(firstSegments, secondSegments, minimumGap) {
        var firstSamples = sampledRouteSegments(firstSegments, 36);
        var secondSamples = sampledRouteSegments(secondSegments, 36);
        var closest = Infinity;
        var crosses = false;
        firstSamples.some(function(first) {
            return secondSamples.some(function(second) {
                if (segmentsCross(first[0], first[1], second[0], second[1])) {
                    crosses = true;
                    return true;
                }
                var distance = segmentDistance(
                    first[0], first[1], second[0], second[1]
                );
                closest = Math.min(closest, distance);
                return false;
            });
        });
        return crosses || closest < Math.max(4, Number(minimumGap) || 8);
    }

    function routeCrossingCount(candidate, cardX, avoidRoutes) {
        if (!candidate || !(avoidRoutes || []).length) return 0;
        var candidateSegments = routeSegmentsForCandidate(candidate, cardX);
        return (avoidRoutes || []).reduce(function(count, route) {
            return count + (routeSegmentsConflict(candidateSegments, route, 4) ? 1 : 0);
        }, 0);
    }

    function pointToSegmentDistance(point, start, end) {
        var dx = end.x - start.x;
        var dy = end.y - start.y;
        var lengthSquared = dx * dx + dy * dy;
        if (lengthSquared < 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
        var ratio = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
        var t = clamp(ratio, 0, 1);
        return Math.hypot(
            point.x - (start.x + t * dx),
            point.y - (start.y + t * dy)
        );
    }

    function segmentDistance(firstStart, firstEnd, secondStart, secondEnd) {
        return Math.min(
            pointToSegmentDistance(firstStart, secondStart, secondEnd),
            pointToSegmentDistance(firstEnd, secondStart, secondEnd),
            pointToSegmentDistance(secondStart, firstStart, firstEnd),
            pointToSegmentDistance(secondEnd, firstStart, firstEnd)
        );
    }

    function sampledSegmentCrowding(firstSamples, secondSamples, minimumGap) {
        var gap = Math.max(6, Number(minimumGap) || 14);
        var firstLengths = (firstSamples || []).map(function(segment) {
            return Math.hypot(
                segment[1].x - segment[0].x,
                segment[1].y - segment[0].y
            );
        });
        var totalLength = firstLengths.reduce(function(sum, value) { return sum + value; }, 0);
        var walked = 0;
        var crowdedLength = 0;
        var score = 0;
        var minimumDistance = Infinity;
        (firstSamples || []).forEach(function(first, index) {
            var segmentLength = firstLengths[index];
            var midpoint = walked + segmentLength / 2;
            walked += segmentLength;
            if (midpoint < 10 || totalLength - midpoint < 10) return;
            var closest = Infinity;
            (secondSamples || []).some(function(second) {
                if (segmentsCross(first[0], first[1], second[0], second[1])) {
                    closest = 0;
                    return true;
                }
                closest = Math.min(
                    closest,
                    segmentDistance(first[0], first[1], second[0], second[1])
                );
                return closest <= 0.25;
            });
            minimumDistance = Math.min(minimumDistance, closest);
            if (closest >= gap) return;
            var closeness = (gap - closest) / gap;
            crowdedLength += segmentLength * closeness;
            score += segmentLength * closeness * closeness;
        });
        return {
            score: score,
            crowdedLength: crowdedLength,
            minimumDistance: minimumDistance,
            significant: crowdedLength >= 18 && score >= 8
        };
    }

    function routeEnvelopeSegments(segments) {
        var usable = (segments || []).slice();
        if (usable.length > 1) {
            var terminal = usable[usable.length - 1];
            if (Math.abs(terminal.start.y - terminal.end.y) < 0.5 &&
                Math.abs(terminal.start.x - terminal.end.x) > 10) {
                usable.pop();
            }
        }
        return usable;
    }

    function routeCrowdingMetrics(candidate, cardX, avoidRoutes, minimumGap) {
        if (!candidate || !(avoidRoutes || []).length) {
            return { score: 0, crowdedLength: 0, minimumDistance: Infinity, significant: false };
        }
        var candidateSamples = sampledRouteSegments(
            routeEnvelopeSegments(routeSegmentsForCandidate(candidate, cardX)),
            36
        );
        var aggregate = {
            score: 0,
            crowdedLength: 0,
            minimumDistance: Infinity,
            significant: false
        };
        (avoidRoutes || []).forEach(function(route) {
            var routeSamples = sampledRouteSegments(routeEnvelopeSegments(route), 36);
            var metrics = sampledSegmentCrowding(candidateSamples, routeSamples, minimumGap);
            aggregate.score += metrics.score;
            aggregate.crowdedLength += metrics.crowdedLength;
            aggregate.minimumDistance = Math.min(aggregate.minimumDistance, metrics.minimumDistance);
            aggregate.significant = aggregate.significant || metrics.significant;
        });
        return aggregate;
    }

    function routeSegmentSetCrowding(firstRoute, secondRoute, minimumGap) {
        var firstSamples = sampledRouteSegments(
            routeEnvelopeSegments(firstRoute || []),
            36
        );
        var secondSamples = sampledRouteSegments(
            routeEnvelopeSegments(secondRoute || []),
            36
        );
        return sampledSegmentCrowding(firstSamples, secondSamples, minimumGap);
    }

    function routeBounds(segments) {
        var sampled = sampledRouteSegments(routeEnvelopeSegments(segments), 18).reduce(function(points, segment) {
            points.push(segment[0], segment[1]);
            return points;
        }, []);
        if (!sampled.length) return null;
        return {
            left: Math.min.apply(null, sampled.map(function(point) { return point.x; })),
            right: Math.max.apply(null, sampled.map(function(point) { return point.x; })),
            top: Math.min.apply(null, sampled.map(function(point) { return point.y; })),
            bottom: Math.max.apply(null, sampled.map(function(point) { return point.y; }))
        };
    }

    function routeNearestPoint(segments, target) {
        var points = sampledRouteSegments(routeEnvelopeSegments(segments), 18).reduce(function(all, segment) {
            all.push(segment[0], segment[1]);
            return all;
        }, []);
        return points.reduce(function(nearest, point) {
            if (!nearest || Math.hypot(point.x - target.x, point.y - target.y) < nearest.distance) {
                return {
                    point: point,
                    distance: Math.hypot(point.x - target.x, point.y - target.y)
                };
            }
            return nearest;
        }, null);
    }

    function routeNaturalnessPenalty(candidate) {
        var segments = candidate && Array.isArray(candidate.segments) ? candidate.segments : [];
        if (segments.length <= 1) return 0;
        return segments.reduce(function(total, segment, index) {
            var chord = Math.hypot(
                Number(segment.end.x) - Number(segment.start.x),
                Number(segment.end.y) - Number(segment.start.y)
            );
            // Short intermediate spline runs force tight local S-curves even when
            // the full route is collision-free. Keep the terminal approach more
            // permissive because a nearby card port can legitimately need a short
            // final adjustment.
            var minimumRun = index === segments.length - 1 ? 18 : 28;
            var deficit = Math.max(0, minimumRun - chord);
            return total + deficit * deficit / minimumRun * 8;
        }, 0);
    }

    function routeDirectionalityMetrics(candidate, side, samplesPerSegment) {
        var segments = candidate && Array.isArray(candidate.segments) ? candidate.segments : [];
        if (!segments.length) {
            return {
                reversalCount: 0,
                reverseDistance: 0,
                maximumReverseStep: 0,
                controlReverseDistance: 0,
                terminalApproachRun: 0,
                terminalCorrection: 0,
                terminalBoxTurn: false
            };
        }
        var expectedDirection = side === 'left' ? -1 : 1;
        var samples = Math.max(12, Math.min(36, Number(samplesPerSegment) || 24));
        var previous = segments[0].start;
        var reversalCount = 0;
        var reverseDistance = 0;
        var maximumReverseStep = 0;
        var controlReverseDistance = 0;
        segments.forEach(function(segment) {
            var controlPolygon = [segment.start, segment.control1, segment.control2, segment.end];
            for (var controlIndex = 1; controlIndex < controlPolygon.length; controlIndex += 1) {
                var controlProgress = (
                    Number(controlPolygon[controlIndex].x) -
                    Number(controlPolygon[controlIndex - 1].x)
                ) * expectedDirection;
                if (controlProgress < -0.1) controlReverseDistance += -controlProgress;
            }
            for (var index = 1; index <= samples; index += 1) {
                var point = cubicPoint(segment, index / samples);
                var progress = (point.x - previous.x) * expectedDirection;
                if (progress < -0.35) {
                    reversalCount += 1;
                    reverseDistance += -progress;
                    maximumReverseStep = Math.max(maximumReverseStep, -progress);
                }
                previous = point;
            }
        });
        var terminal = segments[segments.length - 1];
        var terminalApproachRun = (
            Number(terminal.end.x) - Number(terminal.start.x)
        ) * expectedDirection;
        var terminalCorrection = Math.abs(
            Number(terminal.end.y) - Number(terminal.start.y)
        );
        var minimumTerminalRun = Math.max(28, Math.min(72, terminalCorrection * 0.9));
        return {
            reversalCount: reversalCount,
            reverseDistance: reverseDistance,
            maximumReverseStep: maximumReverseStep,
            controlReverseDistance: controlReverseDistance,
            terminalApproachRun: terminalApproachRun,
            terminalCorrection: terminalCorrection,
            terminalBoxTurn: terminalCorrection > 4 && terminalApproachRun < minimumTerminalRun
        };
    }

    function buildSimplePortLeaderPath(entry, geometry) {
        var settings = geometry || {};
        var avoidRoutes = settings.avoidRoutes || [];
        var point = entry && entry.point || { x: 0, y: 0 };
        var side = entry && entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? -1 : 1;
        var pointX = Number(point.x) || 0;
        var pointY = Number(point.y) || 0;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var portOffset = Math.max(6, Number(settings.portOffset) || 10);
        var minimumCardStub = Math.max(12, Number(settings.minimumCardStub) || 18);
        var leaderClearance = Math.max(10, Number(settings.leaderClearance) || 14);
        var availableCardGap = Math.abs(pointX - cardX);
        var adaptiveCardStub = availableCardGap < minimumCardStub * 2.2;
        var effectiveCardStub = adaptiveCardStub
            ? Math.max(12, Math.min(minimumCardStub, availableCardGap * 0.24))
            : minimumCardStub;
        var edgePortX = mapEdgeX + direction * portOffset;
        var cardApproachX = cardX - direction * effectiveCardStub;
        var portX = direction < 0
            ? Math.max(edgePortX, cardApproachX)
            : Math.min(edgePortX, cardApproachX);
        if (Number.isFinite(Number(settings.routeLeft))) {
            portX = Math.max(portX, Number(settings.routeLeft));
        }
        if (Number.isFinite(Number(settings.routeRight))) {
            portX = Math.min(portX, Number(settings.routeRight));
        }
        var portY = Number.isFinite(Number(entry && entry.portY))
            ? Number(entry.portY)
            : Number(settings.endY) || pointY;
        var cardTop = Number(settings.cardTop);
        var cardBottom = Number(settings.cardBottom);
        var pointFacesCard = direction < 0 ? pointX >= cardX : pointX <= cardX;
        var pointInsideCardBand = Number.isFinite(cardTop) && Number.isFinite(cardBottom) &&
            pointY >= cardTop + 6 && pointY <= cardBottom - 6;
        var nearCardDistance = Math.abs(pointX - cardX);
        var nearCardThreshold = Math.max(minimumCardStub + 10, 34);

        function routeIsClear(metrics) {
            if (!metrics) return true;
            var minimumDistance = Number(metrics.minimumDistance);
            return !metrics.significant &&
                (!Number.isFinite(minimumDistance) || minimumDistance >= leaderClearance - 0.5);
        }

        function resultFor(candidate, source, avoidance, adaptiveStub) {
            var routeSegments = routeSegmentsForCandidate(candidate, cardX);
            var crossings = routeCrossingCount(candidate, cardX, avoidRoutes);
            var crowding = routeCrowdingMetrics(candidate, cardX, avoidRoutes, leaderClearance);
            var directionality = routeDirectionalityMetrics(candidate, side, settings.samplesPerSegment);
            var excursion = verticalExcursion(candidate, pointY, portY, settings.samplesPerSegment);
            return {
                path: candidate.path,
                routeSegments: routeSegments,
                portX: portX,
                portY: portY,
                firstControlX: candidate.firstControlX,
                secondControlX: candidate.secondControlX,
                cardStubLength: Math.abs(portX - cardX),
                adaptiveCardStub: Boolean(adaptiveStub),
                avoidance: avoidance,
                directCollisionCount: 0,
                collisionCount: 0,
                routeCrossings: crossings,
                routeCrowding: crowding.score,
                routeCrowdedLength: crowding.crowdedLength,
                minimumRouteGap: crowding.minimumDistance,
                avoidedObstacleCount: 0,
                verticalExcursion: excursion.total,
                routingEnvelope: excursion.total <= 0.5 ? 'strict' : 'expanded',
                sourceExitUsed: false,
                fallback: false,
                selfIntersection: candidateHasSelfIntersection(candidate, cardX),
                smooth: true,
                candidateSource: source,
                directionReversalCount: directionality.reversalCount,
                reverseDistance: directionality.reverseDistance,
                controlReverseDistance: directionality.controlReverseDistance,
                terminalApproachRun: directionality.terminalApproachRun,
                terminalBoxTurn: directionality.terminalBoxTurn
            };
        }

        if (pointFacesCard && pointInsideCardBand && nearCardDistance <= nearCardThreshold) {
            var nearCard = nearCardCandidate(point, cardX);
            var nearCardResult = resultFor(nearCard, 'near-card', 'near-card', true);
            nearCardResult.portX = pointX;
            nearCardResult.portY = pointY;
            nearCardResult.cardStubLength = nearCardDistance;
            nearCardResult.smooth = false;
            if (!nearCardResult.routeCrossings && routeIsClear({
                significant: nearCardResult.routeCrowding >= 8,
                minimumDistance: nearCardResult.minimumRouteGap
            })) {
                return nearCardResult;
            }
        }

        var direct = directPortCandidate(point, portX, portY, cardX, direction);
        var directResult = resultFor(direct, 'direct', 'direct', adaptiveCardStub);
        if (
            !directResult.routeCrossings &&
            directResult.routeCrowdedLength < 18 &&
            directResult.routeCrowding < 8 &&
            !directResult.selfIntersection &&
            directResult.directionReversalCount === 0 &&
            directResult.controlReverseDistance <= 0.5 &&
            !directResult.terminalBoxTurn
        ) {
            return directResult;
        }

        var routeTop = Number.isFinite(Number(settings.routeTop))
            ? Number(settings.routeTop)
            : Math.min(pointY, portY) - 160;
        var routeBottom = Number.isFinite(Number(settings.routeBottom))
            ? Number(settings.routeBottom)
            : Math.max(pointY, portY) + 160;
        var endpointTop = Math.min(pointY, portY);
        var endpointBottom = Math.max(pointY, portY);
        var fanOffsets = [
            Math.max(18, leaderClearance * 1.5),
            Math.max(30, leaderClearance * 2.5),
            Math.max(48, leaderClearance * 4)
        ];
        var preferredVerticalDirection = (Number(entry && entry.portIndex) || 0) % 2 ? 1 : -1;
        var verticalDirections = [preferredVerticalDirection, -preferredVerticalDirection];
        var fanResults = [];
        verticalDirections.forEach(function(verticalDirection) {
            fanOffsets.forEach(function(offset) {
                var bowY = clamp(
                    verticalDirection < 0 ? endpointTop - offset : endpointBottom + offset,
                    routeTop,
                    routeBottom
                );
                if (Math.abs(bowY - pointY) < 1) return;
                var fan = singleSplineFanCandidate(
                    point,
                    portX,
                    portY,
                    cardX,
                    bowY,
                    0.3
                );
                var fanResult = resultFor(
                    fan,
                    'route-fan-single',
                    verticalDirection < 0 ? 'above' : 'below',
                    adaptiveCardStub
                );
                var length = evaluateBezierCandidate(fan, [], settings.samplesPerSegment).length;
                fanResult._score = fanResult.routeCrossings * 1000000 +
                    (fanResult.routeCrowdedLength >= 18 ? 100000 : 0) +
                    fanResult.routeCrowding * 800 +
                    fanResult.directionReversalCount * 100000 +
                    fanResult.controlReverseDistance * 10000 +
                    (fanResult.terminalBoxTurn ? 500000 : 0) +
                    fanResult.verticalExcursion * 12 + length;
                fanResults.push(fanResult);
            });
        });

        var safeFans = fanResults.filter(function(candidate) {
            return candidate.routeCrossings === 0 &&
                candidate.routeCrowdedLength < 18 &&
                candidate.routeCrowding < 8 &&
                !candidate.selfIntersection &&
                candidate.directionReversalCount === 0 &&
                candidate.controlReverseDistance <= 0.5 &&
                !candidate.terminalBoxTurn;
        });
        var selected = (safeFans.length ? safeFans : fanResults).sort(function(first, second) {
            return first._score - second._score;
        })[0];
        if (selected) {
            delete selected._score;
            if (!safeFans.length) selected.fallback = true;
            return selected;
        }

        directResult.fallback = true;
        return directResult;
    }

    function buildPortLeaderPath(entry, geometry) {
        var settings = geometry || {};
        if (settings.simpleRouting) return buildSimplePortLeaderPath(entry, settings);
        var avoidRoutes = settings.avoidRoutes || [];
        var point = entry && entry.point || { x: 0, y: 0 };
        var side = entry && entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? -1 : 1;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var pointX = Number(point.x);
        var pointY = Number(point.y);
        var portOffset = Math.max(6, Number(settings.portOffset) || 10);
        var minimumCardStub = Math.max(24, Number(settings.minimumCardStub) || 32);
        var leaderClearance = Math.max(10, Number(settings.leaderClearance) || 14);
        var availableCardGap = Math.abs(pointX - cardX);
        var preferLongCardStub = Boolean(settings.preferLongCardStub);
        var adaptiveCardStub = !preferLongCardStub && availableCardGap < minimumCardStub * 3;
        var effectiveCardStub = adaptiveCardStub
            ? Math.max(14, Math.min(minimumCardStub, availableCardGap * 0.28))
            : minimumCardStub;
        var edgePortX = mapEdgeX + direction * portOffset;
        var cardApproachX = cardX - direction * effectiveCardStub;
        var portX = direction < 0
            ? Math.max(edgePortX, cardApproachX)
            : Math.min(edgePortX, cardApproachX);
        if (Number.isFinite(Number(settings.routeLeft))) {
            portX = Math.max(portX, Number(settings.routeLeft));
        }
        if (Number.isFinite(Number(settings.routeRight))) {
            portX = Math.min(portX, Number(settings.routeRight));
        }
        var portY = Number.isFinite(Number(entry && entry.portY))
            ? Number(entry.portY)
            : Number(settings.endY) || Number(point.y) || 0;
        var requestedClearance = Number(settings.obstacleClearance);
        var clearance = Number.isFinite(requestedClearance)
            ? Math.max(0, requestedClearance)
            : 3.25;
        var obstacles = (settings.obstacles || []).map(function(obstacle) {
            return normalizeObstacle(obstacle, clearance);
        }).filter(Boolean);
        var portPoint = { x: portX, y: portY };
        obstacles = obstacles.filter(function(obstacle) {
            // If a geometry-aware polygon occupies the exact map-edge port,
            // the leader must be allowed to leave through that shared edge.
            // Rectangular test obstacles remain strict so impossible-corridor
            // coverage is still exercised by unit tests.
            return !(obstacle.contains && obstacle.exactContains &&
                obstacle.contains(portPoint) && !obstacle.exactContains(portPoint));
        });
        if ((settings.sourceObstacles || []).length) {
            obstacles = obstacles.filter(function(obstacle) {
                // A source anchor can sit inside a neighboring polygon's
                // clearance ring even when it is not inside that polygon's
                // exact fill (nested city/oblast shapes are typical). That
                // polygon is part of the source exit, not a blocker for the
                // rest of this leader.
                var insideCoarseBounds = point.x >= obstacle.left && point.x <= obstacle.right &&
                    point.y >= obstacle.top && point.y <= obstacle.bottom;
                return !(insideCoarseBounds || obstacle.contains && obstacle.contains(point));
            });
        }
        obstacles.forEach(function(obstacle) {
            if (
                obstacle.contains &&
                obstacle.exactContains &&
                obstacle.contains(point) &&
                !obstacle.exactContains(point)
            ) {
                obstacle.clearanceExemptCenter = { x: Number(point.x), y: Number(point.y) };
                obstacle.clearanceExemptRadius = clearance + 5;
            }
        });

        var cardTop = Number(settings.cardTop);
        var cardBottom = Number(settings.cardBottom);
        var nearCardThreshold = Math.max(
            minimumCardStub + 12,
            Number(settings.nearCardThreshold) || 52
        );
        var pointFacesCard = direction < 0 ? pointX >= cardX : pointX <= cardX;
        var pointInsideCardBand = Number.isFinite(cardTop) && Number.isFinite(cardBottom) &&
            pointY >= cardTop + 6 && pointY <= cardBottom - 6;
        var nearCardDistance = Math.abs(pointX - cardX);
        if (pointFacesCard && pointInsideCardBand && nearCardDistance <= nearCardThreshold) {
            var nearCard = nearCardCandidate(point, cardX);
            var nearCardEvaluation = evaluateBezierCandidate(
                nearCard,
                obstacles,
                settings.samplesPerSegment
            );
            var nearCardCrossings = routeCrossingCount(nearCard, cardX, avoidRoutes);
            var nearCardCrowding = routeCrowdingMetrics(
                nearCard, cardX, avoidRoutes, leaderClearance
            );
            if (!nearCardEvaluation.collisionCount && !nearCardCrossings && !nearCardCrowding.significant) {
                return {
                    path: nearCard.path,
                    routeSegments: routeSegmentsForCandidate(nearCard, cardX),
                    portX: pointX,
                    portY: pointY,
                    cardStubLength: nearCardDistance,
                    avoidance: 'near-card',
                    directCollisionCount: 0,
                    collisionCount: 0,
                    routeCrossings: 0,
                    routeCrowding: nearCardCrowding.score,
                    routeCrowdedLength: nearCardCrowding.crowdedLength,
                    minimumRouteGap: nearCardCrowding.minimumDistance,
                    avoidedObstacleCount: 0,
                    sourceExitUsed: false,
                    adaptiveCardStub: true,
                    routingEnvelope: 'strict',
                    fallback: false,
                    selfIntersection: false,
                    smooth: false
                };
            }
        }

        var direct = directPortCandidate(point, portX, portY, cardX, direction);
        var directRouteSegments = routeSegmentsForCandidate(direct, cardX);
        var directRouteCrossings = routeCrossingCount(direct, cardX, avoidRoutes);
        var directRouteCrowding = routeCrowdingMetrics(
            direct, cardX, avoidRoutes, leaderClearance
        );
        function routeMaintainsClearance(metrics) {
            if (!metrics) return true;
            var minimumDistance = Number(metrics.minimumDistance);
            return !metrics.significant &&
                (!Number.isFinite(minimumDistance) || minimumDistance >= leaderClearance - 0.5);
        }
        var directRouteInterference = directRouteCrossings ||
            !routeMaintainsClearance(directRouteCrowding);
        var directRouteSamples = sampledRouteSegments(
            routeEnvelopeSegments(directRouteSegments),
            36
        );
        function interferesWithDirectRoute(route) {
            if (routeSegmentsConflict(directRouteSegments, route, 4)) return true;
            var routeSamples = sampledRouteSegments(routeEnvelopeSegments(route), 36);
            return sampledSegmentCrowding(
                directRouteSamples,
                routeSamples,
                leaderClearance
            ).significant;
        }
        var directEvaluation = evaluateBezierCandidate(direct, obstacles, settings.samplesPerSegment);
        var baseResult = {
            path: direct.path,
            routeSegments: routeSegmentsForCandidate(direct, cardX),
            portX: portX,
            portY: portY,
            firstControlX: direct.firstControlX,
            secondControlX: direct.secondControlX,
            cardStubLength: Math.abs(portX - cardX),
            adaptiveCardStub: adaptiveCardStub,
            avoidance: 'direct',
            directCollisionCount: directEvaluation.collisionCount,
            collisionCount: directEvaluation.collisionCount,
            routeCrossings: directRouteCrossings,
            routeCrowding: directRouteCrowding.score,
            routeCrowdedLength: directRouteCrowding.crowdedLength,
            minimumRouteGap: directRouteCrowding.minimumDistance,
            avoidedObstacleCount: 0,
            routingEnvelope: 'strict',
            fallback: false,
            selfIntersection: false,
            smooth: true
        };
        if (!directEvaluation.collisionCount && !directRouteInterference) return baseResult;

        var directBlockers = directEvaluation.collisionIndexes.map(function(index) {
            return obstacles[index];
        });
        var travelLeft = Math.min(Number(point.x), portX);
        var travelRight = Math.max(Number(point.x), portX);
        var blockers = directBlockers.length
            ? directBlockers
            : obstacles.filter(function(obstacle) {
                return obstacle.right >= travelLeft && obstacle.left <= travelRight;
            });
        if (!blockers.length && directRouteInterference) {
            blockers = avoidRoutes.map(function(route) {
                if (!interferesWithDirectRoute(route)) return null;
                var bounds = routeBounds(route);
                if (!bounds || bounds.right < travelLeft || bounds.left > travelRight) return null;
                return {
                    id: 'leader-route',
                    left: bounds.left,
                    right: bounds.right,
                    top: bounds.top,
                    bottom: bounds.bottom,
                    routeOnly: true
                };
            }).filter(Boolean);
        }
        if (!blockers.length) return baseResult;
        var blockerTop = Math.min.apply(null, blockers.map(function(obstacle) { return obstacle.top; }));
        var blockerBottom = Math.max.apply(null, blockers.map(function(obstacle) { return obstacle.bottom; }));
        var blockerLeft = Math.min.apply(null, blockers.map(function(obstacle) { return obstacle.left; }));
        var blockerRight = Math.max.apply(null, blockers.map(function(obstacle) { return obstacle.right; }));
        var routeTop = Number.isFinite(Number(settings.routeTop)) ? Number(settings.routeTop) : -Infinity;
        var routeBottom = Number.isFinite(Number(settings.routeBottom)) ? Number(settings.routeBottom) : Infinity;
        var routeLeft = Number.isFinite(Number(settings.routeLeft))
            ? Number(settings.routeLeft)
            : Math.min(pointX, portX) - 160;
        var routeRight = Number.isFinite(Number(settings.routeRight))
            ? Number(settings.routeRight)
            : Math.max(pointX, portX) + 160;
        var routeEscapeCandidates = [];
        if (directRouteInterference) {
            var fanRouteTop = Number.isFinite(routeTop)
                ? routeTop
                : Math.min(pointY, portY) - 180;
            var fanRouteBottom = Number.isFinite(routeBottom)
                ? routeBottom
                : Math.max(pointY, portY) + 180;
            var endpointTop = Math.min(pointY, portY);
            var endpointBottom = Math.max(pointY, portY);
            // The deep offsets stay available: they are what lets a crowded
            // leader remain one continuous spline instead of degrading into a
            // multi-turn detour. Shallow bows are preferred through the score
            // below rather than by removing the fallback depth.
            var fanOffsets = [
                Math.max(18, leaderClearance * 1.5),
                Math.max(30, leaderClearance * 2.5),
                Math.max(48, leaderClearance * 4),
                Math.max(72, leaderClearance * 6),
                Math.max(96, leaderClearance * 8)
            ].filter(function(value, index, values) {
                return values.indexOf(value) === index;
            });
            [-1, 1].forEach(function(verticalDirection) {
                fanOffsets.forEach(function(offset) {
                    var bowY = clamp(
                        verticalDirection < 0
                            ? endpointTop - offset
                            : endpointBottom + offset,
                        fanRouteTop,
                        fanRouteBottom
                    );
                    if (Math.abs(bowY - pointY) < 1) return;
                    [0.18, 0.30, 0.42].forEach(function(handleFraction) {
                        var fanCandidate = singleSplineFanCandidate(
                            point,
                            portX,
                            portY,
                            cardX,
                            bowY,
                            handleFraction
                        );
                        var fanEvaluation = evaluateBezierCandidate(
                            fanCandidate,
                            obstacles,
                            settings.samplesPerSegment
                        );
                        var fanExcursion = verticalExcursion(
                            fanCandidate,
                            pointY,
                            portY,
                            settings.samplesPerSegment
                        );
                        routeEscapeCandidates.push({
                            candidate: fanCandidate,
                            evaluation: fanEvaluation,
                            score: fanEvaluation.collisionCount * 1000000 +
                                fanEvaluation.length + fanExcursion.total * 18 +
                                Math.abs(handleFraction - 0.30) * 24,
                            verticalExcursion: fanExcursion.total,
                            smooth: true,
                            sourceExitUsed: false,
                            waypointY: bowY,
                            approachExitX: portX,
                            requiredApproachRun: Math.abs(portX - pointX),
                            candidateSource: 'route-fan-single',
                            side: verticalDirection < 0 ? 'above' : 'below'
                        });
                    });
                });
            });
            avoidRoutes.forEach(function(route) {
                if (!interferesWithDirectRoute(route)) return;
                var bounds = routeBounds(route);
                if (!bounds) return;
                var safeLeftX = clamp(bounds.left - 12, routeLeft, routeRight);
                var safeRightX = clamp(bounds.right + 12, routeLeft, routeRight);
                var nearestRoute = routeNearestPoint(route, point);
                var safeTopY = clamp(
                    bounds.top - 12,
                    Number.isFinite(routeTop) ? routeTop : Math.min(pointY, portY) - 160,
                    Number.isFinite(routeBottom) ? routeBottom : Math.max(pointY, portY) + 160
                );
                var safeBottomY = clamp(
                    bounds.bottom + 12,
                    Number.isFinite(routeTop) ? routeTop : Math.min(pointY, portY) - 160,
                    Number.isFinite(routeBottom) ? routeBottom : Math.max(pointY, portY) + 160
                );
                var escapeX = direction < 0 ? safeLeftX : safeRightX;
                var oppositeEscapeX = direction < 0 ? safeRightX : safeLeftX;
                if (nearestRoute && nearestRoute.point) {
                    var routeStart = routeEnvelopeSegments(route)[0];
                    var localBarrierX = routeStart && routeStart.start
                        ? routeStart.start.x
                        : nearestRoute.point.x;
                    oppositeEscapeX = clamp(
                        (direction < 0
                            ? Math.max(localBarrierX, nearestRoute.point.x) + 12
                            : Math.min(localBarrierX, nearestRoute.point.x) - 12),
                        routeLeft,
                        routeRight
                    );
                }
                var insideRouteBounds = pointX >= bounds.left && pointX <= bounds.right &&
                    pointY >= bounds.top && pointY <= bounds.bottom;
                var fanRun = Math.max(
                    32,
                    leaderClearance * 2.5,
                    Math.min(72, Math.abs(portY - pointY) * 0.4 + 28)
                );
                var fanX = clamp(
                    pointX + direction * fanRun,
                    Math.min(pointX, escapeX),
                    Math.max(pointX, escapeX)
                );
                var fanClearance = Math.max(12, leaderClearance);
                var fanTopY = clamp(safeTopY - fanClearance, routeTop, routeBottom);
                var fanBottomY = clamp(safeBottomY + fanClearance, routeTop, routeBottom);
                var waypointSets = insideRouteBounds
                    ? [
                        [
                            { x: fanX, y: fanBottomY },
                            { x: escapeX, y: fanBottomY },
                            { x: escapeX, y: portY }
                        ],
                        [
                            { x: fanX, y: fanTopY },
                            { x: escapeX, y: fanTopY },
                            { x: escapeX, y: portY }
                        ],
                        [
                            { x: oppositeEscapeX, y: pointY },
                            { x: oppositeEscapeX, y: safeBottomY },
                            { x: escapeX, y: safeBottomY },
                            { x: escapeX, y: portY }
                        ],
                        [
                            { x: oppositeEscapeX, y: pointY },
                            { x: oppositeEscapeX, y: safeTopY },
                            { x: escapeX, y: safeTopY },
                            { x: escapeX, y: portY }
                        ],
                        pointY - 44,
                        pointY + 44,
                        pointY - 72,
                        pointY + 72
                    ].map(function(escape) {
                        if (Array.isArray(escape)) return escape;
                        return [
                            {
                                x: pointX,
                                y: clamp(escape, safeTopY, safeBottomY)
                            },
                            {
                                x: escapeX,
                                y: clamp(escape, safeTopY, safeBottomY)
                            },
                            { x: escapeX, y: portY }
                        ];
                    })
                    : [
                        [
                            { x: fanX, y: fanBottomY },
                            { x: portX, y: fanBottomY },
                            { x: portX, y: portY }
                        ],
                        [
                            { x: fanX, y: fanTopY },
                            { x: portX, y: fanTopY },
                            { x: portX, y: portY }
                        ],
                        [
                            { x: escapeX, y: pointY },
                            { x: escapeX, y: portY }
                        ],
                        [
                            { x: oppositeEscapeX, y: pointY },
                            { x: oppositeEscapeX, y: portY }
                        ],
                        [
                            { x: escapeX, y: pointY },
                            { x: escapeX, y: safeTopY },
                            { x: portX, y: safeTopY },
                            { x: portX, y: portY }
                        ],
                        [
                            { x: oppositeEscapeX, y: pointY },
                            { x: oppositeEscapeX, y: safeBottomY },
                            { x: portX, y: safeBottomY },
                            { x: portX, y: portY }
                        ]
                    ];
                waypointSets.forEach(function(waypoints) {
                    var routeCandidate = roundedGridCandidate(
                        [{ x: pointX, y: pointY }]
                            .concat(waypoints)
                            .concat([{ x: portX, y: portY }]),
                        cardX,
                        8
                    );
                    var routeEvaluation = evaluateBezierCandidate(
                        routeCandidate,
                        obstacles,
                        settings.samplesPerSegment
                    );
                    var routeExcursion = verticalExcursion(
                        routeCandidate,
                        pointY,
                        portY,
                        settings.samplesPerSegment
                    );
                    routeEscapeCandidates.push({
                        candidate: routeCandidate,
                        evaluation: routeEvaluation,
                        score: routeEvaluation.collisionCount * 1000000 +
                            routeEvaluation.length + routeExcursion.total * 12 +
                            Math.abs(escapeX - pointX) * 0.25,
                        verticalExcursion: routeExcursion.total,
                        sourceExitUsed: insideRouteBounds,
                        waypointY: waypoints[waypoints.length - 1].y,
                        approachExitX: escapeX,
                        requiredApproachRun: Math.abs(escapeX - pointX),
                        candidateSource: 'route-escape-rounded',
                        side: 'route-detour'
                    });
                    if (settings.preferSmooth) {
                        [0.86, 0.72, 0.58, 0.44].forEach(function(tension) {
                            var smoothRouteCandidate = detourPortCandidate(
                                point,
                                waypoints,
                                portX,
                                portY,
                                cardX,
                                tension
                            );
                            var smoothRouteEvaluation = evaluateBezierCandidate(
                                smoothRouteCandidate,
                                obstacles,
                                settings.samplesPerSegment
                            );
                            var smoothRouteExcursion = verticalExcursion(
                                smoothRouteCandidate,
                                pointY,
                                portY,
                                settings.samplesPerSegment
                            );
                            routeEscapeCandidates.push({
                                candidate: smoothRouteCandidate,
                                evaluation: smoothRouteEvaluation,
                                score: smoothRouteEvaluation.collisionCount * 1000000 +
                                    smoothRouteEvaluation.length +
                                    smoothRouteExcursion.total * 12 +
                                    Math.abs(escapeX - pointX) * 0.25 +
                                    (1 - tension) * 18,
                                verticalExcursion: smoothRouteExcursion.total,
                                smooth: true,
                                sourceExitUsed: insideRouteBounds,
                                waypointY: waypoints[waypoints.length - 1].y,
                                approachExitX: escapeX,
                                requiredApproachRun: Math.abs(escapeX - pointX),
                                candidateSource: 'route-escape-smooth',
                                side: 'route-detour'
                            });
                        });
                    }
                });
            });
        }
        if (routeEscapeCandidates.some(function(candidate) {
            return candidate.evaluation.collisionCount > 0;
        })) {
            var collisionObstacleIndexes = [];
            routeEscapeCandidates.forEach(function(candidate) {
                (candidate.evaluation.collisionIndexes || []).forEach(function(index) {
                    if (collisionObstacleIndexes.indexOf(index) === -1) {
                        collisionObstacleIndexes.push(index);
                    }
                });
            });
            for (var mapEscapePass = 0; mapEscapePass < 3; mapEscapePass += 1) {
                var escapeObstacles = collisionObstacleIndexes.map(function(index) {
                    return obstacles[index];
                }).filter(Boolean);
                if (!escapeObstacles.length) break;
                var escapeObstacleLeft = Math.min.apply(null, escapeObstacles.map(function(obstacle) {
                    return obstacle.left;
                }));
                var escapeObstacleRight = Math.max.apply(null, escapeObstacles.map(function(obstacle) {
                    return obstacle.right;
                }));
                var escapeObstacleTop = Math.min.apply(null, escapeObstacles.map(function(obstacle) {
                    return obstacle.top;
                }));
                var escapeObstacleBottom = Math.max.apply(null, escapeObstacles.map(function(obstacle) {
                    return obstacle.bottom;
                }));
                var mapEscapeLeftX = clamp(escapeObstacleLeft - 12, routeLeft, routeRight);
                var mapEscapeRightX = clamp(escapeObstacleRight + 12, routeLeft, routeRight);
                var mapEscapeTopY = clamp(escapeObstacleTop - 12, routeTop, routeBottom);
                var mapEscapeBottomY = clamp(escapeObstacleBottom + 12, routeTop, routeBottom);
                var mapEscapeX = direction < 0 ? mapEscapeLeftX : mapEscapeRightX;
                var mapOppositeX = direction < 0 ? mapEscapeRightX : mapEscapeLeftX;
                var newCollisionIndexes = [];
                [mapEscapeBottomY, mapEscapeTopY].forEach(function(escapeY) {
                    var mapCandidate = roundedGridCandidate(
                        [{ x: pointX, y: pointY }]
                            .concat([
                                { x: mapOppositeX, y: pointY },
                                { x: mapOppositeX, y: escapeY },
                                { x: mapEscapeX, y: escapeY },
                                { x: mapEscapeX, y: portY }
                            ])
                            .concat([{ x: portX, y: portY }]),
                        cardX,
                        8
                    );
                    var mapEvaluation = evaluateBezierCandidate(
                        mapCandidate,
                        obstacles,
                        settings.samplesPerSegment
                    );
                    var mapExcursion = verticalExcursion(
                        mapCandidate,
                        pointY,
                        portY,
                        settings.samplesPerSegment
                    );
                    routeEscapeCandidates.push({
                        candidate: mapCandidate,
                        evaluation: mapEvaluation,
                        score: mapEvaluation.collisionCount * 1000000 +
                            mapEvaluation.length + mapExcursion.total * 12,
                        verticalExcursion: mapExcursion.total,
                        sourceExitUsed: true,
                        waypointY: escapeY,
                        approachExitX: mapEscapeX,
                        requiredApproachRun: Math.abs(mapOppositeX - pointX),
                        candidateSource: 'map-escape-rounded',
                        side: 'route-detour'
                    });
                    if (settings.preferSmooth) {
                        [0.86, 0.72, 0.58, 0.44, 0.32, 0.24].forEach(function(tension) {
                            var smoothMapCandidate = detourPortCandidate(
                                point,
                                [
                                    { x: mapOppositeX, y: pointY },
                                    { x: mapOppositeX, y: escapeY },
                                    { x: mapEscapeX, y: escapeY },
                                    { x: mapEscapeX, y: portY }
                                ],
                                portX,
                                portY,
                                cardX,
                                tension
                            );
                            var smoothMapEvaluation = evaluateBezierCandidate(
                                smoothMapCandidate,
                                obstacles,
                                settings.samplesPerSegment
                            );
                            var smoothMapExcursion = verticalExcursion(
                                smoothMapCandidate,
                                pointY,
                                portY,
                                settings.samplesPerSegment
                            );
                            routeEscapeCandidates.push({
                                candidate: smoothMapCandidate,
                                evaluation: smoothMapEvaluation,
                                score: smoothMapEvaluation.collisionCount * 1000000 +
                                    smoothMapEvaluation.length + smoothMapExcursion.total * 12 +
                                    (1 - tension) * 18,
                                verticalExcursion: smoothMapExcursion.total,
                                smooth: true,
                                sourceExitUsed: true,
                                waypointY: escapeY,
                                approachExitX: mapEscapeX,
                                requiredApproachRun: Math.abs(mapOppositeX - pointX),
                                candidateSource: 'map-escape-smooth',
                                side: 'route-detour'
                            });
                        });
                    }
                    (mapEvaluation.collisionIndexes || []).forEach(function(index) {
                        if (collisionObstacleIndexes.indexOf(index) === -1 &&
                            newCollisionIndexes.indexOf(index) === -1) {
                            newCollisionIndexes.push(index);
                        }
                    });
                });
                if (!newCollisionIndexes.length) break;
                collisionObstacleIndexes = collisionObstacleIndexes.concat(newCollisionIndexes);
            }
        }
        var mapBlockers = blockers.filter(function(obstacle) {
            return !obstacle.routeOnly;
        });
        if (mapBlockers.length && directEvaluation.collisionCount) {
            var mapBlockerLeft = Math.min.apply(null, mapBlockers.map(function(obstacle) {
                return obstacle.left;
            }));
            var mapBlockerRight = Math.max.apply(null, mapBlockers.map(function(obstacle) {
                return obstacle.right;
            }));
            var mapBlockerTop = Math.min.apply(null, mapBlockers.map(function(obstacle) {
                return obstacle.top;
            }));
            var mapBlockerBottom = Math.max.apply(null, mapBlockers.map(function(obstacle) {
                return obstacle.bottom;
            }));
            var mapEscapeX = clamp(
                direction < 0 ? mapBlockerLeft - 12 : mapBlockerRight + 12,
                routeLeft,
                routeRight
            );
            var mapEscapeTop = clamp(mapBlockerTop - 12, routeTop, routeBottom);
            var mapEscapeBottom = clamp(mapBlockerBottom + 12, routeTop, routeBottom);
            [mapEscapeBottom, mapEscapeTop].forEach(function(escapeY) {
                var mapCandidate = roundedGridCandidate(
                    [{ x: pointX, y: pointY }]
                        .concat([
                            { x: pointX, y: escapeY },
                            { x: mapEscapeX, y: escapeY },
                            { x: mapEscapeX, y: portY }
                        ])
                        .concat([{ x: portX, y: portY }]),
                    cardX,
                    8
                );
                var mapEvaluation = evaluateBezierCandidate(
                    mapCandidate,
                    obstacles,
                    settings.samplesPerSegment
                );
                var mapExcursion = verticalExcursion(
                    mapCandidate,
                    pointY,
                    portY,
                    settings.samplesPerSegment
                );
                routeEscapeCandidates.push({
                    candidate: mapCandidate,
                    evaluation: mapEvaluation,
                    score: mapEvaluation.collisionCount * 1000000 +
                        mapEvaluation.length + mapExcursion.total * 12,
                    verticalExcursion: mapExcursion.total,
                    sourceExitUsed: true,
                    waypointY: escapeY,
                    approachExitX: mapEscapeX,
                    requiredApproachRun: Math.abs(mapEscapeX - pointX),
                    candidateSource: 'blocker-escape-rounded',
                    side: escapeY < (mapBlockerTop + mapBlockerBottom) / 2 ? 'above' : 'below'
                });
                if (settings.preferSmooth) {
                    [28, 22, 16, 12].forEach(function(radius) {
                        var wideRoundedCandidate = roundedGridCandidate(
                            [{ x: pointX, y: pointY }]
                                .concat([
                                    { x: pointX, y: escapeY },
                                    { x: mapEscapeX, y: escapeY },
                                    { x: mapEscapeX, y: portY }
                                ])
                                .concat([{ x: portX, y: portY }]),
                            cardX,
                            radius
                        );
                        var wideRoundedEvaluation = evaluateBezierCandidate(
                            wideRoundedCandidate,
                            obstacles,
                            settings.samplesPerSegment
                        );
                        var wideRoundedExcursion = verticalExcursion(
                            wideRoundedCandidate,
                            pointY,
                            portY,
                            settings.samplesPerSegment
                        );
                        routeEscapeCandidates.push({
                            candidate: wideRoundedCandidate,
                            evaluation: wideRoundedEvaluation,
                            score: wideRoundedEvaluation.collisionCount * 1000000 +
                                wideRoundedEvaluation.length + wideRoundedExcursion.total * 12 +
                                (28 - radius) * 0.8,
                            verticalExcursion: wideRoundedExcursion.total,
                            smooth: radius >= 16,
                            sourceExitUsed: true,
                            waypointY: escapeY,
                            approachExitX: mapEscapeX,
                            requiredApproachRun: Math.abs(mapEscapeX - pointX),
                            candidateSource: 'blocker-escape-rounded-wide',
                            side: escapeY < (mapBlockerTop + mapBlockerBottom) / 2 ? 'above' : 'below'
                        });
                    });
                }
                if (settings.preferSmooth) {
                    var terminalRunwayX = direction < 0
                        ? Math.max(mapEscapeX, portX + 16)
                        : Math.min(mapEscapeX, portX - 16);
                    if (Math.abs(terminalRunwayX - mapEscapeX) > 0.5) {
                        [20, 14, 8].forEach(function(radius) {
                            var terminalCandidate = roundedGridCandidate(
                                [{ x: pointX, y: pointY }]
                                    .concat([
                                        { x: pointX, y: escapeY },
                                        { x: terminalRunwayX, y: escapeY },
                                        { x: terminalRunwayX, y: portY },
                                        { x: portX, y: portY }
                                    ]),
                                cardX,
                                radius
                            );
                            var terminalEvaluation = evaluateBezierCandidate(
                                terminalCandidate,
                                obstacles,
                                settings.samplesPerSegment
                            );
                            var terminalExcursion = verticalExcursion(
                                terminalCandidate,
                                pointY,
                                portY,
                                settings.samplesPerSegment
                            );
                            routeEscapeCandidates.push({
                                candidate: terminalCandidate,
                                evaluation: terminalEvaluation,
                                score: terminalEvaluation.collisionCount * 1000000 +
                                    terminalEvaluation.length + terminalExcursion.total * 12 +
                                    (20 - radius) * 0.8,
                                verticalExcursion: terminalExcursion.total,
                                smooth: radius >= 14,
                                sourceExitUsed: true,
                                waypointY: escapeY,
                                approachExitX: terminalRunwayX,
                                requiredApproachRun: Math.abs(terminalRunwayX - pointX),
                                candidateSource: 'blocker-escape-terminal',
                                side: escapeY < (mapBlockerTop + mapBlockerBottom) / 2 ? 'above' : 'below'
                            });
                        });
                    }
                    [0.86, 0.72, 0.58, 0.44, 0.32, 0.24].forEach(function(tension) {
                        var smoothMapCandidate = detourPortCandidate(
                            point,
                            [
                                { x: pointX, y: escapeY },
                                { x: mapEscapeX, y: escapeY },
                                { x: mapEscapeX, y: portY }
                            ],
                            portX,
                            portY,
                            cardX,
                            tension
                        );
                        var smoothMapEvaluation = evaluateBezierCandidate(
                            smoothMapCandidate,
                            obstacles,
                            settings.samplesPerSegment
                        );
                        var smoothMapExcursion = verticalExcursion(
                            smoothMapCandidate,
                            pointY,
                            portY,
                            settings.samplesPerSegment
                        );
                        routeEscapeCandidates.push({
                            candidate: smoothMapCandidate,
                            evaluation: smoothMapEvaluation,
                            score: smoothMapEvaluation.collisionCount * 1000000 +
                                smoothMapEvaluation.length + smoothMapExcursion.total * 12 +
                                (1 - tension) * 18,
                            verticalExcursion: smoothMapExcursion.total,
                            smooth: true,
                            sourceExitUsed: true,
                            waypointY: escapeY,
                            approachExitX: mapEscapeX,
                            requiredApproachRun: Math.abs(mapEscapeX - pointX),
                            candidateSource: 'blocker-escape-smooth',
                            side: escapeY < (mapBlockerTop + mapBlockerBottom) / 2 ? 'above' : 'below'
                        });
                    });
                }
            });
        }
        var endpointEnvelopeTop = Math.max(routeTop, Math.min(pointY, portY));
        var endpointEnvelopeBottom = Math.min(routeBottom, Math.max(pointY, portY));
        var minimumX = Math.min(Number(point.x), portX) + 24;
        var maximumX = Math.max(Number(point.x), portX) - 24;
        var corridorPadding = clearance + 12;
        var entryX = direction < 0
            ? blockerRight + corridorPadding
            : blockerLeft - corridorPadding;
        var exitX = direction < 0
            ? blockerLeft - corridorPadding
            : blockerRight + corridorPadding;
        if (minimumX <= maximumX) {
            // A source can be outside a region's fill while still falling
            // inside its coarse bounds (small neighboring regions and nested
            // city/oblast shapes are the common cases). Keep enough horizontal
            // runway to leave that blocker before turning around it; clamping
            // to the source/card span made those routes impossible and forced
            // a straight fallback through the blocker.
            var detourLeft = Number.isFinite(Number(settings.routeLeft))
                ? Number(settings.routeLeft)
                : minimumX - 160;
            var detourRight = Number.isFinite(Number(settings.routeRight))
                ? Number(settings.routeRight)
                : maximumX + 160;
            entryX = clamp(entryX, detourLeft, detourRight);
            exitX = clamp(exitX, detourLeft, detourRight);
        } else {
            entryX = exitX = (Number(point.x) + portX) / 2;
        }
        if (direction < 0 && entryX < exitX || direction > 0 && entryX > exitX) {
            var corridorMiddle = (entryX + exitX) / 2;
            entryX = corridorMiddle;
            exitX = corridorMiddle;
        }
        var candidateYs = [
            blockerTop - clearance,
            blockerBottom + clearance
        ].map(function(value) {
            return clamp(value, routeTop, routeBottom);
        }).filter(function(value, index, values) {
            return Number.isFinite(value) && values.indexOf(value) === index;
        });
        var sourceInsideBlockerBounds = pointX >= blockerLeft && pointX <= blockerRight &&
            pointY >= blockerTop && pointY <= blockerBottom;
        var routeIndex = Math.max(0, Number(entry && entry.portIndex) || 0);
        var routeCount = Math.max(1, Number(entry && entry.sideCount) || 1);
        var candidates = avoidRoutes.length ? routeEscapeCandidates.slice() : [];
        if (avoidRoutes.length) {
            // Keep the direct route in the comparison set. A direct route may
            // graze another active shape, but it is still preferable to a
            // large loop if it is the only short route that does not crowd a
            // previously planned leader. Map-fill avoidance is deliberately a
            // later tie-breaker for multi-leader routing.
            var directExcursion = verticalExcursion(
                direct,
                pointY,
                portY,
                settings.samplesPerSegment
            );
            candidates.unshift({
                candidate: direct,
                evaluation: directEvaluation,
                score: directEvaluation.length,
                verticalExcursion: directExcursion.total,
                smooth: true,
                sourceExitUsed: false,
                waypointY: portY,
                approachExitX: portX,
                requiredApproachRun: Math.abs(portX - pointX),
                candidateSource: 'direct',
                side: 'direct'
            });
        }
        routeEscapeCandidates.forEach(function(candidate) {
            candidate.routeCrossings = routeCrossingCount(
                candidate.candidate,
                cardX,
                avoidRoutes
            );
        });
        var safeMargin = Math.max(8, clearance + 6);
        var safeYValues = [
            blockerTop - safeMargin,
            blockerBottom + safeMargin
        ].map(function(value) {
            return clamp(value, routeTop, routeBottom);
        }).filter(function(value, index, values) {
            return Number.isFinite(value) && values.indexOf(value) === index;
        });
        var routeLeft = Number.isFinite(Number(settings.routeLeft))
            ? Number(settings.routeLeft)
            : -Infinity;
        var routeRight = Number.isFinite(Number(settings.routeRight))
            ? Number(settings.routeRight)
            : Infinity;
        var outerXValues = [
            blockerLeft - corridorPadding,
            blockerRight + corridorPadding
        ].map(function(value) {
            return clamp(value, routeLeft, routeRight);
        }).filter(function(value, index, values) {
            return Number.isFinite(value) && values.indexOf(value) === index;
        });

        function addRoundedDetour(points, safeY, radius) {
            var candidate = roundedGridCandidate(points, cardX, radius);
            var evaluation = evaluateBezierCandidate(candidate, obstacles, settings.samplesPerSegment);
            var excursion = verticalExcursion(candidate, pointY, portY, settings.samplesPerSegment);
            candidates.push({
                candidate: candidate,
                evaluation: evaluation,
                score: evaluation.collisionCount * 1000000 + evaluation.length +
                    Math.abs(safeY - Number(point.y)) + Math.abs(safeY - portY) * 0.22 +
                    Math.max(0, candidate.segments.length - 1) * 16 +
                    excursion.total * 12 + radius * 0.5,
                verticalExcursion: excursion.total,
                sourceExitUsed: false,
                waypointY: safeY,
                approachExitX: portX,
                requiredApproachRun: Math.abs(portX - pointX),
                side: safeY < (blockerTop + blockerBottom) / 2 ? 'above' : 'below'
            });
        }

        function addSmoothEnvelopeDetour(safeY, tension) {
            var midpointX = (pointX + portX) / 2;
            var candidate = detourPortCandidate(
                point,
                [{ x: midpointX, y: safeY }],
                portX,
                portY,
                cardX,
                tension
            );
            var evaluation = evaluateBezierCandidate(candidate, obstacles, settings.samplesPerSegment);
            var excursion = verticalExcursion(candidate, pointY, portY, settings.samplesPerSegment);
            candidates.push({
                candidate: candidate,
                evaluation: evaluation,
                score: evaluation.collisionCount * 1000000 + evaluation.length +
                    Math.abs(safeY - Number(point.y)) + Math.abs(safeY - portY) * 0.22 +
                    (1 - tension) * 18 + excursion.total * 12,
                verticalExcursion: excursion.total,
                smooth: true,
                sourceExitUsed: false,
                waypointY: safeY,
                approachExitX: midpointX,
                requiredApproachRun: Math.abs(midpointX - portX),
                candidateSource: 'envelope-smooth',
                side: safeY < (blockerTop + blockerBottom) / 2 ? 'above' : 'below'
            });
        }

        function addSingleSplineObstacleDetour(safeY, handleFraction) {
            var verticalDirection = safeY < pointY ? -1 : 1;
            var requestedExcursion = Math.max(
                36,
                Math.abs(safeY - pointY) * 2.15,
                leaderClearance * 3
            );
            var bowY = clamp(
                pointY + verticalDirection * requestedExcursion,
                routeTop,
                routeBottom
            );
            var candidate = singleSplineFanCandidate(
                point,
                portX,
                portY,
                cardX,
                bowY,
                handleFraction
            );
            var evaluation = evaluateBezierCandidate(
                candidate,
                obstacles,
                settings.samplesPerSegment
            );
            var excursion = verticalExcursion(
                candidate,
                pointY,
                portY,
                settings.samplesPerSegment
            );
            candidates.push({
                candidate: candidate,
                evaluation: evaluation,
                score: evaluation.collisionCount * 1000000 + evaluation.length +
                    excursion.total * 7 + Math.abs(handleFraction - 0.30) * 24,
                verticalExcursion: excursion.total,
                smooth: true,
                sourceExitUsed: false,
                waypointY: bowY,
                approachExitX: portX,
                requiredApproachRun: Math.abs(portX - pointX),
                candidateSource: 'obstacle-fan-single',
                side: safeY < (blockerTop + blockerBottom) / 2 ? 'above' : 'below'
            });
        }

        safeYValues.forEach(function(safeY) {
            [0.18, 0.30, 0.42, 0.48].forEach(function(handleFraction) {
                addSingleSplineObstacleDetour(safeY, handleFraction);
            });
            [0.9, 0.68, 0.48].forEach(function(tension) {
                addSmoothEnvelopeDetour(safeY, tension);
            });
            [8, 0].forEach(function(radius) {
                addRoundedDetour([
                    { x: pointX, y: pointY },
                    { x: pointX, y: safeY },
                    { x: portX, y: safeY },
                    { x: portX, y: portY }
                ], safeY, radius);
                outerXValues.forEach(function(outerX) {
                    addRoundedDetour([
                        { x: pointX, y: pointY },
                        { x: outerX, y: pointY },
                        { x: outerX, y: safeY },
                        { x: portX, y: safeY },
                        { x: portX, y: portY }
                    ], safeY, radius);
                });
            });
        });
        candidateYs.forEach(function(waypointY) {
            var above = waypointY < (blockerTop + blockerBottom) / 2;
            var safeDirection = above ? -1 : 1;
            var separationIndex = above
                ? Math.max(0, routeCount - 1 - routeIndex)
                : routeIndex;
            var routeSeparation = sourceInsideBlockerBounds
                ? 0
                : Math.min(40, separationIndex * 10);
            var corridorY = clamp(
                waypointY + safeDirection * routeSeparation,
                routeTop,
                routeBottom
            );
            var corridorSpan = Math.abs(entryX - exitX);
            var curveDepth = Math.min(28, Math.max(11, corridorSpan * 0.1));
            var sourceExit = avoidRoutes.length
                ? null
                : findSourceExit(
                    point,
                    { x: entryX, y: corridorY + safeDirection * curveDepth },
                    settings.sourceObstacles,
                    routeTop,
                    routeBottom
                );
            var waypoints = [];
            if (sourceExit && Math.hypot(
                sourceExit.x - Number(point.x),
                sourceExit.y - Number(point.y)
            ) > 2) {
                waypoints.push(sourceExit);
            }
            if (sourceInsideBlockerBounds && Math.abs(entryX - pointX) > 2) {
                waypoints.push({ x: entryX, y: pointY });
            }
            var entryWaypointY = clamp(
                corridorY + safeDirection * curveDepth,
                routeTop,
                routeBottom
            );
            if (sourceInsideBlockerBounds && Math.abs(entryWaypointY - pointY) > 2) {
                // Try a vertical source escape as well as the horizontal one.
                // The source may sit in a concavity of the neighboring shape,
                // so only one of these cardinal exits may be clear.
                waypoints.push({ x: pointX, y: entryWaypointY });
            }
            var exitWaypointY = clamp(
                corridorY + safeDirection * curveDepth * 0.35,
                routeTop,
                routeBottom
            );
            var requiredApproachRun = Math.min(
                190,
                Math.max(72, Math.abs(exitWaypointY - portY) * 0.58 + 34)
            );
            var approachExitX = exitX;
            if (direction < 0) {
                approachExitX = Math.max(
                    exitX,
                    Math.min(entryX - 16, portX + requiredApproachRun)
                );
            } else {
                approachExitX = Math.min(
                    exitX,
                    Math.max(entryX + 16, portX - requiredApproachRun)
                );
            }
            waypoints.push(
                {
                    x: entryX,
                    y: entryWaypointY
                },
                {
                    x: approachExitX,
                    y: exitWaypointY
                }
            );
            var waypointVariants = [[]];
            waypoints.forEach(function(waypoint) {
                waypointVariants.push([waypoint]);
            });
            for (var prefixLength = 2; prefixLength <= waypoints.length; prefixLength += 1) {
                waypointVariants.push(waypoints.slice(0, prefixLength));
            }
            if (waypoints.length > 1) waypointVariants.push(waypoints.slice());
            var uniqueWaypointVariants = waypointVariants.filter(function(variant, variantIndex, variants) {
                var key = variant.map(function(candidatePoint) {
                    return Math.round(candidatePoint.x * 10) + ':' + Math.round(candidatePoint.y * 10);
                }).join('|');
                return variants.findIndex(function(otherVariant) {
                    return otherVariant.map(function(candidatePoint) {
                        return Math.round(candidatePoint.x * 10) + ':' + Math.round(candidatePoint.y * 10);
                    }).join('|') === key;
                }) === variantIndex;
            });
            uniqueWaypointVariants.forEach(function(variant) {
                [0.9, 0.68, 0.48].forEach(function(tension) {
                    var candidate = detourPortCandidate(
                        point,
                        variant,
                        portX,
                        portY,
                        cardX,
                        tension
                    );
                    var evaluation = evaluateBezierCandidate(candidate, obstacles, settings.samplesPerSegment);
                    var excursion = verticalExcursion(
                        candidate,
                        pointY,
                        portY,
                        settings.samplesPerSegment
                    );
                    var verticalCost = Math.abs(corridorY - Number(point.y)) +
                        Math.abs(corridorY - portY) * 0.22;
                    var smoothnessCost = (1 - tension) * 18;
                    var complexityCost = Math.max(0, candidate.segments.length - 1) * 16;
                    var directionalityCost = excursion.total * 12;
                    candidates.push({
                        candidate: candidate,
                        evaluation: evaluation,
                        score: evaluation.collisionCount * 1000000 + evaluation.length +
                            verticalCost + smoothnessCost + complexityCost + directionalityCost,
                        verticalExcursion: excursion.total,
                        smooth: true,
                        sourceExitUsed: Boolean(sourceExit && variant.indexOf(sourceExit) !== -1),
                        waypointY: corridorY,
                        approachExitX: approachExitX,
                        requiredApproachRun: requiredApproachRun,
                        candidateSource: 'corridor-smooth',
                        side: above ? 'above' : 'below'
                    });
                });
                if (sourceInsideBlockerBounds) {
                    [8, 4, 0].forEach(function(radius) {
                        var roundedCandidate = roundedGridCandidate(
                            [{ x: pointX, y: pointY }]
                                .concat(variant)
                                .concat([{ x: portX, y: portY }]),
                            cardX,
                            radius
                        );
                        var roundedEvaluation = evaluateBezierCandidate(
                            roundedCandidate,
                            obstacles,
                            settings.samplesPerSegment
                        );
                        var roundedExcursion = verticalExcursion(
                            roundedCandidate,
                            pointY,
                            portY,
                            settings.samplesPerSegment
                        );
                        candidates.push({
                            candidate: roundedCandidate,
                            evaluation: roundedEvaluation,
                            score: roundedEvaluation.collisionCount * 1000000 +
                                roundedEvaluation.length +
                                Math.abs(corridorY - Number(point.y)) +
                                Math.abs(corridorY - portY) * 0.22 +
                                Math.max(0, roundedCandidate.segments.length - 1) * 16 +
                                roundedExcursion.total * 12 + radius * 0.5,
                            verticalExcursion: roundedExcursion.total,
                            sourceExitUsed: Boolean(sourceExit && variant.indexOf(sourceExit) !== -1),
                            waypointY: corridorY,
                            approachExitX: approachExitX,
                            requiredApproachRun: requiredApproachRun,
                            candidateSource: 'corridor-rounded',
                            side: above ? 'above' : 'below'
                        });
                    });
                }
            });
        });
        if (avoidRoutes.length) {
            var routeLaneYValues = [
                clamp(routeTop + 18, routeTop, routeBottom),
                clamp(routeBottom - 18, routeTop, routeBottom)
            ];
            routeLaneYValues.filter(function(value, index, values) {
                return Number.isFinite(value) && values.indexOf(value) === index;
            }).forEach(function(laneY) {
                [0.84, 0.62, 0.42].forEach(function(tension) {
                    var laneCandidate = detourPortCandidate(
                        point,
                        [
                            { x: pointX, y: laneY },
                            { x: portX, y: laneY }
                        ],
                        portX,
                        portY,
                        cardX,
                        tension
                    );
                    var laneEvaluation = evaluateBezierCandidate(
                        laneCandidate,
                        obstacles,
                        settings.samplesPerSegment
                    );
                    var laneExcursion = verticalExcursion(
                        laneCandidate,
                        pointY,
                        portY,
                        settings.samplesPerSegment
                    );
                    candidates.push({
                        candidate: laneCandidate,
                        evaluation: laneEvaluation,
                        score: laneEvaluation.collisionCount * 1000000 +
                            laneEvaluation.length + laneExcursion.total * 12 +
                            Math.abs(laneY - pointY) * 0.2 + (1 - tension) * 18,
                        verticalExcursion: laneExcursion.total,
                        smooth: true,
                        sourceExitUsed: false,
                        waypointY: laneY,
                        approachExitX: portX,
                        requiredApproachRun: Math.abs(portX - pointX),
                        candidateSource: 'route-lane-smooth',
                        side: laneY < (pointY + portY) / 2 ? 'above' : 'below'
                    });
                });
            });
        }
        candidates.forEach(function(candidate) {
            candidate.routeCrossings = routeCrossingCount(
                candidate.candidate,
                cardX,
                avoidRoutes
            );
            candidate.routeCrowding = routeCrowdingMetrics(
                candidate.candidate,
                cardX,
                avoidRoutes,
                leaderClearance
            );
            candidate.directionality = routeDirectionalityMetrics(
                candidate.candidate,
                side,
                settings.samplesPerSegment
            );
            candidate.naturalnessPenalty = routeNaturalnessPenalty(candidate.candidate);
            candidate.score += candidate.routeCrossings * 1000000 +
                candidate.routeCrowding.score * 1200 +
                candidate.naturalnessPenalty +
                candidate.directionality.reversalCount * 100000 +
                candidate.directionality.reverseDistance * 10000 +
                candidate.directionality.controlReverseDistance * 10000 +
                (candidate.directionality.terminalBoxTurn ? 500000 : 0);
            candidate.selfIntersection = candidateHasSelfIntersection(
                candidate.candidate,
                cardX
            );
        });

        if (avoidRoutes.length) {
            function directness(candidate) {
                return (Number(candidate.evaluation && candidate.evaluation.length) || Infinity) +
                    (Number(candidate.verticalExcursion) || 0) * 6 +
                    Math.max(0, (candidate.candidate.segments || []).length - 1) * 12 +
                    (candidate.sourceExitUsed ? 72 : 0) +
                    (Number(candidate.naturalnessPenalty) || 0) +
                    (Number(candidate.directionality && candidate.directionality.reversalCount) || 0) * 100000 +
                    (Number(candidate.directionality && candidate.directionality.reverseDistance) || 0) * 10000 +
                    (Number(candidate.directionality && candidate.directionality.controlReverseDistance) || 0) * 10000 +
                    (candidate.directionality && candidate.directionality.terminalBoxTurn ? 500000 : 0);
            }

            function compareDirectness(first, second) {
                var firstValue = directness(first);
                var secondValue = directness(second);
                var smoothTolerance = Math.max(
                    36,
                    Math.min(160, Math.max(firstValue, secondValue) * 0.18)
                );
                if (settings.preferSmooth && first.smooth !== second.smooth &&
                    Math.abs(firstValue - secondValue) <= smoothTolerance) {
                    return first.smooth ? -1 : 1;
                }
                if (Math.abs(firstValue - secondValue) > 0.5) return firstValue - secondValue;
                if (first.evaluation.collisionCount !== second.evaluation.collisionCount) {
                    return first.evaluation.collisionCount - second.evaluation.collisionCount;
                }
                if ((first.routeCrossings || 0) !== (second.routeCrossings || 0)) {
                    return (first.routeCrossings || 0) - (second.routeCrossings || 0);
                }
                return Number(first.routeCrowding && first.routeCrowding.score || 0) -
                    Number(second.routeCrowding && second.routeCrowding.score || 0);
            }

            var selfClearForCrowding = candidates.filter(function(candidate) {
                return !candidate.selfIntersection;
            });
            var crowdingPool = selfClearForCrowding.length
                ? selfClearForCrowding
                : candidates;
            var monotonicCrowdingPool = crowdingPool.filter(function(candidate) {
                return candidate.sourceExitUsed ||
                    Number(candidate.directionality && candidate.directionality.reverseDistance || 0) <= 0.5 &&
                    Number(candidate.directionality && candidate.directionality.controlReverseDistance || 0) <= 0.5 &&
                    !(candidate.directionality && candidate.directionality.terminalBoxTurn);
            });
            if (monotonicCrowdingPool.length) crowdingPool = monotonicCrowdingPool;
            var bestDirectRoute = crowdingPool.slice().sort(compareDirectness)[0];
            var noCrowdingRoutes = crowdingPool.filter(function(candidate) {
                return (candidate.routeCrossings || 0) === 0 &&
                    routeMaintainsClearance(candidate.routeCrowding);
            }).sort(compareDirectness);
            var noSourceExitRoutes = noCrowdingRoutes.filter(function(candidate) {
                return !candidate.sourceExitUsed;
            });
            if (noSourceExitRoutes.length) noCrowdingRoutes = noSourceExitRoutes;
            var bestNoCrowdingRoute = noCrowdingRoutes[0];
            if (bestDirectRoute && bestNoCrowdingRoute) {
                var mapClearNoCrowdingRoute = noCrowdingRoutes.filter(function(candidate) {
                    return candidate.evaluation.collisionCount === 0;
                }).sort(compareDirectness)[0];
                var preferredNoCrowdingRoute = bestNoCrowdingRoute;
                if (mapClearNoCrowdingRoute &&
                    directness(mapClearNoCrowdingRoute) <= directness(bestNoCrowdingRoute) +
                        Math.max(36, Math.min(140, directness(bestNoCrowdingRoute) * 0.16))) {
                    preferredNoCrowdingRoute = mapClearNoCrowdingRoute;
                }
                // A modest detour is worth taking to remove a crossover, but
                // never allow the anti-crowding pass to turn a short leader
                // into the kind of long U-shaped loop this router is meant
                // to avoid.
                var acceptableDetour = Math.max(
                    48,
                    Math.min(420, directness(bestDirectRoute) * 0.45)
                );
                var selectedCrowdingRoute = directness(preferredNoCrowdingRoute) <=
                    directness(bestDirectRoute) + acceptableDetour
                    ? preferredNoCrowdingRoute
                    : bestDirectRoute;
                return localCandidateResult(
                    selectedCrowdingRoute,
                    selectedCrowdingRoute.verticalExcursion <= 0.5 ? 'strict' : 'expanded'
                );
            }
        }
        var clearCandidates = candidates.filter(function(candidate) {
            return candidate.evaluation.collisionCount === 0;
        });
        var routeClearCandidates = clearCandidates.filter(function(candidate) {
            return candidate.routeCrossings === 0 &&
                routeMaintainsClearance(candidate.routeCrowding);
        });
        var routeSelectableCandidates = routeClearCandidates.length
            ? routeClearCandidates
            : clearCandidates;
        var selfClearCandidates = routeSelectableCandidates.filter(function(candidate) {
            return !candidate.selfIntersection;
        });
        var selectableCandidates = selfClearCandidates.length
            ? selfClearCandidates
            : routeSelectableCandidates;
        var monotonicCandidates = selectableCandidates.filter(function(candidate) {
            return candidate.sourceExitUsed ||
                Number(candidate.directionality && candidate.directionality.reverseDistance || 0) <= 0.5 &&
                Number(candidate.directionality && candidate.directionality.controlReverseDistance || 0) <= 0.5 &&
                !(candidate.directionality && candidate.directionality.terminalBoxTurn);
        });
        if (monotonicCandidates.length) selectableCandidates = monotonicCandidates;
        var noSourceExitCandidates = selectableCandidates.filter(function(candidate) {
            return !candidate.sourceExitUsed;
        });
        if (noSourceExitCandidates.length) selectableCandidates = noSourceExitCandidates;
        var strictCandidates = selectableCandidates.filter(function(candidate) {
            return candidate.verticalExcursion <= 0.5;
        }).sort(function(first, second) {
            if ((settings.preferSmooth || !avoidRoutes.length) && first.smooth !== second.smooth) {
                return first.smooth ? -1 : 1;
            }
            return first.score - second.score;
        });
        var expandedCandidates = selectableCandidates.filter(function(candidate) {
            return candidate.verticalExcursion > 0.5;
        }).sort(function(first, second) {
            if ((settings.preferSmooth || !avoidRoutes.length) && first.smooth !== second.smooth) {
                return first.smooth ? -1 : 1;
            }
            if (first.score !== second.score) return first.score - second.score;
            return first.verticalExcursion - second.verticalExcursion;
        });

        function localCandidateResult(selected, routingEnvelope) {
            return {
                path: selected.candidate.path,
                routeSegments: routeSegmentsForCandidate(selected.candidate, cardX),
                portX: portX,
                portY: portY,
                cardStubLength: Math.abs(portX - cardX),
                adaptiveCardStub: adaptiveCardStub,
                waypointEntryX: entryX,
                waypointExitX: selected.approachExitX,
                requiredApproachRun: selected.requiredApproachRun,
                waypointY: selected.waypointY,
                verticalExcursion: selected.verticalExcursion,
                routingEnvelope: routingEnvelope,
                sourceExitUsed: selected.sourceExitUsed,
                avoidance: selected.side,
                directCollisionCount: directEvaluation.collisionCount,
                collisionCount: Number(selected.evaluation && selected.evaluation.collisionCount) || 0,
                routeCrossings: selected.routeCrossings || 0,
                routeCrowding: Number(selected.routeCrowding && selected.routeCrowding.score) || 0,
                routeCrowdedLength: Number(selected.routeCrowding && selected.routeCrowding.crowdedLength) || 0,
                minimumRouteGap: selected.routeCrowding
                    ? selected.routeCrowding.minimumDistance
                    : Infinity,
                avoidedObstacleCount: Math.max(
                    0,
                    directEvaluation.collisionCount -
                        (Number(selected.evaluation && selected.evaluation.collisionCount) || 0)
                ),
                fallback: false,
                selfIntersection: Boolean(selected.selfIntersection),
                smooth: Boolean(selected.smooth),
                candidateSource: selected.candidateSource || 'local',
                directionReversalCount: Number(selected.directionality && selected.directionality.reversalCount) || 0,
                reverseDistance: Number(selected.directionality && selected.directionality.reverseDistance) || 0,
                controlReverseDistance: Number(selected.directionality && selected.directionality.controlReverseDistance) || 0,
                terminalApproachRun: Number(selected.directionality && selected.directionality.terminalApproachRun) || 0,
                terminalBoxTurn: Boolean(selected.directionality && selected.directionality.terminalBoxTurn)
            };
        }

        if (strictCandidates.length) return localCandidateResult(strictCandidates[0], 'strict');

        var routeBarrierObstacles = [];
        if (!routeClearCandidates.length && avoidRoutes.length) {
            routeBarrierObstacles = avoidRoutes.map(function(route, routeIndex) {
                var bounds = routeBounds(route);
                if (!bounds) return null;
                return {
                    id: 'leader-route-barrier-' + routeIndex,
                    left: bounds.left - 8,
                    right: bounds.right + 8,
                    top: bounds.top - 8,
                    bottom: bounds.bottom + 8,
                    routeOnly: true
                };
            }).filter(Boolean);
        }
        var gridObstacles = obstacles.concat(routeBarrierObstacles);

        function gridCandidateResult(gridPath, routingEnvelope, requireStrictEnvelope) {
            if (!gridPath || gridPath.length < 2) return null;
            var gridCandidate = detourPortCandidate(
                point,
                gridPath.slice(1, -1),
                portX,
                portY,
                cardX
            );
            var gridEvaluation = evaluateBezierCandidate(gridCandidate, gridObstacles, settings.samplesPerSegment);
            var gridExcursion = verticalExcursion(
                gridCandidate,
                pointY,
                portY,
                settings.samplesPerSegment
            );
            var gridRouteCrossings = routeCrossingCount(gridCandidate, cardX, avoidRoutes);
            var gridRouteCrowding = routeCrowdingMetrics(
                gridCandidate, cardX, avoidRoutes, leaderClearance
            );
            if (
                gridEvaluation.collisionCount === 0 &&
                (!requireStrictEnvelope || gridExcursion.total <= 0.5) &&
                gridRouteCrossings === 0 &&
                !gridRouteCrowding.significant
            ) {
                return {
                    path: gridCandidate.path,
                    routeSegments: routeSegmentsForCandidate(gridCandidate, cardX),
                    portX: portX,
                    portY: portY,
                    cardStubLength: Math.abs(portX - cardX),
                    adaptiveCardStub: adaptiveCardStub,
                    verticalExcursion: gridExcursion.total,
                    routingEnvelope: gridExcursion.total <= 0.5 ? 'strict' : routingEnvelope,
                    avoidance: 'grid',
                    directCollisionCount: directEvaluation.collisionCount,
                    collisionCount: 0,
                    routeCrossings: 0,
                    routeCrowding: gridRouteCrowding.score,
                    routeCrowdedLength: gridRouteCrowding.crowdedLength,
                    minimumRouteGap: gridRouteCrowding.minimumDistance,
                    avoidedObstacleCount: directEvaluation.collisionCount,
                    gridPointCount: gridPath.length,
                    sourceExitUsed: false,
                    fallback: false,
                    selfIntersection: false,
                    smooth: true
                };
            }
            // The default spline tension can cut across a tight grid corner,
            // causing the router to fall back to a visibly rectangular path.
            // Try progressively tighter splines before accepting hard grid
            // corners; this preserves clearance without drawing a large U.
            var gridTensions = [0.66, 0.54, 0.42, 0.3];
            for (var tensionIndex = 0; tensionIndex < gridTensions.length; tensionIndex += 1) {
                var tunedCandidate = detourPortCandidate(
                    point,
                    gridPath.slice(1, -1),
                    portX,
                    portY,
                    cardX,
                    gridTensions[tensionIndex]
                );
                var tunedEvaluation = evaluateBezierCandidate(
                    tunedCandidate,
                    gridObstacles,
                    settings.samplesPerSegment
                );
                var tunedExcursion = verticalExcursion(
                    tunedCandidate,
                    pointY,
                    portY,
                    settings.samplesPerSegment
                );
                var tunedRouteCrossings = routeCrossingCount(tunedCandidate, cardX, avoidRoutes);
                var tunedRouteCrowding = routeCrowdingMetrics(
                    tunedCandidate, cardX, avoidRoutes, leaderClearance
                );
                if (
                    tunedEvaluation.collisionCount === 0 &&
                    (!requireStrictEnvelope || tunedExcursion.total <= 0.5) &&
                    tunedRouteCrossings === 0 &&
                    !tunedRouteCrowding.significant
                ) {
                    return {
                        path: tunedCandidate.path,
                        routeSegments: routeSegmentsForCandidate(tunedCandidate, cardX),
                        portX: portX,
                        portY: portY,
                        cardStubLength: Math.abs(portX - cardX),
                        adaptiveCardStub: adaptiveCardStub,
                        verticalExcursion: tunedExcursion.total,
                        routingEnvelope: tunedExcursion.total <= 0.5 ? 'strict' : routingEnvelope,
                        avoidance: 'grid',
                        directCollisionCount: directEvaluation.collisionCount,
                        collisionCount: 0,
                        routeCrossings: 0,
                        routeCrowding: tunedRouteCrowding.score,
                        routeCrowdedLength: tunedRouteCrowding.crowdedLength,
                        minimumRouteGap: tunedRouteCrowding.minimumDistance,
                        avoidedObstacleCount: directEvaluation.collisionCount,
                        gridPointCount: gridPath.length,
                        gridTension: gridTensions[tensionIndex],
                        sourceExitUsed: false,
                        fallback: false,
                        selfIntersection: false,
                        smooth: true
                    };
                }
            }
            var roundingRadii = [10, 6, 3, 0];
            for (var radiusIndex = 0; radiusIndex < roundingRadii.length; radiusIndex += 1) {
                var roundedCandidate = roundedGridCandidate(
                    gridPath,
                    cardX,
                    roundingRadii[radiusIndex]
                );
                var roundedEvaluation = evaluateBezierCandidate(
                    roundedCandidate,
                    gridObstacles,
                    settings.samplesPerSegment
                );
                var roundedExcursion = verticalExcursion(
                    roundedCandidate,
                    pointY,
                    portY,
                    settings.samplesPerSegment
                );
                var roundedRouteCrossings = routeCrossingCount(roundedCandidate, cardX, avoidRoutes);
                var roundedRouteCrowding = routeCrowdingMetrics(
                    roundedCandidate, cardX, avoidRoutes, leaderClearance
                );
                if (
                    roundedEvaluation.collisionCount === 0 &&
                    (!requireStrictEnvelope || roundedExcursion.total <= 0.5) &&
                    roundedRouteCrossings === 0 &&
                    !roundedRouteCrowding.significant
                ) {
                    return {
                        path: roundedCandidate.path,
                        routeSegments: routeSegmentsForCandidate(roundedCandidate, cardX),
                        portX: portX,
                        portY: portY,
                        cardStubLength: Math.abs(portX - cardX),
                        adaptiveCardStub: adaptiveCardStub,
                        verticalExcursion: roundedExcursion.total,
                        routingEnvelope: roundedExcursion.total <= 0.5 ? 'strict' : routingEnvelope,
                        avoidance: 'grid',
                        directCollisionCount: directEvaluation.collisionCount,
                        collisionCount: 0,
                        routeCrossings: 0,
                        routeCrowding: roundedRouteCrowding.score,
                        routeCrowdedLength: roundedRouteCrowding.crowdedLength,
                        minimumRouteGap: roundedRouteCrowding.minimumDistance,
                        avoidedObstacleCount: directEvaluation.collisionCount,
                        gridPointCount: gridPath.length,
                        gridCornerRadius: roundingRadii[radiusIndex],
                        sourceExitUsed: false,
                        fallback: false,
                        selfIntersection: false,
                        smooth: false
                    };
                }
            }
            return null;
        }

        var strictGridPath = endpointEnvelopeBottom >= endpointEnvelopeTop
            ? findGridRoute(
                { x: Number(point.x), y: Number(point.y) },
                { x: portX, y: portY },
                    gridObstacles,
                {
                    routeTop: endpointEnvelopeTop,
                    routeBottom: endpointEnvelopeBottom,
                    routeLeft: settings.routeLeft,
                    routeRight: settings.routeRight,
                    gridStep: settings.gridStep
                }
            )
            : null;
        var strictGridResult = gridCandidateResult(strictGridPath, 'strict', true);
        if (strictGridResult) return strictGridResult;

        var gridPath = findGridRoute(
            { x: Number(point.x), y: Number(point.y) },
            { x: portX, y: portY },
                gridObstacles,
            {
                routeTop: routeTop,
                routeBottom: routeBottom,
                routeLeft: settings.routeLeft,
                routeRight: settings.routeRight,
                gridStep: settings.gridStep
            }
        );
        var expandedGridResult = gridCandidateResult(gridPath, 'expanded', false);
        if (expandedGridResult && expandedGridResult.routingEnvelope === 'strict') {
            return expandedGridResult;
        }

        var expandedLocalResult = expandedCandidates.length
            ? localCandidateResult(expandedCandidates[0], 'expanded')
            : null;
        if (expandedLocalResult && expandedGridResult) {
            return expandedLocalResult.verticalExcursion <= expandedGridResult.verticalExcursion
                ? expandedLocalResult
                : expandedGridResult;
        }
        if (expandedLocalResult) return expandedLocalResult;
        if (expandedGridResult) return expandedGridResult;

        baseResult.avoidance = 'fallback';
        baseResult.fallback = true;
        baseResult.fallbackReason = 'no-clear-corridor';
        return baseResult;
    }

    function markerCandidateOffsets(step, rings) {
        var offsets = [[0, 0]];
        for (var ring = 1; ring <= rings; ring += 1) {
            var distance = ring * step;
            offsets.push(
                [0, -distance],
                [0, distance],
                [-distance, 0],
                [distance, 0],
                [-distance, -distance],
                [distance, -distance],
                [-distance, distance],
                [distance, distance]
            );
        }
        return offsets;
    }

    function planIndexedMarkers(entries, options) {
        var settings = options || {};
        var markerRadius = Math.max(9, Number(settings.markerRadius) || 12);
        var minimumDistance = Math.max(markerRadius * 2 + 4, Number(settings.minimumDistance) || 30);
        var candidateStep = Math.max(markerRadius * 2, Number(settings.candidateStep) || 26);
        var candidateRings = Math.max(2, Number(settings.candidateRings) || 4);
        var left = Number.isFinite(Number(settings.left)) ? Number(settings.left) : -Infinity;
        var right = Number.isFinite(Number(settings.right)) ? Number(settings.right) : Infinity;
        var top = Number.isFinite(Number(settings.top)) ? Number(settings.top) : -Infinity;
        var bottom = Number.isFinite(Number(settings.bottom)) ? Number(settings.bottom) : Infinity;
        var offsets = markerCandidateOffsets(candidateStep, candidateRings);
        var planned = [];
        var ordered = (entries || []).slice().sort(function(first, second) {
            var firstIndex = Number(first.markerIndex) || Number(first.index) + 1 || 0;
            var secondIndex = Number(second.markerIndex) || Number(second.index) + 1 || 0;
            return firstIndex - secondIndex;
        });

        ordered.forEach(function(entry) {
            var anchorX = Number(entry.point && entry.point.x) || 0;
            var anchorY = Number(entry.point && entry.point.y) || 0;
            var candidates = offsets.map(function(offset) {
                var x = clamp(anchorX + offset[0], left + markerRadius, right - markerRadius);
                var y = clamp(anchorY + offset[1], top + markerRadius, bottom - markerRadius);
                var nearest = planned.length
                    ? Math.min.apply(null, planned.map(function(existing) {
                        return Math.hypot(x - existing.markerX, y - existing.markerY);
                    }))
                    : Infinity;
                var displacement = Math.hypot(x - anchorX, y - anchorY);
                var overlapPenalty = nearest < minimumDistance
                    ? (minimumDistance - nearest) * 1000
                    : 0;
                return {
                    x: x,
                    y: y,
                    nearest: nearest,
                    displacement: displacement,
                    score: overlapPenalty + displacement
                };
            });
            candidates.sort(function(first, second) {
                if (first.score !== second.score) return first.score - second.score;
                return second.nearest - first.nearest;
            });
            var selected = candidates[0];
            var copy = {};
            Object.keys(entry).forEach(function(key) { copy[key] = entry[key]; });
            copy.markerX = selected.x;
            copy.markerY = selected.y;
            copy.markerRadius = markerRadius;
            copy.markerDisplacement = selected.displacement;
            copy.markerMoved = selected.displacement > 3;
            planned.push(copy);
        });

        return planned;
    }

    function buildOrthogonalLeaderPath(entry, geometry) {
        var settings = geometry || {};
        var point = entry && entry.point || { x: 0, y: 0 };
        var side = entry && entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? -1 : 1;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var endY = Number(settings.endY) || 0;
        var laneIndex = Math.max(0, Number(entry && entry.laneIndex) || 0);
        var approachLaneIndex = Math.max(
            0,
            Number.isFinite(Number(entry && entry.approachLaneIndex))
                ? Number(entry.approachLaneIndex)
                : laneIndex
        );
        var sideCount = Math.max(1, Number(entry && entry.sideCount) || 1);
        var leaderClearance = Math.max(10, Number(settings.leaderClearance) || 14);
        var routeY = Number.isFinite(Number(entry && entry.routeY))
            ? Number(entry.routeY)
            : Number(point.y) || 0;
        var desiredApproachSpacing = Math.max(18, leaderClearance + 6);
        var requestedApproachSpacing = Number(settings.approachSpacing);
        var approachSpacing = sideCount > 1
            ? (Number.isFinite(requestedApproachSpacing)
                ? Math.max(12, requestedApproachSpacing)
                : desiredApproachSpacing)
            : 0;
        // Medium regional maps should read as direct geographic callouts, not
        // as a routing diagram. Give each line a slightly different horizontal
        // approach lane, then connect the region to that lane with one cubic.
        // The final horizontal stub shares the cubic's tangent, producing a
        // smooth, monotonic path with no fan/bend hooks or multi-spline S-curves.
        var cardStub = Math.max(18, Number(settings.fanStub) || 22);
        var approachX = cardX - direction * (cardStub + approachLaneIndex * Math.min(6, approachSpacing * 0.22));
        if (side === 'left') {
            approachX = Math.min(Number(point.x) - 8, Math.max(cardX + 12, approachX));
        } else {
            approachX = Math.max(Number(point.x) + 8, Math.min(cardX - 12, approachX));
        }
        var smooth = directPortCandidate(point, approachX, endY, cardX, direction);

        return {
            path: smooth.path,
            routeSegments: routeSegmentsForCandidate(smooth, cardX),
            approachX: approachX,
            fanX: Number(point.x),
            routeY: routeY,
            endY: endY,
            smooth: true
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
            mode = regionSet && regionSet.defaultLandmass || 'continental';
            reason = 'region-set-default';
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
        // Ignore any legacy orientation fields. There is no supported rotated
        // regional-map projection; every result must remain north-up.
        var orientation = mapOrientation;
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
            orientation: orientation,
            rotation: orientation.rotation,
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
        var countHasBroadCoverage = longitudeCoverage >= 0.34 || latitudeCoverage >= 0.38;
        return longitudeCoverage >= minimumLongitudeCoverage ||
            activeCount >= minimumRegions && countHasBroadCoverage ||
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

        if (regionSet && regionSet.requireFullContext) {
            return {
                activeRegionIds: activeIds,
                excludedRegionIds: [],
                viewportMode: 'all',
                viewportAlignment: 'context',
                contextFit: 'all',
                visualCentering: false,
                centerShiftLongitude: 0,
                centerShiftLatitude: 0,
                contextRegionIds: Object.keys(featureById || {}),
                geoBounds: null
            };
        }

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
            nonContinentalRegionIds: Object.freeze(['RU-KGD', 'RU-SAK']),
            requireFullContext: false,
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
        mapOrientation: mapOrientation,
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
        getRegionalBreakdownPolicy: getRegionalBreakdownPolicy,
        planRegionalBreakdown: planRegionalBreakdown,
        balanceCalloutSides: balanceCalloutSides,
        resolveLeaderRouting: resolveLeaderRouting,
        distributeLeaderLanes: distributeLeaderLanes,
        planLeaderRoutes: planLeaderRoutes,
        planEdgePorts: planEdgePorts,
        optimizeCalloutPlacement: optimizeCalloutPlacement,
        scoreCalloutPlacement: scoreCalloutPlacement,
        planIndexedMarkers: planIndexedMarkers,
        buildOrthogonalLeaderPath: buildOrthogonalLeaderPath,
        buildPortLeaderPath: buildPortLeaderPath,
        sampledSegmentCrowding: sampledSegmentCrowding,
        routeCrowdingMetrics: routeCrowdingMetrics,
        routeSegmentSetCrowding: routeSegmentSetCrowding,
        regionalMapDefaults: regionalMapDefaults,
        regionalBreakdownPolicy: regionalBreakdownPolicy,
        visualPolicy: visualPolicy,
        regionSetIds: Object.freeze(Object.keys(sets))
    };
});
