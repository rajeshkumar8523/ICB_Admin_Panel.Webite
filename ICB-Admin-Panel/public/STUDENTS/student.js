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
    document.getElementById("downloadModal").style.display = "block";
}

function closeDownloadModal() {
    document.getElementById("downloadModal").style.display = "none";
}

function downloadPDF() {
    alert("Downloading PDF...");
    closeDownloadModal();
}

function downloadExcel() {
    alert("Downloading Excel...");
    closeDownloadModal();
}