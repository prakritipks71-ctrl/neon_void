/* ==========================================================================
   GAMEENGINE.JS - CORE GAME LOOP, ENTITY SYSTEM, AND PHYSICS
   ========================================================================== */

import { InputManager } from './Input.js';
import { audio } from './Audio.js';
import { NebulaBackground } from './Nebula.js';
import { ParticleSystem } from './Particle.js';
import { Player } from './Player.js';
import { Swarmer, DiamondShooter, NovaCharger, CosmicBoss } from './Enemy.js';
import { OrbitalAsteroids } from './Weapons.js';

export class GameEngine {
    constructor(canvasId, modules, callbacks) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.callbacks = callbacks; // { onLevelUp, onGameOver, onCreditsUpdate }
        this.modules = modules; // Equipped ship parts
        
        // Setup systems
        this.input = new InputManager();
        this.particles = new ParticleSystem();
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.nebula = new NebulaBackground(this.width, this.height);
        
        // Game states
        this.state = 'playing'; // 'playing', 'paused', 'levelup', 'gameover'
        this.timeElapsed = 0; // ms
        this.creditsGained = 0;
        this.enemiesKilled = 0;
        
        // Entity lists
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.drops = [];
        
        // Camera properties
        this.camera = { x: 0, y: 0 };
        
        // Screen shake settings
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        
        // Spawn rates
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 1600; // ms between spawns (scales down)
        
        // Stats modifiers
        this.magnetRange = 75; // base magnet distance
        
        this.lastTime = 0;
        
        this._resizeHandler = this._resizeHandler.bind(this);
        this._gameTick = this._gameTick.bind(this);
        
        this.init();
    }

    init() {
        window.addEventListener('resize', this._resizeHandler);
        
        // Instantiate Player centered in world coordinates
        this.player = new Player(0, 0, this.modules);
        
        // Apply passive permanent stat cards upgrades based on current player stats:
        // (Base player stats are already initialized in Player constructor, 
        //  but we can customize magnet or fire rate if modified)
        
        // Reset timing
        this.lastTime = performance.now();
        
        // Start procedural ambient soundtrack arpeggiator
        audio.startMusic();
        
        // Request first frame
        requestAnimationFrame(this._gameTick);
    }

    destroy() {
        window.removeEventListener('resize', this._resizeHandler);
        this.input.destroy();
        audio.stopMusic();
    }

    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
            audio.applyLowPassFilter(true);
        }
    }

    resumeGame() {
        if (this.state === 'paused') {
            this.state = 'playing';
            audio.applyLowPassFilter(false);
            this.lastTime = performance.now();
            requestAnimationFrame(this._gameTick);
        }
    }

    selectUpgrade(upgradeCard) {
        // Apply chosen level up upgrade
        if (upgradeCard.type === 'weapon') {
            this.player.addWeaponOrUpgrade(upgradeCard.name);
        } else if (upgradeCard.type === 'stat') {
            // Apply passive stats
            if (upgradeCard.name === "Auxiliary Armor") {
                this.player.maxHp += 25;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
            } else if (upgradeCard.name === "Shield Capacitor") {
                this.player.maxShield += 20;
                this.player.shield = Math.min(this.player.maxShield, this.player.shield + 20);
            } else if (upgradeCard.name === "Engine Fuel Syringe") {
                this.player.speed *= 1.15;
            } else if (upgradeCard.name === "Subspace Magnet") {
                this.magnetRange *= 1.40;
            }
        }
        
        audio.playPowerUp();
        
        // Resume play
        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame(this._gameTick);
    }

    triggerScreenShake(intensity, duration) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    _resizeHandler() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.nebula.resize(this.width, this.height);
    }

    _gameTick(now) {
        if (this.state !== 'playing' && this.state !== 'levelup') return;

        const dt = now - this.lastTime;
        this.lastTime = now;

        if (this.state === 'playing') {
            this.update(dt);
        }
        
        this.draw();

        requestAnimationFrame(this._gameTick);
    }

    update(dt) {
        // Cap dt to prevent huge leaps in lag spikes
        const cappedDt = Math.min(100, dt);
        
        this.timeElapsed += cappedDt;
        
        // Spawn scaling over time: spawn rates speed up as time increases
        this.enemySpawnRate = Math.max(450, 1600 - Math.floor(this.timeElapsed / 1000) * 12);
        
        this.enemySpawnTimer += cappedDt;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            this.enemySpawnTimer = 0;
            this.spawnEnemyWave();
        }

        // Update player
        this.player.update(this.input, this.particles, audio, cappedDt, this.magnetRange);

        // Update active weapons cooldowns and firing
        this.player.weapons.forEach(w => {
            w.update(cappedDt);
            if (w.isReady() && w.cooldown > 1) { // Cooldown > 1 means it's auto-fired, not passive
                w.fire(this.player, this.enemies, this.projectiles, this.particles, audio);
                w.resetCooldown(this.player.fireRateMultiplier);
            }
        });

        // Update background
        this.nebula.update(this.camera.x, this.camera.y);

        // Update particles
        this.particles.update();

        // Update player projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update();
            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update enemy projectiles
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const ep = this.enemyProjectiles[i];
            ep.update();
            if (ep.life <= 0) {
                this.enemyProjectiles.splice(i, 1);
                continue;
            }

            // Collision with Player
            const dx = ep.x - this.player.x;
            const dy = ep.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ep.radius + this.player.radius) {
                // Damage Player
                const shieldBroke = this.player.takeDamage(ep.damage, this.particles, audio);
                this.triggerScreenShake(8, 12);
                
                if (shieldBroke) this.triggerOrbitalDischarge();
                
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // Update special particle entities (e.g. Gravity Well Singularity entities)
        this.particles.particles.forEach(p => {
            if (p.updateEntity) {
                p.updateEntity(this.enemies, this.particles);
            }
        });

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            
            // Despawn far-away enemies to prevent infinite buildup and performance degradation
            const maxDistance = Math.max(this.width, this.height) * 1.5;
            if (dist > maxDistance && !enemy.isBoss) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            // Diamond shooters have special shooting updates
            if (enemy instanceof DiamondShooter) {
                enemy.update(this.player, cappedDt, this.enemyProjectiles);
            } else {
                enemy.update(this.player, cappedDt);
            }

            // Check collision with Player
            if (dist < enemy.radius + this.player.radius) {
                const shieldBroke = this.player.takeDamage(enemy.damage, this.particles, audio);
                this.triggerScreenShake(10, 15);
                
                if (shieldBroke) this.triggerOrbitalDischarge();

                // Knockback enemy slightly
                const knockbackForce = 4.0;
                enemy.x -= (dx / dist) * knockbackForce;
                enemy.y -= (dy / dist) * knockbackForce;
            }

            // Check collision with Orbital Asteroids
            const orbitWeapon = this.player.weapons.find(w => w instanceof OrbitalAsteroids);
            if (orbitWeapon) {
                const rockPositions = orbitWeapon.getRockPositions(this.player);
                rockPositions.forEach(rock => {
                    const rDx = enemy.x - rock.x;
                    const rDy = enemy.y - rock.y;
                    const rDist = Math.hypot(rDx, rDy);
                    
                    if (rDist < enemy.radius + rock.radius) {
                        const isDead = enemy.takeDamage(rock.damage, this.particles);
                        
                        // Spark impact
                        this.particles.spawnSparks(enemy.x, enemy.y, Math.atan2(rDy, rDx), '#ff0088');
                        
                        if (isDead) {
                            this.killEnemy(enemy, i);
                        } else {
                            // Bounce enemy back
                            enemy.vx += (rDx / rDist) * 5.0;
                            enemy.vy += (rDy / rDist) * 5.0;
                        }
                    }
                });
            }
        }

        // Projectiles vs Enemies collision
        for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = this.projectiles[pIdx];
            
            for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = this.enemies[eIdx];
                
                // Avoid double hitting
                if (proj.hitEnemies.has(enemy)) continue;

                const dx = enemy.x - proj.x;
                const dy = enemy.y - proj.y;
                const dist = Math.hypot(dx, dy);

                if (dist < enemy.radius + proj.radius) {
                    proj.hitEnemies.add(enemy);
                    
                    // Apply damage
                    const isDead = enemy.takeDamage(proj.damage, this.particles);
                    
                    if (isDead) {
                        this.killEnemy(enemy, eIdx);
                    }
                    
                    proj.pierce--;
                    if (proj.pierce <= 0) {
                        this.projectiles.splice(pIdx, 1);
                        break; // Stop checking this projectile
                    }
                }
            }
        }

        // Update and attract drops (XP and Credits)
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            
            // Despawn far-away drops to prevent memory/CPU leak
            const dDx = d.x - this.player.x;
            const dDy = d.y - this.player.y;
            const dDist = Math.hypot(dDx, dDy);
            const maxDropDistance = Math.max(this.width, this.height) * 1.6;
            
            if (dDist > maxDropDistance) {
                this.drops.splice(i, 1);
                continue;
            }
            
            d.update(this.player, this.magnetRange);
            
            if (d.collected) {
                if (d.type === 'xp') {
                    const levelUp = this.player.gainXP(d.value);
                    if (levelUp) {
                        this.triggerLevelUp();
                    }
                } else if (d.type === 'credit') {
                    this.creditsGained += d.value;
                    this.callbacks.onCreditsUpdate(this.creditsGained);
                }
                
                audio.playHit(); // ting sound
                this.drops.splice(i, 1);
            }
        }

        // Check death state
        if (this.player.hp <= 0) {
            this.gameOver("HULL INTEGRITY FAILING");
        }

        // Camera smoothly tracks player coordinates
        this.camera.x += (this.player.x - this.camera.x - this.width / 2) * 0.1;
        this.camera.y += (this.player.y - this.camera.y - this.height / 2) * 0.1;

        // Apply screen shake offset values
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
            this.camera.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.y += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.92; // decay shake strength
        }

        // HUD callbacks
        this.callbacks.onHudUpdate({
            level: this.player.level,
            xpPercent: (this.player.xp / this.player.xpNeeded) * 100,
            xpText: `${this.player.xp} / ${this.player.xpNeeded} XP`,
            hpPercent: (this.player.hp / this.player.maxHp) * 100,
            hpText: `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`,
            shieldPercent: (this.player.shield / this.player.maxShield) * 100,
            shieldText: `${Math.ceil(this.player.shield)} / ${this.player.maxShield}`,
            timerText: this.getFormattedTime(),
            dashPercent: Math.max(0, 100 - (this.player.currentDashCooldown / this.player.dashCooldown) * 100),
            dashText: this.player.currentDashCooldown > 0 ? `${(this.player.currentDashCooldown / 1000).toFixed(1)}s` : "READY",
            weaponsList: this.player.weapons.map(w => ({ name: w.name, level: w.level }))
        });
    }

    killEnemy(enemy, index) {
        this.enemiesKilled++;
        
        // Trigger neon explosion particle cloud
        this.particles.spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 50 : 12);
        
        // Trigger procedural boom SFX
        audio.playExplosion();
        
        // Spawn loot
        enemy.dropLoot(this.drops);
        
        this.enemies.splice(index, 1);
    }

    triggerLevelUp() {
        this.state = 'levelup';
        audio.playLevelUp();
        audio.applyLowPassFilter(true);
        
        // Call UI callback to list 3 random choices
        const choices = this.getUpgradeOptions();
        this.callbacks.onLevelUp(choices);
    }

    triggerOrbitalDischarge() {
        // Discharges lightning static shock when shield breaks, damaging all nearby enemies
        const range = 180;
        const dischargeDamage = this.player.shieldModule.dischargeDamage || 0;
        
        if (dischargeDamage <= 0) return;

        this.enemies.forEach(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.hypot(dx, dy);

            if (dist < range) {
                e.takeDamage(dischargeDamage, this.particles);
                
                // Draw radial discharge bolts
                this.particles.add(new Particle({
                    x: this.player.x,
                    y: this.player.y,
                    size: 2,
                    color: '#00f3ff',
                    maxLife: 12,
                    decay: 1.0,
                    draw: (ctx, cx, cy) => {
                        ctx.save();
                        ctx.strokeStyle = '#00f3ff';
                        ctx.lineWidth = 1.5;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = '#00f3ff';
                        ctx.beginPath();
                        ctx.moveTo(this.player.x - cx, this.player.y - cy);
                        ctx.lineTo(e.x - cx + (Math.random() - 0.5) * 10, e.y - cy + (Math.random() - 0.5) * 10);
                        ctx.stroke();
                        ctx.restore();
                    }
                }));
            }
        });
    }

    getUpgradeOptions() {
        const fullPool = this.player.getAvailableUpgradesList();
        
        // Shuffle pool
        const shuffled = [...fullPool].sort(() => 0.5 - Math.random());
        
        // Take 3 options
        const cards = shuffled.slice(0, 3);
        
        // Fallback in case pool is somehow empty
        if (cards.length === 0) {
            cards.push({ name: "Repair Core", type: "stat", desc: "Instantly heals Hull Integrity (HP) by 40%." });
        }
        
        return cards;
    }

    spawnEnemyWave() {
        const gameSecs = this.timeElapsed / 1000;
        const enemyLevel = 1 + Math.floor(gameSecs / 60); // level increases every 60s
        
        const count = 3 + Math.floor(gameSecs / 15); // enemy wave size scales up
        const maxEnemiesOnScreen = 120;
        
        if (this.enemies.length >= maxEnemiesOnScreen) return; // Keep performance smooth

        // Boss spawn rule (spawns once at 300s/5m if not already alive)
        if (Math.floor(gameSecs) >= 300 && !this.enemies.some(e => e.isBoss)) {
            const spawnDist = Math.max(this.width, this.height) * 0.65;
            const angle = Math.random() * Math.PI * 2;
            const bx = this.player.x + Math.cos(angle) * spawnDist;
            const by = this.player.y + Math.sin(angle) * spawnDist;
            this.enemies.push(new CosmicBoss(bx, by, enemyLevel + 2));
            return;
        }

        for (let i = 0; i < count; i++) {
            // Spawn just outside the viewport camera boundaries
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = Math.max(this.width, this.height) * 0.60;
            const ex = this.player.x + Math.cos(angle) * spawnDist;
            const ey = this.player.y + Math.sin(angle) * spawnDist;
            
            // Decides enemy tier type based on time elapsed
            const rand = Math.random() * 100;
            
            if (gameSecs < 30) {
                // Only swarmers
                this.enemies.push(new Swarmer(ex, ey, enemyLevel));
            } else if (gameSecs < 90) {
                // Swarmers + Range Diamond Shooters
                if (rand > 70) {
                    this.enemies.push(new DiamondShooter(ex, ey, enemyLevel));
                } else {
                    this.enemies.push(new Swarmer(ex, ey, enemyLevel));
                }
            } else {
                // Swarmers + Shooters + Nova Chargers
                if (rand > 85) {
                    this.enemies.push(new NovaCharger(ex, ey, enemyLevel));
                } else if (rand > 60) {
                    this.enemies.push(new DiamondShooter(ex, ey, enemyLevel));
                } else {
                    this.enemies.push(new Swarmer(ex, ey, enemyLevel));
                }
            }
        }
    }

    getFormattedTime() {
        const totalSecs = Math.floor(this.timeElapsed / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    gameOver(reason) {
        this.state = 'gameover';
        audio.applyLowPassFilter(true);
        audio.stopMusic();
        
        // Report final metrics
        this.callbacks.onGameOver({
            reason: reason,
            time: this.getFormattedTime(),
            kills: this.enemiesKilled,
            level: `Level ${this.player.level}`,
            credits: this.creditsGained
        });
    }

    draw() {
        // 1. Draw moving cosmic space parallax backgrounds
        this.nebula.draw(this.ctx, this.camera.x, this.camera.y);

        // 2. Draw active drops (XP Gems, Credits)
        this.drops.forEach(d => d.draw(this.ctx, this.camera.x, this.camera.y));

        // 3. Draw active player projectiles
        this.projectiles.forEach(p => p.draw(this.ctx, this.camera.x, this.camera.y));

        // 4. Draw active enemy projectiles
        this.enemyProjectiles.forEach(ep => ep.draw(this.ctx, this.camera.x, this.camera.y));

        // 5. Draw active enemies
        this.enemies.forEach(e => e.draw(this.ctx, this.camera.x, this.camera.y));

        // 6. Draw particle engine effects (sparks, explosions)
        this.particles.draw(this.ctx, this.camera.x, this.camera.y);

        // 7. Draw player ship and active shields
        this.player.draw(this.ctx, this.camera.x, this.camera.y);
        
        // 8. Draw Orbital Asteroids (passive shield rocks)
        const orbitWeapon = this.player.weapons.find(w => w instanceof OrbitalAsteroids);
        if (orbitWeapon) {
            orbitWeapon.draw(this.ctx, this.player, this.camera.x, this.camera.y);
        }
    }
}
