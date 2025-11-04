
const scriptURL = "https://script.google.com/macros/s/AKfycbzMvTya7wOKR6qYBD__E-U9xtmXxmUMjFXyP_VcdQLfWvKxVq9THvrhHgSyrqMgiV_0/exec";

function showSection(id) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'table') loadData();
  if (id === 'chart') loadChartData();
}

document.getElementById('auditForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const partNo = document.getElementById('partNo').value;
  const partName = document.getElementById('partName').value;
  const problem = document.getElementById('problem').value;
  const issue = document.getElementById('issue').value;
  const recorder = document.getElementById('recorder').value;
  const causer = document.getElementById('causer').value;
  const imageInput = document.getElementById('imageInput');
  const docType = document.getElementById('docType').value;
  const date = new Date().toLocaleString('th-TH');

  if (imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function() {
      const imageData = reader.result;
      sendToGoogleSheets({ date, partNo, partName, problem, issue, recorder, causer, imageData, docType });
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    sendToGoogleSheets({ date, partNo, partName, problem, issue, recorder, causer, imageData: "", docType });
  }
});

function sendToGoogleSheets(record) {
  fetch(scriptURL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(record),
    headers: { 'Content-Type': 'application/json' }
  }).then(() => {
    alert('บันทึกข้อมูลเรียบร้อย');
    loadData();
  }).catch(error => console.error('Error:', error));
}

function loadData() {
  const sheetName = document.getElementById('sheetSelector')?.value || 'Audit LG1';
  fetch(`${scriptURL}?sheet=${encodeURIComponent(sheetName)}`)
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector('#auditTable tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      const fromDate = document.getElementById('fromDate').value;
      const toDate = document.getElementById('toDate').value;
      const problemCounts = {};
      data.forEach(row => {
        const dateObj = new Date(row.Date);
        if ((fromDate && dateObj < new Date(fromDate)) || (toDate && dateObj > new Date(toDate))) return;
        const tr = document.createElement('tr');
        const imgTag = row.Image ? `<img src="${row.Image}" class="thumbnail" onclick="openModal('${row.Image}')">` : '';
        tr.innerHTML = `
          <td>${row.Date}</td>
          <td>${row['Part No']}</td>
          <td>${row['Part Name']}</td>
          <td>${row.Problem}</td>
          <td>${row.Issue}</td>
          <td>${row.Recorder}</td>
          <td>${row.Causer}</td>
          <td>${imgTag}</td>
        `;
        tbody.appendChild(tr);
        if (row.Problem) {
          problemCounts[row.Problem] = (problemCounts[row.Problem] || 0) + 1;
        }
      });
    });
}

function loadChartData() {
  fetch(`${scriptURL}?sheet=Audit LG1`)
    .then(response => response.json())
    .then(data => {
      const fromDate = document.getElementById('chartFromDate').value;
      const toDate = document.getElementById('chartToDate').value;
      const countsLG1 = {};
      data.forEach(row => {
        const dateObj = new Date(row.Date);
        if ((fromDate && dateObj < new Date(fromDate)) || (toDate && dateObj > new Date(toDate))) return;
        if (row.Problem) countsLG1[row.Problem] = (countsLG1[row.Problem] || 0) + 1;
      });
      renderChart(countsLG1, 'problemChartLG1', 'Audit LG1');
    });

  fetch(`${scriptURL}?sheet=Audit LG2`)
    .then(response => response.json())
    .then(data => {
      const fromDate = document.getElementById('chartFromDate').value;
      const toDate = document.getElementById('chartToDate').value;
      const countsLG2 = {};
      data.forEach(row => {
        const dateObj = new Date(row.Date);
        if ((fromDate && dateObj < new Date(fromDate)) || (toDate && dateObj > new Date(toDate))) return;
        if (row.Problem) countsLG2[row.Problem] = (countsLG2[row.Problem] || 0) + 1;
      });
      renderChart(countsLG2, 'problemChartLG2', 'Audit LG2');
    });
}

function renderChart(problemCounts, chartId, chartTitle) {
  const ctx = document.getElementById(chartId)?.getContext('2d');
  if (!ctx) return;
  if (Object.keys(problemCounts).length === 0) {
    ctx.canvas.parentNode.innerHTML = `<p style="color:gray;">ไม่มีข้อมูลสำหรับ ${chartTitle}</p>`;
    return;
  }
  const colors = Object.keys(problemCounts).map((_, i) => `hsl(${i * 40 % 360}, 70%, 60%)`);
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(problemCounts),
      datasets: [{
        label: 'จำนวนปัญหา',
        data: Object.values(problemCounts),
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: chartTitle }
      }
    }
  });
}

function openModal(src) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  modal.style.display = "flex";
  modalImg.src = src;
}

function closeModal() {
  document.getElementById("imageModal").style.display = "none";
}

function exportToExcel() {
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  const rows = Array.from(document.querySelectorAll('#auditTable tbody tr'));
  const headers = ["Date", "Part No", "Part Name", "Problem", "Issue", "Recorder", "Causer"];
  const data = [headers];
  rows.forEach(row => {
    const cells = Array.from(row.cells).slice(0, 7);
    const dateText = cells[0].innerText;
    const dateObj = new Date(dateText);
    if ((!fromDate || dateObj >= new Date(fromDate)) && (!toDate || dateObj <= new Date(toDate))) {
      data.push(cells.map(cell => cell.innerText));
    }
  });
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit");
  XLSX.writeFile(wb, "audit_export.xlsx");
}
