import TileLayer from 'ol/layer/Tile'
import SourceXYZ from 'ol/source/XYZ'
import TileGrid from 'ol/tilegrid/TileGrid'
import { buildTileUrl } from '@/lib/map/utils/Utils'
import type { TileLayerConfig } from '@/lib/map/types'

/** 百度瓦片最大层级：分辨率 2^(18-z)，共 19 级（z=0..18） */
const BAIDU_MAX_ZOOM = 18

/** 百度墨卡托分辨率表（层级越大分辨率越小） */
const baiduResolutions = Array.from(
    { length: BAIDU_MAX_ZOOM + 1 },
    (_, index) => Math.pow(2, BAIDU_MAX_ZOOM - index),
)

/** 百度行列号：负值以 M 前缀表示（-1 → M1） */
const toBaiduIndex = (index: number) => (index < 0 ? `M${-index}` : `${index}`)

/**
 * 百度瓦片图层：百度墨卡托原点在 (0,0)、y 轴向上，
 * 与 OL 默认的 y 轴向下不同，需把行列号换算成百度服务的 x/y。
 */
export default class BaiDuTileLayer extends TileLayer {
    constructor(options: TileLayerConfig = {}) {
        const { url = '', projection, subdomain } = options
        super({
            source: new SourceXYZ({
                projection,
                crossOrigin: 'anonymous',
                tileGrid: new TileGrid({
                    origin: [0, 0],
                    resolutions: baiduResolutions,
                }),
                tileUrlFunction: (tileCoord) => {
                    if (!tileCoord) return undefined
                    const [z, x, row] = tileCoord
                    return buildTileUrl(url, subdomain, {
                        z,
                        x: toBaiduIndex(x),
                        y: toBaiduIndex(-(row + 1)),
                    })
                },
            }),
        })
    }
}
