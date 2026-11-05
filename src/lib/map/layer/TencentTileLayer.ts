import TileLayer from 'ol/layer/Tile'
import SourceXYZ from 'ol/source/XYZ'
import { buildTileUrl } from '@/lib/map/utils/Utils'
import type { TileLayerConfig } from '@/lib/map/types'

/**
 * 腾讯瓦片图层：瓦片服务按 TMS 规则从南往北编号行，需把 OL 的行号翻转；
 * 卫星/地形图按 {m}/{n} 分组目录存放，需在行列号基础上换算 16×16 的块号。
 */
export default class TencentTileLayer extends TileLayer {
  /** 腾讯块号目录的边长（每 16×16 张瓦片归到一个目录） */
  private static readonly BLOCK_SIZE = 16

  constructor(options: TileLayerConfig = {}) {
    const { url = '', projection, subdomain } = options
    super({
      source: new SourceXYZ({
        projection,
        crossOrigin: 'anonymous',
        tileUrlFunction: (tileCoord) => {
          if (!tileCoord) return undefined
          const [z, x, row] = tileCoord
          // TMS 行号：由南往北计数，与 OL 的自上而下行号互补
          const y = Math.pow(2, z) - 1 - row
          const { BLOCK_SIZE } = TencentTileLayer
          return buildTileUrl(url, subdomain, {
            z,
            x,
            y,
            m: Math.floor(x / BLOCK_SIZE),
            n: Math.floor(y / BLOCK_SIZE),
          })
        },
      }),
    })
  }
}
