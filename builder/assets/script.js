const state = {
  questions: []
};

const ALLOWED_STYLES = ["Analytique", "Directif", "Aimable", "Expressif"];

const DEFAULT_CHOICES = [
  { text: "", value: "Analytique" },
  { text: "", value: "Directif" },
  { text: "", value: "Aimable" },
  { text: "", value: "Expressif" }
];

const root = document.getElementById("questionsRoot");
const questionTemplate = document.getElementById("questionTemplate");
const choiceTemplate = document.getElementById("choiceTemplate");
const statusEl = document.getElementById("status");
const jsonOutputWrap = document.getElementById("jsonOutputWrap");
const jsonOutput = document.getElementById("jsonOutput");
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  const darkMode = theme === "dark";
  themeToggle.textContent = darkMode ? "☀️ Mode clair" : "🌙 Mode sombre";
  localStorage.setItem("builder-theme", theme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function normalizeQuestion(question) {
  return {
    title: question?.title || "",
    choices: Array.isArray(question?.choices) && question.choices.length
      ? question.choices.map((c) => ({
          text: c.text || "",
          value: c.value || "Analytique"
        }))
      : structuredClone(DEFAULT_CHOICES)
  };
}

function validateJsonStructure(data) {
  if (!data || typeof data !== "object") {
    return "Le JSON doit être un objet.";
  }

  if (!Array.isArray(data.questions)) {
    return "Le JSON doit contenir une clé questions (tableau).";
  }

  for (let i = 0; i < data.questions.length; i += 1) {
    const question = data.questions[i];
    const qPos = i + 1;

    if (!question || typeof question !== "object") {
      return `La question ${qPos} est invalide (objet attendu).`;
    }

    if (typeof question.title !== "string") {
      return `La question ${qPos} doit contenir un champ title (texte).`;
    }

    if (!Array.isArray(question.choices) || question.choices.length === 0) {
      return `La question ${qPos} doit contenir choices (tableau non vide).`;
    }

    for (let j = 0; j < question.choices.length; j += 1) {
      const choice = question.choices[j];
      const cPos = j + 1;
      if (!choice || typeof choice !== "object") {
        return `Le choix ${cPos} de la question ${qPos} est invalide (objet attendu).`;
      }
      if (typeof choice.text !== "string") {
        return `Le choix ${cPos} de la question ${qPos} doit contenir text (texte).`;
      }
      if (!ALLOWED_STYLES.includes(choice.value)) {
        return `Le choix ${cPos} de la question ${qPos} contient une valeur invalide (${choice.value}).`;
      }
    }
  }

  return null;
}

function getChoiceLetter(index) {
  return String.fromCharCode(65 + index);
}

function getDataObject() {
  return {
    questions: state.questions.map((question) => ({
      title: question.title,
      choices: question.choices.map((choice, index) => ({
        letter: getChoiceLetter(index),
        text: choice.text,
        value: choice.value
      }))
    }))
  };
}

function render() {
  root.innerHTML = "";

  state.questions.forEach((question, qIndex) => {
    const node = questionTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".question-title").textContent = `Question ${qIndex + 1}`;
    const titleArea = node.querySelector(".q-title");
    titleArea.value = question.title;
    titleArea.addEventListener("input", (event) => {
      state.questions[qIndex].title = event.target.value;
    });

    node.querySelector(".remove-question").addEventListener("click", () => {
      state.questions.splice(qIndex, 1);
      render();
    });

    node.querySelector(".move-up").addEventListener("click", () => {
      if (qIndex === 0) return;
      [state.questions[qIndex - 1], state.questions[qIndex]] = [state.questions[qIndex], state.questions[qIndex - 1]];
      render();
    });

    node.querySelector(".move-down").addEventListener("click", () => {
      if (qIndex === state.questions.length - 1) return;
      [state.questions[qIndex + 1], state.questions[qIndex]] = [state.questions[qIndex], state.questions[qIndex + 1]];
      render();
    });

    const choicesRoot = node.querySelector(".choices-root");
    question.choices.forEach((choice, cIndex) => {
      const choiceNode = choiceTemplate.content.firstElementChild.cloneNode(true);
      const letterElement = choiceNode.querySelector(".c-letter");
      const textInput = choiceNode.querySelector(".c-text");
      const valueSelect = choiceNode.querySelector(".c-value");

      letterElement.textContent = getChoiceLetter(cIndex);
      textInput.value = choice.text;
      valueSelect.value = choice.value;

      textInput.addEventListener("input", (event) => {
        state.questions[qIndex].choices[cIndex].text = event.target.value;
      });
      valueSelect.addEventListener("change", (event) => {
        state.questions[qIndex].choices[cIndex].value = event.target.value;
      });

      choiceNode.querySelector(".move-choice-up").addEventListener("click", () => {
        if (cIndex === 0) return;
        const choices = state.questions[qIndex].choices;
        [choices[cIndex - 1], choices[cIndex]] = [choices[cIndex], choices[cIndex - 1]];
        render();
      });

      choiceNode.querySelector(".move-choice-down").addEventListener("click", () => {
        const choices = state.questions[qIndex].choices;
        if (cIndex === choices.length - 1) return;
        [choices[cIndex + 1], choices[cIndex]] = [choices[cIndex], choices[cIndex + 1]];
        render();
      });

      choiceNode.querySelector(".remove-choice").addEventListener("click", () => {
        state.questions[qIndex].choices.splice(cIndex, 1);
        render();
      });

      choicesRoot.appendChild(choiceNode);
    });

    node.querySelector(".add-choice").addEventListener("click", () => {
      state.questions[qIndex].choices.push({ text: "", value: "Analytique" });
      render();
    });

    root.appendChild(node);
  });
}

function addQuestion() {
  state.questions.push(
    normalizeQuestion({
      title: "",
      choices: structuredClone(DEFAULT_CHOICES)
    })
  );
  render();
  setStatus("Question ajoutée");
}

function loadFromObject(data) {
  const validationError = validateJsonStructure(data);
  if (validationError) {
    throw new Error(validationError);
  }
  state.questions = data.questions.map(normalizeQuestion);
  render();
  setStatus(`Chargé: ${state.questions.length} question(s)`);
}

async function loadDefaultData() {
  try {
    const response = await fetch("assets/data.json");
    if (!response.ok) throw new Error("Impossible de charger assets/data.json");
    const data = await response.json();
    loadFromObject(data);
  } catch (error) {
    alert(`Erreur de chargement JSON:\n${error.message}`);
    setStatus(error.message);
  }
}

function getJsonString() {
  return JSON.stringify(getDataObject(), null, 2);
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(getJsonString());
    setStatus("JSON copié dans le presse-papiers");
  } catch (_) {
    setStatus("Copie impossible (permissions navigateur)");
  }
}

function downloadJson() {
  const blob = new Blob([getJsonString()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Téléchargement démarré");
}

function togglePreview() {
  const willShow = jsonOutputWrap.hidden;
  jsonOutputWrap.hidden = !willShow;
  if (willShow) {
    jsonOutput.value = getJsonString();
    setStatus("Aperçu généré");
  }
}

function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      loadFromObject(data);
    } catch (error) {
      const message = error?.message || "Le fichier JSON est invalide ou ne respecte pas la structure attendue.";
      alert(message);
      setStatus(message);
    }
  };
  reader.readAsText(file);
}

document.getElementById("addQuestion").addEventListener("click", addQuestion);
document.getElementById("loadDefault").addEventListener("click", loadDefaultData);
document.getElementById("copyJson").addEventListener("click", copyJson);
document.getElementById("downloadJson").addEventListener("click", downloadJson);
document.getElementById("previewJson").addEventListener("click", togglePreview);

const fileInput = document.getElementById("fileInput");
const savedTheme = localStorage.getItem("builder-theme") || "light";
applyTheme(savedTheme);
themeToggle.addEventListener("click", toggleTheme);

document.getElementById("importJson").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) {
    importFromFile(fileInput.files[0]);
  }
});

// Démarrage: on tente de charger data.json, sinon on crée une question vide.
loadDefaultData().catch(() => {
  addQuestion();
});
