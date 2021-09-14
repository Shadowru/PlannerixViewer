import * as THREE from 'three';
import GeoWorker from "./util/GeoWorker";

export default class Feature {

    constructor(type, options = {}, callback = function () {
    }) {
        this.type = type;
        this.options = options;
        this.callback = callback;

        this.id = options.id;
        this.color = options.color;
        this.altitude = options.altitude || 0;

        this.worker = new GeoWorker(this.load, this);

        //console.log(this.options);

        this.worker.onmessage({data: {type: this.type, url: this.options.url, options: this.options}});

    }

    load(res, feature) {

        //console.log(res);

        if (res === 'error') {
            this.callback();
            return;
        }

        if (res === 'load') {
            this.callback();
            return;
        }

        const EARTH_RADIUS_IN_METERS = 6378137;
        const EARTH_CIRCUMFERENCE_IN_METERS = EARTH_RADIUS_IN_METERS * Math.PI * 2;
        const METERS_PER_DEGREE_LATITUDE = EARTH_CIRCUMFERENCE_IN_METERS / 360;
        let METERS_PER_DEGREE_LONGITUDE = METERS_PER_DEGREE_LATITUDE; // variable


        feature.longitude = res.position.longitude;
        feature.latitude = res.position.latitude;
        feature.metersPerLon = METERS_PER_DEGREE_LATITUDE * Math.cos(feature.latitude / 180 * Math.PI);

        //****** init buffers *********************************

        // this cascade ralaxes rendering a lot when new tile data arrives
        // TODO: destroy properly, even while this cascade might run -> make each step abortable

        this.geometry = new THREE.BufferGeometry();

        this.geometry.setAttribute('position', new THREE.BufferAttribute(res.vertices, 3));
        //this.vertexBuffer = new GLX.Buffer(3, res.vertices);
        this.timer = setTimeout(() => {
            this.geometry.setAttribute('normal', new THREE.BufferAttribute(res.normals, 3));
            //this.normalBuffer = new GLX.Buffer(3, res.normals);
            this.timer = setTimeout(() => {
                this.geometry.setAttribute('color', new THREE.BufferAttribute(res.colors, 4));
                //this.colorBuffer = new GLX.Buffer(3, res.colors);
                this.timer = setTimeout(() => {
                    this.geometry.setAttribute('uv', new THREE.BufferAttribute(res.texCoords, 2));
                    //this.texCoordBuffer = new GLX.Buffer(2, res.texCoords);
                    this.timer = setTimeout(() => {
                        this.geometry.setAttribute('height', new THREE.BufferAttribute(res.colors, 1));

                        const texture = new THREE.TextureLoader().load('assets/window.png');

                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(1, 1);

                        const material = new THREE.MeshPhongMaterial({
                            color: 0xaaaaaa,
                            specular: 0xffffff,
                            shininess: 250,
                            side:THREE.BackSide,
                            side2: THREE.DoubleSide,
                            vertexColors: true,
                            map: texture,
                            transparent: true
                        });

                        const x_delta = (feature.longitude - feature.options.center.lon) * feature.metersPerLon;

                        const z_delta = (feature.options.center.lat - feature.latitude) * METERS_PER_DEGREE_LATITUDE;

                        const y_delta = feature.altitude;

                        const mesh = new THREE.Mesh(this.geometry, material);

                        mesh.applyMatrix(new THREE.Matrix4().makeScale(1, 1, -1));

                        //console.log(-x_delta, y_delta, z_delta);

                        mesh.position.set(x_delta, y_delta, z_delta);
                        //mesh.position.set(feature.options.deltaX, y_delta, feature.options.deltaZ);

                        mesh.rotation.x = -Math.PI / 2;

                        feature.options.group.add(mesh);

                        if (feature.options.map_url !== undefined) {

                            const map_texture = new THREE.TextureLoader().load(feature.options.map_url);

                            map_texture.wrapS = THREE.ClampToEdgeWrapping;
                            map_texture.wrapT = THREE.ClampToEdgeWrapping;

                            const map_material = new THREE.MeshBasicMaterial({
                                color: 0xffffff,
                                side: THREE.DoubleSide,
                                map: map_texture
                            });

                            const size = feature.options.tileSize;


                            const vertices = [
                                size, size, 0,
                                size, 0, 0,
                                0, size, 0,
                                0, 0, 0
                            ];

                            const texCoords = [
                                1, 0,
                                1, 1,
                                0, 0,
                                0, 1
                            ];

                            // const geometry = new THREE.BufferGeometry();
                            //
                            // geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
                            // geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(texCoords), 2));

                            const geometry = new THREE.PlaneGeometry(
                                size,
                                size,
                                1
                            );

                            const plane = new THREE.Mesh(geometry, map_material);

                            const sub_size = (size / 2) - (size / 9);

                            plane.position.set(
                                feature.options.deltaX + sub_size,
                                y_delta,
                                feature.options.deltaZ  + sub_size
                            );
                            //plane.position.set(x_delta, y_delta, z_delta);


                            //plane.rotation.z = -Math.PI;
                            plane.rotation.x = -Math.PI / 2;
                            //console.log('Plane add');
                            feature.options.group.add(plane);

                        }

                        //this.heightBuffer = new GLX.Buffer(1, res.heights);
                        /*
                        this.timer = setTimeout(() => {
                            this.pickingBuffer = new GLX.Buffer(3, res.pickingColors);
                            this.timer = setTimeout(() => {
                                this.items = res.items;
                                this.applyTintAndZScale();
                                APP.features.add(this);
                                this.fade = 0;
                            }, 20);
                        }, 20);
                         */
                    }, 20);
                }, 20);
            }, 20);
        }, 20);
    }

    translateBy(x = 0, y = 0, z = 0) {
        this.matrix.translateBy(x, y, z);
    }

    scale(scaling) {
        this.matrix.scale(scaling, scaling, scaling);
    }

    rotate(angle) {
        this.matrix.rotateZ(-angle);
    }

    getMatrix() {
        this.matrix.translateTo(
        );
        return this.matrix;
    }

    getFade() {
        if (this.fade >= 1) {
            return 1;
        }

        APP.view.speedUp();

        const fade = this.fade;
        this.fade += 1 / (1 * 60); // (duration * fps)

        return fade;
    }

    applyTintAndZScale() {
        const tintColors = [];
        const tintCallback = APP.features.tintCallback;
        const zScales = [];
        const zScaleCallback = APP.features.zScaleCallback;

        this.items.forEach(item => {
            const f = {id: item.id, properties: item.properties}; // perhaps pass center/bbox as well
            const tintColor = tintCallback(f);
            const col = tintColor ? [...Qolor.parse(tintColor).toArray(), 1] : [0, 0, 0, 0];
            const hideFlag = zScaleCallback(f);
            for (let i = 0; i < item.vertexCount; i++) {
                tintColors.push(...col);
                zScales.push(hideFlag ? 0 : 1);
            }
        });

        // perhaps mix colors in JS and transfer just one color buffer
        this.tintBuffer = new GLX.Buffer(4, new Float32Array(tintColors));
        this.zScaleBuffer = new GLX.Buffer(1, new Float32Array(zScales));
    }

    destroy() {
        APP.features.remove(this);

        // if (this.request) {
        //   this.request.abort(); // TODO: signal to workers
        // }

        clearTimeout(this.timer);

        this.vertexBuffer && this.vertexBuffer.destroy();
        this.normalBuffer && this.normalBuffer.destroy();
        this.colorBuffer && this.colorBuffer.destroy();
        this.texCoordBuffer && this.texCoordBuffer.destroy();
        this.heightBuffer && this.heightBuffer.destroy();
        this.pickingBuffer && this.pickingBuffer.destroy();
        this.tintBuffer && this.tintBuffer.destroy();
        this.zScaleBuffer && this.zScaleBuffer.destroy();

        this.items = [];
    }
}
