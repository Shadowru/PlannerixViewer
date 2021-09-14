import Feature from "./Feature";
import * as THREE from 'three';

export default class Buildings {

    constructor(url_pattern, map_url_pattern) {
        this.url_pattern = url_pattern;
        this.map_url_pattern = map_url_pattern;
    }

    lon2tile(lon, zoom) {
        return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    }

    lat2tile(lat, zoom) {
        return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
    }

    pattern(str, param) {
        return str.replace(/\{(\w+)\}/g, (tag, key) => param[key] || tag);
    }

    getURL(x, y, z) {
        const s = 'abcd'[(x + y) % 4];
        return this.pattern(
            this.url_pattern,
            {s: s, x: x, y: y, z: z}
        );
    }

    getMapURL(x, y, z) {
        const pattern = this.map_url_pattern;
        if(pattern !== undefined) {
            const s = 'abcd'[(x + y) % 4];
            return this.pattern(
                this.map_url_pattern,
                {s: s, x: x, y: y, z: z}
            );
        }
        return undefined;
    }


    setCenter(lat, lon) {
        this.lat = lat;
        this.lon = lon;
        this.zoom = 15;
    }

    addGeoJSON(url, map_url, options) {

        return new Feature(
            'GeoJSON',
            Object.assign({
                    url: url,
                    map_url: map_url,
                    center: {lat: this.lat, lon: this.lon},
                },
                options
            )
        );
    }

    generate() {
        const lat = this.lat;
        const lon = this.lon;
        const zoom = this.zoom;

        const x_center = this.lon2tile(lon, zoom);
        const y_center = this.lat2tile(lat, zoom);

        const delta = 5;

        const EARTH_RADIUS_IN_METERS = 6378137;
        const EARTH_CIRCUMFERENCE_IN_METERS = EARTH_RADIUS_IN_METERS * Math.PI * 2;

        const size_a = EARTH_CIRCUMFERENCE_IN_METERS * Math.cos(this.lat / 180 * Math.PI) /
            Math.pow(2, zoom);

        const size = size_a;

        const group = new THREE.Group();

        for (let y_delta = -delta; y_delta < delta + 1; y_delta++) {
            for (let x_delta = -delta; x_delta < delta + 1; x_delta++) {

                const url = this.getURL(
                    x_center + x_delta,
                    y_center + y_delta,
                    zoom
                );

                const map_url = this.getMapURL(
                    x_center + x_delta,
                    y_center + y_delta,
                    zoom
                );
                /*
                this.addGeoJSON(url, map_url, {
                    deltaX: size * x_delta,
                    deltaZ: size * y_delta,
                    tileSize: size,
                    group: group
                });

                 */
            }
            //break;
        }

        this.addVectorTile('assets/moscow.json', group);

        return group;

    }

    addVectorTile(json, group) {
        this.addGeoJSON(json, undefined,{
            deltaX: 0,
            deltaZ: 0,
            tileSize: 1024,
            group: group
        });
    }


}
