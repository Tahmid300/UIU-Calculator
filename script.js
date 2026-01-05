// script.js - v6.0 Auto Theme & UCAM Cloud

// --- CONFIGURATION ---
const GEMINI_API_KEY = "AIzaSyBxVewAVVclZCQ5F5BixmlNZVYtt2vRCzs"; 

// --- Global State ---
let courseCount = 0;
let activeWaiver = 0;

document.addEventListener('DOMContentLoaded', () => {
    if(window.lucide) lucide.createIcons();
    
    // Load Saved Color Theme
    const savedColor = localStorage.getItem('theme-color') || 'orange';
    setTheme(savedColor);

    // Load Saved Mode (Light/Dark)
    const savedMode = localStorage.getItem('theme-mode') || 'dark';
    if(savedMode === 'light') enableLightMode();

    // Initialization
    addCourseRow();
    setupTabs();
    setupEventListeners();
    updateTargetCredits(); // Init target
});

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active-tab'));
            tab.classList.add('active-tab');
            contents.forEach(c => c.classList.add('hidden'));
            document.getElementById(`content-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });
}

function setupEventListeners() {
    document.getElementById('add-more-btn').addEventListener('click', () => addCourseRow(false));
    document.getElementById('retake-btn').addEventListener('click', () => addCourseRow(true));
    document.getElementById('calculate-cgpa-btn').addEventListener('click', calculateCGPA);
    document.getElementById('calc-target-btn').addEventListener('click', calculateFutureTarget);
    document.getElementById('target-dept-select').addEventListener('change', updateTargetCredits);
    document.getElementById('fee-dept-select').addEventListener('change', updateFeeRate);
    document.getElementById('calculate-fee-btn').addEventListener('click', calculateFees);
    document.getElementById('ask-ai-btn').addEventListener('click', askGeminiAdvisor);
    document.getElementById('mode-toggle-btn').addEventListener('click', toggleMode);
}

// --- Theme & Mode Engine ---
function setTheme(color) {
    const root = document.documentElement;
    localStorage.setItem('theme-color', color);
    const themes = {
        orange: '#f26522',
        cyan:   '#22d3ee',
        green:  '#10b981',
        purple: '#d946ef'
    };
    root.style.setProperty('--primary', themes[color]);
}

function toggleMode() {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
        disableLightMode();
    } else {
        enableLightMode();
    }
}

function enableLightMode() {
    document.documentElement.classList.add('light');
    localStorage.setItem('theme-mode', 'light');
    document.getElementById('mode-text').textContent = "DARK";
    if(window.lucide) lucide.createIcons();
}

function disableLightMode() {
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme-mode', 'dark');
    document.getElementById('mode-text').textContent = "LIGHT";
    if(window.lucide) lucide.createIcons();
}

// --- Future Target Dept Logic ---
function updateTargetCredits() {
    const select = document.getElementById('target-dept-select');
    const val = select.value;
    const input = document.getElementById('degree-total-credits');
    if(val && val !== 'custom') {
        input.value = val;
    } else if (val === 'custom') {
        input.value = '';
        input.placeholder = "Enter Credits";
        input.focus();
    }
}

// --- Course Management ---
function getCourseHTML(count, isRetake) {
    const border = isRetake ? 'border-yellow-500/30' : 'border-[var(--border-color)]';
    const bg = isRetake ? 'bg-yellow-500/5' : 'bg-[var(--input-bg)]';
    const label = isRetake 
        ? `<span class="text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-widest text-[10px]">RETAKE</span>` 
        : `<span class="text-[var(--primary)] font-bold uppercase tracking-widest text-[10px]">COURSE ${count}</span>`;
    
    let retakeSelect = isRetake ? `
        <div class="col-span-1"><select class="old-grade-select neon-input text-xs p-2">
            <option value="" disabled selected>OLD</option><option value="0.00">F</option><option value="1.00">D</option><option value="1.33">D+</option><option value="1.67">C-</option><option value="2.00">C</option><option value="2.33">C+</option><option value="2.67">B-</option>
        </select></div>` : '';

    return `
        <div class="course-row grid grid-cols-5 gap-2 p-3 rounded-lg border ${border} ${bg} items-center animate-fade-in mb-2" data-type="${isRetake ? 'retake' : 'regular'}">
            <div class="col-span-5 flex justify-between items-center border-b border-[var(--border-color)] pb-1 mb-1">${label}<button class="remove-btn text-red-500 hover:text-red-400"><i data-lucide="x" class="w-3 h-3"></i></button></div>
            <div class="col-span-1"><select class="credit-select neon-input text-xs p-2"><option value="3">3.0</option><option value="1">1.0</option><option value="1.5">1.5</option><option value="2">2.0</option><option value="4.5">4.5</option></select></div>
            ${retakeSelect}
            <div class="col-span-${isRetake ? '3' : '4'}"><select class="grade-select neon-input text-xs p-2"><option value="" disabled selected>GRADE</option><option value="4.00">A (4.00)</option><option value="3.67">A- (3.67)</option><option value="3.33">B+ (3.33)</option><option value="3.00">B (3.00)</option><option value="2.67">B- (2.67)</option><option value="2.33">C+ (2.33)</option><option value="2.00">C (2.00)</option><option value="1.67">C- (1.67)</option><option value="1.33">D+ (1.33)</option><option value="1.00">D (1.00)</option><option value="0.00">F (0.00)</option></select></div>
        </div>
    `;
}

function addCourseRow(isRetake = false) {
    if(!isRetake) courseCount++;
    const container = document.getElementById('courses-container');
    container.insertAdjacentHTML('beforeend', getCourseHTML(courseCount, isRetake));
    const newRow = container.lastElementChild;
    if(window.lucide) lucide.createIcons();
    newRow.querySelector('.remove-btn').addEventListener('click', function() { this.closest('.course-row').remove(); updateSummary(); });
    newRow.querySelector('.credit-select').addEventListener('change', updateSummary);
    updateSummary();
}

function updateSummary() {
    let total = 0;
    document.querySelectorAll('.course-row').forEach(row => total += parseFloat(row.querySelector('.credit-select').value) || 0);
    document.getElementById('total-new-credits').textContent = total + ' Cr';
}

// --- Logic ---
function calculateCGPA() {
    const prevCr = parseFloat(document.getElementById('completed-credits').value) || 0;
    const prevGPA = parseFloat(document.getElementById('current-cgpa').value) || 0;
    let totalPoints = prevCr * prevGPA, totalCr = prevCr, semPoints = 0, semCr = 0;

    document.querySelectorAll('.course-row').forEach(row => {
        const cr = parseFloat(row.querySelector('.credit-select').value);
        const gr = parseFloat(row.querySelector('.grade-select').value);
        if(!isNaN(cr) && !isNaN(gr)) {
            semPoints += (cr * gr); semCr += cr;
            if(row.dataset.type === 'retake') {
                const oldGr = parseFloat(row.querySelector('.old-grade-select').value) || 0;
                totalPoints -= (cr * oldGr);
            } else totalCr += cr;
        }
    });

    totalPoints += semPoints;
    const finalCGPA = totalCr > 0 ? (totalPoints / totalCr) : 0;
    const semGPA = semCr > 0 ? (semPoints / semCr) : 0;

    document.getElementById('result-final-cgpa').textContent = finalCGPA.toFixed(2);
    document.getElementById('result-semester-gpa').textContent = semGPA.toFixed(2);
    document.getElementById('result-total-credits').textContent = totalCr;
    return { finalCGPA, semGPA, totalCr, prevGPA };
}

function calculateFutureTarget() {
    const target = parseFloat(document.getElementById('target-cgpa-input').value);
    const degreeTotal = parseFloat(document.getElementById('degree-total-credits').value);
    const { totalCr, finalCGPA } = calculateCGPA();
    const msgBox = document.getElementById('target-message');
    document.getElementById('target-result-box').classList.remove('hidden');

    if(!target || !degreeTotal) { msgBox.innerHTML = "<span class='text-red-400'>MISSING INPUT</span>"; return; }
    
    const remainingCr = degreeTotal - totalCr;
    if(remainingCr <= 0) { msgBox.innerHTML = "DEGREE COMPLETED!"; return; }

    const neededPoints = (degreeTotal * target) - (totalCr * finalCGPA);
    const requiredAvg = neededPoints / remainingCr;

    if(requiredAvg > 4.00) msgBox.innerHTML = `⚠️ IMPOSSIBLE: Need ${requiredAvg.toFixed(2)} GPA`;
    else if (requiredAvg <= 0) msgBox.innerHTML = `ALREADY SECURED!`;
    else msgBox.innerHTML = `REQ AVG: ${requiredAvg.toFixed(2)} / REMAINING ${remainingCr} CR`;
}

// --- AI Advisor ---
async function askGeminiAdvisor() {
    const btn = document.getElementById('ask-ai-btn');
    const responseArea = document.getElementById('ai-response-area');
    const { finalCGPA, semGPA, totalCr, prevGPA } = calculateCGPA();
    
    const deptSelect = document.getElementById('target-dept-select');
    const deptName = deptSelect.value ? deptSelect.options[deptSelect.selectedIndex].text : "Unknown";

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> CONNECTING...`;
    
    const prompt = `Act as an academic advisor for a United International University (UIU) student. Dept: ${deptName}. Current CGPA: ${finalCGPA.toFixed(2)}. This Semester: ${semGPA.toFixed(2)}. Completed Credits: ${totalCr}. Give a short, strict but helpful roadmap to improve. Format in Markdown. Max 100 words.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        responseArea.innerHTML = marked.parse(aiText);
        responseArea.classList.remove('hidden');
    } catch (error) {
        responseArea.innerHTML = `<span class="text-red-400">AI ERROR: Check API Key.</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="brain-circuit" class="w-5 h-5"></i> GENERATE ROADMAP`;
        if(window.lucide) lucide.createIcons();
    }
}

// --- Fees ---
function updateFeeRate() {
    const val = document.getElementById('fee-dept-select').value;
    document.getElementById('per-credit-rate').value = val;
}
function setWaiver(val) { document.getElementById('custom-waiver').value = val; activeWaiver = val; }
function calculateFees() {
    const rate = parseFloat(document.getElementById('per-credit-rate').value)||0, newCr = parseFloat(document.getElementById('new-credit').value)||0, retakeCr = parseFloat(document.getElementById('retake-credit').value)||0, waiver = parseFloat(document.getElementById('custom-waiver').value)||0;
    const total = (newCr * rate * (1 - waiver/100)) + (retakeCr * rate * 0.5) + 5000;
    document.getElementById('fee-total').textContent = total.toLocaleString() + ' Tk';
    document.getElementById('fee-tuition').textContent = (newCr * rate).toLocaleString() + ' Tk';
    document.getElementById('fee-discount').textContent = '-' + ((newCr * rate * waiver)/100).toLocaleString() + ' Tk';
    document.getElementById('fee-retake').textContent = '+' + (retakeCr * rate * 0.5).toLocaleString() + ' Tk';
}