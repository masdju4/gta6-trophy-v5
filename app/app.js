// Main application logic for GTA VI Trophy Guide & Tracker
import { renderTrophyList, renderRoadmap } from './render.js';

// DOM Elements
const checklistContainer = document.getElementById('checklist-container');
const detailPanel = document.getElementById('detail-panel');
const roadmapContainer = document.getElementById('roadmap-container');
const totalCountElement = document.getElementById('total-count');
const totalTrophiesElement = document.getElementById('total-trophies');
const spoilerToggle = document.getElementById('spoiler-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const resetBtn = document.getElementById('reset-btn');
const checklistTab = document.getElementById('checklist-tab');
const roadmapTab = document.getElementById('roadmap-tab');

// State management
let trophies = [];
let earnedTrophies = new Set();
let currentView = 'checklist';
let currentFilter = 'all';
let currentSpoilerMode = false;

// Initialize the application
async function init() {
    try {
        // Load trophy data
        const response = await fetch('data/trophies.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch trophies: ${response.status}`);
        }
        trophies = await response.json();
        
        // Load saved progress
        loadProgress();
        
        // Parse URL hash for initial state
        parseUrlHash();
        
        // Render initial view
        renderApp();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update progress counters
        updateProgressCounters();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to load trophy data. Please ensure the app is running offline.');
    }
}

// Load saved progress from localStorage
function loadProgress() {
    const savedProgress = localStorage.getItem('gta6-tracker-v1');
    if (savedProgress) {
        try {
            const data = JSON.parse(savedProgress);
            earnedTrophies = new Set(data.earned || []);
            currentSpoilerMode = data.spoilerMode === true;
        } catch (e) {
            console.error('Failed to parse saved progress:', e);
        }
    }
}

// Save progress to localStorage
function saveProgress() {
    const data = {
        earned: Array.from(earnedTrophies),
        spoilerMode: currentSpoilerMode
    };
    localStorage.setItem('gta6-tracker-v1', JSON.stringify(data));
}

// Parse URL hash for state management
function parseUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    const params = new URLSearchParams(hash);
    
    // View state
    const view = params.get('view');
    if (view && (view === 'checklist' || view === 'roadmap')) {
        currentView = view;
    }
    
    // Filter state
    const filter = params.get('filter');
    if (filter) {
        currentFilter = filter;
    }
    
    // Spoiler state
    const spoilers = params.get('spoilers');
    if (spoilers) {
        currentSpoilerMode = spoilers === 'on';
    }
    
    // Update UI to reflect hash state
    updateUIState();
}

// Update UI state based on current values
function updateUIState() {
    // Update tabs
    if (currentView === 'checklist') {
        checklistTab.classList.add('active');
        roadmapTab.classList.remove('active');
    } else {
        checklistTab.classList.remove('active');
        roadmapTab.classList.add('active');
    }
    
    // Update filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.filter === currentFilter);
    });
    
    // Update spoiler toggle
    spoilerToggle.checked = currentSpoilerMode;
    
    // Update URL hash
    updateUrlHash();
}

// Update URL hash with current state
function updateUrlHash() {
    const params = new URLSearchParams();
    
    if (currentView !== 'checklist') {
        params.set('view', currentView);
    }
    
    if (currentFilter !== 'all') {
        params.set('filter', currentFilter);
    }
    
    if (currentSpoilerMode) {
        params.set('spoilers', 'on');
    }
    
    window.location.hash = params.toString();
}

// Render the entire application
function renderApp() {
    // Update UI state
    updateUIState();
    
    // Render appropriate view
    if (currentView === 'checklist') {
        renderTrophyList(
            checklistContainer, 
            trophies, 
            earnedTrophies, 
            currentFilter, 
            currentSpoilerMode
        );
        detailPanel.innerHTML = '<h3 class="detail-panel-title">Trophy Details</h3><p>Select a trophy to view details.</p>';
    } else {
        renderRoadmap(roadmapContainer, trophies, earnedTrophies);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Tab switching
    checklistTab.addEventListener('click', () => {
        currentView = 'checklist';
        renderApp();
    });
    
    roadmapTab.addEventListener('click', () => {
        currentView = 'roadmap';
        renderApp();
    });
    
    // Spoiler toggle
    spoilerToggle.addEventListener('change', (e) => {
        currentSpoilerMode = e.target.checked;
        saveProgress();
        renderApp();
    });
    
    // Export button
    exportBtn.addEventListener('click', exportProgress);
    
    // Import button
    importBtn.addEventListener('click', () => {
        importInput.click();
    });
    
    // Import input
    importInput.addEventListener('change', handleImport);
    
    // Reset button
    resetBtn.addEventListener('click', resetProgress);
    
    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            renderApp();
        });
    });
    
    // Hash change listener
    window.addEventListener('hashchange', parseUrlHash);
}

// Export progress to JSON file
function exportProgress() {
    const data = {
        earned: Array.from(earnedTrophies),
        spoilerMode: currentSpoilerMode
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Handle import progress from file
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data.earned)) {
                earnedTrophies = new Set(data.earned);
                currentSpoilerMode = data.spoilerMode === true;
                saveProgress();
                renderApp();
                updateProgressCounters();
            }
        } catch (error) {
            console.error('Failed to import progress:', error);
            alert('Failed to import progress. Invalid file format.');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Reset all progress
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        earnedTrophies.clear();
        saveProgress();
        renderApp();
        updateProgressCounters();
    }
}

// Update progress counters in header
function updateProgressCounters() {
    totalCountElement.textContent = earnedTrophies.size;
    totalTrophiesElement.textContent = trophies.length;
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Trophy rendering functions
export function renderTrophyList(container, trophies, earnedTrophies, filter, spoilerMode) {
    // Clear container
    container.innerHTML = '';
    
    // Filter trophies based on selection
    let filteredTrophies = trophies;
    if (filter !== 'all') {
        if (filter === 'missable') {
            filteredTrophies = trophies.filter(t => t.missable === true);
        } else if (filter === 'unearned') {
            filteredTrophies = trophies.filter(t => !earnedTrophies.has(t.id));
        } else {
            filteredTrophies = trophies.filter(t => t.kind === filter);
        }
    }
    
    // Create trophy items
    filteredTrophies.forEach(trophy => {
        const isEarned = earnedTrophies.has(trophy.id);
        const isSpoilerHidden = spoilerMode && !isEarned && trophy.kind === 'story';
        
        const trophyElement = document.createElement('div');
        trophyElement.className = `trophy-item ${trophy.missable ? 'missable' : ''} ${isSpoilerHidden ? 'spoiler-hidden' : ''}`;
        trophyElement.dataset.trophyId = trophy.id;
        
        // Grade badge
        const gradeClass = `grade-${trophy.grade}-badge`;
        const gradeBadge = document.createElement('span');
        gradeBadge.className = `trophy-grade ${gradeClass}`;
        gradeBadge.textContent = trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
        
        // Trophy header
        const header = document.createElement('div');
        header.className = 'trophy-header';
        
        const name = document.createElement('h3');
        name.className = 'trophy-name';
        name.textContent = trophy.name;
        
        header.appendChild(gradeBadge);
        header.appendChild(name);
        
        // Description
        const description = document.createElement('p');
        description.className = 'trophy-description';
        description.textContent = isSpoilerHidden ? '??? (Spoiler Mode)' : trophy.description;
        
        // Checkbox
        const checkContainer = document.createElement('div');
        checkContainer.className = 'trophy-check';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `trophy-${trophy.id}`;
        checkbox.checked = isEarned;
        
        const label = document.createElement('label');
        label.htmlFor = `trophy-${trophy.id}`;
        label.textContent = 'Mark as earned';
        
        checkContainer.appendChild(checkbox);
        checkContainer.appendChild(label);
        
        // Add event listener for checkbox
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                earnedTrophies.add(trophy.id);
            } else {
                earnedTrophies.delete(trophy.id);
            }
            saveProgress();
            renderApp();
            updateProgressCounters();
        });
        
        // Click handler for trophy item
        trophyElement.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== label) {
                showTrophyDetail(trophy);
            }
        });
        
        // Assemble trophy item
        trophyElement.appendChild(header);
        trophyElement.appendChild(description);
        trophyElement.appendChild(checkContainer);
        
        container.appendChild(trophyElement);
    });
}

export function renderRoadmap(container, trophies, earnedTrophies) {
    // Clear container
    container.innerHTML = '';
    
    // Group trophies by stage
    const stages = {};
    trophies.forEach(trophy => {
        const stage = trophy.stage;
        if (!stages[stage]) {
            stages[stage] = [];
        }
        stages[stage].push(trophy);
    });
    
    // Sort stages numerically
    const sortedStages = Object.keys(stages).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Create stage cards
    sortedStages.forEach(stageNum => {
        const stageTrophies = stages[stageNum];
        const stageElement = document.createElement('div');
        stageElement.className = 'roadmap-stage';
        
        const stageNumber = document.createElement('div');
        stageNumber.className = 'stage-number';
        stageNumber.textContent = stageNum;
        
        const stageTitle = document.createElement('h3');
        stageTitle.textContent = `Stage ${stageNum}`;
        
        const stageDescription = document.createElement('p');
        stageDescription.textContent = getStageDescription(parseInt(stageNum));
        
        stageElement.appendChild(stageNumber);
        stageElement.appendChild(stageTitle);
        stageElement.appendChild(stageDescription);
        
        // Add trophy list for this stage
        const trophyList = document.createElement('div');
        trophyList.className = 'stage-trophies';
        
        stageTrophies.forEach(trophy => {
            const isEarned = earnedTrophies.has(trophy.id);
            const trophyItem = document.createElement('div');
            trophyItem.className = `roadmap-trophy ${isEarned ? 'earned' : ''}`;
            trophyItem.textContent = trophy.name;
            
            // Add earned indicator
            if (isEarned) {
                trophyItem.style.color = '#00ff00';
            }
            
            trophyList.appendChild(trophyItem);
        });
        
        stageElement.appendChild(trophyList);
        container.appendChild(stageElement);
    });
}

function getStageDescription(stage) {
    const descriptions = {
        1: "Early game progression and main story introduction",
        2: "Beginner story missions and initial heists",
        3: "Mid-game story development and advanced missions",
        4: "Advanced story missions and activities",
        5: "Late game story missions and collectibles",
        6: "Final story missions and completion requirements"
    };
    return descriptions[stage] || "Game progression milestone";
}

function showTrophyDetail(trophy) {
    const detailContent = document.createElement('div');
    detailContent.className = 'detail-content';
    
    const title = document.createElement('h3');
    title.className = 'detail-panel-title';
    title.textContent = trophy.name;
    
    const description = document.createElement('div');
    description.className = 'detail-section';
    
    const descHeading = document.createElement('h3');
    descHeading.textContent = 'Description';
    const descText = document.createElement('p');
    descText.textContent = trophy.description;
    
    description.appendChild(descHeading);
    description.appendChild(descText);
    
    const gradeSection = document.createElement('div');
    gradeSection.className = 'detail-section';
    
    const gradeHeading = document.createElement('h3');
    gradeHeading.textContent = 'Grade';
    const gradeText = document.createElement('p');
    gradeText.textContent = trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
    
    gradeSection.appendChild(gradeHeading);
    gradeSection.appendChild(gradeText);
    
    const guideSection = document.createElement('div');
    guideSection.className = 'detail-section';
    
    const guideHeading = document.createElement('h3');
    guideHeading.textContent = 'Guide';
    const guideText = document.createElement('p');
    guideText.textContent = trophy.guide;
    
    guideSection.appendChild(guideHeading);
    guideSection.appendChild(guideText);
    
    const roadmapSection = document.createElement('div');
    roadmapSection.className = 'detail-section';
    
    const roadmapHeading = document.createElement('h3');
    roadmapHeading.textContent = 'Roadmap Note';
    const roadmapText = document.createElement('p');
    roadmapText.textContent = trophy.roadmapNote;
    
    roadmapSection.appendChild(roadmapHeading);
    roadmapSection.appendChild(roadmapText);
    
    const sourcesSection = document.createElement('div');
    sourcesSection.className = 'detail-section';
    
    const sourcesHeading = document.createElement('h3');
    sourcesHeading.textContent = 'Sources';
    
    const sourcesList = document.createElement('ul');
    sourcesList.className = 'sources-list';
    
    if (trophy.sources && trophy.sources.length > 0) {
        trophy.sources.forEach(source => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = source.url;
            link.textContent = source.label;
            link.target = '_blank';
            link.rel = 'noopener';
            listItem.appendChild(link);
            sourcesList.appendChild(listItem);
        });
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = 'No sources available';
        sourcesList.appendChild(listItem);
    }
    
    sourcesSection.appendChild(sourcesHeading);
    sourcesSection.appendChild(sourcesList);
    
    detailContent.appendChild(title);
    detailContent.appendChild(description);
    detailContent.appendChild(gradeSection);
    detailContent.appendChild(guideSection);
    detailContent.appendChild(roadmapSection);
    detailContent.appendChild(sourcesSection);
    
    detailPanel.innerHTML = '';
    detailPanel.appendChild(detailContent);
}

// Export functions for use in main app
export { renderTrophyList, renderRoadmap };