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

    var baseRegions = regionMap(RUSSIA_REGIONS);
    var sets = Object.freeze({
        russia: Object.freeze({
            id: 'russia',
            label: 'Russia regions',
            geodataScript: 'https://cdn.amcharts.com/lib/5/geodata/russiaLow.js',
            geodataGlobal: 'am5geodata_russiaLow',
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
                regions: Object.keys(set.regions).map(function(regionId) {
                    return { id: regionId, name: set.regions[regionId] };
                })
            };
        });
    }

    return {
        getRegionSet: getRegionSet,
        listRegionSets: listRegionSets,
        regionSetIds: Object.freeze(Object.keys(sets))
    };
});
