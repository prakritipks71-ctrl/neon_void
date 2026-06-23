/* ==========================================================================
   WEAPONS.JS - AUTO-FIRING WEAPON CLASSES AND PROJECTILES
   ========================================================================== */

import { Particle } from './Particle.js';

// --- BASE PROJECTILE CLASS ---
export class Projectile {
    constructor(x, y, vx, vy, radius, damage, color, pierce = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.damage = damage;
        this.color = color;
        this.pierce = pierce;

        this.life = 120; // Max frames before self-destruct
        this.hitEnemies = new Set(); // Track enemies hit to avoid hitting same enemy multiple times
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
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- BASE WEAPON CLASS ---
export class Weapon {
    constructor(name, maxLevel = 5) {
        this.name = name;
        this.level = 1;
        this.maxLevel = maxLevel;
        this.cooldown = 1000; // ms
        this.currentCooldown = 0; // ms
    }

    update(dt) {
        if (this.currentCooldown > 0) {
            this.currentCooldown -= dt;
        }
    }

    isReady() {
        return this.currentCooldown <= 0;
    }

    resetCooldown(fireRateMultiplier = 1.0) {
        this.currentCooldown = this.cooldown * fireRateMultiplier;
    }

    upgrade() {
        if (this.level < this.maxLevel) {
            this.level++;
            this._applyUpgradeStats();
            return true;
        }
        return false;
    }

    _applyUpgradeStats() {
        // Implemented by subclasses
    }

    getUpgradeDesc() {
        // Implemented by subclasses
        return "";
    }
}

// --- 1. PULSE LASER WEAPON ---
export class PulseLaser extends Weapon {
    constructor() {
        super("Pulse Laser");
        this.cooldown = 800; // ms
        this.damage = 15;
        this.speed = 10;
        this.radius = 3.5;
        this.pierce = 1;
        this.projectileCount = 1;
    }

    _applyUpgradeStats() {
        if (this.level === 2) {
            this.projectileCount = 2;
        } else if (this.level === 3) {
            this.damage = 25;
            this.radius = 5.0;
        } else if (this.level === 4) {
            this.projectileCount = 3;
            this.cooldown = 650;
        } else if (this.level === 5) {
            this.pierce = 3;
            this.damage = 35;
        }
    }

    getUpgradeDesc() {
        if (this.level === 1) return "Fires twin laser bolts simultaneously.";
        if (this.level === 2) return "Increases bolt scale, amplifying damage to 25.";
        if (this.level === 3) return "Launches 3 laser bolts with accelerated fire rates.";
        if (this.level === 4) return "Equips piercing energy cores: pierces up to 3 enemies.";
        return "MAX LEVEL";
    }

    fire(player, enemies, projectList, particles, audio) {
        if (enemies.length === 0) return;

        // Find closest enemies
        const targets = [...enemies].sort((a, b) => {
            const distA = Math.hypot(a.x - player.x, a.y - player.y);
            const distB = Math.hypot(b.x - player.x, b.y - player.y);
            return distA - distB;
        }).slice(0, this.projectileCount);

        targets.forEach((target, i) => {
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize direction
            const vx = (dx / distance) * this.speed;
            const vy = (dy / distance) * this.speed;

            // Slight offset so they don't spawn exactly on top of each other
            const offset = (i - (this.projectileCount - 1) / 2) * 8;
            const perpX = -vy / this.speed * offset;
            const perpY = vx / this.speed * offset;

            projectList.push(new Projectile(
                player.x + perpX,
                player.y + perpY,
                vx,
                vy,
                this.radius,
                this.damage,
                '#00f3ff', // Cyan laser
                this.pierce
            ));
        });

        audio.playLaser();
    }
}

// --- 2. ORBITING ASTEROIDS (SHIELD) ---
export class OrbitalAsteroids extends Weapon {
    constructor() {
        super("Grav Asteroids");
        this.cooldown = 1; // Instant/Passive
        this.damage = 20;
        this.radius = 8;
        this.orbitRadius = 65;
        this.speed = 0.04; // rotation speed per tick
        this.rockCount = 1;
        this.angle = 0;
    }

    _applyUpgradeStats() {
        if (this.level === 2) {
            this.rockCount = 2;
        } else if (this.level === 3) {
            this.damage = 30;
            this.speed = 0.06;
            this.orbitRadius = 75;
        } else if (this.level === 4) {
            this.rockCount = 3;
        } else if (this.level === 5) {
            this.damage = 45;
            this.rockCount = 4;
            this.speed = 0.07;
        }
    }

    getUpgradeDesc() {
        if (this.level === 1) return "Summons a 2nd orbiting gravity rock.";
        if (this.level === 2) return "Expands orbit radius and increases speed & damage.";
        if (this.level === 3) return "Summons a 3rd orbiting gravity rock.";
        if (this.level === 4) return "Equips a 4th orbital rock and boosts damage to 45.";
        return "MAX LEVEL";
    }

    updateAngle() {
        this.angle += this.speed;
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
    }

    getRockPositions(player) {
        const positions = [];
        for (let i = 0; i < this.rockCount; i++) {
            const offsetAngle = this.angle + (i * (Math.PI * 2 / this.rockCount));
            positions.push({
                x: player.x + Math.cos(offsetAngle) * this.orbitRadius,
                y: player.y + Math.sin(offsetAngle) * this.orbitRadius,
                radius: this.radius,
                damage: this.damage
            });
        }
        return positions;
    }

    draw(ctx, player, cameraX, cameraY) {
        const positions = this.getRockPositions(player);

        positions.forEach(rock => {
            const x = rock.x - cameraX;
            const y = rock.y - cameraY;

            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#ff0088'; // Magenta shield glow

            // Outer shield aura line
            ctx.strokeStyle = 'rgba(255, 0, 136, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(player.x - cameraX, player.y - cameraY, this.orbitRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw rock
            ctx.fillStyle = '#ff0088';
            ctx.beginPath();
            ctx.arc(x, y, rock.radius, 0, Math.PI * 2);
            ctx.fill();

            // Core spike
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, rock.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }
}

// --- 3. SYNAPSE SHOCK (CHAIN LIGHTNING) ---
export class SynapseShock extends Weapon {
    constructor() {
        super("Synapse Shock");
        this.cooldown = 1400; // ms
        this.damage = 18;
        this.jumps = 2;
        this.range = 160;
    }

    _applyUpgradeStats() {
        if (this.level === 2) {
            this.jumps = 3;
            this.damage = 24;
        } else if (this.level === 3) {
            this.cooldown = 1100;
            this.range = 180;
        } else if (this.level === 4) {
            this.jumps = 5;
            this.damage = 32;
        } else if (this.level === 5) {
            this.cooldown = 800;
            this.jumps = 7;
            this.damage = 40;
        }
    }

    getUpgradeDesc() {
        if (this.level === 1) return "Shocks a 3rd target and amplifies damage to 24.";
        if (this.level === 2) return "Expands detection range and reduces charge time.";
        if (this.level === 3) return "Chains link up to 5 enemies with damage boosted to 32.";
        if (this.level === 4) return "Hyperfrequency loop: chains 7 targets every 0.8 seconds.";
        return "MAX LEVEL";
    }

    fire(player, enemies, projectList, particles, audio) {
        if (enemies.length === 0) return;

        let currentSource = player;
        const hitEnemies = [];
        let range = this.range;

        for (let j = 0; j < this.jumps; j++) {
            // Find targets in range that haven't been hit yet
            const targets = enemies
                .filter(e => !hitEnemies.includes(e))
                .map(e => {
                    const dist = Math.hypot(e.x - currentSource.x, e.y - currentSource.y);
                    return { enemy: e, dist };
                })
                .filter(item => item.dist <= range)
                .sort((a, b) => a.dist - b.dist);

            if (targets.length === 0) break; // No further targets in range

            const closest = targets[0].enemy;
            hitEnemies.push(closest);

            // Deal damage
            closest.takeDamage(this.damage, particles);

            // Generate visual lightning particle
            const stepCount = 5;
            const segments = [];
            const srcX = currentSource.x;
            const srcY = currentSource.y;
            const dstX = closest.x;
            const dstY = closest.y;

            for (let i = 0; i <= stepCount; i++) {
                const ratio = i / stepCount;
                let px = srcX + (dstX - srcX) * ratio;
                let py = srcY + (dstY - srcY) * ratio;

                // Add jitter in perpendicular direction (except edges)
                if (i > 0 && i < stepCount) {
                    const jitter = 10;
                    px += (Math.random() - 0.5) * jitter;
                    py += (Math.random() - 0.5) * jitter;
                }
                segments.push({ x: px, y: py });
            }

            // Spawn lightning spark particles along the chain segment
            particles.add(new Particle({
                x: currentSource.x,
                y: currentSource.y,
                size: 2,
                color: '#39ff14', // Electric Green
                maxLife: 8,
                decay: 1.0,
                draw: (ctx, cameraX, cameraY) => {
                    ctx.save();
                    ctx.strokeStyle = '#39ff14';
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = '#39ff14';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(segments[0].x - cameraX, segments[0].y - cameraY);
                    for (let s = 1; s < segments.length; s++) {
                        ctx.lineTo(segments[s].x - cameraX, segments[s].y - cameraY);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            }));

            // Next link jumps from this enemy
            currentSource = closest;
            range = this.range * 0.8; // Decay range for jumps slightly
        }

        audio.playHit();
    }
}

// --- 4. GRAVITY WELL (BLACK HOLE GENERATOR) ---
export class GravityWell extends Weapon {
    constructor() {
        super("Gravity Well");
        this.cooldown = 5000; // ms
        this.damage = 4; // damage per tick
        this.duration = 2500; // ms
        this.maxRadius = 70;
    }

    _applyUpgradeStats() {
        if (this.level === 2) {
            this.duration = 3500;
            this.damage = 6;
        } else if (this.level === 3) {
            this.maxRadius = 100;
        } else if (this.level === 4) {
            this.damage = 10;
            this.duration = 4500;
        } else if (this.level === 5) {
            this.maxRadius = 140;
            this.cooldown = 4000;
            this.damage = 14;
        }
    }

    getUpgradeDesc() {
        if (this.level === 1) return "Prolongs black hole lifetime and boosts tick damage.";
        if (this.level === 2) return "Expands the gravity event horizon to 100px.";
        if (this.level === 3) return "Increases suction strength and raises damage to 10.";
        if (this.level === 4) return "Equips singularity core: 140px radius and reduced cooldown.";
        return "MAX LEVEL";
    }

    fire(player, enemies, projectList, particles, audio) {
        // Find a random enemy in sight, or spawn on player if none
        let targetX = player.x;
        let targetY = player.y;

        if (enemies.length > 0) {
            const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
            targetX = randomEnemy.x;
            targetY = randomEnemy.y;
        }

        // Spawn active singularity particle
        particles.add(new SingularityEntity(targetX, targetY, this.maxRadius, this.duration, this.damage, '#ffee00'));
        audio.playShieldBreak(); // Hum/ringing sound
    }
}

// Custom internal entity for drawing/updating the Black Hole inside the particle loop
class SingularityEntity extends Particle {
    constructor(x, y, maxRadius, durationMs, tickDamage, color) {
        super({
            x: x,
            y: y,
            size: 1, // Will expand to maxRadius
            color: color,
            maxLife: Math.floor(durationMs / 16), // Convert ms to frames
            grow: maxRadius / 30, // Expand quickly in first 30 frames
            drag: 1.0
        });

        this.maxRadius = maxRadius;
        this.tickDamage = tickDamage;
        this.damageInterval = 10; // Deal damage every 10 frames
    }

    updateEntity(enemies, particles) {
        // Slow down expansion once maxRadius is approached
        if (this.size >= this.maxRadius) {
            this.grow = 0;
            this.size = this.maxRadius;
        }

        // Pull enemies
        enemies.forEach(e => {
            const dx = this.x - e.x;
            const dy = this.y - e.y;
            const dist = Math.hypot(dx, dy);

            if (dist < this.size) {
                // Apply suction vector
                const force = (1 - dist / this.size) * 0.5;
                e.x += (dx / dist) * force;
                e.y += (dy / dist) * force;

                // Damage trigger
                if (this.life % this.damageInterval === 0) {
                    e.takeDamage(this.tickDamage, particles);
                }
            }
        });

        this.update();
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;
        const lifeRatio = this.life / this.maxLife;
        const alpha = Math.min(1.0, lifeRatio * 2.0); // Fade out at end

        ctx.save();

        // Singularity void core (pure black)
        ctx.fillStyle = '#020105';
        ctx.shadowBlur = this.size * 0.4;
        ctx.shadowColor = '#0044ff'; // Outer gravity blue ring
        ctx.beginPath();
        ctx.arc(x, y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Cosmic suction ring (semi-transparent yellow/blue vortex)
        ctx.strokeStyle = `rgba(0, 243, 255, ${alpha * 0.35})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.stroke();

        // Extra dynamic inner spiral dots
        for (let i = 0; i < 4; i++) {
            const rot = (this.life * 0.05) + (i * Math.PI / 2);
            const radius = this.size * (0.3 + 0.5 * Math.sin(this.life * 0.02));
            ctx.fillStyle = `rgba(255, 0, 136, ${alpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(x + Math.cos(rot) * radius, y + Math.sin(rot) * radius, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
