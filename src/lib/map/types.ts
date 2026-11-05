import type TileLayer from 'ol/layer/Tile';

/** 瓦片图层：标准 XYZ 及百度/腾讯子类（二者都继承自 TileLayer） */
export type TileLayerLike = TileLayer;

/** 瓦片图层配置：取自 src/config/layerList 叶子节点的相关字段 */
export interface TileLayerConfig {
    url?: string;
    projection?: string;
    subdomain?: (string | number)[];
}

/** 瓦片 URL 模板参数（{x}/{y}/{z}，腾讯切图另有 {m}/{n}） */
export type TileUrlParams = Record<string, string | number>;

/** 瓦片行列号 */
export interface TileIndex {
    x: number;
    y: number;
}
