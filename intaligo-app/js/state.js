export let userDataCache = {};
export let currentUser = null;
export let currentMonth = new Date().getMonth();
export let currentPalette = 0;
export let editMonth = new Date().getMonth();
export let p5Inst = null;
export let showMonthNeighbors = false;
export let hideVizLines = false;

export function setShowMonthNeighbors(show) {
  showMonthNeighbors = show;
}

export function setHideVizLines(hide) {
  hideVizLines = hide;
}

export function setUserDataCache(cache) {
  userDataCache = cache;
}

export function setCurrentUser(user) {
  currentUser = user;
}

export function setCurrentMonth(month) {
  currentMonth = month;
}

export function setCurrentPalette(palette) {
  currentPalette = palette;
}

export function setEditMonth(month) {
  editMonth = month;
}

export function setP5Inst(inst) {
  p5Inst = inst;
}
