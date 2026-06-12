// simple function to get an element by id
function getById(id) {
  return document.getElementById(id);
}

// set the active sidebar link for the current page
function setActiveSidebarLink() {
  const links = document.querySelectorAll(".sidebar nav a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  links.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === currentPage);
  });
}

// save/load JSON data in localStorage safely
function loadStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// turn a date like 2026-06-10 into Jun 10, 2026
function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

// remove all error styling and messages inside a form
function clearFormErrors(form) {
  form.querySelectorAll(".form-error").forEach(error => {
    error.textContent = "";
  });
  form.querySelectorAll("input").forEach(input => {
    input.classList.remove("invalid");
  });
}

// show a message next to a field when it is invalid
function showFieldError(input, errorId, message) {
  input.classList.add("invalid");
  const errorElement = getById(errorId);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

// add the sidebar highlight when the page loads
setActiveSidebarLink();

// --Workouts page logic --
const workoutForm = getById("workoutForm");
if (workoutForm) {
  const exerciseInput = getById("exercise");
  const durationInput = getById("duration");
  const dateInput = getById("date");
  const workoutList = getById("workoutList");
  const WORKOUT_DRAFT_KEY = "fitnessTrackerWorkoutDraft";
  const WORKOUTS_KEY = "fitnessTrackerWorkouts";

  // load the draft values that were saved while typing
  function loadWorkoutDraft() {
    const draft = loadStorage(WORKOUT_DRAFT_KEY, {});
    exerciseInput.value = draft.exercise || "";
    durationInput.value = draft.duration || "";
    dateInput.value = draft.date || "";
  }

  // save the current form values to localStorage on every change
  function saveWorkoutDraft() {
    saveStorage(WORKOUT_DRAFT_KEY, {
      exercise: exerciseInput.value,
      duration: durationInput.value,
      date: dateInput.value
    });
  }

  // add one workout item into the recent workouts list
  function addWorkoutToList(entry) {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${entry.exercise}</strong><span>${entry.duration} min · ${formatDate(entry.date)}</span>`;
    workoutList.insertBefore(item, workoutList.firstChild);
  }

  // load saved workout entries from localStorage
  function loadSavedWorkouts() {
    const savedWorkouts = loadStorage(WORKOUTS_KEY, []);
    savedWorkouts.forEach(addWorkoutToList);
  }

  // save a workout entry into localStorage
  function saveWorkoutEntry(entry) {
    const workouts = loadStorage(WORKOUTS_KEY, []);
    workouts.unshift(entry);
    saveStorage(WORKOUTS_KEY, workouts);
  }

  // check the workout form fields and show errors if needed
  function validateWorkoutForm() {
    clearFormErrors(workoutForm);

    let valid = true;
    if (exerciseInput.value.trim() === "") {
      showFieldError(exerciseInput, "exerciseError", "Please enter an exercise name.");
      valid = false;
    }
    if (durationInput.value === "" || Number(durationInput.value) < 1) {
      showFieldError(durationInput, "durationError", "Duration must be at least 1 minute.");
      valid = false;
    }
    if (dateInput.value === "") {
      showFieldError(dateInput, "dateError", "Please pick a date.");
      valid = false;
    }

    return valid;
  }

  workoutForm.addEventListener("input", saveWorkoutDraft);
  workoutForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateWorkoutForm()) {
      return;
    }

    const workoutEntry = {
      exercise: exerciseInput.value.trim(),
      duration: durationInput.value,
      date: dateInput.value
    };

    addWorkoutToList(workoutEntry);
    saveWorkoutEntry(workoutEntry);
    localStorage.removeItem(WORKOUT_DRAFT_KEY);
    workoutForm.reset();
  });

  loadWorkoutDraft();
  loadSavedWorkouts();
}

// -------- Health goals page logic --------
const goalModal = getById("goalModal");
const goalForm = getById("goalForm");
if (goalModal && goalForm) {
  const goalsList = getById("goalsList");
  const modalTitle = getById("modalTitle");
  const addGoalButton = getById("addGoalBtn");
  const closeGoalButton = getById("closeModal");
  const cancelGoalButton = getById("cancelModal");
  const goalName = getById("goalName");
  const goalTarget = getById("goalTarget");
  const goalCurrent = getById("goalCurrent");
  const goalUnit = getById("goalUnit");
  const GOALS_KEY = "fitnessTrackerGoals";
  const GOAL_DRAFT_KEY = "fitnessTrackerGoalDraft";
  let editingGoalItem = null;

  // create a list item for one goal
  function createGoalListItem(goal) {
    const percent = Math.min(100, (Number(goal.current) / Number(goal.target)) * 100);
    const item = document.createElement("li");
    item.dataset.name = goal.name;
    item.dataset.target = goal.target;
    item.dataset.current = goal.current;
    item.dataset.unit = goal.unit;
    item.innerHTML =
      `<strong>${goal.name}</strong>` +
      `<span>${goal.current} / ${goal.target}${goal.unit ? ` ${goal.unit}` : ""}</span>` +
      `<div class="progress-bar"><div class="progress-fill" style="width: ${percent}%;"></div></div>` +
      `<button type="button" class="btn-edit">Edit</button>`;
    return item;
  }

  // show a list of goals in the page
  function renderGoals(goals) {
    goalsList.innerHTML = "";
    goals.forEach(goal => goalsList.appendChild(createGoalListItem(goal)));
  }

  // load goals from storage or use sample data the first time
  function loadGoals() {
    const storedGoals = loadStorage(GOALS_KEY, []);
    if (storedGoals.length > 0) {
      renderGoals(storedGoals);
    } else {
      renderGoals([
        { name: "Lose 5 lbs", target: "5", current: "3", unit: "lbs" },
        { name: "Sleep 8 hours nightly", target: "8", current: "7.5", unit: "hrs" },
        { name: "Run 100 miles", target: "100", current: "42", unit: "miles" }
      ]);
    }
  }

  // save the current goal list in storage
  function saveGoals() {
    const goals = Array.from(goalsList.children).map(item => ({
      name: item.dataset.name,
      target: item.dataset.target,
      current: item.dataset.current,
      unit: item.dataset.unit
    }));
    saveStorage(GOALS_KEY, goals);
  }

  // save the modal form values while typing
  function saveGoalDraft() {
    saveStorage(GOAL_DRAFT_KEY, {
      name: goalName.value,
      target: goalTarget.value,
      current: goalCurrent.value,
      unit: goalUnit.value
    });
  }

  // open the modal, either to add a new goal or edit an existing one
  function openGoalModal(item) {
    editingGoalItem = item;
    clearFormErrors(goalForm);
    goalForm.reset();

    if (item) {
      modalTitle.textContent = "Edit Goal";
      goalName.value = item.dataset.name || "";
      goalTarget.value = item.dataset.target || "";
      goalCurrent.value = item.dataset.current || "";
      goalUnit.value = item.dataset.unit || "";
    } else {
      modalTitle.textContent = "Add Goal";
      const draft = loadStorage(GOAL_DRAFT_KEY, {});
      goalName.value = draft.name || "";
      goalTarget.value = draft.target || "";
      goalCurrent.value = draft.current || "";
      goalUnit.value = draft.unit || "";
    }

    goalModal.classList.add("open");
  }

  // close the modal and clear its state
  function closeGoalModal() {
    goalModal.classList.remove("open");
    editingGoalItem = null;
    goalForm.reset();
    clearFormErrors(goalForm);
  }

  // check the goal form and show errors when needed
  function validateGoalForm() {
    clearFormErrors(goalForm);

    let valid = true;
    if (goalName.value.trim() === "") {
      showFieldError(goalName, "goalNameError", "Please enter a goal name.");
      valid = false;
    }
    if (goalTarget.value === "" || Number(goalTarget.value) < 1) {
      showFieldError(goalTarget, "goalTargetError", "Target must be at least 1.");
      valid = false;
    }
    if (goalCurrent.value === "" || Number(goalCurrent.value) < 0) {
      showFieldError(goalCurrent, "goalCurrentError", "Current progress cannot be negative.");
      valid = false;
    }

    return valid;
  }

  addGoalButton.addEventListener("click", function () {
    openGoalModal(null);
  });
  closeGoalButton.addEventListener("click", closeGoalModal);
  cancelGoalButton.addEventListener("click", closeGoalModal);
  goalModal.addEventListener("click", function (event) {
    if (event.target === goalModal) {
      closeGoalModal();
    }
  });
  goalForm.addEventListener("input", saveGoalDraft);

  goalsList.addEventListener("click", function (event) {
    if (event.target.matches(".btn-edit")) {
      const listItem = event.target.closest("li");
      openGoalModal(listItem);
    }
  });

  goalForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateGoalForm()) {
      return;
    }

    const goal = {
      name: goalName.value.trim(),
      target: goalTarget.value,
      current: goalCurrent.value,
      unit: goalUnit.value.trim()
    };

    if (editingGoalItem) {
      const newItem = createGoalListItem(goal);
      editingGoalItem.replaceWith(newItem);
    } else {
      goalsList.prepend(createGoalListItem(goal));
    }

    saveGoals();
    localStorage.removeItem(GOAL_DRAFT_KEY);
    closeGoalModal();
  });

  loadGoals();
}

  function showGoalError(input, errorId, message) {
    input.classList.add("invalid");
    document.getElementById(errorId).textContent = message;
  }

  function getProgressPercent(current, target) {
    var percent = (Number(current) / Number(target)) * 100;
    if (percent > 100) {
      percent = 100;
    }
    return percent;
  }

  function buildGoalHtml(name, target, current, unit) {
    var unitText = unit ? " " + unit : "";
    var percent = getProgressPercent(current, target);

    return (
      "<strong>" + name + "</strong>" +
      "<span>" + current + " / " + target + unitText + "</span>" +
      '<div class="progress-bar"><div class="progress-fill" style="width: ' + percent + '%;"></div></div>' +
      '<button type="button" class="btn-edit">Edit</button>'
    );
  }

  function setGoalData(item, name, target, current, unit) {
    item.setAttribute("data-name", name);
    item.setAttribute("data-target", target);
    item.setAttribute("data-current", current);
    item.setAttribute("data-unit", unit);
    item.innerHTML = buildGoalHtml(name, target, current, unit);
  }

  function addGoalItem(name, target, current, unit) {
    var item = document.createElement("li");
    setGoalData(item, name, target, current, unit);
    goalsList.insertBefore(item, goalsList.firstChild);
  }

  function updateGoalItem(item, name, target, current, unit) {
    setGoalData(item, name, target, current, unit);
  }

  function saveGoalsToStorage() {
    var goals = [];
    var items = goalsList.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      goals.push({
        name: item.getAttribute("data-name"),
        target: item.getAttribute("data-target"),
        current: item.getAttribute("data-current"),
        unit: item.getAttribute("data-unit")
      });
    }
    setStoredData(goalsStorageKey, goals);
  }

  function setSampleGoalData() {
    var sampleGoals = goalsList.querySelectorAll("li");
    var sampleData = [
      { name: "Lose 5 lbs", target: "5", current: "3", unit: "lbs" },
      { name: "Sleep 8 hours nightly", target: "8", current: "7.5", unit: "hrs" },
      { name: "Run 100 miles", target: "100", current: "42", unit: "miles" }
    ];

    for (var k = 0; k < sampleGoals.length; k++) {
      if (sampleData[k]) {
        setGoalData(sampleGoals[k], sampleData[k].name, sampleData[k].target, sampleData[k].current, sampleData[k].unit);
      }
    }
  }

