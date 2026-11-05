import * as projection from 'projzh/projection/index';
import * as datum from 'projzh/datum/index';
import { Projection } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';

/** 球面墨卡托(EPSG:3857) → 百度墨卡托(DB09-MC)：反投影取经纬度，转 BD09 后用百度墨卡托投影 */
export const smerc2bmerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.sphericalMercator.inverse(input, opt_output, opt_dimension);
  datum.bd09.fromWGS84(output, output, opt_dimension);
  return projection.baiduMercator.forward(output, output, opt_dimension);
};

/** 百度墨卡托(DB09-MC) → 球面墨卡托(EPSG:3857) */
export const bmerc2smerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.baiduMercator.inverse(input, opt_output, opt_dimension);
  datum.bd09.toWGS84(output, output, opt_dimension);
  return projection.sphericalMercator.forward(output, output, opt_dimension);
};

/** 百度墨卡托(DB09-MC) → 经纬度(WGS84) */
export const bmerc2ll = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.baiduMercator.inverse(input, opt_output, opt_dimension);
  return datum.bd09.toWGS84(output, output, opt_dimension);
};

/** 经纬度(WGS84) → 百度墨卡托(DB09-MC) */
export const ll2bmerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = datum.bd09.fromWGS84(input, opt_output, opt_dimension);
  return projection.baiduMercator.forward(output, output, opt_dimension);
};

/**
 * 百度墨卡托投影：百度自有切片网格（原点在 (0,0)、分辨率 2^(18-z)），
 * 有效范围与行列号都由 BaiDuTileLayer 的自定义 TileGrid 描述，此处不设置 extent。
 */
export const bd09Mecator = new Projection({
  code: 'DB09-MC',
  units: 'm',
});
