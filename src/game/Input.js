/* ==========================================================================
   INPUT.JS - KEYBOARD AND MOUSE STATE TRACKING
   ========================================================================== */

export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.dashTriggered = false;
        
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        
        this.init();
    }

    init() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mousedown', this._onMouseDown);
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mousedown', this._onMouseDown);
    }

    _onKeyDown(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        this.keys[e.code.toLowerCase()] = true; // Support space, arrow keys
        
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault(); // Stop scrolling on spacebar
            this.dashTriggered = true;
        }
    }

    _onKeyUp(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        this.keys[e.code.toLowerCase()] = false;
    }

    _onMouseMove(e) {
        // Track raw mouse screen position. We will map this to canvas coordinates in the Game Engine.
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    _onMouseDown(e) {
        if (e.button === 2) { // Right Click triggers dash
            e.preventDefault();
            this.dashTriggered = true;
        }
    }

    isPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;

        if (this.isPressed('w') || this.isPressed('arrowup')) dy -= 1;
        if (this.isPressed('s') || this.isPressed('arrowdown')) dy += 1;
        if (this.isPressed('a') || this.isPressed('arrowleft')) dx -= 1;
        if (this.isPressed('d') || this.isPressed('arrowright')) dx += 1;

        // Normalize vector so diagonal movement isn't faster
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        return { x: dx, y: dy };
    }

    checkDashTrigger() {
        const triggered = this.dashTriggered;
        this.dashTriggered = false; // Reset after checking
        return triggered;
    }

    reset() {
        this.keys = {};
        this.dashTriggered = false;
    }
}
