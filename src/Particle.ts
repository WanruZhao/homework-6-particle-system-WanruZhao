import {vec3, mat4} from 'gl-matrix';


let epsilon1 = 10.0;
let attractForce = 0.001;
let coeff = 500.0;

class Particle
{
    position : vec3;
    velocity : vec3;
    acceleration : vec3;
    time : number;
    mass : number;
    mode : number;
    force : number;
    forceP : vec3;


    constructor(pos : vec3, vel : vec3, acc : vec3, m :number, t : number, p: vec3) {
        this.position = vec3.fromValues(pos[0], pos[1], pos[2]);
        this.velocity = vec3.fromValues(vel[0], vel[1], vel[2]);
        this.acceleration = vec3.fromValues(acc[0], acc[1], acc[2]);
        this.time = t;
        this.mass = m;
        this.force = attractForce * (Math.random() * 0.8 + 0.2);
        this.forceP = vec3.fromValues(p[0], p[1], p[2]);
    }

    update(time : number, forceP : vec3, mode : number) {
        let deltaT = time - this.time;
        this.acceleration = this.getAcceleration(mode, forceP);

        let dis = vec3.distance(this.position, forceP);
        if(dis < 5.0) {
            vec3.scale(this.velocity, this.velocity, dis / 10.0 +  0.5);

        }
        
        let distance : number = vec3.len(this.position);

        let voff = vec3.scale(vec3.create(), this.acceleration, deltaT);
        let vp = vec3.add(vec3.create(), this.velocity, voff);

        if(vec3.len(vp) > 10.0) {
            vec3.scale(vp, vp, 10.0 / vec3.len(vp));
        }

        
        let xoff = vec3.scale(vec3.create(),
                  vec3.add(vec3.create(), this.velocity, vp),
                  deltaT / 2.0);

        this.position = vec3.add(vec3.create(), this.position, xoff);
        this.velocity = vp;
        this.time = time;
        
    }

    getAcceleration(mode: number, forceP : vec3) : vec3{
        //Attraction
        if(mode === 0) {
            let disP = vec3.sub(vec3.create(), forceP, this.position);
            vec3.normalize(disP, disP);
            let dis = vec3.distance(this.position, forceP);
            let disI = 1.0 / dis;
            if(disI < 0.001) {
                disI = 1.0;
            }
            if(dis < 5.0) {
                return vec3.scale(disP, disP, - this.force * 20.0 / this.mass);
            } else {
                return vec3.scale(disP, disP, this.force * dis  / this.mass);
            }
        } 
        //Repel
        else if(mode === 1) {
            let disP = vec3.sub(vec3.create(), this.position, forceP);
            vec3.normalize(disP, disP);
            let dis = vec3.distance(this.position, forceP);
            let disI = 1.0 / dis;
            return vec3.scale(disP, disP, this.force * 1000.0 / this.mass);
        }
    }
};

export default Particle;
