const startBtn = document.getElementById('startDebateBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const transcriptFeed = document.getElementById('transcriptFeed');
const typingIndicator = document.getElementById('typingIndicator');
const typingActor = document.getElementById('typingActor');
const typingAction = document.getElementById('typingAction');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Upload Zone
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const activeCaseId = document.getElementById('activeCaseId');
const activeApplicant = document.getElementById('activeApplicant');

let isDebating = false;
let messageHistory = [];
let loadedCaseData = null;

// --- FILE UPLOAD LOGIC ---
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            loadedCaseData = JSON.parse(e.target.result);
            activeCaseId.innerText = loadedCaseData.id || 'Unknown ID';
            activeApplicant.innerText = loadedCaseData.applicant?.name || 'Unknown Applicant';
            
            // Populate Hero Banner (Option B)
            const banner = document.getElementById('caseContextBanner');
            document.getElementById('bannerTitle').innerText = loadedCaseData.applicant?.name || 'Applicant Case';
            
            const reqAmount = loadedCaseData.request?.amount ? `$${loadedCaseData.request.amount.toLocaleString()}` : 'N/A';
            document.getElementById('bAmount').innerText = reqAmount;
            document.getElementById('bPurpose').innerText = loadedCaseData.request?.purpose || 'N/A';
            document.getElementById('bGrowth').innerText = loadedCaseData.financials_unaudited?.revenue_growth_percentage ? `${loadedCaseData.financials_unaudited.revenue_growth_percentage}%` : 'N/A';
            
            const risks = loadedCaseData.market_context?.key_risks ? loadedCaseData.market_context.key_risks.join(', ') : 'None listed';
            document.getElementById('bRisks').innerText = risks;
            
            banner.classList.remove('hidden');

            startBtn.disabled = false;
            startBtn.querySelector('.btn-text').innerText = 'Start Analysis';
        } catch (err) {
            alert('Invalid JSON file!');
        }
    };
    reader.readAsText(file);
}

// --- SSE LOGIC ---
function scrollToBottom() { transcriptFeed.scrollTop = transcriptFeed.scrollHeight; }

function createMessageElement(msg) {
    const div = document.createElement('div');
    const isFlag = msg.text.startsWith('❌') || msg.text.startsWith('✅') || msg.isFlag;
    
    div.className = `message ${msg.actor} ${isFlag ? 'flag' : ''}`;
    let icon = msg.actor === 'Advocate' ? '⚖️' : msg.actor === 'Skeptic' ? '🕵️' : msg.actor === 'Verdict' ? '🧑‍⚖️' : '💬';
    if (isFlag) icon = msg.text.startsWith('✅') ? '✅' : '🚨';

    div.innerHTML = `
        <div class="message-header" style="color: var(--role-${msg.actor.toLowerCase()})">
            ${icon} ${isFlag ? 'System Tool / Intercept' : msg.actor}
        </div>
        <div class="message-content">${msg.text}</div>
    `;
    return div;
}

function initEventSource() {
    const eventSource = new EventSource('http://localhost:3000/api/stream-debate');

    eventSource.addEventListener('DEBATE_STARTED', () => {
        isDebating = true;
        startBtn.disabled = true;
        exportPdfBtn.classList.add('hidden');
        startBtn.querySelector('.btn-text').innerText = 'Debate in Progress...';
        transcriptFeed.innerHTML = ''; 
        messageHistory = [];
        statusDot.className = 'dot active';
        statusText.innerText = 'Engine Running';
    });

    eventSource.addEventListener('STATUS_UPDATE', (e) => {
        const data = JSON.parse(e.data);
        typingIndicator.classList.remove('hidden');
        typingActor.innerText = data.actor;
        typingAction.innerText = data.action;
        scrollToBottom();
    });

    eventSource.addEventListener('TRANSCRIPT_UPDATED', (e) => {
        const transcriptArray = JSON.parse(e.data);
        typingIndicator.classList.add('hidden');
        
        const newMessages = transcriptArray.slice(messageHistory.length);
        newMessages.forEach(msg => transcriptFeed.appendChild(createMessageElement(msg)));
        
        messageHistory = transcriptArray;
        scrollToBottom();
    });

    // Handle Live Data Visualization (Chart.js)
    eventSource.addEventListener('DATA_VISUALIZATION', (e) => {
        const data = JSON.parse(e.data);
        
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'message System';
        chartWrapper.innerHTML = `
            <div class="message-header" style="color: #64748b">📊 ${data.title}</div>
            <div class="chart-container"><canvas></canvas></div>
        `;
        transcriptFeed.appendChild(chartWrapper);
        
        const canvas = chartWrapper.querySelector('canvas');
        new Chart(canvas, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
        scrollToBottom();
    });

    eventSource.addEventListener('DEBATE_COMPLETED', () => {
        isDebating = false;
        startBtn.disabled = false;
        startBtn.querySelector('.btn-text').innerText = 'Restart Analysis';
        exportPdfBtn.classList.remove('hidden'); // Show export button!
        typingIndicator.classList.add('hidden');
        statusDot.className = 'dot idle';
        statusText.innerText = 'Awaiting Instructions';
        
        const div = document.createElement('div');
        div.className = 'message';
        div.style.textAlign = 'center';
        div.style.color = '#22c55e';
        div.innerHTML = '<strong>✨ Analysis Complete</strong>';
        transcriptFeed.appendChild(div);
        scrollToBottom();
    });
}

// --- START DEBATE ---
startBtn.addEventListener('click', async () => {
    if (isDebating || !loadedCaseData) return;
    try {
        await fetch('http://localhost:3000/api/start-debate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseData: loadedCaseData }) // Send dynamic data!
        });
    } catch (err) {
        alert("Failed to connect to backend.");
    }
});

// --- PDF EXPORT (jsPDF) ---
exportPdfBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(`CreditCourt AI Report`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Case ID: ${loadedCaseData?.id || 'Unknown'}`, 20, 30);
    
    let yPos = 45;
    
    messageHistory.forEach(msg => {
        // Add new page if too low
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`${msg.actor}:`, 20, yPos);
        yPos += 7;
        
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(msg.text, 170);
        doc.text(lines, 20, yPos);
        yPos += (lines.length * 7) + 5;
    });

    doc.save(`CreditCourt_Report_${loadedCaseData?.id}.pdf`);
});

initEventSource();
