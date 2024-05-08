/** 场景附着 icon */
@m4m.reflect.nodeComponent
class iconGizmo extends m4m.framework.behaviour {
    private _renderer: m4m.framework.meshRenderer;
    private _size: number = 1;
    private _alpha: number = 1;
    private _asp: number = 1;
    private _color: m4m.math.vector4 = new m4m.math.vector4(1, 1, 1, 1);
    private _tex: m4m.framework.texture;

    public get size() { return this._size; }
    public set size(val: number) {
        if (this._size == val) return;
        this._size = val;
        this.setRealSize();
    }

    public setAlpha(alpha: number) {
        let a = alpha;
        if (isNaN(alpha)) a = 1;
        this._color.w = a < 0 ? 0 : a > 1 ? 1 : a;
        this._alpha = this._color.w;
        this.setColor();
    }

    public setTex(tex: m4m.framework.texture) {
        this._tex = tex;
        if (tex) {
            this._asp = tex.glTexture.height / tex.glTexture.width;
        }
        let mat = this.getMaterial();
        if (!mat) return;
        mat.setTexture("_MainTex", tex);
        this.setRealSize();
    }

    public onPlay() {
        this.tryAttachIcon();
    }

    public update(delta: number) {
        this.lookAtMainCamera();
    }

    public remove() {
        if (this._renderer) this._renderer = null;
        if (this._color) this._color = null;
        if (this._tex) {
            this._tex.unuse();
            this._tex = null;
        }
    }

    private setRealSize() {
        let tran = this.gameObject.transform;
        let s = tran.localScale;
        m4m.math.vec3Set(s, this._size, this._size * this._asp, 1);
        tran.localScale = s;
    }

    private setColor() {
        let mat = this.getMaterial();
        if (!mat) return;
        mat.setVector4("_MainColor", this._color);
    }

    private getMaterial() {
        if (!this._renderer || !this._renderer.materials || this._renderer.materials.length < 0) return null;
        return this._renderer.materials[0];
    }

    private lookAtMainCamera() {
        let scene = m4m.framework.sceneMgr.scene;
        let mainCam = scene.mainCamera;
        if (mainCam == null) return;
        let tran = this.gameObject.transform;

        let rot = tran.getWorldRotate();
        m4m.math.quatLookat(tran.getWorldPosition(), mainCam.gameObject.transform.getWorldPosition(), rot);
        tran.setWorldRotate(rot);
    }

    private tryAttachIcon() {
        if (this._renderer && this._renderer == this.gameObject.renderer) return;
        let app = m4m.framework.sceneMgr.app;
        this._renderer = this.gameObject.addComponent("meshRenderer") as m4m.framework.meshRenderer;
        let mf = this.gameObject.addComponent("meshFilter") as m4m.framework.meshFilter;
        mf.mesh = app.getAssetMgr().getDefaultMesh("quad");
        this._renderer.materials[0] = new m4m.framework.material();
        this._renderer.materials[0].setShader(app.getAssetMgr().getShader(m4m.framework.builtinShader.ULIT_BLEND));

        //set mat val
        this.setTex(this._tex);
        this.setAlpha(this._alpha);
    }

}
