import * as THREE from 'three';

import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

import ObjectivityCity from "./ObjectivityCity";

export default class CityModule{

    constructor() {

        const coords = [55.745476, 37.603611];
        const sceneScale = 0.1;

        this.floor_height = 3.5;

        this._cityObject = this.initCity2(coords, sceneScale);


    }


    get cityObject() {
        return this._cityObject;
    }

    initCity2(coords, scale) {

        const deltaZ = this.floor_height;


        var objectivityCity = ObjectivityCity.world('Moscow',
            {
                postprocessing: false,
                scale: scale
            }
        );

        objectivityCity.setCoordinateSystem('ESPG');
        objectivityCity.setCoordinates(coords);

        function buildingsStyle(feature) {
            //console.log(feature);
            var color = 'white';

            if (feature.properties.color) {
                color = feature.properties.color;//parseInt('0x' + feature.properties.color.substring(1));
            }

            var height = 10 + Math.random() * 10;

            if (feature.properties.height) {
                height = feature.properties.height;
            } else if (feature.properties.level) {
                height = feature.properties.level * 10;
            }

            var defaultStyle = {
                height: height
            };

            var materialStyle = {color: color};

            return Object.assign({}, defaultStyle, materialStyle);
        }

        function addLayer(url, style_function) {

            var geoJSONLayer = ObjectivityCity.geoJSONLayer(url,
                {
                    output: true,
                    style: style_function
                }
            );

            return geoJSONLayer;
        }

        function addMap(object, objectivityCity) {

            console.log('Loading map ...');

            const getTextures = () => new Promise((resolve, reject) => {
                const loader = new THREE.TextureLoader();
                THREE.DefaultLoadingManager.onLoad = () => resolve(textures);
                const textures = [
                    'assets/textures/map.png'
                ].map(filename => loader.load(filename));
            });


            getTextures().then(result => {

                var patternTextures = result;

                var patternTexture = patternTextures[0];
                //var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

                //patternTexture.anisotropy = maxAnisotropy;
                patternTexture.wrapS = patternTexture.wrapT = THREE.RepeatWrapping;
                patternTexture.offset.set(0, 0);
                patternTexture.repeat.set(1, 1);

                var patternMaterial = new THREE.MeshBasicMaterial({
                    map: patternTexture,
                    //side: THREE.DoubleSide
                });

                /*            const north_edge = 55.7588;
                            const west_edge = 37.5814;
                            const south_edge = 55.7378;
                            const east_edge = 37.6380;
                */
                const north_edge = 55.75803176823724;
                const west_edge = 37.580108642578125;
                const south_edge = 55.737935461409336;
                const east_edge = 37.637786865234375;

                let topLeftPoint = objectivityCity.latLonToPoint({lon: west_edge, lat: north_edge});
                let bottomRightPoint = objectivityCity.latLonToPoint({lon: east_edge, lat: south_edge});

                console.log(topLeftPoint);
                console.log(bottomRightPoint);

                var planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);

                const depth = 0.02;

                planeGeometry.vertices[0].x = topLeftPoint.x;
                planeGeometry.vertices[0].y = topLeftPoint.y;
                planeGeometry.vertices[0].z = depth;

                planeGeometry.vertices[1].x = bottomRightPoint.x;
                planeGeometry.vertices[1].y = topLeftPoint.y;
                planeGeometry.vertices[1].z = depth;

                planeGeometry.vertices[2].x = topLeftPoint.x;
                planeGeometry.vertices[2].y = bottomRightPoint.y;
                planeGeometry.vertices[2].z = depth;

                planeGeometry.vertices[3].x = bottomRightPoint.x;
                planeGeometry.vertices[3].y = bottomRightPoint.y;
                planeGeometry.vertices[3].z = depth;

                var plane = new THREE.Mesh(planeGeometry, patternMaterial);
                plane.rotation.x = Math.PI / 2;

                plane.translateZ(deltaZ);

                console.log('Add map');

                object.add(plane);

            });

        }

        //initMaterials(objectivityCity);

        //addMap(scene, objectivityCity);
        //objectivityCity.addLayer(addLayer('assets/mapbox.json', terrainStyle));
        objectivityCity.addLayer(addLayer('assets/buildings.json', buildingsStyle));

        var cityObject = objectivityCity.getObject3D();

        //addMap(cityObject, objectivityCity);

        return cityObject.translateY(-deltaZ);

        //scene.add(cityObject);


        //this.loadDetailedBuildings("./assets/buildings/detailed_buildings.json", scene, objectivityCity);

    }

    loadDetailedBuildings(buildings_url, scene, objectivityCity) {

        function loadBuilding(building_point, building_state, model_url, scene) {

            var loader = new GLTFLoader();

            function getModelDimensions(building) {
                let minX = Number.MAX_SAFE_INTEGER;
                let minY = Number.MAX_SAFE_INTEGER;
                let minZ = Number.MAX_SAFE_INTEGER;

                let maxX = Number.MIN_SAFE_INTEGER;
                let maxY = Number.MIN_SAFE_INTEGER;
                let maxZ = Number.MIN_SAFE_INTEGER;

                if (building instanceof THREE.Object3D) {
                    building.traverse(function (mesh) {
                        if (mesh instanceof THREE.Mesh) {
                            mesh.geometry.computeBoundingBox();
                            var bBox = mesh.geometry.boundingBox;

                            // compute overall bbox
                            minX = Math.min(minX, bBox.min.x);
                            minY = Math.min(minY, bBox.min.y);
                            minZ = Math.min(minZ, bBox.min.z);
                            maxX = Math.max(maxX, bBox.max.x);
                            maxY = Math.max(maxY, bBox.max.y);
                            maxZ = Math.max(maxZ, bBox.max.z);
                        }
                    });

                }
                return {
                    "minX": minX,
                    "minY": minY,
                    "minZ": minZ,
                    "maxX": maxX,
                    "maxY": maxY,
                    "maxZ": maxZ
                }
            }

            loader.load(
                // resource URL
                model_url,
                // called when the resource is loaded
                function (gltf) {
                    const building = gltf.scene;

                    const model_dimensions = getModelDimensions(building.children[0]);

                    console.log('model_dimensions : ' + JSON.stringify(model_dimensions));

                    const modelHeight = model_dimensions.maxY - model_dimensions.minY;
                    const model_scale = building_state.height / modelHeight;

                    console.log('model_scale : ' + model_scale);

                    building.scale.set(model_scale, model_scale, model_scale);
                    building.rotation.set(building_state.rotate[0], building_state.rotate[1], building_state.rotate[2]);
                    //building.rotation.y(building_state.rotate[0], building_state.rotate[1], building_state.rotate[2]);
                    building.position.set(building_point.x, 0, building_point.y);

                    scene.add(building);
                }
            );


        }

        var buildings_file_loader = new THREE.FileLoader();

        buildings_file_loader.load(
            // resource URL
            buildings_url,

            // onLoad callback
            function (data) {
                // output the text to the console
                const detailed_buildings = JSON.parse(data);
                for (const feature of detailed_buildings.features) {

                    const properties = feature.properties;

                    const building_coordinate = {
                        lon: properties.coordinate[1],
                        lat: properties.coordinate[0]
                    };

                    const building_point = objectivityCity.latLonToPoint(building_coordinate);

                    const pointScale = ObjectivityCity.World.pointScale(building_coordinate);
                    const building_state = {
                        height: objectivityCity.metresToWorld(properties.height, pointScale),
                        rotate: properties.transform.rotate
                    };

                    console.log('building_point : ' + JSON.stringify(building_point));
                    console.log('building_state : ' + JSON.stringify(building_state));

                    loadBuilding(building_point, building_state, feature.model, scene);

                }
            },

            // onProgress callback
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },

            // onError callback
            function (err) {
                console.error('An error happened');
            }
        );

    }

}
