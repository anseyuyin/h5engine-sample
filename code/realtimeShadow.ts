
class LightFrustumData {
    /**
     * 灯光视锥数据
     * @param near 近平面
     * @param far 远平面
     * @param w 宽度
     * @param h 高度
     * @param position 位置 
     * @param rotation 旋转
     */
    constructor(public near = 0, public far = 0, public w = 0, public h = 0,
        public position = new m4m.math.vector3(), public rotation = new m4m.math.quaternion()) {
    }
}

class realtimeShadowTool {
    public static makeFrustumPoints() {
        let result: m4m.math.vector3[] = [];
        for (let i = 0; i < 8; i++) {
            result.push(new m4m.math.vector3());
        }
        return result;
    }

    /**
     * 
     * @param cam 相机
     * @param near  近平面
     * @param far   远平面
     * @param outFrustum 输出结果
     * @returns 
     */
    public static calcFrustumPoints(cam: m4m.framework.camera, near: number, far: number, outFrustum: m4m.math.vector3[]) {
        if (!cam || !outFrustum) return;
        if (outFrustum.length < 8) {
            console.warn(` outFrustum array length less than 8.`);
            return;
        }
        //
        // const fovIsH = this.fovAxis == FOVAxis.HORIZONTAL;
        const fovIsH = true;
        const fov = cam.fov;
        const asp = cam.currViewPixelASP;
        // const near = cam.near;
        // const far = cam.far;
        const toWorldMat = cam.gameObject.transform.getWorldMatrix();
        // const toWorldMat = light.entity.transform.getMatrix();
        //通过 fov + near 求 rect 宽度
        let rhFov = fov * 0.5;
        let nHelfW = 0, nHelfH = 0, fHelfW = 0, fHelfH = 0;
        const tanVal = Math.tan(rhFov);
        if (fovIsH) {
            //near 平面
            nHelfW = tanVal * near;
            nHelfH = nHelfW / asp;
            //远 平面
            fHelfW = tanVal * far;
            fHelfH = fHelfW / asp;
        } else {
            nHelfH = tanVal * near;
            nHelfW = nHelfH * asp;
            //
            fHelfH = tanVal * far;
            fHelfW = fHelfH * asp;
        }

        //
        m4m.math.vec3Set(outFrustum[0], -nHelfW, nHelfH, near);       //n_0
        m4m.math.vec3Set(outFrustum[1], nHelfW, nHelfH, near);        //n_1
        m4m.math.vec3Set(outFrustum[2], nHelfW, -nHelfH, near);       //n_2
        m4m.math.vec3Set(outFrustum[3], -nHelfW, -nHelfH, near);      //n_3
        m4m.math.vec3Set(outFrustum[4], -fHelfW, fHelfH, far);        //f_0
        m4m.math.vec3Set(outFrustum[5], fHelfW, fHelfH, far);         //f_1
        m4m.math.vec3Set(outFrustum[6], fHelfW, -fHelfH, far);        //f_2
        m4m.math.vec3Set(outFrustum[7], -fHelfW, -fHelfH, far);       //f_3



        outFrustum.forEach((v) => {
            m4m.math.matrixTransformVector3(v, toWorldMat, v);
            // Vector3.TransformCoordinatesToRef(v, toWorldMat, v);
        });
    }

    /**
         * 计算 方向光视锥数据
         * @param camFrustum 相机视锥(世界空间中的8个顶点位置坐标)
         * @param lightWRot 方向光世界空间旋转
         * @param out 输出视锥数据
         */
    public static calcDirLightFrustumData(camFrustum: m4m.math.vector3[], lightWRot: m4m.math.quaternion, out: LightFrustumData) {
        const max = m4m.poolv3();
        m4m.math.vec3Set(max, -Number.POSITIVE_INFINITY, -Number.POSITIVE_INFINITY, -Number.POSITIVE_INFINITY);
        const min = m4m.poolv3();
        m4m.math.vec3Set(min, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const tempV3 = m4m.poolv3();
        const wRot = lightWRot;
        const light2WorldMat = m4m.poolmtx();
        const v3Zero = m4m.poolv3();
        m4m.math.vec3Reset(v3Zero);
        const v3One = m4m.poolv3();
        m4m.math.vec3Set_One(v3One);
        m4m.math.matrixMakeTransformRTS(v3Zero, v3One, wRot, light2WorldMat);
        // Matrix.ComposeToRef(Light.HELP_VEC3_ONE, wRot, Light.HELP_VEC3_ZERO, light2WorldMat);

        const lightViewMat = m4m.poolmtx();
        // light2WorldMat.invertToRef(lightViewMat);
        m4m.math.matrixInverse(light2WorldMat, lightViewMat);
        for (let i = 0, len = camFrustum.length; i < len; i++) {
            const pos = camFrustum[i];
            const nPos = tempV3;
            // Vector3.TransformCoordinatesToRef(pos, lightViewMat, nPos);
            m4m.math.matrixTransformVector3(pos, lightViewMat, nPos);
            //筛选 near far
            if (nPos.z > max.z) { max.z = nPos.z; }
            if (nPos.z < min.z) { min.z = nPos.z; }
            //筛选 w h
            if (nPos.x > max.x) { max.x = nPos.x; }
            if (nPos.x < min.x) { min.x = nPos.x; }
            if (nPos.y > max.y) { max.y = nPos.y; }
            if (nPos.y < min.y) { min.y = nPos.y; }
        }
        const center = tempV3;
        // min.addToRef(max, center);
        m4m.math.vec3Add(min, max, center);
        // center.scaleToRef(0.5, center);
        m4m.math.vec3ScaleByNum(center, 0.5, center);
        const offset = center;
        offset.z = min.z;
        const near = 0;
        const far = max.z - min.z;
        let w = max.x - min.x;
        let h = max.y - min.y;

        //
        out.near = near;
        out.far = far;
        out.w = w;
        out.h = h;
        // Vector3.TransformCoordinatesToRef(offset, light2WorldMat, out.position);
        m4m.math.matrixTransformVector3(offset, light2WorldMat, out.position);

        // out.rotation.copyFrom(wRot);
        m4m.math.quatClone(wRot, out.rotation);

        //del
        m4m.poolv3_del(max);
        m4m.poolv3_del(min);
        m4m.poolv3_del(tempV3);
        m4m.poolv3_del(v3Zero);
        m4m.poolv3_del(v3One);
        m4m.poolmtx_del(light2WorldMat);
        m4m.poolmtx_del(lightViewMat);
    }

    /**
         * 计算 方向光视锥 顶点数据
         * @param lfData 视锥数据
         * @param outFrustum 相机视锥(世界空间中的8个顶点位置坐标)
         */
    public static calcDirLightFrustumPoints(lfData: LightFrustumData, outFrustum: m4m.math.vector3[]) {
        const halfW = lfData.w / 2;
        const halfH = lfData.h / 2;
        const wPos = lfData.position;
        const wRot = lfData.rotation;
        const near = lfData.near;
        const far = lfData.far;
        const v3One = m4m.poolv3();
        m4m.math.vec3Set_One(v3One);
        //不管缩放
        // const light2WordMat = Matrix.Compose(v3One, wRot, wPos);
        const light2WordMat = m4m.poolmtx();
        m4m.math.matrixMakeTransformRTS(wPos, v3One, wRot, light2WordMat);

        //
        m4m.math.vec3Set(outFrustum[0], -halfW, halfH, near);       //n_0
        m4m.math.vec3Set(outFrustum[1], halfW, halfH, near);        //n_1
        m4m.math.vec3Set(outFrustum[2], halfW, -halfH, near);       //n_2
        m4m.math.vec3Set(outFrustum[3], -halfW, -halfH, near);      //n_3
        m4m.math.vec3Set(outFrustum[4], -halfW, halfH, far);        //f_0
        m4m.math.vec3Set(outFrustum[5], halfW, halfH, far);         //f_1
        m4m.math.vec3Set(outFrustum[6], halfW, -halfH, far);        //f_2
        m4m.math.vec3Set(outFrustum[7], -halfW, -halfH, far);       //f_3

        outFrustum.forEach((v) => {
            // Vector3.TransformCoordinatesToRef(v, light2WordMat, v);
            m4m.math.matrixTransformVector3(v, light2WordMat, v);
        });

        //del
        m4m.poolv3_del(v3One);
        m4m.poolmtx_del(light2WordMat);
    }
}

/** 实时阴影样例 */
class realtimeShadow implements IState {

    private _debugOriginalAxis: m4m.math.vector3[] = [
        new m4m.math.vector3(),

        new m4m.math.vector3(1, 0, 0),
        new m4m.math.vector3(0, 1, 0),
        new m4m.math.vector3(0, 0, 1),
    ];

    private _texFiles = ["LightAnchor_Icon.png"];
    private _texUrls = this._texFiles.map((val, i, arr) => { return `${resRootPath}texture/${val}`; });
    private _tex: m4m.framework.texture[] = [];
    private _cam: m4m.framework.camera;
    private _light: m4m.framework.light;
    private _shadowMaxDistance = 20;
    private _lightFrustumData: LightFrustumData = new LightFrustumData();

    private _lightFrustumPoints: m4m.math.vector3[] = realtimeShadowTool.makeFrustumPoints();
    private _cameraFrustumPoints: m4m.math.vector3[] = realtimeShadowTool.makeFrustumPoints();

    changeMaterial(node: m4m.framework.transform, col: m4m.math.color) {
        let mr = node.gameObject.renderer as m4m.framework.meshRenderer;
        if (mr == null) return;
        let mat = util.makeMaterialByShaderName("diffuse.shader.json");
        if (!mat) return;
        let colV4 = new m4m.math.vector4();
        m4m.math.vec4SetByColor(colV4, col);
        mat.setVector4("_MainColor", colV4);
        mr.materials[0] = mat;
    }

    makeSeceneObjects(app: m4m.framework.application) {
        let scene = app.getScene();
        //地面
        let obj0 = m4m.framework.TransformUtil.CreatePrimitive(m4m.framework.PrimitiveType.Plane, app);
        obj0.setWorldScale(new m4m.math.vector3(3, 1, 3));

        //方块
        let obj1 = m4m.framework.TransformUtil.CreatePrimitive(m4m.framework.PrimitiveType.Cube, app);
        obj1.setWorldPosition(new m4m.math.vector3(0, 1, 0));

        //球
        let obj2 = m4m.framework.TransformUtil.CreatePrimitive(m4m.framework.PrimitiveType.Sphere, app);
        obj2.setWorldPosition(new m4m.math.vector3(2, 1.5, 0));

        //change mat
        this.changeMaterial(obj0, new m4m.math.color(1, 1, 1, 1));
        this.changeMaterial(obj1, new m4m.math.color(1, 0.5, 0.6, 1));
        this.changeMaterial(obj2, new m4m.math.color(0.2, 0.6, 1, 1));

        //add to scene
        scene.addChild(obj0);
        scene.addChild(obj1);
        scene.addChild(obj2);
    }

    async start(app: m4m.framework.application) {
        let scene = app.getScene();
        //场景加个相机
        let objCam = new m4m.framework.transform();
        scene.addChild(objCam);
        let cam = this._cam = objCam.gameObject.addComponent("camera") as m4m.framework.camera;
        cam.near = 0.01;
        cam.far = 120;
        cam.fov = Math.PI * 0.3;
        objCam.localTranslate = new m4m.math.vector3(0, 15, -15);
        objCam.lookatPoint(new m4m.math.vector3(0, 0, 0));
        //相机控制器
        let hoverc = cam.gameObject.addComponent("HoverCameraScript") as m4m.framework.HoverCameraScript;
        hoverc.panAngle = 180;
        hoverc.tiltAngle = 45;
        hoverc.distance = 30;
        hoverc.scaleSpeed = 0.1;
        hoverc.lookAtPoint = new m4m.math.vector3(0, 2.5, 0);

        //场景加一个方向光 
        let objDirLight = new m4m.framework.transform();
        scene.addChild(objDirLight);
        objDirLight.setWorldPosition(new m4m.math.vector3(0.5, 15, 0));
        let dirRotate = new m4m.math.quaternion();
        m4m.math.quat2Lookat(objDirLight.getWorldPosition(), new m4m.math.vector4(), dirRotate);
        objDirLight.setWorldRotate(dirRotate);
        let dirLight = this._light = objDirLight.gameObject.addComponent("light") as m4m.framework.light;
        dirLight.type = m4m.framework.LightTypeEnum.Direction;
        //方向光开实时阴影

        //场景绘线调试工具
        DebugDrawLineTool.init();

        //load res
        await util.loadShader(app.getAssetMgr());
        this._tex = await util.loadTextures(this._texUrls, app.getAssetMgr());

        //gizmo attach
        let objDirLightGizmo = new m4m.framework.transform();
        objDirLight.addChild(objDirLightGizmo);
        let dirLightGizmo = objDirLightGizmo.gameObject.addComponent("iconGizmo") as iconGizmo;
        dirLightGizmo.setTex(this._tex[0]);

        //scene objs
        this.makeSeceneObjects(app);
    }

    update(delta: number) {
        //同步 锥体数据
        this.syncFrustumData();

        //驱动 场景绘线调试工具 tick
        DebugDrawLineTool.update();

        //调用 绘制选段
        this.debugDrawLine();
    }

    syncFrustumData() {
        this._cameraFrustumPoints;
        //计算 shadowmap用的 相机锥体点数据
        realtimeShadowTool.calcFrustumPoints(this._cam, 1, this._shadowMaxDistance, this._cameraFrustumPoints);
        //计算 light （平行光）的包裹 相机锥体的 锥体数据
        realtimeShadowTool.calcDirLightFrustumData(this._cameraFrustumPoints, this._light.gameObject.transform.getWorldRotate(), this._lightFrustumData);
        //
        realtimeShadowTool.calcDirLightFrustumPoints(this._lightFrustumData, this._lightFrustumPoints);
    }

    debugDrawLine() {

        //draw light Frustum
        let lfPoints = this._lightFrustumPoints;

        //绘制 坐标轴
        this.drawOriAxis();

        //绘制相机 锥体框
        this.drawFrustumPoints(this._cameraFrustumPoints, 0.02, 5);

        //绘制light 锥体框
        this.drawFrustumPoints(this._lightFrustumPoints, 0.1, 1);
    }

    drawOriAxis() {
        let lfPoints = this._debugOriginalAxis;
        let t = 0.1;
        DebugDrawLineTool.drawLine(lfPoints[0], lfPoints[1], t, 0);
        DebugDrawLineTool.drawLine(lfPoints[0], lfPoints[2], t, 3);
        DebugDrawLineTool.drawLine(lfPoints[0], lfPoints[3], t, 5);
    }

    /**
     * 
     * @param frustumPoints 
     * @param thickness 线段宽度
     * @param colorId 线段颜色[0:红 , 1:橙  ,2:黄 ,3:绿 ,4:青 ,5:蓝 ,6:紫 ,7:白 ,8:黑 ,9:灰]
     */
    drawFrustumPoints(frustumPoints: m4m.math.vector3[], thickness: number, colorId: number) {
        let lfPoints = frustumPoints;
        let t = thickness;
        let c = colorId;
        //nearFrame
        DebugDrawLineTool.drawLine(lfPoints[0], lfPoints[1], t, c);
        DebugDrawLineTool.drawLine(lfPoints[1], lfPoints[2], t, c);
        DebugDrawLineTool.drawLine(lfPoints[2], lfPoints[3], t, c);
        DebugDrawLineTool.drawLine(lfPoints[3], lfPoints[0], t, c);
        //farFrame
        DebugDrawLineTool.drawLine(lfPoints[4], lfPoints[5], t, c);
        DebugDrawLineTool.drawLine(lfPoints[5], lfPoints[6], t, c);
        DebugDrawLineTool.drawLine(lfPoints[6], lfPoints[7], t, c);
        DebugDrawLineTool.drawLine(lfPoints[7], lfPoints[4], t, c);
        //center edges
        DebugDrawLineTool.drawLine(lfPoints[0], lfPoints[4], t, c);
        DebugDrawLineTool.drawLine(lfPoints[1], lfPoints[5], t, c);
        DebugDrawLineTool.drawLine(lfPoints[2], lfPoints[6], t, c);
        DebugDrawLineTool.drawLine(lfPoints[3], lfPoints[7], t, c);
    }
}
