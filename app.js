const cfg = window.PHONECAM_CONFIG || { users: [], meetingBaseUrl: "https://meet.jit.si" };

const authCard = document.getElementById("authCard");
const sessionCard = document.getElementById("sessionCard");
const authMessage = document.getElementById("authMessage");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const displayNameInput = document.getElementById("displayName");
const accessKeyInput = document.getElementById("accessKey");
const createSessionBtn = document.getElementById("createSessionBtn");
const joinExistingBtn = document.getElementById("joinExistingBtn");
const sessionOutput = document.getElementById("sessionOutput");
const joinPanel = document.getElementById("joinPanel");
const launchPanel = document.getElementById("launchPanel");
const hostLinkInput = document.getElementById("hostLink");
const phoneLinkInput = document.getElementById("phoneLink");
const copyHostBtn = document.getElementById("copyHost");
const copyPhoneBtn = document.getElementById("copyPhone");
const joinRoomInput = document.getElementById("joinRoom");
const joinKeyInput = document.getElementById("joinKey");
const buildJoinLinkBtn = document.getElementById("buildJoinLink");
const launchSummary = document.getElementById("launchSummary");
const launchHostBtn = document.getElementById("launchHost");
const launchPhoneBtn = document.getElementById("launchPhone");

let currentSession = null;

function isAuthed() {
  return localStorage.getItem("phonecam_authed") === "1";
}

function setAuthed(value) {
  localStorage.setItem("phonecam_authed", value ? "1" : "0");
}

function showAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? "#b42318" : "#116466";
}

function setView() {
  if (isAuthed()) {
    authCard.classList.add("hidden");
    sessionCard.classList.remove("hidden");
    hydrateFromQuery();
    return;
  }

  authCard.classList.remove("hidden");
  sessionCard.classList.add("hidden");
}

function validUser(username, password) {
  return cfg.users.some((u) => u.username === username && u.password === password);
}

function randomId(prefix) {
  const value = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${value}`;
}

function currentDisplayName(fallback) {
  const val = displayNameInput.value.trim();
  return val || fallback;
}

function normalizeRoom(room) {
  return (room || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function buildAppLink(role, room, accessKey) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", role);
  url.searchParams.set("room", room);
  if (accessKey) {
    url.searchParams.set("key", accessKey);
  } else {
    url.searchParams.delete("key");
  }
  return url.toString();
}

function buildMeetingUrl(role, room) {
  const safeRoom = encodeURIComponent(room);
  const url = new URL(`${cfg.meetingBaseUrl}/${safeRoom}`);
  const displayName = role === "phone" ? currentDisplayName("Phone Camera") : currentDisplayName("Laptop Host");

  const hashParts = [
    `config.prejoinPageEnabled=false`,
    `config.disableDeepLinking=true`,
    `userInfo.displayName=\"${encodeURIComponent(displayName)}\"`
  ];

  if (role === "phone") {
    hashParts.push("config.startWithVideoMuted=false");
    hashParts.push("config.startWithAudioMuted=true");
  }

  url.hash = hashParts.join("&");
  return url.toString();
}

function updateLaunchPanel(session) {
  currentSession = session;
  launchPanel.classList.remove("hidden");
  launchSummary.textContent = `Room: ${session.room} | Access key required: ${session.key ? "Yes" : "No"}`;
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const room = normalizeRoom(params.get("room"));
  const key = (params.get("key") || "").trim();

  if (!mode || !room) {
    return;
  }

  const requiredKey = key;
  const enteredKey = window.prompt("Enter access key for this session (leave blank if none):", "") || "";

  if (requiredKey && enteredKey !== requiredKey) {
    window.alert("Wrong access key. Ask host for the correct key.");
    return;
  }

  updateLaunchPanel({ room, key: requiredKey });
}

function copyInputValue(input) {
  input.select();
  input.setSelectionRange(0, input.value.length);
  navigator.clipboard.writeText(input.value).catch(() => {
    document.execCommand("copy");
  });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const username = (data.get("username") || "").toString().trim();
  const password = (data.get("password") || "").toString();

  if (!validUser(username, password)) {
    showAuthMessage("Invalid credentials. Update config.js if needed.", true);
    return;
  }

  setAuthed(true);
  localStorage.setItem("phonecam_user", username);
  showAuthMessage("");
  setView();
});

logoutBtn.addEventListener("click", () => {
  setAuthed(false);
  localStorage.removeItem("phonecam_user");
  currentSession = null;
  launchPanel.classList.add("hidden");
  joinPanel.classList.add("hidden");
  sessionOutput.classList.add("hidden");
  setView();
});

createSessionBtn.addEventListener("click", () => {
  const room = randomId("room");
  const key = accessKeyInput.value.trim();

  const hostLink = buildAppLink("host", room, key);
  const phoneLink = buildAppLink("phone", room, key);

  hostLinkInput.value = hostLink;
  phoneLinkInput.value = phoneLink;
  sessionOutput.classList.remove("hidden");
  joinPanel.classList.add("hidden");
  updateLaunchPanel({ room, key });
});

joinExistingBtn.addEventListener("click", () => {
  joinPanel.classList.toggle("hidden");
});

buildJoinLinkBtn.addEventListener("click", () => {
  const room = normalizeRoom(joinRoomInput.value);
  const key = joinKeyInput.value.trim();

  if (!room) {
    window.alert("Please enter a room id.");
    return;
  }

  const hostLink = buildAppLink("host", room, key);
  const phoneLink = buildAppLink("phone", room, key);
  hostLinkInput.value = hostLink;
  phoneLinkInput.value = phoneLink;
  sessionOutput.classList.remove("hidden");
  updateLaunchPanel({ room, key });
});

launchHostBtn.addEventListener("click", () => {
  if (!currentSession) return;
  const url = buildMeetingUrl("host", currentSession.room);
  window.open(url, "_blank", "noopener,noreferrer");
});

launchPhoneBtn.addEventListener("click", () => {
  if (!currentSession) return;
  const url = buildMeetingUrl("phone", currentSession.room);
  window.open(url, "_blank", "noopener,noreferrer");
});

copyHostBtn.addEventListener("click", () => copyInputValue(hostLinkInput));
copyPhoneBtn.addEventListener("click", () => copyInputValue(phoneLinkInput));

setView();
