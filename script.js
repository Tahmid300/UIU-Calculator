// --- API Key and URL for Gemini (gemini-2.5-flash-preview-09-2025) ---
const API_KEY = "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// --- Core Application Logic ---

// State variables
let courseCount = 0;
let isRetakeHeaderAdded = false;

// Utility function for exponential backoff retry logic
async function fetchWithRetry(url, options, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status !== 429) {
                return response;
            }
            // If 429 (Too Many Requests), wait with exponential backoff
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("Max retries exceeded");
}


// Utility to display custom notification/modal (replaces alert())
function showNotification(title, message) {
    const modal = document.getElementById('notification-modal');
    const content = document.getElementById('notification-content');
    document.getElementById('notification-title').textContent = title;
    document.getElementById('notification-message').textContent = message;
    
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex', 'opacity-100');
    content.classList.remove('scale-90');
    content.classList.add('scale-100');
}

// Closes the notification modal
document.getElementById('close-notification').addEventListener('click', () => {
    const modal = document.getElementById('notification-modal');
    const content = document.getElementById('notification-content');
    
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-90');

    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
});

// --- Course Row Templates and UI Logic ---
function getCourseRowHTML(count) {
    return `
        <div class="course-grid course-row bg-gray-800 p-3 rounded-lg border border-gray-700" data-course-id="${count}">
            <span class="course-label text-cyan-400 font-semibold">Course ${count}</span>
            <select class="credit-select p-3 rounded-lg text-sm">
                <option value="">Credit</option>
                <option value="1">1.0</option>
                <option value="2">2.0</option>
                <option value="3">3.0</option>
                <option value="4.5">4.5</option>
            </select>
            <select class="grade-select p-3 rounded-lg text-sm">
                <option value="">Grade</option>
                <option value="4.00">A (4.00)</option>
                <option value="3.67">A- (3.67)</option>
                <option value="3.33">B+ (3.33)</option>
                <option value="3.00">B (3.00)</option>
                <option value="2.67">B- (2.67)</option>
                <option value="2.33">C+ (2.33)</option>
                <option value="2.00">C (2.00)</option>
                <option value="1.67">C- (1.67)</option>
                <option value="1.33">D+ (1.33)</option>
                <option value="1.00">D (1.00)</option>
                <option value="0.00">F (0.00)</option>
            </select>
            <button class="remove-btn text-red-400 hover:text-red-500 p-2 rounded-full transition duration-150">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </div>
    `;
}

function getRetakeRowHTML() {
    return `
        <div class="course-grid retake-grid retake-row bg-gray-800 p-3 rounded-lg border border-fuchsia-400/50" data-retake-id="${Date.now()}">
            <select class="credit-select p-3 rounded-lg text-sm">
                <option value="">Credit</option>
                <option value="1">1.0</option>
                <option value="2">2.0</option>
                <option value="3">3.0</option>
                <option value="4.5">4.5</option>
            </select>
            <select class="old-grade-select p-3 rounded-lg text-sm">
                <option value="">Old Grade</option>
                <option value="3.67">A-</option>
                <option value="3.33">B+</option>
                <option value="3.00">B</option>
                <option value="2.67">B-</option>
                <option value="2.33">C+</option>
                <option value="2.00">C</option>
                <option value="1.67">C-</option>
                <option value="1.33">D+</option>
                <option value="1.00">D</option>
                <option value="0.00">F</option>
            </select>
            <select class="grade-select p-3 rounded-lg text-sm">
                <option value="">New Grade</option>
                <option value="4.00">A</option>
                <option value="3.67">A-</option>
                <option value="3.33">B+</option>
                <option value="3.00">B</option>
                <option value="2.67">B-</option>
                <option value="2.33">C+</option>
                <option value="2.00">C</option>
                <option value="1.67">C-</option>
                <option value="1.33">D+</option>
                <option value="1.00">D</option>
                <option value="0.00">F</option>
            </select>
            <button class="remove-btn text-red-400 hover:text-red-500 p-2 rounded-full transition duration-150">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </div>
    `;
}

// Updates the course numbers dynamically
function updateCourseNumbers() {
    const courseLabels = document.querySelectorAll('.course-row:not(.retake-header) .course-label');
    courseLabels.forEach((label, index) => {
        label.textContent = `Course ${index + 1}`;
    });
    courseCount = courseLabels.length;
}

// Adds a new course row
function addCourseRow() {
    courseCount++;
    const coursesContainer = document.getElementById('courses-container');
    const newRow = document.createElement('div');
    newRow.innerHTML = getCourseRowHTML(courseCount);
    coursesContainer.appendChild(newRow.firstChild);
    
    // Re-initialize Lucide icons for the new row
    lucide.createIcons();
    
    // Attach remove listener
    newRow.querySelector('.remove-btn').addEventListener('click', function() {
        this.closest('.course-row').remove();
        updateCourseNumbers();
    });
}

// Adds a new retake course row
function addRetakeRow() {
    const coursesContainer = document.getElementById('courses-container');
    
    if (!isRetakeHeaderAdded) {
        const header = document.createElement('div');
        header.className = 'retake-header text-fuchsia-400 font-bold mt-4 pt-4 border-t border-fuchsia-400/50 course-grid retake-grid';
        header.innerHTML = '<span class="text-center">Credit</span><span class="text-center">Old Grade</span><span class="text-center">New Grade</span><span></span>';
        coursesContainer.appendChild(header);
        isRetakeHeaderAdded = true;
    }

    const newRow = document.createElement('div');
    newRow.innerHTML = getRetakeRowHTML();
    coursesContainer.appendChild(newRow.firstChild);
    
    // Re-initialize Lucide icons for the new row
    lucide.createIcons();

    // Attach remove listener
    newRow.querySelector('.remove-btn').addEventListener('click', function() {
        this.closest('.retake-row').remove();
        
        // Check if the header should be removed
        const remainingRetakes = document.querySelectorAll('.retake-row').length;
        const remainingHeader = document.querySelector('.retake-header');
        
        if (remainingRetakes === 0 && remainingHeader) {
            remainingHeader.remove();
            isRetakeHeaderAdded = false;
        }
    });
}

// --- CGPA Calculation Logic ---
function calculateCGPA() {
    const completedCredits = parseFloat(document.getElementById('completed-credits').value) || 0;
    const currentCGPA = parseFloat(document.getElementById('current-cgpa').value) || 0;

    if (isNaN(completedCredits) || completedCredits < 0) {
        showNotification('Input Error', 'Please enter a valid number for Completed Credits.');
        return { success: false };
    }
    if (isNaN(currentCGPA) || currentCGPA < 0 || currentCGPA > 4.5) {
        showNotification('Input Error', 'Please enter a valid Current CGPA (0.00 to 4.50).');
        return { success: false };
    }

    let totalPoints = completedCredits * currentCGPA;
    let totalCredits = completedCredits;
    let semesterCredits = 0;
    let semesterPoints = 0;
    let currentCoursesCount = 0;

    // 1. Calculate regular courses
    const regularCourses = document.querySelectorAll('.course-row:not(.retake-row)');
    
    regularCourses.forEach(row => {
        const credit = parseFloat(row.querySelector('.credit-select').value) || 0;
        // Note: We use 0 if grade is empty for projection purposes, but only count if credit > 0
        const grade = parseFloat(row.querySelector('.grade-select').value) || 0; 
        
        if (credit > 0) {
            totalCredits += credit;
            totalPoints += (credit * grade);
            semesterCredits += credit;
            semesterPoints += (credit * grade);
            currentCoursesCount++;
        }
    });

    // 2. Calculate retake courses
    const retakeCourses = document.querySelectorAll('.retake-row');
    
    retakeCourses.forEach(row => {
        const credit = parseFloat(row.querySelector('.credit-select').value) || 0;
        const oldGrade = parseFloat(row.querySelector('.old-grade-select').value) || 0;
        const newGrade = parseFloat(row.querySelector('.grade-select').value) || 0; // Use 0 for projection
        
        if (credit > 0) {
            // Update total points: subtract old points, add new points
            totalPoints = totalPoints - (credit * oldGrade) + (credit * newGrade);
            
            // Count towards semester points (as new grade is earned this semester)
            semesterCredits += credit;
            semesterPoints += (credit * newGrade);
            currentCoursesCount++;
        }
    });

    if (totalCredits === completedCredits && semesterCredits === 0) {
        showNotification('Calculation Required', 'Please add at least one course with valid credit and grade.');
        return { success: false };
    }

    // Final results
    const finalCGPA = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    const semesterGPA = semesterCredits > 0 ? (semesterPoints / semesterCredits) : 0;
    
    // Display results
    document.getElementById('result-semester-gpa').textContent = semesterGPA.toFixed(2);
    document.getElementById('result-total-credits').textContent = totalCredits.toFixed(2);
    document.getElementById('result-final-cgpa').textContent = finalCGPA.toFixed(2);

    return {
        success: true,
        currentCGPA: currentCGPA.toFixed(2),
        completedCredits: completedCredits.toFixed(2),
        semesterCredits: semesterCredits.toFixed(2),
        currentCoursesCount: currentCoursesCount
    };
}

// --- Tuition Fee Calculation Logic ---
function calculateFee() {
    const newCredit = parseFloat(document.getElementById('new-credit').value) || 0;
    const retakeCredit = parseFloat(document.getElementById('retake-credit').value) || 0;
    const perCreditFee = parseFloat(document.getElementById('per-credit-fee').value) || 0;
    const registrationFeeSelect = document.getElementById('registration-fee');
    const registrationFee = parseFloat(registrationFeeSelect.value) || 0;
    
    const waiver = parseFloat(document.querySelector('input[name="waiver"]:checked')?.value) || 0;
    const scholarship = parseFloat(document.querySelector('input[name="scholarship"]:checked')?.value) || 0;
    const isLateRegistration = document.querySelector('input[name="late"]:checked')?.value === 'yes';

    if (newCredit === 0 && retakeCredit === 0) {
        showNotification('Input Required', 'Please enter New Credit or Retake Credit.');
        return { success: false };
    }
    if (perCreditFee === 0) {
        showNotification('Input Required', 'Please enter the Per Credit Fee.');
        return { success: false };
    }
    if (registrationFee === 0) {
         showNotification('Input Required', 'Please select a Trimester/Semester Fee.');
        return { success: false };
    }

    // 1. Calculate Base Fees
    const newCreditFee = newCredit * perCreditFee;
    // Retake has a 50% discount on credit fee
    const retakeCreditFeeFull = retakeCredit * perCreditFee;
    const retakeCreditFeeDiscounted = retakeCreditFeeFull * 0.5;
    
    // 2. Determine Max Discount
    const discountPercentage = Math.max(waiver, scholarship);
    const discountType = waiver >= scholarship ? 'Waiver' : 'Scholarship';
    
    // Discount applies only to the new credit fee portion
    const discountAmount = (newCreditFee * discountPercentage) / 100; 

    // 3. Add Fixed Fees
    const lateRegistrationFee = isLateRegistration ? 1000 : 0;
    
    // 4. Calculate Final Payable Amount
    // Payable = (New Credit Fee - Discount) + Discounted Retake Fee + Fixed Fees (Reg + Late)
    const finalCreditFeeAfterDiscount = (newCreditFee - discountAmount) + retakeCreditFeeDiscounted;
    const finalAmount = finalCreditFeeAfterDiscount + registrationFee + lateRegistrationFee;

    // --- Display Results (HTML) ---
    const resultsBody = document.getElementById('fee-results-body');
    const finalAmountCell = document.getElementById('final-amount');
    resultsBody.innerHTML = ''; 

    // Helper to add row
    const addRow = (label, amount, isDeduction = false, isFee = false) => {
        const row = document.createElement('tr');
        row.className = isDeduction ? 'text-red-400' : (isFee ? 'text-cyan-400 font-medium' : 'text-gray-300');
        row.innerHTML = `
            <td class="p-3">${label}</td>
            <td class="p-3 text-right">${isDeduction ? '- ' : ''}${Math.abs(amount).toFixed(2)} Tk</td>
        `;
        resultsBody.appendChild(row);
    };

    // A. Base Fees
    addRow(`New Credit Fee (${newCredit.toFixed(1)} Cr)`, newCreditFee, false, true);
    if (retakeCredit > 0) {
        addRow(`Base Retake Fee (${retakeCredit.toFixed(1)} Cr)`, retakeCreditFeeFull, false, true);
        addRow('Retake Discount (50% Off)', retakeCreditFeeFull - retakeCreditFeeDiscounted, true);
    }
    addRow('Registration/Trimester Fee', registrationFee, false, true);
    
    // B. Discounts
    if (discountPercentage > 0) {
        addRow(`${discountType} Discount (${discountPercentage}%)`, discountAmount, true);
    }

    // C. Penalties/Other
    if (isLateRegistration) {
        addRow('Late Registration Fee', lateRegistrationFee, false, true);
    }

    // Final total
    finalAmountCell.textContent = `${finalAmount.toFixed(2)} Tk`;
    
    // --- Installment Breakdown (HTML) ---
    const installmentBody = document.getElementById('installment-body');
    installmentBody.innerHTML = '';
    
    const installments = [
        { name: '1st Installment (40%)', percentage: 40 },
        { name: '2nd Installment (30%)', percentage: 30 },
        { name: '3rd Installment (30%)', percentage: 30 }
    ];
    
    installments.forEach((installment, index) => {
        const amount = (finalAmount * installment.percentage) / 100;
        const row = document.createElement('tr');
        row.className = index === 0 ? 'text-fuchsia-400 font-semibold' : 'text-gray-300';
        row.innerHTML = `
            <td class="py-3">${installment.name}</td>
            <td class="py-3 text-right">${amount.toFixed(2)} Tk</td>
        `;
        installmentBody.appendChild(row);
    });
    
    // Show results section
    document.getElementById('fee-results-section').classList.remove('hidden');

    return {
        success: true,
        finalAmount: finalAmount.toFixed(2),
        newCredit: newCredit.toFixed(1),
        retakeCredit: retakeCredit.toFixed(1),
        perCreditFee: perCreditFee.toFixed(2),
        registrationFee: registrationFee.toFixed(2),
        discountPercentage,
        discountType
    };
}

// --- LLM Feature 1: Grade Goal Setter ---
async function generateGradeGoals() {
    const result = calculateCGPA();
    if (!result.success) return;

    const { currentCGPA, completedCredits, semesterCredits, currentCoursesCount } = result;

    if (semesterCredits === '0.00' || currentCoursesCount === 0) {
         showNotification('Goal Setting Error', 'Please add your planned courses (credits) for this trimester before generating goals.');
         return;
    }

    const outputDiv = document.getElementById('goal-output');
    const loadingIndicator = document.getElementById('goal-loading');
    const textarea = document.getElementById('goal-textarea');
    const button = document.getElementById('generate-goals-btn');

    outputDiv.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    textarea.value = '';
    button.disabled = true;

    const userQuery = `
        I am a student at UIU. My current CGPA is ${currentCGPA} based on ${completedCredits} completed credits.
        I am taking ${currentCoursesCount} courses this trimester, totaling ${semesterCredits} credits.
        Provide an inspiring but realistic recommendation for the minimum required Semester GPA (SGPA) I should aim for, and a challenging SGPA goal.
        Then, break down these SGPA goals into specific minimum target grades (A, A-, B+, B, C, etc.) for a hypothetical ${currentCoursesCount} courses (assuming each course is 3.0 credits for simplicity, if credits vary).
        Focus on two scenarios:
        1. Minimum Acceptable Target: Achieve an overall CGPA of ${Math.min(parseFloat(currentCGPA) + 0.1, 4.0).toFixed(2)}.
        2. Stretch Target: Achieve an overall CGPA of ${Math.min(parseFloat(currentCGPA) + 0.2, 4.0).toFixed(2)}.
        Present the answer clearly and concisely in bullet points or short paragraphs. Do not use markdown for formatting tables or bullet points.
    `;
    
    const systemPrompt = "You are an AI Academic Advisor for UIU students. Your task is to provide clear, motivating, and mathematically sound academic goal recommendations based on the student's input CGPA and current course load. The output must be concise and encouraging.";

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Could not retrieve goal recommendations.";
        
        textarea.value = text.trim();

    } catch (error) {
        textarea.value = `Error generating goals: ${error.message}. Please check your connection or try again later.`;
    } finally {
        loadingIndicator.classList.add('hidden');
        button.disabled = false;
    }
}

// --- LLM Feature 2: Financial Justification Generator ---
async function generateFinancialJustification() {
    const feeResult = calculateFee();
    if (!feeResult.success) return;

    const { finalAmount, newCredit, retakeCredit, perCreditFee, registrationFee, discountPercentage, discountType } = feeResult;
    const purpose = document.getElementById('justification-purpose').value.trim();

    if (!purpose) {
        showNotification('Input Required', 'Please describe the purpose of the justification (e.g., "Email to parents").');
        return;
    }

    const outputDiv = document.getElementById('justification-output');
    const loadingIndicator = document.getElementById('justification-loading');
    const textarea = document.getElementById('justification-textarea');
    const button = document.getElementById('generate-justification-btn');

    outputDiv.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    textarea.value = '';
    button.disabled = true;

    const feeDetails = `
        - Total Payable: ${finalAmount} Tk
        - New Credits: ${newCredit}
        - Retake Credits: ${retakeCredit}
        - Per Credit Fee: ${perCreditFee} Tk
        - Registration Fee: ${registrationFee} Tk
        - Discount/Waiver: ${discountPercentage}% (${discountType})
    `;
    
    const userQuery = `
        I need to draft a document for the following purpose: "${purpose}".
        The document must use the following calculated UIU tuition fee details:
        ${feeDetails}
        Draft a professional and persuasive document (e.g., email or letter, depending on the purpose) that clearly explains the total cost, the breakdown of fees, and highlights any discounts/waivers received. Keep the tone appropriate for the stated purpose. Do not use markdown for formatting tables or bullet points.
    `;
    
    const systemPrompt = "You are an AI Financial Assistant. Your task is to generate professional, accurate, and context-appropriate justification documents based on the provided fee data and stated purpose. Start directly with the draft.";

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetchWithRetry(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Could not retrieve financial justification.";
        
        textarea.value = text.trim();

    } catch (error) {
        textarea.value = `Error generating justification: ${error.message}. Please check your connection or try again later.`;
    } finally {
        loadingIndicator.classList.add('hidden');
        button.disabled = false;
    }
}

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // Initial call to add the first course row
    addCourseRow(); 

    // 1. Tab Switching Logic
    const tabButtons = document.querySelectorAll('nav button');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(targetTab) {
        tabButtons.forEach(button => {
            button.classList.remove('scale-105', 'bg-fuchsia-600', 'text-gray-900', 'hover:text-white', 'text-gray-400');
            button.classList.add('text-gray-400', 'hover:text-white');
        });

        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        const activeContent = document.getElementById(`content-${targetTab}`);
        const activeButton = document.getElementById(`tab-${targetTab}`);

        activeContent.classList.remove('hidden');
        activeButton.classList.add('scale-105', 'bg-fuchsia-600', 'text-gray-900');
        activeButton.classList.remove('text-gray-400', 'hover:text-white');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Set initial active tab
    switchTab('cgpa'); 
    
    // 2. CGPA Listeners
    document.getElementById('add-more-btn').addEventListener('click', addCourseRow);
    document.getElementById('retake-btn').addEventListener('click', addRetakeRow);
    document.getElementById('calculate-cgpa-btn').addEventListener('click', calculateCGPA);
    document.getElementById('generate-goals-btn').addEventListener('click', generateGradeGoals); // New LLM Button

    document.getElementById('reset-btn').addEventListener('click', function() {
        // Clear inputs
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        
        // Clear selections
        document.querySelectorAll('select').forEach(select => select.value = '');
        
        // Clear LLM outputs
        document.getElementById('goal-textarea').value = 'Goal suggestions will appear here.';
        document.getElementById('justification-textarea').value = 'Your generated justification will appear here.';
        document.getElementById('justification-purpose').value = '';


        // Reset dynamic rows
        const coursesContainer = document.getElementById('courses-container');
        coursesContainer.innerHTML = ''; // Clear all
        isRetakeHeaderAdded = false;
        addCourseRow(); // Add back the first course

        // Reset results display
        document.getElementById('result-semester-gpa').textContent = '--';
        document.getElementById('result-total-credits').textContent = '--';
        document.getElementById('result-final-cgpa').textContent = '--';
        document.getElementById('fee-results-section').classList.add('hidden');

        showNotification('System Reset', 'UIU Academic Hub state has been wiped clean.');
    });
    
    // 3. Fee Calculator Listener
    document.getElementById('calculate-fee-btn').addEventListener('click', calculateFee);
    document.getElementById('generate-justification-btn').addEventListener('click', generateFinancialJustification); // New LLM Button


    // Initialize Lucide Icons (must be last)
    lucide.createIcons();
});