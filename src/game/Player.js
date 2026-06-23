/* ==========================================================================
   PLAYER.JS - SPACESHIP STATS, MOVEMENT, DASH, AND LEVELING
   ========================================================================== */

import { PulseLaser, OrbitalAsteroids, SynapseShock, GravityWell } from './Weapons.js';

export class Player {
    constructor(x, y, modules) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 16;
        
        // Modules configuration passed from main shop
        this.hull = modules.hull;
        this.shieldModule = modules.shield;
        this.engine = modules.engine;
        this.weaponCore = modules.weaponCore;
        
        // Base stats overridden by equipped parts
        this.maxHp = this.hull.hp;
        this.hp = this.maxHp;
        
        this.maxShield = this.shieldModule.capacity;
        this.shield = this.maxShield;
        this.shieldRechargeDelay = this.shieldModule.recharge; // ms
        this.currentShieldDelay = 0; // ms tracking time since last damage
        this.shieldRechargeSpeed = 0.05; // points recharged per tick
        
        this.speed = this.engine.speed;
        this.acceleration = 0.35;
        this.drag = 0.90; // Drift inertia
        
        // Dash settings
        this.dashCooldown = this.engine.dashCooldown; // ms
        this.dashDuration = this.engine.dashDuration; // ms
        this.currentDashCooldown = 0; // ms
        this.dashTimer = 0; // ms active dash length
        this.dashVx = 0;
        this.dashVy = 0;
        this.isDashing = false;
        
        // In-run Leveling metrics
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 100;
        
        // Weapons inventory
        this.weapons = [];
        this.fireRateMultiplier = this.weaponCore.fireRateMult; // speed modifier
        
        this.initWeapons();
    }

    initWeapons() {
        // Equip starting weapon from Core Weapon
        if (this.weaponCore.id === 'weapon_pulse') {
            this.weapons.push(new PulseLaser());
        } else if (this.weaponCore.id === 'weapon_orbit') {
            this.weapons.push(new OrbitalAsteroids());
        } else if (this.weaponCore.id === 'weapon_lightning') {
            this.weapons.push(new SynapseShock());
        } else {
            this.weapons.push(new PulseLaser()); // Fallback
        }
    }

    addWeaponOrUpgrade(name) {
        // Search if player already has this weapon
        const existing = this.weapons.find(w => w.name === name);
        if (existing) {
            existing.upgrade();
        } else {
            // Add new weapon instance
            if (name === "Pulse Laser") this.weapons.push(new PulseLaser());
            else if (name === "Grav Asteroids") this.weapons.push(new OrbitalAsteroids());
            else if (name === "Synapse Shock") this.weapons.push(new SynapseShock());
            else if (name === "Gravity Well") this.weapons.push(new GravityWell());
        }
    }

    getAvailableUpgradesList() {
        // Generate list of possible upgrades during level-up
        const pool = [
            { name: "Pulse Laser", type: "weapon", desc: "Auto-fires focused laser pulses." },
            { name: "Grav Asteroids", type: "weapon", desc: "Orbits protective gravity barriers." },
            { name: "Synapse Shock", type: "weapon", desc: "Fires chain lightning jump arpeggios." },
            { name: "Gravity Well", type: "weapon", desc: "Summons collapsing black hole vortices." },
            
            // Passive Stat Cards
            { name: "Auxiliary Armor", type: "stat", desc: "Installs plates: increases Hull Integrity (HP) by 25." },
            { name: "Shield Capacitor", type: "stat", desc: "Charges deflector: increases Shield Capacity by 20." },
            { name: "Engine Fuel Syringe", type: "stat", desc: "Overclocks thrusters: increases movement speed by 15%." },
            { name: "Subspace Magnet", type: "stat", desc: "Expands credit & XP attraction vacuum range by 40%." }
        ];

        // Filter out weapons that are already at max level
        return pool.filter(item => {
            const hasWeapon = this.weapons.find(w => w.name === item.name);
            if (hasWeapon && hasWeapon.level >= hasWeapon.maxLevel) {
                return false;
            }
            return true;
        });
    }

    gainXP(amount) {
        this.xp += amount;
        let leveledUp = false;
        
        if (this.xp >= this.xpNeeded) {
            this.xp -= this.xpNeeded;
            this.level++;
            // Exponential XP scale
            this.xpNeeded = Math.floor(100 * Math.pow(this.level, 1.25));
            leveledUp = true;
        }
        
        return leveledUp;
    }

    takeDamage(amount, particles, audio) {
        if (this.isDashing) return false; // Invincible frames
        
        this.currentShieldDelay = this.shieldRechargeDelay;
        
        let shieldBroken = false;
        
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield <= 0) {
                shieldBroken = true;
                this.shield = 0;
                audio.playShieldBreak();
                
                // Explode particles around shield break
                particles.spawnExplosion(this.x, this.y, '#00f3ff', 8);
            } else {
                audio.playHit();
            }
        } else {
            this.hp -= amount;
            audio.playHit();
            
            // Red hit sparks
            particles.spawnSparks(this.x, this.y, Math.random() * Math.PI * 2, '#ff2a2a');
        }

        if (this.hp < 0) this.hp = 0;
        
        return shieldBroken; // Return true if shield broke on this hit
    }

    triggerDash(inputVec, particles) {
        if (this.currentDashCooldown > 0 || this.isDashing) return;
        
        // Base dash on current input direction, fallback to facing forward/up if stationary
        let dx = inputVec.x;
        let dy = inputVec.y;
        
        if (dx === 0 && dy === 0) {
            dy = -1; // Dash upward
        }
        
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.currentDashCooldown = this.dashCooldown;
        
        const dashSpeed = 16.0;
        this.dashVx = dx * dashSpeed;
        this.dashVy = dy * dashSpeed;
        this.vx = this.dashVx;
        this.vy = this.dashVy;

        // Spawn bright cyan dash shockwave
        particles.add({
            x: this.x,
            y: this.y,
            size: 6,
            color: '#00f3ff',
            maxLife: 20,
            decay: 1.0,
            grow: 3.5,
            shape: 'ring',
            update: function() { this.size += this.grow; this.life -= this.decay; },
            draw: function(ctx, cx, cy) {
                ctx.save();
                ctx.strokeStyle = this.color;
                ctx.shadowBlur = 20;
                ctx.shadowColor = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x - cx, this.y - cy, this.size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    update(inputManager, particles, audio, dt, magnetRange) {
        // Cooldown updates
        if (this.currentDashCooldown > 0) {
            this.currentDashCooldown -= dt;
        }

        // Shield recharge timer
        if (this.currentShieldDelay > 0) {
            this.currentShieldDelay -= dt;
        } else if (this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRechargeSpeed);
        }

        // Active Dash tracking
        if (this.isDashing) {
            this.dashTimer -= dt;
            this.vx = this.dashVx;
            this.vy = this.dashVy;

            // Spawn trail ghosts
            if (Math.random() > 0.4) {
                particles.spawnDashGhost(this.x, this.y, (ctx) => {
                    this.drawShipBody(ctx, true);
                }, '#00f3ff');
            }

            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        } else {
            // Snappy direct movement (no sliding/drift inertia)
            const inputVec = inputManager.getMovementVector();
            
            this.vx = inputVec.x * this.speed;
            this.vy = inputVec.y * this.speed;

            // Check if dash triggered
            if (inputManager.checkDashTrigger()) {
                this.triggerDash(inputVec, particles);
            }
        }

        // Apply velocities
        this.x += this.vx;
        this.y += this.vy;

        // Thrust particle emissions
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 1 && Math.random() > 0.4) {
            const angle = Math.atan2(this.vy, this.vx);
            const engineColor = this.engine.color || '#0044ff';
            particles.spawnThrust(
                this.x - Math.cos(angle) * this.radius,
                this.y - Math.sin(angle) * this.radius,
                angle,
                engineColor
            );
        }
        
        // Passive orbital weapon rotation updates
        this.weapons.forEach(w => {
            if (w instanceof OrbitalAsteroids) {
                w.updateAngle();
            }
        });
    }

    drawShipBody(ctx, isGhost = false) {
        // Facing angle based on velocity vector
        let angle = Math.atan2(this.vy, this.vx);
        if (Math.hypot(this.vx, this.vy) < 0.2) {
            angle = -Math.PI / 2; // Face upward when stationary
        }

        ctx.save();
        ctx.rotate(angle);

        // Equipped Hull Color
        const hullColor = this.hull.color || '#888888';
        
        ctx.strokeStyle = isGhost ? '#00f3ff' : hullColor;
        ctx.fillStyle = isGhost ? 'rgba(0, 243, 255, 0.05)' : 'rgba(25, 20, 35, 0.9)';
        ctx.lineWidth = 2.5;

        // Draw Triangular Fighter fuselage
        ctx.beginPath();
        ctx.moveTo(this.radius, 0); // nose cone
        ctx.lineTo(-this.radius, -this.radius * 0.75); // left wing tip
        ctx.lineTo(-this.radius * 0.4, 0); // engine bay indent
        ctx.lineTo(-this.radius, this.radius * 0.75); // right wing tip
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cockpit glass overlay
        ctx.fillStyle = isGhost ? '#00f3ff' : '#00f3ff';
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.4, 0);
        ctx.lineTo(-this.radius * 0.1, -this.radius * 0.3);
        ctx.lineTo(-this.radius * 0.2, 0);
        ctx.lineTo(-this.radius * 0.1, this.radius * 0.3);
        ctx.closePath();
        ctx.fill();

        // Left/Right booster engine nozzles
        ctx.fillStyle = isGhost ? '#00f3ff' : '#555555';
        ctx.fillRect(-this.radius * 0.8, -this.radius * 0.4, this.radius * 0.4, this.radius * 0.25);
        ctx.fillRect(-this.radius * 0.8, this.radius * 0.15, this.radius * 0.4, this.radius * 0.25);

        ctx.restore();
    }

    draw(ctx, cameraX, cameraY) {
        const x = this.x - cameraX;
        const y = this.y - cameraY;

        ctx.save();
        ctx.translate(x, y);

        // Glow aura when ship is normal or high speeds
        if (!this.isDashing) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.hull.color || '#00f3ff';
        }

        // Draw ship vector lines
        this.drawShipBody(ctx);
        ctx.restore();

        // Draw Shield bubble overlay
        if (this.shield > 0) {
            ctx.save();
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#00f3ff';
            
            // Pulsate bubble size slightly
            const shieldPulse = 1 + Math.sin(Date.now() * 0.01) * 0.04;
            const shieldRadius = this.radius * 1.5 * shieldPulse;
            
            // Draw shield alpha based on remaining capacity percentage
            const percent = this.shield / this.maxShield;
            ctx.strokeStyle = `rgba(0, 243, 255, ${percent * 0.45})`;
            ctx.fillStyle = `rgba(0, 68, 255, ${percent * 0.04})`;
            ctx.lineWidth = 1.8;
            
            ctx.beginPath();
            ctx.arc(x, y, shieldRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}
