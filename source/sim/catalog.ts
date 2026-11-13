export interface CatalogItem {
  name: string;
  niche: string;
  basePrice: number;
  margin: number;
}

export const CATALOG: CatalogItem[] = [
  { name: "Silk Sleep Set", niche: "sommeil", basePrice: 39, margin: 62 },
  { name: "LED Sunset Lamp", niche: "décor", basePrice: 24, margin: 58 },
  { name: "Mini Portable Blender", niche: "cuisine", basePrice: 29, margin: 54 },
  { name: "Neck Cooler", niche: "été", basePrice: 22, margin: 61 },
  { name: "Pet Hair Remover", niche: "animaux", basePrice: 19, margin: 66 },
  { name: "Collapsible Water Bottle", niche: "outdoor", basePrice: 18, margin: 57 },
  { name: "Smart Plant Pot", niche: "maison", basePrice: 32, margin: 52 },
  { name: "USB Desk Fan", niche: "bureau", basePrice: 21, margin: 55 },
  { name: "Aroma Diffuser", niche: "bien-être", basePrice: 27, margin: 60 },
  { name: "Yoga Mat Pro", niche: "sport", basePrice: 34, margin: 51 },
  { name: "Posture Corrector", niche: "santé", basePrice: 26, margin: 63 },
  { name: "Magnetic Cable Kit", niche: "tech", basePrice: 16, margin: 68 },
  { name: "Ice Roller Face", niche: "beauté", basePrice: 15, margin: 70 },
  { name: "Car Vacuum Mini", niche: "auto", basePrice: 31, margin: 49 },
  { name: "Galaxy Projector", niche: "décor", basePrice: 28, margin: 59 },
  { name: "Travel Jewelry Case", niche: "voyage", basePrice: 20, margin: 64 },
];

export const HOOKS = [
  "Arrête de scroller — {name} change la routine",
  "POV : tu viens de trouver {name}",
  "J'ai testé {name} pour que tu n'aies pas à le faire",
  "Pourquoi tout le monde commande {name}",
  "Déballage : le produit qui circule partout",
  "3 raisons de garder {name} dans le panier",
];

export const ANGLES = [
  "problème / solution",
  "UGC témoignage",
  "démonstration avant / après",
  "offre limitée",
  "comparatif",
  "routine quotidienne",
];

export const PLATFORMS = ["Meta", "TikTok", "Google"] as const;
