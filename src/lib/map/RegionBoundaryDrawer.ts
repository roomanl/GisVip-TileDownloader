import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Draw, { createBox } from 'ol/interaction/Draw'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Style from 'ol/style/Style'
import { isEmpty } from 'ol/extent'
import { getArea } from 'ol/sphere'
import { fetchRegionBoundary } from '@/lib/region'
import { gcj02ToWgs84FlatCoordinates, transformExtentToWgs84 } from '@/lib/map/utils/TransformUtils'
import type OlMap from '@/lib/map/OlMap'
import type { Extent } from 'ol/extent'
import type { Polygon, MultiPolygon, Geometry } from 'ol/geom'

/** 边界描边色 */
const STROKE_COLOR = 'rgba(64, 158, 255, 0.9)'
/** 边界填充色：极淡蓝，高亮区域又不遮挡底图判读 */
const FILL_COLOR = 'rgba(64, 158, 255, 0.12)'
/** 描边线宽（CSS 像素） */
const STROKE_WIDTH = 2
/** 定位到边界时的最大层级：区域再小也不放到最大比例尺，避免只剩局部 */
const FIT_MAX_ZOOM = 12
/** 定位边距（CSS 像素），避免边界贴住容器边缘 */
const FIT_PADDING = 40
/** 坐标串保留小数位数：约 0.1 米精度，足够定位瓦片范围 */
const EXTENT_PRECISION = 6

/** 绘制参数 */
export interface BoundaryDrawOptions {
    /** 绘制完成后是否定位到边界范围，默认 true */
    fit?: boolean
}

/** 绘制结果：供调用方回填下载范围、展示区域面积 */
export interface BoundaryDrawResult {
    /** 边界范围（WGS84 经纬度 [minLng, minLat, maxLng, maxLat]） */
    extentWgs84: Extent | null
    /** 下载范围坐标串：英文逗号分隔的 minLng,minLat,maxLng,maxLat */
    extentText: string
    /** 边界面积（平方米，多块几何已累加） */
    area: number
    /** 面积展示文本（超过 1 万平方米改用平方千米） */
    areaText: string
}

/**
 * 行政区划边界绘制类：把 DataV 的区域轮廓（GCJ-02 GeoJSON）以矢量面高亮叠加到地图上。
 *
 * 图层挂在底图与注记层之上，随 OlMap 实例创建/销毁；数据请求由本类发起，
 * 组件只需在选中区域变化时调用 drawByAdcode（结果含范围与面积，供回填下载配置），
 * 取消选中时调用 clear。
 *
 * 坐标系说明：视图投影为 EPSG:3857，高德/百度瓦片以自定义投影挂载由 OL 重投影，
 * 显示的是真实地表位置；而 DataV 边界来自高德(GCJ-02)，故绘制前逐点回算 WGS84
 * 再投影，否则边界会与底图整体偏移数百米。
 */
export default class RegionBoundaryDrawer {
    private readonly olMap: OlMap
    /** 读取 GeoJSON 用同一实例即可（无状态） */
    private readonly format = new GeoJSON()
    private layer: VectorLayer<VectorSource> | null = null
    private source: VectorSource | null = null
    /** 最近一次绘制的边界范围（视图投影坐标），未绘制时为空 */
    private extent: Extent | null = null
    /** 最近一次绘制的边界面积（平方米），未绘制时为 0 */
    private area = 0
    /**
     * 请求序号：快速切换区域时，先发的请求可能后到，
     * 以此丢弃过期响应，避免旧边界覆盖新边界。
     */
    private requestSeq = 0
    /** 矩形范围绘制交互，处于绘制模式时非空 */
    private draw: Draw | null = null

    constructor(olMap: OlMap) {
        this.olMap = olMap
    }

    /**
     * 按行政区划编码拉取并绘制边界。
     * 无边界数据或请求失败时抛出，由调用方提示；绘制完成返回范围与面积；
     * 期间若已切换/清除选中则返回 null（结果已作废，调用方不应回填）。
     */
    async drawByAdcode(adcode: string, options: BoundaryDrawOptions = {}): Promise<BoundaryDrawResult | null> {
        this.clear()
        const seq = ++this.requestSeq
        const geojson = await fetchRegionBoundary(adcode)
        if (seq !== this.requestSeq) return null
        const count = this.drawGeoJSON(geojson)
        if (!count) throw new Error(`行政区划 ${adcode} 无边界数据`)
        if (options.fit !== false) this.fitToBounds()
        return this.getResult()
    }

    /**
     * 绘制 GeoJSON 文本，返回写入图层的要素数。
     * 增量叠加不清空已有边界，需要替换时先调用 clear()。
     */
    drawGeoJSON(geojson: string): number {
        const viewProjection = this.olMap.getMapView().getProjection()
        // 先按 EPSG:4326 原样读出（不做投影），偏移校正须在经纬度空间进行
        const features = this.format.readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:4326'
        })
        let area = 0
        features.forEach((feature) => {
            const geometry = feature.getGeometry()
            if (!geometry) return
            geometry.applyTransform(gcj02ToWgs84FlatCoordinates)
            geometry.transform('EPSG:4326', viewProjection)
            // 椭球面面积只适用于面几何；多块（如含离区的市）逐个累加
            const type = geometry.getType()
            if (type === 'Polygon' || type === 'MultiPolygon') {
                area += getArea(geometry as Polygon | MultiPolygon, { projection: viewProjection })
            }
        })
        if (!features.length) return 0
        this.ensureSource().addFeatures(features)
        const extent = this.source?.getExtent() ?? null
        this.extent = extent && !isEmpty(extent) ? extent : null
        this.area = area
        return features.length
    }

    /** 定位到当前边界范围（无边界时不做任何事） */
    fitToBounds() {
        if (!this.extent) return
        this.olMap.getMapView().fit(this.extent, {
            duration: 1000,
            padding: [FIT_PADDING, FIT_PADDING, FIT_PADDING, FIT_PADDING],
            maxZoom: FIT_MAX_ZOOM
        })
    }

    /** 当前边界范围（视图投影 EPSG:3857），未绘制时为 null */
    getExtent(): Extent | null {
        return this.extent
    }

    /** 当前边界范围（经纬度 WGS84），供下载范围等外部计算使用 */
    getExtentWgs84(): Extent | null {
        if (!this.extent) return null
        // extent 存的是视图投影坐标，回算经纬度时取实际投影代码，不写死 EPSG:3857
        return transformExtentToWgs84(this.extent, this.olMap.getMapView().getProjection().getCode())
    }

    /** 当前边界面积（平方米） */
    getArea(): number {
        return this.area
    }

    /** 当前绘制结果（范围与面积），未绘制时面积为 0、范围为空 */
    getResult(): BoundaryDrawResult {
        const extentWgs84 = this.getExtentWgs84()
        return {
            extentWgs84,
            extentText: this.formatExtent(extentWgs84),
            area: this.area,
            areaText: this.olMap.formatAreaValue(this.area)
        }
    }

    /** 是否已绘制边界 */
    hasBoundary(): boolean {
        return !!this.extent
    }

    /**
     * 进入矩形范围绘制模式：先清除上一次的范围/行政区划绘制，再挂载 ol/interaction/Draw。
     * 左键按下拖动开始绘制、松开左键结束（Draw 内置行为），结束后自动移除交互并回调绘制结果
     * （范围与面积，供回填下载配置）。未完成时再次调用 cancelDraw 可取消。
     */
    startDrawRectangle(onDrawEnd: (result: BoundaryDrawResult) => void) {
        this.clear()
        const draw = new Draw({
            source: this.ensureSource(),
            // 画矩形必须用 type:'Circle' + createBox()：createBox 取坐标首尾两点算外接矩形，
            // Circle 模式恰为“按下-拖动-松开”的两点交互；若用 type:'Polygon' 会按点击累加顶点，
            // 单次拖动只生成 1~2 个顶点而渲染成线。拖完 createBox 返回的仍是 Polygon 几何。
            type: 'Circle',
            geometryFunction: createBox()
        })
        draw.on('drawend', (evt) => {
            const geometry = evt.feature.getGeometry()
            if (geometry) this.applyDrawnGeometry(geometry)
            this.cancelDraw()
            onDrawEnd(this.getResult())
        })
        this.draw = draw
        this.olMap.getMap().addInteraction(draw)
    }

    /** 取消矩形绘制：移除交互，未完成的草图随之丢弃 */
    cancelDraw() {
        if (!this.draw) return
        this.olMap.getMap().removeInteraction(this.draw)
        this.draw = null
    }

    /** 是否处于绘制模式 */
    isDrawing(): boolean {
        return !!this.draw
    }

    /** 由绘制完成的几何刷新范围与面积（Draw 产出的几何已是视图投影坐标） */
    private applyDrawnGeometry(geometry: Geometry) {
        const type = geometry.getType()
        if (type === 'Polygon' || type === 'MultiPolygon') {
            this.area = getArea(geometry as Polygon | MultiPolygon, {
                projection: this.olMap.getMapView().getProjection()
            })
        }
        const extent = geometry.getExtent()
        this.extent = isEmpty(extent) ? null : extent
    }

    /** 清除已绘制边界（图层保留复用），并作废进行中的请求与绘制交互 */
    clear() {
        this.requestSeq++
        this.cancelDraw()
        this.source?.clear()
        this.extent = null
        this.area = 0
    }

    /** 销毁图层与引用：地图卸载时先于 OlMap.destroy 调用 */
    destroy() {
        this.clear()
        if (this.layer) this.olMap.getMap().removeLayer(this.layer)
        this.layer = null
        this.source = null
    }

    /** 范围转坐标串（英文逗号分隔）：minLng,minLat,maxLng,maxLat，无范围时为空串 */
    private formatExtent(extent: Extent | null): string {
        if (!extent) return ''
        const factor = 10 ** EXTENT_PRECISION
        return extent
            .map((value) => Math.round(value * factor) / factor)
            .join(',')
    }

    /** 首次绘制才建图层：未选中区域时无需向地图添加空图层 */
    private ensureSource(): VectorSource {
        if (this.source) return this.source
        this.source = new VectorSource()
        this.layer = new VectorLayer({
            source: this.source,
            style: new Style({
                stroke: new Stroke({ color: STROKE_COLOR, width: STROKE_WIDTH }),
                fill: new Fill({ color: FILL_COLOR })
            })
        })
        this.olMap.getMap().addLayer(this.layer)
        return this.source
    }
}
