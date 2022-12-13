import destVt from '../glsl/base.vert';
import destFg from '../glsl/dest.frag';
import { Func } from '../core/func';
import { Canvas } from '../webgl/canvas';
import { Object3D } from 'three/src/core/Object3D';
import { Update } from '../libs/update';
import { Mesh } from 'three/src/objects/Mesh';
import { PlaneGeometry } from 'three/src/geometries/PlaneGeometry';
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Vector3 } from 'three/src/math/Vector3';
import { Capture } from '../webgl/capture';
import { Util } from '../libs/util';
import { Blur } from '../webgl/blur';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
// import { Texture } from 'three/src/textures/Texture';
import { MousePointer } from '../core/mousePointer';
import { Item } from './item';
import { ImgMesh } from '../webgl/imgMesh';
import { TexLoader } from '../webgl/texLoader';
import { Conf } from '../core/conf';


export class Visual extends Canvas {

  private _con:Object3D;
  private _mainCap:Capture;
  private _bgCap:Capture;
  private _img:ImgMesh;
  private _dest:Mesh;
  private _blur:Array<Blur> = [];
  private _blurCamera:OrthographicCamera;
  private _blurScale:number = 0.1;
  private _item:Array<Item> = [];

  constructor(opt: any) {
    super(opt);

    this._blurCamera = this._makeOrthCamera();
    this._updateOrthCamera(this._blurCamera, 10, 10);

    // ブラーかけるやつ
    for(let i = 0; i < 3; i++) {
      this._blur.push(new Blur());
    }

    this._mainCap = new Capture(2);

    for(let i = 0; i < 30; i++) {
      const item = new Item({
        id:i,
      });
      this._mainCap.add(item);
      this._item.push(item);
    }

    // 背景の
    this._bgCap = new Capture();
    this._img = new ImgMesh({
      tex:TexLoader.instance.get(Conf.instance.PATH_IMG + 'tex-ttl.png'),
    });
    this._bgCap.add(this._img);

    this._con = new Object3D();
    this.mainScene.add(this._con);

    this._dest = new Mesh(
      new PlaneGeometry(1, 1),
      new ShaderMaterial({
        vertexShader:destVt,
        fragmentShader:destFg,
        transparent:true,
        uniforms:{
          tCross:{value:this._mainCap.texture(0)},
          tNormal:{value:this._mainCap.texture(1)},
          tEffect:{value:this._bgCap.texture()},
          mouse:{value:new Vector3()},
          time:{value:0},
          test:{value:0.75},
        }
      })
    );
    this._con.add(this._dest);

    this._resize();
  }


  protected _update(): void {
    super._update();

    const mx = MousePointer.instance.easeNormal.x;
    const my = MousePointer.instance.easeNormal.y;

    const uni = this._getUni(this._dest);
    uni.test.value = Func.instance.val(0.65, 0.75);
    uni.time.value += 1;
    uni.mouse.value.set(Util.instance.map(mx, 0, 1, -1, 1), Util.instance.map(my, 0, 0.99, -0.5, 0.5));

    const radian = Util.instance.radian(Update.instance.cnt * 2);
    this._img.position.x = Math.sin(radian * 1.1) * this._img.getSize().x * 0.01;
    this._img.position.y = Math.cos(radian * -0.8) * this._img.getSize().y * 0.01;

    if (this.isNowRenderFrame()) {
      this._render()
    }
  }


  private _render(): void {
    // const w = Func.instance.sw();
    // const h = Func.instance.sh();

    // 重なりチェック用 同じ色にしておく
    this._item.forEach((val) => {
      val.changeMode(true);
    });
    this.renderer.setClearColor(0xffffff, 0);
    this._mainCap.render(this.renderer, this.cameraOrth, 0);

    // 通常 色戻す
    this._item.forEach((val) => {
      val.changeMode(false);
    });
    this.renderer.setClearColor(0xd8d6c6, 1);
    this._mainCap.render(this.renderer, this.cameraOrth, 1);

    // ブラー適応
    // const bw = w * this._blurScale;
    // const bh = h * this._blurScale;
    // this._blur.forEach((val,i) => {
    //   const t:Texture = i == 0 ? this._mainCap.texture(1) : this._blur[i-1].getTexture();
    //   val.render(bw, bh, t, this.renderer, this._blurCamera, 100);
    // })

    // 背景の画像
    this._bgCap.render(this.renderer, this.cameraOrth);

    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.render(this.mainScene, this.cameraOrth);
  }


  public isNowRenderFrame(): boolean {
    return this.isRender && Update.instance.cnt % 1 == 0
  }


  _resize(): void {
    super._resize();

    const w = Func.instance.sw();
    const h = Func.instance.sh();

    this.renderSize.width = w;
    this.renderSize.height = h;

    this._updateOrthCamera(this.cameraOrth, w, h);
    this._updatePersCamera(this.cameraPers, w, h);

    let pixelRatio: number = window.devicePixelRatio || 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.clear();

    this._updateOrthCamera(this._blurCamera, w * this._blurScale, h * this._blurScale);

    this._mainCap.setSize(w, h, pixelRatio);
    this._bgCap.setSize(w, h, pixelRatio);

    this._img.setSize(Math.max(w, h));

    this._dest.scale.set(w, h, 1);
  }
}
