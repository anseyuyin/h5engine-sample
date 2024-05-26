
class realtimeShadowTool {
    public static makeFrustumPoints() {
        let result: m4m.math.vector3[] = [];
        for (let i = 0; i < 8; i++) {
            result.push(new m4m.math.vector3());
        }
        return result;
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
    private _shadowMaxDistance = 30;
    private _lightFrustumData: m4m.framework.LightFrustumData = new m4m.framework.LightFrustumData();

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
        m4m.framework.camera.calcFrustumPoints(this._cam, 1, this._shadowMaxDistance, this._cameraFrustumPoints);
        //计算 light （平行光）的包裹 相机锥体的 锥体数据
        m4m.framework.light.calcDirLightFrustumData(this._cameraFrustumPoints, this._light.gameObject.transform.getWorldRotate(), this._lightFrustumData);
        //
        m4m.framework.light.calcDirLightFrustumPoints(this._lightFrustumData, this._lightFrustumPoints);
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
