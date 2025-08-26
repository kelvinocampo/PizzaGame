let draggedElement = null;
let pepperoniCount = 0;
let placedPepperonis = 0;
let gameScore = 0;
let difficulty = 'easy';
let gameTimer = 180; // 3 minutos
let timerInterval = null;
let gameStarted = false;
let achievements = [];

const difficultySettings = {
    easy: { pepperonis: 15, time: 300, tolerance: 0.4 },
    medium: { pepperonis: 20, time: 240, tolerance: 0.3 },
    hard: { pepperonis: 25, time: 180, tolerance: 0.2 }
};

function initGame() {
    resetGame();
    startTimer();
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    resetGame();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
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
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameTimer / 60);
    const seconds = gameTimer % 60;
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Cambiar color cuando queda poco tiempo
    const timerEl = document.getElementById('timer');
    if (gameTimer <= 30) {
        timerEl.style.color = '#f44336';
        timerEl.style.animation = 'pulse 1s infinite';
    } else {
        timerEl.style.color = '#d32f2f';
        timerEl.style.animation = 'none';
    }
}

function endGame() {
    gameStarted = false;
    const finalScore = calculateFinalScore();
    showFeedback(`¡Tiempo agotado! Puntuación final: ${finalScore}`, 'warning');

    // Desactivar interacciones
    document.querySelectorAll('.pepperoni').forEach(p => {
        p.draggable = false;
        p.style.opacity = '0.7';
    });
}

function addPepperonis() {
    const bank = document.getElementById('pepperoni-bank');
    const existingPepperonis = bank.querySelectorAll('.pepperoni').length;
    const maxPepperonis = difficultySettings[difficulty].pepperonis;
    const toAdd = Math.min(12, maxPepperonis - existingPepperonis);

    for (let i = 0; i < toAdd; i++) {
        const pepperoni = createPepperoni();
        pepperoni.style.position = 'relative';
        pepperoni.style.margin = '5px';
        bank.appendChild(pepperoni);
    }

    if (toAdd === 0) {
        showFeedback('¡Límite de pepperonis alcanzado!', 'warning');
    }
}

function createPepperoni() {
    const pepperoni = document.createElement('div');
    pepperoni.className = 'pepperoni';
    pepperoni.draggable = true;
    pepperoni.id = `pepperoni-${pepperoniCount++}`;

    pepperoni.addEventListener('dragstart', handleDragStart);
    pepperoni.addEventListener('dragend', handleDragEnd);

    // Touch events para móviles
    pepperoni.addEventListener('touchstart', handleTouchStart, { passive: false });
    pepperoni.addEventListener('touchmove', handleTouchMove, { passive: false });
    pepperoni.addEventListener('touchend', handleTouchEnd);

    return pepperoni;
}

function handleDragStart(e) {
    if (!gameStarted) return false;

    draggedElement = this;
    this.classList.add('dragging');

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.add('active');
    });

    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedElement = null;

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.remove('active');
    });
}

// Touch events para móviles
let touchStartX, touchStartY;

function handleTouchStart(e) {
    if (!gameStarted) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    draggedElement = this;
    this.classList.add('dragging');

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.add('active');
    });
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!draggedElement) return;

    const touch = e.touches[0];
    draggedElement.style.position = 'fixed';
    draggedElement.style.left = (touch.clientX - 14) + 'px';
    draggedElement.style.top = (touch.clientY - 40) + 'px'; // antes -14 → ahora más arriba
    draggedElement.style.zIndex = '1000';
}

function handleTouchEnd(e) {
    if (!draggedElement) return;

    const touch = e.changedTouches[0];
    const pizza = document.querySelector('.pizza');
    const rect = pizza.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = touch.clientX - rect.left - 14;
    const y = touch.clientY - rect.top - 14;

    if (isValidPosition(x + 14, y + 14, centerX, centerY)) {
        // SNAP automático
        const section = getSection(x, y, centerX, centerY);
        let snapAngle;

        if (section === 1) snapAngle = 0;   // arriba
        if (section === 2) snapAngle = 120; // derecha
        if (section === 3) snapAngle = 240; // izquierda

        const radius = rect.width * 0.35;
        const snapX = centerX + Math.cos(snapAngle * Math.PI / 180) * radius - 14;
        const snapY = centerY + Math.sin(snapAngle * Math.PI / 180) * radius - 14;

        placePepperoni(snapX, snapY);
    } else {
        showFeedback('Posición no válida para el pepperoni', 'error');
    }

    resetDraggedElement();
}

function resetDraggedElement() {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement.style.position = '';
        draggedElement.style.left = '';
        draggedElement.style.top = '';
        draggedElement.style.zIndex = '';
        draggedElement = null;
    }

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.remove('active');
    });
}


// Configurar pizza como zona de drop
const pizza = document.querySelector('.pizza');

pizza.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
});

pizza.addEventListener('drop', function (e) {
    e.preventDefault();

    if (draggedElement && gameStarted) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - 14;
        const y = e.clientY - rect.top - 14;

        if (isValidPosition(x + 14, y + 14, rect.width / 2, rect.height / 2)) {
            placePepperoni(x, y);
        } else {
            showFeedback('No puedes colocar pepperonis en el centro o fuera de la pizza', 'error');
        }
    }
});

function isValidPosition(x, y, centerX, centerY) {
    const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const pizzaRadius = centerX * 0.9;   // antes 0.85
    const centerRadius = pizzaRadius * 0.25; // antes 0.35 → agranda zona útil

    return distanceFromCenter > centerRadius && distanceFromCenter < pizzaRadius;
}

function placePepperoni(x, y) {
    const newPepperoni = draggedElement.cloneNode(true);
    newPepperoni.style.position = 'absolute';
    newPepperoni.style.left = x + 'px';
    newPepperoni.style.top = y + 'px';
    newPepperoni.style.margin = '0';

    // Agregar eventos para pepperonis colocados
    newPepperoni.addEventListener('dragstart', handleDragStart);
    newPepperoni.addEventListener('dragend', handleDragEnd);
    newPepperoni.addEventListener('dblclick', removePepperoni);

    pizza.appendChild(newPepperoni);
    draggedElement.remove();
    placedPepperonis++;

    updateScore();
    checkAchievements();
    showFeedback('¡Pepperoni colocado correctamente!', 'success');

    // Efectos de sonido simulados
    playSound('place');
}

function removePepperoni() {
    if (!gameStarted) return;

    this.remove();
    placedPepperonis--;
    updateScore();
    showFeedback('Pepperoni removido', 'warning');
    playSound('remove');

    // Devolver pepperoni al banco
    const bank = document.getElementById('pepperoni-bank');
    const pepperoni = createPepperoni();
    pepperoni.style.position = 'relative';
    pepperoni.style.margin = '5px';
    bank.appendChild(pepperoni);
}

function getSection(x, y, centerX, centerY) {
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    angle = (angle + 360) % 360;

    if (angle >= 270 || angle < 30) return 1; // Sección superior (12-1)
    if (angle >= 30 && angle < 150) return 2;  // Sección derecha (4-5)
    if (angle >= 150 && angle < 270) return 3; // Sección izquierda (8-9)
}

function checkDistribution() {
    if (!gameStarted) return;

    const pepperonis = document.querySelectorAll('.pizza .pepperoni');
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
        const x = pepRect.left - rect.left + 14;
        const y = pepRect.top - rect.top + 14;

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

function calculateBalanceScore(sections, total) {
    if (total === 0) return 0;

    const ideal = total / 3;
    const variance = Object.values(sections).reduce((sum, count) =>
        sum + Math.pow(count - ideal, 2), 0) / 3;

    return Math.max(0, Math.round(100 - (variance * 20)));
}

function calculateFinalScore() {
    const pepperonis = document.querySelectorAll('.pizza .pepperoni');
    const sections = { 1: 0, 2: 0, 3: 0 };

    if (pepperonis.length === 0) return gameScore;

    const rect = pizza.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    pepperonis.forEach(pepperoni => {
        const pepRect = pepperoni.getBoundingClientRect();
        const x = pepRect.left - rect.left + 14;
        const y = pepRect.top - rect.top + 14;

        const section = getSection(x, y, centerX, centerY);
        sections[section]++;
    });

    const balanceScore = calculateBalanceScore(sections, pepperonis.length);
    const timeBonus = Math.max(0, gameTimer * 1.5);
    const placementBonus = pepperonis.length * 10;

    return gameScore + balanceScore + timeBonus + placementBonus;
}

function updateScore() {
    const pepperonis = document.querySelectorAll('.pizza .pepperoni');
    const sections = { 1: 0, 2: 0, 3: 0 };

    if (pepperonis.length > 0) {
        const rect = pizza.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        pepperonis.forEach(pepperoni => {
            const pepRect = pepperoni.getBoundingClientRect();
            const x = pepRect.left - rect.left + 14;
            const y = pepRect.top - rect.top + 14;

            const section = getSection(x, y, centerX, centerY);
            sections[section]++;
        });
    }

    const balance = calculateBalanceScore(sections, pepperonis.length);
    const progress = Math.min(100, (pepperonis.length / difficultySettings[difficulty].pepperonis) * 100);

    document.getElementById('placed').textContent = pepperonis.length;
    document.getElementById('balance').textContent = Math.round(balance) + '%';
    document.getElementById('score').textContent = calculateFinalScore();
    document.getElementById('progress-fill').style.width = progress + '%';
}

function autoComplete() {
    if (!gameStarted) return;

    const bank = document.getElementById('pepperoni-bank');
    const availablePepperonis = bank.querySelectorAll('.pepperoni');
    const sectionsToFill = [
        { angle: 0, radius: 0.6 },    // Sección 1
        { angle: 60, radius: 0.65 },  // Sección 2
        { angle: 120, radius: 0.7 },  // Sección 2
        { angle: 180, radius: 0.6 },  // Sección 3
        { angle: 240, radius: 0.65 }, // Sección 3
        { angle: 300, radius: 0.7 }   // Sección 1
    ];

    availablePepperonis.forEach((pepperoni, index) => {
        if (index < sectionsToFill.length) {
            const section = sectionsToFill[index];
            const centerX = 225;
            const centerY = 225;
            const radius = section.radius * 180;

            const x = centerX + Math.cos(section.angle * Math.PI / 180) * radius - 14;
            const y = centerY + Math.sin(section.angle * Math.PI / 180) * radius - 14;

            const newPepperoni = pepperoni.cloneNode(true);
            newPepperoni.style.position = 'absolute';
            newPepperoni.style.left = x + 'px';
            newPepperoni.style.top = y + 'px';
            newPepperoni.style.margin = '0';

            newPepperoni.addEventListener('dragstart', handleDragStart);
            newPepperoni.addEventListener('dragend', handleDragEnd);
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
    const pepperonis = document.querySelectorAll('.pizza .pepperoni');

    // Primer pepperoni
    if (pepperonis.length === 1 && !achievements.includes('first')) {
        achievements.push('first');
        showAchievement('¡Primer Pepperoni!');
    }

    // 10 pepperonis
    if (pepperonis.length === 10 && !achievements.includes('ten')) {
        achievements.push('ten');
        showAchievement('¡Especialista en Pepperoni!');
    }

    // 20 pepperonis
    if (pepperonis.length === 20 && !achievements.includes('twenty')) {
        achievements.push('twenty');
        showAchievement('¡Maestro Pizzero!');
    }
}

function showAchievement(text) {
    const achievement = document.getElementById('achievement');
    achievement.textContent = '🏆 ' + text;
    achievement.classList.add('show');

    setTimeout(() => {
        achievement.classList.remove('show');
    }, 3000);
}

function playSound(type) {
    // Simulación de efectos de sonido con vibración en dispositivos móviles
    if (navigator.vibrate) {
        switch (type) {
            case 'place':
                navigator.vibrate(50);
                break;
            case 'success':
                navigator.vibrate([100, 50, 100]);
                break;
            case 'error':
                navigator.vibrate(200);
                break;
            case 'remove':
                navigator.vibrate(30);
                break;
        }
    }
}

function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${type} show`;

    setTimeout(() => {
        feedback.classList.remove('show');
    }, 4000);
}

function resetGame() {
    // Limpiar pizza
    document.querySelectorAll('.pizza .pepperoni').forEach(p => p.remove());

    // Limpiar banco
    const bank = document.getElementById('pepperoni-bank');
    const bankPepperonis = bank.querySelectorAll('.pepperoni');
    bankPepperonis.forEach(p => p.remove());

    // Reiniciar contadores
    placedPepperonis = 0;
    pepperoniCount = 0;
    gameScore = 0;
    achievements = [];

    // Reiniciar timer
    if (timerInterval) clearInterval(timerInterval);
    gameTimer = difficultySettings[difficulty].time;
    updateTimerDisplay();
    gameStarted = false;

    // Agregar pepperonis según dificultad
    addPepperonis();
    updateScore();

    showFeedback('¡Juego reiniciado! Presiona cualquier botón para comenzar.', 'success');
}

// Event listeners para iniciar el juego
document.addEventListener('click', function (e) {
    if (!gameStarted && e.target.tagName !== 'BUTTON' && !e.target.classList.contains('difficulty-btn')) {
        startTimer();
    }
});

// Inicializar el juego
document.addEventListener('DOMContentLoaded', function () {
    initGame();
});

// Prevenir scroll en dispositivos móviles durante drag
document.addEventListener('touchmove', function (e) {
    if (draggedElement) {
        e.preventDefault();
    }
}, { passive: false });

// Inicializar
// initGame();