/* ==========================================================================
   ENEMY.JS - GEOMETRIC ENEMY CLASSES AND BEHAVIORS
   ========================================================================== */

import { Particle } from './Particle.js';
import { ItemDrop } from './XP.js';

// --- BASE ENEMY CLASS ---
export class Enemy {
    constructor(x, y, level = 1) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        
        // Stats scaling with level (game time)
        this.level = level;
        this.radius = 12;
        this.maxHp = 10 + (level - 1) * 6;
        this.hp = this.maxHp;
        this.speed = 1.2 + Math.min(1.0, (level - 1) * 0.1);
        this.damage = 10 + (level - 1) * 3;
        
        this.color = '#00f3ff'; // Neon Cyan default
        this.scoreValue = 10;
        this.creditChance = 0.15; // 15% chance to drop credits
        
        this.flashTime = 0; // Flash white when hit
    }

    update(player, dt) {
        // Core AI: Chase player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            // Accelerate towards player
            const accel = 0.15;
            this.vx += (dx / dist) * accel;
            this.vy += (dy / dist) * accel;
            
            // Apply drag/friction
            this.vx *= 0.94;
            this.vy *= 0.94;
            
            // Speed cap
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > this.speed) {
                this.vx = (this.vx / speed) * this.speed;
                this.vy = (this.vy / speed) * this.speed;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.flashTime > 0) this.flashTime--;
    }

    takeDamage(amount, particles) {
        this.hp -= amount;
        this.flashTime = 5; // Flash white for 5 frames
        
        // Spawn hit sparks spraying backwards
        const angle = Math.atan2(this.vy, this.vx) + Math.PI;
        particles.spawnSparks(this.x, this.y, angle, this.color);
        
        return this.hp <= 0;
    }

    draw(ctx, cameraX, cameraY) {
        // Implemented by subclasses
    }

    dropLoot(drops) {
        // Always drop XP
        const xpVal = 1 + Math.floor(this.level * 0.35);
        drops.push(new ItemDrop(this.x, this.y, 'xp', xpVal));
        
        // Chance to drop Credits
        if (Math.random() < this.creditChance) {
            const crVal = 1 + Math.floor(this.level * 0.5);
            drops.push(new ItemDrop(this.x, this.y, 'credit', crVal));
        }
    }
}

// --- 1. SWARMER (FAST GEOMETRIC TRIANGLE) ---
export class Swarmer extends Enemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.radius = 9;
        this.maxHp = 6 + (level - 1) * 4;
        this.hp = this.maxHp;
        this.speed = 1.9 + Math.min(1.2, (level - 1) * 0.15);
        this.damage = 6 + (level - 1) * 2;
        this.color = '#39ff14'; // Neon Green
        this.creditChance = 0.08;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        const angle = Math.atan2(this.vy, this.vx);
        
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.flashTime > 0 ? '#ffffff' : this.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(57, 255, 20, 0.04)';
        
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Triangle pointing forward
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, -this.radius * 0.7);
        ctx.lineTo(-this.radius, this.radius * 0.7);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// --- 2. DIAMOND SHOOTER (RANGE OCTAGON) ---
export class DiamondShooter extends Enemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.radius = 14;
        this.maxHp = 18 + (level - 1) * 8;
        this.hp = this.maxHp;
        this.speed = 0.8 + Math.min(0.6, (level - 1) * 0.05);
        this.damage = 12;
        this.color = '#00f3ff'; // Neon Cyan
        this.creditChance = 0.25; // Good source of credits
        
        this.shootCooldown = 1500 + Math.random() * 1000;
        this.currentCooldown = this.shootCooldown;
    }

    update(player, dt, enemyProjectiles) {
        // Custom movement: stay at a distance from player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        let targetVx = 0;
        let targetVy = 0;
        
        if (dist > 180) {
            // Walk closer
            targetVx = (dx / dist) * this.speed;
            targetVy = (dy / dist) * this.speed;
        } else if (dist < 120) {
            // Retreat back
            targetVx = -(dx / dist) * this.speed;
            targetVy = -(dy / dist) * this.speed;
        }
        
        this.vx += (targetVx - this.vx) * 0.05;
        this.vy += (targetVy - this.vy) * 0.05;
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.flashTime > 0) this.flashTime--;
        
        // Shooting trigger
        this.currentCooldown -= dt;
        if (this.currentCooldown <= 0) {
            this.currentCooldown = this.shootCooldown;
            this.shoot(player, enemyProjectiles);
        }
    }

    shoot(player, enemyProjectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;
        
        const projSpeed = 4.5;
        const vx = (dx / dist) * projSpeed;
        const vy = (dy / dist) * projSpeed;
        
        enemyProjectiles.push(new EnemyProjectile(
            this.x,
            this.y,
            vx,
            vy,
            5, // radius
            this.damage * 0.8,
            this.color
        ));
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        const rotation = (Date.now() * 0.001) % (Math.PI * 2);
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.flashTime > 0 ? '#ffffff' : this.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 243, 255, 0.04)';
        
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Draw octagon
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw inner diamond core
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 0.5);
        ctx.lineTo(this.radius * 0.5, 0);
        ctx.lineTo(0, this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.5, 0);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
}

// --- 3. NOVA CHARGER (SPIKED RUSH STAR) ---
export class NovaCharger extends Enemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.radius = 16;
        this.maxHp = 35 + (level - 1) * 15;
        this.hp = this.maxHp;
        this.speed = 0.5; // Slow normal walk
        this.chargeSpeed = 7.0 + Math.min(3.0, (level - 1) * 0.2);
        this.damage = 25 + (level - 1) * 5;
        this.color = '#ff5e00'; // Neon Orange
        this.creditChance = 0.35;
        
        // Charge behavior states: 0 = tracking player, 1 = locking in & preparing (flash warning), 2 = rushing
        this.chargeState = 0; 
        this.stateTimer = 1000 + Math.random() * 1000;
        this.chargeTargetX = 0;
        this.chargeTargetY = 0;
    }

    update(player, dt) {
        this.stateTimer -= dt;
        
        if (this.chargeState === 0) {
            // Track player slowly
            super.update(player, dt);
            
            if (this.stateTimer <= 0) {
                this.chargeState = 1;
                this.stateTimer = 600; // 0.6s charging up/pulsing warning
                this.vx = 0;
                this.vy = 0;
            }
        } else if (this.chargeState === 1) {
            // Glow and pulse faster warning
            if (this.flashTime === 0 && Math.random() > 0.6) this.flashTime = 2;
            
            if (this.stateTimer <= 0) {
                this.chargeState = 2;
                this.stateTimer = 900; // Dash duration 0.9s
                
                // Lock direction
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.hypot(dx, dy) || 1;
                this.vx = (dx / dist) * this.chargeSpeed;
                this.vy = (dy / dist) * this.chargeSpeed;
            }
        } else if (this.chargeState === 2) {
            // Rush forward without tracking
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.stateTimer <= 0) {
                this.chargeState = 0;
                this.stateTimer = 2000 + Math.random() * 1500; // Cool down before next charge
                this.vx = 0;
                this.vy = 0;
            }
        }
        
        if (this.flashTime > 0) this.flashTime--;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        
        // Pulsate radius during charging state
        let currentRadius = this.radius;
        if (this.chargeState === 1) {
            currentRadius = this.radius * (1.1 + Math.sin(Date.now() * 0.035) * 0.15);
        }
        
        const rotation = (Date.now() * (this.chargeState === 2 ? 0.012 : 0.002)) % (Math.PI * 2);
        
        ctx.save();
        ctx.shadowBlur = this.chargeState === 1 ? 20 : 10;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.flashTime > 0 ? '#ffffff' : this.color;
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(255, 94, 0, 0.05)';
        
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Draw 6-pointed spiked star
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6;
            const r = i % 2 === 0 ? currentRadius : currentRadius * 0.4;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}

// --- 4. COSMIC BOSS (MASSIVE NEON RED POLYGON) ---
export class CosmicBoss extends Enemy {
    constructor(x, y, level) {
        super(x, y, level);
        this.radius = 32;
        this.maxHp = 150 + (level - 1) * 60;
        this.hp = this.maxHp;
        this.speed = 0.75;
        this.damage = 40;
        this.color = '#ff2a2a'; // Neon Red
        this.creditChance = 1.0; // Drops massive credits (guaranteed drops)
        this.isBoss = true;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        const rotation = (Date.now() * 0.0006) % (Math.PI * 2);
        
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.flashTime > 0 ? '#ffffff' : this.color;
        ctx.lineWidth = 4;
        ctx.fillStyle = 'rgba(255, 42, 42, 0.06)';
        
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Draw a double-line spiked fortress outline
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8;
            const r = i % 2 === 0 ? this.radius : this.radius * 0.8;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Inner core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    dropLoot(drops) {
        // Drops 4 separate big Credit stars and a bundle of XP
        for (let i = 0; i < 4; i++) {
            const offset = 15;
            const ox = (Math.random() - 0.5) * offset;
            const oy = (Math.random() - 0.5) * offset;
            drops.push(new ItemDrop(this.x + ox, this.y + oy, 'credit', 25));
        }
        for (let i = 0; i < 5; i++) {
            drops.push(new ItemDrop(this.x, this.y, 'xp', 20));
        }
    }
}

// --- PROJECTILE FIRED BY ENEMIES ---
export class EnemyProjectile {
    constructor(x, y, vx, vy, radius, damage, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.damage = damage;
        this.color = color;
        this.life = 150; // frames
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
