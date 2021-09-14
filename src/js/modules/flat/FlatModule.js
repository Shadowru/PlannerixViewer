import earcut from 'earcut';
import Buffer from "./Buffer";
import extrudePolygon from './extrudePolygon';

export default class FlatGenerator {

    constructor(jsonFlat) {

        this._json = jsonFlat;

    }

    generate() {

        const rooms = this._json.rooms;

        const roomsColour = new THREE.Color();
        roomsColour.set('#FFFFFF');

        const roomPoints = [];

        for (const room of rooms) {
            roomPoints.push(room.points);
        }

        const externalWalls = this._json.external_walls;

        const wallsColour = new THREE.Color();
        wallsColour.set('#FF0000');

        const rootObject = new THREE.Object3D();

        rootObject.add(this.generateMesh(roomPoints, roomsColour));
        rootObject.add(this.generateMesh([externalWalls], wallsColour, 25, roomPoints));

        return rootObject;
    }

    generateMesh(pointsList, colour, height = 0, holes = undefined) {

        let attributes = pointsList.map(points => {

            // Light and dark colours used for poor-mans AO gradient on object sides
            var light = new THREE.Color(0xffffff);
            var shadow = new THREE.Color(0x666666);

            let _earcut = this._toearcut(points, holes);

            const faces = this._triangulate(_earcut);

            let groupedVertices = [];

            for (var i = 0, il = _earcut.vertices.length; i < il; i += _earcut.dimensions) {
                groupedVertices.push(_earcut.vertices.slice(i, i + _earcut.dimensions));
            }

            const min_height = 0;

            let extruded = extrudePolygon(groupedVertices, faces, {
                bottom: min_height,
                top: height
            });

            let topColor = colour.clone().multiply(light);
            let bottomColor = colour.clone().multiply(shadow);

            let _vertices = extruded.positions;
            let _faces = [];

            const _colours = [];

            extruded.top.forEach((face, fi) => {

                _faces.push(face);

                const _colour = [];

                _colour.push([colour.r, colour.g, colour.b]);
                _colour.push([colour.r, colour.g, colour.b]);
                _colour.push([colour.r, colour.g, colour.b]);

                _colours.push(_colour);
            });

            this._flat = true;

            if (extruded.sides) {
                this._flat = false;

                // Set up colours for every vertex with poor-mans AO on the sides
                extruded.sides.forEach((face, fi) => {
                    const _colour = [];

                    // First face is always bottom-bottom-top
                    if (fi % 2 === 0) {
                        _colour.push([bottomColor.r, bottomColor.g, bottomColor.b]);
                        _colour.push([bottomColor.r, bottomColor.g, bottomColor.b]);
                        _colour.push([topColor.r, topColor.g, topColor.b]);
                        // Reverse winding for the second face
                        // top-top-bottom
                    } else {
                        _colour.push([topColor.r, topColor.g, topColor.b]);
                        _colour.push([topColor.r, topColor.g, topColor.b]);
                        _colour.push([bottomColor.r, bottomColor.g, bottomColor.b]);
                    }

                    _faces.push(face);
                    _colours.push(_colour);
                });
            }

            const polygon = {
                vertices: _vertices,
                faces: _faces,
                colours: _colours,
                facesCount: _faces.length,
            };

            console.log('polygon', polygon);

            return this._toAttributes(polygon);

        });

        this._bufferAttributes = Buffer.mergeAttributes(attributes);

        console.log('bufferAttributes', this._bufferAttributes);

        // Original attributes are no longer required so free the memory
        attributes = null;

        const polygonAttributes = [];
        const polygonFlat = true;


        polygonAttributes.push(this._bufferAttributes);

        if (polygonAttributes.length > 0) {
            var mergedPolygonAttributes = Buffer.mergeAttributes(polygonAttributes);
            this._setPolygonMesh(mergedPolygonAttributes, polygonFlat);
        }

        return this._polygonMesh;
    }

    _triangulate(contour) {
        // console.time('earcut');

        console.log('contour', contour);

        var faces = earcut(contour.vertices, contour.holes, 2);

        console.log('faces', faces);

        var result = [];

        for (var i = 0, il = faces.length; i < il; i += 3) {
            result.push(faces.slice(i, i + 3));
        }

        return result;
    }


    _toearcut(points, holes = undefined) {
        const earcut_coords = [];
        let coordIdx = 0;

        points.map(point => {
            earcut_coords.push(point[0]);
            earcut_coords.push(point[1]);
            coordIdx += 1;
        });

        const _holes = [];

        if (holes !== undefined) {


            holes.map(hole => {
                _holes.push(coordIdx);
                hole.map(holeCoord => {
                        earcut_coords.push(holeCoord[0]);
                        //coordIdx++;
                        earcut_coords.push(holeCoord[1]);
                        coordIdx++;
                    }
                );
            })
        }

        return {
            vertices: earcut_coords,
            holes: _holes,
            dimensions: 2
        };
    }

    _setPolygonMesh(attributes, flat) {
        var geometry = new THREE.BufferGeometry();

        // itemSize = 3 because there are 3 values (components) per vertex
        geometry.setAttribute('position', new THREE.BufferAttribute(attributes.vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(attributes.normals, 3));

        if (this._isTile) {
            geometry.setAttribute('uv', new THREE.BufferAttribute(attributes.uvs, 2));
        } else {
            geometry.setAttribute('color', new THREE.BufferAttribute(attributes.colours, 3));
        }

        if (attributes.pickingIds) {
            geometry.setAttribute('pickingId', new THREE.BufferAttribute(attributes.pickingIds, 1));
        }

        geometry.computeBoundingBox();

        // TODO: Make this work when style is a function per feature
        //var style = (typeof this._options.style === 'function') ? this._options.style(this._geojson.features[0]) : this._options.style;
        //style = Object.assign({}, GeoJSON.defaultStyle, style);

        let material;
        const color = '#5B9633';

        material = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors,
            side: THREE.DoubleSide,
            // transparent: style.transparent,
            // opacity: style.opacity,
            // blending: style.blending,
            flatShading: true,
            wireframe: false
        });

        var mesh;

        mesh = new THREE.Mesh(geometry, material);
        //geometry = new THREE.EdgesGeometry( geometry );
        //material = new THREE.LineBasicMaterial( { color: 0xffffff } );

        //mesh = new THREE.LineSegments( geometry, material );

        //mesh.castShadow = true;
        //mesh.receiveShadow = true;

        if (flat) {
            if (material) {
                material.depthWrite = false;
            }
            mesh.renderOrder = 1;
        }

        this._polygonMesh = mesh;
    }

    _toAttributes(polygon) {

        // Three components per vertex per face (3 x 3 = 9)
        var vertices = new Float32Array(polygon.facesCount * 9);
        var normals = new Float32Array(polygon.facesCount * 9);
        var colours = new Float32Array(polygon.facesCount * 9);
        // Two components per vertex per face
        var uvs = new Float32Array(polygon.facesCount * 6);

        var pickingIds;
        if (polygon.pickingId) {
            // One component per vertex per face (1 x 3 = 3)
            pickingIds = new Float32Array(polygon.facesCount * 3);
        }

        var pA = new THREE.Vector3();
        var pB = new THREE.Vector3();
        var pC = new THREE.Vector3();

        var cb = new THREE.Vector3();
        var ab = new THREE.Vector3();

        var index;

        var _faces = polygon.faces;
        var _vertices = polygon.vertices;
        var _colour = polygon.colours;

        var _pickingId;
        if (pickingIds) {
            _pickingId = polygon.pickingId;
        }

        var lastIndex = 0;

        for (var i = 0; i < _faces.length; i++) {
            // Array of vertex indexes for the face
            index = _faces[i][0];

            var ax = _vertices[index][0];
            var ay = _vertices[index][1];
            var az = _vertices[index][2];

            var c1 = _colour[i][0];

            index = _faces[i][1];

            var bx = _vertices[index][0];
            var by = _vertices[index][1];
            var bz = _vertices[index][2];

            var c2 = _colour[i][1];

            index = _faces[i][2];

            var cx = _vertices[index][0];
            var cy = _vertices[index][1];
            var cz = _vertices[index][2];

            var c3 = _colour[i][2];

            // Flat face normals
            // From: http://threejs.org/examples/webgl_buffergeometry.html
            pA.set(ax, ay, az);
            pB.set(bx, by, bz);
            pC.set(cx, cy, cz);

            cb.subVectors(pC, pB);
            ab.subVectors(pA, pB);
            cb.cross(ab);

            cb.normalize();

            var nx = cb.x;
            var ny = cb.y;
            var nz = cb.z;

            vertices[lastIndex * 9 + 0] = ax;
            vertices[lastIndex * 9 + 1] = ay;
            vertices[lastIndex * 9 + 2] = az;

            if (this._isTile) {
                uvs[lastIndex * 6 + 0] = this._calc_X_UV(ax, ay, this._tile);
                uvs[lastIndex * 6 + 1] = this._calc_Y_UV(az, ay, this._tile);
            }


            normals[lastIndex * 9 + 0] = nx;
            normals[lastIndex * 9 + 1] = ny;
            normals[lastIndex * 9 + 2] = nz;

            colours[lastIndex * 9 + 0] = c1[0];
            colours[lastIndex * 9 + 1] = c1[1];
            colours[lastIndex * 9 + 2] = c1[2];

            vertices[lastIndex * 9 + 3] = bx;
            vertices[lastIndex * 9 + 4] = by;
            vertices[lastIndex * 9 + 5] = bz;


            if (this._isTile) {
                uvs[lastIndex * 6 + 2] = this._calc_X_UV(bx, by, this._tile);
                uvs[lastIndex * 6 + 3] = this._calc_Y_UV(bz, by, this._tile);
            }

            normals[lastIndex * 9 + 3] = nx;
            normals[lastIndex * 9 + 4] = ny;
            normals[lastIndex * 9 + 5] = nz;

            colours[lastIndex * 9 + 3] = c2[0];
            colours[lastIndex * 9 + 4] = c2[1];
            colours[lastIndex * 9 + 5] = c2[2];

            vertices[lastIndex * 9 + 6] = cx;
            vertices[lastIndex * 9 + 7] = cy;
            vertices[lastIndex * 9 + 8] = cz;

            if (this._isTile) {
                uvs[lastIndex * 6 + 4] = this._calc_X_UV(cx, cy, this._tile);
                uvs[lastIndex * 6 + 5] = this._calc_Y_UV(cz, cy, this._tile);
            }

            normals[lastIndex * 9 + 6] = nx;
            normals[lastIndex * 9 + 7] = ny;
            normals[lastIndex * 9 + 8] = nz;

            colours[lastIndex * 9 + 6] = c3[0];
            colours[lastIndex * 9 + 7] = c3[1];
            colours[lastIndex * 9 + 8] = c3[2];

            if (pickingIds) {
                pickingIds[lastIndex * 3 + 0] = _pickingId;
                pickingIds[lastIndex * 3 + 1] = _pickingId;
                pickingIds[lastIndex * 3 + 2] = _pickingId;
            }

            lastIndex++;
        }

        var attributes = {
            vertices: vertices,
            normals: normals,
            colours: colours,
            uvs: uvs
        };

        if (pickingIds) {
            attributes.pickingIds = pickingIds;
        }

        return attributes;
    }

}
