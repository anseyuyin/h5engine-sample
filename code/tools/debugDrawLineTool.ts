
/** 调试 线条绘制工具 */
class DebugDrawLineTool {
    private static readonly right = new m4m.math.vector3(1, 0);
    private static readonly toAngle = 57.29577951308232;
    private static readonly toRad = 1 / 180 * Math.PI;
    private static inited = false;
    private static lineRoot: m4m.framework.transform;
    private static lineQueue: m4m.framework.meshRenderer[];
    private static currIndex: number = -1;
    private static alphaGradientStepCount = 5;
    // static colors: m4m.math.color[];
    static colorAlphaMaterials: m4m.framework.material[][] = [];
    /**
     * 初始化 工具
     * @param rootNode 附着的场景节点（为null 附着到场景根节点）
     * @returns 
     */
    static init(rootNode?: m4m.framework.transform) {
        if (this.inited) return;
        let scene = m4m.framework.sceneMgr.scene;

        this.lineQueue = [];
        this.lineRoot = new m4m.framework.transform();
        this.lineRoot.name = "DebugDrawLineTool_root";

        if (!rootNode) {
            scene.addChild(this.lineRoot);
        } else {
            rootNode.addChild(this.lineRoot);
        }

        let col = m4m.math.color;
        //color
        let colors = [
            new col(1, 0, 0, 1),
            new col(1, 0.498, 0.152, 1),
            new col(1, 0.941, 0, 1),
            new col(0, 1, 0, 1),
            new col(0, 0.9, 0.878, 1),
            new col(0.419, 0.454, 0.847, 1),
            new col(0.972, 0, 0.996, 1),
            new col(1, 1, 1, 1),
            new col(0, 0, 0, 1),
            new col(0.6, 0.6, 0.6, 1)
        ];

        //color mats
        let assetMgr = scene.app.getAssetMgr();
        let sh = assetMgr.getShader("shader/ulit");
        for (let i = 0, len = colors.length; i < len; i++) {
            let colorMaterials: m4m.framework.material[] = [];
            this.colorAlphaMaterials.push(colorMaterials);
            for (let j = 0; j < this.alphaGradientStepCount; j++) {
                let newMat = new m4m.framework.material(`color_${i}`);
                newMat.setShader(sh);
                let v4Color = new m4m.math.vector4();
                v4Color.w = i / this.alphaGradientStepCount;
                m4m.math.vec4SetByColor(v4Color, colors[i]);
                newMat.setVector4("_MainColor", v4Color);
                colorMaterials.push(newMat);
            }
        }

        //templata
        // let ass = m4m.framework.sceneMgr.app.getAssetMgr();
        // //初始化模板
        // let tempT = new m4m.framework.transform2D();
        // tempT.pivot.y = 0.5;
        // tempT.height = 3;
        // tempT.name = "line";
        // this.template = tempT.addComponent("rawImage2D") as m4m.framework.rawImage2D;
        // this.template.image = ass.getDefaultTexture(m4m.framework.defTexture.white);
        // this.template.color = this.colors[0];
        this.inited = true;
    }

    private static getNewLine() {
        const box = m4m.framework.TransformUtil.CreatePrimitive(m4m.framework.PrimitiveType.Cube);
        const mr = box.gameObject.renderer as m4m.framework.meshRenderer;
        const arr = this.colorAlphaMaterials[0];
        mr.materials[0] = arr[arr.length - 1];
        return mr;
    }

    /**
     * 绘制线段
     * @param start 起始点  
     * @param end 结束点
     * @param thickness 线段宽度
     * @param colorId 线段颜色[0:红 , 1:橙  ,2:黄 ,3:绿 ,4:青 ,5:蓝 ,6:紫 ,7:白 ,8:黑 ,9:灰]
     * @param alpha 透明值 0 - 1 
     */
    static drawLine(start: m4m.math.vector3, end: m4m.math.vector3, thickness: number = 0.1, colorId: number = 0, alpha: number = 1) {
        if (!this.inited || !start || !end) return;
        //尝试从队列获取一个线段
        //没有 =》 创建一个
        this.currIndex++;
        if (this.currIndex >= this.lineQueue.length) {
            let newLine = this.getNewLine();
            this.lineRoot.addChild(newLine.gameObject.transform);
            this.lineQueue.push(newLine);
        }

        let line = this.lineQueue[this.currIndex];
        let tran = line.gameObject.transform;
        //颜色
        let _aIdx = Math.floor(alpha * 5);
        _aIdx = _aIdx < 0 ? 0 : _aIdx >= this.alphaGradientStepCount ? this.alphaGradientStepCount - 1 : _aIdx;
        line.materials[0] = this.colorAlphaMaterials[colorId][_aIdx];
        //设置位置、旋转
        m4m.math.vec3SetAll(tran.localScale, thickness);

        tran.localPosition = start;
        tran.lookatPoint(end);
        //pos
        let dir = m4m.poolv3();
        // m4m.math.vec3Subtract(end, start, dir);
        dir.x = end.x - start.x;
        dir.y = end.y - start.y;
        dir.z = end.z - start.z;
        let lineLen = m4m.math.vec3Length(dir);
        m4m.math.vec3Normalize(dir, dir);
        let hlafMoveV3 = dir;
        m4m.math.vec3ScaleByNum(hlafMoveV3, lineLen * 0.5, hlafMoveV3);
        let lpos = tran.localPosition;
        m4m.math.vec3Add(hlafMoveV3, start, lpos);
        //长度
        let lScale = tran.localScale;
        lScale.z = lineLen;
        //set to trans
        tran.localScale = lScale;
        tran.localPosition = lpos;

        //显示
        line.gameObject.visible = true;
        m4m.poolv3_del(dir);
    }

    /**
     * 绘制几何图形 通过 所有点
     * @param points 路径点
     * @param thickness 线段宽度
     * @param colorId 线段颜色[0:红 , 1:橙  ,2:黄 ,3:绿 ,4:青 ,5:蓝 ,6:紫 ,7:白,8:黑 ,9:灰]
     * @param isSeal 是否封闭
     * @param alpha 透明值 0 - 1 
     */
    static drawPoints(points: m4m.math.vector3[], thickness: number = 3, colorId: number = 0, alpha: number = 1, needClose = true) {
        for (let i = 1; i < points.length; i++) {
            this.drawLine(points[i - 1], points[i], thickness, colorId, alpha);
        }
        if (needClose && points.length > 2) {
            this.drawLine(points[points.length - 1], points[0], thickness, colorId, alpha);
        }
    }

    /**
     * 绘制圆形
     * @param pos 圆中心点
     * @param radius 圆半径
     * @param thickness 线段宽度
     * @param colorId 线段颜色[0:红 , 1:橙  ,2:黄 ,3:绿 ,4:青 ,5:蓝 ,6:紫 ,7:白,8:黑 ,9:灰]
     * @param alpha 透明值 0 - 1 
     * @param sidesNum 边的数量
     */
    static drawCircle(pos: m4m.math.vector3, radius: number, thickness: number = 0.1, colorId: number = 0, alpha: number = 1, sidesNum = 16) {
        sidesNum = sidesNum < 3 ? 3 : sidesNum;
        let len = sidesNum;
        let deltaDeg = 2 * Math.PI * 1 / sidesNum;
        let p_a = m4m.poolv3();
        let p_b = m4m.poolv3();
        for (let i = 1; i < len; i++) {
            let deg = deltaDeg * (i - 1);
            let deg_1 = deltaDeg * i;
            this.setPointCircle(pos, radius, deg, p_a);
            this.setPointCircle(pos, radius, deg_1, p_b);
            this.drawLine(p_a, p_b, thickness, colorId, alpha);
        }

        //最后一线
        let deg = deltaDeg * (len - 1);
        let deg_1 = 0;
        this.setPointCircle(pos, radius, deg, p_a);
        this.setPointCircle(pos, radius, deg_1, p_b);
        this.drawLine(p_a, p_b, thickness, colorId, alpha);

        m4m.poolv3_del(p_a);
        m4m.poolv3_del(p_b);
    }

    private static setPointCircle(pos: m4m.math.vector3, radius: number, Deg: number, p: m4m.math.vector3) {
        if (!p) return;
        p.x = Math.sin(Deg);
        p.z = Math.cos(Deg);
        m4m.math.vec3ScaleByNum(p, radius, p);
        p.x += pos.x;
        p.z += pos.z;
    }

    static update() {
        if (this.currIndex == -1) return;
        //隐藏所有的线
        for (let i = 0; i < this.currIndex + 1; i++) {
            this.lineQueue[i].gameObject.visible = false;
        }
        this.currIndex = -1;

        // console.error(` lineQueue len : ${this.lineQueue.length}`);
    }

}