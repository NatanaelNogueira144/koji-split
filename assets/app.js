// Estado da Aplicação
const state = {
    storedCategories: JSON.parse(localStorage.getItem('@koji-split:categories')) ?? [],
    currentCategory: null,
    isOnKojiSplit: false,
    isRunning: false,
    startTime: 0,
    elapsed: 0,
    stoppedAt: 0,
    currentSegments: null,
    currentSegment: 0,
    timer: null
};

const TIME_FORMAT = /^(\d{2}):(\d{2})\.(\d{2})$/;

// Cache de Elementos DOM
const DOM = {
    categoriesArea: document.getElementById('categoriesArea'),
    categoriesList: document.getElementById('categoriesList'),
    categoryFormArea: document.getElementById('categoryFormArea'),
    categoryFormAreaTitle: document.getElementById('categoryFormAreaTitle'),
    categoryTitleInput: document.getElementById('categoryTitleInput'),
    segmentsEditList: document.getElementById('segmentsEditList'),
    kojiSplitArea: document.getElementById('kojiSplitArea'),
    mainTimer: document.getElementById('mainTimer'),
    segmentsList: document.getElementById('segmentsList')
};

// Utilitários de Armazenamento e Tempo
const Storage = {
    save: () => localStorage.setItem('@koji-split:categories', JSON.stringify(state.storedCategories))
};

const Time = {
    parse: (timeStr) => {
        const match = TIME_FORMAT.exec(timeStr);
        if (!match) throw new Error('Formato inválido: use mm:ss.cc');
        const [_, mm, ss, cc] = match;
        return (+mm * 60000) + (+ss * 1000) + (+cc * 10);
    },
    format: (ms) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const remS = s % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return `${m.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }
};

// UI – Controle de Áreas
const UI = {
    showCategoriesArea: () => {
        DOM.categoriesArea.style.display = 'block';
        DOM.categoryFormArea.style.display = 'none';
        DOM.kojiSplitArea.style.display = 'none';
    },
    showCategoryForm: () => {
        DOM.categoryFormArea.style.display = 'block';
        DOM.categoriesArea.style.display = 'none';
        DOM.kojiSplitArea.style.display = 'none';
    },
    showKojiSplit: () => {
        DOM.kojiSplitArea.style.display = 'block';
        DOM.categoriesArea.style.display = 'none';
        DOM.categoryFormArea.style.display = 'none';
    }
};

// Renderização de Categorias
function goToCategories() {
    if(state.isOnKojiSplit) resetTimer();

    state.isOnKojiSplit = false;
    state.currentCategory = null;
    state.isRunning = false;
    state.startTime = 0;
    state.elapsed = 0;
    state.currentSegments = null;
    state.currentSegment = 0;
    if(state.timer) clearInterval(state.timer);

    renderCategories();
    UI.showCategoriesArea();
}

function renderCategories() {
    DOM.categoriesList.innerHTML = '';
    if (state.storedCategories.length === 0) return;

    const table = document.createElement('table');
    table.classList.add('categories-table');
    table.appendChild(createTableHeader(['Title', 'Segments', 'Actions']));
    table.appendChild(createCategoriesBody(state.storedCategories));
    DOM.categoriesList.appendChild(table);
}

function createTableHeader(headers) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    return thead;
}

function createCategoriesBody(categories) {
    const tbody = document.createElement('tbody');
    categories.forEach((category, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${category.title}</td>
            <td>${category.segments.length}</td>
            <td>
                <div class="actions">
                    <button type="button" class="use-button">&#10004;</button>
                    <button type="button" class="edit-button">&#9998;</button>
                    <button type="button" class="delete-button">X</button>
                </div>
            </td>`;
        const [useButton, editButton, deleteButton] = tr.querySelectorAll('button');
        useButton.onclick = () => goToKojiSplit(index);
        editButton.onclick = () => goToEditCategory(index);
        deleteButton.onclick = () => {
            if (confirm('Are you sure you want to delete this category?')) {
                state.storedCategories.splice(index, 1);
                Storage.save();
                renderCategories();
            }
        };
        tbody.appendChild(tr);
    });
    return tbody;
}

// Renderização do Formulário de Categoria e Segmentos
function goToCreateCategory() {
    state.currentCategory = null;
    DOM.categoryFormAreaTitle.textContent = 'Create Category';
    DOM.categoryTitleInput.value = '';
    renderSegmentsTable([]);
    UI.showCategoryForm();
}

function goToEditCategory(index) {
    state.currentCategory = index;
    DOM.categoryFormAreaTitle.textContent = 'Edit Category';
    DOM.categoryTitleInput.value = state.storedCategories[index].title;
    renderSegmentsTable(state.storedCategories[index].segments);
    UI.showCategoryForm();
}

function renderSegmentsTable(segments = []) {
    DOM.segmentsEditList.innerHTML = '';
    const table = document.createElement('table');
    table.classList.add('segments-table');
    const tbody = document.createElement('tbody');
    segments.forEach((segment, idx) => tbody.appendChild(createSegmentRow(segment)));
    table.appendChild(tbody);
    DOM.segmentsEditList.appendChild(table);
}

function createSegmentRow(segment = {}) {
    const tr = document.createElement('tr');
    // Descrição
    const nameTd = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Description';
    nameInput.name = 'segments[][description]';
    nameInput.value = segment.description ?? '';
    nameTd.appendChild(nameInput);
    tr.appendChild(nameTd);
    // Split time
    const splitTd = document.createElement('td');
    const splitInput = document.createElement('input');
    splitInput.type = 'text';
    splitInput.placeholder = 'Split time';
    splitInput.name = 'segments[][splitTime]';
    splitInput.value = segment.splitTime ? Time.format(segment.splitTime) : '';
    splitInput.readOnly = true;
    splitTd.appendChild(splitInput);
    tr.appendChild(splitTd);
    // Segment time
    const segmentTd = document.createElement('td');
    const segmentInput = document.createElement('input');
    segmentInput.type = 'text';
    segmentInput.placeholder = 'Segment time';
    segmentInput.name = 'segments[][segmentTime]';
    segmentInput.value = segment.segmentTime ? Time.format(segment.segmentTime) : '';
    segmentInput.readOnly = true;
    segmentTd.appendChild(segmentInput);
    tr.appendChild(segmentTd);
    // Best time
    const bestTd = document.createElement('td');
    const bestInput = document.createElement('input');
    bestInput.type = 'text';
    bestInput.placeholder = 'Best time';
    bestInput.name = 'segments[][bestTime]';
    bestInput.value = segment.bestTime ? Time.format(segment.bestTime) : '';
    bestInput.readOnly = true;
    bestTd.appendChild(bestInput);
    tr.appendChild(bestTd);
    // Botão excluir segmento
    const actionTd = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add('delete-button');
    deleteButton.textContent = 'X';
    deleteButton.onclick = () => tr.remove();
    actionTd.appendChild(deleteButton);
    tr.appendChild(actionTd);

    return tr;
}

// Manipulação de Categorias
function submitCategoryForm(event) {
    event.preventDefault();
    try {
        const entries = [...(new FormData(event.target)).entries()];
        const category = { title: '', segments: [] };
        let descriptions = [], splitTimes = [], segmentTimes = [], bestTimes = [];
        for (const [key, value] of entries) {
            if (key === 'title') category.title = value;
            else if (key === 'segments[][description]') descriptions.push(value);
            else if (key === 'segments[][splitTime]') splitTimes.push(value ? Time.parse(value) : null);
            else if (key === 'segments[][segmentTime]') segmentTimes.push(value ? Time.parse(value) : null);
            else if (key === 'segments[][bestTime]') bestTimes.push(value ? Time.parse(value) : null);
        }
        for (let j = 0; j < descriptions.length; j++) {
            category.segments.push({
                description: descriptions[j],
                splitTime: splitTimes[j],
                segmentTime: segmentTimes[j],
                bestTime: bestTimes[j]
            });
        }
        validateCategory(category);
        if (state.currentCategory != null) {
            updateCategory(state.currentCategory, category);
            alert('The category was successfully updated!');
        } else {
            storeCategory(category);
            alert('The category was successfully created!');
        }
        UI.showCategoriesArea();
        renderCategories();
    } catch (e) {
        alert(e.message);
    }
}

function validateCategory(category) {
    let errors = [];
    if (!category.title) errors.push('Title is required!');
    if (!category.segments.length) errors.push('At least one segment is required!');
    else {
        for (let j = 0; j < category.segments.length; j++) {
            if (!category.segments[j].description)
                errors.push(`${j + 1}° segment description is required!`);
        }
    }
    if (errors.length) throw new Error('Could not submit:\n' + errors.join('\n'));
}

function storeCategory(category) {
    state.storedCategories.push(category);
    Storage.save();
}

function updateCategory(index, category) {
    state.storedCategories[index] = category;
    Storage.save();
}

// Botão para adicionar nova linha de segmento
function addSegmentRow() {
    const table = DOM.segmentsEditList.querySelector('table');
    if (table) table.querySelector('tbody').appendChild(createSegmentRow());
}

// Tela KojiSplit – Timer e Segmentos
function goToKojiSplit(index) {
    state.isOnKojiSplit = true;
    state.currentCategory = index;
    loadSegmentsFromCategory(index);
    state.currentSegment = 0;
    state.elapsed = 0;
    state.stoppedAt = 0;
    state.startTime = Date.now();
    UI.showKojiSplit();
    renderSegments();
    updateTimer();
}

function loadSegmentsFromCategory(index) {
    state.currentSegments = state.storedCategories[index]
        .segments.map(seg => ({ ...seg })); // Deep copy
}

function renderSegments() {
    let html = '';
    state.currentSegments.forEach((s, i) => {
        let cls = 'segment';

        const lastSegment = state.currentSegments.length - 1;
        const isFirstSegment = state.currentSegment <= 7;
        const isMiddleSegment = state.currentSegment >= 8 && state.currentSegment < lastSegment;
        const isLastSegment = state.currentSegment === lastSegment;

        const isNotLastSegment = i < lastSegment;
        const beforeWindow = i <= state.currentSegment - 8;
        const afterWindow = i > state.currentSegment;

        if (state.isRunning) {
            if (i === state.currentSegment) cls += ' active';
            if (state.currentSegment > i && s.bestTime && s.segmentTime && s.bestTime === s.segmentTime)
                cls += ' best';
        }

        if((isFirstSegment && i >= 8 && isNotLastSegment)
        || (isMiddleSegment && (beforeWindow || afterWindow) && isNotLastSegment)
        || (isLastSegment && i < state.currentSegment - 8)) 
            cls += ' hidden';

        html += `<div class="${cls}">
            ${s.description} <span>${s.splitTime ? Time.format(s.splitTime) : '-'}</span>
        </div>`;
    });
    DOM.segmentsList.innerHTML = html;
}

// Timer and Split Logic
function startTimer() {
    if (state.isRunning || state.currentSegment >= state.currentSegments.length) return;
    state.startTime = Date.now();
    state.timer = setInterval(updateTimer, 37);
    state.isRunning = true;
    renderSegments();
}

function updateTimer() {
    DOM.mainTimer.textContent = Time.format(state.elapsed + (Date.now() - state.startTime));
}

function split() {
    if (!state.isRunning || state.currentSegment >= state.currentSegments.length) return;
    const splitTime = state.elapsed + (Date.now() - state.startTime);
    const segmentTime = splitTime - state.currentSegments.slice(0, state.currentSegment).reduce(
        (sum, s) => sum + (s.segmentTime ?? 0), 0
    );
    let current = state.currentSegments[state.currentSegment];
    current.splitTime = splitTime;
    current.segmentTime = segmentTime;
    if (!current.bestTime || segmentTime < current.bestTime) {
        current.bestTime = segmentTime;
    }
    state.currentSegment++;
    renderSegments();
    if (state.currentSegment === state.currentSegments.length) stopTimer();
}

function stopTimer() {
    if (!state.isRunning) return;
    state.stoppedAt = Date.now();
    pauseTimer();
}

function pauseTimer() {
    if (!state.isRunning) return;
    state.elapsed += Date.now() - state.startTime;
    clearInterval(state.timer);
    state.isRunning = false;
}

function resetTimer() {
    if (state.currentSegments.at(-1).splitTime &&
        (!state.storedCategories[state.currentCategory].segments.at(-1).splitTime
        || state.currentSegments.at(-1).splitTime < state.storedCategories[state.currentCategory].segments.at(-1).splitTime)
    ) {
        if (confirm('Do you want to save the new personal best?')) {
            state.storedCategories[state.currentCategory].segments = state.currentSegments.map(s => ({ ...s }));
            Storage.save();
        }
    }
    if (state.currentSegment > 0) {
        if (confirm('Do you want to save the new best segments?')) {
            for (let i = 0; i < state.currentSegments.length; i++) {
                if (state.storedCategories[state.currentCategory].segments[i].bestTime >= state.currentSegments[i].bestTime) {
                    state.storedCategories[state.currentCategory].segments[i].bestTime = state.currentSegments[i].bestTime;
                }
            }
            Storage.save();
        }
    }
    state.elapsed = 0;
    state.currentSegment = 0;
    state.stoppedAt = 0;
    state.startTime = Date.now();
    clearInterval(state.timer);
    state.isRunning = false;
    updateTimer();
    loadSegmentsFromCategory(state.currentCategory);
    renderSegments();
}

function undoSplit() {
    if (state.currentSegment === 0) return;
    state.currentSegment--;
    state.currentSegments[state.currentSegment] = { ...state.storedCategories[state.currentCategory].segments[state.currentSegment] };
    if (state.currentSegment === state.currentSegments.length - 1) {
        state.elapsed += Date.now() - state.stoppedAt;
        startTimer();
    }
    renderSegments();
}

function skipSplit() {
    if (!state.isRunning || state.currentSegment >= state.currentSegments.length - 1) return;
    state.currentSegments[state.currentSegment].splitTime = null;
    state.currentSegments[state.currentSegment].segmentTime = null;
    state.currentSegment++;
    renderSegments();
}

// Eventos Globais
document.onkeyup = (e) => {
    if (!state.isOnKojiSplit) return;
    if (e.code === 'Space') {
        if (!state.isRunning) startTimer();
        else split();
    } else if (e.code === 'KeyR') {
        resetTimer();
    } else if (e.code === 'KeyP') {
        pauseTimer();
    } else if (e.code === 'ArrowLeft') {
        undoSplit();
    } else if (e.code === 'ArrowRight') {
        skipSplit();
    }
};

// Inicialização
renderCategories();
UI.showCategoriesArea();