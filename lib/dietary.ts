// dietaryIcons.js
import {
  Leaf,
  Vegan,
  WheatOff,
  CandyOff,
  Dumbbell,
  BadgeCheck,
  Ban
} from "lucide-react";

export const DIETARY_OPTIONS = [
  { label: "Vegetarian", icon: Leaf },
  { label: "Vegan", icon: Vegan },
  { label: "Gluten-Free", icon: WheatOff },
  { label: "Sugar-Free", icon: CandyOff },
  { label: "High Protein", icon: Dumbbell },
  { label: "Organic", icon: BadgeCheck },
  { label: "Preservative-Free", icon: Ban },
];

export default DIETARY_OPTIONS;


// export const DIETARY = [
//   'Vegetarian',
//   'Vegan',
//   'Gluten-Free',
//   'Sugar-Free',
//   'High Protein',
//   'Organic',
//   'Preservative-Free',
// ];

// export default DIETARY;
