import {
  mdiCart,
  mdiCash,
  mdiCar,
  mdiMovieOpen,
  mdiFlash,
  mdiBriefcase,
  mdiFood,
  mdiHome,
  mdiWifi,
  mdiMedicalBag,
  mdiBookOpenVariant,
  mdiGift,
} from "@mdi/js";

export const CATEGORY_ICON_OPTIONS = [
  { value: "cart", label: "Cart", path: mdiCart },
  { value: "cash", label: "Cash", path: mdiCash },
  { value: "car", label: "Car", path: mdiCar },
  { value: "movie", label: "Movie", path: mdiMovieOpen },
  { value: "flash", label: "Flash", path: mdiFlash },
  { value: "briefcase", label: "Briefcase", path: mdiBriefcase },
  { value: "food", label: "Food", path: mdiFood },
  { value: "home", label: "Home", path: mdiHome },
  { value: "wifi", label: "Wi-Fi", path: mdiWifi },
  { value: "medical", label: "Medical", path: mdiMedicalBag },
  { value: "book", label: "Book", path: mdiBookOpenVariant },
  { value: "gift", label: "Gift", path: mdiGift },
];

export const CATEGORY_ICON_KEYS = CATEGORY_ICON_OPTIONS.map((item) => item.value);

export const getIconPathByKey = (key) =>
  CATEGORY_ICON_OPTIONS.find((item) => item.value === key)?.path;

export const getIconLabelByKey = (key) =>
  CATEGORY_ICON_OPTIONS.find((item) => item.value === key)?.label || key || "-";
