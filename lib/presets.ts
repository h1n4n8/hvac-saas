import { CategoryName } from "./types";

// Default button-selectable presets shown before a company has accumulated
// its own quote_items (via manual entry or AI-imported past quotes).
export const DEFAULT_PRESETS: Record<CategoryName, { name: string; unit: string; unitPrice: number }[]> = {
  "空調機据付工事": [
    { name: "天井カセット型エアコン取付", unit: "台", unitPrice: 55000 },
    { name: "壁掛型エアコン取付", unit: "台", unitPrice: 35000 },
    { name: "床置型エアコン取付", unit: "台", unitPrice: 45000 },
    { name: "エアコン撤去処分", unit: "台", unitPrice: 25000 },
    { name: "既設機器養生", unit: "式", unitPrice: 15000 },
  ],
  "冷媒配管工事": [
    { name: "冷媒配管工事一式", unit: "式", unitPrice: 150000 },
    { name: "断熱材巻き", unit: "m", unitPrice: 1500 },
    { name: "冷媒フレア加工", unit: "箇所", unitPrice: 3000 },
    { name: "配管保温材", unit: "m", unitPrice: 800 },
  ],
  "ダクト工事": [
    { name: "スパイラルダクト施工", unit: "m", unitPrice: 3500 },
    { name: "角ダクト工事一式", unit: "式", unitPrice: 200000 },
    { name: "グリル・吹出口取付", unit: "箇所", unitPrice: 8000 },
    { name: "ダクト保温", unit: "m²", unitPrice: 4000 },
  ],
  "電気工事": [
    { name: "電気工事一式", unit: "式", unitPrice: 80000 },
    { name: "電源ケーブル配線", unit: "m", unitPrice: 2000 },
    { name: "分電盤工事", unit: "式", unitPrice: 120000 },
    { name: "アース工事", unit: "箇所", unitPrice: 15000 },
  ],
  "計装工事": [
    { name: "自動制御工事一式", unit: "式", unitPrice: 300000 },
    { name: "温度センサー取付", unit: "台", unitPrice: 20000 },
    { name: "制御盤製作・取付", unit: "面", unitPrice: 250000 },
  ],
  "ドレン工事": [
    { name: "ドレン配管工事一式", unit: "式", unitPrice: 50000 },
    { name: "ドレンホース配管", unit: "m", unitPrice: 1200 },
    { name: "ドレンポンプ取付", unit: "台", unitPrice: 18000 },
  ],
  "試運転調整": [
    { name: "試運転・調整費", unit: "式", unitPrice: 50000 },
    { name: "性能測定", unit: "式", unitPrice: 30000 },
    { name: "取扱説明", unit: "式", unitPrice: 20000 },
  ],
  "経費・その他": [
    { name: "諸経費", unit: "式", unitPrice: 50000 },
    { name: "交通費・旅費", unit: "式", unitPrice: 30000 },
    { name: "廃材処分費", unit: "式", unitPrice: 40000 },
    { name: "仮設工事", unit: "式", unitPrice: 60000 },
  ],
};
