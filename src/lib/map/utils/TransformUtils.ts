import coordtransform from 'coordtransform';
import { baiduMercator } from 'projzh/projection/index';
import { bd09 } from 'projzh/datum/index';
import { transform as olTransform } from 'ol/proj.js';
import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';

/** 坐标环 / 面 / 多面（对应 GeoJSON Polygon 与 MultiPolygon 的 coordinates 层级） */
export type Ring = Coordinate[];
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];

/** 投影代码：EPSG:4326 / EPSG:3857 及本项目注册的 GCJ-02、DB09-MC */
export type ProjectionCode = string;

/** 火星坐标(GCJ-02) 转 经纬度(WGS84) */
export const gcj02ToWgs84 = (coordinate: Coordinate): Coordinate =>
    coordtransform.gcj02towgs84(coordinate[0], coordinate[1]);

/** 火星坐标(GCJ-02) 转 Web 墨卡托(EPSG:3857)：先回算 WGS84 再投影 */
export const gcj02ToMercator = (coordinate: Coordinate): Coordinate =>
    olTransform(gcj02ToWgs84(coordinate), 'EPSG:4326', 'EPSG:3857');

/** 经纬度(WGS84) 转 百度墨卡托(DB09-MC)：先做 BD09 偏移再投影 */
export const wgs84ToBaiduMercator = (coordinate: Coordinate): Coordinate =>
    baiduMercator.forward(bd09.fromWGS84(coordinate));

/** 逐点转换多面坐标，避免各转换函数重复三层 map 嵌套 */
const transformMultiPolygonPoints = (
    coordinates: MultiPolygon,
    convert: (coordinate: Coordinate) => Coordinate,
): MultiPolygon => {
    if (!Array.isArray(coordinates)) {
        throw new Error('Invalid coordinates format');
    }
    return coordinates.map((polygon) => polygon.map((ring) => ring.map(convert)));
};

/** 火星坐标多面 转 Web 墨卡托 */
export const gcj02ToMercatorMultiPolygon = (coordinates: MultiPolygon): MultiPolygon =>
    transformMultiPolygonPoints(coordinates, gcj02ToMercator);

/** 火星坐标多面 转 经纬度(WGS84) */
export const gcj02ToWgs84MultiPolygon = (coordinates: MultiPolygon): MultiPolygon =>
    transformMultiPolygonPoints(coordinates, gcj02ToWgs84);

/**
 * 火星坐标(GCJ-02) 扁平坐标串逐点回算经纬度(WGS84)。
 * 形参与返回值兼容 ol/geom/Geometry#applyTransform 的变换函数，
 * 可直接用于把 GeoJSON 几何（Polygon/MultiPolygon 等）整体做偏移校正。
 */
export const gcj02ToWgs84FlatCoordinates = (
    flatCoordinates: number[],
    output?: number[],
    dimension = 2,
): number[] => {
    const result = output ?? new Array<number>(flatCoordinates.length);
    for (let i = 0; i < flatCoordinates.length; i += dimension) {
        const [lng, lat] = gcj02ToWgs84([flatCoordinates[i], flatCoordinates[i + 1]]);
        result[i] = lng;
        result[i + 1] = lat;
        // 第三维（如高程）原样保留
        for (let k = i + 2; k < i + dimension; k++) result[k] = flatCoordinates[k];
    }
    return result;
};

/** 任意投影间的多面坐标转换 */
export const transformMultiPolygon = (
    coordinates: MultiPolygon,
    source: ProjectionCode,
    destination: ProjectionCode,
): MultiPolygon =>
    transformMultiPolygonPoints(coordinates, (coordinate) =>
        olTransform(coordinate, source, destination));

/** 矩形范围按对角点转换（范围始终为 [左下x, 左下y, 右上x, 右上y]） */
const transformExtentCorners = (
    extent: Extent,
    convert: (coordinate: Coordinate) => Coordinate,
): Extent => {
    const leftBottom = convert([extent[0], extent[1]]);
    const rightTop = convert([extent[2], extent[3]]);
    return [leftBottom[0], leftBottom[1], rightTop[0], rightTop[1]];
};

/** 任意投影间的范围转换 */
export const transformExtent = (
    extent: Extent,
    source: ProjectionCode,
    destination: ProjectionCode,
): Extent =>
    transformExtentCorners(extent, (coordinate) => olTransform(coordinate, source, destination));

/** 范围(WGS84 经纬度) 转 Web 墨卡托 */
export const transformExtentWgs84ToMercator = (extent: Extent): Extent =>
    transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

/** 范围转经纬度(WGS84) */
export const transformExtentToWgs84 = (extent: Extent, source: ProjectionCode): Extent =>
    transformExtent(extent, source, 'EPSG:4326');

/** 坐标转经纬度(WGS84) */
export const transformToWgs84 = (coordinate: Coordinate, source: ProjectionCode): Coordinate =>
    olTransform(coordinate, source, 'EPSG:4326');
