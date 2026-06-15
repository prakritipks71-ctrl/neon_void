/* ==========================================================================
   MAIN.JS - APPLICATION SYSTEM COORDINATOR, HANGAR SHOP, AND UI CONTROLS
   ========================================================================== */

import { GameEngine } from './game/GameEngine.js';
import { audio } from './game/Audio.js';

// --- HANGAR MODULES DATABASE ---
const MODULES_CATALOG = {
    hull: [
        { id: 'hull_titan', name: 'Titan Composite', cost: 0, hp: 100, color: '#909090', desc: 'Standard industrial steel hull. Balanced but heavy.' },
        { id: 'hull_plasma', name: 'Plasma Aegis Plate', cost: 150, hp: 150, color: '#ff0088', desc: 'Thermally treated alloy. Boosts max health to 150.' },
        { id: 'hull_quantum', name: 'Quantum Void Frame', cost: 350, hp: 220, color: '#00f3ff', desc: 'Fabricated with light-bending composites. Extreme armor capacity of 220.' }
    ],
    shield: [
        { id: 'shield_basic', name: 'Deflector v1', cost: 0, capacity: 40, recharge: 5000, dischargeDamage: 0, desc: 'Generates low-intensity magnetic shield layer.' },
        { id: 'shield_pulse', name: 'Pulse Capacitor', cost: 100, capacity: 70, recharge: 4000, dischargeDamage: 30, desc: 'Emits static shock discharge (30 dmg) when cracked. Recharges in 4s.' },
        { id: 'shield_aegis', name: 'Aegis Matrix', cost: 280, capacity: 120, recharge: 3000, dischargeDamage: 60, desc: 'Tactical nanotech deflectors. Massive static blast (60 dmg) on break. Recharges in 3s.' }
    ],
    engine: [
        { id: 'engine_ion', name: 'Ion Thruster', cost: 0, speed: 3.8, dashCooldown: 3000, dashDuration: 150, color: '#0044ff', desc: 'Reliable blue ion drive. Standard thrust.' },
        { id: 'engine_hyper', name: 'Hyper Impulse', cost: 120, speed: 4.8, dashCooldown: 2200, dashDuration: 180, color: '#ff5e00', desc: 'Orange hypergolic thrusters. Reduced dash cooldown to 2.2s.' },
        { id: 'engine_warp', name: 'Void Warp Core', cost: 260, speed: 6.0, dashCooldown: 1400, dashDuration: 220, color: '#39ff14', desc: 'Green warp impulse. Warp speed and ultra-fast warp dash recharge (1.4s).' }
    ],
    weaponCore: [
        { id: 'weapon_pulse', name: 'Laser Core', cost: 0, fireRateMult: 1.0, desc: 'Fires focused plasma beams at nearest targets.' },
        { id: 'weapon_orbit', name: 'Orbital Core', cost: 150, fireRateMult: 0.85, desc: 'Starts with orbiting asteroids shielding your ship.' },
        { id: 'weapon_lightning', name: 'Synapse Core', cost: 300, fireRateMult: 1.15, desc: 'Starts with active electric chain discharge.' }
    ]
};

// --- APPLICATION STATE MANAGER ---
class AppManager {
    constructor() {
        this.credits = 0;
        
        // Modules tracking
        this.ownedModuleIds = [];
        this.equippedModules = {
            hull: null,
            shield: null,
            engine: null,
            weaponCore: null
        };
        
        // Active Game instance
        this.game = null;
        
        this.currentHangarCategory = 'hull';
        this.hangarCanvas = document.getElementById('ship-preview-canvas');
        this.hangarCtx = this.hangarCanvas.getContext('2d');
        
        this.init();
    }

    init() {
        this.loadProfile();
        this.setupNavigation();
        this.setupHangarShop();
        this.updateHangarUI();
        
        // Draw initial ship in Hangar
        this.drawHangarShipPreview();
    }

    loadProfile() {
        // Load credits
        const storedCredits = localStorage.getItem('neon_credits');
        this.credits = storedCredits ? parseInt(storedCredits) : 0;
        document.getElementById('menu-credits-display').innerText = this.credits;
        document.getElementById('hangar-credits-display').innerText = this.credits;

        // Load owned modules
        const storedOwned = localStorage.getItem('neon_owned_modules');
        if (storedOwned) {
            this.ownedModuleIds = JSON.parse(storedOwned);
        } else {
            // Default modules are free and unlocked
            this.ownedModuleIds = ['hull_titan', 'shield_basic', 'engine_ion', 'weapon_pulse'];
            localStorage.setItem('neon_owned_modules', JSON.stringify(this.ownedModuleIds));
        }

        // Load equipped modules
        const storedEquipped = localStorage.getItem('neon_equipped_modules');
        if (storedEquipped) {
            const equippedIds = JSON.parse(storedEquipped);
            
            // Resolve IDs to catalog items
            this.equippedModules.hull = MODULES_CATALOG.hull.find(h => h.id === equippedIds.hull) || MODULES_CATALOG.hull[0];
            this.equippedModules.shield = MODULES_CATALOG.shield.find(s => s.id === equippedIds.shield) || MODULES_CATALOG.shield[0];
            this.equippedModules.engine = MODULES_CATALOG.engine.find(e => e.id === equippedIds.engine) || MODULES_CATALOG.engine[0];
            this.equippedModules.weaponCore = MODULES_CATALOG.weaponCore.find(w => w.id === equippedIds.weaponCore) || MODULES_CATALOG.weaponCore[0];
        } else {
            // Equip starters
            this.equippedModules.hull = MODULES_CATALOG.hull[0];
            this.equippedModules.shield = MODULES_CATALOG.shield[0];
            this.equippedModules.engine = MODULES_CATALOG.engine[0];
            this.equippedModules.weaponCore = MODULES_CATALOG.weaponCore[0];
            this.saveEquippedModules();
        }
    }

    saveProfile() {
        localStorage.setItem('neon_credits', this.credits.toString());
        localStorage.setItem('neon_owned_modules', JSON.stringify(this.ownedModuleIds));
        this.saveEquippedModules();
        
        document.getElementById('menu-credits-display').innerText = this.credits;
        document.getElementById('hangar-credits-display').innerText = this.credits;
    }

    saveEquippedModules() {
        const equippedIds = {
            hull: this.equippedModules.hull.id,
            shield: this.equippedModules.shield.id,
            engine: this.equippedModules.engine.id,
            weaponCore: this.equippedModules.weaponCore.id
        };
        localStorage.setItem('neon_equipped_modules', JSON.stringify(equippedIds));
    }

    setupNavigation() {
        const showScreen = (screenId) => {
            document.querySelectorAll('.app-screen').forEach(scr => scr.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        };

        // Main Menu button hooks
        document.getElementById('btn-play').addEventListener('click', () => {
            showScreen('screen-game');
            this.startGame();
        });

        document.getElementById('btn-hangar').addEventListener('click', () => {
            showScreen('screen-hangar');
            this.updateHangarUI();
            this.drawHangarShipPreview();
        });

        document.getElementById('btn-help').addEventListener('click', () => {
            document.getElementById('overlay-help').classList.add('active');
        });

        // Close help
        document.getElementById('btn-help-close').addEventListener('click', () => {
            document.getElementById('overlay-help').classList.remove('active');
        });

        // Hangar back to menu
        document.getElementById('btn-hangar-back').addEventListener('click', () => {
            showScreen('screen-menu');
        });

        // In-game Pause menu triggers
        document.getElementById('btn-game-pause').addEventListener('click', () => {
            if (this.game) {
                this.game.pauseGame();
                document.getElementById('overlay-pause').classList.add('active');
            }
        });

        document.getElementById('btn-pause-resume').addEventListener('click', () => {
            if (this.game) {
                this.game.resumeGame();
                document.getElementById('overlay-pause').classList.remove('active');
            }
        });

        document.getElementById('btn-pause-mute').addEventListener('click', () => {
            const isMuted = audio.toggleMute();
            const btn = document.getElementById('btn-pause-mute');
            btn.style.color = isMuted ? '#8d89a5' : '#ff0088';
            btn.style.borderColor = isMuted ? 'rgba(255,255,255,0.08)' : '#ff0088';
        });

        document.getElementById('btn-pause-quit').addEventListener('click', () => {
            if (this.game) {
                document.getElementById('overlay-pause').classList.remove('active');
                audio.applyLowPassFilter(false);
                this.game.gameOver("ABORTED BY COMMANDER");
            }
        });

        // Game Over buttons
        document.getElementById('btn-gameover-hangar').addEventListener('click', () => {
            showScreen('screen-hangar');
            this.updateHangarUI();
            this.drawHangarShipPreview();
        });

        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            showScreen('screen-menu');
        });
    }

    setupHangarShop() {
        // Tab buttons click listeners
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentHangarCategory = btn.getAttribute('data-category');
                this.updateHangarUI();
            });
        });
    }

    updateHangarUI() {
        const container = document.getElementById('module-items-container');
        container.innerHTML = '';
        
        const categoryItems = MODULES_CATALOG[this.currentHangarCategory];
        
        categoryItems.forEach(item => {
            const isOwned = this.ownedModuleIds.includes(item.id);
            const isEquipped = this.equippedModules[this.currentHangarCategory].id === item.id;
            
            const card = document.createElement('div');
            card.className = `module-card ${isEquipped ? 'equipped' : ''}`;
            
            // Core Card HTML
            let footerHtml = '';
            if (isEquipped) {
                footerHtml = `<span class="highlight-cyan font-bold" style="font-size: 0.75rem;">EQUIPPED</span>`;
            } else if (isOwned) {
                footerHtml = `<span class="highlight-green" style="font-size: 0.75rem;">EQUIP MODULE</span>`;
            } else {
                footerHtml = `<span class="module-cost">${item.cost} CR</span>`;
            }

            // Delta stats labels
            let statDiffHtml = '';
            if (this.currentHangarCategory === 'hull') {
                statDiffHtml = `<span class="highlight-cyan">HP: ${item.hp}</span>`;
            } else if (this.currentHangarCategory === 'shield') {
                statDiffHtml = `<span class="highlight-cyan">CAP: ${item.capacity}</span> <span class="highlight-magenta">BREAK DISCHARGE: ${item.dischargeDamage}</span>`;
            } else if (this.currentHangarCategory === 'engine') {
                statDiffHtml = `<span class="highlight-cyan">SPD: ${item.speed}</span> <span class="highlight-orange">DASH: ${(item.dashCooldown/1000).toFixed(1)}s</span>`;
            } else if (this.currentHangarCategory === 'weaponCore') {
                statDiffHtml = `<span class="highlight-cyan">FIRE RATE: ${item.fireRateMult}x</span>`;
            }

            card.innerHTML = `
                <div class="module-card-header">
                    <span class="module-title">${item.name}</span>
                    ${footerHtml}
                </div>
                <div class="module-desc">${item.desc}</div>
                <div class="module-stats-delta">${statDiffHtml}</div>
            `;
            
            // Purchase/Equip Action Click
            card.addEventListener('click', () => {
                this.handleModuleSelect(item);
            });
            
            container.appendChild(card);
        });

        // Update Equip Text Info Box (Middle Column)
        const equippedPanel = document.getElementById('equipped-info-box');
        equippedPanel.innerHTML = `
            <div class="equipped-info-title">MODULE SCHEMATICS</div>
            <div class="equipped-info-grid">
                <div class="equipped-item"><strong>HULL:</strong> ${this.equippedModules.hull.name}</div>
                <div class="equipped-item"><strong>DEFLECTOR:</strong> ${this.equippedModules.shield.name}</div>
                <div class="equipped-item"><strong>PROPULSION:</strong> ${this.equippedModules.engine.name}</div>
                <div class="equipped-item"><strong>WEAPON CORE:</strong> ${this.equippedModules.weaponCore.name}</div>
            </div>
        `;

        // Update Stat Profile Bars (Right Column)
        this.updateHangarStatBars();
    }

    updateHangarStatBars() {
        const scaleStat = (val, max) => (val / max) * 100;
        
        // Get max limits for stats scaling
        const maxHpLimit = 250;
        const maxShieldLimit = 150;
        const maxSpeedLimit = 7.0;
        const maxWeaponSpeedLimit = 1.5;

        const hull = this.equippedModules.hull;
        const shield = this.equippedModules.shield;
        const engine = this.equippedModules.engine;
        const weapon = this.equippedModules.weaponCore;

        // Visual bars fills
        document.getElementById('bar-stat-hp').style.width = `${scaleStat(hull.hp, maxHpLimit)}%`;
        document.getElementById('val-stat-hp').innerText = `${hull.hp} HP`;

        document.getElementById('bar-stat-shield').style.width = `${scaleStat(shield.capacity, maxShieldLimit)}%`;
        document.getElementById('val-stat-shield').innerText = `${shield.capacity} CAP`;

        document.getElementById('bar-stat-speed').style.width = `${scaleStat(engine.speed, maxSpeedLimit)}%`;
        document.getElementById('val-stat-speed').innerText = `${engine.speed.toFixed(1)} U/s`;

        // Cooldown inverse scale
        const dashScore = Math.max(10, 100 - (engine.dashCooldown / 4000) * 100);
        document.getElementById('bar-stat-dash').style.width = `${dashScore}%`;
        document.getElementById('val-stat-dash').innerText = `${(engine.dashCooldown/1000).toFixed(1)}s COOLDOWN`;

        document.getElementById('bar-stat-weaponspeed').style.width = `${scaleStat(weapon.fireRateMult, maxWeaponSpeedLimit)}%`;
        document.getElementById('val-stat-weaponspeed').innerText = `${weapon.fireRateMult.toFixed(2)}x MULT`;
    }

    handleModuleSelect(item) {
        const isOwned = this.ownedModuleIds.includes(item.id);
        
        if (isOwned) {
            // Equip immediately
            this.equippedModules[this.currentHangarCategory] = item;
            this.saveEquippedModules();
            this.updateHangarUI();
            this.drawHangarShipPreview();
            audio.playPowerUp();
        } else {
            // Check Credit balance to purchase
            if (this.credits >= item.cost) {
                this.credits -= item.cost;
                this.ownedModuleIds.push(item.id);
                this.equippedModules[this.currentHangarCategory] = item;
                
                this.saveProfile();
                this.updateHangarUI();
                this.drawHangarShipPreview();
                audio.playLevelUp(); // fanfares sound
            } else {
                // Deny sound
                audio.playHit();
            }
        }
    }

    drawHangarShipPreview() {
        const ctx = this.hangarCtx;
        const w = this.hangarCanvas.width;
        const h = this.hangarCanvas.height;
        
        // Clear background
        ctx.fillStyle = '#0a0915';
        ctx.fillRect(0, 0, w, h);

        // Draw HUD grid gridlines inside ship preview
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridGap = 20;
        for (let x = 0; x < w; x += gridGap) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridGap) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Draw radial glowing background center aura
        const gradient = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, 110);
        gradient.addColorStop(0, 'rgba(0, 68, 255, 0.08)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(w/2, h/2, 110, 0, Math.PI * 2); ctx.fill();

        // Draw deflector shield ring
        const shieldCap = this.equippedModules.shield.capacity;
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(w/2, h/2, 55 + (shieldCap / 5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Center preview ship vector
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.rotate(-Math.PI / 2); // face upward

        // Draw Engine flame trails
        const engine = this.equippedModules.engine;
        const engineColor = engine.color || '#0044ff';
        ctx.save();
        ctx.fillStyle = engineColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = engineColor;
        ctx.beginPath();
        ctx.moveTo(-24, -5);
        ctx.lineTo(-45 - (Math.random()*15), 0);
        ctx.lineTo(-24, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Draw Hull
        const hull = this.equippedModules.hull;
        ctx.strokeStyle = hull.color || '#888888';
        ctx.fillStyle = 'rgba(25, 20, 35, 0.95)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = hull.color || '#888888';

        ctx.beginPath();
        ctx.moveTo(25, 0); // nose
        ctx.lineTo(-25, -20); // left wing
        ctx.lineTo(-12, 0); // engine bay
        ctx.lineTo(-25, 20); // right wing
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw cockpit cockpit decals
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-2, -6);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-2, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    startGame() {
        if (this.game) {
            this.game.destroy();
        }

        // Initialize UI panels state
        document.getElementById('overlay-level-up').classList.remove('active');
        document.getElementById('overlay-pause').classList.remove('active');
        document.getElementById('hud-weapons-list').innerHTML = '';

        // Reset HUD fills
        document.getElementById('hud-xp-fill').style.width = '0%';
        document.getElementById('hud-hp-fill').style.width = '100%';
        document.getElementById('hud-shield-fill').style.width = '100%';
        document.getElementById('hud-dash-fill').style.width = '100%';
        document.getElementById('hud-level-value').innerText = '1';
        document.getElementById('hud-credits-value').innerText = '0';
        document.getElementById('hud-timer-display').innerText = '00:00';

        // Spawn Game Engine
        this.game = new GameEngine('game-canvas', this.equippedModules, {
            onCreditsUpdate: (currentCredits) => {
                document.getElementById('hud-credits-value').innerText = currentCredits;
            },
            onHudUpdate: (hudData) => {
                // Update HUD visual details
                document.getElementById('hud-level-value').innerText = hudData.level;
                document.getElementById('hud-xp-fill').style.width = `${hudData.xpPercent}%`;
                document.getElementById('hud-xp-nums').innerText = hudData.xpText;
                
                document.getElementById('hud-hp-fill').style.width = `${hudData.hpPercent}%`;
                document.getElementById('hud-hp-values').innerText = hudData.hpText;
                
                document.getElementById('hud-shield-fill').style.width = `${hudData.shieldPercent}%`;
                document.getElementById('hud-shield-values').innerText = hudData.shieldText;
                
                document.getElementById('hud-timer-display').innerText = hudData.timerText;
                
                document.getElementById('hud-dash-fill').style.width = `${hudData.dashPercent}%`;
                document.getElementById('hud-dash-text').innerText = hudData.dashText;

                // Update active weapons lists
                const list = document.getElementById('hud-weapons-list');
                list.innerHTML = '';
                hudData.weaponsList.forEach(w => {
                    const el = document.createElement('div');
                    el.className = 'weapon-hud-row';
                    el.innerHTML = `<span>${w.name}</span><span>LV. ${w.level}</span>`;
                    list.appendChild(el);
                });
            },
            onLevelUp: (choices) => {
                const overlay = document.getElementById('overlay-level-up');
                const choicesContainer = document.getElementById('level-up-options-container');
                choicesContainer.innerHTML = '';
                
                overlay.classList.add('active');
                
                // Spawn the 3 glassmorphic upgrade cards
                choices.forEach(choice => {
                    const card = document.createElement('div');
                    card.className = `upgrade-card type-${choice.type} rarity-common`;
                    
                    // Decides a fun random emoji icon for graphics
                    let emoji = '⚙️';
                    if (choice.name === "Pulse Laser") emoji = '🔫';
                    else if (choice.name === "Grav Asteroids") emoji = '☄️';
                    else if (choice.name === "Synapse Shock") emoji = '⚡';
                    else if (choice.name === "Gravity Well") emoji = '🌀';
                    else if (choice.name === "Auxiliary Armor") emoji = '🛡️';
                    else if (choice.name === "Shield Capacitor") emoji = '🔋';
                    else if (choice.name === "Engine Fuel Syringe") emoji = '🚀';
                    else if (choice.name === "Subspace Magnet") emoji = '🧲';

                    card.innerHTML = `
                        <div class="upgrade-icon-box">${emoji}</div>
                        <div class="upgrade-title">${choice.name}</div>
                        <div class="upgrade-desc">${choice.desc}</div>
                        <div class="upgrade-rarity">COMPONENT</div>
                    `;
                    
                    card.addEventListener('click', () => {
                        overlay.classList.remove('active');
                        audio.applyLowPassFilter(false);
                        this.game.selectUpgrade(choice);
                    });
                    
                    choicesContainer.appendChild(card);
                });
            },
            onGameOver: (report) => {
                // Handle local credit accrual
                this.credits += report.credits;
                this.saveProfile();

                // Show report panels
                document.getElementById('screen-game-over').classList.add('active');
                document.getElementById('game-over-title').innerText = report.reason === "ABORTED BY COMMANDER" ? "MISSION ABORTED" : "MISSION TERMINATED";
                document.getElementById('game-over-title').className = report.reason === "ABORTED BY COMMANDER" ? "title-failed highlight-cyan" : "title-failed text-red";
                
                document.getElementById('report-time').innerText = report.time;
                document.getElementById('report-kills').innerText = report.kills;
                document.getElementById('report-level').innerText = report.level;
                document.getElementById('report-credits').innerText = `+${report.credits} CR`;
                
                // Clean up active loop memory
                if (this.game) {
                    this.game.destroy();
                    this.game = null;
                }
            }
        });
    }
}

// Initialise App Manager when window loads
window.addEventListener('load', () => {
    window.app = new AppManager();
});
