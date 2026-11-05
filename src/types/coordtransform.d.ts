/**
 * coordtransform@2.1.2 为 UMD/CJS 包且未提供类型声明，这里补齐其模块类型，
 * 避免在 TS 严格模式下报 ts(7016) 隐式 any。
 */
declare module 'coordtransform' {
    /** 经纬度坐标：[经度, 纬度] */
    type LngLat = [number, number];

    interface Coordtransform {
        /** 百度坐标系 (BD-09) 转 火星坐标系 (GCJ-02) */
        bd09togcj02(lng: number, lat: number): LngLat;
        /** 火星坐标系 (GCJ-02) 转 百度坐标系 (BD-09) */
        gcj02tobd09(lng: number, lat: number): LngLat;
        /** WGS84 转 火星坐标系 (GCJ-02) */
        wgs84togcj02(lng: number, lat: number): LngLat;
        /** 火星坐标系 (GCJ-02) 转 WGS84 */
        gcj02towgs84(lng: number, lat: number): LngLat;
    }

    const coordtransform: Coordtransform;
    export default coordtransform;
}
