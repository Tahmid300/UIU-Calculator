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
    // Only count regular course rows that are not the header
    const courseLabels = document.querySelectorAll('.course-row:not(.retake-header) .course-label');
    courseLabels.forEach((label, index) => {
        label.textContent = `Course ${index + 1}`;
    });
    courseCount = courseLabels.length;
}

// Adds a new course row
function addCourseRow() {
    const coursesContainer = document.getElementById('courses-container');
    
    // Create new element and append
    const newRow = document.createElement('div');
    // We increment courseCount *before* generating HTML to get the correct number
    courseCount++; 
    newRow.innerHTML = getCourseRowHTML(courseCount);
    const addedRow = newRow.firstChild;
    coursesContainer.appendChild(addedRow);
    
    // Re-initialize Lucide icons for the new row
    lucide.createIcons();
    
    // Attach remove listener
    addedRow.querySelector('.remove-btn').addEventListener('click', function() {
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
    const addedRow = newRow.firstChild;
    coursesContainer.appendChild(addedRow);
    
    // Re-initialize Lucide icons for the new row
    lucide.createIcons();

    // Attach remove listener
    addedRow.querySelector('.remove-btn').addEventListener('click', function() {
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

// --- CGPA Calculation Logic (Bug-Fixed) ---
function calculateCGPA() {
    // Get inputs
    const completedCreditsInput = document.getElementById('completed-credits');
    const currentCGPAInput = document.getElementById('current-cgpa');

    const completedCredits = parseFloat(completedCreditsInput.value) || 0;
    const currentCGPA = parseFloat(currentCGPAInput.value) || 0;

    // Validate inputs
    if (isNaN(completedCredits) || completedCredits < 0) {
        showNotification('ইনপুট ত্রুটি (Input Error)', 'অনুগ্রহ করে সম্পন্ন ক্রেডিট-এর জন্য একটি সঠিক সংখ্যা দিন।');
        return { success: false };
    }
    if (isNaN(currentCGPA) || currentCGPA < 0 || currentCGPA > 4.5) {
        showNotification('ইনপুট ত্রুটি (Input Error)', 'অনুগ্রহ করে ০.০০ থেকে ৪.০০-এর মধ্যে একটি সঠিক CGPA দিন।');
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
        const credit = parseFloat(row.querySelector('.credit-select').value);
        const grade = parseFloat(row.querySelector('.grade-select').value);
        
        if (!isNaN(credit) && credit > 0 && !isNaN(grade)) {
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
        const credit = parseFloat(row.querySelector('.credit-select').value);
        const oldGrade = parseFloat(row.querySelector('.old-grade-select').value);
        const newGrade = parseFloat(row.querySelector('.grade-select').value);
        
        // Check if values are selected and valid (must be numeric for calculation)
        if (!isNaN(credit) && credit > 0 && !isNaN(oldGrade) && !isNaN(newGrade)) {
            
            const oldPoints = (credit * oldGrade);
            const newPoints = (credit * newGrade);

            // UIU Logic: Total credits remain the same (since retake credits were already included in totalCredits).
            // We replace the points of the old grade with the new grade.
            totalPoints = totalPoints - oldPoints + newPoints;
            
            // Count towards semester points (as new grade is earned this semester)
            semesterCredits += credit;
            semesterPoints += newPoints;
            currentCoursesCount++;
        }
    });
    
    // Check for calculation validity
    if (totalCredits === completedCredits && semesterCredits === 0) {
        showNotification('সতর্কতা (Warning)', 'এই সেমিস্টারে কোনো কোর্সের ক্রেডিট বা গ্রেড নির্বাচন করা হয়নি। শুধুমাত্র আপনার পূর্বের CGPA দেখানো হচ্ছে।');
        
        document.getElementById('result-semester-gpa').textContent = 'N/A';
        document.getElementById('result-total-credits').textContent = completedCredits.toFixed(2);
        document.getElementById('result-final-cgpa').textContent = currentCGPA.toFixed(2);
        
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


// --- Tuition Fee Calculation Logic (Bug-Fixed & Updated) ---
function calculateFee() {
    const newCredit = parseFloat(document.getElementById('new-credit').value) || 0;
    const retakeCredit = parseFloat(document.getElementById('retake-credit').value) || 0;
    
    // UPDATED: Per Credit Fee is now a select element
    const perCreditFeeSelect = document.getElementById('per-credit-fee-select');
    const perCreditFee = parseFloat(perCreditFeeSelect.value) || 0; 

    const registrationFeeSelect = document.getElementById('registration-fee');
    const registrationFee = parseFloat(registrationFeeSelect.value) || 0;
    
    const waiver = parseFloat(document.querySelector('input[name="waiver"]:checked')?.value) || 0;
    const scholarship = parseFloat(document.querySelector('input[name="scholarship"]:checked')?.value) || 0;
    const isLateRegistration = document.querySelector('input[name="late"]:checked')?.value === 'yes';

    if (newCredit === 0 && retakeCredit === 0) {
        showNotification('ইনপুট প্রয়োজন (Input Required)', 'অনুগ্রহ করে নতুন ক্রেডিট অথবা রিটেক ক্রেডিট দিন।');
        return { success: false };
    }
    if (perCreditFee === 0) {
        showNotification('ইনপুট প্রয়োজন (Input Required)', 'অনুগ্রহ করে প্রতি ক্রেডিট ফি (Per Credit Fee) নির্বাচন করুন।');
        return { success: false };
    }
    if (registrationFee === 0) {
         showNotification('ইনপুট প্রয়োজন (Input Required)', 'অনুগ্রহ করে সেমিস্টার/ট্রাইমেস্টার ফি নির্বাচন করুন।');
        return { success: false };
    }

    // 1. Calculate Base Fees
    const newCreditFee = newCredit * perCreditFee;
    const retakeCreditFeeFull = retakeCredit * perCreditFee;
    // UIU Retake discount: 50%
    const retakeCreditFeeDiscounted = retakeCreditFeeFull * 0.5;
    
    // 2. Determine Max Discount (Only one is applied)
    const discountPercentage = Math.max(waiver, scholarship);
    const discountType = waiver >= scholarship ? 'Waiver' : 'Scholarship';
    
    // Discount applies only to the new credit fee portion
    const discountAmount = (newCreditFee * discountPercentage) / 100; 

    // 3. Add Fixed Fees (UPDATED: Late Registration is now 500 Tk)
    const lateRegistrationFee = isLateRegistration ? 500 : 0;
    
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
        // Show Retake Full Fee and then the discount
        addRow(`Retake Credit Fee (Base)`, retakeCreditFeeFull, false, true); 
        addRow('Retake Discount (50% Off)', retakeCreditFeeFull - retakeCreditFeeDiscounted, true);
    }
    addRow('Registration/Trimester Fee', registrationFee, false, true);
    
    // B. Discounts
    if (discountPercentage > 0) {
        addRow(`${discountType} Discount (${discountPercentage}%)`, discountAmount, true);
    }

    // C. Penalties/Other
    if (isLateRegistration) {
        addRow('Late Registration Fee (500 Tk)', lateRegistrationFee, false, true);
    }

    // Final total
    finalAmountCell.textContent = `${finalAmount.toFixed(2)} Tk`;
    
    // --- Installment Breakdown (HTML) ---
    const installmentBody = document.getElementById('installment-body');
    installmentBody.innerHTML = '';
    
    // Standard UIU Installment plan
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
    // Re-calculate to ensure all current data is fresh
    const result = calculateCGPA(); 
    if (!result.success) return;

    const { currentCGPA, completedCredits, semesterCredits, currentCoursesCount } = result;

    if (semesterCredits === '0.00' || currentCoursesCount === 0) {
         showNotification('লক্ষ্য নির্ধারণে ত্রুটি (Goal Setting Error)', 'অনুগ্রহ করে আপনার সেমিস্টারের কোর্সগুলি যোগ করুন।');
         return;
    }

    const outputDiv = document.getElementById('goal-output');
    const loadingIndicator = document.getElementById('goal-loading');
    const textarea = document.getElementById('goal-textarea');
    const button = document.getElementById('generate-goals-btn');

    outputDiv.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    textarea.value = 'কৃত্রিম বুদ্ধিমত্তা দ্বারা আপনার একাডেমিক ট্র্যাজেক্টরি বিশ্লেষণ করা হচ্ছে...';
    button.disabled = true;

    const userQuery = `
        I am a student at UIU. My current CGPA is ${currentCGPA} based on ${completedCredits} completed credits.
        I am taking ${currentCoursesCount} courses this trimester, totaling ${semesterCredits} credits.
        Provide an inspiring but realistic recommendation for the minimum required Semester GPA (SGPA) I should aim for, and a challenging SGPA goal.
        Then, break down these SGPA goals into specific minimum target grades (A, A-, B+, B, C, etc.) for a hypothetical ${currentCoursesCount} courses (assuming each course is 3.0 credits for simplicity, if credits vary).
        Focus on two scenarios:
        1. Minimum Acceptable Target: Achieve an overall CGPA of ${Math.min(parseFloat(currentCGPA) + 0.1, 4.0).toFixed(2)}.
        2. Stretch Target: Achieve an overall CGPA of ${Math.min(parseFloat(currentCGPA) + 0.2, 4.0).toFixed(2)}.
        Present the answer clearly and concisely in Bengali, in bullet points or short paragraphs. Do not use markdown for formatting tables or bullet points.
    `;
    
    const systemPrompt = "You are an AI Academic Advisor for UIU students. Your task is to provide clear, motivating, and mathematically sound academic goal recommendations based on the student's input CGPA and current course load. The output must be concise, encouraging, and written entirely in Bengali.";

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
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "ত্রুটি: লক্ষ্যের সুপারিশগুলি পুনরুদ্ধার করা যায়নি।";
        
        textarea.value = text.trim();

    } catch (error) {
        textarea.value = `ত্রুটি: লক্ষ্য তৈরি করার সময় সমস্যা হয়েছে: ${error.message}। অনুগ্রহ করে আবার চেষ্টা করুন।`;
    } finally {
        loadingIndicator.classList.add('hidden');
        button.disabled = false;
    }
}

// --- LLM Feature 2: Financial Justification Generator ---
async function generateFinancialJustification() {
    // Re-calculate to ensure all current data is fresh
    const feeResult = calculateFee();
    if (!feeResult.success) return;

    const { finalAmount, newCredit, retakeCredit, perCreditFee, registrationFee, discountPercentage, discountType } = feeResult;
    const purpose = document.getElementById('justification-purpose').value.trim();

    if (!purpose) {
        showNotification('ইনপুট প্রয়োজন (Input Required)', 'অনুগ্রহ করে আপনার ডকুমেন্টের উদ্দেশ্য লিখুন (যেমন: অভিভাবকের কাছে ইমেল)।');
        return;
    }

    const outputDiv = document.getElementById('justification-output');
    const loadingIndicator = document.getElementById('justification-loading');
    const textarea = document.getElementById('justification-textarea');
    const button = document.getElementById('generate-justification-btn');

    outputDiv.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    textarea.value = 'কৃত্রিম বুদ্ধিমত্তা দ্বারা আপনার আর্থিক সারসংক্ষেপ প্রস্তুত করা হচ্ছে...';
    button.disabled = true;

    const feeDetails = `
        - মোট প্রদেয়: ${finalAmount} Tk
        - নতুন ক্রেডিট: ${newCredit}
        - রিটেক ক্রেডিট: ${retakeCredit}
        - প্রতি ক্রেডিট ফি: ${perCreditFee} Tk
        - রেজিস্ট্রেশন ফি: ${registrationFee} Tk
        - ছাড়/ওয়েভার: ${discountPercentage}% (${discountType})
    `;
    
    const userQuery = `
        I need to draft a document for the following purpose: "${purpose}".
        The document must use the following calculated UIU tuition fee details:
        ${feeDetails}
        Draft a professional and persuasive document (e.g., email or letter, depending on the purpose) that clearly explains the total cost, the breakdown of fees, and highlights any discounts/waivers received. Keep the tone appropriate for the stated purpose. The entire output must be in Bengali. Do not use markdown for formatting tables or bullet points.
    `;
    
    const systemPrompt = "You are an AI Financial Assistant. Your task is to generate professional, accurate, and context-appropriate justification documents based on the provided fee data and stated purpose. The entire output must be in Bengali. Start directly with the draft.";

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
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "ত্রুটি: আর্থিক সারসংক্ষেপ তৈরি করা যায়নি।";
        
        textarea.value = text.trim();

    } catch (error) {
        textarea.value = `ত্রুটি: আর্থিক সারসংক্ষেপ তৈরি করার সময় সমস্যা হয়েছে: ${error.message}। অনুগ্রহ করে আবার চেষ্টা করুন।`;
    } finally {
        loadingIndicator.classList.add('hidden');
        button.disabled = false;
    }
}

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    
    // *** FIX: Bind addCourseRow to the button only once ***
    const addMoreBtn = document.getElementById('add-more-btn');
    if (addMoreBtn) {
        addMoreBtn.addEventListener('click', addCourseRow);
    }
    
    // Initial call to add the first course row
    if (document.getElementById('courses-container').children.length === 0) {
        addCourseRow(); 
    }

    // 1. Tab Switching Logic (Updated for 5 tabs)
    const tabButtons = document.querySelectorAll('nav button');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(targetTab) {
        // Reset styles for all buttons
        tabButtons.forEach(button => {
            button.classList.remove('scale-105', 'bg-fuchsia-600', 'text-gray-900');
            button.classList.add('text-gray-400', 'hover:text-white');
        });

        // Hide all content
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Show active content and style active button
        const activeContent = document.getElementById(`content-${targetTab}`);
        const activeButton = document.getElementById(`tab-${targetTab}`);

        if (activeContent) activeContent.classList.remove('hidden');
        if (activeButton) {
            activeButton.classList.add('scale-105', 'bg-fuchsia-600', 'text-gray-900');
            activeButton.classList.remove('text-gray-400', 'hover:text-white');
        }
        
        // Ensure Lucide icons are refreshed when tabs switch
        lucide.createIcons();
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // Set initial active tab
    switchTab('cgpa'); 
    
    // 2. CGPA Listeners
    document.getElementById('retake-btn').addEventListener('click', addRetakeRow);
    document.getElementById('calculate-cgpa-btn').addEventListener('click', calculateCGPA);
    document.getElementById('generate-goals-btn').addEventListener('click', generateGradeGoals); 

    document.getElementById('reset-btn').addEventListener('click', function() {
        // Clear all inputs and reset UI state
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = '');
        document.querySelectorAll('select').forEach(select => select.value = '');
        
        // Reset radio buttons to default (Waiver 100%, Scholarship 0%, Late No)
        document.getElementById('waiver-100').checked = true;
        document.getElementById('sch-0').checked = true;
        document.getElementById('late-no').checked = true;

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

        showNotification('সিস্টেম রিসেট (System Reset)', 'UIU একাডেমিক হাব-এর সমস্ত তথ্য মুছে ফেলা হয়েছে।');
    });
    
    // 3. Fee Calculator Listener
    document.getElementById('calculate-fee-btn').addEventListener('click', calculateFee);
    document.getElementById('generate-justification-btn').addEventListener('click', generateFinancialJustification); 


    // Initialize Lucide Icons (must be last)
    lucide.createIcons();
});

