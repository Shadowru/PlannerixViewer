import Request from "./Request";

import Triangulate from "../triangulate/Triangulate"

export default class GeoWorker {


    constructor(callback, scene) {
        this.callback = callback;
        this.scene = scene;
    }

    getOrigin(geometry) {
        const coordinates = geometry.coordinates;
        switch (geometry.type) {
            case 'Point':
                return coordinates;

            case 'MultiPoint':
            case 'LineString':
                return coordinates[0];

            case 'MultiLineString':
            case 'Polygon':
                return coordinates[0][0];

            case 'MultiPolygon':
                return coordinates[0][0][0];
        }
    }

    onmessage(e) {

        const params = e.data;

        //console.log(params);

        if (params.type === 'GeoJSON') {
            this.loadGeoJSON(params.url, params.options);
        }
    }

    loadGeoJSON(url, options = {}) {
        if (typeof url === 'object') {
            postMessage('load');
            this.processGeoJSON(url, options);
        } else {
            Request.getJSON(url, (err, geojson) => {
                if (err) {
                    postMessage('error');
                } else {
                    postMessage('load');
                    this.processGeoJSON(geojson, options);
                }
            });
        }
    }

    getGeoJSONBounds(geometry) {
        const
            type = geometry.type,
            coords = geometry.coordinates,
            min = [Infinity, Infinity],
            max = [-Infinity, -Infinity];

        if (type === 'Polygon' && coords.length) {
            coords[0].forEach(point => {
                if (point[0] < min[0]) min[0] = point[0];
                if (point[1] < min[1]) min[1] = point[1];
                if (point[0] > max[0]) max[0] = point[0];
                if (point[1] > max[1]) max[1] = point[1];
            });
            return {min, max};
        }

        if (type === 'MultiPolygon') {
            coords.forEach(polygon => {
                if (polygon[0]) {
                    polygon[0].forEach(point => {
                        if (point[0] < min[0]) min[0] = point[0];
                        if (point[1] < min[1]) min[1] = point[1];
                        if (point[0] > max[0]) max[0] = point[0];
                        if (point[1] > max[1]) max[1] = point[1];
                    });
                }
            });
            return {min, max};
        }
    }

    processGeoJSON(geojson, options) {

        if (!geojson || !geojson.features.length) {
            postMessage('error'); // TODO: not really an error
            return;
        }

        const tri = {
            vertices: [],
            normals: [],
            colors: [],
            texCoords: [],
            heights: [],
            pickingColors: []
        };

        const
            items = [],
            origin = this.getOrigin(geojson.features[0].geometry),
            position = {latitude: origin[1], longitude: origin[0]};

        geojson.features.forEach((feature, index) => {
            // APP.events.emit('loadfeature', feature); // TODO

            const
                properties = feature.properties,
                id = options.id || feature.id;

            let vertexCount = tri.vertices.length;

            const triangulator = Triangulate.triangulate();

            triangulator(tri, feature, origin);
            vertexCount = (tri.vertices.length - vertexCount) / 3;

            for (let i = 0; i < vertexCount; i++) {
                tri.heights.push(properties.height);
            }

            properties.bounds = this.getGeoJSONBounds(feature.geometry);
            items.push({id: id, properties: properties, vertexCount: vertexCount});
        });

        this.postResult(items, position, tri);
    }

    postResult(items, position, tri) {
        const res = {
            items: items,
            position: position,
            vertices: new Float32Array(tri.vertices),
            normals: new Float32Array(tri.normals),
            colors: new Float32Array(tri.colors),
            texCoords: new Float32Array(tri.texCoords),
            heights: new Float32Array(tri.heights),
        };

        this.callback(res, this.scene);
    }


}
