/* ==========================================================================
   NEBULA.JS - PROCEDURAL PARALLAX STARS AND SHIFTING NEBULA CLOUDS
   ========================================================================== */

export class NebulaBackground {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        
        // Parallax star layers: [size, alpha, speedCoefficient][]
        this.starLayers = [
            this._generateStars(120, 1.0, 0.15, 0.08),  // Slow, tiny stars (background)
            this._generateStars(60, 1.8, 0.35, 0.22),   // Medium stars (middle ground)
            this._generateStars(20, 2.5, 0.65, 0.50)    // Fast, bright stars (foreground)
        ];
        
        // Procedural nebula clouds
        this.nebulas = [
            {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.min(this.width, this.height) * 0.6,
                color: 'rgba(255, 0, 136, 0.06)', // Neon Magenta cloud
                dx: 0.1,
                dy: 0.08
            },
            {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.min(this.width, this.height) * 0.8,
                color: 'rgba(0, 68, 255, 0.06)', // Deep Blue cloud
                dx: -0.07,
                dy: 0.09
            },
            {
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.min(this.width, this.height) * 0.5,
                color: 'rgba(0, 243, 255, 0.05)', // Neon Cyan cloud
                dx: 0.05,
                dy: -0.06
            }
        ];
    }

    _generateStars(count, size, alphaBase, speedCoeff) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.max(0.5, size * (0.6 + Math.random() * 0.8)),
                alpha: alphaBase * (0.4 + Math.random() * 0.6),
                speedCoeff: speedCoeff
            });
        }
        return stars;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    update(cameraX, cameraY) {
        // Slowly drift nebulas over time to simulate cosmic rotation/expansion
        this.nebulas.forEach(neb => {
            neb.x += neb.dx;
            neb.y += neb.dy;
            
            // Constrain nebulas roughly around the boundaries, shifting direction on edge hit
            const limit = Math.max(this.width, this.height) * 1.5;
            if (neb.x < -limit || neb.x > limit * 2) neb.dx *= -1;
            if (neb.y < -limit || neb.y > limit * 2) neb.dy *= -1;
        });
    }

    draw(ctx, cameraX, cameraY) {
        // Clear screen with core space color
        ctx.fillStyle = '#050409';
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. Draw Procedural Nebula Clouds first
        this.nebulas.forEach(neb => {
            // Apply camera scroll to nebulas with a subtle 0.05 speed coeff for extreme depth
            const x = neb.x - cameraX * 0.05;
            const y = neb.y - cameraY * 0.05;
            
            ctx.beginPath();
            const grad = ctx.createRadialGradient(x, y, 0, x, y, neb.radius);
            grad.addColorStop(0, neb.color);
            grad.addColorStop(0.5, neb.color.replace(/[\d\.]+\)$/, '0.02)'));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.arc(x, y, neb.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Draw Parallax Stars layers
        this.starLayers.forEach(layer => {
            layer.forEach(star => {
                // Apply star parallax offset
                let x = (star.x - cameraX * star.speedCoeff) % this.width;
                let y = (star.y - cameraY * star.speedCoeff) % this.height;
                
                // Wrap screen boundaries
                if (x < 0) x += this.width;
                if (y < 0) y += this.height;
                
                // Draw star glowing circle
                ctx.fillStyle = `rgba(240, 235, 255, ${star.alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, star.size, 0, Math.PI * 2);
                ctx.fill();

                // Brightest stars have a tiny glow aura
                if (star.size > 2.0 && Math.random() > 0.95) {
                    ctx.fillStyle = `rgba(0, 243, 255, ${star.alpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        });
    }
}
