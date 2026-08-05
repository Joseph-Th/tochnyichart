/**
 * Tochnyi Charts Library
 * Helper functions for creating AMCharts in Tochnyi style
 */

const Tochnyi = {
    _roots: [],
    // Color palette
    colors: {
        blue: 0x005bbb,
        yellow: 0xffd500,
        blueDark: 0x003d7a,
        blueLight: 0x0088ff,
        yellowDark: 0xcc9900,
        yellowLight: 0xffeb3b,
        black: 0x020303,
        gray: 0x666666,
        white: 0xffffff
    },

    // Color palette as array (for series)
    palette: [0x005bbb, 0xffd500, 0x0088ff, 0xcc9900, 0x003d7a, 0xffeb3b],

    // Shared visual policy for quantitative marks. Brand hues remain available
    // as strokes, while translucent fills keep charts calm and editorial.
    marks: {
        column: {
            fillOpacity: 0.66,
            strokeOpacity: 0.9,
            strokeWidth: 1.5,
            hoverFillOpacity: 0.78
        },
        watermarkOpacity: 0.085
    },

    // Typography settings
    font: {
        family: "Mukta",
        sizes: {
            small: 14,
            normal: 18,
            medium: 20,
            large: 24,
            xlarge: 28,
            title: 32
        },
        weights: {
            regular: "400",
            medium: "500",
            semibold: "600",
            bold: "700"
        }
    },

    /**
     * Initialize a chart root with Tochnyi theme
     */
    createRoot: function(containerId) {
        var root = am5.Root.new(containerId);
        root.setThemes([am5themes_Animated.new(root)]);
        this._roots.push(root);
        return root;
    },

    /**
     * Create standard X-axis renderer with Tochnyi styling
     */
    createXRenderer: function(root, options = {}) {
        var renderer = am5xy.AxisRendererX.new(root, {
            minGridDistance: options.minGridDistance || 30,
            cellStartLocation: options.cellStartLocation || 0.15,
            cellEndLocation: options.cellEndLocation || 0.85,
            ...options
        });

        renderer.labels.template.setAll({
            fontSize: options.fontSize || this.font.sizes.medium,
            fontFamily: this.font.family,
            fontWeight: options.fontWeight || this.font.weights.medium
        });

        renderer.grid.template.setAll({
            visible: options.showGrid !== undefined ? options.showGrid : false
        });

        return renderer;
    },

    /**
     * Create standard Y-axis renderer with Tochnyi styling
     */
    createYRenderer: function(root, options = {}) {
        var renderer = am5xy.AxisRendererY.new(root, {
            strokeOpacity: 0.3,
            ...options
        });

        renderer.labels.template.setAll({
            fontSize: options.fontSize || this.font.sizes.normal,
            fontFamily: this.font.family,
            fontWeight: options.fontWeight || this.font.weights.medium
        });

        renderer.grid.template.setAll({
            strokeOpacity: 0.3
        });

        return renderer;
    },

    /**
     * Add Y-axis label (rotated title)
     */
    addYAxisLabel: function(root, yAxis, text) {
        yAxis.children.unshift(am5.Label.new(root, {
            rotation: -90,
            text: text,
            y: am5.percent(50),
            centerX: am5.percent(50),
            fontSize: this.font.sizes.small + 2,
            fontWeight: this.font.weights.semibold,
            fontFamily: this.font.family
        }));
    },

    /**
     * Add X-axis label (bottom title)
     */
    addXAxisLabel: function(root, xAxis, text) {
        xAxis.children.push(am5.Label.new(root, {
            text: text,
            x: am5.percent(50),
            centerX: am5.percent(50),
            fontSize: this.font.sizes.small + 2,
            fontWeight: this.font.weights.semibold,
            fontFamily: this.font.family,
            paddingTop: 10
        }));
    },

    /**
     * Create a legend with Tochnyi styling
     */
    createLegend: function(root, chart, options = {}) {
        var legend = chart.children.push(am5.Legend.new(root, {
            centerX: options.centerX !== undefined ? options.centerX : am5.percent(50),
            x: options.x !== undefined ? options.x : am5.percent(50),
            y: options.y,
            marginTop: options.marginTop || 20,
            marginLeft: options.marginLeft || 0,
            layout: options.layout || root.horizontalLayout
        }));

        legend.labels.template.setAll({
            fontSize: this.font.sizes.normal,
            fontFamily: this.font.family,
            fontWeight: this.font.weights.medium
        });

        return legend;
    },

    /**
     * Create a legend for pie charts (positioned right, aligned with pie center)
     */
    createPieLegend: function(root, chart) {
        var legend = chart.children.push(am5.Legend.new(root, {
            x: am5.percent(100),
            centerX: am5.percent(100),
            y: am5.percent(50),
            centerY: 0,
            layout: root.verticalLayout
        }));

        legend.labels.template.setAll({
            fontSize: this.font.sizes.normal,
            fontFamily: this.font.family,
            fontWeight: this.font.weights.medium
        });

        return legend;
    },

    /**
     * Create column series with Tochnyi styling
     */
    createColumnSeries: function(root, chart, options) {
        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            name: options.name,
            xAxis: options.xAxis,
            yAxis: options.yAxis,
            valueYField: options.valueField,
            categoryXField: options.categoryField,
            fill: am5.color(options.color || this.colors.blue),
            stroke: am5.color(options.color || this.colors.blue),
            sequencedInterpolation: true
        }));

        series.columns.template.setAll({
            tooltipText: options.tooltipText || "{name}: {valueY}",
            width: am5.percent(options.width || 80),
            cornerRadiusTL: 4,
            cornerRadiusTR: 4,
            fillOpacity: this.marks.column.fillOpacity,
            strokeOpacity: this.marks.column.strokeOpacity,
            strokeWidth: this.marks.column.strokeWidth
        });
        series.columns.template.states.create('hover', {
            fillOpacity: this.marks.column.hoverFillOpacity
        });

        // Add value labels if requested
        if (options.showLabels !== false) {
            var labelColor = options.labelColor || this.colors.black;
            series.bullets.push(function() {
                var label = am5.Label.new(root, {
                    text: options.labelFormat || "{valueY}",
                    fill: am5.color(labelColor),
                    centerY: am5.percent(50),
                    centerX: am5.percent(50),
                    fontSize: Tochnyi.font.sizes.xlarge,
                    fontWeight: Tochnyi.font.weights.bold,
                    fontFamily: Tochnyi.font.family,
                    populateText: true
                });

                // Add adapter for dynamic label color when using applyBarColors
                label.adapters.add("fill", function(fill, target) {
                    if (series._tochnyiPalette && target.dataItem) {
                        var index = series.dataItems.indexOf(target.dataItem);
                        var barColor = series._tochnyiPalette[index % series._tochnyiPalette.length];
                        return am5.color(Tochnyi.colors.black);
                    }
                    return fill;
                });

                return am5.Bullet.new(root, {
                    locationY: options.labelLocation || 0.5,
                    sprite: label
                });
            });
        }

        return series;
    },

    /**
     * Create line series with Tochnyi styling
     */
    createLineSeries: function(root, chart, options) {
        var series = chart.series.push(am5xy.LineSeries.new(root, {
            name: options.name,
            xAxis: options.xAxis,
            yAxis: options.yAxis,
            valueYField: options.valueField,
            categoryXField: options.categoryField,
            stroke: am5.color(options.color || this.colors.blue),
            fill: am5.color(options.color || this.colors.blue)
        }));
        series._tochnyiPointSprites = [];

        series.strokes.template.setAll({
            strokeWidth: options.strokeWidth || 3
        });

        // Add bullet points
        if (options.showBullets !== false) {
            series.bullets.push(function(rootRef, seriesRef, dataItem) {
                var point = am5.Circle.new(rootRef, {
                    radius: options.bulletRadius || 6,
                    fill: am5.color(options.color || Tochnyi.colors.blue),
                    stroke: am5.color(Tochnyi.colors.white),
                    strokeWidth: 2,
                    themeTags: ['point']
                });
                point.dataItem = dataItem;
                seriesRef._tochnyiPointSprites.push({ dataItem: dataItem, sprite: point });
                return am5.Bullet.new(rootRef, {
                    sprite: point
                });
            });
        }

        return series;
    },

    /**
     * Create pie/donut chart series with Tochnyi styling
     * Options:
     *   - minLabelPercent: Hide labels for slices smaller than this % (default: 5)
     */
    createPieSeries: function(root, chart, options) {
        var series = chart.series.push(am5percent.PieSeries.new(root, {
            valueField: options.valueField || "value",
            categoryField: options.categoryField || "category",
            alignLabels: options.alignLabels !== undefined ? options.alignLabels : false
        }));

        series.slices.template.setAll({
            strokeWidth: 3,
            stroke: am5.color(this.colors.white),
            tooltipText: options.tooltipText || "{category}: {value}"
        });

        series.get("colors").set("colors",
            (options.colors || this.palette).map(c => am5.color(c))
        );

        series.labels.template.setAll({
            fontSize: this.font.sizes.normal,
            fontFamily: this.font.family,
            fontWeight: this.font.weights.medium,
            text: options.labelFormat || "{category}: {value}%",
            radius: 10
        });

        // Hide labels for small slices to avoid overlap
        var minPercent = options.minLabelPercent !== undefined ? options.minLabelPercent : 5;
        series.labels.template.adapters.add("visible", function(visible, target) {
            if (target.dataItem) {
                var percent = target.dataItem.get("valuePercentTotal");
                return percent >= minPercent;
            }
            return visible;
        });

        // Also hide ticks for small slices
        series.ticks.template.adapters.add("visible", function(visible, target) {
            if (target.dataItem) {
                var percent = target.dataItem.get("valuePercentTotal");
                return percent >= minPercent;
            }
            return visible;
        });

        return series;
    },

    /**
     * Add center label for donut charts
     */
    addDonutCenterLabel: function(root, chart, mainText, subText) {
        chart.seriesContainer.children.push(am5.Label.new(root, {
            text: mainText,
            fontSize: 48,
            fontWeight: this.font.weights.bold,
            fontFamily: this.font.family,
            fill: am5.color(this.colors.blue),
            centerX: am5.percent(50),
            centerY: am5.percent(50),
            x: am5.percent(50),
            y: am5.percent(50)
        }));

        if (subText) {
            chart.seriesContainer.children.push(am5.Label.new(root, {
                text: subText,
                fontSize: this.font.sizes.normal,
                fontWeight: this.font.weights.medium,
                fontFamily: this.font.family,
                fill: am5.color(this.colors.gray),
                centerX: am5.percent(50),
                centerY: am5.percent(50),
                x: am5.percent(50),
                y: am5.percent(50),
                dy: 35
            }));
        }
    },

    /**
     * Add annotation label to chart
     */
    addAnnotation: function(root, chart, text, options = {}) {
        chart.children.push(am5.Label.new(root, {
            text: text,
            fontSize: options.fontSize || this.font.sizes.normal,
            fontFamily: this.font.family,
            fontWeight: options.fontWeight || this.font.weights.bold,
            fill: am5.color(options.color || this.colors.blue),
            x: am5.percent(options.x || 50),
            y: am5.percent(options.y || 10),
            centerX: am5.percent(options.centerX || 50)
        }));
    },

    /**
     * Check if a color is light (needs dark text)
     */
    isLightColor: function(color) {
        // Yellow colors need black text
        var lightColors = [0xffd500, 0xfdd400, 0xffeb3b];
        return lightColors.includes(color);
    },

    /**
     * Apply the shared low-saturation column treatment to any AMCharts series.
     * Geometry remains recipe-owned; opacity and outline policy stay global.
     */
    applyColumnAppearance: function(series, options = {}) {
        var style = this.marks.column;
        series.columns.template.setAll({
            fillOpacity: options.fillOpacity !== undefined ? options.fillOpacity : style.fillOpacity,
            strokeOpacity: options.strokeOpacity !== undefined ? options.strokeOpacity : style.strokeOpacity,
            strokeWidth: options.strokeWidth !== undefined ? options.strokeWidth : style.strokeWidth
        });
        series.columns.template.states.create('hover', {
            fillOpacity: options.hoverFillOpacity !== undefined ? options.hoverFillOpacity : style.hoverFillOpacity
        });
        return series;
    },

    /**
     * Apply multi-color to bars based on index
     */
    applyBarColors: function(series, colors) {
        var palette = colors || this.palette;
        var self = this;
        this.applyColumnAppearance(series);

        series.columns.template.adapters.add("fill", function(fill, target) {
            var dataItem = target.dataItem;
            if (dataItem) {
                var index = series.dataItems.indexOf(dataItem);
                return am5.color(palette[index % palette.length]);
            }
            return fill;
        });

        series.columns.template.adapters.add("stroke", function(stroke, target) {
            var dataItem = target.dataItem;
            if (dataItem) {
                var index = series.dataItems.indexOf(dataItem);
                return am5.color(palette[index % palette.length]);
            }
            return stroke;
        });

        // Store palette on series for label color lookup
        series._tochnyiPalette = palette;
        series._tochnyiSelf = self;
    },

    /**
     * Get today's date formatted
     */
    getFormattedDate: function() {
        var today = new Date();
        var year = today.getFullYear();
        var month = String(today.getMonth() + 1).padStart(2, '0');
        var day = String(today.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tochnyi;
}

// Explicit browser export for the declarative renderer. Top-level const bindings
// are not properties of window, so consumers should not rely on implicit globals.
if (typeof window !== 'undefined') {
    window.Tochnyi = Tochnyi;
}
