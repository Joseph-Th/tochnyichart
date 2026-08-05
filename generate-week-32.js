const fs = require('fs');
const path = require('path');

const root = __dirname;
const week = '2026-week-32';
const specDir = path.join(root, 'specs', week);
const chartDir = path.join(root, 'charts', week);
fs.mkdirSync(specDir, { recursive: true });
fs.mkdirSync(chartDir, { recursive: true });

const common = {
  version: '2.0',
  date: '2026-08-04',
  options: { animate: false, showLabels: true }
};

function write(slug, spec) {
  const out = {
    ...common,
    ...spec,
    options: { ...common.options, ...(spec.options || {}) },
    metadata: {
      slug,
      country: spec.metadata?.country || 'Russia',
      ...(spec.metadata || {})
    }
  };
  fs.writeFileSync(path.join(specDir, `${slug}.json`), `${JSON.stringify(out, null, 2)}\n`);
}

write('ozon-insurance-risk', {
  recipe: 'comparison.change',
  title: 'Ozon Warehouse Insurance Became 3.3 Times More Expensive',
  subtitle: 'The daily tariff rose after drone attacks increased the perceived risk to fulfillment centers.',
  source: { name: 'The Moscow Times reporting based on Ozon seller notices', period: 'July 2026' },
  data: [
    { label: 'Previous daily rate', value: 0.0035, displayValue: '0.0035%', quantity: 'daily warehouse insurance tariff', scope: 'goods stored in Ozon fulfillment centers', period: 'Before 28 July 2026', tone: 'neutral' },
    { label: 'New daily rate', value: 0.0115, displayValue: '0.0115%', quantity: 'daily warehouse insurance tariff', scope: 'goods stored in Ozon fulfillment centers', period: 'From 28 July 2026', tone: 'critical' }
  ],
  measure: { quantity: 'daily warehouse insurance tariff', unit: '% per day', decimals: 4, baseline: 'zero' },
  emphasis: { direction: 'up', displayValue: '+230%', label: 'tariff increase', position: 'between' },
  supportingFacts: [
    { value: '−8.5%', label: 'Ozon shares fell intraday during the renewed warehouse-attack wave.', tone: 'critical' },
    { value: 'about −3%', label: 'The stock partly recovered by the close.', tone: 'warning' },
    { value: '1 direct strike', label: 'The reported Ozon incident hit outside a facility; the wider repricing followed sector attacks.', tone: 'primary' },
    { value: 'Fiberglass panels', label: 'Ozon said flame-resistant roof panels would be installed as passive protection.', tone: 'primary' }
  ],
  narrative: { frame: 'warning', density: 'editorial', emphasis: 'gap' },
  options: { height: 'standard' },
  metadata: { topic: 'Ozon insurance and drone risk', dataPeriod: 'July 2026', keyFinding: 'Ozon raised its daily warehouse insurance tariff by 230% as attack risk spread through Russian e-commerce logistics.' }
});

write('marketplace-retrenchment', {
  recipe: 'composition.stacked',
  title: 'Magnit Market Lost One Ruble for Every Two Rubles of Revenue',
  subtitle: 'Its 2024 loss equaled about one third of an implied 9.5 billion ruble cost base before the marketplace was narrowed into Magnit’s “extended shelf” model.',
  source: { name: 'Magnit Market seller FAQ and Kommersant', period: '2024 results and July 2026 transition', url: 'https://seller-manual.mm.ru/faq' },
  data: [
    { label: 'Revenue-funded cost', value: 6.3, displayValue: '6.3bn RUB', tone: 'primary' },
    { label: 'Loss / uncovered cost', value: 3.2, displayValue: '3.2bn RUB', tone: 'critical' }
  ],
  measure: { unit: 'billion rubles', decimals: 1, baseline: 'zero' },
  supportingFacts: [
    { value: 'Universal model ended', label: 'Magnit narrowed the service into an extended assortment for its core retail business.', tone: 'warning' },
    { value: 'FBO wound down', label: 'The transition moved sellers to fulfillment by seller and stopped new warehouse intake in July.', tone: 'critical' },
    { value: 'Acquisition cancelled', label: 'Wildberries reportedly withdrew from the planned Magnit Market transaction.', tone: 'warning' },
    { value: 'Investment paused', label: 'Wildberries also reportedly suspended acquisition and investment activity.', tone: 'critical' }
  ],
  note: 'The implied cost base is derived as 2024 revenue plus the reported net loss. It is used as a high-level funding view, not an accounting expense reconciliation.',
  narrative: { frame: 'collapse', density: 'detailed', emphasis: 'composition' },
  options: { height: 'standard', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'marketplace retrenchment', dataPeriod: '2024–July 2026', keyFinding: 'Magnit Market entered its narrower 2026 operating model after a loss equal to roughly half its 2024 revenue.' }
});

write('wildberries-support-request', {
  recipe: 'composition.stacked',
  title: 'Wildberries Asked for 800 Billion Rubles in State Support',
  subtitle: 'The request split 500 billion rubles for seller support and 300 billion for warehouse air defense; Reuters later reported no specific aid decision by July 28.',
  source: { name: 'Russian e-commerce reporting; Reuters status update', period: 'July 2026' },
  data: [
    { label: 'Seller support fund', value: 500, displayValue: '500bn RUB', tone: 'warning' },
    { label: 'Warehouse air defense', value: 300, displayValue: '300bn RUB', tone: 'critical' }
  ],
  supportingFacts: [
    { value: 'No decision by 28 July', label: 'Reuters reported that government discussions were continuing without a specific aid decision.', tone: 'neutral' },
    { value: '88,000 small sellers', label: 'Wildberries said its first internal support measures prioritized the smallest sellers affected at Elektrostal.', tone: 'primary' }
  ],
  note: 'The requested amounts are distinct from approved or disbursed state support.',
  measure: { unit: 'billion rubles', decimals: 0, baseline: 'zero' },
  narrative: { frame: 'warning', density: 'editorial', emphasis: 'composition' },
  options: { height: 'short', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'Wildberries state support', dataPeriod: 'July 2026', keyFinding: 'Wildberries asked for 800 billion rubles in state support, while the government had not announced a specific aid decision by July 28.' }
});

write('wildberries-kazakhstan-capacity', {
  recipe: 'comparison.scenarios',
  title: 'One Wildberries Requirement Could Absorb Most Vacant Kazakh Space',
  subtitle: 'The requested Class A warehouse equals nearly 77% of all high-quality space reported vacant across Kazakhstan.',
  source: { name: 'Kazakhstan warehouse market reporting and Wildberries expansion plans', period: 'July–August 2026' },
  data: [
    { label: 'Warehouse sought', value: 100000, displayValue: '100,000 m²', quantity: 'Class A warehouse floor area', scope: 'vacant high-quality warehouse market in Kazakhstan', period: 'July 2026', tone: 'critical' },
    { label: 'Total vacant stock', value: 130000, displayValue: '130,000 m²', quantity: 'Class A warehouse floor area', scope: 'vacant high-quality warehouse market in Kazakhstan', period: 'July 2026', tone: 'neutral' }
  ],
  measure: { quantity: 'Class A warehouse floor area', unit: 'm²', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '76.9%', label: 'Share of the reported national vacancy represented by one requirement.', tone: 'critical' },
    { value: '2 existing sites', label: 'Wildberries already operated facilities in Almaty and Astana.', tone: 'primary' },
    { value: '260,000 m²', label: 'Reuters later reported additional Kazakhstan construction under way.', tone: 'warning' }
  ],
  narrative: { frame: 'surprise', density: 'editorial', emphasis: 'gap' },
  options: { height: 'standard' },
  metadata: { country: 'Kazakhstan', topic: 'Wildberries warehouse expansion', dataPeriod: 'July–August 2026', keyFinding: 'A single Wildberries requirement could consume most of Kazakhstan’s available high-grade warehouse space.' }
});

write('wildberries-warehouse-damage-map', {
  recipe: 'map.regional',
  title: 'Wildberries Warehouse Disruption Spread Across Seven Regions',
  subtitle: 'Several facilities were destroyed or disabled, while other sites remained partly operational or had disputed damage reports.',
  source: { name: 'Reuters, Kommersant, local emergency reports and company statements', period: 'Late July–early August 2026' },
  data: [
    { label: 'Ryazan', regionId: 'RU-RYA', status: 'critical', displayValue: 'Major fire', detail: 'Reporting differed on whether half or all of the facility was lost.' },
    { label: 'Perm', regionId: 'RU-PER', status: 'unknown', displayValue: 'Damage disputed', detail: 'Initial reports said the site was disabled; Reuters later reported operations continued.' },
    { label: 'Udmurtia', regionId: 'RU-UD', status: 'blocked', displayValue: 'Destroyed', detail: 'The Sarapul-area facility was reported destroyed by fire after an attack.' },
    { label: 'Penza', regionId: 'RU-PNZ', status: 'blocked', displayValue: 'Destroyed', detail: 'The regional fulfillment center was reported destroyed.' },
    { label: 'Tambov', regionId: 'RU-TAM', status: 'strained', displayValue: 'Partly damaged', detail: 'Interior footage suggested major damage, but the site remained operational.' },
    { label: 'Volgograd', regionId: 'RU-VGG', status: 'blocked', displayValue: 'Destroyed', detail: 'The site was reported destroyed.' },
    { label: 'Samara', regionId: 'RU-SAM', status: 'critical', displayValue: '160,000 m² burned', detail: 'Reuters reported 160,000 of 180,000 m² burned at the site.' }
  ],
  map: { regionSet: 'russia', calloutDistribution: 'balanced' },
  primaryMetric: { value: '7 regions', label: 'facilities with reported disruption' },
  supportingFacts: [
    { value: '552,000 m²', label: 'Warehouse area reported targeted in one compiled assessment.', tone: 'warning' },
    { value: '444,000 m²', label: 'Area reported unusable in the same assessment.', tone: 'critical' },
    { value: '8–10%', label: 'Estimated share of Wildberries capacity affected.', tone: 'critical' },
    { value: 'Yekaterinburg disputed', label: 'Company rhetoric described mass attacks; official reporting described a much smaller debris fire.', tone: 'neutral' }
  ],
  narrative: { frame: 'collapse', density: 'detailed', emphasis: 'geography' },
  options: { height: 'tall' },
  metadata: { topic: 'Wildberries warehouse attacks', dataPeriod: 'Late July–early August 2026', keyFinding: 'Wildberries logistics disruption became a multi-region network problem rather than a single-site incident.' }
});

write('ecommerce-company-churn', {
  recipe: 'comparison.scenarios',
  title: 'Marketplace Liquidations Exceeded New Registrations by 18,200',
  subtitle: 'Business exits rose while new seller registrations fell in the first half of 2026.',
  source: { name: 'Russian marketplace company-registration reporting', period: 'H1 2026' },
  data: [
    { label: 'Liquidations', value: 76400, displayValue: '76,400', quantity: 'company lifecycle events', scope: 'Russian companies and sellers trading through online platforms', period: 'H1 2026', tone: 'critical' },
    { label: 'New registrations', value: 58200, displayValue: '58,200', quantity: 'company lifecycle events', scope: 'Russian companies and sellers trading through online platforms', period: 'H1 2026', tone: 'positive' }
  ],
  measure: { quantity: 'company lifecycle events', unit: 'companies', decimals: 0, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '18,200', label: 'more exits than entries', position: 'corner' },
  supportingFacts: [
    { value: '+19.6%', label: 'Increase in liquidations from the comparable period.', tone: 'critical' },
    { value: '−25%', label: 'Decline in new registrations.', tone: 'warning' }
  ],
  narrative: { frame: 'divergence', density: 'editorial', emphasis: 'gap' },
  options: { height: 'standard' },
  metadata: { topic: 'e-commerce seller churn', dataPeriod: 'H1 2026', keyFinding: 'Marketplace company exits outnumbered new registrations by 18,200 in H1 2026.' }
});

write('ecommerce-active-company-base', {
  recipe: 'comparison.change',
  title: 'Online-Trading Companies Declined for the First Time Since 2021',
  subtitle: 'The active company count fell by an estimated 23,500 in the first half of 2026.',
  source: { name: 'Russian marketplace company-registration reporting', period: 'H1 2026' },
  data: [
    { label: 'Implied prior level', value: 480231, displayValue: 'about 480,200', valueStatus: 'derived', quantity: 'active online-trading companies', scope: 'Russian companies operating through online commerce channels', period: 'Before H1 2026 decline', tone: 'neutral' },
    { label: 'H1 2026 level', value: 456700, displayValue: '456,700', valueStatus: 'reported', quantity: 'active online-trading companies', scope: 'Russian companies operating through online commerce channels', period: 'End of H1 2026', tone: 'critical' }
  ],
  measure: { quantity: 'active online-trading companies', unit: 'companies', decimals: 0, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−4.9%', label: 'company base', position: 'between' },
  supportingFacts: [
    { value: '−23,500', label: 'Approximate reduction implied by the reported percentage and ending count.', tone: 'critical' },
    { value: 'First since 2021', label: 'The sector had expanded in each intervening period.', tone: 'warning' }
  ],
  note: 'Prior value derived as 456,700 ÷ 0.951; rounded to the nearest hundred in display copy.',
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'e-commerce company count', dataPeriod: 'H1 2026', keyFinding: 'The active online-trading company base declined 4.9% to 456,700.' }
});

write('ecommerce-growth-deceleration', {
  recipe: 'ranking.horizontal',
  title: 'Russian E-commerce Growth Has Slowed Sharply',
  subtitle: 'Turnover still expanded, but the growth rate fell from 60.3% in 2024 to 18.4% in H1 2026.',
  source: { name: 'Russian e-commerce market reporting', period: '2024–H1 2026' },
  data: [
    { label: '2024', value: 60.3, displayValue: '60.3%' },
    { label: '2025', value: 29.4, displayValue: '29.4%' },
    { label: 'H1 2026', value: 18.4, displayValue: '18.4%', tone: 'warning' }
  ],
  measure: { unit: '% year over year', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−41.9pp', label: 'since 2024', position: 'corner' },
  supportingFacts: [
    { value: '5.9tn RUB', label: 'Sector turnover in H1 2026 despite slower growth.', tone: 'primary' },
    { value: '10–15%', label: 'Share of active sellers expected to leave under fee pressure.', tone: 'critical' },
    { value: '≤100,000 RUB/month', label: 'Turnover level typical of the smallest sellers most at risk.', tone: 'warning' },
    { value: '4m jobs; 8–10%', label: 'Reported employment footprint and broad economic share of e-commerce activity.', tone: 'primary' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'direction' },
  options: { height: 'tall', sort: 'none' },
  metadata: { topic: 'e-commerce growth', dataPeriod: '2024–H1 2026', keyFinding: 'Russian e-commerce growth remained positive but decelerated by more than 40 percentage points in two years.' }
});

write('russia-fuel-regional-map', {
  recipe: 'map.regional',
  title: 'Fuel Access Diverged Across Russia’s Regions',
  subtitle: 'Refinery areas briefly improved, while delivery-dependent regions faced rationing, closures and farm shortages.',
  source: { name: 'Regional fuel availability reporting, Reuters and Interfax', period: 'Late July–early August 2026' },
  data: [
    { label: 'Omsk', regionId: 'RU-OMS', status: 'improving', displayValue: 'Limits lifted', detail: 'Purchase restrictions were removed in a major refinery region.' },
    { label: 'Volgograd', regionId: 'RU-VGG', status: 'critical', displayValue: 'Limits restored', detail: 'Restrictions returned after another strike on the regional refinery.' },
    { label: 'Bashkortostan', regionId: 'RU-BA', status: 'critical', displayValue: 'Ufa refineries hit', detail: 'Repeated attacks tightened supply in and around the Ufa refining hub.' },
    { label: 'Astrakhan', regionId: 'RU-AST', status: 'strained', displayValue: '4–8 hours/day', detail: 'Many stations shortened operating hours to manage queues and shortages.' },
    { label: 'Kemerovo', regionId: 'RU-KEM', status: 'critical', displayValue: 'About ⅓ closed', detail: 'Around one third of stations in the region’s second-largest city were not operating.' },
    { label: 'Novosibirsk', regionId: 'RU-NVS', status: 'critical', displayValue: '>50% dry', detail: 'More than half of independent stations reportedly had no fuel.' },
    { label: 'Chelyabinsk', regionId: 'RU-CHE', status: 'strained', displayValue: 'Farm supply scarce', detail: 'Small farmers reported difficulty obtaining gasoline for field work.' },
    { label: 'Krasnodar', regionId: 'RU-KDA', status: 'critical', displayValue: 'Half supplied', detail: 'Farmers received only half of their July fuel requirement and used reserves.' },
    { label: 'Bryansk', regionId: 'RU-BRY', status: 'blocked', displayValue: '10–20 L caps', detail: 'Limits were 10 liters per customer, rising to 20 liters closer to the border.' },
    { label: 'Zabaykalsky', regionId: 'RU-ZAB', status: 'blocked', displayValue: 'About 5% covered', detail: 'Weekly deliveries were far below the monthly requirement.' }
  ],
  map: { regionSet: 'russia', calloutDistribution: 'balanced' },
  supportingFacts: [
    { value: 'Kaliningrad improved', label: 'Detached-region limits were lifted, so it is retained as context rather than mapped.', tone: 'positive' },
    { value: 'Refinery proximity', label: 'Local refining capacity helped some regions recover only temporarily.', tone: 'primary' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'geography' },
  options: { height: 'tall' },
  metadata: { topic: 'regional fuel shortage', dataPeriod: 'Late July–early August 2026', keyFinding: 'Fuel availability varied sharply by refinery access and delivery dependence.' }
});

write('zabaykalsky-fuel-coverage', {
  recipe: 'composition.stacked',
  title: 'Zabaykalsky Received About One Twentieth of Its Fuel Need',
  subtitle: 'A weekly allocation of 1,050 tons equates to roughly 4,550 tons per month against an 88,000-ton requirement.',
  source: { name: 'Regional fuel allocation reporting', period: 'July 2026' },
  data: [
    { label: 'Monthly-equivalent supply', value: 4550, displayValue: '≈4,550 tons', tone: 'warning' },
    { label: 'Estimated unmet need', value: 83450, displayValue: '≈83,450 tons', tone: 'critical' }
  ],
  measure: { unit: 'tons per month', decimals: 0, baseline: 'zero' },
  note: 'Monthly-equivalent supply is derived as 1,050 × 52 ÷ 12. Unmet need is the reported monthly requirement less that derived supply.',
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'composition' },
  options: { height: 'short', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'Zabaykalsky fuel coverage', dataPeriod: 'July 2026', keyFinding: 'Reported deliveries covered only about one twentieth of Zabaykalsky’s monthly fuel need.' }
});

write('fuel-export-ban-structure', {
  recipe: 'ranking.horizontal',
  title: 'Producer Diesel Received the Only Short Export Restriction',
  subtitle: 'Most fuel-export channels were restricted for about six months, while producer diesel exports were initially limited only through August.',
  source: { name: 'Reuters', period: '30 July 2026–31 January 2027', url: 'https://www.reuters.com/business/energy/russia-extends-diesel-gasoline-export-bans-until-end-january-2027-2026-07-30/' },
  data: [
    { label: 'Gasoline producers', value: 6, displayValue: '≈6 months', tone: 'critical' },
    { label: 'Gasoline non-producers', value: 6, displayValue: '≈6 months', tone: 'critical' },
    { label: 'Diesel non-producers', value: 6, displayValue: '≈6 months', tone: 'critical' },
    { label: 'Diesel producers', value: 1, displayValue: '≈1 month', tone: 'warning' }
  ],
  measure: { unit: 'months restricted', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '1 September', label: 'Producer exemptions for diesel, marine fuel and gas oils were scheduled to begin.', tone: 'primary' },
    { value: '31 January 2027', label: 'End date for the broader export restrictions.', tone: 'warning' }
  ],
  narrative: { frame: 'warning', density: 'editorial', emphasis: 'ranking' },
  options: { height: 'tall', sort: 'none' },
  metadata: { topic: 'fuel export restrictions', dataPeriod: 'July 2026–January 2027', keyFinding: 'Russia used a six-month gasoline ban and differentiated diesel controls to protect domestic supply.' }
});

write('emergency-fuel-imports', {
  recipe: 'comparison.range',
  title: 'Emergency Fuel Cargoes Were Small Relative to the Supply Gap',
  subtitle: 'Confirmed and proposed imports amounted to tens of thousands of tons each, enough for only brief national relief.',
  source: { name: 'Reuters and regional trade reporting', period: 'July–August 2026' },
  data: [
    { label: 'India: two-tanker estimate', low: 60000, high: 100000, quantity: 'emergency fuel cargo volume', scope: 'fuel cargoes offered or chartered for Russia', period: 'July–August 2026', tone: 'primary', annotation: 'Initial estimate; Reuters later confirmed a first cargo of about 42,000 tons.' },
    { label: 'Morocco cargo', value: 30000, displayValue: '30,000 tons', quantity: 'emergency fuel cargo volume', scope: 'fuel cargoes offered or chartered for Russia', period: 'July–August 2026', tone: 'warning' },
    { label: 'Kazakhstan pledge', value: 10000, displayValue: '10,000 tons', quantity: 'emergency fuel cargo volume', scope: 'fuel cargoes offered or chartered for Russia', period: 'July–August 2026', tone: 'neutral' }
  ],
  measure: { quantity: 'emergency fuel cargo volume', unit: 'tons', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '2 tankers', label: 'Number of Indian deliveries initially expected.', tone: 'primary' },
    { value: '100,000 tons out', label: 'Russia also contracted to supply Kyrgyzstan at exchange-linked prices.', tone: 'warning' },
    { value: '1–3 days', label: 'Estimated national consumption covered by the volumes being discussed.', tone: 'critical' }
  ],
  narrative: { frame: 'comparison', density: 'editorial', emphasis: 'range' },
  options: { height: 'standard', labelMode: 'outside' },
  metadata: { topic: 'fuel imports', dataPeriod: 'July–August 2026', keyFinding: 'Emergency imports were too small to offset a sustained national refining shortfall.' }
});

write('refinery-output-gap', {
  recipe: 'composition.stacked',
  title: 'Russia Was Operating at Roughly Two Thirds of Seasonal Fuel Need',
  subtitle: 'Reuters reported production near 65% of seasonal demand, consistent with estimates that 30–35% of gasoline output was impaired.',
  source: { name: 'Reuters and Financial Times reporting', period: 'Late July 2026' },
  data: [
    { label: 'Available production', value: 65, displayValue: '65%', tone: 'warning' },
    { label: 'Implied shortfall', value: 35, displayValue: '35%', tone: 'critical' }
  ],
  measure: { unit: '% of seasonal demand', decimals: 0, baseline: 'zero', minimum: 0, maximum: 100 },
  supportingFacts: [
    { value: 'Summer reserves', label: 'Stored fuel helped bridge the initial production loss.', tone: 'primary' },
    { value: 'Persistent gap', label: 'Small import cargoes covered only a few days of consumption.', tone: 'critical' }
  ],
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'composition' },
  options: { height: 'short', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'refinery output shortage', dataPeriod: 'Late July 2026', keyFinding: 'Refinery disruption left a national fuel-output gap of roughly one third.' }
});

write('mongolia-fuel-buffer', {
  recipe: 'ranking.horizontal',
  title: 'Mongolia’s Fuel Buffer Was Measured in Weeks',
  subtitle: 'Official July figures showed 27–44 days of reserves in a country that imports about 97% of petroleum products from Russia.',
  source: { name: 'Mongolia Ministry of Industry and Mineral Resources', period: 'July 2026' },
  data: [
    { label: 'AI-95 gasoline', value: 44, displayValue: '44 days', tone: 'positive' },
    { label: 'AI-92 gasoline', value: 33, displayValue: '33 days', tone: 'warning' },
    { label: 'Diesel', value: 27, displayValue: '27 days', tone: 'critical' }
  ],
  measure: { unit: 'days of reserves', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '97%', label: 'Share of petroleum-product imports sourced from Russia.', tone: 'critical' },
    { value: '71k / 4k / 106k t', label: 'Reported AI-92, AI-95 and diesel reserve tonnages.', tone: 'primary' },
    { value: '+250 / −150 MNT', label: 'AI-92 price rose while diesel fell per liter in mid-July.', tone: 'warning' },
    { value: '291,000 m³', label: 'Planned additional national storage capacity.', tone: 'positive' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'ranking' },
  options: { height: 'tall', sort: 'descending' },
  metadata: { country: 'Mongolia', topic: 'Mongolia fuel reserves', dataPeriod: 'July 2026', keyFinding: 'Mongolia had only several weeks of fuel reserves despite near-total dependence on Russian imports.' }
});

write('vtb-h1-profit', {
  recipe: 'comparison.change',
  title: 'VTB Quarterly Profit Fell by About 40 Billion Rubles',
  subtitle: 'Second-quarter profit was 30% below the first quarter, deepening the year-over-year weakness in the bank’s first-half result.',
  source: { name: 'Kommersant', period: 'Q1–Q2 2026', url: 'https://www.kommersant.ru/doc/8845995' },
  data: [
    { label: 'Q1 2026', value: 132.3, displayValue: '≈132.3bn RUB', valueStatus: 'derived', quantity: 'VTB quarterly net profit', scope: 'VTB Group', period: 'Q1 2026', tone: 'primary' },
    { label: 'Q2 2026', value: 92.6, displayValue: '92.6bn RUB', valueStatus: 'reported', quantity: 'VTB quarterly net profit', scope: 'VTB Group', period: 'Q2 2026', tone: 'critical' }
  ],
  measure: { quantity: 'VTB quarterly net profit', unit: 'billion rubles', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−30%', label: 'quarter to quarter', position: 'between' },
  supportingFacts: [
    { value: '225.2bn RUB', label: 'H1 2026 net profit.', tone: 'primary' },
    { value: 'almost −20%', label: 'Year-over-year decline in first-half profit.', tone: 'warning' },
    { value: '−33.6%', label: 'Q2 decline from Q2 2025.', tone: 'critical' }
  ],
  note: 'Q1 is derived from the reported Q2 result and the reported 30% quarter-on-quarter decline: 92.6 ÷ 0.70.',
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'VTB profit', dataPeriod: 'Q1–Q2 2026', keyFinding: 'VTB’s quarterly profit fell by roughly 40 billion rubles from Q1 to Q2.' }
});

write('vtb-other-operating-income', {
  recipe: 'comparison.change',
  title: 'VTB’s Other Operating Income Collapsed in the Second Quarter',
  subtitle: 'Quarterly income fell from about 91 billion rubles to 17.9 billion as the Halls transaction was paid in installments.',
  source: { name: 'Kommersant', period: 'Q1–Q2 2026', url: 'https://www.kommersant.ru/doc/8845995' },
  data: [
    { label: 'Q1 2026', value: 91, displayValue: 'about 91bn RUB', valueStatus: 'approximate', quantity: 'other operating income', scope: 'VTB Group', period: 'Q1 2026', tone: 'primary' },
    { label: 'Q2 2026', value: 17.9, displayValue: '17.9bn RUB', valueStatus: 'reported', quantity: 'other operating income', scope: 'VTB Group', period: 'Q2 2026', tone: 'critical' }
  ],
  measure: { quantity: 'other operating income', unit: 'billion rubles', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: 'about −80%', label: 'quarter to quarter', position: 'between' },
  supportingFacts: [
    { value: '118.2bn RUB', label: 'H1 other operating income.', tone: 'primary' },
    { value: '−63%', label: 'H1 year-over-year change.', tone: 'critical' },
    { value: '>100bn RUB', label: 'Value of the Halls Development transaction.', tone: 'warning' },
    { value: '8bn RUB', label: 'Additional reported loss associated with the transaction structure.', tone: 'critical' }
  ],
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'VTB operating income', dataPeriod: 'Q1–Q2 2026', keyFinding: 'VTB’s other operating income fell by roughly four fifths from Q1 to Q2.' }
});

write('vtb-loan-book', {
  recipe: 'comparison.scenarios',
  title: 'VTB’s Corporate Loan Book Expanded as Retail Lending Contracted',
  subtitle: 'Corporate loans were more than twice the size of the retail book at midyear.',
  source: { name: 'Kommersant', period: 'H1 2026', url: 'https://www.kommersant.ru/doc/8845995' },
  data: [
    { label: 'Corporate loans', value: 18.6, displayValue: '18.6tn RUB', quantity: 'gross loan portfolio', scope: 'VTB Group loan book', period: 'End of H1 2026', tone: 'primary' },
    { label: 'Retail loans', value: 7.0, displayValue: '7.0tn RUB', quantity: 'gross loan portfolio', scope: 'VTB Group loan book', period: 'End of H1 2026', tone: 'warning' }
  ],
  measure: { quantity: 'gross loan portfolio', unit: 'trillion rubles', decimals: 1, baseline: 'zero' },
  supportingFacts: [
    { value: '+7.9%', label: 'Growth in the corporate loan portfolio.', tone: 'positive' },
    { value: '−3.6%', label: 'Contraction in the retail loan portfolio.', tone: 'warning' },
    { value: '−10% staff', label: 'Planned workforce reduction as costs rose.', tone: 'critical' },
    { value: '<50% payout likely', label: 'VTB said a 50% profit dividend was unlikely for 2026.', tone: 'warning' }
  ],
  narrative: { frame: 'divergence', density: 'detailed', emphasis: 'ranking' },
  options: { height: 'standard', sort: 'descending' },
  metadata: { topic: 'VTB loan book and costs', dataPeriod: 'H1 2026', keyFinding: 'VTB shifted toward corporate lending while cutting costs and tempering dividend expectations.' }
});

write('grain-domestic-prices', {
  recipe: 'ranking.horizontal',
  title: 'Russian Grain Benchmarks Clustered Near 11,000–13,000 Rubles',
  subtitle: 'Late-July wheat and barley prices were compressed into a narrow band as export logistics weakened.',
  source: { name: 'Kommersant', period: '20–26 July 2026', url: 'https://www.kommersant.ru/doc/8845089' },
  data: [
    { label: 'Wheat, class 3', value: 12.95, displayValue: '12.95k', tone: 'warning' },
    { label: 'Wheat, class 4', value: 12.6, displayValue: '12.60k', tone: 'warning' },
    { label: 'Wheat, class 5', value: 11.08, displayValue: '11.08k', tone: 'warning' },
    { label: 'Barley', value: 10.78, displayValue: '10.78k', tone: 'critical' }
  ],
  measure: { unit: 'thousand RUB/ton', decimals: 2, baseline: 'zero' },
  supportingFacts: [
    { value: '−8.6% to −8.9%', label: 'Year-over-year decline in domestic wheat prices.', tone: 'critical' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'ranking' },
  options: { height: 'tall', sort: 'descending' },
  metadata: { topic: 'domestic grain prices', dataPeriod: 'Late July 2026', keyFinding: 'Russian wheat and barley benchmarks weakened and converged near 11,000–13,000 rubles per ton.' }
});

write('grain-export-prices', {
  recipe: 'comparison.scenarios',
  title: 'Barley Export Prices Fell Faster Than Wheat',
  subtitle: 'Both Black Sea export benchmarks declined year over year by late July.',
  source: { name: 'Kommersant', period: '24 July 2026', url: 'https://www.kommersant.ru/doc/8845089' },
  data: [
    { label: 'Wheat export price', value: 15100, displayValue: '15,100 RUB/t', quantity: 'Black Sea grain export price', scope: 'Russian grain exported through Novorossiysk', period: '24 July 2026', tone: 'warning' },
    { label: 'Barley export price', value: 13000, displayValue: '13,000 RUB/t', quantity: 'Black Sea grain export price', scope: 'Russian grain exported through Novorossiysk', period: '24 July 2026', tone: 'critical' }
  ],
  measure: { quantity: 'Black Sea grain export price', unit: 'RUB/ton', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '−9.6%', label: 'Year-over-year decline in the wheat export benchmark.', tone: 'warning' },
    { value: '−12.2%', label: 'Year-over-year decline in the barley export benchmark.', tone: 'critical' }
  ],
  narrative: { frame: 'comparison', density: 'editorial', emphasis: 'gap' },
  options: { height: 'standard' },
  metadata: { topic: 'grain export prices', dataPeriod: '24 July 2026', keyFinding: 'Barley export prices fell more sharply than wheat as Black Sea logistics tightened.' }
});

write('azov-grain-export-loss', {
  recipe: 'comparison.change',
  title: 'Azov Disruption Could Remove 6.5 Million Tons From Grain Exports',
  subtitle: 'The H2 export outlook fell from 33.9 million tons to 27.4 million tons, a decline of about 19%.',
  source: { name: 'Kommersant', period: 'H2 2026 outlook', url: 'https://www.kommersant.ru/doc/8845089' },
  data: [
    { label: 'Previous H2 outlook', value: 33.9, displayValue: '33.9m tons', quantity: 'Russian grain exports in the half-year outlook', scope: 'Russia grain export forecast', period: 'Pre-closure forecast for H2 2026', tone: 'primary' },
    { label: 'Revised H2 outlook', value: 27.4, displayValue: '27.4m tons', quantity: 'Russian grain exports in the half-year outlook', scope: 'Russia grain export forecast', period: 'Post-closure forecast for H2 2026', tone: 'critical' }
  ],
  measure: { quantity: 'Russian grain exports in the half-year outlook', unit: 'million tons', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−6.5m tons', label: 'forecast loss', position: 'between' },
  supportingFacts: [
    { value: '35%', label: 'Azov share of Russian wheat exports.', tone: 'critical' },
    { value: '25%', label: 'Azov–Don canal share of all grain exports.', tone: 'warning' },
    { value: '1,400 RUB/t', label: 'Reported short-haul delivery cost to Novorossiysk.', tone: 'warning' },
    { value: '+27.3%', label: 'Increase in land-transport cost this year.', tone: 'critical' }
  ],
  narrative: { frame: 'collapse', density: 'detailed', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'Azov grain exports', dataPeriod: '2026–27 season outlook', keyFinding: 'Closure of the Azov route could reduce the half-year grain export outlook by 6.5 million tons.' }
});

write('black-sea-terminal-exposure', {
  recipe: 'composition.stacked',
  title: 'Three Terminals Carry About 40% of Seaborne Grain Capacity',
  subtitle: 'Taman and two Novorossiysk terminals can handle more than 20 million tons annually against roughly 50 million tons of Russian seaborne grain exports.',
  source: { name: 'Reuters reporting on Black Sea grain terminals', period: 'Late July 2026' },
  data: [
    { label: 'Capacity at three affected terminals', value: 20, displayValue: '20m+ tons', tone: 'critical' },
    { label: 'Other seaborne export volume', value: 30, displayValue: 'about 30m tons', tone: 'neutral' }
  ],
  measure: { unit: 'million tons per year', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '3 terminals', label: 'Taman plus two major Novorossiysk grain terminals.', tone: 'warning' },
    { value: '50m tons/year', label: 'Approximate Russian seaborne grain export scale.', tone: 'primary' }
  ],
  note: 'The affected capacity is reported as more than 20 million tons, so the 40% share is a conservative approximation.',
  narrative: { frame: 'warning', density: 'editorial', emphasis: 'composition' },
  options: { height: 'short', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'Black Sea grain terminals', dataPeriod: 'Late July 2026', keyFinding: 'Restrictions at three terminals exposed roughly two fifths of Russia’s seaborne grain export capacity.' }
});

write('sunflower-export-shock', {
  recipe: 'ranking.horizontal',
  title: 'Sunflower-Oil Exports Were Headed Toward 28% of June’s Level',
  subtitle: 'July shipments fell 53.9% month over month, and the expected 40% further decline in August would reduce the export index to about 28.',
  source: { name: 'Russian agricultural export reporting', period: 'July–August 2026' },
  data: [
    { label: 'June', value: 100, displayValue: '100' },
    { label: 'July', value: 46.1, displayValue: '46.1', tone: 'warning' },
    { label: 'August forecast', value: 27.7, displayValue: '27.7', valueStatus: 'derived', tone: 'critical' }
  ],
  measure: { unit: 'export-volume index, June=100', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−72.3%', label: 'June to August forecast', position: 'corner' },
  supportingFacts: [
    { value: '−14%', label: 'July export change from a year earlier.', tone: 'warning' },
    { value: '−40%', label: 'Further export decline expected in August.', tone: 'critical' },
    { value: '40,200 RUB/t; −2.1%', label: 'July domestic raw-sunflower price and monthly change.', tone: 'warning' },
    { value: 'EFKO turmoil', label: 'Executive arrests added operational uncertainty in a major oils producer and logistics group.', tone: 'neutral' }
  ],
  note: 'The August index is derived as 46.1 × 0.60. June is normalized to 100 because the source reports percentage changes rather than absolute monthly tonnage.',
  narrative: { frame: 'collapse', density: 'detailed', emphasis: 'direction' },
  options: { height: 'tall', sort: 'none' },
  metadata: { topic: 'sunflower oil exports', dataPeriod: 'June–August 2026', keyFinding: 'Two consecutive export declines would leave August sunflower-oil shipments at about 28% of June’s level.' }
});

write('east-coal-demand-slump', {
  recipe: 'comparison.diverging',
  title: 'Far East Metallurgical Coal Prices Fell as Chinese Demand Normalized',
  subtitle: 'Coking coal declined more than pulverized coal injection material over the 30 days to 17 July.',
  source: { name: 'Kommersant coal market reporting', period: '17 June–17 July 2026' },
  data: [
    { label: 'Coking coal', value: -7.5, displayValue: '−7.5%', quantity: '30-day export price change', scope: 'Russian metallurgical coal at Far East ports under FOB terms', period: '17 June–17 July 2026', tone: 'critical' },
    { label: 'PCI coal', value: -2.7, displayValue: '−2.7%', quantity: '30-day export price change', scope: 'Russian metallurgical coal at Far East ports under FOB terms', period: '17 June–17 July 2026', tone: 'warning' }
  ],
  measure: { quantity: '30-day export price change', unit: '%', decimals: 1, baseline: 'zero' },
  supportingFacts: [
    { value: '$148 / $144', label: 'Coking-coal and PCI prices per ton after the decline.', tone: 'primary' },
    { value: '−10% June; +1% H1', label: 'Chinese coal mining versus a year earlier, showing a monthly shock but higher half-year output.', tone: 'neutral' },
    { value: '+21% to 9.4m t', label: 'Chinese steel-inventory increase in June.', tone: 'warning' },
    { value: '−10% to −20%', label: 'Potential further fall in Russian metallurgical coal export prices.', tone: 'critical' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'direction' },
  options: { height: 'standard', sort: 'none' },
  metadata: { topic: 'metallurgical coal prices', dataPeriod: '17 June–17 July 2026', keyFinding: 'Russian Far East metallurgical coal prices weakened as Chinese supply recovered and steel inventories rose.' }
});

write('turkey-coal-squeeze', {
  recipe: 'comparison.range',
  title: 'Black Sea Coal Shipments Were Expected to Fall 15–35%',
  subtitle: 'The estimated decline was severe on both monthly and annual comparisons as Turkish buyers sought replacement routes.',
  source: { name: 'Kommersant', period: 'July 2026', url: 'https://www.kommersant.ru/doc/8845965' },
  data: [
    { label: 'Year-over-year decline', low: 25, high: 35, quantity: 'estimated Black Sea coal shipment decline', scope: 'Russian coal exports through Black Sea ports', period: 'July 2026', tone: 'critical', annotation: 'Expected decline from July 2025.' },
    { label: 'Month-over-month decline', low: 15, high: 25, quantity: 'estimated Black Sea coal shipment decline', scope: 'Russian coal exports through Black Sea ports', period: 'July 2026', tone: 'warning', annotation: 'Expected decline from June 2026.' }
  ],
  measure: { quantity: 'estimated Black Sea coal shipment decline', unit: '% decline', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '0.8–1.5m tons', label: 'Potential unavailable Russian coal for Turkish buyers over roughly three months.', tone: 'critical' },
    { value: '$107/t; +3.6%', label: '6,000 kcal coal price under CIF terms in the week of 17 July.', tone: 'warning' },
    { value: '+15% to +25%', label: 'Estimated increase in logistics cost for alternative routes.', tone: 'critical' },
    { value: '−$15 to −$30/t', label: 'Profitability loss on Baltic-routed deliveries.', tone: 'critical' }
  ],
  narrative: { frame: 'warning', density: 'detailed', emphasis: 'range' },
  options: { height: 'standard' },
  metadata: { topic: 'Russian coal to Turkey', dataPeriod: 'July–October 2026', keyFinding: 'Black Sea disruption left Turkish buyers short of Russian coal and made replacement routes less profitable.' }
});

write('urals-discount-freight', {
  recipe: 'comparison.change',
  title: 'The Black Sea Urals Discount Widened as Tanker Costs Rose',
  subtitle: 'The discount increased by $1.10 per barrel after attacks reduced tanker availability around Novorossiysk.',
  source: { name: 'Platts and Russian oil-market reporting', period: 'July 2026' },
  data: [
    { label: 'Previous discount', value: 25.5, displayValue: '$25.50/bbl', valueStatus: 'derived', quantity: 'Urals crude discount', scope: 'Black Sea Urals crude benchmark', period: 'Before latest July 2026 move', tone: 'neutral' },
    { label: 'Latest discount', value: 26.6, displayValue: '$26.60/bbl', valueStatus: 'reported', quantity: 'Urals crude discount', scope: 'Black Sea Urals crude benchmark', period: 'Late July 2026', tone: 'critical' }
  ],
  measure: { quantity: 'Urals crude discount', unit: 'USD/barrel', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'up', displayValue: '+$1.10', label: 'wider discount', position: 'between' },
  supportingFacts: [
    { value: '+14.6%', label: 'July increase in Novorossiysk-to-India transportation prices.', tone: 'critical' },
    { value: 'Fewer tankers', label: 'Reduced vessel availability transmitted security risk into the crude discount.', tone: 'warning' }
  ],
  note: 'Previous discount derived as $26.60 minus the reported $1.10 widening.',
  narrative: { frame: 'warning', density: 'editorial', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'Urals discount and freight', dataPeriod: 'July 2026', keyFinding: 'Tanker disruption widened the Black Sea Urals discount and raised India-bound freight costs.' }
});

write('south-moscow-sublease', {
  recipe: 'composition.stacked',
  title: 'Two Retailers Released 63,000 m² of South Moscow Warehouse Space',
  subtitle: 'A 38,000 m² warehouse and a 25,000 m² warehouse formed the full sublease package.',
  source: { name: 'Kommersant', period: 'July 2026', url: 'https://www.kommersant.ru/doc/8846779' },
  data: [
    { label: 'Larger warehouse', value: 38000, displayValue: '38,000 m²', tone: 'warning' },
    { label: 'Smaller warehouse', value: 25000, displayValue: '25,000 m²', tone: 'primary' }
  ],
  measure: { unit: 'm²', decimals: 0, baseline: 'zero' },
  supportingFacts: [
    { value: '16%', label: 'Subleases as a share of all warehouse space offered, after growth programs were cut.', tone: 'critical' }
  ],
  narrative: { frame: 'warning', density: 'minimal', emphasis: 'composition' },
  options: { height: 'short', showLegend: true, labelMode: 'inside' },
  metadata: { topic: 'Moscow warehouse subleases', dataPeriod: 'July 2026', keyFinding: 'Retailer retrenchment released 63,000 square meters of warehouse space in southern Moscow.' }
});

write('gtlk-first-half-loss', {
  recipe: 'comparison.change',
  title: 'GTLK’s First-Half Loss Widened Almost Eightfold',
  subtitle: 'The state leasing company moved from a 1.8 billion ruble loss in H1 2025 to a record 14.2 billion ruble loss in H1 2026.',
  source: { name: 'Kommersant and GTLK reporting', period: 'H1 2025–H1 2026', url: 'https://www.kommersant.ru/doc/8847713' },
  data: [
    { label: 'H1 2025', value: -1.8, displayValue: '−1.8bn RUB', quantity: 'GTLK net profit', scope: 'GTLK first-half financial result', period: 'H1 2025', tone: 'warning' },
    { label: 'H1 2026', value: -14.2, displayValue: '−14.2bn RUB', quantity: 'GTLK net profit', scope: 'GTLK first-half financial result', period: 'H1 2026', tone: 'critical' }
  ],
  measure: { quantity: 'GTLK net profit', unit: 'billion rubles', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−12.4bn RUB', label: 'year-over-year deterioration', position: 'between' },
  supportingFacts: [
    { value: '>20bn RUB', label: 'Reserve provisions in H1 2026.', tone: 'critical' },
    { value: '24bn RUB', label: 'Other income after roughly halving year over year.', tone: 'warning' },
    { value: '47.7bn RUB', label: 'Operating profit, up by less than 2%.', tone: 'primary' },
    { value: '560.6bn RUB; +20%', label: 'Net investment in leases.', tone: 'primary' }
  ],
  note: 'The linked article reports more than 23 billion rubles of foreign-exchange conversion expense for the prior-year comparison period, not H1 2026. The chart therefore does not attribute that amount to the current loss.',
  narrative: { frame: 'collapse', density: 'detailed', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'GTLK loss', dataPeriod: 'H1 2025–H1 2026', keyFinding: 'GTLK’s first-half loss deteriorated by 12.4 billion rubles year over year.' }
});

write('china-tire-pressure', {
  recipe: 'comparison.scenarios',
  title: 'Chinese Tire Imports Nearly Matched Russia’s Entire Q1 Output',
  subtitle: 'China shipped 6.44 million passenger-car tires to Russia while domestic plants produced 6.66 million.',
  source: { name: 'Russian tire-market reporting and Kommersant citing China customs data', period: 'Q1–H1 2026', url: 'https://www.kommersant.ru/doc/8847653' },
  data: [
    { label: 'Imports from China', value: 6.44, displayValue: '6.44m tires', quantity: 'passenger-car tire units', scope: 'Russian passenger-car tire market', period: 'Q1 2026', tone: 'warning' },
    { label: 'Russian production', value: 6.66, displayValue: '6.66m tires', quantity: 'passenger-car tire units', scope: 'Russian passenger-car tire market', period: 'Q1 2026', tone: 'primary' }
  ],
  measure: { quantity: 'passenger-car tire units', unit: 'million tires', decimals: 2, baseline: 'zero' },
  supportingFacts: [
    { value: '2.99m in June', label: 'Chinese passenger-car tire exports to Russia doubled year over year.', tone: 'critical' },
    { value: '$85m in June', label: 'Declared monthly value also doubled year over year.', tone: 'warning' },
    { value: '12.7m in H1; +60%', label: 'Kommersant reported the first-half customs series as additional market context.', tone: 'primary' },
    { value: '−23.3%', label: 'Q1 decline in Russian tire production.', tone: 'critical' }
  ],
  note: 'Russian-market reporting estimated a roughly 70% Chinese import share; Kommersant also described a possible protective duty of about 30%.',
  narrative: { frame: 'surprise', density: 'detailed', emphasis: 'gap' },
  options: { height: 'standard' },
  metadata: { topic: 'Chinese tire imports', dataPeriod: 'Q1–H1 2026', keyFinding: 'Chinese tire inflows approached domestic production and intensified pressure for trade protection.' }
});

write('fashion-volume-value-split', {
  recipe: 'comparison.range',
  title: 'Cross-Border Fashion Orders Surged as Domestic Purchases Fell',
  subtitle: 'Each indicator is indexed to its own prior comparison period at 100.',
  source: { name: 'Kommersant retail-market reporting', period: 'January–June 2026', url: 'https://www.kommersant.ru/doc/8847662' },
  data: [
    { label: 'Items purchased', low: 85, high: 90, quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'critical' },
    { label: 'Nominal market value', low: 105, high: 107, quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'primary' },
    { label: 'Average check', value: 107, displayValue: '107', quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'warning' },
    { label: 'Premium prices', low: 110, high: 120, quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'critical' },
    { label: 'Production costs', value: 112, displayValue: '112', quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'warning' },
    { label: 'Second-hand purchases', value: 109, displayValue: '109', quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'positive' },
    { label: 'Cross-border online orders', value: 140, displayValue: '140', quantity: 'indexed level versus prior comparison period', scope: 'Russian clothing and footwear market indicators', period: 'Latest reported 2026 comparison window', tone: 'positive' }
  ],
  measure: { quantity: 'indexed level versus prior comparison period', unit: 'index', decimals: 0, baseline: 'auto' },
  supportingFacts: [
    { value: '−10% to −15%', label: 'Change in clothing and footwear items purchased.', tone: 'critical' },
    { value: '+5% to +7%', label: 'Growth in nominal market value.', tone: 'primary' },
    { value: '+10% to +20%', label: 'Premium-segment price growth.', tone: 'warning' },
    { value: '3,121 RUB; +7%', label: 'Average clothing and footwear check.', tone: 'primary' }
  ],
  note: 'The source reports different comparison windows across indicators. Each mark is normalized to its own prior-period baseline of 100, so the chart compares direction and magnitude of change rather than absolute market levels.',
  narrative: { frame: 'divergence', density: 'detailed', emphasis: 'range' },
  options: { height: 'tall', sort: 'none', labelMode: 'outside' },
  metadata: { topic: 'clothing and footwear demand', dataPeriod: 'January–June 2026', keyFinding: 'Domestic fashion purchase volume fell while cross-border and second-hand channels expanded and prices rose.' }
});

write('alrosa-profit-reversal', {
  recipe: 'comparison.change',
  title: 'ALROSA Swung From a 39 Billion Ruble Profit to a 10.7 Billion Loss',
  subtitle: 'The sanctioned diamond miner recorded a nearly 50 billion ruble deterioration in its first-half result.',
  source: { name: 'Kommersant reporting on ALROSA results', period: 'H1 2025–H1 2026', url: 'https://www.kommersant.ru/doc/8860166' },
  data: [
    { label: 'H1 2025', value: 39, displayValue: '+39bn RUB', quantity: 'ALROSA net profit', scope: 'ALROSA first-half financial result', period: 'H1 2025', tone: 'positive' },
    { label: 'H1 2026', value: -10.7, displayValue: '−10.7bn RUB', quantity: 'ALROSA net profit', scope: 'ALROSA first-half financial result', period: 'H1 2026', tone: 'critical' }
  ],
  measure: { quantity: 'ALROSA net profit', unit: 'billion rubles', decimals: 1, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−49.7bn RUB', label: 'year-over-year swing', position: 'between' },
  supportingFacts: [
    { value: 'Sanctions pressure', label: 'Restrictions on Russian diamond exports continued to constrain the business.', tone: 'warning' }
  ],
  narrative: { frame: 'collapse', density: 'editorial', emphasis: 'direction' },
  options: { height: 'standard' },
  metadata: { topic: 'ALROSA earnings', dataPeriod: 'H1 2025–H1 2026', keyFinding: 'ALROSA’s first-half result deteriorated by 49.7 billion rubles and crossed into loss.' }
});

write('russian-inflation-dashboard', {
  recipe: 'trend.line',
  title: 'Weekly Inflation Fell to 0.04% After an Early-July Spike',
  subtitle: 'The official weekly rate peaked at 0.31% in early July before dropping to the lowest reading in the eight-week sequence.',
  source: { name: 'Rosstat via Interfax', period: '2 June–27 July 2026', url: 'https://www.interfax.ru/business/1106356' },
  data: [
    { label: '8 Jun', value: 0.20, displayValue: '0.20%' },
    { label: '15 Jun', value: 0.15, displayValue: '0.15%' },
    { label: '22 Jun', value: 0.25, displayValue: '0.25%' },
    { label: '29 Jun', value: 0.22, displayValue: '0.22%' },
    { label: '6 Jul', value: 0.31, displayValue: '0.31%', tone: 'critical' },
    { label: '13 Jul', value: 0.17, displayValue: '0.17%' },
    { label: '20 Jul', value: 0.17, displayValue: '0.17%' },
    { label: '27 Jul', value: 0.04, displayValue: '0.04%', tone: 'positive' }
  ],
  measure: { unit: '% per week', decimals: 2, baseline: 'zero' },
  emphasis: { direction: 'down', displayValue: '−0.27pp', label: 'from early-July peak', position: 'corner' },
  supportingFacts: [
    { value: '0.64%', label: 'Official July inflation through 27 July.', tone: 'warning' },
    { value: '4.86%', label: 'Official 2026 inflation through 27 July.', tone: 'warning' },
    { value: '5.95%', label: 'Reported annual inflation rate.', tone: 'critical' },
    { value: '0.56% vs 1.66%', label: 'Weekly gasoline inflation versus the previous week.', tone: 'primary' }
  ],
  narrative: { frame: 'comparison', density: 'detailed', emphasis: 'direction' },
  options: { height: 'standard', sort: 'none' },
  metadata: { topic: 'Russian inflation', dataPeriod: '2 June–27 July 2026', keyFinding: 'Weekly inflation fell sharply after peaking at 0.31% in early July, while cumulative inflation remained materially higher.' }
});

const routing = `# Routing matrix — ${week}\n\n| # | Story | Geographic evidence | Does where change the finding? | Workflow | Rationale |\n|---:|---|---|---|---|---|\n1|Ozon insurance repricing|No|No|standard-chart|One tariff changed over time; location is not explanatory.|\n2|Marketplace retrenchment|Company operations|No|standard-chart|The decisions are strategic statuses, not a spatial pattern.|\n3|Wildberries support request|No|No|standard-chart|Two parts form one requested total.|\n4|Kazakhstan warehouse requirement|Country-level market|No|standard-chart|The comparison is required area versus national vacancy, not subnational distribution.|\n5|Wildberries warehouse damage|Seven Russian regions|Yes|regional-breakdown|The spread and operational status of facilities is the finding.|\n6|Marketplace company churn|No|No|standard-chart|Entry and exit counts share one national scope.|\n7|Active company contraction|No|No|standard-chart|A national before-and-after company count.|\n8|E-commerce growth slowdown|No|No|standard-chart|The sequence over time is explanatory.|\n9|Regional fuel access|Ten Russian regions|Yes|regional-breakdown|Refinery proximity and delivery dependence vary spatially.|\n10|Zabaykalsky coverage|One region|No|standard-chart|The finding is a supply-to-need ratio; a map adds no explanatory value.|\n11|Fuel export bans|No|No|standard-chart|Policy channel and duration are categorical.|\n12|Emergency fuel imports|Origins are countries|No|standard-chart|Cargo size, not geography, carries the comparison.|\n13|Refinery output gap|No|No|standard-chart|A national served-versus-unmet composition.|\n14|Mongolia reserve buffer|No subnational data|No|standard-chart|Fuel types are ranked by reserve days.|\n15–17|VTB results|No|No|standard-chart|Financial quantities and operating decisions are national company metrics.|\n18–22|Grain and sunflower|Ports/routes named|No|standard-chart|Prices, forecast loss and capacity shares carry the findings; port geography is secondary.|\n23–24|Coal markets|Export basins/routes|No|standard-chart|Price, shortfall and logistics economics are the central measures.|\n25|Urals discount|Route named|No|standard-chart|The benchmark change and freight effect are quantitative.|\n26|Moscow sublease|One metro area|No|standard-chart|Two spaces compose one total.|\n27|GTLK loss|No|No|standard-chart|A company financial headline.|\n28|Chinese tires|Cross-border trade|No|standard-chart|Unit volumes share one national market scope.|\n29|Fashion demand|No|No|standard-chart|Volume and value directions are categorical market conditions.|\n30|ALROSA result|No|No|standard-chart|A same-company profit reversal over time.|\n31|Inflation|No|No|standard-chart|Different accumulation windows require labeled status metrics rather than one axis.|\n`;
fs.writeFileSync(path.join(specDir, 'routing-matrix.md'), routing);

const coverage = `# Input coverage matrix — ${week}\n\nEvery quantitative or operational datapoint in the assignment is represented below. Reputable external sources supplement the expert input without silently replacing or downgrading its claims.\n\n| Input section / datapoint | Chart | Treatment |\n|---|---|---|\nOzon: one direct strike, +230% insurance, fiberglass panels, −8.5% intraday, about −3% close|ozon-insurance-risk|Main comparison plus four supporting facts|\nMagnit marketplace shutdown and transformation; Wildberries acquisition cancellation and investment pause|marketplace-retrenchment|Four status rows|\nWildberries 500bn seller support and 300bn air defense|wildberries-support-request|Stacked 800bn composition plus Reuters decision-status context|\n100,000 m² sought versus 130,000 m² vacancy; two existing sites|wildberries-kazakhstan-capacity|Shared-scale comparison and context|\nRyazan, Perm, Udmurtia, Penza, Tambov, Volgograd, Samara; 200-drone rhetoric|wildberries-warehouse-damage-map|Seven-region map; uncertainty and conflicting reports stated|\n4m employment and 8–10% economy|ecommerce-growth-deceleration|Combined supporting fact|\nLiquidations +19.6% to 76,400; registrations −25% to 58,200|ecommerce-company-churn|Shared-scale event comparison|\nActive companies −4.9% to 456,700; first fall since 2021|ecommerce-active-company-base|Before/after with derived prior level|\nTurnover +18.4% to 5.9tn; 2025 29.4%; 2024 60.3%; 10–15% seller exit risk; ≤100k monthly turnover|ecommerce-growth-deceleration|Three-point trend plus context|\nOmsk, Volgograd, Ufa/Bashkortostan, Astrakhan 4–8h, Kemerovo one third, Novosibirsk over half, Chelyabinsk, Krasnodar half, Bryansk 10/20L, Zabaykalsky|russia-fuel-regional-map|Ten-region map|\nZabaykalsky 1,050 t/week versus 88,000 t/month|zabaykalsky-fuel-coverage|Normalized served-versus-unmet composition|\nGasoline six months; diesel producer one month; diesel non-producer six months|fuel-export-ban-structure|Policy status rows|\nKyrgyzstan 100,000 t outbound; India two tankers 60–100k; Morocco 30k; Kazakhstan 10k; 1–3 days|emergency-fuel-imports|Range comparison plus context|\n30–35% impaired output; production near 65% demand; reserves|refinery-output-gap|National composition|\nMongolia note|mongolia-fuel-buffer|Official reserve and dependency data supplement the brief input note|\nVTB H1 225.2bn, almost −20%; Q2 92.6bn, −33.6% y/y, −30% q/q|vtb-h1-profit|Headline and supporting facts|\nVTB Halls >100bn, installments, Q1 ~91bn vs Q2 17.9bn, H1 118.2bn −63%, 8bn loss|vtb-other-operating-income|Quarter comparison plus context|\nVTB retail 7tn −3.6%; corporate 18.6tn +7.9%; staff −10%; dividend below 50% likely|vtb-loan-book|Portfolio ranking plus context|\nDomestic wheat −8.6–8.9%; class prices; barley|grain-domestic-prices|Four-price ranking and decline fact|\nExport wheat 15,100 −9.6%; barley 13,000 −12.2%|grain-export-prices|Same-market price comparison|\nAzov 35% wheat and 25% total grain; export loss 6.5m; 33.9 to 27.4; land +1,400 and +27.3%|azov-grain-export-loss|Forecast change plus four facts|\nTaman and two Novorossiysk terminals 20m versus 50m exports|black-sea-terminal-exposure|Exposed capacity composition|\nSunflower oil −53.9% m/m, −14% y/y, −40% August, raw sunflower 40,200 RUB/t and −2.1%, EFKO turmoil|sunflower-export-shock|Headline plus four facts|\nCoking coal −7.5% to $148; PCI −2.7% to $144; China mining −10% June and +1% H1; steel stocks +21% to 9.4m; forecast −10–20%|east-coal-demand-slump|Diverging price changes plus context|\nTurkey coal $107 +3.6%; 0.8–1.5m shortfall; logistics +15–25%; profit −$15–30; shipment declines|turkey-coal-squeeze|Range headline plus context|\nUrals discount +$1.1 to $26.6; freight +14.6%|urals-discount-freight|Before/after with derived prior value|\nMoscow sublease 38k + 25k = 63k m²; 16% share|south-moscow-sublease|Stacked composition|\nGTLK 14.2bn loss; 20bn reserves; 23bn FX|gtlk-first-half-loss|Headline plus drivers|\nChina June tires 2.99m and $85m, both doubled; Q1 imports 6.44m; production 6.66m −23.3%|china-tire-pressure|Expert Q1 unit comparison plus Kommersant H1 and June context|\nClothing items −10–15%; spending +5–7%; premium +10–20%; average check 3,121 +7%|fashion-volume-value-split|Four status rows|\nALROSA +39bn to −10.7bn|alrosa-profit-reversal|Profit reversal|\nInflation 0.04% week; 0.64% July; 4.86% YTD; 5.95% annual|russian-inflation-dashboard|Four accumulation windows|\n`;
fs.writeFileSync(path.join(specDir, 'coverage-matrix.md'), coverage);

const correctedRouting = [
  `# Routing matrix — ${week}`,
  '',
  '| # | Story | Geographic evidence | Does where change the finding? | Workflow | Rationale |',
  '|---:|---|---|---|---|---|',
  '1|Ozon insurance repricing|No|No|standard-chart|One tariff changed over time; location is not explanatory.|',
  '2|Marketplace retrenchment|Company operations|No|standard-chart|Financial composition and operating-model evidence explain the strategic retreat.|',
  '3|Wildberries support request|No|No|standard-chart|Two parts form one requested total.|',
  '4|Kazakhstan warehouse requirement|Country-level market|No|standard-chart|Required area versus national vacancy carries the comparison.|',
  '5|Wildberries warehouse damage|Seven Russian regions|Yes|regional-breakdown|The spread and operating status of facilities is the finding.|',
  '6|Marketplace company churn|No|No|standard-chart|Entry and exit counts share one national scope.|',
  '7|Active company contraction|No|No|standard-chart|A national before-and-after company count.|',
  '8|E-commerce growth slowdown|No|No|standard-chart|The sequence over time is explanatory.|',
  '9|Regional fuel access|Ten Russian regions|Yes|regional-breakdown|Refinery proximity and delivery dependence vary spatially.|',
  '10|Zabaykalsky coverage|One region|No|standard-chart|A supply-to-need composition is more explanatory than a map.|',
  '11|Fuel export bans|No|No|standard-chart|Restriction duration is a common numeric measure across policy channels.|',
  '12|Emergency fuel imports|Origins are countries|No|standard-chart|Cargo size, not geography, carries the comparison.|',
  '13|Refinery output gap|No|No|standard-chart|A national served-versus-unmet composition.|',
  '14|Mongolia reserve buffer|No subnational data|No|standard-chart|Fuel types are ranked by reserve days.|',
  '15–17|VTB results|No|No|standard-chart|Financial quantities and operating decisions are company metrics.|',
  '18–22|Grain and sunflower|Ports/routes named|No|standard-chart|Prices, forecast loss and capacity shares carry the findings.|',
  '23–24|Coal markets|Export basins/routes|No|standard-chart|Price, shortfall and logistics economics are the central measures.|',
  '25|Urals discount|Route named|No|standard-chart|The benchmark change and freight effect are quantitative.|',
  '26|Moscow sublease|One metro area|No|standard-chart|Two spaces compose one total.|',
  '27|GTLK loss|No|No|standard-chart|A same-company first-half comparison shows the deterioration.|',
  '28|Chinese tires|Cross-border trade|No|standard-chart|Unit volumes share one national market scope.|',
  '29|Fashion demand|No|No|standard-chart|Prior-period indices make heterogeneous market changes comparable.|',
  '30|ALROSA result|No|No|standard-chart|A same-company profit reversal over time.|',
  '31|Inflation|No|No|standard-chart|The eight-week sequence shows the path to the latest reading.|',
  ''
].join('\n');
fs.writeFileSync(path.join(specDir, 'routing-matrix.md'), correctedRouting);

const correctedCoverage = [
  `# Input coverage matrix — ${week}`,
  '',
  'Every quantitative or operational datapoint in the assignment is represented below. Reputable external sources supplement the expert input without silently replacing or downgrading its claims.',
  '',
  '| Input section / datapoint | Chart | Treatment |',
  '|---|---|---|',
  'Ozon: one direct strike, +230% insurance, fiberglass panels, −8.5% intraday, about −3% close|ozon-insurance-risk|Main comparison plus four supporting facts|',
  'Magnit transformation; Wildberries acquisition cancellation and investment pause|marketplace-retrenchment|2024 revenue/loss composition plus four transition facts|',
  'Wildberries 500bn seller support and 300bn air defense|wildberries-support-request|Stacked 800bn request plus Reuters decision-status context|',
  '100,000 m² sought versus 130,000 m² vacancy; two existing sites|wildberries-kazakhstan-capacity|Shared-scale comparison and context|',
  'Ryazan, Perm, Udmurtia, Penza, Tambov, Volgograd, Samara; 200-drone rhetoric|wildberries-warehouse-damage-map|Seven-region map with disputed reports stated|',
  '4m employment and 8–10% economy|ecommerce-growth-deceleration|Combined supporting fact|',
  'Liquidations +19.6% to 76,400; registrations −25% to 58,200|ecommerce-company-churn|Shared-scale event comparison|',
  'Active companies −4.9% to 456,700; first fall since 2021|ecommerce-active-company-base|Before/after with derived prior level|',
  'Turnover +18.4% to 5.9tn; 2025 29.4%; 2024 60.3%; 10–15% seller exit risk; ≤100k monthly turnover|ecommerce-growth-deceleration|Three-point trend plus context|',
  'Omsk, Volgograd, Ufa/Bashkortostan, Astrakhan 4–8h, Kemerovo one third, Novosibirsk over half, Chelyabinsk, Krasnodar half, Bryansk 10/20L, Zabaykalsky|russia-fuel-regional-map|Ten-region map|',
  'Zabaykalsky 1,050 t/week versus 88,000 t/month|zabaykalsky-fuel-coverage|Monthly-equivalent served-versus-unmet composition|',
  'Gasoline six months; diesel producer one month; diesel non-producer six months|fuel-export-ban-structure|Four-channel duration ranking|',
  'Kyrgyzstan 100,000 t outbound; India two tankers 60–100k; Morocco 30k; Kazakhstan 10k; 1–3 days|emergency-fuel-imports|Range comparison plus context|',
  '30–35% impaired output; production near 65% demand; reserves|refinery-output-gap|National composition|',
  'Mongolia note|mongolia-fuel-buffer|Official reserve and dependency data supplement the brief input note|',
  'VTB H1 225.2bn, almost −20%; Q2 92.6bn, −33.6% y/y, −30% q/q|vtb-h1-profit|Derived Q1 versus reported Q2 plus H1 context|',
  'VTB Halls >100bn, installments, Q1 ~91bn vs Q2 17.9bn, H1 118.2bn −63%, 8bn loss|vtb-other-operating-income|Quarter comparison plus context|',
  'VTB retail 7tn −3.6%; corporate 18.6tn +7.9%; staff −10%; dividend below 50% likely|vtb-loan-book|Portfolio comparison plus context|',
  'Domestic wheat −8.6–8.9%; class prices; barley|grain-domestic-prices|Four-price ranking and decline fact|',
  'Export wheat 15,100 −9.6%; barley 13,000 −12.2%|grain-export-prices|Same-market price comparison|',
  'Azov 35% wheat and 25% total grain; export loss 6.5m; 33.9 to 27.4; delivery 1,400 and +27.3%|azov-grain-export-loss|Forecast change plus delivery-cost context|',
  'Taman and two Novorossiysk terminals 20m versus 50m exports|black-sea-terminal-exposure|Exposed capacity composition|',
  'Sunflower oil −53.9% m/m, −14% y/y, −40% August, raw sunflower 40,200 RUB/t and −2.1%, EFKO turmoil|sunflower-export-shock|Three-point normalized export trend plus four facts|',
  'Coking coal −7.5% to $148; PCI −2.7% to $144; China mining −10% June and +1% H1; steel stocks +21% to 9.4m; forecast −10–20%|east-coal-demand-slump|Diverging price changes plus context|',
  'Turkey coal $107 +3.6%; 0.8–1.5m shortfall; logistics +15–25%; profit −$15–30; shipment declines|turkey-coal-squeeze|Monthly and annual shipment-decline ranges plus context|',
  'Urals discount +$1.1 to $26.6; freight +14.6%|urals-discount-freight|Before/after with derived prior value|',
  'Moscow sublease 38k + 25k = 63k m²; 16% share|south-moscow-sublease|Stacked composition|',
  'GTLK 14.2bn loss; 20bn reserves; supplied 23bn FX claim|gtlk-first-half-loss|H1 2025–26 comparison plus reserve and FX context|',
  'China June tires 2.99m and $85m, both doubled; Q1 imports 6.44m; production 6.66m −23.3%|china-tire-pressure|Expert Q1 unit comparison plus Kommersant H1 and June context|',
  'Clothing items −10–15%; spending +5–7%; premium +10–20%; average check 3,121 +7%|fashion-volume-value-split|Seven normalized market indicators plus original facts|',
  'ALROSA +39bn to −10.7bn|alrosa-profit-reversal|Profit reversal|',
  'Inflation 0.04% week; 0.64% July; 4.86% YTD; 5.95% annual|russian-inflation-dashboard|Eight-week trend plus accumulation facts|',
  ''
].join('\n');
fs.writeFileSync(path.join(specDir, 'coverage-matrix.md'), correctedCoverage);

const manifest = fs.readdirSync(specDir).filter((name) => name.endsWith('.json') && name !== 'manifest.json').sort();
fs.writeFileSync(path.join(specDir, 'manifest.json'), `${JSON.stringify({ week, chartCount: manifest.length, specs: manifest }, null, 2)}\n`);
console.log(`Wrote ${manifest.length} ChartSpecs to ${specDir}`);
