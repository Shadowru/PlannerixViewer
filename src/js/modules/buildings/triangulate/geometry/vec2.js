export default class vec2 {
    static len(a) {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    }

    static add(a, b) {
        return [a[0] + b[0], a[1] + b[1]];
    }

    static sub(a, b) {
        return [a[0] - b[0], a[1] - b[1]];
    }

    static dot(a, b) {
        return a[1] * b[0] - a[0] * b[1];
    }

    static scale(a, f) {
        return [a[0] * f, a[1] * f];
    }

    static equals(a, b) {
        return (a[0] === b[0] && a[1] === b[1]);
    }
};
