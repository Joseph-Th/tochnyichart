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

    function itemRegionIds(item) {
        return item && (item.regionIds || (item.regionId ? [item.regionId] : [])) || [];
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
        var requestedViewport = configuration.viewport || 'auto';
        var viewportMode = requestedViewport;
        if (viewportMode === 'auto') {
            var maximumSpan = regionSet.autoDataViewportMaxLongitudeSpan || 140;
            viewportMode = rawBounds && rawBounds.longitudeSpan <= maximumSpan ? 'data' : 'all';
        }
        var viewportSettings = regionSet.viewport || {};
        return {
            activeRegionIds: activeIds,
            excludedRegionIds: exclusions,
            viewportMode: viewportMode,
            geoBounds: viewportMode === 'data' ? paddedGeoBounds(rawBounds, viewportSettings) : null
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
            autoDataViewportMaxLongitudeSpan: 140,
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
        resolveMapPlan: resolveMapPlan,
        regionSetIds: Object.freeze(Object.keys(sets))
    };
});
