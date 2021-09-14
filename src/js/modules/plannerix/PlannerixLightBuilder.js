import * as turf from "@turf/turf";
//import * as THREE from "three";

export default class PlannerixLightBuilder {
    constructor(url, callback) {

        this.roomHeight = 320.0;

        fetch(url)
            .then(response => response.json())
            .then(json => {
                //console.log(json);
                const object3D = this.proceedJSON(json);

                callback(object3D);
            })

    }

    proceedJSON(json) {
        const group = new THREE.Group();

        this.generateLights(json, group);

        return group;
    }
    generateLights(json, group) {
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

            /*
            const light = new THREE.DirectionalLight(0xd3d3d3, 0.5);

            light.position.set(
                centerRoom.x,
                centerRoom.y - 20,
                centerRoom.z
            );

            light.castShadow = true;

            group.add(light);
            */

            this.addLightToScene(centerRoom);

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

    addLightToScene(centerRoom) {
        const el = document.createElement('a-entity');

        const rr = THREE.MathUtils.randInt(0, 1000);
        const targetID = "directionTarget" + rr;

        el.setAttribute("light", "angle: 210; type: point; color: #d3d3d3; intensity: 0.3; castShadow: true; target:#" + targetID);

        const scale = 0.01;

        el.setAttribute("position", scale * centerRoom.x + " " + scale * centerRoom.y + " " + scale * centerRoom.z);

        const target = document.createElement('a-entity');

        target.setAttribute('id', targetID);
        target.setAttribute("position", "0 -10 0");

        el.appendChild(
            target
        )

        document.querySelector('a-scene').appendChild(el);
    }
}
