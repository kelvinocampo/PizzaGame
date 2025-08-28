let draggedElement = null;
let pepperoniCount = 0;
let placedPepperonis = 0;
let gameScore = 0;
let difficulty = 'easy';
let gameTimer = 180;
let timerInterval = null;
let gameStarted = false;
let achievements = [];
let touchOffset = { x: 0, y: 0 };

const difficultySettings = {
    easy: { pepperonis: 15, time: 300, tolerance: 0.4 },
    medium: { pepperonis: 20, time: 240, tolerance: 0.3 },
    hard: { pepperonis: 25, time: 180, tolerance: 0.2 }
};

function initGame() {
    resetGame();
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    resetGame();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (gameStarted) return;
    
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
    const timerEl = document.getElementById('timer');
    
    if (timerEl) {
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

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

    document.querySelectorAll('.pepperoni').forEach(p => {
        p.draggable = false;
        p.style.opacity = '0.7';
        p.style.pointerEvents = 'none';
    });
}

function addPepperonis() {
    const bank = document.getElementById('pepperoni-bank');
    if (!bank) return;
    
    const existingPepperonis = bank.querySelectorAll('.pepperoni').length;
    const maxPepperonis = difficultySettings[difficulty].pepperonis;
    const toAdd = Math.min(12, maxPepperonis - existingPepperonis);

    for (let i = 0; i < toAdd; i++) {
        const pepperoni = createPepperoni();
        pepperoni.style.position = 'relative';
        pepperoni.style.margin = '5px';
        bank.appendChild(pepperoni);
    }

    if (toAdd === 0 && existingPepperonis < maxPepperonis) {
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

    pepperoni.addEventListener('touchstart', handleTouchStart, { passive: false });
    pepperoni.addEventListener('touchmove', handleTouchMove, { passive: false });
    pepperoni.addEventListener('touchend', handleTouchEnd, { passive: false });

    return pepperoni;
}

// ===== EVENTOS DE ESCRITORIO =====
function handleDragStart(e) {
    if (!gameStarted) {
        e.preventDefault();
        return false;
    }

    draggedElement = this;
    this.classList.add('dragging');

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.add('active');
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragEnd(e) {
    if (this.classList.contains('dragging')) {
        this.classList.remove('dragging');
    }
    
    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.remove('active');
    });
    
    if (draggedElement && !draggedElement.parentElement.classList.contains('pizza')) {
        draggedElement = null;
    }
}

// ===== EVENTOS TÁCTILES MEJORADOS =====
function handleTouchStart(e) {
    if (!gameStarted) {
        e.preventDefault();
        return;
    }

    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = this.getBoundingClientRect();
    
    touchOffset.x = touch.clientX - rect.left;
    touchOffset.y = touch.clientY - rect.top;
    
    draggedElement = this;
    this.classList.add('dragging');
    
    this.style.position = 'fixed';
    this.style.zIndex = '1000';
    this.style.pointerEvents = 'none';
    this.style.left = (touch.clientX - touchOffset.x) + 'px';
    this.style.top = (touch.clientY - touchOffset.y) + 'px';

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.add('active');
    });
}

function handleTouchMove(e) {
    if (!draggedElement || !gameStarted) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    
    draggedElement.style.left = (touch.clientX - touchOffset.x) + 'px';
    draggedElement.style.top = (touch.clientY - touchOffset.y) + 'px';
}

function handleTouchEnd(e) {
    if (!draggedElement || !gameStarted) {
        resetDraggedElement();
        return;
    }

    e.preventDefault();

    const touch = e.changedTouches[0];
    const pizza = document.querySelector('.pizza');
    if (!pizza) {
        resetDraggedElement();
        return;
    }

    const pizzaRect = pizza.getBoundingClientRect();
    // Verifica si el punto final del touch está dentro de la pizza
    if (
        touch.clientX >= pizzaRect.left &&
        touch.clientX <= pizzaRect.right &&
        touch.clientY >= pizzaRect.top &&
        touch.clientY <= pizzaRect.bottom
    ) {
        const centerX = pizzaRect.width / 2;
        const centerY = pizzaRect.height / 2;
        const x = touch.clientX - pizzaRect.left;
        const y = touch.clientY - pizzaRect.top;

        if (isValidPosition(x, y, centerX, centerY)) {
            const pepperoniSize = 28;
            const adjustedX = x - pepperoniSize / 2;
            const adjustedY = y - pepperoniSize / 2;
            placePepperoniAt(adjustedX, adjustedY);
        } else {
            showFeedback('Posición no válida para el pepperoni', 'error');
            resetDraggedElement();
        }
    } else {
        // Si el usuario suelta fuera de la pizza, regresa el pepperoni al banco
        resetDraggedElement();
    }
}

function resetDraggedElement() {
    if (draggedElement) {
        if (!draggedElement.parentElement.classList.contains('pizza')) {
            draggedElement.style.position = '';
            draggedElement.style.left = '';
            draggedElement.style.top = '';
        }
        
        draggedElement.classList.remove('dragging');
        draggedElement.style.zIndex = '';
        draggedElement.style.pointerEvents = '';
        
        draggedElement = null;
    }

    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.remove('active');
    });
    
    touchOffset = { x: 0, y: 0 };
}

// ===== CONFIGURACIÓN DE LA PIZZA COMO ZONA DE DROP =====
function setupPizzaDropZone() {
    const pizza = document.querySelector('.pizza');
    if (!pizza) return;

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
                placePepperoniAt(x, y);
            } else {
                showFeedback('No puedes colocar pepperonis en el centro o fuera de la pizza', 'error');
                resetDraggedElement();
            }
        }
    });
}

function isValidPosition(x, y, centerX, centerY) {
    const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const pizzaRadius = centerX * 0.9;
    const centerRadius = pizzaRadius * 0.25;

    return distanceFromCenter > centerRadius && distanceFromCenter < pizzaRadius;
}

function placePepperoniAt(x, y) {
    if (!draggedElement) return;
    
    const pizza = document.querySelector('.pizza');
    if (!pizza) return;

    const newPepperoni = document.createElement('div');
    newPepperoni.className = 'pepperoni';
    newPepperoni.draggable = true;
    newPepperoni.id = draggedElement.id;
    newPepperoni.style.position = 'absolute';
    newPepperoni.style.left = x + 'px';
    newPepperoni.style.top = y + 'px';
    newPepperoni.style.margin = '0';

    newPepperoni.addEventListener('dragstart', handleDragStart);
    newPepperoni.addEventListener('dragend', handleDragEnd);
    newPepperoni.addEventListener('dblclick', removePepperoni);
    newPepperoni.addEventListener('touchstart', handleTouchStart, { passive: false });
    newPepperoni.addEventListener('touchmove', handleTouchMove, { passive: false });
    newPepperoni.addEventListener('touchend', handleTouchEnd, { passive: false });

    pizza.appendChild(newPepperoni);
    
    if (draggedElement.parentElement) {
        draggedElement.remove();
    }
    
    placedPepperonis++;
    updateScore();
    checkAchievements();
    showFeedback('¡Pepperoni colocado correctamente!', 'success');
    playSound('place');
    
    draggedElement = null;
    document.querySelectorAll('.zone-highlight').forEach(zone => {
        zone.classList.remove('active');
    });
}

function removePepperoni() {
    if (!gameStarted) return;

    this.remove();
    placedPepperonis--;
    updateScore();
    showFeedback('Pepperoni removido', 'warning');
    playSound('remove');

    const bank = document.getElementById('pepperoni-bank');
    if (bank) {
        const pepperoni = createPepperoni();
        pepperoni.style.position = 'relative';
        pepperoni.style.margin = '5px';
        bank.appendChild(pepperoni);
    }
}

function getSection(x, y, centerX, centerY) {
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    angle = (angle + 360) % 360;

    if (angle >= 270 || angle < 30) return 1;
    if (angle >= 30 && angle < 150) return 2;
    if (angle >= 150 && angle < 270) return 3;
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
    const pizza = document.querySelector('.pizza');
    const pepperonis = pizza ? pizza.querySelectorAll('.pepperoni') : [];
    
    if (pepperonis.length === 0) return gameScore;

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
            const x = pepRect.left - rect.left + 14;
            const y = pepRect.top - rect.top + 14;

            const section = getSection(x, y, centerX, centerY);
            if (section) sections[section]++;
        });
    }

    const balance = calculateBalanceScore(sections, pepperonis.length);
    const progress = Math.min(100, (pepperonis.length / difficultySettings[difficulty].pepperonis) * 100);

    const placedEl = document.getElementById('placed');
    const balanceEl = document.getElementById('balance');
    const scoreEl = document.getElementById('score');
    const progressEl = document.getElementById('progress-fill');

    if (placedEl) placedEl.textContent = pepperonis.length;
    if (balanceEl) balanceEl.textContent = Math.round(balance) + '%';
    if (scoreEl) scoreEl.textContent = calculateFinalScore();
    if (progressEl) progressEl.style.width = progress + '%';
}

function autoComplete() {
    if (!gameStarted) return;

    const bank = document.getElementById('pepperoni-bank');
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

    const centerX = 225;
    const centerY = 225;

    availablePepperonis.forEach((pepperoni, index) => {
        if (index < sectionsToFill.length) {
            const section = sectionsToFill[index];
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
            newPepperoni.addEventListener('touchstart', handleTouchStart, { passive: false });
            newPepperoni.addEventListener('touchmove', handleTouchMove, { passive: false });
            newPepperoni.addEventListener('touchend', handleTouchEnd, { passive: false });

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
    const achievement = document.getElementById('achievement');
    if (achievement) {
        achievement.textContent = '🏆 ' + text;
        achievement.classList.add('show');

        setTimeout(() => {
            achievement.classList.remove('show');
        }, 3000);
    }
}

function playSound(type) {
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
            case 'autoComplete':
                navigator.vibrate([50, 50, 50]);
                break;
        }
    }
}

function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.textContent = message;
        feedback.className = `feedback ${type} show`;

        setTimeout(() => {
            feedback.classList.remove('show');
        }, 4000);
    }
}

function resetGame() {
    const pizza = document.querySelector('.pizza');
    if (pizza) {
        pizza.querySelectorAll('.pepperoni').forEach(p => p.remove());
    }

    const bank = document.getElementById('pepperoni-bank');
    if (bank) {
        bank.querySelectorAll('.pepperoni').forEach(p => p.remove());
    }

    placedPepperonis = 0;
    pepperoniCount = 0;
    gameScore = 0;
    achievements = [];
    draggedElement = null;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameTimer = difficultySettings[difficulty].time;
    updateTimerDisplay();
    gameStarted = false;

    addPepperonis();
    updateScore();

    showFeedback('¡Juego reiniciado! Haz clic en cualquier lugar para comenzar.', 'success');
}

// ===== EVENT LISTENERS =====
document.addEventListener('click', function (e) {
    if (!gameStarted && 
        e.target.tagName !== 'BUTTON' && 
        !e.target.classList.contains('difficulty-btn') &&
        !e.target.classList.contains('pepperoni')) {
        startTimer();
    }
});

document.addEventListener('touchmove', function (e) {
    if (draggedElement) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchstart', function (e) {
    if (draggedElement && !e.target.classList.contains('pepperoni')) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('DOMContentLoaded', function () {
    setupPizzaDropZone();
    initGame();
});

document.addEventListener('mouseleave', function() {
    if (draggedElement) {
        resetDraggedElement();
    }
});

window.setDifficulty = setDifficulty;
window.addPepperonis = addPepperonis;
window.checkDistribution = checkDistribution;
window.autoComplete = autoComplete;
window.resetGame = resetGame;