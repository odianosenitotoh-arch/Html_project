function getById(id) {
  return document.getElementById(id);
}

function setActiveSidebarLink() {
  const links = document.querySelectorAll(".sidebar nav a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  links.forEach(function (link) {
    link.classList.toggle("active", link.getAttribute("href") === currentPage);
  });
}

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

function formatDate(dateValue) {
  const parts = String(dateValue).split("-");
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[Number(month) - 1] + " " + Number(day) + ", " + year;
}

function clearFormErrors(form) {
  form.querySelectorAll(".form-error").forEach(function (error) {
    error.textContent = "";
  });
  form.querySelectorAll("input, select").forEach(function (input) {
    input.classList.remove("invalid");
  });
}

function showFieldError(input, errorId, message) {
  input.classList.add("invalid");
  const errorElement = getById(errorId);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function createTextElement(tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function getSavedWorkouts() {
  const workouts = loadStorage("fitnessTrackerWorkouts", []);
  return Array.isArray(workouts) ? workouts.filter(function (workout) {
    return workout && typeof workout.exercise === "string" &&
      Number(workout.duration) > 0 && typeof workout.date === "string";
  }) : [];
}

function parseStoredDate(dateValue) {
  const parts = String(dateValue).split("-").map(Number);
  if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) {
    return null;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 &&
    date.getDate() === parts[2] ? date : null;
}

function getMonday(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return monday;
}

function setChartBars(chart, values) {
  if (!chart) {
    return;
  }

  const largestValue = Math.max.apply(null, values.concat([1]));
  chart.querySelectorAll(".bar").forEach(function (bar, index) {
    const value = values[index] || 0;
    bar.style.height = Math.round((value / largestValue) * 100) + "%";
  });
}

function updateDashboardFromWorkouts(workouts) {
  const count = getById("workoutsThisWeek");
  const chart = getById("weeklyActivityChart");
  if (!count && !chart) {
    return;
  }

  const today = new Date();
  const weekStart = getMonday(today);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  const durations = [0, 0, 0, 0, 0, 0, 0];

  workouts.forEach(function (workout) {
    const date = parseStoredDate(workout.date);
    if (date && date >= weekStart && date < nextWeekStart) {
      durations[(date.getDay() + 6) % 7] += Number(workout.duration);
    }
  });

  if (count) {
    count.textContent = String(durations.reduce(function (total, value) {
      return total + (value > 0 ? 1 : 0);
    }, 0));
  }
  setChartBars(chart, durations);
}

function updateProgressFromWorkouts(workouts) {
  const totalWorkouts = getById("totalWorkouts");
  const totalMinutes = getById("totalMinutes");
  const chart = getById("monthlyActivityChart");
  if (!totalWorkouts && !totalMinutes && !chart) {
    return;
  }

  const minutes = workouts.reduce(function (total, workout) {
    return total + Number(workout.duration);
  }, 0);
  if (totalWorkouts) {
    totalWorkouts.textContent = String(workouts.length);
  }
  if (totalMinutes) {
    totalMinutes.textContent = String(minutes);
  }

  const now = new Date();
  const weeks = [0, 0, 0, 0];
  workouts.forEach(function (workout) {
    const date = parseStoredDate(workout.date);
    if (date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      weeks[Math.min(3, Math.floor((date.getDate() - 1) / 7))] += 1;
    }
  });
  setChartBars(chart, weeks);
}

setActiveSidebarLink();
const savedWorkouts = getSavedWorkouts();
updateDashboardFromWorkouts(savedWorkouts);
updateProgressFromWorkouts(savedWorkouts);

const workoutForm = getById("workoutForm");
if (workoutForm) {
  const exerciseInput = getById("exercise");
  const durationInput = getById("duration");
  const dateInput = getById("date");
  const workoutList = getById("workoutList");
  const WORKOUT_DRAFT_KEY = "fitnessTrackerWorkoutDraft";

  function loadWorkoutDraft() {
    const draft = loadStorage(WORKOUT_DRAFT_KEY, {});
    exerciseInput.value = draft.exercise || "";
    durationInput.value = draft.duration || "";
    dateInput.value = draft.date || "";
  }

  function saveWorkoutDraft() {
    saveStorage(WORKOUT_DRAFT_KEY, {
      exercise: exerciseInput.value,
      duration: durationInput.value,
      date: dateInput.value
    });
  }

  function addWorkoutToList(entry) {
    const item = document.createElement("li");
    item.appendChild(createTextElement("strong", entry.exercise));
    item.appendChild(createTextElement("span", entry.duration + " min · " + formatDate(entry.date)));
    workoutList.insertBefore(item, workoutList.firstChild);
  }

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
    const workouts = getSavedWorkouts();
    workouts.unshift(workoutEntry);
    saveStorage("fitnessTrackerWorkouts", workouts);
    localStorage.removeItem(WORKOUT_DRAFT_KEY);
    workoutForm.reset();
  });

  loadWorkoutDraft();
  getSavedWorkouts().forEach(addWorkoutToList);
}

const mealForm = getById("mealForm");
if (mealForm) {
  const mealName = getById("mealName");
  const mealCalories = getById("mealCalories");
  const mealType = getById("mealType");
  const mealDate = getById("mealDate");
  const mealList = getById("mealList");
  const MEALS_KEY = "fitnessTrackerMeals";
  const SAMPLE_MEALS = [
    { name: "Oatmeal", calories: 320, type: "Breakfast", time: "8:30 AM" },
    { name: "Grilled Chicken Salad", calories: 480, type: "Lunch", time: "12:45 PM" },
    { name: "Protein Shake", calories: 250, type: "Snack", time: "4:00 PM" },
    { name: "Salmon & Vegetables", calories: 595, type: "Dinner", time: "7:15 PM" }
  ];

  function getMeals() {
    const storedMeals = loadStorage(MEALS_KEY, null);
    return Array.isArray(storedMeals) ? storedMeals : SAMPLE_MEALS.slice();
  }

  function addMealToList(meal) {
    const item = document.createElement("li");
    const type = meal.type ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : "Meal";
    const detail = meal.time ? meal.calories + " cal · " + meal.time :
      meal.calories + " cal · " + formatDate(meal.date);
    item.appendChild(createTextElement("strong", type + " - " + meal.name));
    item.appendChild(createTextElement("span", detail));
    mealList.appendChild(item);
  }

  function renderMeals(meals) {
    mealList.replaceChildren();
    meals.forEach(addMealToList);
  }

  function validateMealForm() {
    clearFormErrors(mealForm);
    let valid = true;
    if (mealName.value.trim() === "") {
      showFieldError(mealName, "mealNameError", "Please enter a meal name.");
      valid = false;
    }
    if (mealCalories.value === "" || Number(mealCalories.value) < 1) {
      showFieldError(mealCalories, "mealCaloriesError", "Calories must be at least 1.");
      valid = false;
    }
    if (mealType.value === "") {
      showFieldError(mealType, "mealTypeError", "Please select a meal type.");
      valid = false;
    }
    if (mealDate.value === "") {
      showFieldError(mealDate, "mealDateError", "Please pick a date.");
      valid = false;
    }
    return valid;
  }

  mealForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateMealForm()) {
      return;
    }

    const meals = getMeals();
    meals.unshift({
      name: mealName.value.trim(),
      calories: mealCalories.value,
      type: mealType.value,
      date: mealDate.value
    });
    saveStorage(MEALS_KEY, meals);
    renderMeals(meals);
    mealForm.reset();
  });

  renderMeals(getMeals());
}

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

  function createGoalListItem(goal) {
    const target = Number(goal.target);
    const current = Number(goal.current);
    const percent = Number.isFinite(target) && target > 0 && Number.isFinite(current) ?
      Math.max(0, Math.min(100, (current / target) * 100)) : 0;
    const item = document.createElement("li");
    item.dataset.name = goal.name;
    item.dataset.target = goal.target;
    item.dataset.current = goal.current;
    item.dataset.unit = goal.unit;

    item.appendChild(createTextElement("strong", goal.name));
    item.appendChild(createTextElement("span",
      goal.current + " / " + goal.target + (goal.unit ? " " + goal.unit : "")));

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressFill.style.width = percent + "%";
    progressBar.appendChild(progressFill);
    item.appendChild(progressBar);

    const editButton = createTextElement("button", "Edit");
    editButton.type = "button";
    editButton.className = "btn-edit";
    item.appendChild(editButton);
    return item;
  }

  function renderGoals(goals) {
    goalsList.replaceChildren();
    goals.forEach(function (goal) {
      goalsList.appendChild(createGoalListItem(goal));
    });
  }

  function loadGoals() {
    const storedGoals = loadStorage(GOALS_KEY, []);
    if (Array.isArray(storedGoals) && storedGoals.length > 0) {
      renderGoals(storedGoals);
    } else {
      renderGoals([
        { name: "Lose 5 lbs", target: "5", current: "3", unit: "lbs" },
        { name: "Sleep 8 hours nightly", target: "8", current: "7.5", unit: "hrs" },
        { name: "Run 100 miles", target: "100", current: "42", unit: "miles" }
      ]);
    }
  }

  function saveGoals() {
    const goals = Array.from(goalsList.children).map(function (item) {
      return {
        name: item.dataset.name,
        target: item.dataset.target,
        current: item.dataset.current,
        unit: item.dataset.unit
      };
    });
    saveStorage(GOALS_KEY, goals);
  }

  function saveGoalDraft() {
    saveStorage(GOAL_DRAFT_KEY, {
      name: goalName.value,
      target: goalTarget.value,
      current: goalCurrent.value,
      unit: goalUnit.value
    });
  }

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

  function closeGoalModal() {
    goalModal.classList.remove("open");
    editingGoalItem = null;
    goalForm.reset();
    clearFormErrors(goalForm);
  }

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
      openGoalModal(event.target.closest("li"));
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
      editingGoalItem.replaceWith(createGoalListItem(goal));
    } else {
      goalsList.prepend(createGoalListItem(goal));
    }
    saveGoals();
    localStorage.removeItem(GOAL_DRAFT_KEY);
    closeGoalModal();
  });

  loadGoals();
}
