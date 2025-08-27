// ===================== CONSTANTES Y CONFIGURACIÓN =====================
const PEPPERONI_SIZE = 28; // Tamaño del pepperoni en píxeles
const PIZZA_CENTER_X = 225;
const PIZZA_CENTER_Y = 225;
const PIZZA_RADIUS = 180;
const CENTER_EXCLUSION_RADIUS = 45;

// ===================== VARIABLES DE ESTADO =====================
let draggedElement = null;
let pepperoniCount = 0;
let placedPepperonis = 0;
let gameScore = 0;
let difficulty = 'easy';
let gameTimer = 180;
let timerInterval = null;
let gameStarted = false;
let achievements = [];
let isDragging = false;
let touchOffset = { x: 0, y: 0 };

const difficultySettings = {
    easy: { pepperonis: 15, time: 300, tolerance: 0.4 },
    medium: { pepperonis: 20, time: 240, tolerance: 0.3 },
    hard: { pepperonis: 25, time: 180, tolerance: 0.2 }
};

// ===================== UTILIDADES DOM =====================
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Elemento con ID '${id}' no encontrado`);
    }
    return element;
}

function safeUpdateElement(id, property, value) {
    const element = safeGetElement(id);
    if (element) {
        if (property === 'textContent') {
            element.textContent = value;
        } else if (property === 'style') {
            Object.assign(element.style, value);
        } else {
            element[property] = value;
        }
    }
}

// ===================== SISTEMA DE DRAG UNIFICADO =====================
class DragManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        document.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));

        // Touch events
        document.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });

        // Cleanup events
        document.addEventListener('mouseleave', this.cleanup.bind(this));
    }

    handleStart(e) {
        if (!e.target.classList.contains('pepperoni') || !gameStarted) {
            return;
        }

        e.preventDefault();
        isDragging = true;
        draggedElement = e.target;

        const touch = e.touches ? e.touches[0] : e;
        
        // Simplificar: solo guardar la posición inicial del cursor
        touchOffset.x = touch.clientX;
        touchOffset.y = touch.clientY;

        // Preparar elemento para drag
        this.prepareDragElement();
        this.showDropZones(true);
    }

    handleMove(e) {
        if (!isDragging || !draggedElement) return;

        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;

        // Mover elemento directamente donde está el cursor
        draggedElement.style.position = 'fixed';
        draggedElement.style.left = (touch.clientX - 14) + 'px'; // 14 = mitad del pepperoni (28px/2)
        draggedElement.style.top = (touch.clientY - 14) + 'px';
        draggedElement.style.zIndex = '1000';
        draggedElement.style.pointerEvents = 'none';
    }

    handleEnd(e) {
        if (!isDragging || !draggedElement) return;

        e.preventDefault();
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        
        // Intentar colocar en la pizza
        this.attemptPlacement(touch.clientX, touch.clientY);
        this.cleanup();
    }

    prepareDragElement() {
        if (draggedElement) {
            draggedElement.classList.add('dragging');
            draggedElement.style.transition = 'none';
        }
    }

    showDropZones(show) {
        const zones = document.querySelectorAll('.zone-1, .zone-2, .zone-3');
        zones.forEach(zone => {
            zone.classList.toggle('active', show);
        });
    }

    attemptPlacement(clientX, clientY) {
        const pizza = document.querySelector('.pizza');
        if (!pizza) {
            this.resetDraggedElement();
            return;
        }

        const pizzaRect = pizza.getBoundingClientRect();
        const x = clientX - pizzaRect.left;
        const y = clientY - pizzaRect.top;

        if (this.isValidPosition(x, y)) {
            const adjustedX = x - PEPPERONI_SIZE / 2;
            const adjustedY = y - PEPPERONI_SIZE / 2;
            this.placePepperoniAt(adjustedX, adjustedY);
        } else {
            showFeedback('Posición no válida para el pepperoni', 'error');
            this.resetDraggedElement();
        }
    }

    isValidPosition(x, y) {
        const distanceFromCenter = Math.sqrt(
            Math.pow(x - PIZZA_CENTER_X, 2) + Math.pow(y - PIZZA_CENTER_Y, 2)
        );
        return distanceFromCenter > CENTER_EXCLUSION_RADIUS && 
               distanceFromCenter < PIZZA_RADIUS;
    }

    placePepperoniAt(x, y) {
        if (!draggedElement) return;

        const pizza = document.querySelector('.pizza');
        if (!pizza) return;

        // Crear nuevo pepperoni en la pizza
        const newPepperoni = this.createPlacedPepperoni(x, y);
        pizza.appendChild(newPepperoni);

        // Remover pepperoni original del banco
        if (draggedElement.parentElement) {
            draggedElement.remove();
        }

        placedPepperonis++;
        updateScore();
        checkAchievements();
        showFeedback('¡Pepperoni colocado correctamente!', 'success');
        playSound('place');
    }

    createPlacedPepperoni(x, y) {
        const newPepperoni = document.createElement('div');
        newPepperoni.className = 'pepperoni'; // Usar solo clase base, no 'placed'
        newPepperoni.id = draggedElement.id;
        newPepperoni.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            margin: 0;
            transition: transform 0.2s ease;
        `;

        // Agregar evento de doble clic para remover
        newPepperoni.addEventListener('dblclick', removePepperoni);
        
        return newPepperoni;
    }

    resetDraggedElement() {
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement.style.cssText = '';
        }
    }

    cleanup() {
        this.resetDraggedElement();
        this.showDropZones(false);
        isDragging = false;
        draggedElement = null;
        touchOffset = { x: 0, y: 0 };
    }
}

// ===================== GESTIÓN DEL JUEGO =====================
function initGame() {
    resetGame();
    new DragManager(); // Inicializar sistema de drag
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    resetGame();
}

function startTimer() {
    if (timerInterval || gameStarted) return;

    gameTimer = difficultySettings[difficulty].time;
    gameStarted = true;

    timerInterval = setInterval(() => {
        gameTimer--;
        updateTimerDisplay();

        if (gameTimer <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);

    showFeedback('¡Juego iniciado! Arrastra los pepperonis a la pizza.', 'success');
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameTimer / 60);
    const seconds = gameTimer % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    safeUpdateElement('timer', 'textContent', timeString);
    
    // Cambiar color cuando queda poco tiempo
    const timerEl = safeGetElement('timer');
    if (timerEl) {
        if (gameTimer <= 30) {
            timerEl.style.color = '#f44336';
            timerEl.style.animation = 'pulse 1s infinite';
        } else {
            timerEl.style.color = '#d32f2f';
            timerEl.style.animation = 'none';
        }
    }
}

function endGame() {
    gameStarted = false;
    const finalScore = calculateFinalScore();
    showFeedback(`¡Tiempo agotado! Puntuación final: ${finalScore}`, 'warning');

    // Desactivar interacciones
    document.querySelectorAll('.pepperoni').forEach(p => {
        p.style.opacity = '0.7';
        p.style.pointerEvents = 'none';
    });
}

// ===================== GESTIÓN DE PEPPERONIS =====================
function addPepperonis() {
    const bank = safeGetElement('pepperoni-bank');
    if (!bank) return;

    const existingPepperonis = bank.querySelectorAll('.pepperoni').length;
    const maxPepperonis = difficultySettings[difficulty].pepperonis;
    const toAdd = Math.min(12, maxPepperonis - existingPepperonis);

    for (let i = 0; i < toAdd; i++) {
        const pepperoni = createPepperoni();
        bank.appendChild(pepperoni);
    }

    if (toAdd === 0 && existingPepperonis < maxPepperonis) {
        showFeedback('¡Límite de pepperonis alcanzado!', 'warning');
    }
}

function createPepperoni() {
    const pepperoni = document.createElement('div');
    pepperoni.className = 'pepperoni bank-pepperoni'; // Mantener clase específica del banco
    pepperoni.id = `pepperoni-${pepperoniCount++}`;
    pepperoni.style.cssText = `
        position: relative;
        margin: 5px;
        cursor: grab;
    `;

    // Los efectos hover ya están en CSS, no necesitamos JS
    return pepperoni;
}

function removePepperoni() {
    if (!gameStarted) return;

    this.remove();
    placedPepperonis--;
    updateScore();
    showFeedback('Pepperoni removido', 'warning');
    playSound('remove');

    // Devolver pepperoni al banco
    const bank = safeGetElement('pepperoni-bank');
    if (bank && bank.querySelectorAll('.pepperoni').length < difficultySettings[difficulty].pepperonis) {
        const pepperoni = createPepperoni();
        bank.appendChild(pepperoni);
    }
}

// ===================== SISTEMA DE SECCIONES (CORREGIDO) =====================
function getSection(x, y, centerX, centerY) {
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    angle = (angle + 360) % 360; // Normalizar a 0-360

    // Dividir en 3 secciones iguales de 120 grados cada una
    if (angle >= 0 && angle < 120) return 1;     // 0-120°
    if (angle >= 120 && angle < 240) return 2;   // 120-240°
    if (angle >= 240 && angle < 360) return 3;   // 240-360°
    
    return 1; // Fallback por seguridad
}

function checkDistribution() {
    if (!gameStarted) return;

    const pizza = document.querySelector('.pizza');
    const pepperonis = pizza ? pizza.querySelectorAll('.pepperoni') : [];

    if (pepperonis.length === 0) {
        showFeedback('Coloca algunos pepperonis en la pizza primero.', 'warning');
        return;
    }

    const sections = { 1: 0, 2: 0, 3: 0 };
    const rect = pizza.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    pepperonis.forEach(pepperoni => {
        const pepRect = pepperoni.getBoundingClientRect();
        const x = pepRect.left - rect.left + PEPPERONI_SIZE / 2;
        const y = pepRect.top - rect.top + PEPPERONI_SIZE / 2;

        const section = getSection(x, y, centerX, centerY);
        sections[section]++;
    });

    const total = pepperonis.length;
    const ideal = total / 3;
    const tolerance = ideal * difficultySettings[difficulty].tolerance;

    const balanced = Object.values(sections).every(count =>
        Math.abs(count - ideal) <= tolerance
    );

    const timeBonus = Math.max(0, gameTimer * 2);
    const balanceScore = calculateBalanceScore(sections, total);

    if (balanced) {
        const bonus = 500 + timeBonus + balanceScore;
        gameScore += bonus;
        showFeedback(`¡Excelente distribución! +${bonus} puntos`, 'success');
        showAchievement('¡Maestro del Pepperoni!');
        playSound('success');
    } else {
        const penalty = Math.floor(balanceScore * 0.1);
        gameScore = Math.max(0, gameScore - penalty);
        showFeedback(`Distribución desbalanceada. Sección 1: ${sections[1]}, Sección 2: ${sections[2]}, Sección 3: ${sections[3]}`, 'error');
        playSound('error');
    }

    updateScore();
}

// ===================== PUNTUACIÓN =====================
function calculateBalanceScore(sections, total) {
    if (total === 0) return 0;

    const ideal = total / 3;
    const variance = Object.values(sections).reduce((sum, count) =>
        sum + Math.pow(count - ideal, 2), 0) / 3;

    return Math.max(0, Math.round(100 - (variance * 20)));
}

function calculateFinalScore() {
    const pizza = document.querySelector('.pizza');
    const pepperonis = pizza ? pizza.querySelectorAll('.pepperoni') : [];

    if (pepperonis.length === 0) return gameScore;

    const sections = { 1: 0, 2: 0, 3: 0 };
    const rect = pizza.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    pepperonis.forEach(pepperoni => {
        const pepRect = pepperoni.getBoundingClientRect();
        const x = pepRect.left - rect.left + PEPPERONI_SIZE / 2;
        const y = pepRect.top - rect.top + PEPPERONI_SIZE / 2;

        const section = getSection(x, y, centerX, centerY);
        if (section) sections[section]++;
    });

    const balanceScore = calculateBalanceScore(sections, pepperonis.length);
    const timeBonus = Math.max(0, gameTimer * 1.5);
    const placementBonus = pepperonis.length * 10;

    return Math.round(gameScore + balanceScore + timeBonus + placementBonus);
}

function updateScore() {
    const pizza = document.querySelector('.pizza');
    const pepperonis = pizza ? pizza.querySelectorAll('.pepperoni') : [];
    const sections = { 1: 0, 2: 0, 3: 0 };

    if (pepperonis.length > 0) {
        const rect = pizza.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        pepperonis.forEach(pepperoni => {
            const pepRect = pepperoni.getBoundingClientRect();
            const x = pepRect.left - rect.left + PEPPERONI_SIZE / 2;
            const y = pepRect.top - rect.top + PEPPERONI_SIZE / 2;

            const section = getSection(x, y, centerX, centerY);
            if (section) sections[section]++;
        });
    }

    const balance = calculateBalanceScore(sections, pepperonis.length);
    const progress = Math.min(100, (pepperonis.length / difficultySettings[difficulty].pepperonis) * 100);

    // Actualizar elementos del DOM de forma segura
    safeUpdateElement('placed', 'textContent', pepperonis.length);
    safeUpdateElement('balance', 'textContent', Math.round(balance) + '%');
    safeUpdateElement('score', 'textContent', calculateFinalScore());
    safeUpdateElement('progress-fill', 'style', { width: progress + '%' });
}

// ===================== FUNCIONES DE UTILIDAD =====================
function autoComplete() {
    if (!gameStarted) return;

    const bank = safeGetElement('pepperoni-bank');
    if (!bank) return;

    const availablePepperonis = bank.querySelectorAll('.pepperoni');
    const sectionsToFill = [
        { angle: 0, radius: 0.6 },
        { angle: 60, radius: 0.65 },
        { angle: 120, radius: 0.7 },
        { angle: 180, radius: 0.6 },
        { angle: 240, radius: 0.65 },
        { angle: 300, radius: 0.7 }
    ];

    const pizza = document.querySelector('.pizza');
    if (!pizza) return;

    const centerX = PIZZA_CENTER_X;
    const centerY = PIZZA_CENTER_Y;

    availablePepperonis.forEach((pepperoni, index) => {
        if (index < sectionsToFill.length) {
            const section = sectionsToFill[index];
            const radius = section.radius * PIZZA_RADIUS;

            const x = centerX + Math.cos(section.angle * Math.PI / 180) * radius - PEPPERONI_SIZE / 2;
            const y = centerY + Math.sin(section.angle * Math.PI / 180) * radius - PEPPERONI_SIZE / 2;

            const newPepperoni = document.createElement('div');
            newPepperoni.className = 'pepperoni'; // Clase base sin modificadores
            newPepperoni.id = pepperoni.id;
            newPepperoni.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                margin: 0;
            `;

            newPepperoni.addEventListener('dblclick', removePepperoni);
            pizza.appendChild(newPepperoni);
            pepperoni.remove();
            placedPepperonis++;
        }
    });

    updateScore();
    showFeedback('¡Auto-completado! Verifica la distribución.', 'success');
    playSound('autoComplete');
}

function checkAchievements() {
    const pizza = document.querySelector('.pizza');
    const pepperonis = pizza ? pizza.querySelectorAll('.pepperoni') : [];

    if (pepperonis.length === 1 && !achievements.includes('first')) {
        achievements.push('first');
        showAchievement('¡Primer Pepperoni!');
    }

    if (pepperonis.length === 10 && !achievements.includes('ten')) {
        achievements.push('ten');
        showAchievement('¡Especialista en Pepperoni!');
    }

    if (pepperonis.length === 20 && !achievements.includes('twenty')) {
        achievements.push('twenty');
        showAchievement('¡Maestro Pizzero!');
    }
}

function showAchievement(text) {
    safeUpdateElement('achievement', 'textContent', '🏆 ' + text);
    const achievement = safeGetElement('achievement');
    if (achievement) {
        achievement.classList.add('show');
        setTimeout(() => {
            achievement.classList.remove('show');
        }, 3000);
    }
}

function playSound(type) {
    if (navigator.vibrate) {
        const vibrationPatterns = {
            place: 50,
            success: [100, 50, 100],
            error: 200,
            remove: 30,
            autoComplete: [50, 50, 50]
        };
        
        navigator.vibrate(vibrationPatterns[type] || 50);
    }
}

function showFeedback(message, type) {
    const feedback = safeGetElement('feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `feedback ${type} show`;

        setTimeout(() => {
            feedback.classList.remove('show');
        }, 4000);
    }
}

function resetGame() {
    // Limpiar pizza
    const pizza = document.querySelector('.pizza');
    if (pizza) {
        pizza.querySelectorAll('.pepperoni').forEach(p => p.remove());
    }

    // Limpiar banco
    const bank = safeGetElement('pepperoni-bank');
    if (bank) {
        bank.querySelectorAll('.pepperoni').forEach(p => p.remove());
    }

    // Reiniciar contadores
    placedPepperonis = 0;
    pepperoniCount = 0;
    gameScore = 0;
    achievements = [];
    draggedElement = null;
    isDragging = false;

    // Reiniciar timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameTimer = difficultySettings[difficulty].time;
    updateTimerDisplay();
    gameStarted = false;

    // Agregar pepperonis según dificultad
    addPepperonis();
    updateScore();

    showFeedback('¡Juego reiniciado! Haz clic en cualquier lugar para comenzar.', 'success');
}

// ===================== EVENT LISTENERS PRINCIPALES =====================
document.addEventListener('click', function (e) {
    if (!gameStarted &&
        e.target.tagName !== 'BUTTON' &&
        !e.target.classList.contains('difficulty-btn') &&
        !e.target.classList.contains('pepperoni')) {
        startTimer();
    }
});

// ===================== INICIALIZACIÓN =====================
document.addEventListener('DOMContentLoaded', function () {
    initGame();
});

// ===================== FUNCIONES GLOBALES =====================
window.setDifficulty = setDifficulty;
window.addPepperonis = addPepperonis;
window.checkDistribution = checkDistribution;
window.autoComplete = autoComplete;
window.resetGame = resetGame;