import { wgs84ToBaiduMercator } from '@/lib/map/utils/TransformUtils';
import type { TileIndex, TileUrlParams } from '@/lib/map/types';

/** 地图源类型判定（对应 src/config/layerList 的 mapType） */
export const isTdt = (mapType?: string) => mapType === 'tdt';
export const isTencent = (mapType?: string) => mapType === 'tencent';
export const isBdMap = (mapType?: string) => mapType === 'bdmap';
export const is360Map = (mapType?: string) => mapType === '360map';

/** [min, max] 闭区间随机整数 */
export const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 子域名轮换：把 URL 里的 {0-3}、{b-c} 这类范围占位换成其中一个取值。
 * 高德/天地图/百度等瓦片服务都按子域名分流，固定用一个域名容易被限流。
 */
export const replaceSubdomain = (url: string, subdomains?: (string | number)[]) => {
    if (!subdomains?.length) return url;
    return url.replace(
        /\{[a-z0-9]-[a-z0-9]\}/i,
        String(subdomains[randomInt(0, subdomains.length - 1)]),
    );
};

/** 替换瓦片 URL 模板参数（{x}/{y}/{z}，腾讯切图另有 {m}/{n}） */
export const replaceTileParams = (url: string, params: TileUrlParams) =>
    Object.entries(params).reduce((result, [key, value]) => result.replace(`{${key}}`, String(value)), url);

/** 生成瓦片地址：先轮换子域名，再替换行列号占位符 */
export const buildTileUrl = (
    url: string,
    subdomains: (string | number)[] | undefined,
    params: TileUrlParams,
) => replaceTileParams(replaceSubdomain(url, subdomains), params);

/** 经纬度(WGS84) 转通用瓦片行列号 */
export const longlat2tile = (lon: number, lat: number, zoom: number): TileIndex => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return { x: 0, y: 0 };
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    );
    return { x, y };
};

/** 经纬度(WGS84) 转百度瓦片行列号（先转百度墨卡托再按 256px 取整） */
export const longlat2bdtile = (lon: number, lat: number, zoom: number): TileIndex => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return { x: 0, y: 0 };
    const [bdX, bdY] = wgs84ToBaiduMercator([lon, lat]);
    const n = Math.pow(2, zoom - 18);
    return { x: Math.floor((bdX * n) / 256), y: Math.floor((bdY * n) / 256) };
};

/** 逐级累加 [起始层级, 结束层级] 区间内范围覆盖的瓦片数 */
const calculateTileCountBy = (
    extent: number[],
    zooms: number[],
    toTile: (lon: number, lat: number, zoom: number) => TileIndex,
) => {
    const [minZoom, maxZoom] = zooms;
    const [minLng, minLat, maxLng, maxLat] = extent;
    const levels: { zoom: number; tileCount: number }[] = [];
    let totalCount = 0;
    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
        // 左上角与右下角两个极值瓦片决定行列跨度
        const topLeft = toTile(minLng, maxLat, zoom);
        const bottomRight = toTile(maxLng, minLat, zoom);
        const tileCount = (Math.abs(topLeft.x - bottomRight.x) + 1)
            * (Math.abs(topLeft.y - bottomRight.y) + 1);
        levels.push({ zoom, tileCount });
        totalCount += tileCount;
    }
    return { totalCount, levels };
};

/** 通用墨卡托瓦片数量（高德/天地图/腾讯/ArcGIS 等） */
export const calculateTileCount = (extent: number[], zooms: number[]) =>
    calculateTileCountBy(extent, zooms, longlat2tile);

/** 百度瓦片数量（百度墨卡托行列号与原墨卡托不同，需单独计算） */
export const calculateBdTileCount = (extent: number[], zooms: number[]) =>
    calculateTileCountBy(extent, zooms, longlat2bdtile);
