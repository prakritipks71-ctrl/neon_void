/* ==========================================================================
   XP.JS - XP GEMS AND CREDIT CORES WITH MAGNET PHYSICS
   ========================================================================== */

export class ItemDrop {
    constructor(x, y, type = 'xp', value = 1) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.type = type; // 'xp' or 'credit'
        this.value = value;
        this.radius = type === 'xp' ? 4 : 5;
        
        // Visual effects
        this.pulseTime = Math.random() * Math.PI * 2;
        this.color = type === 'xp' ? '#39ff14' : '#ffee00'; // Neon Green vs Neon Yellow
        this.collected = false;
        this.magnetized = false;
        
        // Drifting effect
        this.driftX = (Math.random() - 0.5) * 0.15;
        this.driftY = (Math.random() - 0.5) * 0.15;
    }

    update(player, magnetRange) {
        this.pulseTime += 0.05;
        
        if (this.collected) return;
        
        // Distance check to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If player is inside the collection bounds
        if (distance < player.radius + this.radius) {
            this.collected = true;
            return;
        }

        // Magnetized tracking
        if (this.magnetized || distance < magnetRange) {
            this.magnetized = true;
            
            // Accelerate towards player
            const force = 0.45;
            this.vx += (dx / distance) * force;
            this.vy += (dy / distance) * force;
            
            // Limit speed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const maxSpeed = 12;
            if (speed > maxSpeed) {
                this.vx = (this.vx / speed) * maxSpeed;
                this.vy = (this.vy / speed) * maxSpeed;
            }
        } else {
            // Idle passive drift
            this.vx = this.driftX;
            this.vy = this.driftY;
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        
        // Pulse size
        const sizeOffset = Math.sin(this.pulseTime) * 1.0;
        const currentRadius = this.radius + sizeOffset * 0.5;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        if (this.type === 'xp') {
            // Draw a diamond shape for XP
            ctx.beginPath();
            ctx.moveTo(x, y - currentRadius);
            ctx.lineTo(x + currentRadius, y);
            ctx.lineTo(x, y + currentRadius);
            ctx.lineTo(x - currentRadius, y);
            ctx.closePath();
            ctx.fill();
        } else {
            // Draw a star shape for Credit Core
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(
                    x + Math.cos(((18 + i * 72) * Math.PI) / 180) * currentRadius,
                    y - Math.sin(((18 + i * 72) * Math.PI) / 180) * currentRadius
                );
                ctx.lineTo(
                    x + Math.cos(((54 + i * 72) * Math.PI) / 180) * (currentRadius * 0.4),
                    y - Math.sin(((54 + i * 72) * Math.PI) / 180) * (currentRadius * 0.4)
                );
            }
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
}
