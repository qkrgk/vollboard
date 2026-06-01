let playerCounter = 0;
const canvas = document.getElementById('pathCanvas');
const ctx = canvas.getContext('2d');

// 위치 및 경로 컬러 데이터 객체
let lastPositions = {
    'v_ball': { x: null, y: null, color: '#0d47a1' } 
};

let historyStack = [];
let dragStartState = null;

// 선수용 컬러 10선
const colorPalette = [
    '#3182ce', '#319795', '#38a169', '#dd6b20', '#b83280', 
    '#805ad5', '#e53e3e', '#008080', '#4a5568', '#d69e2e'
];

window.onload = () => {
    ctx.lineWidth = 3;
};

// 선수 등록
function addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    if (name === '') return;

    playerCounter++;
    const playerId = 'player_' + playerCounter;
    const playerColor = colorPalette[(playerCounter - 1) % colorPalette.length];
    lastPositions[playerId] = { x: null, y: null, color: playerColor };

    const poolItem = document.createElement('div');
    poolItem.className = 'pool-item';
    poolItem.id = 'container_' + playerId;

    const token = document.createElement('div');
    token.className = 'player-token';
    token.id = playerId;
    token.draggable = true;
    token.innerText = name;
    token.style.backgroundColor = playerColor;
    token.addEventListener('dragstart', dragStart);

    poolItem.appendChild(token);
    document.getElementById('playerListContainer').appendChild(poolItem);
    input.value = '';
    input.focus();
}

document.getElementById('playerName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addPlayer();
});

document.getElementById('v_ball').addEventListener('dragstart', dragStart);

function dragStart(e) {
    const token = e.target;
    e.dataTransfer.setData('text/plain', token.id);
    const rect = token.getBoundingClientRect();
    e.dataTransfer.setData('offsetX', e.clientX - rect.left);
    e.dataTransfer.setData('offsetY', e.clientY - rect.top);

    const backupPositions = JSON.parse(JSON.stringify(lastPositions));
    dragStartState = {
        id: token.id,
        parent: token.parentNode.id,
        position: token.style.position,
        left: token.style.left,
        top: token.style.top,
        lastPositions: backupPositions,
        canvasImage: ctx.getImageData(0, 0, canvas.width, canvas.height)
    };

    if (!e.shiftKey) {
        lastPositions[token.id].x = null;
        lastPositions[token.id].y = null;
    } else {
        if (token.style.position === 'absolute') {
            const courtRect = document.getElementById('courtZone').getBoundingClientRect();
            lastPositions[token.id].x = (rect.left + rect.right) / 2 - courtRect.left;
            lastPositions[token.id].y = (rect.top + rect.bottom) / 2 - courtRect.top;
        }
    }
}

function allowDrop(e) { e.preventDefault(); }

// 드롭 존 연산 및 다중 컬러 드로잉
function dropToCourt(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
    
    const token = document.getElementById(id);
    const courtZone = document.getElementById('courtZone');
    const courtRect = courtZone.getBoundingClientRect();
    
    let left = e.clientX - courtRect.left - offsetX;
    let top = e.clientY - courtRect.top - offsetY;

    const size = (id === 'v_ball') ? 40 : 45;
    left = Math.max(0, Math.min(left, courtRect.width - size));
    top = Math.max(0, Math.min(top, courtRect.height - size));

    const newX = left + (size / 2);
    const newY = top + (size / 2);

    if (e.shiftKey && lastPositions[id] && lastPositions[id].x !== null) {
        if (id === 'v_ball') {
            // 미카사 배구공 전용 노랑/파랑 교차 점선 그리기
            ctx.beginPath();
            ctx.moveTo(lastPositions[id].x, lastPositions[id].y);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = '#fffb00'; 
            ctx.setLineDash([8, 8]);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lastPositions[id].x, lastPositions[id].y);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = '#0d47a1';
            ctx.setLineDash([4, 12]);
            ctx.stroke();
        } else {
            // 선수는 본인 토큰과 매칭되는 실선 그리기
            ctx.beginPath();
            ctx.moveTo(lastPositions[id].x, lastPositions[id].y);
            ctx.lineTo(newX, newY);
            ctx.strokeStyle = lastPositions[id].color;
            ctx.setLineDash([]);
            ctx.stroke();
        }
    }

    lastPositions[id].x = newX;
    lastPositions[id].y = newY;

    if (dragStartState) {
        historyStack.push(dragStartState);
        dragStartState = null;
    }

    token.style.position = 'absolute';
    token.style.left = left + 'px';
    token.style.top = top + 'px';
    courtZone.appendChild(token);
}

function dropToPool(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const token = document.getElementById(id);
    if (dragStartState) { historyStack.push(dragStartState); dragStartState = null; }
    token.style.position = 'static';
    lastPositions[id].x = null; lastPositions[id].y = null;
    if (id !== 'v_ball') {
        document.getElementById('container_' + id).appendChild(token);
    } else {
        document.getElementById('playerPool').insertBefore(token, document.getElementById('playerPool').firstChild);
    }
}

// ↩️ Ctrl + Z
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
    }
});

function undo() {
    if (historyStack.length === 0) return;
    const previousState = historyStack.pop();
    const token = document.getElementById(previousState.id);
    const parentContainer = document.getElementById(previousState.parent);
    token.style.position = previousState.position;
    token.style.left = previousState.left;
    token.style.top = previousState.top;
    parentContainer.appendChild(token);
    lastPositions = previousState.lastPositions;
    ctx.putImageData(previousState.canvasImage, 0, 0);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let key in lastPositions) {
        lastPositions[key].x = null; lastPositions[key].y = null;
    }
}
