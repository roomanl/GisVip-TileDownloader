import { aliyunDatavBaseUrl } from "@/config";

/**
 * 阿里云 DataV 行政区划（geo.datav.aliyun.com/areas_v3）懒加载树的数据层。
 * {adcode}_full.json 返回该区域的「下级区划」列表，据此逐层展开加载：
 * 100000(国) → 省 → 市 → 区县。properties 携带 name/adcode/level/childrenNum/center。
 */

/** 行政区划树节点（含懒加载与展开的 UI 状态） */
export interface RegionNode {
    name: string;
    adcode: string;
    /** country | province | city | district | street */
    level: string;
    /** 下级区划数量，>0 表示可继续展开 */
    childrenNum: number;
    center?: [number, number];
    /** 已加载的下级节点，undefined 表示尚未加载 */
    children?: RegionNode[];
    /** 是否已完成下级加载 */
    loaded: boolean;
    /** 是否正在加载下级 */
    loading: boolean;
    /** 是否展开 */
    expanded: boolean;
}

function makeNode(p: Record<string, any>): RegionNode {
    return {
        name: p.name,
        adcode: String(p.adcode),
        level: p.level ?? "",
        childrenNum: p.childrenNum ?? 0,
        center: p.center,
        children: undefined,
        loaded: false,
        loading: false,
        expanded: false,
    };
}

/** 是否可展开：国家根节点或有下级区划（childrenNum > 0） */
export function canExpand(node: RegionNode): boolean {
    return node.level === "country" || node.childrenNum > 0;
}

/** 拉取指定区域的下级区划列表 */
export async function fetchRegionChildren(adcode: string): Promise<RegionNode[]> {
    const res = await fetch(`${aliyunDatavBaseUrl}${adcode}_full.json`);
    if (!res.ok) {
        throw new Error(`加载行政区划失败：${adcode}（HTTP ${res.status}）`);
    }
    const geo = await res.json();
    const features: Array<{ properties?: Record<string, any> }> = geo.features ?? [];
    return features
        .map((f) => f.properties)
        .filter((p): p is Record<string, any> => !!p && p.adcode != null)
        .map((p) => makeNode(p));
}

/**
 * 拉取指定区域自身的轮廓 GeoJSON（{adcode}.json，单个 Feature，不含下级区划）。
 * 返回原始文本交由地图绘制类渲染；坐标为高德火星坐标(GCJ-02)，
 * 绘制前需回算 WGS84 才能与已重投影的底图套合（见 lib/map/RegionBoundaryDrawer）。
 */
export async function fetchRegionBoundary(adcode: string): Promise<string> {
    const res = await fetch(`${aliyunDatavBaseUrl}${adcode}.json`);
    if (!res.ok) {
        throw new Error(`加载区域边界失败：${adcode}（HTTP ${res.status}）`);
    }
    return res.text();
}
