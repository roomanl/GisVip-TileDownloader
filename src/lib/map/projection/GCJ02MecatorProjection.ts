import * as projection from 'projzh/projection/index';
import * as datum from 'projzh/datum/index';
import { Projection } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';

/** EPSG:3857 半周长（米），火星墨卡托与原墨卡托网格一致，直接复用 */
const HALF_CIRCUMFERENCE = 20037508.342789244;

/** 球面墨卡托(EPSG:3857) → 火星墨卡托(GCJ-02)：反投影取经纬度，加火星偏移后再投影 */
export const smerc2gmerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.sphericalMercator.inverse(input, opt_output, opt_dimension);
  datum.gcj02.fromWGS84(output, output, opt_dimension);
  return projection.sphericalMercator.forward(output, output, opt_dimension);
}

/** 火星墨卡托(GCJ-02) → 球面墨卡托(EPSG:3857)：反投影取经纬度，减火星偏移后再投影 */
export const gmerc2smerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.sphericalMercator.inverse(input, opt_output, opt_dimension);
  datum.gcj02.toWGS84(output, output, opt_dimension);
  return projection.sphericalMercator.forward(output, output, opt_dimension);
}

/** 火星墨卡托(GCJ-02) → 经纬度(WGS84) */
export const gmerc2ll = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = projection.sphericalMercator.inverse(input, opt_output, opt_dimension);
  return datum.gcj02.toWGS84(output, output, opt_dimension);
}

/** 经纬度(WGS84) → 火星墨卡托(GCJ-02) */
export const ll2gmerc = (input: Coordinate, opt_output?: Coordinate, opt_dimension?: number): Coordinate => {
  const output = datum.gcj02.fromWGS84(input, opt_output, opt_dimension);
  return projection.sphericalMercator.forward(output, output, opt_dimension);
}

/** 火星墨卡托投影：瓦片按 GCJ-02 经纬度切图，网格与 EPSG:3857 相同 */
export const gcj02Mecator = new Projection({
  code: 'GCJ-02',
  extent: [-HALF_CIRCUMFERENCE, -HALF_CIRCUMFERENCE, HALF_CIRCUMFERENCE, HALF_CIRCUMFERENCE],
  units: 'm',
});
