import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import Graticule from 'ol/layer/Graticule'
import SourceXYZ from 'ol/source/XYZ'
import Stroke from 'ol/style/Stroke'
import ScaleLine from 'ol/control/ScaleLine';
import OverviewMap from 'ol/control/OverviewMap';
import { unByKey } from 'ol/Observable'
import { getArea } from 'ol/sphere';
import { getCenter } from 'ol/extent'
import { addProjection, addCoordinateTransforms } from 'ol/proj';
import { useSettingsStore } from '@/stores/settings'
import { gcj02ToMercator } from '@/lib/map/utils/TransformUtils'
import { isTdt } from '@/lib/map/utils/Utils'
import { gcj02Mecator, smerc2gmerc, gmerc2smerc, gmerc2ll, ll2gmerc } from '@/lib/map/projection/GCJ02MecatorProjection'
import { bd09Mecator, smerc2bmerc, bmerc2smerc, bmerc2ll, ll2bmerc } from '@/lib/map/projection/BD09MCProjection'
import BaiDuTileLayer from '@/lib/map/layer/BaiDuTileLayer'
import TencentTileLayer from '@/lib/map/layer/TencentTileLayer'
import type { Coordinate } from 'ol/coordinate'
import type { Extent } from 'ol/extent'
import type { EventsKey } from 'ol/events'
import type { Polygon, MultiPolygon } from 'ol/geom'
import type { MapLayer } from '@/config/layerList'
import type { TileLayerLike } from '@/lib/map/types'

/** 底图初始中心：北京（GCJ-02 经纬度转 Web 墨卡托） */
const DEFAULT_CENTER = gcj02ToMercator([116.405285, 39.904989])
/** 初始层级 */
const DEFAULT_ZOOM = 10
/** 视图最小层级：层级滑块取值下限与视图约束共用，避免两处写死 */
export const MIN_ZOOM = 0
/** 视图最大层级：层级滑块取值上限与视图约束共用 */
export const MAX_ZOOM = 18
/** 注记层插在底图之上 */
const LABEL_LAYER_INDEX = 1
/** 面积展示阈值：超过 1 万平方米改用平方千米，否则用平方米 */
const SQUARE_KM_THRESHOLD = 10000
/**
 * 自定义投影注册标记。addProjection/addCoordinateTransforms 写入的是 OL 模块级全局状态，
 * 注册一次即对所有 Map 实例生效，无需每个 OlMap 重复执行。
 */
let projectionsRegistered = false

/**
 * 地图引擎（OpenLayers）：以 EPSG:3857 为视图投影，按选中图层挂载瓦片底图与注记层。
 * 高德/腾讯等国内瓦片的火星坐标(GCJ-02)与百度坐标(DB09-MC)已注册为自定义投影，
 * 由 OL 在渲染时自动重投影，无需为不同地图源切换视图。
 */
export default class OlMap {
    /** 瓦片底图与注记层：切换地图源时整体替换 */
    private baseMapLayer: TileLayerLike | null = null;
    private labelLayer: TileLayerLike | null = null;
    private graticuleLayer: Graticule | null = null;
    private scaleLine: ScaleLine | null = null;
    private overviewMap: OverviewMap | null = null;
    /** 层级变化监听句柄：由 onChangeZoom 登记，置空或销毁时移除 */
    private zoomListener: EventsKey | null = null;
    /** initMap 之后才有值，构造到初始化之间不对外暴露任何地图操作 */
    private map!: Map;
    private mapView!: View;
    private readonly baseProjection = 'EPSG:3857';

    /** 挂载地图：target 为地图容器（元素或其 id） */
    initMap(mapTarget: string | HTMLElement) {
        // 直接以最终中心/层级建视图，避免先渲染低层级再跳变造成的首帧闪烁
        this.mapView = new View({
            projection: this.baseProjection,
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM
        })
        this.map = new Map({
            target: mapTarget,
            view: this.mapView
        })
        this.initCustomProjection()
    }

    /** 注册火星墨卡托与百度墨卡托投影及其与 EPSG:4326/EPSG:3857 的双向变换（全局仅一次） */
    initCustomProjection() {
        if (projectionsRegistered) return
        addProjection(gcj02Mecator);
        addCoordinateTransforms('EPSG:4326', gcj02Mecator, ll2gmerc, gmerc2ll);
        addCoordinateTransforms('EPSG:3857', gcj02Mecator, smerc2gmerc, gmerc2smerc);
        addProjection(bd09Mecator);
        addCoordinateTransforms('EPSG:4326', bd09Mecator, ll2bmerc, bmerc2ll);
        addCoordinateTransforms('EPSG:3857', bd09Mecator, smerc2bmerc, bmerc2smerc);
        projectionsRegistered = true
    }

    /** 卸载地图：释放渲染器、控件（含总览图内嵌 Map）与 DOM，组件卸载时调用 */
    destroy() {
        this.onChangeZoom(null)
        this.map?.dispose()
        this.map = undefined as unknown as Map
    }

    addScaleLine() {
        if (!this.scaleLine) {
            this.scaleLine = new ScaleLine()
        }
        this.map.addControl(this.scaleLine)
    }
    removeScaleLine() {
        if (this.scaleLine) {
            this.map.removeControl(this.scaleLine)
        }
    }

    /**
     * 添加总览地图。总览图是独立的 Map 实例，图层不能同时挂在两个 Map 上，
     * 因此必须传入一个新创建的图层实例。
     */
    addOverviewMap(layer: TileLayerLike) {
        if (this.overviewMap) {
            this.map.removeControl(this.overviewMap)
        }
        this.overviewMap = new OverviewMap({
            collapsed: false,
            collapsible: true,
            layers: [layer]
        })
        this.map.addControl(this.overviewMap)
    }

    /** 经纬网格（辅助判读分幅） */
    addGraticule() {
        if (!this.graticuleLayer) {
            this.graticuleLayer = new Graticule({
                maxLines: 200,
                strokeStyle: new Stroke({
                    lineDash: [5],
                    width: 2,
                    color: 'rgba(255,120,0,0.85)'
                }),
                showLabels: true,
                wrapX: false,
            })
        }
        this.map.addLayer(this.graticuleLayer)
    }
    removeGraticule() {
        if (this.graticuleLayer)
            this.map.removeLayer(this.graticuleLayer)
    }

    /** 加载底图（含注记层与总览图）：切换地图源时调用（内部全同步，无需 async） */
    loadBaseMap(layer: MapLayer) {
        this.clearLayer()
        this.baseMapLayer = this.getLayer(layer)
        this.labelLayer = layer.labelLayer ? this.getLayer(layer.labelLayer) : null
        const layersArray = this.map.getLayers();
        if (this.baseMapLayer) {
            layersArray.insertAt(0, this.baseMapLayer);
        }
        if (this.labelLayer) {
            layersArray.insertAt(LABEL_LAYER_INDEX, this.labelLayer);
        }
        const overviewLayer = this.getLayer(layer)
        if (overviewLayer) {
            this.addOverviewMap(overviewLayer)
        }
        this.updateSize()
    }

    /** 按图层配置创建瓦片图层：layerType 区分通用 XYZ、百度、腾讯切图 */
    getLayer(layer: MapLayer): TileLayerLike | null {
        switch (layer.layerType) {
            case 'tiles':
                return this.createXyzLayer(layer)
            case 'bdtiles':
                return new BaiDuTileLayer(layer)
            case 'tencenttiles':
                return new TencentTileLayer(layer)
            default:
                console.warn(`未支持的图层类型：${layer.layerType}`)
                return null
        }
    }

    /**
     * 通用 XYZ 图层：天地图需在 WMTS 地址末尾拼上用户配置的开发密钥。
     * `{0-3}`、`{b-c}` 这类子域名范围由 OL 展开为多个地址并按瓦片坐标哈希轮换。
     */
    private createXyzLayer(layer: MapLayer): TileLayerLike {
        const url = layer.url ?? ''
        return new TileLayer({
            source: new SourceXYZ({
                projection: layer.projection,
                attributionsCollapsible: false,
                crossOrigin: 'anonymous',
                url: isTdt(layer.mapType) ? url + useSettingsStore().tiandituKey : url,
            }),
        })
    }

    /** 移除已挂载的底图与注记层 */
    clearLayer() {
        if (this.baseMapLayer) {
            this.map.removeLayer(this.baseMapLayer)
            this.baseMapLayer = null
        }
        if (this.labelLayer) {
            this.map.removeLayer(this.labelLayer)
            this.labelLayer = null
        }
    }

    /** 面几何面积（平方米） */
    getArea(polygon: Polygon | MultiPolygon) {
        return getArea(polygon, { projection: this.getMapView().getProjection() })
    }

    /** 面积文本：大于一万平方米按平方千米展示 */
    formatArea(polygon: Polygon | MultiPolygon) {
        return this.formatAreaValue(this.getArea(polygon))
    }

    /** 面积数值（平方米）转展示文本：与 formatArea 同一取舍规则，供外部累加多块几何后复用 */
    formatAreaValue(area: number) {
        return area > SQUARE_KM_THRESHOLD
            ? `${Math.round((area / 1000000) * 100) / 100} 平方千米`
            : `${Math.round(area * 100) / 100} 平方米`;
    }

    /** 定位中心点（视图投影坐标，容错字符串取值） */
    setCenter(center: Coordinate) {
        this.getMapView().setCenter([Number(center[0]), Number(center[1])])
    }

    /** 居中到范围 */
    setCenterByExtent(extent: Extent) {
        this.getMapView().setCenter(getCenter(extent))
    }

    setZoom(zoom: number) {
        this.getMapView().setZoom(zoom)
    }

    /** 当前视图层级：缩放动画过程中为小数，展示前应取整 */
    getZoom() {
        return this.getMapView().getZoom() ?? MIN_ZOOM
    }

    /**
     * 登记/解除视图层级变化回调（滚轮、缩放按钮、定位动画都会触发）。
     * 传入 null 解除监听，避免地图销毁或组件卸载后仍向外部状态回写。
     */
    onChangeZoom(cb: ((zoom: number) => void) | null) {
        if (this.zoomListener) {
            unByKey(this.zoomListener)
            this.zoomListener = null
        }
        if (!cb) return
        const view = this.getMapView()
        this.zoomListener = view.on('change:resolution', () => cb(view.getZoom() ?? MIN_ZOOM))
    }

    /** 底图与注记层透明度（0~1） */
    setBaseOpacity(opacity: number) {
        this.baseMapLayer?.setOpacity(opacity)
        this.labelLayer?.setOpacity(opacity)
    }

    /** 容器尺寸变化后重算画布，避免瓦片错位 */
    updateSize() {
        this.map?.updateSize()
    }

    getMap() {
        return this.map
    }
    getMapView() {
        return this.map.getView()
    }
    getBaseLayer() {
        return this.baseMapLayer
    }
}
