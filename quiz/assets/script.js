// État global du quiz:
// - dataGraph: scores par style [Analytique, Directif, Aimable, Expressif]
// - questionCount: nombre de questions chargées depuis data.json
// - chartInstance: référence du graphique Chart.js courant
let dataGraph = [0, 0, 0, 0];
const arrType = ["analytique", "directif", "aimable", "expressif"];
let questionCount = 0;
let chartInstance = null;
let printChartInstance = null;

// Helper DOM: applique un callback à tous les éléments trouvés.
function forEachElement(selector, callback) {
  document.querySelectorAll(selector).forEach(callback);
}

// Helper style: applique une propriété CSS à un ensemble d'éléments.
function setStyle(selector, property, value) {
  forEachElement(selector, (element) => {
    element.style[property] = value;
  });
}

// Formate les pourcentages (entier ou 1 décimale max).
function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// Construit dynamiquement une slide-question (titre + 4 choix).
function buildQuestionSection(question, questionIndex) {
  const section = document.createElement("section");
  const deck = document.createElement("div");
  deck.className = "deck";

  const title = document.createElement("h2");
  title.innerHTML = `<span class="surtitre">QUESTION ${questionIndex + 1}</span> ${question.title}`;
  deck.appendChild(title);

  question.choices.forEach((choice, choiceIndex) => {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    const id = `q${questionIndex + 1}_${String(choiceIndex + 1).padStart(2, "0")}`;
    input.type = "radio";
    input.id = id;
    input.name = `q${questionIndex + 1}`;
    input.value = choice.value;

    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.innerHTML = `<h3>${choice.letter}</h3><p>${choice.text}</p>`;

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    deck.appendChild(wrapper);
  });

  section.appendChild(deck);
  return section;
}

// Insère toutes les slides questions avant la section de fin.
function renderQuestions(questions) {
  const container = document.getElementById("questions-container");
  const completionSection = document.getElementById("completion-section");
  questions.forEach((question, index) => {
    const section = buildQuestionSection(question, index);
    container.insertBefore(section, completionSection);
  });
}

// Réinitialise l'affichage de la section résultat avant un nouveau calcul.
function resetResultView() {
  const messageElement = document.querySelector(".message");
  if (messageElement) {
    messageElement.innerHTML = "";
  }
  setStyle(".votretype", "color", "black");
  setStyle(".analytique, .directif, .aimable, .expressif", "display", "none");
  setStyle(".analytique2, .directif2, .aimable2, .expressif2", "backgroundColor", "#fff");
}

// Retourne l'index de la plus grande valeur d'un tableau.
function indexOfMax(arr) {
  if (arr.length === 0) {
    return -1;
  }

  let max = arr[0];
  let maxIndex = 0;
  for (let i = 1; i < arr.length; i += 1) {
    if (arr[i] > max) {
      maxIndex = i;
      max = arr[i];
    }
  }
  return maxIndex;
}

// Colore et affiche les colonnes correspondant au style dominant.
function applyResultTheme(maxIndex) {
  if (maxIndex === 0) {
    setStyle(".analytique", "display", "block");
    setStyle(".votretype", "color", "hsla(204, 82%, 57%, 1)");
    setStyle(".analytique2", "backgroundColor", "hsla(204, 82%, 57%, .4)");
  }
  if (maxIndex === 1) {
    setStyle(".directif", "display", "block");
    setStyle(".votretype", "color", "hsla(180, 48%, 52%, 1)");
    setStyle(".directif2", "backgroundColor", "hsla(180, 48%, 52%, 0.4)");
  }
  if (maxIndex === 2) {
    setStyle(".aimable", "display", "block");
    setStyle(".votretype", "color", "hsla(30, 100%, 63%, 1)");
    setStyle(".aimable2", "backgroundColor", "hsla(30, 100%, 63%, 0.5)");
  }
  if (maxIndex === 3) {
    setStyle(".expressif", "display", "block");
    setStyle(".votretype", "color", "hsla(42, 100%, 67%, 1)");
    setStyle(".expressif2", "backgroundColor", "hsla(42, 100%, 67%, 0.4)");
  }
}

// (Re)génère le graphique de résultat.
// On détruit l'instance précédente pour éviter les doublons/fuites mémoire.
function makeGraph() {
  const chartContainer = document.querySelector(".ContainChart");
  if (!chartContainer) {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  const oldCanvas = document.getElementById("myChart");
  if (oldCanvas) {
    oldCanvas.remove();
  }

  const newCanvas = document.createElement("canvas");
  newCanvas.id = "myChart";
  chartContainer.appendChild(newCanvas);

  chartInstance = new Chart(newCanvas, {
    type: "pie",
    data: {
      labels: ["Analytique", "Directif", "Aimable", "Expressif"],
      datasets: [
        {
          label: "Votre resultat",
          data: [dataGraph[0], dataGraph[1], dataGraph[2], dataGraph[3]],
          backgroundColor: ["#36A2EB", "#4BC0C0", "#FF9F40", "#FFCD56"],
          borderWidth: 4
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          onClick: null
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `\u00A0Résultat : ${formatPercent(context.parsed)}%`;
            }
          }
        }
      }
    }
  });
}

function displayRadioValue() {
  // Nettoie d'abord l'UI résultat, puis lit les réponses sélectionnées.
  resetResultView();
  const listReponse = Array.from(document.querySelectorAll("input:checked"));
  const messageElement = document.querySelector(".message");

  // Validation: on exige une réponse pour chaque question.
  if (listReponse.length < questionCount) {
    if (messageElement) {
      messageElement.insertAdjacentHTML(
        "beforeend",
        '<p><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>&nbsp;&nbsp;Il semble qu’au moins une des questions n’ait pas été répondue. Veuillez <a href="javascript:Reveal.slide(1);Reveal.toggleOverview();">revérifier vos réponses.</a></p>'
      );
    }
    return;
  }

  // Chaque question vaut une fraction de 100 pour garder des pourcentages
  // justes même quand on teste avec un nombre réduit de questions.
  dataGraph = [0, 0, 0, 0];
  const pointsPerQuestion = questionCount > 0 ? 100 / questionCount : 0;
  for (let i = 0; i < listReponse.length; i += 1) {
    switch (listReponse[i].value) {
      case "Analytique":
        dataGraph[0] += pointsPerQuestion;
        break;
      case "Directif":
        dataGraph[1] += pointsPerQuestion;
        break;
      case "Aimable":
        dataGraph[2] += pointsPerQuestion;
        break;
      case "Expressif":
        dataGraph[3] += pointsPerQuestion;
        break;
      default:
        break;
    }
  }

  const maxIndex = indexOfMax(dataGraph);
  forEachElement(".votretype", (element) => {
    element.innerHTML = arrType[maxIndex];
  });

  // Met à jour le tableau, le titre et le graphique, puis passe à la slide suivante.
  applyResultTheme(maxIndex);
  makeGraph();
  Reveal.right();
}

function imprimeResultat() {
  openReportPreviewTab();
}

function getQuestionText(questionSection) {
  const heading = questionSection.querySelector("h2");
  if (!heading) {
    return "";
  }
  return heading.textContent.replace(/\s+/g, " ").trim();
}

function getSelectedAnswerMarkup(questionSection) {
  const selectedInput = questionSection.querySelector('input[type="radio"]:checked');
  if (!selectedInput) {
    return "Aucune réponse sélectionnée";
  }
  const selectedLabel = questionSection.querySelector(`label[for="${selectedInput.id}"]`);
  if (!selectedLabel) {
    return "Réponse introuvable";
  }
  const letterElement = selectedLabel.querySelector("h3");
  const textElement = selectedLabel.querySelector("p");
  const letter = letterElement ? letterElement.textContent.trim().toLowerCase() : "";
  const answerText = textElement
    ? textElement.textContent.replace(/\s+/g, " ").trim()
    : selectedLabel.textContent.replace(/\s+/g, " ").trim();

  if (!letter) {
    return answerText;
  }

  return `<span class="print-choice-letter">${letter})</span> ${answerText}`;
}

function buildAnswersPrintSection() {
  const sections = Array.from(document.querySelectorAll("#questions-container > section"));
  const questionSections = sections.filter((section) => section.querySelector(".deck input[type='radio']"));

  const items = questionSections
    .map((section, index) => {
      const questionText = getQuestionText(section);
      const answerMarkup = getSelectedAnswerMarkup(section);
      const cleanQuestionText = questionText.replace(/^QUESTION\s+\d+\s*/i, "").trim();
      return `
        <div class="print-answer-item">
          <p class="print-question-title">Question #${index + 1} : ${cleanQuestionText}</p>
          <p class="print-answer-text">${answerMarkup}</p>
        </div>
      `;
    })
    .join("");

  return `
    <section class="report-page">
      <div class="report-page-body">
        <h2>Réponses au questionnaire</h2>
        <div class="print-answer-list">${items}</div>
      </div>
    </section>
  `;
}

function buildChartPrintSection() {
  const dominantType = document.querySelector(".resultat .votretype");
  const dominantText = dominantType ? dominantType.textContent.trim() : "";
  const profileTableMarkup = getPrintableProfileTableMarkup();
  const completeProfileTableMarkup = getPrintableCompleteProfileTableMarkup();
  const chartImageDataUrl = createChartImageDataUrl();
  const scoreSummaryMarkup = buildScoreSummaryMarkup();
  const chartMarkup = chartImageDataUrl
    ? `<img src="${chartImageDataUrl}" alt="Graphique des résultats" class="report-chart-image">`
    : "<p>Graphique indisponible.</p>";

  return `
    <section class="report-page report-chart-page">
      <div class="report-page-body">
        <h2>Résultat du profil</h2>
        <p class="report-subtitle">Style dominant : <strong>${dominantText || "Non disponible"}</strong></p>
        <div class="report-chart-wrapper">
          ${chartMarkup}
        </div>
        <div class="report-score-summary">
          ${scoreSummaryMarkup}
        </div>
        <div class="report-profile-table-wrapper">
          ${profileTableMarkup}
        </div>
        <div class="report-complete-table-wrapper">
          <h3>Tableau complet des caractéristiques</h3>
          ${completeProfileTableMarkup}
        </div>
      </div>
    </section>
  `;
}

function buildScoreSummaryMarkup() {
  const labels = ["Analytique", "Directif", "Aimable", "Expressif"];
  const colors = ["#36A2EB", "#4BC0C0", "#FF9F40", "#FFCD56"];
  const items = labels
    .map((label, index) => {
      const value = Number.isFinite(dataGraph[index]) ? formatPercent(dataGraph[index]) : "0";
      return `
        <li>
          <span class="score-style-label">
            <i class="score-color-chip" style="background-color: ${colors[index]};"></i>
            ${label}
          </span>
          <strong>${value}%</strong>
        </li>
      `;
    })
    .join("");
  return `<h3>Résultats par style</h3><ul>${items}</ul>`;
}

function getPrintableProfileTableMarkup() {
  const sourceTable = document.querySelector("section.resultat table.profil");
  if (!sourceTable) {
    return "<p>Tableau de profil indisponible.</p>";
  }

  const clonedTable = sourceTable.cloneNode(true);
  clonedTable.classList.add("print-profile-table");
  return clonedTable.outerHTML;
}

function getPrintableCompleteProfileTableMarkup() {
  const sourceTable = document.querySelector("table.profilcomplet");
  if (!sourceTable) {
    return "<p>Tableau complet indisponible.</p>";
  }

  const clonedTable = sourceTable.cloneNode(true);
  clonedTable.classList.add("print-profile-table", "print-profile-table-complete");
  return clonedTable.outerHTML;
}

function createChartImageDataUrl() {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 900;
  tempCanvas.height = 520;
  let tempChartInstance = null;
  if (printChartInstance) {
    printChartInstance.destroy();
  }

  tempChartInstance = new Chart(tempCanvas, {
    type: "pie",
    data: {
      labels: ["Analytique", "Directif", "Aimable", "Expressif"],
      datasets: [
        {
          label: "Votre resultat",
          data: [dataGraph[0], dataGraph[1], dataGraph[2], dataGraph[3]],
          backgroundColor: ["#36A2EB", "#4BC0C0", "#FF9F40", "#FFCD56"],
          borderWidth: 3
        }
      ]
    },
    options: {
      animation: false,
      responsive: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#111",
            font: {
              family: "Source Sans 3, Source Sans Pro, Arial, sans-serif",
              size: 14
            }
          }
        },
        tooltip: {
          enabled: false
        }
      }
    }
  });

  tempChartInstance.update("none");
  const imageDataUrl = tempCanvas.toDataURL("image/png");
  tempChartInstance.destroy();
  return imageDataUrl;
}

function buildReportHtml() {
  const now = new Date();
  const datePart = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const hourPart = String(now.getHours()).padStart(2, "0");
  const generatedAt = `${datePart}, à ${hourPart} h`;

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Rapport - Profil de communication</title>
      <link href="https://fonts.googleapis.com/css2?family=Overpass:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: Letter portrait;
          margin: 1.25in 0.6in 0.6in;
        }
        body {
          margin: 0;
          background: #fff;
          color: #111;
          font-family: "Source Sans 3", "Source Sans Pro", Arial, sans-serif;
        }
        .report {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.6in;
          box-sizing: border-box;
        }
        .report-header {
          border-bottom: 1px solid #d1d5db;
          margin-bottom: 0.2in;
          padding-bottom: 0.08in;
        }
        .report-header h1 {
          margin: 0;
          font-size: 27pt;
          font-family: "Overpass", Arial, sans-serif;
          font-weight: 700;
          line-height: 1.15;
        }
        .report-header p {
          margin: 0.06in 0 0;
          font-size: 10pt;
          color: #4b5563;
          font-weight: 400;
        }
        .report-page {
          margin-top: 0.14in;
        }
        .report-page-body {
          padding-top: 0.02in;
        }
        .report-page h2 {
          margin: 0 0 0.06in;
          font-size: 18pt;
          font-weight: 600;
        }
        .report-subtitle {
          margin: 0 0 0.12in;
          font-size: 13pt;
          font-weight: 400;
          color: #374151;
        }
        .print-answer-item {
          margin: 0 0 0.28in;
          break-inside: avoid;
        }
        .print-question-title {
          margin: 0 0 0.05in;
          font-size: 14pt;
          font-weight: 600;
          line-height: 1.2;
          color: #111;
        }
        .print-answer-text {
          margin: 0;
          font-size: 12.5pt;
          font-weight: 400;
          color: #374151;
          line-height: 1.35;
          background: #f5f7fa;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .print-choice-letter {
          font-weight: 700;
          color: #111;
        }
        .report-chart-page {
          break-before: page;
        }
        .report-chart-wrapper {
          width: 6.3in;
          max-width: 100%;
          margin: 0 auto;
          text-align: center;
        }
        .report-chart-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .report-profile-table-wrapper {
          margin-top: 0.2in;
        }
        .report-complete-table-wrapper {
          margin-top: 0.2in;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .report-complete-table-wrapper h3 {
          margin: 0 0 0.08in;
          font-size: 12.5pt;
          font-weight: 600;
          color: #111;
          break-after: avoid;
          page-break-after: avoid;
        }
        .report-score-summary {
          margin: 0.14in auto 0;
          width: 6.3in;
          max-width: 100%;
        }
        .report-score-summary h3 {
          margin: 0 0 0.06in;
          font-size: 12.5pt;
          font-weight: 600;
          color: #111;
        }
        .report-score-summary ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .report-score-summary li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 11.5pt;
          color: #111;
        }
        .report-score-summary li span {
          font-weight: 600;
        }
        .score-style-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .score-color-chip {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          display: inline-block;
          flex: 0 0 10px;
        }
        .report-score-summary li strong {
          font-weight: 700;
        }
        .print-profile-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .print-profile-table th,
        .print-profile-table td {
          border: 1px solid #d1d5db;
          padding: 7px 8px;
          vertical-align: top;
          font-size: 11.5pt;
          font-weight: 400;
          line-height: 1.25;
          color: #111;
        }
        .print-profile-table th.verticalHeader {
          width: 31%;
          text-align: left;
          font-weight: 700;
          background: #f8fafc;
        }
        .print-profile-table-complete th,
        .print-profile-table-complete td {
          font-size: 11pt;
        }
        .print-profile-table-complete {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <main class="report">
        <header class="report-header">
          <h1>Profil de communication</h1>
          <p>Document généré le ${generatedAt}</p>
        </header>
        ${buildAnswersPrintSection()}
        ${buildChartPrintSection()}
      </main>
    </body>
    </html>
  `;
}

function openReportPreviewTab() {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    alert("Impossible d'ouvrir l'aperçu. Vérifiez que les fenêtres pop-up sont autorisées.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml());
  reportWindow.document.close();
}

window.displayRadioValue = displayRadioValue;
window.imprimeResultat = imprimeResultat;

// Navigation auto à la prochaine slide dès qu'un choix radio est cliqué.
document.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="radio"]')) {
    return;
  }
  Reveal.right();
});

// Charge les questions depuis le JSON, puis initialise Reveal.
fetch("data.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Unable to load JSON");
    }
    return response.json();
  })
  .then((data) => {
    const questions = data.questions || [];
    questionCount = questions.length;
    renderQuestions(questions);

    Reveal.initialize({
      width: 800,
      height: 450,
      minScale: 1.0,
      maxScale: 1.0,
      slideNumber: "c/t"
    });
  })
  // Si le JSON est introuvable/invalide, affiche un message puis initialise quand même Reveal.
  .catch(() => {
    const messageElement = document.querySelector(".message");
    if (messageElement) {
      messageElement.insertAdjacentHTML(
        "beforeend",
        "<p><i class='fa fa-exclamation-triangle' aria-hidden='true'></i>&nbsp;&nbsp;Impossible de charger le questionnaire (data.json).</p>"
      );
    }
    Reveal.initialize({
      width: 800,
      height: 450,
      minScale: 1.0,
      maxScale: 1.0,
      slideNumber: "c/t"
    });
  });
