/**
 * projzh@1.0.0 为 CJS 包且未提供类型声明，其子路径模块（projection/datum）在
 * TS 严格模式下会报 ts(7016) 隐式 any，这里按需补齐其模块类型。
 */
declare module 'projzh/projection/index' {
    /** 投影变换：input/output 为按 dimension 连续排布的坐标数组 */
    interface Projection {
        forward(input: number[], output?: number[], dimension?: number): number[];
        inverse(input: number[], output?: number[], dimension?: number): number[];
    }

    /** 百度墨卡托投影（BD-09 墨卡托） */
    export const baiduMercator: Projection;
    /** 球面墨卡托投影（EPSG:3857） */
    export const sphericalMercator: Projection;
}

declare module 'projzh/datum/index' {
    /** 大地基准转换：input/output 为按 dimension 连续排布的经纬度数组 */
    interface Datum {
        toWGS84(input: number[], output?: number[], dimension?: number): number[];
        fromWGS84(input: number[], output?: number[], dimension?: number): number[];
    }

    /** 百度坐标系 (BD-09) */
    export const bd09: Datum & {
        toGCJ02(input: number[], output?: number[], dimension?: number): number[];
        fromGCJ02(input: number[], output?: number[], dimension?: number): number[];
    };
    /** 火星坐标系 (GCJ-02) */
    export const gcj02: Datum;
}
