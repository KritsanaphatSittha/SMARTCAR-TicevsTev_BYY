/**
 * ====================================================================
 * ระบบวิเคราะห์ TCO เชื่อมต่อระบบคำนวณผ่าน Google Sheets API (ลิงก์ล่าสุด)
 * ====================================================================
 */

// อัปเดตลิงก์ Web App URL ตัวล่าสุดที่คุณสร้างเสร็จเรียบร้อยครับ
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzmeb-n5aiVN2wTvBwyPpV_1BFI70T13bsnF9u_ooVNtF5pWhEROAXE2aRNvynZ2Qpn/exec";

let currentCarTypeFilter = "all";
let selectedCarsForCompare = [];
let currentCalculatedResults = [];
let topCarsChartInstance = null; // เก็บอินสแตนซ์ของกราฟ

// Binding Elements จาก HTML DOM
const drawerEl = document.getElementById('filterDrawer');
const overlayEl = document.getElementById('drawerOverlay');
const openBtn = document.getElementById('openDrawer');
const closeBtn = document.getElementById('closeDrawer');
const quickEditBtn = document.getElementById('quickEdit');
const submitBtn = document.getElementById('submitFilter');

const modalEl = document.getElementById('allCarsModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTableBody = document.getElementById('modalTableBody');

const compareActionBar = document.getElementById('compareActionBar');
const compareCountEl = document.getElementById('compareCount');
const startCompareBtn = document.getElementById('startCompareBtn');

const comparisonModal = document.getElementById('comparisonModal');
const closeCompareModalBtn = document.getElementById('closeCompareModalBtn');
const compareDetailTable = document.getElementById('compareDetailTable');

const monthlyModal = document.getElementById('monthlyModal');
const closeMonthlyModalBtn = document.getElementById('closeMonthlyModalBtn');
const monthlyModalBody = document.getElementById('monthlyModalBody');

// ข้อ 6: Binding Elements ของระบุกราฟเพิ่มเข้ามาใหม่
const chartModal = document.getElementById('chartModal');
const openChartBtn = document.getElementById('openChartBtn');
const closeChartModalBtn = document.getElementById('closeChartModalBtn');

const txtDistance = document.getElementById('paramDistance');
const txtYears = document.getElementById('paramYears');
const txtDiesel = document.getElementById('paramDiesel');
const txtBenzine = document.getElementById('paramBenzine');
const txtElectric = document.getElementById('paramElectric');

const renderSpace = document.getElementById('carRenderSpace');
const barSummary = document.getElementById('displaySummary');
const sectionTitleText = document.getElementById('sectionTitleText');
const filterButtons = document.querySelectorAll('.type-filter-btn');

// ข้อ 3: ฟังก์ชันคำนวณและแสดงผลระยะทางรวมแบบ Real-time บนหน้าจอตัวแปร
function calculateAndDisplayTotalDistance() {
    const distanceVal = parseInt(txtDistance.value) || 0;
    const yearsVal = parseInt(txtYears.value) || 0;
    const totalDistance = distanceVal * 12 * yearsVal;

    document.getElementById('displayTotalDistance').textContent = totalDistance.toLocaleString() + " กม.";
    return totalDistance;
}

// ผูกเหตุการณ์เพื่อให้ตัวเลข "รวมระยะทางทั้งหมด" อัปเดตทันทีที่ผู้ใช้พิมพ์
txtDistance.addEventListener('input', calculateAndDisplayTotalDistance);
txtYears.addEventListener('input', calculateAndDisplayTotalDistance);

// ระบบสลับแท็บฟิลเตอร์หน้าแรก
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCarTypeFilter = btn.getAttribute('data-type');

        if (currentCarTypeFilter === "all") sectionTitleText.textContent = "5 อันดับรถยนต์ที่คุ้มค่าที่สุด";
        else if (currentCarTypeFilter === "oil") sectionTitleText.textContent = "5 อันดับรถน้ำมันที่คุ้มค่าที่สุด";
        else if (currentCarTypeFilter === "ev") sectionTitleText.textContent = "5 อันดับรถไฟฟ้าที่คุ้มค่าที่สุด";

        renderCarCardsHTML();
    });
});

function setDrawerState(isOpen) {
    if (isOpen) { drawerEl.classList.add('active'); overlayEl.classList.add('active'); calculateAndDisplayTotalDistance(); }
    else { drawerEl.classList.remove('active'); overlayEl.classList.remove('active'); }
}
openBtn.addEventListener('click', () => setDrawerState(true));
quickEditBtn.addEventListener('click', () => setDrawerState(true));
closeBtn.addEventListener('click', () => setDrawerState(false));
overlayEl.addEventListener('click', () => setDrawerState(false));

function setModalState(isOpen) {
    if (isOpen) { modalEl.classList.add('active'); }
    else { modalEl.classList.remove('active'); resetSelection(); }
}
openModalBtn.addEventListener('click', () => setModalState(true));
closeModalBtn.addEventListener('click', () => setModalState(false));
closeCompareModalBtn.addEventListener('click', () => comparisonModal.classList.remove('active'));
closeMonthlyModalBtn.addEventListener('click', () => monthlyModal.classList.remove('active'));

// เปิดปิดหน้าต่างกราฟ
openChartBtn.addEventListener('click', () => {
    chartModal.classList.add('active');
    renderTopCarsChart();
});
closeChartModalBtn.addEventListener('click', () => {
    chartModal.classList.remove('active');
});

function resetSelection() {
    selectedCarsForCompare = [];
    compareActionBar.classList.remove('active');
    document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
}

function handleCheckboxChange(checkbox, carName) {
    if (checkbox.checked) {
        if (selectedCarsForCompare.length >= 3) {
            checkbox.checked = false;
            alert("สามารถเลือกเปรียบเทียบรถได้สูงสุด 3 คันครับ");
            return;
        }
        const targetCar = currentCalculatedResults.find(c => c.name === carName);
        if (targetCar) selectedCarsForCompare.push(targetCar);
    } else {
        selectedCarsForCompare = selectedCarsForCompare.filter(c => c.name !== carName);
    }

    compareCountEl.textContent = selectedCarsForCompare.length;
    if (selectedCarsForCompare.length > 0) {
        compareActionBar.classList.add('active');
        startCompareBtn.disabled = selectedCarsForCompare.length < 2;
    } else {
        compareActionBar.classList.remove('active');
    }
}

// หน้าต่างเปรียบเทียบรถยนต์เจาะลึก
startCompareBtn.addEventListener('click', () => {
    if (selectedCarsForCompare.length < 2) return;
    compareDetailTable.innerHTML = "";

    let headerRow = `<tr class="compare-header-row"><td class="compare-label-col">หัวข้อเปรียบเทียบ</td>`;
    selectedCarsForCompare.forEach(car => {
        headerRow += `<td class="compare-data-col">${car.name}<br><span class="car-badge ${car.type === 'ไฟฟ้า' ? 'badge-ev' : 'badge-ice'}" style="margin-top:4px;">${car.type}</span></td>`;
    });
    headerRow += `</tr>`;

    let bodyRows = `
    <tr>
        <td class="compare-label-col">ค่าใช้จ่ายสะสมรวมสุทธิ</td>
        ${selectedCarsForCompare.map(car => `<td class="compare-data-col compare-total-highlight">฿${Number(car.totalCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>`).join('')}
    </tr>
    <tr>
        <td class="compare-label-col">ราคาซื้อเริ่มต้น</td>
        ${selectedCarsForCompare.map(car => `<td class="compare-data-col">฿${Number(car.basePrice).toLocaleString()}</td>`).join('')}
    </tr>
    <tr>
        <td class="compare-label-col">ราคาขายต่อคงเหลือ</td>
        ${selectedCarsForCompare.map(car => `<td class="compare-data-col" style="color: #2b8a3e;">฿${Number(car.resalePrice).toLocaleString()}</td>`).join('')}
    </tr>
    <tr>
        <td class="compare-label-col">ค่าพลังงานรวมสะสม</td>
        ${selectedCarsForCompare.map(car => `<td class="compare-data-col">฿${Number(car.energyCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>`).join('')}
    </tr>
    `;

    compareDetailTable.innerHTML = headerRow + bodyRows;
    comparisonModal.classList.add('active');
});

// หน้าป๊อปอัปรายงานแจกแจงค่าใช้จ่ายสะสมทั้งหมด
function showMonthlyDetails(carName) {
    const car = currentCalculatedResults.find(c => c.name === carName);
    if (!car) return;

    const years = parseInt(txtYears.value) || 1;

    monthlyModalBody.innerHTML = `
    <div style="font-weight: 600; font-size: 1.05rem; color: #1a252f; margin-bottom: 4px; text-align: center;">${car.name}</div>
    <p style="font-size: 0.8rem; color: #7f8c8d; text-align: center; margin-bottom: 16px;">สรุปรายการรายละเอียดค่าใช้จ่ายสะสมทั้งหมดในระบบ Excel (${years} ปี)</p>

    <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.85rem; color: #4a5568;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>💰 ราคารถที่ซื้อเริ่มต้น:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.basePrice).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; color: #2b8a3e;">
            <span>📉 ราคาขายต่อคงเหลือในตาราง:</span> <span style="font-weight: 600;">฿${Number(car.resalePrice).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>📝 ค่าภาษีรถยนต์ประจำปีสะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.tax).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>🛡️ ค่า พรบ. บังคับสะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.prv).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>🏢 ค่าเบี้ยประกันภัยชั้น 1 สะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.insurance).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>🛞 ค่าเปลี่ยนยางรถยนต์สะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.tires).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>🔋 ค่าแบตเตอรี่รถสะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.battery).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>⚡ ค่าแบตเตอรี่ไฟฟ้าสะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.evBattery).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
            <span>🔧 ค่าตรวจเช็คระยะซ่อมบำรุงสะสม:</span> <span style="font-weight: 500; color: #2c3e50;">฿${Number(car.maintenance).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; color: #0076eb;">
            <span>⛽ ค่าพลังงานสะสมรวม (น้ำมัน/ไฟฟ้า):</span> <span style="font-weight: 600;">฿${Number(car.energyCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 12px; border-top: 2px solid #e1f0ff; font-size: 1rem; font-weight: 700; color: #0076eb;">
            <span>📊 ยอดรวมค่าใช้จ่ายสะสมสุทธิ:</span> <span>฿${Number(car.totalCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
        </div>
    </div>
    `;
    monthlyModal.classList.add('active');
}

// --- ฟังก์ชันหลักในการดึงข้อมูลผ่าน API เพื่อคำนวณผ่าน Google Sheets ---
function processTCOCalculation() {
    const distanceVal = parseInt(txtDistance.value) || 0;
    const yearsVal = parseInt(txtYears.value) || 1;

    // ข้อ 3: เงื่อนไขตรวจสอบระยะทางรวมห้ามเกิน 500,000 กม.
    const currentTotalDist = distanceVal * 12 * yearsVal;
    if (currentTotalDist > 500000) {
        alert("เกินค่าของระบบที่กำหนด 500,000 กม.\nกรุณาลองใหม่อีกครั้ง");
        return;
    }

    const payload = {
        distance: distanceVal,
        years: yearsVal,
        diesel: parseFloat(txtDiesel.value) || 0,
        benzine: parseFloat(txtBenzine.value) || 0,
        electric: parseFloat(txtElectric.value) || 0
    };

    barSummary.textContent = `${distanceVal.toLocaleString()} กม./เดือน • ถือครอง ${yearsVal} ปี`;

    renderSpace.innerHTML = `
    <div style="text-align:center; padding: 50px 20px; color: #7f8c8d;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2.2rem; color: #0076eb; margin-bottom: 14px;"></i>
        <p style="font-size: 0.95rem; font-weight: 500; color: #2c3e50;">กำลังประมวลผลข้อมูลผ่านระบบ Google Sheets...</p>
        <p style="font-size: 0.8rem; margin-top: 4px; color: #95a5a6;">ระบบกำลังรันตัวเลขจริงให้ตรงตาราง Excel 100% สักครู่ครับ</p>
    </div>
    `;

    fetch(GOOGLE_SHEET_API_URL, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            if (data.error) {
                renderSpace.innerHTML = `<p style="color:red; text-align:center; padding:20px;">${data.error}</p>`;
                return;
            }
            currentCalculatedResults = data;
            renderCarCardsHTML();
        })
        .catch(error => {
            console.error("Error API Connection:", error);
            renderSpace.innerHTML = `<p style="color:red; text-align:center; padding:20px;">เกิดข้อผิดพลาดในการเชื่อมต่อกรุณาลองใหม่อีกครั้ง</p>`;
        });
}

// --- ฟังก์ชันจัดอันดับและเขียนการ์ดผลลัพธ์ลงหน้าจอเว็บ ---
function renderCarCardsHTML() {
    if (!currentCalculatedResults || currentCalculatedResults.length === 0) return;

    let filteredResults = currentCalculatedResults;
    if (currentCarTypeFilter === "oil") {
        filteredResults = currentCalculatedResults.filter(car => car.type === "เบนซิน" || car.type === "ดีเซล");
    } else if (currentCarTypeFilter === "ev") {
        filteredResults = currentCalculatedResults.filter(car => car.type === "ไฟฟ้า");
    }

    // จัดเรียงลำดับจาก "ค่าใช้จ่ายสะสมรวมน้อยที่สุดไปหามากที่สุด"
    filteredResults.sort((x, y) => {
        if (Math.abs(Number(x.totalCost) - Number(y.totalCost)) < 0.05) {
            // ข้อ 4: เมื่อค่าใช้จ่ายเท่ากัน ล็อกให้รุ่น "Mg 4รุ่นD (LT)" แสดงผลนำหน้า "Mg 4รุ่นD" เสมอ
            if (x.name === "Mg 4รุ่นD (LT)" && y.name === "Mg 4รุ่นD") return -1;
            if (x.name === "Mg 4รุ่นD" && y.name === "Mg 4รุ่นD (LT)") return 1;

            return x.name.localeCompare(y.name);
        }
        return Number(x.totalCost) - Number(y.totalCost);
    });

    renderSpace.innerHTML = "";
    const topFiveCars = filteredResults.slice(0, 5);

    topFiveCars.forEach((item, index) => {
        const typeClass = item.type === "ไฟฟ้า" ? "badge-ev" : "badge-ice";
        const cardDiv = document.createElement('div');
        cardDiv.className = "car-card";

        let rankBadgeStyle = "";
        let medalIcon = "";
        if (index === 0) {
            rankBadgeStyle = "background: linear-gradient(135deg, #ffe066, #f59f00); color: #fff; font-weight: 700; border: 3px solid #fab005; box-shadow: 0 0 10px rgba(245, 159, 0, 0.4); text-shadow: 0 1px 2px rgba(0,0,0,0.2);";
            medalIcon = "<i class='fas fa-award' style='position:absolute; font-size:0.6rem; bottom:-2px; right:-2px; color:#fab005;'></i>";
        } else if (index === 1) {
            rankBadgeStyle = "background: linear-gradient(135deg, #f1f5f9, #cbd5e1); color: #334155; font-weight: 700; border: 3px solid #94a3b8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.3);";
        } else if (index === 2) {
            rankBadgeStyle = "background: linear-gradient(135deg, #ffbc99, #d97706); color: #fff; font-weight: 700; border: 3px solid #b45309; box-shadow: 0 0 8px rgba(217, 119, 6, 0.3); text-shadow: 0 1px 1px rgba(0,0,0,0.2);";
        } else {
            rankBadgeStyle = "background-color: #f8fafc; color: #94a3b8; font-weight: 500; border: 2px solid #e2e8f0;";
        }

        let otherFixedSum = Number(item.tax) + Number(item.prv) + Number(item.insurance) + Number(item.tires) + Number(item.battery) + Number(item.evBattery) + Number(item.maintenance);

        cardDiv.innerHTML = `
        <div class="car-card-header" style="display: flex; gap: 14px; align-items: flex-start;">
            <div style="width: 34px; height: 34px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; position: relative; ${rankBadgeStyle}">
                ${index + 1}
                ${medalIcon}
            </div>
            <div style="flex-grow: 1;">
                <span class="car-badge ${typeClass}">${item.type}</span>
                <div class="car-name" style="margin-top: 2px; font-size: 0.98rem;">${item.name}</div>
            </div>
            <div class="car-price-container">
                <span class="price-label">ค่าใช้จ่ายสะสมรวม</span>
                <span class="price-value" style="font-size: 1.15rem; font-weight:700;">฿${Number(item.totalCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>
        </div>
        <div class="car-details" style="margin-top: 10px;">
            <div class="detail-row">
                <span><i class="fas fa-tag"></i> ราคารถซื้อเริ่มต้น:</span>
                <span class="detail-val">฿${Number(item.basePrice).toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span><i class="fas fa-bolt"></i> ค่าพลังงานรวมสะสม:</span>
                <span class="detail-val">฿${Number(item.energyCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>
            <div class="detail-row">
                <span><i class="fas fa-shield-alt"></i> ค่าใช้จ่ายคงที่สะสมอื่น ๆ:</span>
                <span class="detail-val">฿${otherFixedSum.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>

            <button class="view-monthly-btn" onclick="showMonthlyDetails('${item.name}')">
                <i class="fas fa-list-alt"></i> ดูรายละเอียดรายจ่ายทั้งหมด
            </button>
        </div>
        `;
        renderSpace.appendChild(cardDiv);
    });

    modalTableBody.innerHTML = "";
    filteredResults.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="compare-checkbox" onchange="handleCheckboxChange(this, '${item.name}')"></td>
        <td class="rank-number">${index + 1}</td>
        <td class="table-car-name">${item.name}</td>
        <td><span class="car-badge ${item.type === 'ไฟฟ้า' ? 'badge-ev' : 'badge-ice'}">${item.type}</span></td>
        <td class="table-price-total">฿${Number(item.totalCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
        <td>฿${Number(item.basePrice).toLocaleString()}</td>
        <td>฿${Number(item.energyCost).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
        <td>฿${(Number(item.totalCost) - Number(item.basePrice) - Number(item.energyCost)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
        `;
        modalTableBody.appendChild(tr);
    });
}

// ข้อ 6: ฟังก์ชันคำนวณสัดส่วนค่าใช้จ่ายสะสมตั้งแต่ปีที่ 1 ถึงปีปัจจุบันและสร้างกราฟ
function renderTopCarsChart() {
    const canvasElement = document.getElementById('topCarsChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (topCarsChartInstance) {
        topCarsChartInstance.destroy(); // ล้างกราฟเก่าออกก่อนวาดใหม่ป้องกันการบั๊กซ้อนทับ
    }

    let filteredResults = [...currentCalculatedResults];
    if (currentCarTypeFilter === "oil") {
        filteredResults = filteredResults.filter(car => car.type === "เบนซิน" || car.type === "ดีเซล");
    } else if (currentCarTypeFilter === "ev") {
        filteredResults = filteredResults.filter(car => car.type === "ไฟฟ้า");
    }

    filteredResults.sort((x, y) => {
        if (Math.abs(Number(x.totalCost) - Number(y.totalCost)) < 0.05) {
            if (x.name === "Mg 4รุ่นD (LT)" && y.name === "Mg 4รุ่นD") return -1;
            if (x.name === "Mg 4รุ่นD" && y.name === "Mg 4รุ่นD (LT)") return 1;
            return x.name.localeCompare(y.name);
        }
        return Number(x.totalCost) - Number(y.totalCost);
    });

    const topFiveCars = filteredResults.slice(0, 5);
    const totalYears = parseInt(txtYears.value) || 1;

    // สร้างป้ายชื่อแกน X (ปีที่ 1 ถึง ปีที่ผู้กรอกระบุ)
    const labels = [];
    for (let i = 1; i <= totalYears; i++) {
        labels.push(`ปีที่ ${i}`);
    }

    // กำหนดสีของเส้นกราฟที่ดูง่ายและตัดกันชัดเจนสำหรับรถ 5 คัน
    const lineColors = ['#0076eb', '#00a854', '#ff6b00', '#e03131', '#7048e8'];

    const datasets = topFiveCars.map((car, idx) => {
        const cumulativeData = [];
        // คำนวณแจกแจงค่าใช้จ่ายสะสมเพิ่มขึ้นเป็นสัดส่วนแบบเต็มปี (Linear Projection) 
        for (let t = 1; t <= totalYears; t++) {
            let valuePerYear = (Number(car.totalCost) / totalYears) * t;
            cumulativeData.push(valuePerYear.toFixed(2));
        }
        return {
            label: car.name, // ใช้ชื่อเต็มที่ดึงมาจากชีต ไม่เอาชื่อย่อ
            data: cumulativeData,
            borderColor: lineColors[idx % lineColors.length],
            backgroundColor: lineColors[idx % lineColors.length] + '1A',
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.1
        };
    });

    topCarsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Kanit', size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ฿' + Number(context.raw).toLocaleString(undefined, { minimumFractionDigits: 2 });
                        }
                    },
                    titleFont: { family: 'Kanit' },
                    bodyFont: { family: 'Kanit' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: 'Kanit', size: 10 },
                        callback: function (value) { return '฿' + value.toLocaleString(); }
                    }
                },
                x: {
                    ticks: { font: { family: 'Kanit', size: 11 } }
                }
            }
        }
    });
}

// ผูกระบบบันทึกและคำนวณใหม่พร้อมดักระยะทางรวม
submitBtn.addEventListener('click', () => {
    const distanceVal = parseInt(txtDistance.value) || 0;
    const yearsVal = parseInt(txtYears.value) || 1;
    const currentTotalDist = distanceVal * 12 * yearsVal;

    if (currentTotalDist > 500000) {
        alert("เกินค่าของระบบที่กำหนด 500,000 กม.\nกรุณาลองใหม่อีกครั้ง");
        return;
    }
    processTCOCalculation();
    setDrawerState(false);
});

window.onload = function () {
    calculateAndDisplayTotalDistance(); // เคลียร์สถานะระยะทางตั้งแต่รันเว็บ
    processTCOCalculation();
};