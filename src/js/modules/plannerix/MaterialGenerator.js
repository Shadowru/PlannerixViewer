import * as THREE from 'three';

export default class MaterialGenerator {

    constructor() {
        this.materialBank = {};

        this.materialSettings = {
            'walls':{
                texture: '../assets/textures/TexturesCom_GenericBricks_1024_albedo.jpg',
                aoMap: '../assets/textures/TexturesCom_GenericBricks_1024_ao.jpg',
                bumpMap: '../assets/textures/TexturesCom_GenericBricks_1024_height.jpg',
                normalMap: '../assets/textures/TexturesCom_GenericBricks_1024_normal.jpg',
                repeat: {u: 0.5, v: 0.5}
            },
            'wallpaper':{
                texture: '../assets/textures/TexturesCom_WallpaperForties0062_seamless_S.jpg'
            },
            'plinth': {
                texture: '../assets/textures/TexturesCom_Wood_ZebranoVeneer_512_albedo.jpg',
                normalMap: '../assets/textures/TexturesCom_Wood_ZebranoVeneer_512_normal.jpg',
                roughnessMap: '../assets/textures/TexturesCom_Wood_ZebranoVeneer_512_roughness.jpg'
            },
            'floor': {
                texture: '../assets/textures/TexturesCom_ConcreteBare0433_11_seamless_S.jpg'
            },
            'kitchen.floor': {
                texture: '../assets/textures/TexturesCom_FloorsRegular0301_1_seamless_S.jpg'
            },
            'bathroom.floor':{
                texture: '../assets/textures/TexturesCom_MarbleTiles0163_1_M.jpg',
                repeat: {u: 0.1, v: 0.1}
            },
            'hall.floor':{
                texture: '../assets/textures/TexturesCom_Carpet0012_1_seamless_S.jpg',
                repeat: {u: 1.5, v: 1.5}
            },
            'ceiling':{
                texture: '../assets/textures/TexturesCom_Wall_Stucco3_1x1_1K_albedo.jpg',
                aoMap: '../assets/textures/TexturesCom_Wall_Stucco3_1x1_1K_ao.jpg',
                bumpMap: '../assets/textures/TexturesCom_Wall_Stucco3_1x1_1K_height.jpg',
                normalMap: '../assets/textures/TexturesCom_Wall_Stucco3_1x1_1K_normal.jpg',
                roughnessMap: '../assets/textures/TexturesCom_Wall_Stucco3_1x1_1K_roughness.jpg',
                repeat:{u: 2, v: 2}
            }
        }

        const loader = new THREE.CubeTextureLoader();
        loader.setPath( '../img/env/maps/room_0/blur_0/' );

        this.textureCube = loader.load( [
            'left.jpg', 'right.jpg',
            'top.jpg', 'bottom.jpg',
            'front.jpg', 'back.jpg',
        ] );

    }

    getMaterial(materialTag, color = undefined){
        const material = this.materialBank[materialTag] ? this.materialBank[materialTag] : this.generateMaterial(materialTag, color);
        return material;
    }

    generateMaterial(materialTag, color =  undefined) {

        const materialSettings = this.materialSettings[materialTag] ? this.materialSettings[materialTag] : {};


        const params = {
            envMap: this.textureCube
        };


        if(materialSettings.texture){
            params.map = this.loadTexture(materialSettings.texture, materialSettings.repeat);
        } else {
            if(color){
                params.color = color;
            }
        }

        if(materialSettings.aoMap){
            params.aoMap = this.loadTexture(materialSettings.aoMap, materialSettings.repeat);
        }

        if(materialSettings.bumpMap){
            params.bumpMap = this.loadTexture(materialSettings.bumpMap, materialSettings.repeat);
        }

        if(materialSettings.normalMap){
            params.normalMap = this.loadTexture(materialSettings.normalMap, materialSettings.repeat);
        }

        if(materialSettings.roughnessMap){
            params.roughnessMap = this.loadTexture(materialSettings.roughnessMap, materialSettings.repeat);
        }

        const material = new THREE.MeshStandardMaterial(
            params
        );

        this.materialBank[materialTag] = material;
        return material;
    }

    loadTexture(map,repeat = undefined) {
        const texture = new THREE.TextureLoader().load(map);

        //texture.side = THREE.DoubleSide;

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        const baseU = 0.01;
        const baseV = 0.01;

        if(repeat){
            texture.repeat.set(baseU * repeat.u, baseV * repeat.v);
        } else {
            texture.repeat.set(baseU, baseV);
        }


        //console.log(texture);
        return texture;
    }
}
