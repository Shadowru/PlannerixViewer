import earcut from "earcut";
import vec3 from './geometry/vec3';
import vec2 from './geometry/vec2';

export default class Split {

    static quad(buffers, a, b, c, d, color) {
        Split.triangle(buffers, a, b, c, color);
        Split.triangle(buffers, c, d, a, color);
    }

    static triangle(buffers, a, b, c, color) {
        const n = vec3.normal(a, b, c);
        buffers.vertices.push(...a, ...c, ...b);
        buffers.normals.push(...n, ...n, ...n);
        buffers.colors.push(...color, ...color, ...color);
        buffers.texCoords.push(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    }

    static circle(buffers, center, radius, zPos, color) {
        zPos = zPos || 0;
        let u, v;
        for (let i = 0; i < Split.getXsegments(); i++) {
            u = i / Split.getXsegments();
            v = (i + 1) / Split.getXsegments();
            Split.triangle(
                buffers,
                [center[0] + radius * Math.sin(u * Math.PI * 2), center[1] + radius * Math.cos(u * Math.PI * 2), zPos],
                [center[0], center[1], zPos],
                [center[0] + radius * Math.sin(v * Math.PI * 2), center[1] + radius * Math.cos(v * Math.PI * 2), zPos],
                color
            );
        }
    }

    static polygon(buffers, rings, zPos, color) {
        zPos = zPos || 0;

        const
            vertexBuffer = [],
            ringIndex = [];

        let index = 0;
        rings.forEach((ring, i) => {
            ring.forEach(point => {
                vertexBuffer.push(point[0], point[1], zPos + (point[2] || 0));
            });
            if (i) {
                index += rings[i - 1].length;
                ringIndex.push(index);
            }
        });

        const vertices = earcut(vertexBuffer, ringIndex, 3);

        for (let i = 0; i < vertices.length - 2; i += 3) {
            const v1 = vertices[i] * 3;
            const v2 = vertices[i + 1] * 3;
            const v3 = vertices[i + 2] * 3;
            Split.triangle(
                buffers,
                [vertexBuffer[v1], vertexBuffer[v1 + 1], vertexBuffer[v1 + 2]],
                [vertexBuffer[v2], vertexBuffer[v2 + 1], vertexBuffer[v2 + 2]],
                [vertexBuffer[v3], vertexBuffer[v3 + 1], vertexBuffer[v3 + 2]],
                color
            );
        }
    }

    static cube(buffers, sizeX, sizeY, sizeZ, X, Y, zPos, color) {
        X = X || 0;
        Y = Y || 0;
        zPos = zPos || 0;

        const
            a = [X, Y, zPos],
            b = [X + sizeX, Y, zPos],
            c = [X + sizeX, Y + sizeY, zPos],
            d = [X, Y + sizeY, zPos],
            A = [X, Y, zPos + sizeZ],
            B = [X + sizeX, Y, zPos + sizeZ],
            C = [X + sizeX, Y + sizeY, zPos + sizeZ],
            D = [X, Y + sizeY, zPos + sizeZ];

        Split.quad(buffers, b, a, d, c, color);
        Split.quad(buffers, A, B, C, D, color);
        Split.quad(buffers, a, b, B, A, color);
        Split.quad(buffers, b, c, C, B, color);
        Split.quad(buffers, c, d, D, C, color);
        Split.quad(buffers, d, a, A, D, color);
    }

    static cylinder(buffers, center, radius1, radius2, height, zPos, color) {
        zPos = zPos || 0;

        const
            num = Split.getXsegments(),
            doublePI = Math.PI * 2;

        let
            currAngle, nextAngle,
            currSin, currCos,
            nextSin, nextCos;

        for (let i = 0; i < num; i++) {
            currAngle = (i / num) * doublePI;
            nextAngle = ((i + 1) / num) * doublePI;

            currSin = Math.sin(currAngle);
            currCos = Math.cos(currAngle);

            nextSin = Math.sin(nextAngle);
            nextCos = Math.cos(nextAngle);

            Split.triangle(
                buffers,
                [center[0] + radius1 * currSin, center[1] + radius1 * currCos, zPos],
                [center[0] + radius2 * nextSin, center[1] + radius2 * nextCos, zPos + height],
                [center[0] + radius1 * nextSin, center[1] + radius1 * nextCos, zPos],
                color
            );

            if (radius2 !== 0) {
                Split.triangle(
                    buffers,
                    [center[0] + radius2 * currSin, center[1] + radius2 * currCos, zPos + height],
                    [center[0] + radius2 * nextSin, center[1] + radius2 * nextCos, zPos + height],
                    [center[0] + radius1 * currSin, center[1] + radius1 * currCos, zPos],
                    color
                );
            }
        }
    }

    static dome(buffers, center, radius, height, zPos, color, flip) {
        zPos = zPos || 0;

        const
            yNum = Split.getYsegments() / 2,
            quarterCircle = Math.PI / 2,
            circleOffset = flip ? 0 : -quarterCircle;

        let
            currYAngle, nextYAngle,
            x1, y1,
            x2, y2,
            radius1, radius2,
            newHeight, newZPos;

        // goes top-down
        for (let i = 0; i < yNum; i++) {
            currYAngle = (i / yNum) * quarterCircle + circleOffset;
            nextYAngle = ((i + 1) / yNum) * quarterCircle + circleOffset;

            x1 = Math.cos(currYAngle);
            y1 = Math.sin(currYAngle);

            x2 = Math.cos(nextYAngle);
            y2 = Math.sin(nextYAngle);

            radius1 = x1 * radius;
            radius2 = x2 * radius;

            newHeight = (y2 - y1) * height;
            newZPos = zPos - y2 * height;

            Split.cylinder(buffers, center, radius2, radius1, newHeight, newZPos, color);
        }
    }

    static sphere(buffers, center, radius, height, zPos, color) {
        zPos = zPos || 0;
        let vertexCount = 0;
        vertexCount += Split.dome(buffers, center, radius, height / 2, zPos + height / 2, color, true);
        vertexCount += Split.dome(buffers, center, radius, height / 2, zPos + height / 2, color);
        return vertexCount;
    }

    static pyramid(buffers, polygon, center, height, zPos, color) {
        zPos = zPos || 0;
        polygon = polygon[0];
        for (let i = 0, il = polygon.length - 1; i < il; i++) {
            Split.triangle(
                buffers,
                [polygon[i][0], polygon[i][1], zPos],
                [polygon[i + 1][0], polygon[i + 1][1], zPos],
                [center[0], center[1], zPos + height],
                color
            );
        }
    }

    static extrusion(buffers, polygon, height, zPos, color, texCoord) {
        zPos = zPos || 0;
        let
            a, b,
            L,
            v0, v1, v2, v3, n,
            tx1, tx2,
            ty1 = texCoord[2] * height, ty2 = texCoord[3] * height,
            r, rl;

        polygon.forEach(ring => {
            for (r = 0, rl = ring.length - 1; r < rl; r++) {
                a = ring[r];
                b = ring[r + 1];
                L = vec2.len(vec2.sub(a, b));

                v0 = [a[0], a[1], zPos];
                v1 = [b[0], b[1], zPos];
                v2 = [b[0], b[1], zPos + height];
                v3 = [a[0], a[1], zPos + height];

                n = vec3.normal(v0, v1, v2);
                [].push.apply(buffers.vertices, [].concat(v0, v2, v1, v0, v3, v2));
                [].push.apply(buffers.normals, [].concat(n, n, n, n, n, n));
                [].push.apply(buffers.colors, [].concat(color, color, color, color, color, color));

                tx1 = (texCoord[0] * L) << 0;
                tx2 = (texCoord[1] * L) << 0;

                buffers.texCoords.push(
                    tx1, ty2,
                    tx2, ty1,
                    tx2, ty2,

                    tx1, ty2,
                    tx1, ty1,
                    tx2, ty1
                );
            }
        });
    }

    static getXsegments() {
        return 32;
    }

    static getYsegments() {
        return 24;
    }

}
