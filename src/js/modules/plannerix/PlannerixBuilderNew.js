//import * as THREE from 'three';

import * as turf from '@turf/turf'

import MaterialGenerator from './MaterialGenerator';

export default class PlannerixBuilderNew {
    constructor(url, callback) {

        this.materialGenerator = new MaterialGenerator();

        this.roomHeight = 320.0;

        fetch(url)
            .then(response => response.json())
            .then(json => {
                //console.log(json);
                const object3D = this.proceedJSON(json);
                console.log(object3D);
                callback(object3D);
            })

    }


    proceedJSON(json) {

        const group = new THREE.Group();

        this.proceedRooms(json, group);

        this.proceedInnerPerimeter(json.innerPerimeters, group)

        this.proceedFloor(json.outerPerimeter, group);

        this.proceedCeiling(json.outerPerimeter, group);

        this.generateLights(json, group);

        return group;
    }

    proceedRooms(json, group) {

        const rooms = json.Rooms;

        for (const room of rooms) {
            const vectors2s = this.getPointsVector2(room.points, room.offset);
            const roomShape = new THREE.Shape(vectors2s);

            const extrudeSettings = {
                amount: 0.2,
                bevelEnabled: false
            };

            const geometry = new THREE.ExtrudeGeometry(roomShape, extrudeSettings);

            //const roomMesh = SceneUtils.createMultiMaterialObject( geometry, [ new THREE.MeshBasicMaterial( { color: 0x00cc00 } ), new THREE.MeshBasicMaterial( { color: 0xff3333, wireframe: true, transparent: true } ) ] );

            const material = this.materialGenerator.getMaterial(room.roomType + '.floor', room.color);

            const roomMesh = new THREE.Mesh(geometry, material);

            roomMesh.rotation.x = THREE.MathUtils.degToRad(-90);

            roomMesh.receiveShadow = true;

            //console.log(roomMesh);

            group.add(roomMesh);
        }
    }

    getPointsVector2(points, offset_in, converter = undefined) {

        //console.log(object);

        const vectors = [];

        const offset = offset_in ? offset_in : {x: 0, y: 0};

        //console.log(offset);

        for (const point of points) {

            let pointConv = point;

            if (converter !== undefined) {
                pointConv = converter(point)
            }

            vectors.push(
                new THREE.Vector2(
                    pointConv.x + offset.x,
                    pointConv.y + offset.y
                )
            )
        }

        //console.log(vectors);

        return vectors;
    }

    proceedPerimeter(json, converter, depth_in = undefined, material_in = undefined) {
        const vectors2s = this.getPointsVector2(
            json,
            undefined,
            converter
        );

        //console.log(vectors2s);

        const roomShape = new THREE.Shape(vectors2s);

        const depth = depth_in ? depth_in : this.roomHeight;

        const extrudeSettings = {
            amount: depth,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(roomShape, extrudeSettings);

        const material = material_in ? material_in : new THREE.MeshBasicMaterial({color: '#FFFFFF'});

        const roomMesh = new THREE.Mesh(geometry, material);

        roomMesh.rotation.x = THREE.MathUtils.degToRad(-90);

        roomMesh.castShadow = true;
        roomMesh.receiveShadow = true;

        //console.log(roomMesh);

        return roomMesh;

    }

    proceedInnerPerimeter(innerPerimeters, group) {

        const converter = (data) => {
            //console.log(data);
            return {
                x: data[0][0],
                y: data[0][1]
            }
        }

        const plinthHeight = 3.0;

        for (const innerPerimeter of innerPerimeters) {

            const innerWall = this.proceedPerimeter(innerPerimeter, converter,
                undefined,
                this.materialGenerator.getMaterial('wallpaper'));

            innerWall.position.y = plinthHeight;

            group.add(innerWall);

            /*
            const innerWallCurve = this.generateCurve(innerPerimeter, plinthHeight, converter);

            const plinthSize = 5.0;

            const plinthPoints = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(-plinthSize, 0),
                new THREE.Vector2(0, plinthSize),
            ];

            const plinthShape = new THREE.Shape(plinthPoints);


            const ceilingPlinthPoints = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(-plinthSize, 0),
                new THREE.Vector2(0, plinthSize),
            ];

            const ceilingPlinthShape = new THREE.Shape(ceilingPlinthPoints);

            const extrudeSettings = {
                steps: 30,
                bevelEnabled: false,
                extrudePath: undefined
            };

            for (const innerWallCurveElement of innerWallCurve) {

                extrudeSettings.extrudePath = innerWallCurveElement;

                const geometry2 = new THREE.ExtrudeGeometry(plinthShape, extrudeSettings);

                const material2 = new THREE.MeshLambertMaterial({color: 0xff8000, wireframe: false});

                const mesh2 = new THREE.Mesh(geometry2, material2);

                group.add(mesh2);


                const geometry3 = new THREE.ExtrudeGeometry(ceilingPlinthShape, extrudeSettings);

                const material3 = new THREE.MeshLambertMaterial({color: 0xd3d3d3, wireframe: false});

                const mesh3 = new THREE.Mesh(geometry3, material3);

                mesh3.position.y = this.roomHeight-5;

                group.add(mesh3);


            }
            */
        }

    }

    proceedFloor(points, group) {
        const floor = this.proceedPerimeter(points, (data) => {
                //console.log(data);
                return {
                    x: data[0],
                    y: data[1]
                }
            },
            0.1,
            this.materialGenerator.getMaterial('floor'));
        group.add(floor);
    }

    proceedCeiling(points, group) {
        const ceiling = this.proceedPerimeter(points, (data) => {
                //console.log(data);
                return {
                    x: data[0],
                    y: data[1]
                }
            },
            3,
            this.materialGenerator.getMaterial('ceiling')
        );

        ceiling.position.y = this.roomHeight;

        group.add(ceiling);
    }
    generateLights(json, group) {

    }

    generateLights2(json, group) {
        const rooms = json.Rooms;

        for (const room of rooms) {

            const polygon = turf.polygon([this.convertToTurfPoints(room.points)]);

            const center = turf.centerOfMass(polygon);

            const coordCenter = turf.getCoord(center);

            console.log(coordCenter);

            const centerRoom = {
                x: coordCenter[0],
                y: this.roomHeight,
                z: -coordCenter[1]
            }

            const geometry = new THREE.CylinderGeometry(20, 20, 5, 32);
            const material = new THREE.MeshBasicMaterial({color: 0xd3d3d3});
            const cylinder = new THREE.Mesh(geometry, material);

            cylinder.position.set(
                centerRoom.x,
                centerRoom.y,
                centerRoom.z
            )

            group.add(cylinder);


            const light = new THREE.DirectionalLight(0xd3d3d3, 0.5);

            light.position.set(
                centerRoom.x,
                centerRoom.y - 20,
                centerRoom.z
            );

            light.castShadow = true;

            group.add(light);

        }

    }

    convertToTurfPoints(points) {
        const turfPoints = [];

        for (const point of points) {
            turfPoints.push([
                point.x,
                point.y
            ])
        }

        turfPoints.push([
            points[0].x,
            points[0].y
        ])

        //console.log(turfPoints);

        return turfPoints;
    }

    generateCurve(json, height, converter = undefined) {

        const perimeter = this.getPointsVector2(
            json,
            undefined,
            converter
        );

        const perimeter3 = [];

        for (const perimeterElement of perimeter) {
            perimeter3.push(
                new THREE.Vector3(
                    perimeterElement.x,
                    height,
                    -perimeterElement.y
                )
            )
        }

        //const curve = new THREE.CatmullRomCurve3(perimeter3);

        const curves = [];

        for (let i = 0; i < perimeter3.length - 2; i++) {
            const curve = new THREE.LineCurve3(
                perimeter3[i],
                perimeter3[i + 1]
            );
            curves.push(curve);
        }


        //console.log(curves);
        return curves;
    }
}
