import earcut from 'earcut';
import Split from "../Split";
import Tools from "./Tools";

export default class Roofs {

    constructor() {
    }

    createRoof(triangles, properties, polygon, dim, roofColor, wallColor) {
        switch (properties.roofShape) {
            case 'cone':
                return this.ConeRoof(triangles, polygon, dim, roofColor);
            case 'dome':
                return this.DomeRoof(triangles, polygon, dim, roofColor);
            case 'pyramid':
                return this.PyramidRoof(triangles, properties, polygon, dim, roofColor);
            case 'skillion':
                return this.SkillionRoof(triangles, properties, polygon, dim, roofColor, wallColor);
            case 'gabled':
                return this.roofWithRidge(triangles, properties, polygon, 0, dim, roofColor, wallColor);
            case 'hipped':
                return this.roofWithRidge(triangles, properties, polygon, 0, dim, roofColor, wallColor);
            case 'half-hipped':
                return this.roofWithRidge(triangles, properties, polygon, 0, dim, roofColor, wallColor);
            case 'gambrel':
                return this.roofWithRidge(triangles, properties, polygon, 0, dim, roofColor, wallColor);
            case 'mansard':
                return this.roofWithRidge(triangles, properties, polygon, 0, dim, roofColor, wallColor);
            case 'round':
                return this.RoundRoof(triangles, properties, polygon, dim, roofColor, wallColor);
            case 'onion':
                return this.OnionRoof(triangles, polygon, dim, roofColor);
            case 'flat':
            default:
                return this.FlatRoof(triangles, properties, polygon, dim, roofColor);
        }
    };

    getRidgeIntersections(center, direction, polygon) {
        // create polygon intersections
        var index = [], point;
        for (var i = 0; i < polygon.length - 1; i++) {
            point = Tools.getVectorSegmentIntersection(center, direction, [polygon[i], polygon[i + 1]]);
            if (point !== undefined) {
                if (index.length === 2) {
                    // more than 2 intersections: too complex for gabled roof, should be hipped+skeleton anyway
                    return;
                }
                i++;
                polygon.splice(i, 0, point);
                index.push(i);
            }
        }

        // requires at least 2 intersections
        if (index.length < 2) {
            return;
        }

        return {index: index, roof: polygon};
    }

    getRidge(direction, center, polygon) {
        const rad = ((direction - 90) / 180 - 0.5) * Math.PI;
        return this.getRidgeIntersections(center, [Math.cos(rad), Math.sin(rad)], polygon);
    }

    getRidgeDistances(polygon, index) {
        const ridge = [polygon[index[0]], polygon[index[1]]];
        return polygon.map(point => {
            return Tools.getDistanceToLine(point, ridge);
        });
    }

    roofWithRidge(triangles, properties, polygon, offset, dim, roofColor, wallColor) {
        offset = 0; // TODO

        // no gabled roofs for polygons with holes, roof direction required
        if (polygon.length > 1 || properties.roofDirection === undefined) {
            return this.FlatRoof(triangles, properties, polygon, dim, roofColor);
        }

        const ridge = this.getRidge(properties.roofDirection, dim.center, polygon[0]);
        if (!ridge) {
            return this.FlatRoof(triangles, properties, polygon, dim, roofColor);
        }

        const ridgeIndex = ridge.index;
        let roofPolygon = ridge.roof;

        if (!offset) {
            const distances = this.getRidgeDistances(roofPolygon, ridge.index);
            const maxDistance = Math.max(...distances);

            // set z of all vertices
            roofPolygon = roofPolygon.map((point, i) => {
                return [
                    point[0],
                    point[1],
                    (1 - distances[i] / maxDistance) * dim.roofHeight // closer to ridge -> closer to roof height
                ];
            });

            // create roof faces
            let roof = roofPolygon.slice(ridgeIndex[0], ridgeIndex[1] + 1);
            Split.polygon(triangles, [roof], dim.roofZ, roofColor);

            roof = roofPolygon.slice(ridgeIndex[1], roofPolygon.length - 1);
            roof = roof.concat(roofPolygon.slice(0, ridgeIndex[0] + 1));
            Split.polygon(triangles, [roof], dim.roofZ, roofColor);

            // create extra wall faces
            for (let i = 0; i < roofPolygon.length - 1; i++) {
                // skip degenerate quads - could even skip degenerate triangles
                if (roofPolygon[i][2] === 0 && roofPolygon[i + 1][2] === 0) {
                    continue;
                }
                Split.quad(
                    triangles,
                    [roofPolygon[i][0], roofPolygon[i][1], dim.roofZ + roofPolygon[i][2]],
                    [roofPolygon[i][0], roofPolygon[i][1], dim.roofZ],
                    [roofPolygon[i + 1][0], roofPolygon[i + 1][1], dim.roofZ],
                    [roofPolygon[i + 1][0], roofPolygon[i + 1][1], dim.roofZ + roofPolygon[i + 1][2]],
                    wallColor
                );
            }
        }
    }

    FlatRoof(triangles, properties, polygon, dim, roofColor) {
        if (properties.shape === 'cylinder') {
            Split.circle(triangles, dim.center, dim.radius, dim.roofZ, roofColor);
        } else {
            Split.polygon(triangles, polygon, dim.roofZ, roofColor);
        }
    }

    SkillionRoof(triangles, properties, polygon, dim, roofColor, wallColor) {
        // roof direction required
        if (properties.roofDirection === undefined) {
            return this.FlatRoof(triangles, properties, polygon, dim, roofColor);
        }

        let rad = properties.roofDirection / 180 * Math.PI,
            closestPoint, farthestPoint,
            minY = Infinity, maxY = -Infinity;

        polygon[0].forEach(function (point) {
            var y = point[1] * Math.cos(-rad) + point[0] * Math.sin(-rad);
            if (y < minY) {
                minY = y;
                closestPoint = point;
            }
            if (y > maxY) {
                maxY = y;
                farthestPoint = point;
            }
        });

        var
            outerPolygon = polygon[0],
            roofDirection = [Math.cos(rad), Math.sin(rad)],
            ridge = [closestPoint, [closestPoint[0] + roofDirection[0], closestPoint[1] + roofDirection[1]]],
            maxDistance = Tools.getDistanceToLine(farthestPoint, ridge);

        // modify vertical position of all points
        polygon.forEach(function (ring) {
            ring.forEach(function (point) {
                var distance = Tools.getDistanceToLine(point, ridge);
                point[2] = (distance / maxDistance) * dim.roofHeight;
            });
        });

        // create roof face
        Split.polygon(triangles, [outerPolygon], dim.roofZ, roofColor);

        // create extra wall faces
        polygon.forEach(function (ring) {
            for (var i = 0; i < ring.length - 1; i++) {
                // skip degenerate quads - could even skip degenerate triangles
                if (ring[i][2] === 0 && ring[i + 1][2] === 0) {
                    continue;
                }
                Split.quad(
                    triangles,
                    [ring[i][0], ring[i][1], dim.roofZ + ring[i][2]],
                    [ring[i][0], ring[i][1], dim.roofZ],
                    [ring[i + 1][0], ring[i + 1][1], dim.roofZ],
                    [ring[i + 1][0], ring[i + 1][1], dim.roofZ + ring[i + 1][2]],
                    wallColor
                );
            }
        });
    }

    ConeRoof(triangles, polygon, dim, roofColor) {
        Split.polygon(triangles, polygon, dim.roofZ, roofColor);
        Split.cylinder(triangles, dim.center, dim.radius, 0, dim.roofHeight, dim.roofZ, roofColor);
    }

    DomeRoof(triangles, polygon, dim, roofColor) {
        Split.polygon(triangles, polygon, dim.roofZ, roofColor);
        Split.dome(triangles, dim.center, dim.radius, dim.roofHeight, dim.roofZ, roofColor);
    }

    PyramidRoof(triangles, properties, polygon, dim, roofColor) {
        if (properties.shape === 'cylinder') {
            Split.cylinder(triangles, dim.center, dim.radius, 0, dim.roofHeight, dim.roofZ, roofColor);
        } else {
            Split.pyramid(triangles, polygon, dim.center, dim.roofHeight, dim.roofZ, roofColor);
            Split.pyramid(triangles, polygon, dim.center, dim.roofHeight, dim.roofZ, roofColor);
        }
    }

    RoundRoof(triangles, properties, polygon, dim, roofColor, wallColor) {
        // no round roofs for polygons with holes
        if (polygon.length > 1 || properties.roofDirection === undefined) {
            return FlatRoof(triangles, properties, polygon, dim, roofColor);
        }

        return this.FlatRoof(triangles, properties, polygon, dim, roofColor);
        // const ridge = getRidge (properties.roofDirection, dim.center, polygon[0]);
        // if (!ridge) {
        //   return FlatRoof(triangles, properties, polygon, dim, roofColor);
        // }
        //
        // const distances = getRidgeDistances(polygon[0], ridge.index); // TODO: polygon[0] ???
        // const maxDistance = Math.max(...distances);
        //
        //
        //
        //
        //
        // const zPos = dim.roofZ;
        // const yNum = split.NUM_Y_SEGMENTS/2;
        //
        // const quarterCircle = Math.PI/2;
        // const circleOffset = -quarterCircle;
        //
        // let currYAngle, nextYAngle;
        // let x1, y1;
        // let x2, y2;
        // let size1, size2;
        // let newHeight, newZPos;
        //
        // // goes top-down
        // for (let i = 0; i < yNum; i++) {
        //   currYAngle = ( i   /yNum)*quarterCircle + circleOffset;
        //   nextYAngle = ((i+1)/yNum)*quarterCircle + circleOffset;
        //
        //   x1 = Math.cos(currYAngle);
        //   y1 = Math.sin(currYAngle);
        //
        //   x2 = Math.cos(nextYAngle);
        //   y2 = Math.sin(nextYAngle);
        //
        //   // size1 = x1*dim.size; // width
        //   // size2 = x2*dim.size; // width
        //
        //   newHeight = (y2-y1)*dim.roofHeight;
        //   newZPos = zPos - y2*dim.roofHeight;
        //
        //   // split.cylinder(buffers, center, radius2, radius1, newHeight, newZPos, color);
        // }
    }

    /***
     function RoundRoof2 (roofHeight) {
    // extends RoofWithRidge
    const ROOF_SUBDIVISION_METER = 2.5;

    const capSegments = [];
    let rings;
    let radius;

    if (roofHeight < maxDistanceToRidge) {
      const squaredHeight = roofHeight * roofHeight;
      const squaredDist = maxDistanceToRidge * maxDistanceToRidge;
      const centerY =  (squaredDist - squaredHeight) / (2 * roofHeight);
      radius = Math.sqrt(squaredDist + centerY * centerY);
    } else {
      radius = 0;
    }

    rings = Math.max(3, roofHeight/ROOF_SUBDIVISION_METER);

    // TODO: vary step size with slope
    const step = 0.5 / (rings.length + 1);
    for (let i = 1; i <= rings; i++) {
      capSegments.push([
        interpolate(cap1.p1, cap1.p2, i * step),
        interpolate(cap1.p1, cap1.p2, 1 - i * step)
      ]);

      capSegments.push([
        interpolate(cap2.p1, cap2.p2, i * step),
        interpolate(cap2.p1, cap2.p2, 1 - i * step)
      ]);
    }

    function getPolygon() {
      let newOuter = polygon.getOuter();

      newOuter = insertIntoPolygon(newOuter, ridge.p1, 0.2);
      newOuter = insertIntoPolygon(newOuter, ridge.p2, 0.2);

      for (LineSegmentXZ capPart : capSegments){
        newOuter = insertIntoPolygon(newOuter, capPart.p1, 0.2);
        newOuter = insertIntoPolygon(newOuter, capPart.p2, 0.2);
      }

      //TODO: add intersections of additional edges with outline?
      return new PolygonWithHolesXZ(
        newOuter.asSimplePolygon(),
        polygon.getHoles());
    }

    if (radius > 0) {
      double relativePlacement = distRidge / radius;
      ele = getMaxRoofEle() - radius + sqrt(1.0 - relativePlacement * relativePlacement) * radius;
    } else {
      // This could be any interpolator
      double relativePlacement = distRidge / maxDistanceToRidge;
      ele = getMaxRoofEle() - roofHeight + (1 - (Math.pow(relativePlacement, 2.5))) * roofHeight;
    }

    return Math.max(ele, getMaxRoofEle() - roofHeight);
  }
     ***/

    OnionRoof(triangles, polygon, dim, roofColor) {
        Split.polygon(triangles, polygon, dim.roofZ, roofColor);

        var rings = [
            {rScale: 0.8, hScale: 0},
            {rScale: 0.9, hScale: 0.18},
            {rScale: 0.9, hScale: 0.35},
            {rScale: 0.8, hScale: 0.47},
            {rScale: 0.6, hScale: 0.59},
            {rScale: 0.5, hScale: 0.65},
            {rScale: 0.2, hScale: 0.82},
            {rScale: 0, hScale: 1}
        ];

        var h1, h2;
        for (var i = 0, il = rings.length - 1; i < il; i++) {
            h1 = dim.roofHeight * rings[i].hScale;
            h2 = dim.roofHeight * rings[i + 1].hScale;
            Split.cylinder(triangles, dim.center, dim.radius * rings[i].rScale, dim.radius * rings[i + 1].rScale, h2 - h1, dim.roofZ + h1, roofColor);
        }
    }

    HalfHippedRoof(tags, polygon) {
//   this.cap1part = [
//     interpolateBetween(this.cap1[0], this.cap1[1], 0.5 - this.ridgeOffset/this.cap1.getLength()),
//     interpolateBetween(this.cap1[0], this.cap1[1], 0.5 + this.ridgeOffset/this.cap1.getLength())
//   ];
//   this.cap2part = [
//     interpolateBetween(this.cap2[0], this.cap2[1], 0.5 - this.ridgeOffset/this.cap1.getLength()),
//     interpolateBetween(this.cap2[0], this.cap2[1], 0.5 + this.ridgeOffset/this.cap1.getLength())
//   ];
    }

    GambrelRoof(tags, polygon) {
//   this.cap1part = [
//     interpolateBetween(this.cap1[0], this.cap1[1], 1/6.0),
//     interpolateBetween(this.cap1[0], this.cap1[1], 5/6.0)
//   ];
//   this.cap2part = [
//     interpolateBetween(this.cap2[0], this.cap2[1], 1/6.0),
//     interpolateBetween(this.cap2[0], this.cap2[1], 5/6.0)
//   ];
    }

    MansardRoof(tags, polygon) {
//   this.mansardEdge1 = [
//     interpolateBetween(this.cap1[0], this.ridge[0], 1/3.0),
//     interpolateBetween(this.cap2[1], this.ridge[1], 1/3.0)
//   ];
//   this.mansardEdge2 = [
//     interpolateBetween(this.cap1[1], this.ridge[0], 1/3.0),
//     interpolateBetween(this.cap2[0], this.ridge[1], 1/3.0)
//   ];
    }


}
