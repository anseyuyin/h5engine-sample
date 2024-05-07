
/** 实时阴影样例 */
class realtimeShadow implements IState {

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
        //场景加一个方向光 
        let objDirLight = new m4m.framework.transform();
        scene.addChild(objDirLight);
        objDirLight.setWorldPosition(new m4m.math.vector3(0.5, 5, 0));
        let dirRotate = new m4m.math.quaternion();
        m4m.math.quat2Lookat(objDirLight.getWorldPosition(), new m4m.math.vector4(), dirRotate);
        objDirLight.setWorldRotate(dirRotate);
        let dirLight = objDirLight.gameObject.addComponent("light") as m4m.framework.light;
        dirLight.type = m4m.framework.LightTypeEnum.Direction;
        //方向光开实时阴影

        //场景加个相机
        let objCam = new m4m.framework.transform();
        scene.addChild(objCam);
        let cam = objCam.gameObject.addComponent("camera") as m4m.framework.camera;
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
        hoverc.lookAtPoint = new m4m.math.vector3(0, 2.5, 0)

        //load res
        await util.loadShader(app.getAssetMgr());

        //scene objs
        this.makeSeceneObjects(app);
    }

    update(delta: number) {


    }
}