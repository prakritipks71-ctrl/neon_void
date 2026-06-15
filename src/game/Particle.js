/* ==========================================================================
   PARTICLE.JS - HIGH-PERFORMANCE GLOWING PARTICLE SYSTEM
   ========================================================================== */

export class Particle {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.size = options.size || 2;
        this.color = options.color || '#ffffff';
        this.maxLife = options.maxLife || 30; // frames
        this.life = this.maxLife;
        this.decay = options.decay || 1.0;
        this.drag = options.drag || 0.98;
        this.grow = options.grow || 0; // rate of size increase/decrease
        
        // Rotational physics
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        
        // Shape override (e.g., 'circle', 'line', 'square', 'ring', 'triangle')
        this.shape = options.shape || 'circle';
        this.targetX = options.targetX || 0; // For lines
        this.targetY = options.targetY || 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        this.vx *= this.drag;
        this.vy *= this.drag;
        
        this.size += this.grow;
        if (this.size < 0.1) this.size = 0.1;
        
        this.rotation += this.rotationSpeed;
        this.life -= this.decay;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        const alpha = Math.max(0, this.life / this.maxLife);
        
        ctx.save();
        
        // Set glow effect for particles (important for neon aesthetic)
        ctx.shadowBlur = this.size * 1.5;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        
        ctx.translate(x, y);
        ctx.rotate(this.rotation);
        
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'ring') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.lineWidth = Math.max(1, this.size * 0.15);
            ctx.stroke();
        } else if (this.shape === 'square') {
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        } else if (this.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
            ctx.fill();
        } else if (this.shape === 'line') {
            // Draw relative speed line
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - this.vx * 2, y - this.vy * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 800; // Cap to ensure high framerates
    }

    add(particle) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift(); // Remove oldest to fit new ones
        }
        this.particles.push(particle);
    }

    spawnThrust(x, y, angle, color) {
        const spread = 0.3;
        const thrustAngle = angle + Math.PI + (Math.random() * spread - spread / 2);
        const speed = 2 + Math.random() * 4;
        
        this.add(new Particle({
            x: x,
            y: y,
            vx: Math.cos(thrustAngle) * speed,
            vy: Math.sin(thrustAngle) * speed,
            size: 3 + Math.random() * 3,
            color: color,
            maxLife: 20 + Math.random() * 15,
            decay: 1.2,
            drag: 0.96,
            grow: -0.15
        }));
    }

    spawnExplosion(x, y, color, count = 25) {
        // Shockwave expansion ring
        this.add(new Particle({
            x: x,
            y: y,
            size: 5,
            color: color,
            maxLife: 25,
            decay: 1.0,
            grow: 4.5,
            shape: 'ring',
            drag: 0.95
        }));

        // Radiating shards and sparks
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            const size = 1.5 + Math.random() * 4;
            const shape = Math.random() > 0.6 ? 'triangle' : 'circle';
            
            this.add(new Particle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                maxLife: 35 + Math.random() * 20,
                decay: 1.0,
                drag: 0.94,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                shape: shape
            }));
        }
    }

    spawnSparks(x, y, angle, color) {
        // Impact sparks, spraying away from weapon impact angle
        const count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const sparkAngle = angle + (Math.random() * 1.0 - 0.5);
            const speed = 4 + Math.random() * 5;
            this.add(new Particle({
                x: x,
                y: y,
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                size: 1.5 + Math.random() * 2,
                color: color,
                maxLife: 12 + Math.random() * 8,
                decay: 1.2,
                drag: 0.95,
                shape: 'line'
            }));
        }
    }

    spawnDashGhost(x, y, drawCallback, color) {
        // Creates a fading visual silhouette of the ship during a dash
        this.add(new Particle({
            x: x,
            y: y,
            size: 1,
            color: color,
            maxLife: 15,
            decay: 1.0,
            shape: 'circle', // We won't draw standard shape, we override draw
            draw: (ctx, cameraX, cameraY) => {
                const alpha = Math.max(0, this.life / this.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha * 0.35;
                ctx.strokeStyle = color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
                
                // Invoke drawing callback centered at ghost coordinate
                ctx.translate(x - cameraX, y - cameraY);
                drawCallback(ctx);
                ctx.restore();
            }
        }));
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, cameraX, cameraY) {
        this.particles.forEach(p => p.draw(ctx, cameraX, cameraY));
    }
}
