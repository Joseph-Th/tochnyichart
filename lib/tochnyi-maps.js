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

    var regionalBreakdownPolicy = Object.freeze({
        portRoutingThreshold: 8,
        denseThreshold: 9,
        cardInset: 10,
        cardWidthDense: 210,
        cardWidthStandard: 226,
        cardGapDense: 7,
        cardGapStandard: 10,
        attachmentInsetDense: 14,
        attachmentInsetStandard: 16,
        portGapDense: 18,
        portGapStandard: 22,
        minimumCardStubDense: 36,
        minimumCardStubStandard: 32,
        shapeClearanceDense: 3.25,
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
        stageInset: 10
    });

    var regionalMapDefaults = Object.freeze({
        regionSet: 'russia',
        callouts: 'auto',
        calloutDistribution: 'auto',
        summaryPosition: 'auto',
        summaryDisplay: 'auto',
        viewport: 'auto',
        viewportAlignment: 'auto',
        contextFit: 'auto',
        landmass: 'auto',
        anchorStyle: 'auto',
        leaderRouting: 'auto'
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
            stageInset: regionalBreakdownPolicy.stageInset
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
        if (
            requested === 'direct' ||
            requested === 'lanes' ||
            requested === 'ports' ||
            requested === 'indexed'
        ) return requested;
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
            requestedRouting === 'auto' && planned.length >= 8
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
            var sideRouting = resolveLeaderRouting({ leaderRouting: settings.routing || 'auto' }, sideEntries);
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
        var ordered = (entries || []).slice().sort(function(first, second) {
            return first.point.y - second.point.y;
        });
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
        var portX = route.end.x - direction * minimumCardStub;
        var candidate = directPortCandidate(
            route.start,
            portX,
            route.end.y,
            route.end.x,
            direction
        );
        var points = [candidate.segments[0].start];
        candidate.segments.forEach(function(segment) {
            for (var sample = 1; sample <= 18; sample += 1) {
                points.push(cubicPoint(segment, sample / 18));
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
        return {
            crossings: crossings,
            length: length,
            verticalTravel: verticalTravel,
            maximumAttachmentSlope: maximumAttachmentSlope,
            attachmentSharpness: attachmentSharpness,
            switches: switches,
            score: crossings * 1000000000 + attachmentSharpness * 10000000 +
                maximumAttachmentSlope * 1000000 + length * 100 + verticalTravel * 8 + switches * 6
        };
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

        function evaluate(selectedIndexes) {
            var selected = {};
            selectedIndexes.forEach(function(index) { selected[index] = true; });
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

        function choose(start, remaining, selected) {
            if (remaining === 0) {
                evaluate(selected);
                return;
            }
            for (var index = start; index <= automatic.length - remaining; index += 1) {
                selected.push(index);
                choose(index + 1, remaining - 1, selected);
                selected.pop();
            }
        }
        choose(0, chooseLeft, []);
        if (!best) evaluate([]);
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
            minimumCardStub: policy.minimumCardStub
        };
        var placement = usePortRouting
            ? optimizeCalloutPlacement(all, placementOptions)
            : balanceCalloutSides(all, placementOptions);

        return {
            policy: policy,
            requestedRouting: requestedRouting,
            usePortRouting: usePortRouting,
            placementMode: usePortRouting ? 'crossing-optimized' : 'balanced-nearest-side',
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
        var padding = Math.max(0, Number(clearance) || 0);
        return {
            id: obstacle.id || obstacle.regionId || null,
            left: Math.min(left, right) - padding,
            right: Math.max(left, right) + padding,
            top: Math.min(top, bottom) - padding,
            bottom: Math.max(top, bottom) + padding,
            contains: typeof obstacle.contains === 'function' ? obstacle.contains : null,
            exactContains: typeof obstacle.exactContains === 'function' ? obstacle.exactContains : null,
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

    function evaluateBezierCandidate(candidate, obstacles, samplesPerSegment) {
        var collisions = {};
        var length = 0;
        var samples = Math.max(12, Number(samplesPerSegment) || 28);
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
        var samples = Math.max(12, Number(samplesPerSegment) || 28);
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

    function detourPortCandidate(point, waypoints, portX, portY, cardX, requestedTension) {
        var rawPoints = [{ x: Number(point.x), y: Number(point.y) }]
            .concat(waypoints || [])
            .concat([{ x: portX, y: portY }]);
        var points = rawPoints.filter(function(candidate, index) {
            if (!index) return true;
            var previous = rawPoints[index - 1];
            return Math.hypot(candidate.x - previous.x, candidate.y - previous.y) > 0.5;
        });
        var tension = clamp(Number(requestedTension) || 0.8, 0.2, 0.94);
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
        var step = Math.max(6, Number(options.gridStep) || 10);
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
        var radius = Math.max(0, Number(requestedRadius) || 0);
        var path = ['M', points[0].x, points[0].y];
        var segments = [];
        var cursor = points[0];
        for (var index = 1; index < points.length - 1; index += 1) {
            var previous = points[index - 1];
            var corner = points[index];
            var next = points[index + 1];
            var incomingLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
            var outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
            var cornerRadius = Math.min(radius, incomingLength / 3, outgoingLength / 3);
            if (cornerRadius <= 0.5) {
                path.push('L', corner.x, corner.y);
                segments.push(straightCubicSegment(cursor, corner));
                cursor = corner;
                continue;
            }
            var incomingUnit = {
                x: (corner.x - previous.x) / incomingLength,
                y: (corner.y - previous.y) / incomingLength
            };
            var outgoingUnit = {
                x: (next.x - corner.x) / outgoingLength,
                y: (next.y - corner.y) / outgoingLength
            };
            var before = {
                x: corner.x - incomingUnit.x * cornerRadius,
                y: corner.y - incomingUnit.y * cornerRadius
            };
            var after = {
                x: corner.x + outgoingUnit.x * cornerRadius,
                y: corner.y + outgoingUnit.y * cornerRadius
            };
            path.push('L', before.x, before.y, 'Q', corner.x, corner.y, after.x, after.y);
            segments.push(straightCubicSegment(cursor, before));
            segments.push({
                start: before,
                control1: {
                    x: before.x + (corner.x - before.x) * 2 / 3,
                    y: before.y + (corner.y - before.y) * 2 / 3
                },
                control2: {
                    x: after.x + (corner.x - after.x) * 2 / 3,
                    y: after.y + (corner.y - after.y) * 2 / 3
                },
                end: after
            });
            cursor = after;
        }
        var end = points[points.length - 1];
        path.push('L', end.x, end.y, 'H', cardX);
        segments.push(straightCubicSegment(cursor, end));
        return { path: path.join(' '), segments: segments };
    }

    function buildPortLeaderPath(entry, geometry) {
        var settings = geometry || {};
        var point = entry && entry.point || { x: 0, y: 0 };
        var side = entry && entry.side === 'right' ? 'right' : 'left';
        var direction = side === 'left' ? -1 : 1;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var pointX = Number(point.x);
        var pointY = Number(point.y);
        var portOffset = Math.max(6, Number(settings.portOffset) || 10);
        var minimumCardStub = Math.max(24, Number(settings.minimumCardStub) || 32);
        var availableCardGap = Math.abs(pointX - cardX);
        var adaptiveCardStub = availableCardGap < minimumCardStub * 3;
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
        var clearance = Math.max(3.25, Number(settings.obstacleClearance) || 10);
        var obstacles = (settings.obstacles || []).map(function(obstacle) {
            return normalizeObstacle(obstacle, clearance);
        }).filter(Boolean);
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
            if (!nearCardEvaluation.collisionCount) {
                return {
                    path: nearCard.path,
                    portX: pointX,
                    portY: pointY,
                    cardStubLength: nearCardDistance,
                    avoidance: 'near-card',
                    directCollisionCount: 0,
                    collisionCount: 0,
                    avoidedObstacleCount: 0,
                    sourceExitUsed: false,
                    adaptiveCardStub: true,
                    routingEnvelope: 'strict',
                    fallback: false
                };
            }
        }

        var direct = directPortCandidate(point, portX, portY, cardX, direction);
        var directEvaluation = evaluateBezierCandidate(direct, obstacles, settings.samplesPerSegment);
        var baseResult = {
            path: direct.path,
            portX: portX,
            portY: portY,
            firstControlX: direct.firstControlX,
            secondControlX: direct.secondControlX,
            cardStubLength: Math.abs(portX - cardX),
            adaptiveCardStub: adaptiveCardStub,
            avoidance: 'direct',
            directCollisionCount: directEvaluation.collisionCount,
            collisionCount: directEvaluation.collisionCount,
            avoidedObstacleCount: 0,
            routingEnvelope: 'strict',
            fallback: false
        };
        if (!directEvaluation.collisionCount) return baseResult;

        var directBlockers = directEvaluation.collisionIndexes.map(function(index) {
            return obstacles[index];
        });
        var travelLeft = Math.min(Number(point.x), portX);
        var travelRight = Math.max(Number(point.x), portX);
        var blockers = obstacles.filter(function(obstacle) {
            return obstacle.right >= travelLeft && obstacle.left <= travelRight;
        });
        if (!blockers.length) blockers = directBlockers;
        var blockerTop = Math.min.apply(null, blockers.map(function(obstacle) { return obstacle.top; }));
        var blockerBottom = Math.max.apply(null, blockers.map(function(obstacle) { return obstacle.bottom; }));
        var blockerLeft = Math.min.apply(null, blockers.map(function(obstacle) { return obstacle.left; }));
        var blockerRight = Math.max.apply(null, blockers.map(function(obstacle) { return obstacle.right; }));
        var routeTop = Number.isFinite(Number(settings.routeTop)) ? Number(settings.routeTop) : -Infinity;
        var routeBottom = Number.isFinite(Number(settings.routeBottom)) ? Number(settings.routeBottom) : Infinity;
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
            entryX = clamp(entryX, minimumX, maximumX);
            exitX = clamp(exitX, minimumX, maximumX);
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
            blockerTop - clearance - 16,
            blockerBottom + clearance,
            blockerBottom + clearance + 16
        ].map(function(value) {
            return clamp(value, routeTop, routeBottom);
        }).filter(function(value, index, values) {
            return Number.isFinite(value) && values.indexOf(value) === index;
        });
        var routeIndex = Math.max(0, Number(entry && entry.portIndex) || 0);
        var routeCount = Math.max(1, Number(entry && entry.sideCount) || 1);
        var candidates = [];
        candidateYs.forEach(function(waypointY) {
            var above = waypointY < (blockerTop + blockerBottom) / 2;
            var safeDirection = above ? -1 : 1;
            var separationIndex = above
                ? Math.max(0, routeCount - 1 - routeIndex)
                : routeIndex;
            var routeSeparation = Math.min(40, separationIndex * 10);
            var corridorY = clamp(
                waypointY + safeDirection * routeSeparation,
                routeTop,
                routeBottom
            );
            var corridorSpan = Math.abs(entryX - exitX);
            var curveDepth = Math.min(28, Math.max(11, corridorSpan * 0.1));
            var sourceExit = findSourceExit(
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
            var entryWaypointY = clamp(
                corridorY + safeDirection * curveDepth,
                routeTop,
                routeBottom
            );
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
            var waypointVariants = [];
            var variantCount = Math.pow(2, waypoints.length);
            for (var variantMask = 0; variantMask < variantCount; variantMask += 1) {
                var waypointVariant = [];
                for (var waypointIndex = 0; waypointIndex < waypoints.length; waypointIndex += 1) {
                    if (variantMask & Math.pow(2, waypointIndex)) {
                        waypointVariant.push(waypoints[waypointIndex]);
                    }
                }
                waypointVariants.push(waypointVariant);
            }
            waypointVariants.sort(function(first, second) {
                return first.length - second.length;
            });
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
                [0.94, 0.86, 0.76, 0.64, 0.52].forEach(function(tension) {
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
                        sourceExitUsed: Boolean(sourceExit && variant.indexOf(sourceExit) !== -1),
                        waypointY: corridorY,
                        approachExitX: approachExitX,
                        requiredApproachRun: requiredApproachRun,
                        side: above ? 'above' : 'below'
                    });
                });
            });
        });
        var clearCandidates = candidates.filter(function(candidate) {
            return candidate.evaluation.collisionCount === 0;
        });
        var strictCandidates = clearCandidates.filter(function(candidate) {
            return candidate.verticalExcursion <= 0.5;
        }).sort(function(first, second) {
            return first.score - second.score;
        });
        var expandedCandidates = clearCandidates.filter(function(candidate) {
            return candidate.verticalExcursion > 0.5;
        }).sort(function(first, second) {
            if (first.verticalExcursion !== second.verticalExcursion) {
                return first.verticalExcursion - second.verticalExcursion;
            }
            return first.score - second.score;
        });

        function localCandidateResult(selected, routingEnvelope) {
            return {
                path: selected.candidate.path,
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
                collisionCount: 0,
                avoidedObstacleCount: directEvaluation.collisionCount,
                fallback: false
            };
        }

        if (strictCandidates.length) return localCandidateResult(strictCandidates[0], 'strict');

        function gridCandidateResult(gridPath, routingEnvelope, requireStrictEnvelope) {
            if (!gridPath || gridPath.length < 2) return null;
            var gridCandidate = detourPortCandidate(
                point,
                gridPath.slice(1, -1),
                portX,
                portY,
                cardX
            );
            var gridEvaluation = evaluateBezierCandidate(gridCandidate, obstacles, settings.samplesPerSegment);
            var gridExcursion = verticalExcursion(
                gridCandidate,
                pointY,
                portY,
                settings.samplesPerSegment
            );
            if (
                gridEvaluation.collisionCount === 0 &&
                (!requireStrictEnvelope || gridExcursion.total <= 0.5)
            ) {
                return {
                    path: gridCandidate.path,
                    portX: portX,
                    portY: portY,
                    cardStubLength: Math.abs(portX - cardX),
                    adaptiveCardStub: adaptiveCardStub,
                    verticalExcursion: gridExcursion.total,
                    routingEnvelope: gridExcursion.total <= 0.5 ? 'strict' : routingEnvelope,
                    avoidance: 'grid',
                    directCollisionCount: directEvaluation.collisionCount,
                    collisionCount: 0,
                    avoidedObstacleCount: directEvaluation.collisionCount,
                    gridPointCount: gridPath.length,
                    sourceExitUsed: false,
                    fallback: false
                };
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
                    obstacles,
                    settings.samplesPerSegment
                );
                var roundedExcursion = verticalExcursion(
                    roundedCandidate,
                    pointY,
                    portY,
                    settings.samplesPerSegment
                );
                if (
                    roundedEvaluation.collisionCount === 0 &&
                    (!requireStrictEnvelope || roundedExcursion.total <= 0.5)
                ) {
                    return {
                        path: roundedCandidate.path,
                        portX: portX,
                        portY: portY,
                        cardStubLength: Math.abs(portX - cardX),
                        adaptiveCardStub: adaptiveCardStub,
                        verticalExcursion: roundedExcursion.total,
                        routingEnvelope: roundedExcursion.total <= 0.5 ? 'strict' : routingEnvelope,
                        avoidance: 'grid',
                        directCollisionCount: directEvaluation.collisionCount,
                        collisionCount: 0,
                        avoidedObstacleCount: directEvaluation.collisionCount,
                        gridPointCount: gridPath.length,
                        gridCornerRadius: roundingRadii[radiusIndex],
                        sourceExitUsed: false,
                        fallback: false
                    };
                }
            }
            return null;
        }

        var strictGridPath = endpointEnvelopeBottom >= endpointEnvelopeTop
            ? findGridRoute(
                { x: Number(point.x), y: Number(point.y) },
                { x: portX, y: portY },
                obstacles,
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
            obstacles,
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
        var direction = side === 'left' ? 1 : -1;
        var mapEdgeX = Number(settings.mapEdgeX) || 0;
        var cardX = Number(settings.cardX) || 0;
        var endY = Number(settings.endY) || 0;
        var laneIndex = Math.max(0, Number(entry && entry.laneIndex) || 0);
        var sideCount = Math.max(1, Number(entry && entry.sideCount) || 1);
        var routeY = Number.isFinite(Number(entry && entry.routeY))
            ? Number(entry.routeY)
            : Number(point.y) || 0;
        var approachSpread = Number(settings.approachSpread) || 84;
        var approachSpacing = sideCount > 1 ? Math.min(18, approachSpread / (sideCount - 1)) : 0;
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

        var useFanOut = sideCount > 1;
        var fanX = Number(point.x) || 0;
        if (useFanOut) {
            var availableFanSpan = Math.abs(Number(point.x) - approachX);
            var fanStub = Math.min(Number(settings.fanStub) || 18, Math.max(8, availableFanSpan * 0.28));
            fanX = Number(point.x) + (side === 'left' ? -fanStub : fanStub);
        }

        var path = useFanOut
            ? [
                'M', point.x, point.y,
                'H', fanX,
                'V', routeY,
                'H', approachX,
                'V', endY,
                'H', cardX
            ]
            : [
                'M', point.x, point.y,
                'H', approachX,
                'V', endY,
                'H', cardX
            ];

        return {
            path: path.join(' '),
            approachX: approachX,
            fanX: fanX,
            routeY: routeY,
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
        regionalMapDefaults: regionalMapDefaults,
        regionalBreakdownPolicy: regionalBreakdownPolicy,
        visualPolicy: visualPolicy,
        regionSetIds: Object.freeze(Object.keys(sets))
    };
});
