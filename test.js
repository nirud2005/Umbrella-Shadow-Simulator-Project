// node test.js — เทียบกับค่าอ้างอิงที่คำนวณจาก Python ต้นฉบับ (ดู ref ด้านล่าง)
const { calculateShadow, declinationAccurate } = require("./calc.js");
const ref = require("./ref.json");
let bad = 0;
for (const c of ref) {
  const r = calculateShadow(...c.in, 105, "worksheet"); // ref.json คำนวณด้วยสมการ (1) ของใบงาน
  for (const k of ["n", "st", "delta", "omega", "alpha", "psiSun", "psiShadow", "d", "xc", "yc", "theta"]) {
    if (Math.abs(r[k] - c.out[k]) > 1e-9) { bad++; console.log("MISMATCH", c.in, k, r[k], c.out[k]); }
  }
  if (r.sunUp !== c.out.sunUp || r.dirName !== c.out.dirName) { bad++; console.log("MISMATCH flag/dir", c.in, r.dirName, c.out.dirName); }
}
// เขตเวลาอื่น: โตเกียว (UTC+9 → 135°E) เที่ยงนาฬิกาต้องใกล้เที่ยงสุริยะ (|E| < 17 นาที)
const tk = calculateShadow(35.68, 135, 2026, 5, 1, 12, 2, 5, 135, "worksheet");
if (Math.abs(tk.st - 12) > 0.3) { bad++; console.log("FAIL tz", tk.st); }

// วันไร้เงา (วันที่ดวงอาทิตย์ผ่านเกือบเหนือศีรษะที่สุด) ที่กรุงเทพฯ ปี 2569 — โหมด δ ตามจริงต้องได้ 27 เม.ย. และ 16 ส.ค. (ตรงกับข้อมูลจริง)
// ส่วนโหมดใบงาน (สมการ 1) ได้ 27 เม.ย. และ 15 ส.ค. (คลาด 1 วันตามที่ใบงานเป็นค่าประมาณ)
function zeroDays(mode) {
  const found = [];
  for (const [m, from, to] of [[4, 20, 30], [8, 10, 20]]) {
    let best = null;
    for (let d = from; d <= to; d++) {
      let a = -1;
      for (let t = 11; t <= 13.5; t += 0.002) a = Math.max(a, calculateShadow(13.75, 100.5, 2026, m, d, t, 2, 5, 105, mode).alpha);
      if (!best || a > best.a) best = { d, m, a };
    }
    found.push(`${best.d}/${best.m}`);
  }
  return found.join(",");
}
if (zeroDays("accurate") !== "27/4,16/8") { bad++; console.log("FAIL accurate zero days", zeroDays("accurate")); }
if (zeroDays("worksheet") !== "27/4,15/8") { bad++; console.log("FAIL worksheet zero days", zeroDays("worksheet")); }
// โหมดละเอียดต้องใกล้ตำแหน่งจริง (ค่าอ้างอิง Meeus ที่เที่ยงท้องถิ่น UTC+7): 16 ส.ค. 2569 δ ≈ 13.73°
const dd = declinationAccurate(2026, 8, 16, 105) * 180 / Math.PI;
if (Math.abs(dd - 13.729) > 0.01) { bad++; console.log("FAIL declinationAccurate", dd); }

console.log(bad ? `FAIL ${bad}` : `OK ${ref.length} cases`);
process.exit(bad ? 1 : 0);
