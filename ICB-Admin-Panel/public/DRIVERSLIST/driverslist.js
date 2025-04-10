const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

function toggleSidebar() {
  sidebar.classList.toggle('expanded');
  toggleSidebarBtn.textContent = sidebar.classList.contains('expanded') ? '←' : '→';

  if (!sidebar.classList.contains('expanded')) {
    document.querySelectorAll('.submenu').forEach(submenu => submenu.classList.remove('active'));
  }
}

toggleSidebarBtn.addEventListener('click', toggleSidebar);

function toggleDropdown(submenuId, iconId) {
  if (!sidebar.classList.contains('expanded')) return;
  var submenu = document.getElementById(submenuId);
  var icon = document.getElementById(iconId);
  submenu.classList.toggle("active");
  icon.classList.toggle("rotated");
}

function openDownloadModal() {
    const modal = document.getElementById("downloadModal");
    modal.style.display = "flex";
    modal.innerHTML = `
        <div class="modalContent">
            <button class="closeModal" onclick="closeDownloadModal()">&times;</button>
            <h2>Download Options</h2>
            <p class="downloadDescription">Choose your preferred format to download the driver list</p>
            <div class="downloadOptions">
                <button class="modalButton" onclick="downloadPDF()">
                    <i class="fas fa-file-pdf"></i>
                    Download PDF
                </button>
                <button class="modalButton" onclick="downloadExcel()">
                    <i class="fas fa-file-excel"></i>
                    Download Excel
                </button>
            </div>
        </div>
    `;
}

function closeDownloadModal() {
    document.getElementById("downloadModal").style.display = "none";
}

function downloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(12);
    const columns = ["Driver ID", "Name", "Designation", "Route", "Email"];
    const rows = employees.map(employee => [
        employee.id,
        employee.name,
        employee.designation,
        employee.route,
        employee.email
    ]);
    doc.autoTable({ 
        head: [columns], 
        body: rows, 
        margin: { top: 30 },
        theme: "grid",
        styles: {
            fontSize: 10,
            cellPadding: 5,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [58, 175, 169],
            textColor: 255,
            fontStyle: 'bold'
        }
    });
    doc.save("mahabubnagar_drivers.pdf");
    closeDownloadModal();
}

function downloadExcel() {
    const worksheet = XLSX.utils.json_to_sheet(employees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Drivers");
    
    // Add some styling
    const wscols = [
        {wch: 10}, // ID
        {wch: 20}, // Name
        {wch: 15}, // Designation
        {wch: 30}, // Route
        {wch: 25}  // Email
    ];
    worksheet["!cols"] = wscols;
    
    const excelFile = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelFile]), "mahabubnagar_drivers.xlsx");
    closeDownloadModal();
}

// Mock driver data for Mahabubnagar district
const employees = [
    { id: 1001, name: "Rajesh Kumar", email: "rajesh.kumar@example.com", designation: "College Driver", route: "Mahabubnagar to Jadcherla" },
    { id: 1002, name: "Suresh Reddy", email: "suresh.reddy@example.com", designation: "College Driver", route: "Mahabubnagar to Wanaparthy" },
    { id: 1003, name: "Mohan Singh", email: "mohan.singh@example.com", designation: "College Driver", route: "Mahabubnagar to Kalwakurthy" },
    { id: 1004, name: "Ravi Kumar", email: "ravi.kumar@example.com", designation: "College Driver", route: "Mahabubnagar to Narayanpet" },
    { id: 1005, name: "Anil Kumar", email: "anil.kumar@example.com", designation: "College Driver", route: "Mahabubnagar to Gadwal" },
    { id: 1006, name: "Prakash Rao", email: "prakash.rao@example.com", designation: "College Driver", route: "Mahabubnagar to Kollapur" },
    { id: 1007, name: "Srinivas Reddy", email: "srinivas.reddy@example.com", designation: "College Driver", route: "Mahabubnagar to Makthal" }
];

let selectedEmployeeId = null;

// Render employee cards
function renderEmployeeCards() {
    const container = document.getElementById("employeeListContainer");
    container.innerHTML = employees.map(employee => `
      <div class="card">
        <div class="profile">
          <div class="profileIcon">
            <i class="fas fa-user-circle" style="font-size: 130px; color: grey;"></i>
          </div>
          <div class="boxes"><b>ID</b>: ${employee.id}</div>
          <div class="boxes"><b>Name</b>: ${employee.name}</div>
          <div class="boxes"><b>Designation</b>: ${employee.designation}</div>
          <div class="boxes"><b>Route</b>: ${employee.route}</div>
          <div class="boxes"><b>Email</b>: ${employee.email}</div>
        </div>
        <div class="actions">
          <button class="actionBtn" onclick="handleActionClick(this)">Action</button>
        </div>
      </div>
    `).join("");
}

// Handle action button click
function handleActionClick(button) {
    const actionsDiv = button.parentElement;
    actionsDiv.innerHTML = `
      <button class="suspendBtn" onclick="handleSuspendClick(${button.parentElement.parentElement.querySelector(".boxes").textContent.split(": ")[1]})">Suspend</button>
      <button class="editBtn" onclick="handleEditClick(this)">Edit</button>
    `;
}

// Handle suspend button click
function handleSuspendClick(id) {
    selectedEmployeeId = id;
    document.getElementById("suspensionPopup").style.display = "block";
}

// Handle confirm suspension
function handleConfirmSuspend() {
    const password = document.getElementById("passwordInput").value;
    if (password === "admin123") {
        employees = employees.filter(employee => employee.id !== selectedEmployeeId);
        renderEmployeeCards();
        document.getElementById("suspensionPopup").style.display = "none";
        alert("Employee suspended successfully!");
    } else {
        document.getElementById("errorMessage").textContent = "Incorrect password!";
    }
}

// Handle cancel suspension
function handleCancel() {
    document.getElementById("suspensionPopup").style.display = "none";
    alert("Suspension Cancelled!");
}

// Handle edit button click
function handleEditClick(button) {
    const card = button.closest(".card");
    const boxes = card.querySelectorAll(".boxes");
    boxes.forEach(box => {
        const value = box.textContent.split(": ")[1];
        box.innerHTML = `<b>${box.textContent.split(": ")[0]}</b>: <input type="text" value="${value}" class="input">`;
    });
    button.textContent = "Publish";
    button.classList.remove("editBtn");
    button.classList.add("saveBtn");
    button.onclick = () => handleSaveClick(card);
}

// Handle save button click
function handleSaveClick(card) {
    const boxes = card.querySelectorAll(".boxes");
    boxes.forEach(box => {
        const input = box.querySelector("input");
        box.innerHTML = `<b>${box.textContent.split(": ")[0]}</b>: ${input.value}`;
    });
    alert("Employee details updated successfully!");
}

// Initial render
renderEmployeeCards();