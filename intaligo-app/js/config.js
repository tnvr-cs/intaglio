export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const VIZ_MIN_NORM = 0.35;

export const CATEGORIES = [
  { name: 'Rent', icon: 'assets/icons/house.png', color: '#e88c3a', max: 2000, base: 1100 },
  { name: 'Food', icon: 'assets/icons/food.png', color: '#f0c040', max: 800, base: 290 },
  { name: 'Transport', icon: 'assets/icons/transport.png', color: '#a0d8ff', max: 400 },
  { name: 'Shopping', icon: 'assets/icons/shopping.png', color: '#d4a8ff', max: 600 },
  { name: 'Bills', icon: 'assets/icons/bill.png', color: '#80f0c0', max: 500 },
  { name: 'Subscr.', icon: 'assets/icons/subscriptions.png', color: '#ff9eb5', max: 200 },
  { name: 'Savings', icon: 'assets/icons/savings.png', color: '#ffe080', max: 1000 },
  { name: 'Other', icon: 'assets/icons/other.png', color: '#c0d0ff', max: 400 },
];

export function categoryIconHtml(cat, size = 22) {
  return `<img src="${cat.icon}" alt="" class="cat-icon" width="${size}" height="${size}">`;
}

export const PALETTES = [
  { name: 'Amber', bg: '#08061a', outer: [180, 55, 10], mid: [220, 130, 30], inner: [255, 210, 60], glow: 'rgba(255,200,60,0.6)' },
  { name: 'Ice', bg: '#060c14', outer: [10, 70, 130], mid: [25, 145, 200], inner: [120, 220, 255], glow: 'rgba(100,210,255,0.6)' },
  { name: 'Violet', bg: '#0a0014', outer: [95, 10, 165], mid: [155, 50, 215], inner: [210, 130, 255], glow: 'rgba(200,120,255,0.6)' },
  { name: 'Forest', bg: '#05100a', outer: [15, 95, 35], mid: [35, 158, 75], inner: [130, 245, 140], glow: 'rgba(120,230,130,0.6)' },
  { name: 'Rose', bg: '#120510', outer: [165, 20, 65], mid: [225, 75, 125], inner: [255, 170, 205], glow: 'rgba(255,160,200,0.6)' },
];

export const PAL_COLORS = [
  'radial-gradient(circle,#ffd060,#c84a20)',
  'radial-gradient(circle,#d0f5ff,#1a8ab0)',
  'radial-gradient(circle,#e8d0ff,#7b2fbe)',
  'radial-gradient(circle,#d0ffd8,#1a7a40)',
  'radial-gradient(circle,#ffd0e8,#c0306a)',
];

/** Inky Impression display server on the Pi (use IP if mDNS fails). */
export const INKY_DISPLAY_URL = 'http://raspberrypi.local:5000/display';
