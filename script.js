import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAehZSoPd8b8FmDZKF_o3J6j-01vtoCt5s",
    authDomain: "finguard-9c8eb.firebaseapp.com",
    projectId: "finguard-9c8eb",
    storageBucket: "finguard-9c8eb.firebasestorage.app",
    messagingSenderId: "491332007785",
    appId: "1:491332007785:web:646e4601c5f03fb4da6ff8",
    measurementId: "G-WYCBCSG38G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const indianBanks = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "Indian Bank",
    "Kotak Mahindra Bank",
    "IndusInd Bank",
    "Federal Bank",
    "IDFC FIRST Bank",
    "Central Bank of India"
];

// Bank Balances & Monthly Spend Forecasts per bank
const bankData = {
    "Indian Bank": { balance: 125000.00, forecast: 9200.00 },
    "State Bank of India": { balance: 110000.00, forecast: 8100.00 },
    "Union Bank of India": { balance: 84500.00, forecast: 6437.00 },
    "Central Bank of India": { balance: 60000.00, forecast: 4500.00 },
    "HDFC Bank": { balance: 95000.00, forecast: 7100.00 },
    "ICICI Bank": { balance: 75000.00, forecast: 5600.00 },
    "Axis Bank": { balance: 50000.00, forecast: 3800.00 }
};

// Itemized Transactions with Linked Bank Account details
const categoryTransactions = {
    food: {
        title: "🍔 Food & Dining Transactions",
        total: "₹12,400.00",
        items: [
            { title: "Swiggy - Biryani Order", date: "Sep 14, 2026 • 1:15 PM", amount: "- ₹446.00", bank: "Indian Bank" },
            { title: "Zomato - Weekend Dinner", date: "Sep 10, 2026 • 8:45 PM", amount: "- ₹1,947.00", bank: "State Bank of India" },
            { title: "Barbeque Nation - Family Dinner", date: "Sep 05, 2026 • 9:30 PM", amount: "- ₹4,799.00", bank: "Union Bank of India" },
            { title: "More Supermarket - Monthly Groceries", date: "Sep 02, 2026 • 11:10 AM", amount: "- ₹5,208.00", bank: "Indian Bank" }
        ]
    },
    shopping: {
        title: "🛍️ Shopping & Apparel Transactions",
        total: "₹8,200.00",
        items: [
            { title: "Amazon - Wireless Headphones", date: "Sep 12, 2026 • 4:20 PM", amount: "- ₹3,499.00", bank: "State Bank of India" },
            { title: "Myntra - Festive Wear", date: "Sep 08, 2026 • 2:15 PM", amount: "- ₹2,850.00", bank: "Indian Bank" },
            { title: "Trends - Casual Shirts", date: "Sep 03, 2026 • 6:30 PM", amount: "- ₹1,851.00", bank: "Central Bank of India" }
        ]
    },
    bills: {
        title: "⚡ Bills & Subscriptions Transactions",
        total: "₹3,500.00",
        items: [
            { title: "Electricity Bill - TNEB", date: "Sep 11, 2026 • 10:00 AM", amount: "- ₹2,100.00", bank: "Union Bank of India" },
            { title: "Airtel Broadband Fiber", date: "Sep 06, 2026 • 9:15 AM", amount: "- ₹999.00", bank: "Indian Bank" },
            { title: "YouTube Premium", date: "Sep 01, 2026 • 12:00 AM", amount: "- ₹401.00", bank: "State Bank of India" }
        ]
    },
    others: {
        title: "🛒 Others & Miscellaneous Transactions",
        total: "₹2,045.00",
        items: [
            { title: "HP Petrol Pump - Fuel", date: "Sep 13, 2026 • 5:45 PM", amount: "- ₹1,200.00", bank: "Central Bank of India" },
            { title: "Uber Ride - Office Commute", date: "Sep 09, 2026 • 8:30 AM", amount: "- ₹345.00", bank: "Indian Bank" },
            { title: "ATM Cash Withdrawal", date: "Sep 04, 2026 • 7:10 PM", amount: "- ₹500.00", bank: "Union Bank of India" }
        ]
    }
};

// Active Subscriptions List Data
const activeSubscriptions = [
    { id: "sub-1", title: "Netflix Premium", renewal: "Renews on Oct 01, 2026", cost: 649.00, plan: "mo", bank: "State Bank of India", targetCost: 199.00 },
    { id: "sub-2", title: "Spotify Individual", renewal: "Renews on Oct 05, 2026", cost: 119.00, plan: "mo", bank: "Indian Bank", targetCost: 59.00 },
    { id: "sub-3", title: "Amazon Prime", renewal: "Renews on Nov 12, 2026", cost: 1499.00, plan: "yr", bank: "Union Bank of India", targetCost: 799.00 }
];

let currentUser = null;
let initialSelectedBank = "";
let initialPhone = "";
let modalSelectedBank = "";

// Helper to format currency in INR
function formatINR(val) {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Get array of all currently linked bank names in the Dashboard UI
function getActiveBankNames() {
    const tags = document.querySelectorAll("#bank-tags-container .bank-tag");
    return Array.from(tags).map(tag => tag.getAttribute("data-bank")).filter(Boolean);
}

// Reassign transactions & subscriptions from a removed bank to a remaining active bank
function reassignRemovedBankData(removedBankName) {
    const activeBanks = getActiveBankNames();
    const fallbackBank = activeBanks.length > 0 ? activeBanks[0] : "Primary Account";

    // 1. Update Category Transactions
    Object.keys(categoryTransactions).forEach(catKey => {
        categoryTransactions[catKey].items.forEach(item => {
            if (item.bank === removedBankName) {
                item.bank = fallbackBank;
            }
        });
    });

    // 2. Update Active Subscriptions
    activeSubscriptions.forEach(sub => {
        if (sub.bank === removedBankName) {
            sub.bank = fallbackBank;
        }
    });

    // Re-render subscriptions view with updated bank tags
    renderSubscriptions();
}

// Calculate Detailed Subscription & Savings Analysis Breakdown
function calculateSubscriptionAnalysis() {
    let currentTotal = 0;
    let targetTotal = 0;
    let totalSaved = 0;
    const bankBreakdown = {};

    activeSubscriptions.forEach(sub => {
        currentTotal += sub.cost;
        targetTotal += sub.targetCost;
        const saved = Math.max(0, sub.cost - sub.targetCost);
        totalSaved += saved;

        if (!bankBreakdown[sub.bank]) {
            bankBreakdown[sub.bank] = 0;
        }
        bankBreakdown[sub.bank] += saved;
    });

    return { currentTotal, targetTotal, totalSaved, bankBreakdown };
}

// Render Subscriptions Tab with Comprehensive Analysis & Target Inputs
function renderSubscriptions() {
    const subContainer = document.querySelector("#tab-subscriptions");
    if (!subContainer) return;

    const analysis = calculateSubscriptionAnalysis();

    let bankBreakdownHtml = "";
    for (const [bank, amount] of Object.entries(analysis.bankBreakdown)) {
        bankBreakdownHtml += `
            <div class="bank-savings-item">
                <span>🏦 ${bank}</span>
                <strong>+${formatINR(amount)} extra</strong>
            </div>
        `;
    }

    let html = `
        <div class="savings-summary-card">
            <div class="savings-header">
                <h4>📊 Spend Optimization Analysis</h4>
                <span class="savings-badge">Smart Savings</span>
            </div>
            
            <div class="savings-row">
                <span>Current Subscriptions Cost:</span>
                <strong>${formatINR(analysis.currentTotal)}</strong>
            </div>
            <div class="savings-row">
                <span>Optimized Target Cost:</span>
                <strong>${formatINR(analysis.targetTotal)}</strong>
            </div>

            <hr class="savings-divider" />

            <div class="savings-total-row">
                <span class="savings-total-label">💡 Total Extra Money Saved:</span>
                <span class="savings-total-amount">+${formatINR(analysis.totalSaved)}</span>
            </div>

            <div class="bank-savings-breakdown">
                <div class="bank-savings-title">Extra Savings by Bank Account:</div>
                ${bankBreakdownHtml}
            </div>
        </div>

        <div class="dashboard-card shadow-sm">
            <h3 class="section-title">Active Subscriptions</h3>
    `;

    activeSubscriptions.forEach(sub => {
        const savedAmount = Math.max(0, sub.cost - sub.targetCost);
        html += `
            <div class="list-item" id="${sub.id}">
                <div class="sub-info">
                    <h4>${sub.title}</h4>
                    <p>${sub.renewal} • <span class="tx-bank-badge">🏦 ${sub.bank}</span></p>
                    <div class="sub-reduction-box">
                        <label>Target Plan (₹):</label>
                        <input type="number" class="sub-reduction-input" data-id="${sub.id}" value="${sub.targetCost}" min="0" max="${sub.cost}">
                    </div>
                </div>
                <div class="sub-right">
                    <span class="item-amount">${formatINR(sub.cost)}/${sub.plan}</span><br/>
                    ${savedAmount > 0 ? `<span class="extra-money-tag">Extra Money: +${formatINR(savedAmount)}</span>` : ''}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    subContainer.innerHTML = html;

    // Attach real-time recalculation listeners to input elements
    document.querySelectorAll(".sub-reduction-input").forEach(input => {
        input.addEventListener("input", (e) => {
            const subId = e.target.getAttribute("data-id");
            const newTarget = parseFloat(e.target.value) || 0;
            const sub = activeSubscriptions.find(s => s.id === subId);
            if (sub) {
                sub.targetCost = newTarget;
                renderSubscriptions();
            }
        });
    });
}

function updateAllCalculations() {
    const remainingTags = document.querySelectorAll("#bank-tags-container .bank-tag");
    let totalBalance = 0;
    let totalForecast = 0;
    const count = remainingTags.length;

    remainingTags.forEach(tag => {
        const bankName = tag.getAttribute("data-bank");
        if (bankData[bankName]) {
            totalBalance += bankData[bankName].balance;
            totalForecast += bankData[bankName].forecast;
        } else {
            totalBalance += 50000.00;
            totalForecast += 3500.00;
        }
    });

    const balanceElement = document.getElementById("display-total-balance");
    if (balanceElement) balanceElement.textContent = formatINR(totalBalance);

    const forecastElement = document.getElementById("display-forecast-balance");
    if (forecastElement) forecastElement.textContent = formatINR(totalForecast);

    const countElement = document.getElementById("linked-account-count");
    if (countElement) countElement.textContent = count;
}

function addBankTagToUI(bankName) {
    const tagsContainer = document.getElementById("bank-tags-container");
    const existingBank = Array.from(tagsContainer.children).find(
        tag => tag.getAttribute("data-bank") === bankName
    );

    if (!existingBank) {
        const newTag = document.createElement("span");
        newTag.className = "bank-tag";
        newTag.setAttribute("data-bank", bankName);
        newTag.innerHTML = `✓ ${bankName} <small class="remove-bank" style="cursor:pointer; margin-left:5px;">✕</small>`;
        tagsContainer.appendChild(newTag);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Populate Dropdowns
    const bankSelect = document.getElementById("bank-select");
    const modalBankSelect = document.getElementById("modal-bank-select");

    indianBanks.forEach(bank => {
        if (bankSelect) {
            const option = document.createElement("option");
            option.value = bank;
            option.textContent = bank;
            bankSelect.appendChild(option);
        }
        if (modalBankSelect) {
            const option = document.createElement("option");
            option.value = bank;
            option.textContent = bank;
            modalBankSelect.appendChild(option);
        }
    });

    // Section Elements
    const loginSection = document.getElementById("login-section");
    const biometricSection = document.getElementById("biometric-section");
    const bankSection = document.getElementById("bank-section");
    const otpSection = document.getElementById("otp-section");
    const mainApp = document.getElementById("main-app");

    // Modal Elements
    const addBankModal = document.getElementById("add-bank-modal");
    const modalStepBank = document.getElementById("modal-step-bank");
    const modalStepOtp = document.getElementById("modal-step-otp");
    const forecastModal = document.getElementById("forecast-modal");
    const categoryModal = document.getElementById("category-modal");

    // Render subscriptions view
    renderSubscriptions();

    // 1. Sign Up Logic
    document.getElementById("signup-btn")?.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!email || !password) return alert("Please fill in all fields.");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            loginSection.classList.add("hidden");
            biometricSection.classList.remove("hidden");
        } catch (error) {
            alert("Sign Up Error: " + error.message);
        }
    });

    // 2. Login Logic
    document.getElementById("login-btn")?.addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!email || !password) return alert("Please fill in all fields.");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            currentUser = userCredential.user;
            loginSection.classList.add("hidden");
            biometricSection.classList.remove("hidden");
        } catch (error) {
            alert("Login Error: " + error.message);
        }
    });

    // 3. Biometric Step with WebAuthn & Desktop Fallback
    document.getElementById("biometric-btn")?.addEventListener("click", async () => {
        let hasPlatformAuth = false;
        if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
            hasPlatformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }

        if (hasPlatformAuth) {
            try {
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);

                const dummyUserId = new Uint8Array(16);
                window.crypto.getRandomValues(dummyUserId);

                const publicKeyCredentialCreationOptions = {
                    challenge: challenge,
                    rp: {
                        name: "FinGuard AI",
                        id: window.location.hostname
                    },
                    user: {
                        id: dummyUserId,
                        name: currentUser ? currentUser.email : "user@finguard.com",
                        displayName: "FinGuard User"
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" },
                        { alg: -257, type: "public-key" }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                };

                await navigator.credentials.create({
                    publicKey: publicKeyCredentialCreationOptions
                });

                biometricSection.classList.add("hidden");
                bankSection.classList.remove("hidden");
                return;
            } catch (err) {
                console.warn("Native biometric cancelled or failed:", err);
            }
        }

        biometricSection.classList.add("hidden");
        bankSection.classList.remove("hidden");
    });

    // 4. Send OTP Step
    document.getElementById("send-bank-otp-initial-btn")?.addEventListener("click", () => {
        initialPhone = document.getElementById("phone").value;
        initialSelectedBank = bankSelect.value;

        if (initialPhone.length !== 10 || !initialSelectedBank) {
            return alert("Please enter a valid 10-digit mobile number and select a bank.");
        }

        bankSection.classList.add("hidden");
        otpSection.classList.remove("hidden");
    });

    // 5. Verify OTP Step & Dashboard Access
    document.getElementById("verify-login-otp-btn")?.addEventListener("click", async () => {
        const otpVal = document.getElementById("login-otp-input").value;
        if (otpVal.length !== 6) return alert("Please enter a valid 6-digit OTP.");

        if (currentUser) {
            try {
                await setDoc(doc(db, "users", currentUser.uid), {
                    email: currentUser.email,
                    phone: initialPhone,
                    bank: initialSelectedBank,
                    linkedBanks: [initialSelectedBank],
                    biometricVerified: true,
                    updatedAt: new Date()
                }, { merge: true });
            } catch (e) {
                console.log("Firestore Note: ", e);
            }
        }

        addBankTagToUI(initialSelectedBank);
        updateAllCalculations();

        otpSection.classList.add("hidden");
        mainApp.classList.remove("hidden");

        if (currentUser) {
            document.getElementById("user-display").innerText = currentUser.email.split('@')[0];
        }
    });

    // 6. OPEN ADD BANK MODAL
    document.getElementById("open-add-bank-modal-btn")?.addEventListener("click", () => {
        addBankModal.classList.remove("hidden");
        modalStepBank.classList.remove("hidden");
        modalStepOtp.classList.add("hidden");
    });

    document.getElementById("close-modal-btn")?.addEventListener("click", () => {
        addBankModal.classList.add("hidden");
    });

    // 7. SEND MODAL BANK OTP
    document.getElementById("send-bank-otp-btn")?.addEventListener("click", () => {
        const modalPhone = document.getElementById("modal-phone").value;
        modalSelectedBank = modalBankSelect.value;

        if (modalPhone.length !== 10 || !modalSelectedBank) {
            return alert("Please enter a valid phone number and select a bank.");
        }

        modalStepBank.classList.add("hidden");
        modalStepOtp.classList.remove("hidden");
    });

    // 8. VERIFY MODAL BANK OTP
    document.getElementById("verify-bank-otp-btn")?.addEventListener("click", async () => {
        const bankOtp = document.getElementById("modal-otp-input").value;
        if (bankOtp.length !== 6) return alert("Please enter a valid 6-digit OTP.");

        addBankTagToUI(modalSelectedBank);
        updateAllCalculations();

        if (currentUser) {
            try {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, {
                    linkedBanks: arrayUnion(modalSelectedBank)
                });
            } catch (e) {
                console.log("Firestore sync note: ", e);
            }
        }

        alert(`${modalSelectedBank} added and verified successfully!`);
        addBankModal.classList.add("hidden");
    });

    // 9. OPEN SPEND FORECAST MODAL
    document.getElementById("view-forecast-btn")?.addEventListener("click", (e) => {
        e.preventDefault();
        updateAllCalculations(); 
        forecastModal.classList.remove("hidden");
    });

    document.getElementById("close-forecast-modal-btn")?.addEventListener("click", () => {
        forecastModal.classList.add("hidden");
    });

    // 10. CATEGORY CLICK -> SHOW TRANSACTIONS MODAL WITH BANK DETAILS
    document.querySelectorAll(".clickable-category").forEach(catItem => {
        catItem.addEventListener("click", () => {
            const catKey = catItem.getAttribute("data-category");
            const data = categoryTransactions[catKey];

            if (data) {
                document.getElementById("cat-modal-title").innerText = data.title;
                document.getElementById("cat-modal-total").innerText = data.total;

                const listContainer = document.getElementById("cat-tx-list");
                listContainer.innerHTML = "";

                data.items.forEach(tx => {
                    const txHtml = `
                        <div class="tx-item">
                            <div class="tx-info">
                                <h5>${tx.title}</h5>
                                <p>${tx.date} • <span class="tx-bank-badge">🏦 ${tx.bank}</span></p>
                            </div>
                            <span class="tx-amount">${tx.amount}</span>
                        </div>
                    `;
                    listContainer.innerHTML += txHtml;
                });

                categoryModal.classList.remove("hidden");
            }
        });
    });

    document.getElementById("close-cat-modal-btn")?.addEventListener("click", () => {
        categoryModal.classList.add("hidden");
    });

    categoryModal?.addEventListener("click", (e) => {
        if (e.target === categoryModal) {
            categoryModal.classList.add("hidden");
        }
    });

    // 11. Dynamic Bank Tag Removal, Reassignment & Recalculation
    document.getElementById("bank-tags-container")?.addEventListener("click", async (event) => {
        if (event.target.classList.contains("remove-bank")) {
            const tagElement = event.target.closest(".bank-tag");
            const bankName = tagElement.getAttribute("data-bank");

            const activeBanks = getActiveBankNames();
            if (activeBanks.length <= 1) {
                alert("You must keep at least one linked bank account.");
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to remove ${bankName}? Existing transactions & subscriptions will be reassigned to your primary active bank.`);
            if (!confirmDelete) return;

            try {
                tagElement.remove();
                reassignRemovedBankData(bankName);
                updateAllCalculations(); 

                if (currentUser) {
                    const userRef = doc(db, "users", currentUser.uid);
                    await updateDoc(userRef, {
                        linkedBanks: arrayRemove(bankName)
                    });
                }

                alert(`${bankName} removed and data reassigned successfully!`);
            } catch (error) {
                console.error("Error removing bank: ", error);
            }
        }
    });

    // 12. Bottom Navigation Tabs
    const navDash = document.getElementById("nav-dash");
    const navCat = document.getElementById("nav-cat");
    const navSub = document.getElementById("nav-sub");

    const tabDash = document.getElementById("tab-dashboard");
    const tabCat = document.getElementById("tab-category");
    const tabSub = document.getElementById("tab-subscriptions");

    function resetTabs() {
        [tabDash, tabCat, tabSub].forEach(t => t?.classList.add("hidden"));
        [navDash, navCat, navSub].forEach(n => n?.classList.remove("active"));
    }

    navDash?.addEventListener("click", () => {
        resetTabs();
        tabDash?.classList.remove("hidden");
        navDash?.classList.add("active");
    });

    navCat?.addEventListener("click", () => {
        resetTabs();
        tabCat?.classList.remove("hidden");
        navCat?.classList.add("active");
    });

    navSub?.addEventListener("click", () => {
        resetTabs();
        tabSub?.classList.remove("hidden");
        navSub?.classList.add("active");
    });

    // 13. Logout Handler
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
        await signOut(auth);
        location.reload();
    });

    updateAllCalculations();
});