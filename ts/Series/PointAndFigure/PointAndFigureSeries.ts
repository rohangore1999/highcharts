/* *
 *
 *  (c) 2010-2024 Kamil Musialowski
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *  Imports
 *
 * */

import PointAndFigurePoint from './PointAndFigurePoint.js';
import PointAndFigureSeriesDefaults from './PointAndFigureSeriesDefaults.js';
import PointAndFigureSeriesOptions from './PointAndFigureSeriesOptions';
import ScatterPointOptions from '../Scatter/ScatterPointOptions.js';
import SeriesRegistry from '../../Core/Series/SeriesRegistry.js';

import Point from '../../Core/Series/Point.js';
import SVGAttributes from '../../Core/Renderer/SVG/SVGAttributes.js';
import Axis from '../../Core/Axis/Axis.js';
import { SymbolKey } from '../../Core/Renderer/SVG/SymbolType.js';

import H from '../../Core/Globals.js';
import U from '../../Core/Utilities.js';
const { composed } = H;
const {
    scatter: ScatterSeries,
    column: {
        prototype: columnProto
    }
} = SeriesRegistry.seriesTypes;
const {
    addEvent,
    extend,
    merge,
    pushUnique,
    isNumber,
    relativeLength
} = U;


/* *
 *
 *  Declarations
 *
 * */


/* *
 *
 *  Functions
 *
 * */

/**
 *
 */
function generatePnfData(
    this: Axis
): void {
    const series = this.series;

    series.forEach((series): void => {
        if (series.is('pointandfigure')) {
            const pnfSeries = series as PointAndFigureSeries;
            pnfSeries.generatePnfData();
        }
    });
}

/* *
 *
 *  Class
 *
 * */

/**
 * The series type
 *
 * @private
 * @class
 * @name Highcharts.seriesTypes.pointandfigure
 *
 * @augments Highcharts.Series
 */
class PointAndFigureSeries extends ScatterSeries {

    /* *
     *
     *  Static Properties
     *
    * */

    public static defaultOptions: PointAndFigureSeriesOptions = merge(
        ScatterSeries.defaultOptions,
        PointAndFigureSeriesDefaults
    );

    /* *
     *
     *  Static Functions
     *
     * */

    public static compose(
        AxisClass: typeof Axis
    ): void {
        if (pushUnique(composed, 'pointandfigure')) {
            addEvent(AxisClass, 'postProcessData', generatePnfData);
        }
    }

    /* *
     *
     *  Properties
     *
     * */

    public options!: PointAndFigureSeriesOptions;

    public points!: Array<PointAndFigurePoint>;

    public xData!: Array<number>;

    public yData!: Array<number>;

    /* *
     *
     *  Functions
     *
     * */

    public generatePnfData(
        this: PointAndFigureSeries
    ): void {
        const series = this,
            options = series.options,
            xData = series.xData,
            yData = series.yData,
            boxSize = options.boxSize,
            calculatedBoxSize = isNumber(boxSize) ?
                boxSize : relativeLength(boxSize, yData[0]),
            pnfDataGroups = series.pnfDataGroups,
            reversal = calculatedBoxSize * options.reversalAmount;

        series.calculatedBoxSize = calculatedBoxSize;

        let upTrend: boolean;

        /**
         *
         */
        function getLastPoint(pnfDataGroups: Array<PointAndFigureGroup>): number {
            const y = pnfDataGroups[pnfDataGroups.length - 1].y;
            return y[y.length - 1];
        }

        /**
         *
         */
        function pushPointGroup(
            x: number,
            y: Array<number>,
            upTrend: boolean
        ): void {
            const marker = upTrend ? series.options.markerUp : void 0;
            pnfDataGroups.push({
                x,
                y,
                marker
            });
        }

        /**
         *
         */
        function pushNewPoint(
            y: number,
            upTrend: boolean,
            lastPoint: number
        ): void {
            const currPointGroup = pnfDataGroups[pnfDataGroups.length - 1],
                flipFactor = upTrend ? 1 : -1,
                times = Math.floor(
                    flipFactor * (y - lastPoint) / calculatedBoxSize
                );

            for (let i = 1; i <= times; i++) {
                const newPoint =
                    lastPoint + flipFactor * (calculatedBoxSize * i);
                currPointGroup.y.push(newPoint);
            }
        }

        if (this.isDirtyData || pnfDataGroups.length === 0) {

            this.pnfDataGroups.length = 0;

            // Get first point and determine its symbol and trend
            for (let i = 0; i < yData.length; i++) {
                const x = xData[i],
                    close = yData[i],
                    firstPoint = yData[0];

                if (close - firstPoint >= calculatedBoxSize) {
                    pushPointGroup(x, [close], true);
                    upTrend = true;
                    break;
                }
                if (firstPoint - close >= calculatedBoxSize) {
                    pushPointGroup(x, [close], false);
                    upTrend = false;
                    break;
                }
            }

            yData.forEach((close, i): void => {
                const x = xData[i],
                    lastPoint = getLastPoint(pnfDataGroups);

                if (upTrend) {
                    // Add point going UP
                    if (close - lastPoint >= calculatedBoxSize) {
                        pushNewPoint(close, upTrend, lastPoint);
                    }

                    if (lastPoint - close >= reversal) { // Handle reversal
                        upTrend = false;

                        pushPointGroup(x, [], false);
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                }

                if (!upTrend) {
                    // Add point going DOWN
                    if (lastPoint - close >= calculatedBoxSize) {
                        pushNewPoint(close, upTrend, lastPoint);
                    }

                    if (close - lastPoint >= reversal) { // Handle reversal
                        upTrend = true;

                        pushPointGroup(x, [], true);
                        pushNewPoint(close, upTrend, lastPoint);
                    }
                }
            });
        }

        // Process the pnfDataGroups to HC series format
        const finalData: ScatterPointOptions[] = [];

        series.processedXData.length = 0;
        series.processedYData.length = 0;

        pnfDataGroups.forEach((point): void => {
            const x = point.x;

            point.y.forEach((y): void => {
                series.processedXData.push(x);
                series.processedYData.push(y as any);
                finalData.push({
                    x,
                    y,
                    marker: point.marker
                });
            });
        });

        series.pnfDataGroups = pnfDataGroups;
        series.processedData = finalData;
    }

    public markerAttribs(
        point: Point
    ): SVGAttributes {
        const series = this,
            options = series.options,
            attribs: SVGAttributes = {},
            pos = point.pos();

        attribs.width = series.markerWidth;
        attribs.height = series.markerHeight;
        if (pos && attribs.width && attribs.height) {
            attribs.x = pos[0] - Math.round(attribs.width) / 2;
            attribs.y = pos[1] - Math.round(attribs.height) / 2;
        }
        if (options.crisp && attribs.x) {
        // Math.floor for #1843:
            attribs.x = Math.floor(attribs.x);
        }
        return attribs;
    }

    public translate(): void {
        const metrics = this.getColumnMetrics(),
            calculatedBoxSize = this.calculatedBoxSize;

        this.markerWidth = metrics.width + metrics.paddedWidth + metrics.offset;
        this.markerHeight =
            this.yAxis.toPixels(0) - this.yAxis.toPixels(calculatedBoxSize);

        super.translate();
    }
}

/* *
 *
 *  Class Prototype
 *
 * */

interface PointAndFigureGroup {
    x: number;
    y: Array<number>;
    marker?: {
        symbol?: SymbolKey;
    }
}

interface PointAndFigureSeries {
    takeOrdinalPosition: boolean;
    pnfDataGroups: Array<PointAndFigureGroup>;
    getColumnMetrics: typeof columnProto.getColumnMetrics;
    markerWidth: number;
    markerHeight: number;
    calculatedBoxSize: number;
}
extend(PointAndFigureSeries.prototype, {
    takeOrdinalPosition: true,
    pnfDataGroups: [],
    getColumnMetrics: columnProto.getColumnMetrics,
    pointClass: PointAndFigurePoint
});

/* *
 *
 *  Registry
 *
 * */

declare module '../../Core/Series/SeriesType' {
    interface SeriesTypeRegistry {
        pointandfigure: typeof PointAndFigureSeries;
    }
}

SeriesRegistry.registerSeriesType('pointandfigure', PointAndFigureSeries);

/* *
 *
 *  Default Export
 *
 * */

export default PointAndFigureSeries;
