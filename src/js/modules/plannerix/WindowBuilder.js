import MaterialGenerator from './MaterialGenerator';

export default class WindowBuilder {

    constructor() {
        this.materialGenerator = new MaterialGenerator();
    }

    buildWindow(data) {
        console.log(data);

        const geometry = new THREE.BoxGeometry( data.width, data.height, data.depth );
        //const material = this.materialGenerator.getMaterial('glass');
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x265F82,
        });
        glassMaterial.opacity = 0.3;
        glassMaterial.transparent = true;
        const cube = new THREE.Mesh( geometry, glassMaterial );

        return cube;
    }
}
